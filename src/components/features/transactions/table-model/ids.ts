/**
 * Stable identifiers for the transaction grid's TanStack Table v9 model.
 *
 * Cell selection state is keyed by row id plus column id, so these identifiers have to survive
 * re-render, filtering and paging unchanged. Anything derived from a position — a row index, a
 * column index, an array offset — cannot, because the cursor pages rows in and filters reorder
 * them while a selection is open. Everything here is therefore derived from domain identity.
 */

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

/**
 * The grid's fixed columns, in render order.
 *
 * This order is the grid's contract: it is the order the header renders, the order
 * `grid-template-columns` tracks are emitted in, and — because no column-ordering or
 * column-pinning feature is registered — the order cell selection resolves ranges against. The
 * dynamic allocation columns are spliced in between `status` and `amount`, matching
 * `TransactionRow`'s markup.
 */
export const FIXED_TRANSACTION_COLUMN_IDS = [
    "checkbox",
    "date",
    "description",
    "account",
    "tags",
    "status",
    "amount",
    "actions"
] as const;

export type FixedTransactionColumnId = (typeof FIXED_TRANSACTION_COLUMN_IDS)[number];

/** One person's allocation-percentage column. Matches the existing `allocation:${personId}` field. */
export type AllocationTransactionColumnId = `allocation:${string}`;

/**
 * Every column identity the grid can present.
 *
 * A closed union rather than an opaque brand: the fixed set is known at compile time, so the
 * union catches a misspelled column id at the call site where a brand would only catch a raw
 * `string`. Allocation columns stay open because their person ids are runtime data.
 */
export type TransactionColumnId = FixedTransactionColumnId | AllocationTransactionColumnId;

/** The allocation column belonging to one person. */
export function allocationColumnId(personId: string): AllocationTransactionColumnId {
    return `allocation:${personId}`;
}

/**
 * The `data-cell` markers the row markup actually carries.
 *
 * Read off `TransactionRow.tsx`, not inferred from the column list, because the two do not
 * correspond one-to-one and the difference is load-bearing:
 *
 * - There is **no `actions` marker**. The actions column is an unmarked container holding two
 *   separately-marked controls, `expand` and `delete`.
 * - `notes` is not a column at all. It lives on the expanded second row, spanning
 *   `gridColumn: 2 / -1`.
 *
 * These strings are what arrow-key navigation walks, what presence reports as the field a peer is
 * editing, and what the E2E suite addresses cells by. Changing one is a product change.
 */
export const TRANSACTION_CELL_MARKERS = [
    "checkbox",
    "date",
    "description",
    "account",
    "tags",
    "status",
    "amount",
    "expand",
    "delete",
    "notes"
] as const;

export type FixedTransactionCellMarker = (typeof TRANSACTION_CELL_MARKERS)[number];

/** Every `data-cell` value the grid emits. */
export type TransactionCellMarker = FixedTransactionCellMarker | AllocationTransactionColumnId;

/**
 * The markers inside the actions column.
 *
 * The column itself carries no marker, so a caller wanting to address its controls needs these
 * rather than the column id.
 */
export const ACTIONS_COLUMN_CELL_MARKERS = ["expand", "delete"] as const;

/** The marker on the expanded notes row, which no column owns. */
export const NOTES_CELL_MARKER = "notes" as const;

/** Whether a column id names a person's allocation column. */
export function isAllocationColumnId(
    columnId: TransactionColumnId
): columnId is AllocationTransactionColumnId {
    return columnId.startsWith("allocation:");
}

/** The person whose allocation an allocation column presents. */
export function personIdOfAllocationColumn(columnId: AllocationTransactionColumnId): string {
    return columnId.slice("allocation:".length);
}

/**
 * A cell's identity within the grid.
 *
 * The scheme is `${transactionId}_${columnId}`, which is not a choice — it is exactly how v9
 * constructs `cell.id` (`core/cells/constructCell.ts`). It is reproduced here so callers can
 * build the id of a cell they have not materialised, and so the copy adapter can be checked
 * against `table.getSelectedCellIds()` rather than trusting that the two agree.
 *
 * The separator is ambiguous in general — v9's own cell-selection state stores corners as two
 * flat fields precisely because a user-supplied `getRowId` may return ids containing any
 * separator. {@link resolveTransactionCellId} therefore resolves against the grid's known column
 * ids instead of splitting on the last underscore, and reports when the id resolves ambiguously.
 */
declare const TransactionCellIdBrand: unique symbol;
export type TransactionCellId = string & { readonly [TransactionCellIdBrand]: true };

/** Builds the id v9 gives the cell at this row and column. */
export function transactionCellId(
    transactionId: TransactionId,
    columnId: TransactionColumnId
): TransactionCellId {
    return asTransactionCellId(`${transactionId}_${columnId}`);
}

/**
 * Tags a v9 `cell.id` as this grid's cell id.
 *
 * Every cell in this table is constructed by v9 from a row whose id is a transaction id and a
 * column whose id is a {@link TransactionColumnId}, so `cell.id` already *is* a
 * {@link TransactionCellId} — this only says so. Isolated here rather than repeated at call sites,
 * per the repo's rule for unavoidable coercion.
 */
export function asTransactionCellId(value: string): TransactionCellId {
    return value as TransactionCellId;
}

/** A cell id resolved back into the row and column it names. */
export interface ResolvedTransactionCell {
    readonly transactionId: TransactionId;
    readonly columnId: TransactionColumnId;
}

export type ResolveTransactionCellIdResult =
    | { readonly ok: true; readonly value: ResolvedTransactionCell }
    | { readonly ok: false; readonly error: ResolveTransactionCellIdError };

export type ResolveTransactionCellIdError =
    /** No registered column id is a suffix of this cell id. */
    | { readonly kind: "unknown-column" }
    /**
     * Two registered column ids both suffix this cell id, so the row id cannot be recovered. Only
     * reachable if one column id ends with `_` followed by another column id; the grid's own ids
     * contain no underscore, so this is a guard against a future column, not a live case.
     */
    | { readonly kind: "ambiguous"; readonly candidates: readonly TransactionColumnId[] };

/**
 * Recovers the row and column a cell id names, given the columns the grid currently presents.
 *
 * Resolution is by suffix match against that known set rather than by splitting, because a
 * transaction id is an opaque string that may itself contain the separator. A `Result` rather
 * than a throw or a `null`: an unresolvable cell id means the caller's column set and the id
 * disagree, and which of the two ways they disagree is worth reporting.
 */
export function resolveTransactionCellId(
    cellId: TransactionCellId,
    columnIds: Iterable<TransactionColumnId>
): ResolveTransactionCellIdResult {
    const candidates: TransactionColumnId[] = [];
    for (const columnId of columnIds) {
        if (cellId.endsWith(`_${columnId}`)) candidates.push(columnId);
    }

    const [columnId] = candidates;
    if (columnId == null) return { ok: false, error: { kind: "unknown-column" } };
    if (candidates.length > 1) {
        return { ok: false, error: { kind: "ambiguous", candidates } };
    }

    return {
        ok: true,
        value: {
            columnId,
            transactionId: asTransactionId(cellId.slice(0, -(columnId.length + 1)))
        }
    };
}
