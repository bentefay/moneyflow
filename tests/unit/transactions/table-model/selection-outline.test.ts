import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    type ColumnEdges,
    selectionOutlineBox,
    selectionOutlineRects
} from "@/components/features/transactions/table-model/selection-outline";

const ROW_HEIGHT = 57;
// Three adjacent columns starting after a 1px row border, as the grid lays them out.
const COLUMNS: ReadonlyMap<number, ColumnEdges> = new Map([
    [0, { left: 1, right: 33 }],
    [1, { left: 33, right: 153 }],
    [2, { left: 153, right: 303 }]
]);

describe("selectionOutlineRects", () => {
    it("maps display rows to matching-order rows, including across a pinned row", () => {
        // Display 0 is a pinned row at matching index 5; the held block starts at 400.
        const indexes = [5, 400, 401, 402];
        expect(
            selectionOutlineRects(
                [
                    { minRowIndex: 1, maxRowIndex: 2, minColumnIndex: 0, maxColumnIndex: 1 },
                    { minRowIndex: 0, maxRowIndex: 3, minColumnIndex: 2, maxColumnIndex: 2 }
                ],
                (displayIndex) => indexes[displayIndex]
            )
        ).toEqual([
            { firstRow: 400, lastRow: 401, firstColumn: 0, lastColumn: 1 },
            { firstRow: 5, lastRow: 402, firstColumn: 2, lastColumn: 2 }
        ]);
    });

    it("omits a rectangle whose corner rows are not held", () => {
        expect(
            selectionOutlineRects(
                [{ minRowIndex: 0, maxRowIndex: 9, minColumnIndex: 0, maxColumnIndex: 0 }],
                () => undefined
            )
        ).toEqual([]);
    });
});

describe("selectionOutlineBox", () => {
    it("puts every edge on the centre of the 1px grid line around a 2x2 rectangle", () => {
        expect(
            selectionOutlineBox(
                { firstRow: 1, lastRow: 2, firstColumn: 1, lastColumn: 2 },
                COLUMNS,
                ROW_HEIGHT
            )
        ).toEqual({
            // The line above row 1 is row 0's bottom pixel, 56..57, centred at 56.5.
            top: 56.5,
            // The line left of column 1 is column 0's right pixel, 32..33, centred at 32.5.
            left: 32.5,
            // Column 2 owns its right line, 302..303, centred at 302.5.
            width: 270,
            // Row 2 owns its bottom line, 170..171, centred at 170.5.
            height: 114
        });
    });

    it("returns null for a column the header does not describe", () => {
        expect(
            selectionOutlineBox(
                { firstRow: 0, lastRow: 0, firstColumn: 0, lastColumn: 7 },
                COLUMNS,
                ROW_HEIGHT
            )
        ).toBeNull();
    });

    it("spans exactly the rows and columns of any rectangle", () => {
        fc.assert(
            fc.property(
                fc.nat({ max: 10_000 }),
                fc.nat({ max: 500 }),
                fc.constantFrom(0, 1, 2),
                fc.constantFrom(0, 1, 2),
                (firstRow, extraRows, columnA, columnB) => {
                    const firstColumn = Math.min(columnA, columnB);
                    const lastColumn = Math.max(columnA, columnB);
                    const box = selectionOutlineBox(
                        { firstRow, lastRow: firstRow + extraRows, firstColumn, lastColumn },
                        COLUMNS,
                        ROW_HEIGHT
                    );
                    expect(box?.height).toBe((extraRows + 1) * ROW_HEIGHT);
                    const left = COLUMNS.get(firstColumn)?.left ?? 0;
                    const right = COLUMNS.get(lastColumn)?.right ?? 0;
                    expect(box?.width).toBe(right - left);
                }
            ),
            { seed: 0x6f75746c }
        );
    });
});
