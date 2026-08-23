/**
 * Canonical physical-copy selection for a logical transaction id.
 *
 * Concurrent moves and edits can leave two physical copies of one logical transaction id in the
 * hierarchy. Every flat read collapses them by keeping the copy with the lexicographically smallest
 * key, so all peers agree on the survivor without exchanging extra state.
 *
 * This is the single home for the rule. The cursor needs the identical tie-break to stay
 * observationally equivalent to `getAllTransactions`, and `queries.ts` — which used to carry a
 * private copy — now imports from here, so the two reads cannot drift into disagreeing about which
 * physical copy survives.
 */

import type { Transaction } from "./schema";

export function canonicalTransactionKey(transaction: Transaction): string {
    return (
        transaction.$cid ??
        JSON.stringify({
            accountId: transaction.accountId,
            allocations: Object.entries(transaction.allocations).sort(([left], [right]) =>
                left.localeCompare(right)
            ),
            amount: transaction.amount,
            originalAmount: transaction.originalAmount,
            creationInstant: transaction.creationInstant.toString(),
            date: transaction.date.toString(),
            deletedAt: transaction.deletedAt?.toString(),
            description: transaction.description,
            descriptionAliasId: transaction.descriptionAliasId,
            importId: transaction.importId,
            importRowIndex: transaction.importRowIndex,
            notes: transaction.notes,
            statusId: transaction.statusId,
            tagIds: [...transaction.tagIds]
        })
    );
}

/** Ties keep `left`, which is the copy encountered first by the traversal. */
export function preferCanonicalTransaction(left: Transaction, right: Transaction): Transaction {
    return canonicalTransactionKey(left).localeCompare(canonicalTransactionKey(right)) <= 0
        ? left
        : right;
}
