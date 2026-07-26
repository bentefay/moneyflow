"use client";

/**
 * Automations page manager for the HS-007 field-rule model (P17B).
 *
 * Reworks the pre-redesign generic-automation page onto the P17A field-rule engine: it lists the
 * active field rules (`useActiveFieldRules`), and drives create / update / delete plus apply-all and
 * apply-new through the additive P17B mutations and the P17A engine. It owns all draft state and
 * renders the shared {@link FieldRuleEditor}; the editor itself is surface-agnostic so P17C can reuse
 * it verbatim inside a contextual popup.
 *
 * Apply-all / apply-new call ONLY `useApplyFieldRules` (the P17A engine), so allocation writes stay
 * P16C-only and description-alias writes stay on the P11 boundary — this component never writes a
 * transaction, allocation key or alias directly.
 */

import { useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";

import { Button } from "@/components/ui/button";
import { usePubkeyHash } from "@/hooks/use-identity";
import {
    useActiveAccounts,
    useActiveDescriptionAliases,
    useActiveFieldRules,
    useActivePeople,
    useActiveTags,
    useApplyFieldRules,
    useFieldRuleActions,
    usePersistAutomationPreference,
    useUserAutomationChoice,
    useVaultPreferences
} from "@/lib/crdt";
import { type BulkFieldRuleEntry } from "@/lib/crdt/field-rules";
import { resolvePersonDisplayName } from "@/lib/crdt/person";
import { type FieldRule } from "@/lib/domain/automation/rules";
import { cn } from "@/lib/utils";

import { FieldRuleEditor, type RuleEditorOption } from "./FieldRuleEditor";
import { draftFromRule, mutationErrorToFieldErrors } from "./rule-editor-data";
import {
    applyModeTargetsNewOnly,
    emptyRuleDraft,
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    validateRuleDraft
} from "./rule-editor-model";

type EditorTarget =
    | { readonly mode: "create" }
    | { readonly mode: "edit"; readonly ruleId: string };

interface ApplySummary {
    readonly applied: number;
    readonly rejected: number;
    readonly scope: "all" | "new";
}

function countOutcomes(entries: readonly BulkFieldRuleEntry[]): {
    readonly applied: number;
    readonly rejected: number;
} {
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

function summarizeRule(rule: FieldRule): string {
    const scope: string[] = [];
    if (rule.accountId != null) scope.push("account");
    if (rule.amount != null) scope.push("amount");
    const scopeText = scope.length > 0 ? ` (${scope.join(" + ")})` : "";
    return `${rule.action.field}: "${rule.descriptionText}"${scopeText}`;
}

export function FieldRulesManager({
    className
}: {
    readonly className?: string;
}): React.JSX.Element {
    const rules = useActiveFieldRules();
    const accountsRecord = useActiveAccounts();
    const tagsRecord = useActiveTags();
    const peopleRecord = useActivePeople();
    const aliasesCollection = useActiveDescriptionAliases();
    const preferences = useVaultPreferences();
    const pubkeyHash = usePubkeyHash();
    const remembered = useUserAutomationChoice(pubkeyHash);

    const { create, update, remove } = useFieldRuleActions();
    const { applyAll, applyNewerThan } = useApplyFieldRules();
    const persistPreference = usePersistAutomationPreference();

    const currencyCode = preferences?.defaultCurrency ?? "USD";

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

    const [target, setTarget] = useState<EditorTarget | null>(null);
    const [draft, setDraft] = useState<RuleEditorDraft | null>(null);
    const [errors, setErrors] = useState<RuleEditorFieldErrors>({});
    const [applySummary, setApplySummary] = useState<ApplySummary | null>(null);

    const openCreate = (): void => {
        setTarget({ mode: "create" });
        setErrors({});
        setApplySummary(null);
        setDraft(
            emptyRuleDraft({
                field: remembered.field,
                tagMode: remembered.tagMode,
                useAccountScope: remembered.useAccountScope,
                useAmountScope: remembered.useAmountScope,
                applyMode: remembered.applyMode
            })
        );
    };

    const openEdit = (rule: FieldRule): void => {
        setTarget({ mode: "edit", ruleId: rule.id });
        setErrors({});
        setApplySummary(null);
        setDraft(draftFromRule(rule, currencyCode, remembered.applyMode));
    };

    const closeEditor = (): void => {
        setTarget(null);
        setDraft(null);
        setErrors({});
    };

    const rememberChoice = (current: RuleEditorDraft): void => {
        if (pubkeyHash == null) return;
        persistPreference({
            pubkeyHash,
            choice: {
                field: current.field,
                tagMode: current.tagMode,
                useAccountScope: current.useAccountScope,
                useAmountScope: current.useAmountScope,
                applyMode: current.applyMode
            }
        });
    };

    const handleSave = (): void => {
        if (draft == null || target == null) return;
        const validation = validateRuleDraft(draft, currencyCode);
        if (!validation.ok) {
            setErrors(validation.errors);
            return;
        }
        const { accountId, amount, action } = validation.value;
        const result =
            target.mode === "create"
                ? create({
                      id: crypto.randomUUID(),
                      descriptionText: draft.descriptionText.trim(),
                      accountId,
                      amount,
                      action,
                      createdAtEpochMs: Date.now()
                  })
                : update({ id: target.ruleId, accountId, amount, action });

        if (!result.ok) {
            setErrors(mutationErrorToFieldErrors(result.error));
            return;
        }
        rememberChoice(draft);
        closeEditor();
    };

    const handleApplyAll = (): void => {
        const entries = applyAll();
        const counts = countOutcomes(entries);
        setApplySummary({ ...counts, scope: "all" });
    };

    const handleApplyNew = (): void => {
        // Page context is not tied to a transaction: "new imports moving forward" is handled
        // automatically at import commit; the explicit button applies to rows newer than today so it
        // routes through the same P17A engine without a retroactive rewrite. See Q-P17B-APPLY-NEW.
        const entries = applyNewerThan(Temporal.Now.plainDateISO());
        const counts = countOutcomes(entries);
        setApplySummary({ ...counts, scope: "new" });
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                    {rules.length === 0
                        ? "No automation rules yet."
                        : `${rules.length} active rule${rules.length === 1 ? "" : "s"}.`}
                </p>
                <Button data-testid="new-rule-btn" onClick={openCreate} type="button">
                    New rule
                </Button>
            </div>

            {rules.length > 0 ? (
                <ul className="space-y-2" data-testid="rule-list">
                    {rules.map((rule) => (
                        <li key={rule.id}>
                            <button
                                className={cn(
                                    "hover:bg-accent w-full rounded-md border px-3 py-2 text-left text-sm",
                                    target?.mode === "edit" &&
                                        target.ruleId === rule.id &&
                                        "ring-primary ring-2"
                                )}
                                data-testid={`rule-item-${rule.id}`}
                                onClick={() => openEdit(rule)}
                                type="button"
                            >
                                {summarizeRule(rule)}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}

            {applySummary ? (
                <p
                    className="text-muted-foreground text-sm"
                    data-testid="apply-summary"
                    role="status"
                >
                    {applySummary.scope === "all" ? "Applied to all" : "Applied to new imports"}:{" "}
                    {applySummary.applied} updated
                    {applySummary.rejected > 0 ? `, ${applySummary.rejected} rejected` : ""}.
                </p>
            ) : null}

            {draft != null && target != null ? (
                <div className="rounded-lg border p-4">
                    <FieldRuleEditor
                        accounts={accounts}
                        aliases={aliases}
                        currencyCode={currencyCode}
                        draft={draft}
                        errors={errors}
                        mode={target.mode}
                        onApplyAll={handleApplyAll}
                        onApplyNew={handleApplyNew}
                        onDelete={
                            target.mode === "edit"
                                ? () => {
                                      remove({
                                          id: target.ruleId,
                                          deletedAtEpochMs: Date.now()
                                      });
                                      closeEditor();
                                  }
                                : undefined
                        }
                        onDraftChange={(next) => {
                            setDraft(next);
                            setErrors({});
                        }}
                        onSave={handleSave}
                        people={people}
                        tags={tags}
                    />
                    <div className="mt-3">
                        <Button
                            data-testid="rule-cancel"
                            onClick={closeEditor}
                            type="button"
                            variant="ghost"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : null}

            <p className="text-muted-foreground text-xs">
                {draft != null && applyModeTargetsNewOnly(draft.applyMode)
                    ? "This rule is set to update only newer imports."
                    : ""}
            </p>
        </div>
    );
}
