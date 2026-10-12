"use client";

/**
 * The Automations page: a list of grouped rules beside the shared {@link RuleEditor}.
 *
 * Each rule is named by its conditions and lists its output fields. Selecting one opens it in the
 * editor; New rule opens an empty one. Apply writes the rule, then applies the rule set at the
 * chosen scope: Update all rewrites every matching transaction now, while Update new on this page,
 * which has no transaction to date from, leaves existing rows alone and lets future imports pick the
 * rule up. Application only ever goes through the engine via `useApplyFieldRules`, so this component
 * never writes a transaction, allocation or alias itself.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePubkeyHash } from "@/hooks/use-identity";
import {
    useActiveFieldRules,
    useApplyFieldRules,
    useFieldRuleActions,
    usePersistAutomationPreference,
    useUserAutomationChoice,
    useVaultPreferences
} from "@/lib/crdt";
import { type BulkFieldRuleEntry } from "@/lib/crdt/field-rules";
import { type RememberedRuleChoice } from "@/lib/domain/automation/preferences";
import { type FieldRule, type RuleField, ruleOutputFields } from "@/lib/domain/automation/rules";
import { cn } from "@/lib/utils";

import {
    draftFromRule,
    mutationErrorMessage,
    mutationErrorToFieldErrors,
    RULE_FIELD_LABELS,
    ruleConditionsLabel
} from "./rule-editor-data";
import {
    addDraftOutput,
    emptyRuleDraft,
    rememberedChoiceFromDraft,
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    validateRuleDraft
} from "./rule-editor-model";
import { RuleEditor, type RuleEditorSplitPreview, type RuleEditorTitle } from "./RuleEditor";
import { useRuleEditorOptions } from "./use-rule-editor-options";
import { type RulePopulationCandidate, useRulePopulationCount } from "./use-rule-population-count";

type EditorTarget =
    | { readonly mode: "create" }
    | { readonly mode: "edit"; readonly ruleId: string };

const NEW_RULE_TITLE: RuleEditorTitle = { kind: "new" };

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

function outputFieldsLabel(rule: FieldRule): string {
    return ruleOutputFields(rule)
        .map((field) => RULE_FIELD_LABELS[field])
        .join(" · ");
}

export interface FieldRulesManagerProps {
    readonly className?: string;
}

export function FieldRulesManager({ className }: FieldRulesManagerProps): React.JSX.Element {
    const rules = useActiveFieldRules();
    const options = useRuleEditorOptions();
    const preferences = useVaultPreferences();
    const pubkeyHash = usePubkeyHash();
    const remembered = useUserAutomationChoice(pubkeyHash);

    const { create, update, remove, split } = useFieldRuleActions();
    const { applyAll } = useApplyFieldRules();
    const persistPreference = usePersistAutomationPreference();

    const currencyCode = preferences?.defaultCurrency ?? "USD";

    const [target, setTarget] = useState<EditorTarget | null>(null);
    const [draft, setDraft] = useState<RuleEditorDraft | null>(null);
    const [errors, setErrors] = useState<RuleEditorFieldErrors>({});
    const [status, setStatus] = useState<string | null>(null);
    // The output whose split preview is open. Split writes nothing until the preview is confirmed.
    const [splitField, setSplitField] = useState<RuleField | null>(null);

    const selectedRule =
        target?.mode === "edit" ? (rules.find((rule) => rule.id === target.ruleId) ?? null) : null;

    const openRule = (rule: FieldRule, choice: RememberedRuleChoice): void => {
        setTarget({ mode: "edit", ruleId: rule.id });
        setDraft(draftFromRule(rule, currencyCode, choice));
        setErrors({});
        setSplitField(null);
    };

    const openCreate = (): void => {
        setTarget({ mode: "create" });
        setDraft(emptyRuleDraft(remembered));
        setErrors({});
        setStatus(null);
        setSplitField(null);
    };

    const closeEditor = (): void => {
        setTarget(null);
        setDraft(null);
        setErrors({});
        setSplitField(null);
    };

    const populationCandidate = useMemo<RulePopulationCandidate | null>(() => {
        if (draft == null || target == null) return null;
        const validation = validateRuleDraft(draft, currencyCode);
        if (!validation.ok) return null;
        return {
            id: target.mode === "edit" ? target.ruleId : "automations-page-draft",
            descriptionText: draft.descriptionText.trim(),
            write: validation.value
        };
    }, [currencyCode, draft, target]);
    const populationCount = useRulePopulationCount({
        candidate: populationCandidate,
        scope: draft?.scope ?? "all",
        // Update new on this page means future imports, so nothing changes now.
        referenceDate: null
    });

    const handleApply = (): void => {
        if (draft == null || target == null) return;
        const validation = validateRuleDraft(draft, currencyCode);
        if (!validation.ok) {
            setErrors(validation.errors);
            return;
        }
        const { accountId, amount, outputs } = validation.value;
        const result =
            target.mode === "create"
                ? create({
                      id: crypto.randomUUID(),
                      descriptionText: draft.descriptionText.trim(),
                      accountId,
                      amount,
                      outputs,
                      createdAtEpochMs: Date.now()
                  })
                : update({ id: target.ruleId, accountId, amount, outputs });
        if (!result.ok) {
            setErrors(mutationErrorToFieldErrors(result.error));
            return;
        }

        if (draft.scope === "all") {
            const { applied, rejected } = countOutcomes(applyAll());
            setStatus(`Applied to all: ${applied} updated, ${rejected} rejected.`);
        } else {
            setStatus("Saved. New imports will be updated.");
        }

        const choice = rememberedChoiceFromDraft(draft, remembered);
        if (pubkeyHash != null) persistPreference({ pubkeyHash, choice });
        openRule(result.value, choice);
    };

    const handleDelete = (ruleId: string): void => {
        const result = remove({ id: ruleId, deletedAtEpochMs: Date.now() });
        if (!result.ok) {
            setStatus(mutationErrorMessage(result.error));
            return;
        }
        setStatus(null);
        closeEditor();
    };

    const confirmSplit = (ruleId: string, field: RuleField): void => {
        setSplitField(null);
        const result = split({
            id: ruleId,
            field,
            newRuleId: crypto.randomUUID(),
            createdAtEpochMs: Date.now()
        });
        if (!result.ok) {
            setStatus(mutationErrorMessage(result.error));
            return;
        }
        setStatus(`Split ${RULE_FIELD_LABELS[field].toLowerCase()} into its own rule.`);
        openRule(result.value.split, remembered);
    };

    const handleAddOutput = (field: RuleField): void => {
        if (draft == null) return;
        setDraft(addDraftOutput(draft, field, remembered.tagMode));
    };

    const splitPreview: RuleEditorSplitPreview | undefined =
        splitField == null || target?.mode !== "edit"
            ? undefined
            : {
                  field: splitField,
                  onConfirm: () => confirmSplit(target.ruleId, splitField),
                  onCancel: () => setSplitField(null)
              };

    const handleDraftChange = (next: RuleEditorDraft): void => {
        setDraft(next);
        setErrors({});
    };

    const editorTitle: RuleEditorTitle =
        selectedRule == null
            ? NEW_RULE_TITLE
            : {
                  kind: "rule",
                  conditions: ruleConditionsLabel(selectedRule, options.accounts, currencyCode)
              };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                    {rules.length === 0
                        ? "No automation rules yet."
                        : `${rules.length} active rule${rules.length === 1 ? "" : "s"}.`}
                </p>
                <Button data-testid="new-rule-btn" onClick={openCreate} type="button">
                    New rule
                </Button>
            </div>

            {status == null ? null : (
                <p
                    className="text-muted-foreground text-sm"
                    data-testid="apply-summary"
                    role="status"
                >
                    {status}
                </p>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(14rem,20rem)_1fr]">
                {rules.length === 0 ? (
                    <div />
                ) : (
                    <ul aria-label="Automation rules" className="space-y-2" data-testid="rule-list">
                        {rules.map((rule) => {
                            const selected = selectedRule?.id === rule.id;
                            return (
                                <li key={rule.id}>
                                    <button
                                        aria-current={selected ? "true" : undefined}
                                        className={cn(
                                            "hover:bg-accent focus-visible:ring-ring/50 grid w-full gap-0.5 rounded-md border px-3 py-2 text-left outline-none focus-visible:ring-[3px]",
                                            selected && "border-primary bg-accent"
                                        )}
                                        data-testid={`rule-item-${rule.id}`}
                                        onClick={() => {
                                            setStatus(null);
                                            openRule(rule, remembered);
                                        }}
                                        type="button"
                                    >
                                        <span className="text-sm break-all">
                                            {ruleConditionsLabel(
                                                rule,
                                                options.accounts,
                                                currencyCode
                                            )}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            {outputFieldsLabel(rule)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {draft != null && target != null ? (
                    <div className="rounded-lg border p-4">
                        <RuleEditor
                            accounts={options.accounts}
                            aliases={options.aliases}
                            applyLabel={target.mode === "create" ? "Create and apply" : "Apply"}
                            canSplit={
                                selectedRule != null && ruleOutputFields(selectedRule).length > 1
                            }
                            context="standalone"
                            currencyCode={currencyCode}
                            draft={draft}
                            errors={errors}
                            idPrefix="automations-rule"
                            key={target.mode === "edit" ? target.ruleId : "new"}
                            mode={target.mode}
                            onAddOutput={handleAddOutput}
                            onApply={handleApply}
                            onCancel={closeEditor}
                            onDelete={
                                target.mode === "edit"
                                    ? () => handleDelete(target.ruleId)
                                    : undefined
                            }
                            onDraftChange={handleDraftChange}
                            onSplit={target.mode === "edit" ? setSplitField : undefined}
                            people={options.people}
                            populationCount={populationCount}
                            splitPreview={splitPreview}
                            tags={options.tags}
                            title={editorTitle}
                        />
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Select a rule to edit it, or create a new one.
                    </p>
                )}
            </div>
        </div>
    );
}
