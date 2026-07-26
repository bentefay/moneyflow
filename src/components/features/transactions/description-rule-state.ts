/**
 * Pure robot-state computation for the HS-007 (P17C) description-alias inline workflow.
 *
 * For a single transaction we surface a small "robot" affordance whose state is fully derived from
 * the active field rules and the transaction's current alias. This never re-implements precedence
 * or matching — it REUSES the P17A engine primitive {@link selectWinningRule} to pick the highest
 * matching descriptionAlias rule, then compares the rule's implied alias with the transaction's
 * current alias:
 *
 * - `none`  — no descriptionAlias rule matches (hide the robot).
 * - `match` — a rule matches and the current alias already equals what it implies (normal robot).
 * - `drift` — a rule matches but the current alias differs (red robot; offer "apply to this").
 *
 * Manual-row eligibility, exact text matching and scope precedence are all decided by the reused
 * engine, so this stays a thin, total, side-effect-free projection.
 */

import {
    type FieldRule,
    type RuleMatchSubject,
    selectWinningRule
} from "@/lib/domain/automation/rules";

export type DescriptionRobotState =
    | { readonly kind: "none" }
    | { readonly kind: "match"; readonly rule: FieldRule; readonly impliedAliasId: string }
    | { readonly kind: "drift"; readonly rule: FieldRule; readonly impliedAliasId: string };

/**
 * Derive the robot state for one transaction. `currentAliasId` is the alias currently assigned to
 * the transaction (`null` when none is assigned). Returns `none` unless the winning rule for the
 * `descriptionAlias` field matches `subject`.
 */
export function computeDescriptionRobotState(
    rules: readonly FieldRule[],
    subject: RuleMatchSubject,
    currentAliasId: string | null
): DescriptionRobotState {
    const winner = selectWinningRule(rules, "descriptionAlias", subject);
    if (winner == null) return { kind: "none" };
    // The winner was selected for the descriptionAlias field, but narrow explicitly (no casts) so
    // the discriminated action gives us the implied alias id safely.
    if (winner.action.field !== "descriptionAlias") return { kind: "none" };
    const impliedAliasId = winner.action.aliasId;
    return impliedAliasId === currentAliasId
        ? { kind: "match", rule: winner, impliedAliasId }
        : { kind: "drift", rule: winner, impliedAliasId };
}
