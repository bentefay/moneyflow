/**
 * A transaction's stable identity, as stored in the CRDT.
 *
 * Branded because the grid also handles person ids, tag ids and account ids, all of them bare
 * strings, and a row keyed by the wrong one fails silently: the row simply never matches.
 */
declare const TransactionIdBrand: unique symbol;
export type TransactionId = string & { readonly [TransactionIdBrand]: true };

/**
 * Tags a CRDT transaction id as such.
 *
 * The one place `as` is used for this brand, per the repo's rule that unavoidable coercion is
 * isolated in a small helper with a clean typed interface.
 */
export function asTransactionId(value: string): TransactionId {
    return value as TransactionId;
}
