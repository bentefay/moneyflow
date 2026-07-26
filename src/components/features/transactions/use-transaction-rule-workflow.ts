"use client";

/**
 * Transaction-context field-rule workflow (HS-007 / P17C).
 *
 * Encapsulates every CRDT seam the inline description robot + popup need for ONE transaction, so the
 * presentational components stay thin. It:
 *
 * - derives the robot state by REUSING the P17A matcher via {@link computeDescriptionRobotState};
 * - projects the vault option records into the shared editor's `{ id, label }` options;
 * - owns the editor draft/errors while the popup is open, seeded from the winning rule;
 * - routes every write through the already-integrated engines — rule edits/deletes via the P17B
 *   CRUD mutations, and apply-all / apply-new / apply-this via the P17A engine hooks (so allocation
 *   writes remain P16C-only and alias writes remain on the P11 boundary). It never writes a
 *   transaction, allocation key or alias directly.
 *
 * "Apply to new imports" here is scoped to THAT transaction's date: only strictly-newer rows are
 * updated, matching the frozen "apply to new" semantics in a per-row context.
 */

import { useCallback, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";

import { usePubkeyHash } from "@/hooks/use-identity";
import {
    useActiveAccounts,
    useActiveDescriptionAliases,
    useActiveFieldRules,
    useActivePeople,
    useActiveTags,
    useApplyFieldRules,
    useApplyFieldRulesToTransaction,
    useFieldRuleActions,
    usePersistAutomationPreference,
    useUserAutomationChoice,
    useVaultPreferences
} from "@/lib/crdt";
import { type BulkFieldRuleEntry } from "@/lib/crdt/field-rules";
import { resolvePersonDisplayName } from "@/lib/crdt/person";
import { type RuleMatchSubject } from "@/lib/domain/automation/rules";

import { type RuleEditorOption } from "../automations/FieldRuleEditor";
import { draftFromRule, mutationErrorToFieldErrors } from "../automations/rule-editor-data";
import {
    applyModeTargetsNewOnly,
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    validateRuleDraft
} from "../automations/rule-editor-model";
import {
    computeFieldRuleRobotState,
    type FieldRuleRobotState,
    type RobotCurrentValue
} from "./field-rule-robot-state";

/** Result of applying the rule set to just this transaction / to a scope. */
export interface ApplyOutcomeSummary {
    readonly applied: number;
    readonly rejected: number;
}

export interface TransactionRuleWorkflow {
    readonly robotState: FieldRuleRobotState;
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
    readonly currencyCode: string;
    readonly draft: RuleEditorDraft | null;
    readonly errors: RuleEditorFieldErrors;
    /** Discard any in-progress edits, reverting the popup to the rule's baseline. */
    readonly resetDraft: () => void;
    readonly setDraft: (next: RuleEditorDraft) => void;
    /** Validate + update the matching rule. Returns true when the write succeeded. */
    readonly save: (ruleId: string) => boolean;
    readonly remove: (ruleId: string) => void;
    readonly applyAll: () => ApplyOutcomeSummary;
    readonly applyNew: () => ApplyOutcomeSummary;
    /** Apply the active rules to THIS transaction (drift resolution). */
    readonly applyThis: () => ApplyOutcomeSummary;
}

function countBulk(entries: readonly BulkFieldRuleEntry[]): ApplyOutcomeSummary {
    let applied = 0;
    let rejected = 0;
    for (const entry of entries) {
        for (const outcome of entry.outcomes) {
            if (outcome.status === "applied") applied += 1;
            else if (outcome.status === "rejected" || outcome.status === "alias-error") {
                rejected += 1;
            }
        }
    }
    return { applied, rejected };
}

export function useTransactionRuleWorkflow(params: {
    readonly transactionId: string;
    readonly subject: RuleMatchSubject;
    /** The transaction's current value for the rule field this robot surfaces. */
    readonly current: RobotCurrentValue;
    readonly referenceDate: Temporal.PlainDate;
}): TransactionRuleWorkflow {
    const { transactionId, subject, current, referenceDate } = params;

    const rules = useActiveFieldRules();
    const accountsRecord = useActiveAccounts();
    const tagsRecord = useActiveTags();
    const peopleRecord = useActivePeople();
    const aliasesCollection = useActiveDescriptionAliases();
    const preferences = useVaultPreferences();
    const pubkeyHash = usePubkeyHash();
    const remembered = useUserAutomationChoice(pubkeyHash);

    const { update, remove } = useFieldRuleActions();
    const { applyAll: applyAllRules, applyNewerThan } = useApplyFieldRules();
    const applyToTransaction = useApplyFieldRulesToTransaction();
    const persistPreference = usePersistAutomationPreference();

    const currencyCode = preferences?.defaultCurrency ?? "USD";

    const robotState = useMemo(
        () => computeFieldRuleRobotState(rules, subject, current),
        [rules, subject, current]
    );

    const accounts = useMemo<readonly RuleEditorOption[]>(
        () =>
            Object.values(accountsRecord).flatMap((account) =>
                typeof account === "object" ? [{ id: account.id, label: account.name }] : []
            ),
        [accountsRecord]
    );
    const tags = useMemo<readonly RuleEditorOption[]>(
        () =>
            Object.values(tagsRecord).flatMap((tag) =>
                typeof tag === "object" ? [{ id: tag.id, label: tag.name }] : []
            ),
        [tagsRecord]
    );
    const people = useMemo<readonly RuleEditorOption[]>(
        () =>
            Object.values(peopleRecord).flatMap((person) =>
                typeof person === "object"
                    ? [{ id: person.id, label: resolvePersonDisplayName(person) }]
                    : []
            ),
        [peopleRecord]
    );
    const aliases = useMemo<readonly RuleEditorOption[]>(
        () =>
            Object.values(aliasesCollection).flatMap((alias) =>
                typeof alias === "object" && alias.kind === "real"
                    ? [{ id: alias.id, label: alias.name }]
                    : []
            ),
        [aliasesCollection]
    );

    const [draftOverride, setDraftOverride] = useState<RuleEditorDraft | null>(null);
    const [errors, setErrors] = useState<RuleEditorFieldErrors>({});

    // The editor draft is DERIVED from the winning rule so the popup never needs an effect to
    // "seed" itself on open. User edits are held in `draftOverride`; clearing it reverts to the
    // rule's current baseline. The apply-mode select is seeded from the user's remembered choice
    // (frozen `:270`) and re-remembered on save.
    const baselineDraft = useMemo<RuleEditorDraft | null>(
        () =>
            robotState.kind === "none"
                ? null
                : draftFromRule(robotState.rule, currencyCode, remembered.applyMode),
        [robotState, currencyCode, remembered.applyMode]
    );
    const draft = draftOverride ?? baselineDraft;

    const resetDraft = useCallback(() => {
        setDraftOverride(null);
        setErrors({});
    }, []);

    const setDraft = useCallback((next: RuleEditorDraft) => {
        setDraftOverride(next);
        setErrors({});
    }, []);

    const rememberChoice = useCallback(
        (chosen: RuleEditorDraft) => {
            if (pubkeyHash == null) return;
            persistPreference({
                pubkeyHash,
                choice: {
                    field: chosen.field,
                    tagMode: chosen.tagMode,
                    useAccountScope: chosen.useAccountScope,
                    useAmountScope: chosen.useAmountScope,
                    applyMode: chosen.applyMode
                }
            });
        },
        [persistPreference, pubkeyHash]
    );

    const save = useCallback(
        (ruleId: string): boolean => {
            if (draft == null) return false;
            const validation = validateRuleDraft(draft, currencyCode);
            if (!validation.ok) {
                setErrors(validation.errors);
                return false;
            }
            const { accountId, amount, action } = validation.value;
            // Editing an existing rule from a matching transaction: UPDATE, never create.
            const result = update({ id: ruleId, accountId, amount, action });
            if (!result.ok) {
                setErrors(mutationErrorToFieldErrors(result.error));
                return false;
            }
            rememberChoice(draft);
            resetDraft();
            return true;
        },
        [currencyCode, draft, rememberChoice, resetDraft, update]
    );

    const removeRule = useCallback(
        (ruleId: string) => {
            remove({ id: ruleId, deletedAtEpochMs: Date.now() });
            resetDraft();
        },
        [remove, resetDraft]
    );

    const applyAll = useCallback(() => countBulk(applyAllRules()), [applyAllRules]);

    const applyNew = useCallback(
        () => countBulk(applyNewerThan(referenceDate)),
        [applyNewerThan, referenceDate]
    );

    const applyThis = useCallback((): ApplyOutcomeSummary => {
        const result = applyToTransaction(transactionId);
        if (!result.ok) return { applied: 0, rejected: 0 };
        let applied = 0;
        let rejected = 0;
        for (const outcome of result.outcomes) {
            if (outcome.status === "applied") applied += 1;
            else if (outcome.status === "rejected" || outcome.status === "alias-error") {
                rejected += 1;
            }
        }
        return { applied, rejected };
    }, [applyToTransaction, transactionId]);

    return {
        robotState,
        accounts,
        tags,
        people,
        aliases,
        currencyCode,
        draft,
        errors,
        resetDraft,
        setDraft,
        save,
        remove: removeRule,
        applyAll,
        applyNew,
        applyThis
    };
}

/** Re-exported for callers that want to gate UI on whether the current mode targets new-only. */
export { applyModeTargetsNewOnly };
