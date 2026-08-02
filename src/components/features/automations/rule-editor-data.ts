/**
 * Shared, surface-agnostic data helpers for the field-rule editor (HS-007).
 *
 * These are the pure adapters that both the Automations page manager (P17B) and the P17C
 * transaction-context popup need: turning an existing {@link FieldRule} into an editable draft and
 * mapping a mutation error onto per-field messages. They live outside any component so the SAME
 * editor can be driven from either surface without duplicating this glue.
 */

import { type FieldRuleMutationError } from "@/lib/crdt/field-rule-mutations";
import { type FieldRule, type TagRuleMode } from "@/lib/domain/automation/rules";
import { type MoneyMinorUnits, toMajorUnits } from "@/lib/domain/currency";
import { assertNever } from "@/lib/utils/exhaustive";

import { type ApplyMode, emptyRuleDraft, type RuleEditorDraft } from "./rule-editor-model";

/** Build an editable draft that reproduces an existing rule's field, scope, action and values. */
export function draftFromRule(
    rule: FieldRule,
    currencyCode: string,
    applyMode: ApplyMode
): RuleEditorDraft {
    const base = emptyRuleDraft({
        field: rule.action.field,
        tagMode: rule.action.field === "tags" ? rule.action.mode : "add",
        useAccountScope: rule.accountId != null,
        useAmountScope: rule.amount != null,
        applyMode
    });
    const allocations: Record<string, string> =
        rule.action.field === "allocation"
            ? Object.fromEntries(
                  Object.entries(rule.action.allocations).map(([personId, value]) => [
                      personId,
                      String(value)
                  ])
              )
            : {};
    return {
        ...base,
        descriptionText: rule.descriptionText,
        accountId: rule.accountId ?? "",
        amountText: rule.amount == null ? "" : String(toMajorUnits(rule.amount, currencyCode)),
        aliasId: rule.action.field === "descriptionAlias" ? rule.action.aliasId : "",
        tagIds: rule.action.field === "tags" ? [...rule.action.tagIds] : [],
        allocations
    };
}

/**
 * The transaction facts a rule proposal is seeded from: the exact text the rule will key on, the
 * value the user just set, and the row's own account/amount so the two optional restrictions can be
 * filled in when the user ticks them.
 */
export interface RuleProposalSeed {
    readonly descriptionText: string;
    /** The value the user just set, discriminated on the rule field it belongs to. */
    readonly value:
        | { readonly field: "descriptionAlias"; readonly aliasId: string }
        | { readonly field: "tags"; readonly tagIds: readonly string[] }
        | { readonly field: "allocation"; readonly allocations: Readonly<Record<string, number>> };
    /** This transaction's account, used when "only this account" is ticked (frozen `:259-260`). */
    readonly accountId: string;
    /** This transaction's amount, used when "only if $x" is ticked (frozen `:258-259`). */
    readonly amount: MoneyMinorUnits;
}

/**
 * Build an editable draft for a rule PROPOSED from a field the user just changed (frozen
 * `:249-256`).
 *
 * Unlike {@link draftFromRule}, which reproduces a rule that already exists, this seeds the draft
 * from the transaction: the exact description text it will key on, the value just entered, and the
 * user's remembered select/restriction choices (frozen `:270`). The account and amount restrictions
 * are pre-filled from THIS transaction so ticking either narrows the rule to the row the user is
 * looking at, which is the only meaning the frozen text gives them.
 *
 * Pure: takes facts, returns a draft, writes nothing.
 */
export function draftFromProposal(
    seed: RuleProposalSeed,
    currencyCode: string,
    remembered: {
        readonly tagMode: TagRuleMode;
        readonly useAccountScope: boolean;
        readonly useAmountScope: boolean;
        readonly applyMode: ApplyMode;
    }
): RuleEditorDraft {
    const base = emptyRuleDraft({
        field: seed.value.field,
        tagMode: remembered.tagMode,
        useAccountScope: remembered.useAccountScope,
        useAmountScope: remembered.useAmountScope,
        applyMode: remembered.applyMode
    });
    return {
        ...base,
        descriptionText: seed.descriptionText,
        accountId: seed.accountId,
        amountText: String(toMajorUnits(seed.amount, currencyCode)),
        aliasId: seed.value.field === "descriptionAlias" ? seed.value.aliasId : "",
        tagIds: seed.value.field === "tags" ? [...seed.value.tagIds] : [],
        allocations:
            seed.value.field === "allocation"
                ? Object.fromEntries(
                      Object.entries(seed.value.allocations).map(([personId, value]) => [
                          personId,
                          String(value)
                      ])
                  )
                : {}
    };
}

/** Map a CRUD mutation error onto the editor's per-field error messages. */
export function mutationErrorToFieldErrors(error: FieldRuleMutationError): {
    readonly descriptionText?: string;
    readonly allocations?: string;
} {
    switch (error.type) {
        case "duplicate-key":
            return {
                descriptionText:
                    "A rule already exists for this field, description and constraints. Edit or delete it instead."
            };
        case "invalid-allocations":
            return { allocations: "Enter a valid percentage set (each between -100 and 100)." };
        case "invalid-rule":
        case "not-found":
            return { descriptionText: "This rule is not valid. Check the fields and try again." };
        default:
            return assertNever(error);
    }
}
