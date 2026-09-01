"use client";

/**
 * Transaction-context rule PROPOSAL workflow (HS-007 / UR-009).
 *
 * The sibling {@link useTransactionRuleWorkflow} drives the robot, which edits a rule that already
 * exists. This hook drives the other frozen surface: the controls that appear when the user CHANGES
 * a field, offering to turn that change into a rule (frozen `:249-256`, extended to tags and
 * allocation by `:289-292`).
 *
 * It reuses, rather than duplicates:
 * - the P17A matcher, via {@link computeFieldRuleProposal}, so "already matches a rule" means exactly
 *   what it means for the robot;
 * - the shared editor's draft/validation model (`validateRuleDraft`), so the four apply modes and the
 *   two restrictions behave identically on both surfaces;
 * - the P17B CRUD mutations for the write, and the P17A engine hooks for application — so allocation
 *   writes stay P16C-only and alias writes stay on the P11 boundary. It never writes a transaction,
 *   allocation key or alias directly.
 *
 * `apply` covers both halves of the frozen text: it CREATES a rule when nothing matched yet and
 * UPDATES the winning rule when one did (frozen `:287-289`), then applies it at the chosen scope —
 * "…All" through the engine's apply-all, "…New" scoped to rows strictly newer than this transaction.
 */

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { type Temporal } from "temporal-polyfill";

import { usePubkeyHash } from "@/hooks/use-identity";
import {
    useActiveAccounts,
    useActiveDescriptionAliases,
    useActiveFieldRules,
    useActivePeople,
    useActiveTags,
    useAccounts,
    useApplyFieldRules,
    useFieldRuleActions,
    usePersistAutomationPreference,
    useUserAutomationChoice,
    useVaultPreferences
} from "@/lib/crdt";
import { resolvePersonDisplayName } from "@/lib/crdt/person";
import { applyModeTargetsNewOnly } from "@/lib/domain/automation/apply-mode";
import { type RuleMatchSubject } from "@/lib/domain/automation/rules";
import { resolveAccountCurrency } from "@/lib/domain/currency";

import { type RuleEditorOption } from "../automations/FieldRuleEditor";
import {
    draftFromProposal,
    mutationErrorToFieldErrors,
    type RuleProposalSeed
} from "../automations/rule-editor-data";
import {
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    validateRuleDraft
} from "../automations/rule-editor-model";
import {
    computeFieldRuleProposal,
    type FieldRuleProposalState,
    type RuleProposalDraftGeneration,
    type RuleProposalDraftOverride,
    type RuleProposalErrorOverride
} from "./field-rule-proposal-state";
import { type RobotCurrentValue } from "./field-rule-robot-state";
import { type TransactionId } from "./table-model";

export interface FieldRuleProposalWorkflow {
    readonly proposal: FieldRuleProposalState;
    readonly draft: RuleEditorDraft | null;
    readonly errors: RuleEditorFieldErrors;
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
    readonly currencyCode: string;
    readonly setDraft: (next: RuleEditorDraft) => void;
    /**
     * Write the proposed rule and apply it at the draft's chosen scope. Returns true when the write
     * succeeded, false when validation or the mutation rejected it (errors are then populated).
     */
    readonly apply: () => boolean;
}

export interface FieldRuleProposalPersistence {
    readonly draftOverride: RuleProposalDraftOverride | null;
    readonly errorOverride: RuleProposalErrorOverride | null;
    readonly setDraftOverride: (override: RuleProposalDraftOverride | null) => void;
    readonly setErrorOverride: (override: RuleProposalErrorOverride | null) => void;
}

type RuleProposalCurrentValueKey =
    | { readonly field: "descriptionAlias"; readonly aliasId: string | null }
    | { readonly field: "tags"; readonly tagIds: readonly string[] }
    | {
          readonly field: "allocation";
          readonly allocations: readonly (readonly [string, number])[];
      };

export function useFieldRuleProposal(params: {
    readonly subject: RuleMatchSubject;
    /** Stable owner whose current value seeded this proposal. */
    readonly transactionId: TransactionId;
    /** The value the transaction currently carries for the changed field. */
    readonly current: RobotCurrentValue;
    /** This transaction's date; "…New" modes are scoped to strictly-newer rows (frozen `:263-264`). */
    readonly referenceDate: Temporal.PlainDate;
    /** Optional controller-owned persistence used by the stable transaction inspector. */
    readonly persistence?: FieldRuleProposalPersistence;
}): FieldRuleProposalWorkflow {
    const { subject, transactionId, current, referenceDate, persistence } = params;

    const rules = useActiveFieldRules();
    const accountsRecord = useActiveAccounts();
    const allAccountsRecord = useAccounts();
    const tagsRecord = useActiveTags();
    const peopleRecord = useActivePeople();
    const aliasesCollection = useActiveDescriptionAliases();
    const preferences = useVaultPreferences();
    const pubkeyHash = usePubkeyHash();
    const remembered = useUserAutomationChoice(pubkeyHash);

    const { create, update } = useFieldRuleActions();
    const { applyAll, applyNewerThan } = useApplyFieldRules();
    const persistPreference = usePersistAutomationPreference();

    const subjectAccount = allAccountsRecord[subject.accountId];
    const currencyCode = resolveAccountCurrency(
        typeof subjectAccount === "object" ? subjectAccount.currency : undefined,
        preferences?.defaultCurrency
    ).code;

    const proposal = useMemo(
        () => computeFieldRuleProposal(rules, subject, current),
        [rules, subject, current]
    );
    const draftKey = useMemo(
        () => ruleProposalDraftKey(transactionId, proposal, current, subject, currencyCode),
        [currencyCode, current, proposal, subject, transactionId]
    );
    const draftGeneration = useMemo<RuleProposalDraftGeneration>(
        () => ({ semanticKey: draftKey }),
        [draftKey]
    );

    const options = useRuleEditorOptions({
        accountsRecord,
        aliasesCollection,
        peopleRecord,
        tagsRecord
    });

    const [localDraftOverride, setLocalDraftOverride] = useState<RuleProposalDraftOverride | null>(
        null
    );
    const [localErrorOverride, setLocalErrorOverride] = useState<RuleProposalErrorOverride | null>(
        null
    );
    const draftOverride = persistence == null ? localDraftOverride : persistence.draftOverride;
    const errorOverride = persistence == null ? localErrorOverride : persistence.errorOverride;
    const setDraftOverride = persistence?.setDraftOverride ?? setLocalDraftOverride;
    const setErrorOverride = persistence?.setErrorOverride ?? setLocalErrorOverride;
    const generationMatches = (generation: RuleProposalDraftGeneration): boolean =>
        persistence == null
            ? generation === draftGeneration
            : generation.semanticKey === draftGeneration.semanticKey;
    const errors =
        errorOverride != null && generationMatches(errorOverride.generation)
            ? errorOverride.errors
            : {};

    // An inspector remount gets a new local token, but its controller-owned override still belongs to
    // the same semantic proposal. A semantic mismatch is ignored immediately and retired before an
    // A → B → A transition can resurrect it.
    useLayoutEffect(() => {
        if (persistence == null) return;
        if (
            draftOverride != null &&
            draftOverride.generation.semanticKey !== draftGeneration.semanticKey
        ) {
            setDraftOverride(null);
        }
        if (
            errorOverride != null &&
            errorOverride.generation.semanticKey !== draftGeneration.semanticKey
        ) {
            setErrorOverride(null);
        }
    }, [
        draftGeneration.semanticKey,
        draftOverride,
        errorOverride,
        persistence,
        setDraftOverride,
        setErrorOverride
    ]);

    // The draft is DERIVED from the proposal, so the controls never need an effect to seed
    // themselves when they appear. User edits are held in `draftOverride`.
    const baselineDraft = useMemo<RuleEditorDraft | null>(() => {
        if (proposal.kind === "none") return null;
        const seed = seedFromCurrent(proposal.descriptionText, current, subject);
        return draftFromProposal(seed, currencyCode, remembered);
    }, [proposal, current, subject, currencyCode, remembered]);
    const draft =
        draftOverride != null && generationMatches(draftOverride.generation)
            ? draftOverride.draft
            : baselineDraft;

    const setDraft = useCallback(
        (next: RuleEditorDraft) => {
            if (proposal.kind === "none") return;
            setDraftOverride({ draft: next, generation: draftGeneration });
            setErrorOverride(null);
        },
        [draftGeneration, proposal.kind, setDraftOverride, setErrorOverride]
    );

    const apply = useCallback((): boolean => {
        if (draft == null || proposal.kind === "none") return false;
        const validation = validateRuleDraft(draft, currencyCode);
        if (!validation.ok) {
            setErrorOverride({ errors: validation.errors, generation: draftGeneration });
            return false;
        }
        const { accountId, amount, action } = validation.value;

        // Frozen `:287-289`: when the changed field already has a matching rule the same controls
        // UPDATE that rule instead of creating a second one for the same description text.
        const result =
            proposal.kind === "update"
                ? update({ id: proposal.rule.id, accountId, amount, action })
                : create({
                      id: crypto.randomUUID(),
                      descriptionText: proposal.descriptionText,
                      accountId,
                      amount,
                      action,
                      createdAtEpochMs: Date.now()
                  });

        if (!result.ok) {
            setErrorOverride({
                errors: mutationErrorToFieldErrors(result.error),
                generation: draftGeneration
            });
            return false;
        }

        // "…New" applies only to transactions newer than this one (frozen `:263-264`); "…All"
        // applies to every existing and new matching transaction (frozen `:261-263`). Both route
        // through the P17A engine, so a rule that cannot legally apply to a row is rejected there
        // rather than half-written here.
        if (applyModeTargetsNewOnly(draft.applyMode)) applyNewerThan(referenceDate);
        else applyAll();

        if (pubkeyHash != null) {
            persistPreference({
                pubkeyHash,
                choice: {
                    field: draft.field,
                    tagMode: draft.tagMode,
                    useAccountScope: draft.useAccountScope,
                    useAmountScope: draft.useAmountScope,
                    applyMode: draft.applyMode
                }
            });
        }
        setDraftOverride(null);
        setErrorOverride(null);
        return true;
    }, [
        applyAll,
        applyNewerThan,
        create,
        currencyCode,
        draft,
        draftGeneration,
        persistPreference,
        proposal,
        pubkeyHash,
        referenceDate,
        setDraftOverride,
        setErrorOverride,
        update
    ]);

    return {
        proposal,
        draft,
        errors,
        ...options,
        currencyCode,
        setDraft,
        apply
    };
}

/** Stable semantic identity for the proposal facts an editable override was seeded from. */
function ruleProposalDraftKey(
    transactionId: TransactionId,
    proposal: FieldRuleProposalState,
    current: RobotCurrentValue,
    subject: RuleMatchSubject,
    currencyCode: string
): string {
    const currentValue = ruleProposalCurrentValueKey(current);
    const proposalOwner = proposal.kind === "update" ? proposal.rule.id : null;
    const proposalDescription =
        proposal.kind === "none" ? subject.descriptionText : proposal.descriptionText;
    return JSON.stringify([
        transactionId,
        proposal.kind,
        proposalOwner,
        proposalDescription,
        subject.accountId,
        subject.amount,
        currencyCode,
        currentValue
    ]);
}

function ruleProposalCurrentValueKey(current: RobotCurrentValue): RuleProposalCurrentValueKey {
    switch (current.field) {
        case "descriptionAlias":
            return { aliasId: current.currentAliasId, field: current.field };
        case "tags":
            return { field: current.field, tagIds: [...current.currentTagIds].sort() };
        case "allocation":
            return {
                allocations: Object.entries(current.currentAllocations).sort(([left], [right]) =>
                    left.localeCompare(right)
                ),
                field: current.field
            };
    }
}

/** Project the changed field's current value into the pure {@link RuleProposalSeed}. */
function seedFromCurrent(
    descriptionText: string,
    current: RobotCurrentValue,
    subject: RuleMatchSubject
): RuleProposalSeed {
    const scope = { accountId: subject.accountId, amount: subject.amount, descriptionText };
    switch (current.field) {
        case "descriptionAlias":
            return {
                ...scope,
                value: { field: "descriptionAlias", aliasId: current.currentAliasId ?? "" }
            };
        case "tags":
            return { ...scope, value: { field: "tags", tagIds: current.currentTagIds } };
        case "allocation":
            return {
                ...scope,
                value: { field: "allocation", allocations: current.currentAllocations }
            };
    }
}

/**
 * Project the vault's option records into the shared editor's `{ id, label }` options. Identical in
 * shape to the robot workflow's projection, kept here so the two surfaces present the same choices.
 */
function useRuleEditorOptions(records: {
    readonly accountsRecord: ReturnType<typeof useActiveAccounts>;
    readonly tagsRecord: ReturnType<typeof useActiveTags>;
    readonly peopleRecord: ReturnType<typeof useActivePeople>;
    readonly aliasesCollection: ReturnType<typeof useActiveDescriptionAliases>;
}): {
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
} {
    const { accountsRecord, tagsRecord, peopleRecord, aliasesCollection } = records;
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
    return { accounts, tags, people, aliases };
}
