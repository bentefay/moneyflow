/**
 * Pure per-field RULE-PROPOSAL gate for the HS-007 / UR-009 inline workflow.
 *
 * The proposal appears when the user CHANGES a field and offers to turn that change into a rule.
 * This module only decides whether the change can be offered at all. Which rule the edit then
 * creates or extends is the ownership ladder's job (`resolveRuleExtensionTarget`), recomputed from
 * the draft's conditions, so nothing here names a rule.
 *
 * Total and side-effect-free.
 */

import type {
    RuleEditorDraft,
    RuleEditorFieldErrors
} from "@/components/features/automations/rule-editor-model";
import {
    fieldAppliesToManual,
    type RuleField,
    type RuleMatchSubject,
    type RulePredicate
} from "@/lib/domain/automation/rules";
import { assertNever } from "@/lib/utils/exhaustive";

import { type RobotCurrentValue } from "./field-rule-robot-state";

/** Re-exported from the shared rule editor data so the inspector and the page format alike. */
export { formatAmountForRuleLabel } from "@/components/features/automations/rule-editor-data";

/** Identity of the proposal facts an override was made against; a mismatch retires the override. */
export interface RuleProposalDraftGeneration {
    readonly semanticKey: string;
}

/**
 * The user's answer to a required choice of target rule. Held beside the draft rather than in it, so
 * the standalone editor's draft carries no transaction-only state.
 */
export type RuleProposalResolutionChoice =
    | { readonly kind: "conflict"; readonly choice: "keep" | "move" }
    | { readonly kind: "ambiguous"; readonly ruleId: string };

export interface RuleProposalDraftOverride {
    readonly generation: RuleProposalDraftGeneration;
    readonly draft: RuleEditorDraft;
    readonly resolution: RuleProposalResolutionChoice | null;
}

export interface RuleProposalErrorOverride {
    readonly generation: RuleProposalDraftGeneration;
    readonly errors: RuleEditorFieldErrors;
}

/**
 * Whether the user's just-made change can be offered as a rule. `descriptionText` is carried because
 * it is the exact text the rule keys on, and a proposal is only ever produced when that text exists.
 */
export type FieldRuleProposalState =
    | { readonly kind: "none" }
    | {
          readonly kind: "proposal";
          readonly field: RuleField;
          readonly descriptionText: string;
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
 * Whether the change to one field of one transaction can be offered as a rule.
 *
 * Returns `none` when it cannot:
 * - the row exposes no matchable description text (a manual row carries no imported description
 *   text; the caller projects its alias name instead, and a row with neither matches nothing);
 * - the field is not eligible for this row (description-alias rules never apply to manually created
 *   transactions); or
 * - the field was cleared rather than set (see {@link hasProposableValue}).
 */
export function computeFieldRuleProposal(
    subject: RuleMatchSubject,
    current: RobotCurrentValue
): FieldRuleProposalState {
    const field: RuleField = current.field;
    const { descriptionText } = subject;
    if (descriptionText == null || descriptionText.length === 0) return { kind: "none" };
    if (subject.isManual && !fieldAppliesToManual(field)) return { kind: "none" };
    if (!hasProposableValue(current)) return { kind: "none" };
    return { kind: "proposal", field, descriptionText };
}

/**
 * The match conditions the draft would write. In a transaction both restrictions are checkboxes over
 * the row's own account and amount, so they come from the subject, never from parsed text.
 */
export function proposalPredicate(
    descriptionText: string,
    draft: Pick<RuleEditorDraft, "useAccountScope" | "useAmountScope">,
    subject: RuleMatchSubject
): RulePredicate {
    return {
        descriptionText,
        accountId: draft.useAccountScope ? subject.accountId : undefined,
        amount: draft.useAmountScope ? subject.amount : undefined
    };
}
