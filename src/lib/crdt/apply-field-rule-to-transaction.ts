/**
 * Apply the active field rules to a SINGLE transaction (HS-007 / P17C "apply to this transaction").
 *
 * This is a thin, additive composition over already-integrated engine primitives — it introduces no
 * new write path. It simply:
 *
 * 1. resolves the transaction, at its known location when the caller supplies one, else by id
 *    (P16/queries `findTransactionById`),
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
import { type TransactionLocation } from "@/lib/crdt/mutations";
import { findTransaction, findTransactionById } from "@/lib/crdt/queries";
import { type Transaction, type VaultState } from "@/lib/crdt/schema";

export type ApplyFieldRulesToTransactionResult =
    | { readonly ok: true; readonly outcomes: readonly AppliedFieldRuleOutcome[] }
    | { readonly ok: false; readonly reason: "transaction-not-found" };

export interface ApplyFieldRulesToTransactionInput {
    readonly transactionId: string;
    /**
     * Where the caller last saw the row. Inside a draft, finding a row by id alone walks every
     * transaction in the vault, which dominates this action's cost on a large vault; the location
     * reads one day bucket. A location that no longer holds the row falls back to that walk.
     */
    readonly location?: Omit<TransactionLocation, "transactionId">;
}

function resolveTransaction(
    state: VaultState,
    input: ApplyFieldRulesToTransactionInput
): Transaction | undefined {
    const { transactionId, location } = input;
    const located =
        location == null
            ? undefined
            : findTransaction(state.transactions, { ...location, transactionId });
    return located ?? findTransactionById(state.transactions, transactionId)?.transaction;
}

export function applyFieldRulesToSingleTransaction(
    state: VaultState,
    input: ApplyFieldRulesToTransactionInput
): ApplyFieldRulesToTransactionResult {
    const transaction = resolveTransaction(state, input);
    if (transaction == null) return { ok: false, reason: "transaction-not-found" };
    const rules = readActiveFieldRules(state);
    const outcomes = applyFieldRulesToTransaction(state, rules, transaction);
    return { ok: true, outcomes };
}
