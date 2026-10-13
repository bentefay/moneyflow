/**
 * Which transactions a rule would change now, and whether one transaction already carries what a
 * rule implies.
 *
 * Both questions reuse the engine: the winner per field comes from {@link selectWinningRule}, the
 * scope cutoff from {@link isOnOrAfterTransactionDate} and the tag result from
 * {@link resolveTagRuleResult}, so "would change" means exactly what Apply then does. Pure.
 */

import { type Temporal } from "temporal-polyfill";

import { assertNever } from "@/lib/utils/exhaustive";

import { type ApplyScope } from "./apply-mode";
import { type RuleSource, rulesKeyedOnText } from "./rule-index";
import {
    type FieldRule,
    isOnOrAfterTransactionDate,
    resolveTagRuleResult,
    RULE_FIELDS,
    type RuleField,
    type RuleMatchSubject,
    selectWinningRule
} from "./rules";

/** A transaction's current value for one rule field, discriminated on the field. */
export type RuleFieldValue =
    | { readonly field: "descriptionAlias"; readonly currentAliasId: string | null }
    | { readonly field: "tags"; readonly currentTagIds: readonly string[] }
    | {
          readonly field: "allocation";
          readonly currentAllocations: Readonly<Record<string, number>>;
      };

/** One transaction as the population count sees it: its match facts, date and current values. */
export interface RulePopulationTransaction {
    readonly subject: RuleMatchSubject;
    readonly date: Temporal.PlainDate;
    readonly aliasId: string | null;
    readonly tagIds: readonly string[];
    readonly allocations: Readonly<Record<string, number>>;
}

function sameSequence(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameAllocations(
    left: Readonly<Record<string, number>>,
    right: Readonly<Record<string, number>>
): boolean {
    const leftKeys = Object.keys(left);
    if (leftKeys.length !== Object.keys(right).length) return false;
    return leftKeys.every((key) => Object.is(left[key], right[key]));
}

/**
 * Whether `rule`'s output for `current.field` already holds on the transaction: `true` when it
 * agrees, `false` when applying it would change the value, `null` when the rule has no such output.
 */
export function ruleOutputAgrees(
    rule: Pick<FieldRule, "outputs">,
    current: RuleFieldValue
): boolean | null {
    switch (current.field) {
        case "descriptionAlias": {
            const output = rule.outputs.descriptionAlias;
            return output == null ? null : output.aliasId === current.currentAliasId;
        }
        case "tags": {
            const output = rule.outputs.tags;
            if (output == null) return null;
            return sameSequence(
                resolveTagRuleResult(current.currentTagIds, output),
                current.currentTagIds
            );
        }
        case "allocation": {
            const output = rule.outputs.allocation;
            if (output == null) return null;
            return sameAllocations(output.allocations, current.currentAllocations);
        }
        default:
            return assertNever(current, "rule field value");
    }
}

/** The population transaction's current value for `field`. */
export function populationFieldValue(
    transaction: RulePopulationTransaction,
    field: RuleField
): RuleFieldValue {
    switch (field) {
        case "descriptionAlias":
            return { field, currentAliasId: transaction.aliasId };
        case "tags":
            return { field, currentTagIds: transaction.tagIds };
        case "allocation":
            return { field, currentAllocations: transaction.allocations };
        default:
            return assertNever(field);
    }
}

export interface RulePopulationQuery {
    /** The rule as Apply would leave it. Replaces any rule in `rules` with the same id. */
    readonly rule: FieldRule;
    /** The other active rules, which can outrank `rule` on a field. A list or its index. */
    readonly rules: RuleSource;
    /** Rules in `rules` that Apply deletes, such as the owner a conflict move empties. */
    readonly excludedRuleIds?: ReadonlySet<string>;
    readonly transactions: readonly RulePopulationTransaction[];
    readonly scope: ApplyScope;
    /**
     * The date Update new counts from, inclusive. `null` on the Automations page, where Update new
     * means future imports only, so nothing changes now.
     */
    readonly referenceDate: Temporal.PlainDate | null;
}

/**
 * How many transactions Apply would change now: those in scope on which `rule` wins at least one of
 * its output fields and that output differs from the current value.
 */
export function countRulePopulation(query: RulePopulationQuery): number {
    const { rule, scope, referenceDate } = query;
    if (scope === "new" && referenceDate == null) return 0;
    // Only rules keyed on the same text can match where `rule` does, so no other rule can outrank
    // it anywhere it could win. Narrowing once here keeps every per-row selection small.
    const excluded = query.excludedRuleIds;
    const rules = [
        ...rulesKeyedOnText(query.rules, rule.descriptionText).filter(
            (candidate) => candidate.id !== rule.id && !(excluded?.has(candidate.id) ?? false)
        ),
        rule
    ];
    const fields = RULE_FIELDS.filter((field) => rule.outputs[field] != null);
    return query.transactions.filter((transaction) => {
        if (
            scope === "new" &&
            referenceDate != null &&
            !isOnOrAfterTransactionDate(transaction.date, referenceDate)
        ) {
            return false;
        }
        return fields.some(
            (field) =>
                selectWinningRule(rules, field, transaction.subject)?.id === rule.id &&
                ruleOutputAgrees(rule, populationFieldValue(transaction, field)) === false
        );
    }).length;
}
