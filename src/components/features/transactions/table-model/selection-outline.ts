/**
 * Geometry for the single outline drawn around each selected rectangle.
 *
 * Painting a border on every selected cell doubles the line wherever two selected cells meet, and a
 * cell cannot paint across its neighbour's grid line, so the outline is drawn once per rectangle
 * over the rows and centred on the grid lines instead. Rows have one fixed height, so a rectangle's
 * vertical extent follows from matching-order indexes alone and stays right for rows that are not
 * mounted; horizontal edges come from the always-rendered header cells.
 */

/** A positive selection rectangle in the table's display order, as TanStack resolves it. */
export interface DisplaySelectionBound {
    readonly minRowIndex: number;
    readonly maxRowIndex: number;
    readonly minColumnIndex: number;
    readonly maxColumnIndex: number;
}

/** One rectangle to outline: matching-order rows and display-order columns, all inclusive. */
export interface SelectionOutlineRect {
    readonly firstRow: number;
    readonly lastRow: number;
    readonly firstColumn: number;
    readonly lastColumn: number;
}

/** A column's left and right box edges, in the overlay's coordinate space. */
export interface ColumnEdges {
    readonly left: number;
    readonly right: number;
}

export interface SelectionOutlineBox {
    readonly top: number;
    readonly left: number;
    readonly width: number;
    readonly height: number;
}

/**
 * Maps resolved display-order bounds to matching-order rows. The held window is contiguous apart
 * from pinned rows, which are never logical neighbours, so a rectangle spans every matching row
 * between its two corner rows whether or not those rows are held.
 */
export function selectionOutlineRects(
    bounds: readonly DisplaySelectionBound[],
    matchingIndexAt: (displayIndex: number) => number | undefined
): readonly SelectionOutlineRect[] {
    return bounds.flatMap((bound) => {
        const first = matchingIndexAt(bound.minRowIndex);
        const last = matchingIndexAt(bound.maxRowIndex);
        if (first == null || last == null) return [];
        return [
            {
                firstRow: Math.min(first, last),
                lastRow: Math.max(first, last),
                firstColumn: bound.minColumnIndex,
                lastColumn: bound.maxColumnIndex
            }
        ];
    });
}

/**
 * The box whose edges lie on the centres of the grid lines around a rectangle. Each cell owns the
 * 1px line along its own right and bottom edge, so a rectangle's right and bottom lines are its own
 * last pixel and its left and top lines are the last pixel of the cell before it. An outline drawn
 * on this box with a negative offset of half its width is therefore centred on every line.
 */
export function selectionOutlineBox(
    rect: SelectionOutlineRect,
    columns: ReadonlyMap<number, ColumnEdges>,
    rowHeight: number
): SelectionOutlineBox | null {
    const firstColumn = columns.get(rect.firstColumn);
    const lastColumn = columns.get(rect.lastColumn);
    if (firstColumn == null || lastColumn == null) return null;
    const top = rect.firstRow * rowHeight - 0.5;
    const left = firstColumn.left - 0.5;
    return {
        top,
        left,
        width: lastColumn.right - 0.5 - left,
        height: (rect.lastRow + 1) * rowHeight - 0.5 - top
    };
}
