/**
 * Shared, surface-agnostic data helpers for the field-rule editor (HS-007).
 *
 * These are the pure adapters that both the Automations page manager (P17B) and the P17C
 * transaction-context popup need: turning an existing {@link FieldRule} into an editable draft and
 * mapping a mutation error onto per-field messages. They live outside any component so the SAME
 * editor can be driven from either surface without duplicating this glue.
 */

import { type FieldRuleMutationError } from "@/lib/crdt/field-rule-mutations";
import { type FieldRule } from "@/lib/domain/automation/rules";
import { toMajorUnits } from "@/lib/domain/currency";

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

function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
