/**
 * Copying a cell selection out of the transaction grid.
 *
 * v9 deliberately stops short of producing clipboard text: `getSelectedCellRangesData()` hands
 * back raw values, and the delimiter, the representation of an absent value and the quoting rules
 * are application decisions. This module makes those decisions for the transaction grid.
 *
 * **There is no prior implementation to match.** The grid has no copy affordance today — no
 * keybinding, no clipboard write, and no multi-cell selection for one to act on. So this is not a
 * port of an existing output shape; it is the first one, and the choices below are argued rather
 * than inherited. They are made per column in `TransactionColumnMeta.copyValue` and summarised
 * here:
 *
 * - **Tab-separated, newline-terminated rows.** What every spreadsheet accepts from a paste.
 * - **Values as the cell means them, not as the cell paints them.** A date copies as its stored
 *   ISO string rather than the locale-abbreviated `15/1` the cell shows, and an amount copies as a
 *   bare decimal at the account currency's precision rather than with a symbol. Both survive a
 *   reader in another locale; the painted forms do not.
 * - **Absent values copy as an empty field**, never as a dash or a literal `null`, because in the
 *   destination those become data.
 *
 * The selection itself is read entirely through the native cell-selection APIs. Nothing here
 * decides *what* is selected.
 */

import type { TransactionColumnMeta, TransactionTable, TransactionTableRow } from "./features";
import { asTransactionCellId, type TransactionCellId } from "./ids";

/** How rows are separated in copied text. `\n` rather than `\r\n`; every spreadsheet accepts it. */
const ROW_SEPARATOR = "\n";
const FIELD_SEPARATOR = "\t";

/**
 * Disjoint selection regions are separated by a blank line.
 *
 * A subtraction can split one dragged rectangle into several positive regions, and pasting them as
 * one block would silently join rows that are not adjacent. A blank line is the least surprising
 * thing a spreadsheet does with that.
 */
const REGION_SEPARATOR = "\n\n";

/**
 * Quotes a field that would otherwise corrupt the paste.
 *
 * A tab or newline inside a value would be read as a field or row boundary, so such a value is
 * wrapped in quotes with its own quotes doubled — the rule every TSV/CSV reader applies. Without
 * it, a transaction described as `Rent<tab>June` gains a phantom column.
 */
function quoteField(value: string): string {
    if (!/["\t\r\n]/.test(value)) return value;
    return `"${value.replaceAll('"', '""')}"`;
}

export interface TransactionClipboardPayload {
    /** Tab-separated text, ready for `navigator.clipboard.writeText`. */
    readonly text: string;
    /**
     * The cells the text was built from, in the same row-major order v9 reports them.
     *
     * Exposed so a caller — and the tests — can check the payload against
     * `table.getSelectedCellIds()` rather than trusting that this module and the feature walked
     * the same selection.
     */
    readonly cellIds: readonly TransactionCellId[];
}

/** Nothing selected. */
const EMPTY_PAYLOAD: TransactionClipboardPayload = { cellIds: [], text: "" };

/**
 * How one cell's value reads in the clipboard.
 *
 * Every column this grid defines carries meta. A column that somehow does not falls back to its
 * value's own string form rather than to nothing, so a column added ahead of its meta is legible
 * instead of silently blank.
 */
function copyText(
    meta: TransactionColumnMeta | undefined,
    value: unknown,
    row: TransactionTableRow
): string {
    if (meta != null) return meta.copyValue(value, row);
    return value == null ? "" : String(value);
}

/**
 * Serialises the current cell selection.
 *
 * The walk mirrors the feature's own: the memoized positive bounds, resolved against the rows in
 * display order and the visible leaf columns in render order. Those are the same two lists cell
 * selection indexes against — which is one reason no column-pinning feature is registered, since
 * pinning reorders the feature's list and not `getVisibleLeafColumns()`.
 *
 * Costs one pass over the selected area, and only when called. Highlighting a selection never
 * reaches this.
 */
export function transactionSelectionAsClipboardPayload(
    table: TransactionTable
): TransactionClipboardPayload {
    const bounds = table.getCellSelectionBounds();
    if (bounds.length === 0) return EMPTY_PAYLOAD;

    const rows = table.getRowsInDisplayOrder();
    const columns = table.getVisibleLeafColumns();

    const cellIds: TransactionCellId[] = [];
    const regions: string[] = [];

    for (const bound of bounds) {
        const lines: string[] = [];
        for (let rowIndex = bound.minRowIndex; rowIndex <= bound.maxRowIndex; rowIndex++) {
            const row = rows[rowIndex];
            if (row == null) continue;

            const cellsByColumnId = row.getAllCellsByColumnId();
            const fields: string[] = [];
            for (
                let columnIndex = bound.minColumnIndex;
                columnIndex <= bound.maxColumnIndex;
                columnIndex++
            ) {
                const column = columns[columnIndex];
                if (column == null) continue;
                const cell = cellsByColumnId[column.id];
                // A cell the user cannot select is a cell they cannot have meant to copy. Asking
                // the cell rather than the column def also honours a per-cell enable predicate.
                if (cell == null || !cell.getCanSelect()) continue;

                cellIds.push(asTransactionCellId(cell.id));
                fields.push(
                    quoteField(copyText(column.columnDef.meta, cell.getValue(), row.original))
                );
            }
            if (fields.length > 0) lines.push(fields.join(FIELD_SEPARATOR));
        }
        if (lines.length > 0) regions.push(lines.join(ROW_SEPARATOR));
    }

    return { cellIds, text: regions.join(REGION_SEPARATOR) };
}
