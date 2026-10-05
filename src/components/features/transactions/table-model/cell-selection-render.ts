/**
 * Projecting cell selection down to what one row needs to repaint.
 *
 * `cellSelection` is an ordered log of rectangle operations, not a per-cell map, and a drag writes
 * to it on every cell boundary the pointer crosses. So a component subscribed to the raw slice
 * re-renders on every step of a drag, and one subscribed at the table level reconciles every cell
 * in the grid each time. At 10,000 rows that is the difference between a smooth drag and a
 * locked-up tab.
 *
 * The fix is to subscribe per row and project through a value that changes only when *that row's*
 * appearance changes. That is what {@link transactionCellSelectionRowKey} is: a small string
 * derived from the memoized positive bounds, covering the row itself plus the rows immediately
 * above and below — because those two decide whether the row draws a top or bottom edge.
 *
 * Intended use, from the row component:
 *
 * ```tsx
 * <table.Subscribe
 *   source={table.atoms.cellSelection}
 *   selector={() => transactionCellSelectionRowKey(table, displayIndex)}
 * >
 *   {(rowKey) => (
 *     <TransactionRow
 *       selectedCellMarkers={transactionSelectedCellMarkersFromRowKey(rowKey, columnIds)}
 *       …
 *     />
 *   )}
 * </table.Subscribe>
 * ```
 *
 * The selector ignores its source argument on purpose: the raw log is the *trigger*, and the key is
 * the projection. The render prop must consume that key rather than re-reading opaque table methods;
 * React Compiler can otherwise retain their result on stable cell identity after the atom advances.
 */

import type { TransactionTable } from "./features";

/**
 * A value that changes precisely when this row's selection painting should change.
 *
 * Encodes, for the row and each of its two neighbours, the column spans of every positive region
 * covering it. Two different selections that would paint this row identically produce the same
 * string, which is the whole point — a drag three screens away must not repaint it.
 *
 * `getCellSelectionBounds()` is memoized by the feature, so calling this once per visible row costs
 * one bounds computation per change rather than one per row.
 */
export function transactionCellSelectionRowKey(
    table: TransactionTable,
    displayRowIndex: number
): string {
    const bounds = table.getCellSelectionBounds();
    if (bounds.length === 0) return "";

    const parts: string[] = [];
    // The row's own spans decide which of its cells are filled; its neighbours' spans decide
    // whether it draws a top or a bottom edge. Nothing else about the selection can affect it.
    for (const offset of [-1, 0, 1]) {
        const rowIndex = displayRowIndex + offset;
        for (const bound of bounds) {
            if (rowIndex < bound.minRowIndex || rowIndex > bound.maxRowIndex) continue;
            parts.push(
                `${String(offset)}:${String(bound.minColumnIndex)}-${String(bound.maxColumnIndex)}`
            );
        }
    }
    return parts.join("|");
}

/**
 * Resolves the current row's selected column markers from its subscription key.
 *
 * The render prop must consume the selector value directly. Re-reading `cell.getIsSelected()` from a
 * compiled callback lets React Compiler cache the opaque method call on cell identity, leaving ARIA
 * selection painted for the previous range even though the external atom has advanced.
 */
export function transactionSelectedCellMarkersFromRowKey(
    rowKey: string,
    columnIds: readonly string[]
): ReadonlySet<string> {
    const markers = new Set<string>();
    for (const part of rowKey.split("|")) {
        const currentRowSpan = /^0:(\d+)-(\d+)$/.exec(part);
        if (currentRowSpan == null) continue;
        const minimum = Number(currentRowSpan[1]);
        const maximum = Number(currentRowSpan[2]);
        for (let columnIndex = minimum; columnIndex <= maximum; columnIndex += 1) {
            const columnId = columnIds[columnIndex];
            if (columnId != null) markers.add(columnId);
        }
    }
    return markers;
}
