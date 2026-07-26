/**
 * Apply the active field rules to a SINGLE transaction (HS-007 / P17C "apply to this transaction").
 *
 * This is a thin, additive composition over already-integrated engine primitives — it introduces no
 * new write path. It simply:
 *
 * 1. resolves the transaction by id (P16/queries `findTransactionById`),
 * 2. reads the currently active field rules (P17A `readActiveFieldRules`), and
 * 3. delegates to P17A `applyFieldRulesToTransaction`, which routes allocation writes strictly
 *    through the P16C replace-set boundary and alias writes through the P11 assign path.
 *
 * Because it reuses that engine wholesale, every safety property of the underlying writes is
 * inherited unchanged: an invalid complete allocation set is rejected with zero mutation, alias
 * writes are validated, and only the targeted transaction is touched.
 */

import {
    type AppliedFieldRuleOutcome,
    applyFieldRulesToTransaction,
    readActiveFieldRules
} from "@/lib/crdt/field-rules";
import { findTransactionById } from "@/lib/crdt/queries";
import { type VaultState } from "@/lib/crdt/schema";

export type ApplyFieldRulesToTransactionResult =
    | { readonly ok: true; readonly outcomes: readonly AppliedFieldRuleOutcome[] }
    | { readonly ok: false; readonly reason: "transaction-not-found" };

export function applyFieldRulesToSingleTransaction(
    state: VaultState,
    input: { readonly transactionId: string }
): ApplyFieldRulesToTransactionResult {
    const found = findTransactionById(state.transactions, input.transactionId);
    if (found == null) return { ok: false, reason: "transaction-not-found" };
    const rules = readActiveFieldRules(state);
    const outcomes = applyFieldRulesToTransaction(state, rules, found.transaction);
    return { ok: true, outcomes };
}
