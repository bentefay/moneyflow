"use client";

/**
 * One existing rule, edited from a transaction it wins a field on.
 *
 * Owns the draft and errors for the inspector's rule card and routes every write through the vault
 * actions: rule edits, deletes and splits through the field-rule mutations, application through the
 * engine hooks. It never writes a transaction, allocation key or alias itself.
 */

import { useCallback, useMemo, useState } from "react";
import { type Temporal } from "temporal-polyfill";

import { usePubkeyHash } from "@/hooks/use-identity";
import {
    useAccounts,
    useApplyFieldRules,
    useApplyFieldRulesToTransaction,
    useFieldRuleActions,
    usePersistAutomationPreference,
    useUserAutomationChoice,
    useVaultPreferences
} from "@/lib/crdt";
import { type RememberedRuleChoice } from "@/lib/domain/automation/preferences";
import { type FieldRule, type RuleField } from "@/lib/domain/automation/rules";
import { resolveAccountCurrency } from "@/lib/domain/currency";

import {
    draftFromRule,
    mutationErrorToFieldErrors,
    type RuleEditorOptions
} from "../automations/rule-editor-data";
import {
    addDraftOutput,
    rememberedChoiceFromDraft,
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    validateRuleDraft
} from "../automations/rule-editor-model";
import { useRuleEditorOptions } from "../automations/use-rule-editor-options";
import {
    type RulePopulationCandidate,
    useRulePopulationCount
} from "../automations/use-rule-population-count";

/** The currency a transaction's amounts are written in: its account's, else the vault default. */
export function useTransactionCurrencyCode(accountId: string): string {
    const accounts = useAccounts();
    const preferences = useVaultPreferences();
    const account = accounts[accountId];
    return resolveAccountCurrency(
        typeof account === "object" ? account.currency : undefined,
        preferences?.defaultCurrency
    ).code;
}

/** The signed-in user's remembered editor choice and a way to persist a new one. */
export function useRememberedRuleChoice(): {
    readonly remembered: RememberedRuleChoice;
    readonly remember: (draft: RuleEditorDraft) => void;
} {
    const pubkeyHash = usePubkeyHash();
    const remembered = useUserAutomationChoice(pubkeyHash);
    const persistPreference = usePersistAutomationPreference();
    const remember = useCallback(
        (draft: RuleEditorDraft) => {
            if (pubkeyHash == null) return;
            persistPreference({ pubkeyHash, choice: rememberedChoiceFromDraft(draft, remembered) });
        },
        [persistPreference, pubkeyHash, remembered]
    );
    return { remembered, remember };
}

export interface TransactionRuleWorkflow {
    readonly draft: RuleEditorDraft;
    readonly errors: RuleEditorFieldErrors;
    readonly options: RuleEditorOptions;
    readonly currencyCode: string;
    /** The user's remembered scope and Apply on blur, which seed the draft's apply choice. */
    readonly remembered: RememberedRuleChoice;
    /** How many transactions Apply would change now; `undefined` while the draft is invalid. */
    readonly populationCount: number | undefined;
    readonly setDraft: (next: RuleEditorDraft) => void;
    readonly addOutput: (field: RuleField) => void;
    /** Discard in-progress edits, reverting to the rule as stored. */
    readonly resetDraft: () => void;
    /** Update the rule, then apply at the draft's scope. True when the update was written. */
    readonly save: () => boolean;
    /** Soft-delete the rule. True when it was deleted. */
    readonly remove: () => boolean;
    /** Split `field` into a new rule with the same conditions. True when both were written. */
    readonly split: (field: RuleField) => boolean;
    /** Apply every winning rule to this one transaction, without linking it to any rule. */
    readonly applyThis: () => void;
}

export function useTransactionRuleWorkflow(params: {
    readonly transactionId: string;
    readonly rule: FieldRule;
    readonly accountId: string;
    /** The row's date: Update new counts from it, inclusive. */
    readonly referenceDate: Temporal.PlainDate;
}): TransactionRuleWorkflow {
    const { transactionId, rule, accountId, referenceDate } = params;

    const options = useRuleEditorOptions();
    const currencyCode = useTransactionCurrencyCode(accountId);
    const { remembered, remember } = useRememberedRuleChoice();
    const { update, remove, split } = useFieldRuleActions();
    const { applyAll, applyNewerThan } = useApplyFieldRules();
    const applyToTransaction = useApplyFieldRulesToTransaction();

    const [draftOverride, setDraftOverride] = useState<RuleEditorDraft | null>(null);
    const [errors, setErrors] = useState<RuleEditorFieldErrors>({});

    // Derived from the rule, so another writer's change shows until the user starts editing.
    const baselineDraft = useMemo(
        () => draftFromRule(rule, currencyCode, remembered),
        [currencyCode, remembered, rule]
    );
    const draft = draftOverride ?? baselineDraft;

    const populationCandidate = useMemo<RulePopulationCandidate | null>(() => {
        const validation = validateRuleDraft(draft, currencyCode);
        return validation.ok
            ? { id: rule.id, descriptionText: rule.descriptionText, write: validation.value }
            : null;
    }, [currencyCode, draft, rule.descriptionText, rule.id]);
    const populationCount = useRulePopulationCount({
        candidate: populationCandidate,
        scope: draft.scope,
        referenceDate
    });

    const resetDraft = useCallback(() => {
        setDraftOverride(null);
        setErrors({});
    }, []);

    const setDraft = useCallback((next: RuleEditorDraft) => {
        setDraftOverride(next);
        setErrors({});
    }, []);

    const addOutput = useCallback(
        (field: RuleField) => setDraft(addDraftOutput(draft, field, remembered.tagMode)),
        [draft, remembered.tagMode, setDraft]
    );

    const save = useCallback((): boolean => {
        const validation = validateRuleDraft(draft, currencyCode);
        if (!validation.ok) {
            setErrors(validation.errors);
            return false;
        }
        const { accountId: ruleAccountId, amount, outputs } = validation.value;
        const result = update({ id: rule.id, accountId: ruleAccountId, amount, outputs });
        if (!result.ok) {
            setErrors(mutationErrorToFieldErrors(result.error));
            return false;
        }
        if (draft.scope === "new") applyNewerThan(referenceDate);
        else applyAll();
        remember(draft);
        resetDraft();
        return true;
    }, [
        applyAll,
        applyNewerThan,
        currencyCode,
        draft,
        referenceDate,
        remember,
        resetDraft,
        rule.id,
        update
    ]);

    const removeRule = useCallback((): boolean => {
        const result = remove({ id: rule.id, deletedAtEpochMs: Date.now() });
        if (!result.ok) {
            setErrors(mutationErrorToFieldErrors(result.error));
            return false;
        }
        resetDraft();
        return true;
    }, [remove, resetDraft, rule.id]);

    const splitRule = useCallback(
        (field: RuleField): boolean => {
            const result = split({
                id: rule.id,
                field,
                newRuleId: crypto.randomUUID(),
                createdAtEpochMs: Date.now()
            });
            if (!result.ok) {
                setErrors(mutationErrorToFieldErrors(result.error));
                return false;
            }
            resetDraft();
            return true;
        },
        [resetDraft, rule.id, split]
    );

    // The row's own account and date locate it in one day bucket instead of walking the vault.
    const applyThis = useCallback(() => {
        applyToTransaction({ transactionId, location: { accountId, date: referenceDate } });
    }, [accountId, applyToTransaction, referenceDate, transactionId]);

    return {
        draft,
        errors,
        options,
        currencyCode,
        remembered,
        populationCount,
        setDraft,
        addOutput,
        resetDraft,
        save,
        remove: removeRule,
        split: splitRule,
        applyThis
    };
}
