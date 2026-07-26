/**
 * Pure per-field robot-state computation for the HS-007 inline workflow (P17C description, P17D
 * tags + person-percentage allocation).
 *
 * For one transaction and one rule field we surface a small "robot" affordance whose state is fully
 * derived from the active field rules and the transaction's current value for that field. This never
 * re-implements precedence or matching — it REUSES the P17A engine (`selectWinningRule`,
 * `resolveTagRuleResult`) to pick the highest matching rule, then compares the rule's implied value
 * with the transaction's current value:
 *
 * - `none`  — no rule of that field matches the subject (hide the robot). The matcher already
 *   excludes description-alias rules on manual rows and includes tags/allocation rules on them
 *   (frozen `:294-295`), so manual-row eligibility needs no special-casing here.
 * - `match` — a rule matches and the current value already equals what it implies (normal robot).
 * - `drift` — a rule matches but the current value differs (red robot; offer "apply to this").
 *
 * Total and side-effect-free.
 */

import {
    type FieldRule,
    resolveTagRuleResult,
    type RuleField,
    type RuleMatchSubject,
    selectWinningRule
} from "@/lib/domain/automation/rules";

export type FieldRuleRobotState =
    | { readonly kind: "none" }
    | { readonly kind: "match"; readonly rule: FieldRule }
    | { readonly kind: "drift"; readonly rule: FieldRule };

/**
 * The transaction's current value for the field being evaluated, discriminated on `field` so the
 * caller can never pass, say, a tag set where an alias id is expected.
 */
export type RobotCurrentValue =
    | { readonly field: "descriptionAlias"; readonly currentAliasId: string | null }
    | { readonly field: "tags"; readonly currentTagIds: readonly string[] }
    | {
          readonly field: "allocation";
          readonly currentAllocations: Readonly<Record<string, number>>;
      };

function assertNever(value: never): never {
    throw new Error(`Unexpected robot value: ${JSON.stringify(value)}`);
}

function sameSequence(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Whether two explicit allocation sets are identical (same keys, same numeric values). */
function sameAllocations(
    left: Readonly<Record<string, number>>,
    right: Readonly<Record<string, number>>
): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => Object.is(left[key], right[key]));
}

/**
 * Derive the robot state for one transaction and one field. `current` carries the field-appropriate
 * value the transaction currently exposes. Returns `none` unless the winning rule for `current.field`
 * matches `subject`.
 */
export function computeFieldRuleRobotState(
    rules: readonly FieldRule[],
    subject: RuleMatchSubject,
    current: RobotCurrentValue
): FieldRuleRobotState {
    const field: RuleField = current.field;
    const winner = selectWinningRule(rules, field, subject);
    if (winner == null) return { kind: "none" };
    // The winner was selected for this field, but narrow the discriminated action explicitly (no
    // casts) so the implied value is read type-safely.
    const action = winner.action;
    switch (current.field) {
        case "descriptionAlias": {
            if (action.field !== "descriptionAlias") return { kind: "none" };
            return action.aliasId === current.currentAliasId
                ? { kind: "match", rule: winner }
                : { kind: "drift", rule: winner };
        }
        case "tags": {
            if (action.field !== "tags") return { kind: "none" };
            const implied = resolveTagRuleResult(current.currentTagIds, action);
            return sameSequence(implied, current.currentTagIds)
                ? { kind: "match", rule: winner }
                : { kind: "drift", rule: winner };
        }
        case "allocation": {
            if (action.field !== "allocation") return { kind: "none" };
            return sameAllocations(action.allocations, current.currentAllocations)
                ? { kind: "match", rule: winner }
                : { kind: "drift", rule: winner };
        }
        default:
            return assertNever(current);
    }
}
