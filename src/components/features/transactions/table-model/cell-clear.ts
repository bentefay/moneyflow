/**
 * What Delete or Backspace does to the cells of the transaction grid.
 *
 * A clear blanks a value; it never deletes a transaction. Each column decides what blank means:
 *
 * - **Amount** — an absent `amount`, shown as a dash.
 * - **Allocation** — an absent key, which counts as 0% like every blank allocation.
 * - **Tags** — the empty tag set.
 * - **Description** — no alias, so the row shows its own description again. A manual row's own
 *   description is blanked too; an imported row's is the bank's raw text, which is immutable.
 * - **Date, account and status** are required, and checkbox and actions hold no value, so a clear
 *   skips them.
 *
 * Planning is pure: it reads the rows, decides what each clearable cell needs, and leaves the
 * writes to the caller. A cell that is already blank plans nothing, so a clear never writes a no-op.
 */

import {
    asTransactionId,
    isAllocationColumnId,
    personIdOfAllocationColumn,
    type TransactionColumnId,
    type TransactionId
} from "./ids";

/** The transaction fields a clear reads. Structural, so the vault's `Transaction` satisfies it. */
export interface TransactionClearableRow {
    readonly id: string;
    readonly amount?: number | undefined;
    readonly description: string;
    readonly descriptionAliasId?: string | undefined;
    readonly importId?: string | undefined;
    readonly tagIds?: readonly string[] | undefined;
    /** A Loro-backed record, so it is read through own enumerable numeric values only. */
    readonly allocations?: unknown;
}

interface TransactionCellClearBase {
    readonly transactionId: TransactionId;
    readonly columnId: TransactionColumnId;
}

/** One cell's clear: the write that makes it blank. */
export type TransactionCellClear =
    | (TransactionCellClearBase & { readonly kind: "amount" })
    | (TransactionCellClearBase & { readonly kind: "allocation"; readonly personId: string })
    | (TransactionCellClearBase & { readonly kind: "tags" })
    | (TransactionCellClearBase & {
          readonly kind: "description";
          /** The alias to unlink from this transaction only, or `null` when it has none. */
          readonly aliasId: string | null;
          /** Whether a manual row's own description text must be blanked as well. */
          readonly blankDescription: boolean;
      });

/** Whether Delete has anything it could ever clear in this column. */
export function isClearableTransactionColumn(columnId: TransactionColumnId): boolean {
    return (
        columnId === "amount" ||
        columnId === "tags" ||
        columnId === "description" ||
        isAllocationColumnId(columnId)
    );
}

function hasAllocation(allocations: unknown, personId: string): boolean {
    if (allocations == null || typeof allocations !== "object") return false;
    const descriptor = Object.getOwnPropertyDescriptor(allocations, personId);
    return descriptor?.enumerable === true && typeof descriptor.value === "number";
}

/** The clear one cell needs, or `null` when the column is not clearable or already blank. */
export function planTransactionCellClear(
    row: TransactionClearableRow,
    transactionId: TransactionId,
    columnId: TransactionColumnId
): TransactionCellClear | null {
    if (columnId === "amount") {
        return row.amount == null ? null : { columnId, kind: "amount", transactionId };
    }
    if (columnId === "tags") {
        return (row.tagIds?.length ?? 0) === 0 ? null : { columnId, kind: "tags", transactionId };
    }
    if (columnId === "description") {
        const aliasId = row.descriptionAliasId == null ? null : row.descriptionAliasId;
        const blankDescription = row.importId == null && row.description !== "";
        return aliasId == null && !blankDescription
            ? null
            : { aliasId, blankDescription, columnId, kind: "description", transactionId };
    }
    if (isAllocationColumnId(columnId)) {
        const personId = personIdOfAllocationColumn(columnId);
        return hasAllocation(row.allocations, personId)
            ? { columnId, kind: "allocation", personId, transactionId }
            : null;
    }
    return null;
}

/**
 * Every clear a rectangle needs, row-major, skipping cells that are not clearable or already blank.
 *
 * `rows` and `columnIds` are the rectangle's rows and columns in display order, so a one-cell
 * rectangle plans at most one clear.
 */
export function planTransactionRangeClear(
    rows: readonly TransactionClearableRow[],
    columnIds: readonly TransactionColumnId[]
): readonly TransactionCellClear[] {
    const clearableColumns = columnIds.filter(isClearableTransactionColumn);
    return rows.flatMap((row) => {
        const transactionId = asTransactionId(row.id);
        return clearableColumns.flatMap((columnId) => {
            const clear = planTransactionCellClear(row, transactionId, columnId);
            return clear == null ? [] : [clear];
        });
    });
}
