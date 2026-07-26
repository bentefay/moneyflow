/**
 * Deterministic application of field rules at import and during explicit bulk operations
 * (HS-007 / P17A, deliverables #6 and #7).
 *
 * Planning is pure: for a transaction subject we select the single highest-precedence rule per
 * field (via the engine in `./rules`) and compute the resulting mutation. Application is bounded
 * (one pass per transaction), idempotent (re-applying the same rules converges) and
 * order-independent (each transaction is handled independently).
 *
 * Field-specific routing and boundaries:
 * - `tags` mutations go through `updateTransaction` (a plain `tagIds` replacement).
 * - `allocation` mutations go EXCLUSIVELY through P16C's `replaceTransactionAllocations`, which
 *   validates and atomically replaces the whole explicit set, removes absent keys and rejects an
 *   invalid set with no mutation. This module never writes allocation keys directly and never
 *   duplicates settlement/remainder logic.
 * - `descriptionAlias` mutations are PLANNED but not applied here: the description-alias id is a
 *   dedicated write boundary (P11) that `updateTransaction` intentionally skips. The plan is
 *   surfaced as `deferred-alias-boundary` so the alias write path can consume it. See Q-proposal
 *   Q-P17A-ALIAS-WRITE.
 *
 * Description rules never touch manual transactions; tag and whole-person-allocation rules do. That
 * eligibility is enforced by the matcher (`ruleMatchesSubject`) via `subject.isManual`.
 */

import {
    type AllocationBoundaryError,
    replaceTransactionAllocations
} from "@/lib/crdt/allocations";
import {
    type TransactionLocation,
    findTransactionInStore,
    updateTransaction
} from "@/lib/crdt/mutations";
import { type TransactionStore } from "@/lib/crdt/schema";
import { type ValidatedAllocationSet } from "@/lib/domain/allocation";

import {
    type FieldRule,
    type RuleMatchSubject,
    resolveTagRuleResult,
    selectWinningRulesByField
} from "./rules";

/** A transaction to apply rules to: the match facts, its location and its current tag set. */
export interface RuleApplicationTarget {
    readonly subject: RuleMatchSubject;
    readonly location: TransactionLocation;
    readonly currentTagIds: readonly string[];
}

/** Deterministic, pre-computed mutation for a single field. */
export type FieldRulePlan =
    | {
          readonly field: "tags";
          readonly ruleId: string;
          readonly previousTagIds: readonly string[];
          readonly nextTagIds: readonly string[];
          readonly changed: boolean;
      }
    | {
          readonly field: "allocation";
          readonly ruleId: string;
          readonly allocations: ValidatedAllocationSet;
      }
    | { readonly field: "descriptionAlias"; readonly ruleId: string; readonly aliasId: string };

function sameSequence(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Pure: the set of field mutations the winning rules imply for a target. At most one plan per
 * field. The list is the logical unit to group for a single undo step (P09).
 */
export function planRuleApplications(
    rules: readonly FieldRule[],
    target: RuleApplicationTarget
): readonly FieldRulePlan[] {
    const winners = selectWinningRulesByField(rules, target.subject);
    const plans: FieldRulePlan[] = [];

    const tagsWinner = winners.tags;
    if (tagsWinner != null && tagsWinner.action.field === "tags") {
        const nextTagIds = resolveTagRuleResult(target.currentTagIds, tagsWinner.action);
        plans.push({
            field: "tags",
            ruleId: tagsWinner.id,
            previousTagIds: [...target.currentTagIds],
            nextTagIds,
            changed: !sameSequence(nextTagIds, target.currentTagIds)
        });
    }

    const allocationWinner = winners.allocation;
    if (allocationWinner != null && allocationWinner.action.field === "allocation") {
        plans.push({
            field: "allocation",
            ruleId: allocationWinner.id,
            allocations: allocationWinner.action.allocations
        });
    }

    const aliasWinner = winners.descriptionAlias;
    if (aliasWinner != null && aliasWinner.action.field === "descriptionAlias") {
        plans.push({
            field: "descriptionAlias",
            ruleId: aliasWinner.id,
            aliasId: aliasWinner.action.aliasId
        });
    }

    return plans;
}

/** Outcome of executing a single plan against the store. */
export type PlanApplicationOutcome =
    | { readonly field: "tags"; readonly ruleId: string; readonly status: "applied" | "unchanged" }
    | {
          readonly field: "allocation";
          readonly ruleId: string;
          readonly status: "applied";
          readonly previousAllocations: Readonly<Record<string, number>>;
      }
    | {
          readonly field: "allocation";
          readonly ruleId: string;
          readonly status: "rejected";
          readonly error: AllocationBoundaryError;
      }
    | {
          readonly field: "descriptionAlias";
          readonly ruleId: string;
          readonly status: "deferred-alias-boundary";
          readonly aliasId: string;
      };

function readExplicitAllocations(
    store: TransactionStore,
    location: TransactionLocation
): Readonly<Record<string, number>> {
    const allocations = findTransactionInStore(store, location)?.allocations;
    const explicit: Record<string, number> = {};
    if (allocations == null) return explicit;
    for (const [personId, value] of Object.entries(allocations)) {
        if (personId !== "$cid" && typeof value === "number") explicit[personId] = value;
    }
    return explicit;
}

/**
 * Execute planned mutations for one transaction as a single logical group. Allocation writes are
 * routed through P16C; the previous allocation set is captured for undo. Idempotent: re-running
 * with the same rules produces `unchanged` for tags and an identical allocation set.
 */
export function applyRulePlans(
    store: TransactionStore,
    target: RuleApplicationTarget,
    plans: readonly FieldRulePlan[]
): readonly PlanApplicationOutcome[] {
    const outcomes: PlanApplicationOutcome[] = [];
    for (const plan of plans) {
        switch (plan.field) {
            case "tags": {
                if (plan.changed) {
                    updateTransaction(store, {
                        location: target.location,
                        updates: { tagIds: [...plan.nextTagIds] }
                    });
                    outcomes.push({ field: "tags", ruleId: plan.ruleId, status: "applied" });
                } else {
                    outcomes.push({ field: "tags", ruleId: plan.ruleId, status: "unchanged" });
                }
                break;
            }
            case "allocation": {
                const previousAllocations = readExplicitAllocations(store, target.location);
                const result = replaceTransactionAllocations(store, {
                    allocations: plan.allocations,
                    location: target.location
                });
                if (result.ok) {
                    outcomes.push({
                        field: "allocation",
                        ruleId: plan.ruleId,
                        status: "applied",
                        previousAllocations
                    });
                } else {
                    outcomes.push({
                        field: "allocation",
                        ruleId: plan.ruleId,
                        status: "rejected",
                        error: result.error
                    });
                }
                break;
            }
            case "descriptionAlias": {
                // Alias id is a dedicated (P11) write boundary; surface the intent, do not write.
                outcomes.push({
                    field: "descriptionAlias",
                    ruleId: plan.ruleId,
                    status: "deferred-alias-boundary",
                    aliasId: plan.aliasId
                });
                break;
            }
            default:
                return outcomes;
        }
    }
    return outcomes;
}

export interface BulkApplicationEntry {
    readonly location: TransactionLocation;
    readonly outcomes: readonly PlanApplicationOutcome[];
}

/**
 * Apply rules across many transactions (import commit or explicit bulk op). Each transaction is an
 * independent logical group, so the whole operation is bounded and order-independent.
 */
export function applyRulesToTargets(
    store: TransactionStore,
    rules: readonly FieldRule[],
    targets: readonly RuleApplicationTarget[]
): readonly BulkApplicationEntry[] {
    return targets.map((target) => ({
        location: target.location,
        outcomes: applyRulePlans(store, target, planRuleApplications(rules, target))
    }));
}
