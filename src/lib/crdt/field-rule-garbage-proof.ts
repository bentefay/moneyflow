import { collectibleRuleIdSteps } from "@/lib/domain/automation/rule-garbage";
import {
    decodeFieldRule,
    type FieldRule,
    type RuleMatchSubject
} from "@/lib/domain/automation/rules";

import { ruleMatchSubjectForTransaction } from "./field-rules";
import { iterateActivePublicTransactionRepresentations } from "./queries";
import type { Transaction, VaultState } from "./schema";
import { preferCanonicalTransaction } from "./transaction-canonical-key";

/** A proof advances one record or reach member per maintenance item. */
export interface FieldRuleGarbageProof {
    readonly state: VaultState;
    readonly retainedRuleIds?: ReadonlySet<string>;
    readonly iterator: Generator<void, readonly string[]>;
    completedIds?: readonly string[];
}

export function createFieldRuleGarbageProof(
    state: VaultState,
    retainedRuleIds?: ReadonlySet<string>
): FieldRuleGarbageProof {
    return { state, retainedRuleIds, iterator: proveGarbage(state, retainedRuleIds) };
}

/** Cache completion because a frame may run out of time between discovery and application. */
export function advanceFieldRuleGarbageProof(
    proof: FieldRuleGarbageProof
): readonly string[] | undefined {
    if (proof.completedIds != null) return proof.completedIds;
    const next = proof.iterator.next();
    if (next.done) proof.completedIds = next.value;
    return proof.completedIds;
}

function* proveGarbage(
    state: VaultState,
    retainedRuleIds?: ReadonlySet<string>
): Generator<void, readonly string[]> {
    const rules: FieldRule[] = [];
    for (const [id, wire] of Object.entries(state.fieldRules)) {
        if (
            id !== "$cid" &&
            typeof wire === "object" &&
            wire != null &&
            wire.deletedAtEpochMs == null
        ) {
            const decoded = decodeFieldRule(wire);
            if (decoded.ok) rules.push(decoded.value);
        }
        yield;
    }
    if (!rules.some((rule) => rule.reach.kind === "transactions")) return [];
    const transactions = new Map<string, Transaction>();
    for (const transaction of iterateActivePublicTransactionRepresentations(state.transactions)) {
        const previous = transactions.get(transaction.id);
        transactions.set(
            transaction.id,
            previous == null ? transaction : preferCanonicalTransaction(previous, transaction)
        );
        yield;
    }
    const subjects = new Map<string, RuleMatchSubject>();
    for (const transaction of transactions.values()) {
        subjects.set(transaction.id, ruleMatchSubjectForTransaction(state, transaction));
        yield;
    }
    return [...(yield* collectibleRuleIdSteps(rules, subjects, 32, retainedRuleIds))];
}
