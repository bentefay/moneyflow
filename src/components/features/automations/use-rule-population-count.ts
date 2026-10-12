"use client";

/**
 * "N transactions would change now" for a draft, counted by the same engine Apply runs, so the line
 * and the result cannot disagree.
 */

import { useMemo } from "react";
import { type Temporal } from "temporal-polyfill";

import { useActiveFieldRules, useRulePopulation } from "@/lib/crdt";
import { type ApplyScope } from "@/lib/domain/automation/apply-mode";
import { countRulePopulation } from "@/lib/domain/automation/population";
import { buildFieldRule } from "@/lib/domain/automation/rules";

import { type ResolvedRuleWrite } from "./rule-editor-model";

/** The rule as Apply would leave it, before it has been validated into a `FieldRule`. */
export interface RulePopulationCandidate {
    /** The id the rule has or will have. A rule in the vault with this id is replaced by it. */
    readonly id: string;
    readonly descriptionText: string;
    readonly write: ResolvedRuleWrite;
}

export interface RulePopulationCountParams {
    /** `null` while the draft is invalid; the count is then hidden. */
    readonly candidate: RulePopulationCandidate | null;
    readonly scope: ApplyScope;
    /** The date Update new counts from; `null` where Update new means future imports only. */
    readonly referenceDate: Temporal.PlainDate | null;
    /** Rules Apply deletes, such as the owner a conflict move empties. */
    readonly excludedRuleIds?: readonly string[];
}

/** The count, or `undefined` when the draft cannot be built into a rule. */
export function useRulePopulationCount(params: RulePopulationCountParams): number | undefined {
    const { candidate, scope, referenceDate, excludedRuleIds } = params;
    const rules = useActiveFieldRules();
    const transactions = useRulePopulation();
    return useMemo(() => {
        if (candidate == null) return undefined;
        const built = buildFieldRule({
            id: candidate.id,
            descriptionText: candidate.descriptionText,
            accountId: candidate.write.accountId,
            amount: candidate.write.amount,
            outputs: candidate.write.outputs,
            createdAtEpochMs: 0
        });
        if (!built.ok) return undefined;
        const excluded = new Set(excludedRuleIds ?? []);
        return countRulePopulation({
            rule: built.value,
            rules: rules.filter((rule) => !excluded.has(rule.id)),
            transactions,
            scope,
            referenceDate
        });
    }, [candidate, excludedRuleIds, referenceDate, rules, scope, transactions]);
}
