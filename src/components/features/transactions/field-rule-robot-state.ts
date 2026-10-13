/**
 * Pure per-field robot-state computation for the HS-007 inline workflow (P17C description, P17D
 * tags + person-percentage allocation).
 *
 * For one transaction and one rule field we surface a small "robot" affordance whose state is fully
 * derived from the active field rules and the transaction's current value for that field. This never
 * re-implements precedence or matching — it REUSES the P17A engine (`selectWinningRule`, and
 * `ruleOutputAgrees` over `resolveTagRuleResult`) to pick the highest matching rule, then compares the rule's implied value
 * with the transaction's current value:
 *
 * - `none`  — no rule of that field matches the subject (hide the robot). The matcher already
 *   excludes description-alias rules on manual rows and includes tags/allocation rules on them
 *   (frozen `:294-295`), so manual-row eligibility needs no special-casing here.
 * - `match` — a rule matches and the current value already equals what it implies (normal robot).
 * - `drift` — a rule matches but the current value differs (amber divergence; offer "apply to this").
 *
 * Total and side-effect-free.
 */

import { ruleOutputAgrees, type RuleFieldValue } from "@/lib/domain/automation/population";
import { type RuleSource } from "@/lib/domain/automation/rule-index";
import {
    type FieldRule,
    type RuleField,
    type RuleMatchSubject,
    ruleScopeRank,
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
export type RobotCurrentValue = RuleFieldValue;

/**
 * Derive the robot state for one transaction and one field. `current` carries the field-appropriate
 * value the transaction currently exposes. Returns `none` unless the winning rule for `current.field`
 * matches `subject`.
 */
export function computeFieldRuleRobotState(
    rules: RuleSource,
    subject: RuleMatchSubject,
    current: RobotCurrentValue
): FieldRuleRobotState {
    const winner = selectWinningRule(rules, current.field, subject);
    if (winner == null) return { kind: "none" };
    const agrees = ruleOutputAgrees(winner, current);
    if (agrees == null) return { kind: "none" };
    return agrees ? { kind: "match", rule: winner } : { kind: "drift", rule: winner };
}

/** One inspector rule card: a rule that wins at least one field on the row. */
export interface RuleCardState {
    readonly rule: FieldRule;
    /** The fields this rule wins on the row, in the order the currents were given. */
    readonly wonFields: readonly RuleField[];
    /** The won fields whose value on the row differs from the rule's. */
    readonly driftFields: readonly RuleField[];
}

/**
 * One card per distinct winning rule on the row, most specific first, then by id so the order never
 * depends on rule list order. An output a rule has but does not win on this row gets no divergence
 * marker, because applying the rule would not change it.
 */
export function computeRuleCardStates(
    rules: RuleSource,
    subject: RuleMatchSubject,
    currents: readonly RobotCurrentValue[]
): readonly RuleCardState[] {
    const byRule = new Map<string, RuleCardState>();
    for (const current of currents) {
        const state = computeFieldRuleRobotState(rules, subject, current);
        if (state.kind === "none") continue;
        const previous = byRule.get(state.rule.id);
        byRule.set(state.rule.id, {
            rule: state.rule,
            wonFields: [...(previous?.wonFields ?? []), current.field],
            driftFields:
                state.kind === "drift"
                    ? [...(previous?.driftFields ?? []), current.field]
                    : (previous?.driftFields ?? [])
        });
    }
    return [...byRule.values()].sort(
        (left, right) =>
            ruleScopeRank(right.rule) - ruleScopeRank(left.rule) ||
            (left.rule.id < right.rule.id ? -1 : left.rule.id > right.rule.id ? 1 : 0)
    );
}
