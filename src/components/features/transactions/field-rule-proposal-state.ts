/**
 * Pure per-field RULE-PROPOSAL computation for the HS-007 / UR-009 inline workflow.
 *
 * This is the CREATION half of the frozen automations behaviour, and it is deliberately a distinct
 * surface from {@link computeFieldRuleRobotState}:
 *
 * - the ROBOT (frozen `:275-286`) surfaces a rule that ALREADY EXISTS, at rest, for any matching row;
 * - the PROPOSAL (frozen `:249-256`, extended to tags and allocation by `:289-292`) appears when the
 *   user CHANGES a field, and offers to turn that change into a rule.
 *
 * The frozen text keys the proposal on whether a rule already matches: `:249-251` asks for controls
 * when "the description text doesn't already match a rule" (create), while `:287-289` says that when
 * the changed field DOES have a matching rule "we then offer the same 4 select choices and
 * checkboxes… if applied, we update the rule rather than create one" (update). Both cases therefore
 * produce a proposal; only `kind` differs, so one control serves both.
 *
 * Matching and precedence are never re-implemented here — the winning rule comes from the P17A
 * engine's {@link selectWinningRule}, exactly as the robot does, so "has a matching rule" means the
 * same thing on both surfaces.
 *
 * Total and side-effect-free.
 */

import type {
    RuleEditorDraft,
    RuleEditorFieldErrors
} from "@/components/features/automations/rule-editor-model";
import {
    fieldAppliesToManual,
    type FieldRule,
    type RuleField,
    type RuleMatchSubject,
    selectWinningRule
} from "@/lib/domain/automation/rules";
import { getCurrency, type MoneyMinorUnits, toMajorUnits } from "@/lib/domain/currency";
import { assertNever } from "@/lib/utils/exhaustive";

import { type RobotCurrentValue } from "./field-rule-robot-state";

/**
 * Render a transaction's amount for the frozen "only if $x" restriction label (`:258-259`), where x
 * is that transaction's own amount. Falls back to the bare major-units number for a currency the
 * platform cannot format, so the label always names a concrete amount.
 */
export function formatAmountForRuleLabel(
    amount: MoneyMinorUnits,
    currencyCode: string,
    locale?: Intl.LocalesArgument
): string {
    const majorUnits = toMajorUnits(amount, currencyCode);
    const currency = getCurrency(currencyCode);
    if (currency == null) return String(majorUnits);
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: currency.decimal_digits,
        maximumFractionDigits: currency.decimal_digits
    }).format(majorUnits);
}

/**
 * Whether the user's just-made change can be offered as a rule, and if so whether applying it would
 * create a new rule or update the one that already matches.
 *
 * `descriptionText` is carried on the proposal because it is the exact text the rule keys on, and a
 * proposal is only ever produced when that text exists.
 */
export interface RuleProposalDraftGeneration {
    readonly semanticKey: string;
}

export interface RuleProposalDraftOverride {
    readonly generation: RuleProposalDraftGeneration;
    readonly draft: RuleEditorDraft;
}

export interface RuleProposalErrorOverride {
    readonly generation: RuleProposalDraftGeneration;
    readonly errors: RuleEditorFieldErrors;
}

export type FieldRuleProposalState =
    | { readonly kind: "none" }
    | {
          readonly kind: "create";
          readonly field: RuleField;
          readonly descriptionText: string;
      }
    | {
          readonly kind: "update";
          readonly field: RuleField;
          readonly descriptionText: string;
          readonly rule: FieldRule;
      };

/** Canonical tag-set representation: duplicate references collapse and order is irrelevant. */
export function canonicalTagIds(tagIds: readonly string[]): readonly string[] {
    return [...new Set(tagIds)].sort();
}

/**
 * Whether a tag edit actually changed the canonical set.
 *
 * A proposal is offered for a CHANGE. Re-committing the same tags — including malformed legacy
 * arrays with duplicate references in a different order — is not a change, and offering a rule for
 * it would put controls in front of a user who did nothing.
 */
export function tagSetChanged(next: readonly string[], previous: readonly string[]): boolean {
    const canonicalNext = canonicalTagIds(next);
    const canonicalPrevious = canonicalTagIds(previous);
    return (
        canonicalNext.length !== canonicalPrevious.length ||
        canonicalNext.some((id, index) => id !== canonicalPrevious[index])
    );
}

/**
 * Whether an allocation edit actually changed that person's stored percentage.
 *
 * The stored value is `unknown` because legacy vault state may hold a malformed entry; anything that
 * is not a number is treated as "no comparable previous value", so committing a real number over it
 * counts as a change.
 */
export function allocationValueChanged(previous: unknown, next: number): boolean {
    return !(typeof previous === "number" && Object.is(previous, next));
}

/**
 * Whether the transaction's current value for a field carries something a rule could set.
 *
 * A rule's action must encode a concrete value, so a change that leaves the field empty produces no
 * proposal: there is no alias to point at, no tag to add, and no percentage set to apply. Clearing a
 * field is therefore never offered as a rule (see Q-PROPOSAL-P30-01-01).
 */
export function hasProposableValue(current: RobotCurrentValue): boolean {
    switch (current.field) {
        case "descriptionAlias":
            return current.currentAliasId != null && current.currentAliasId.length > 0;
        case "tags":
            return current.currentTagIds.length > 0;
        case "allocation":
            return Object.keys(current.currentAllocations).length > 0;
        default:
            return assertNever(current, "proposal value");
    }
}

/**
 * Derive the proposal for one transaction and one field after that field was changed.
 *
 * Returns `none` when the change cannot be turned into a rule at all:
 * - the row exposes no matchable description text (frozen `:269` — a manual row carries no imported
 *   description text; the caller projects its alias name instead, and a row with neither matches
 *   nothing);
 * - the field is not eligible for this row (frozen `:294-295` — description-alias rules never apply
 *   to manually created transactions, so creating one from a manual row is never offered); or
 * - the field was cleared rather than set (see {@link hasProposableValue}).
 *
 * Otherwise the winning rule for the field decides `kind`: absent means `create`, present means
 * `update` of that exact rule.
 */
export function computeFieldRuleProposal(
    rules: readonly FieldRule[],
    subject: RuleMatchSubject,
    current: RobotCurrentValue
): FieldRuleProposalState {
    const field: RuleField = current.field;
    const { descriptionText } = subject;
    if (descriptionText == null || descriptionText.length === 0) return { kind: "none" };
    if (subject.isManual && !fieldAppliesToManual(field)) return { kind: "none" };
    if (!hasProposableValue(current)) return { kind: "none" };

    const winner = selectWinningRule(rules, field, subject);
    if (winner == null) return { kind: "create", field, descriptionText };
    return { kind: "update", field, descriptionText, rule: winner };
}
