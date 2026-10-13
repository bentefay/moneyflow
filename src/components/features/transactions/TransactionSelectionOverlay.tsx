"use client";

import type { ReactTable } from "@tanstack/react-table";
import { useCallback, useLayoutEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type {
    TransactionSelectionVisibility,
    TransactionTableFeatures,
    TransactionTableRow
} from "./table-model";
import {
    type ColumnEdges,
    selectionOutlineBox,
    selectionOutlineRects
} from "./table-model/selection-outline";

export interface TransactionSelectionOverlayProps {
    readonly table: ReactTable<TransactionTableFeatures, TransactionTableRow>;
    /** Matching-order index of each row the table holds, by display index. */
    readonly rowIndexes: readonly number[];
    readonly rowHeight: number;
    readonly selectionVisibility: TransactionSelectionVisibility;
    /** Changes whenever the columns do, so their edges are measured again. */
    readonly gridTemplateColumns: string;
}

const VISIBLE_OUTLINE =
    "outline-2 -outline-offset-1 outline-[color-mix(in_oklch,var(--primary)_55%,transparent)]";
const MUTED_OUTLINE =
    "outline-1 -outline-offset-[0.5px] outline-[color-mix(in_oklch,var(--primary)_30%,transparent)]";

function sameEdges(
    first: ReadonlyMap<number, ColumnEdges>,
    second: ReadonlyMap<number, ColumnEdges>
): boolean {
    if (first.size !== second.size) return false;
    for (const [index, edges] of first) {
        const other = second.get(index);
        if (other == null || other.left !== edges.left || other.right !== edges.right) return false;
    }
    return true;
}

/** Each column's box edges, from the header cells, relative to the overlay's row group. */
function measureColumnEdges(overlay: HTMLElement): ReadonlyMap<number, ColumnEdges> {
    const rowGroup = overlay.parentElement;
    const header = overlay
        .closest('[role="grid"]')
        ?.querySelector('[role="row"][aria-rowindex="1"]');
    if (rowGroup == null || header == null) return new Map();
    const origin = rowGroup.getBoundingClientRect().left;
    const edges = new Map<number, ColumnEdges>();
    for (const cell of header.querySelectorAll<HTMLElement>(
        '[role="columnheader"][aria-colindex]'
    )) {
        const box = cell.getBoundingClientRect();
        edges.set(Number(cell.getAttribute("aria-colindex")) - 1, {
            left: box.left - origin,
            right: box.right - origin
        });
    }
    return edges;
}

/**
 * One outline around each selected rectangle, centred on the grid lines.
 *
 * Cells paint only the selection tint; the outline lives here so adjacent selected cells share their
 * borders rather than each drawing its own. It ignores the pointer and the accessibility tree.
 */
export function TransactionSelectionOverlay({
    gridTemplateColumns,
    rowHeight,
    rowIndexes,
    selectionVisibility,
    table
}: TransactionSelectionOverlayProps) {
    const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
    const [columnEdges, setColumnEdges] = useState<ReadonlyMap<number, ColumnEdges>>(
        () => new Map()
    );

    const remeasure = useCallback(() => {
        if (overlay == null) return;
        const measured = measureColumnEdges(overlay);
        setColumnEdges((current) => (sameEdges(current, measured) ? current : measured));
    }, [overlay]);

    // A ResizeObserver reports once as soon as it observes, which takes the first measurement too.
    useLayoutEffect(() => {
        const header = overlay
            ?.closest('[role="grid"]')
            ?.querySelector('[role="row"][aria-rowindex="1"]');
        if (header == null || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(remeasure);
        observer.observe(header);
        for (const cell of header.querySelectorAll('[role="columnheader"]')) observer.observe(cell);
        return () => observer.disconnect();
    }, [gridTemplateColumns, overlay, remeasure]);

    return (
        <div
            ref={setOverlay}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[3]"
        >
            {selectionVisibility === "suppressed" ? null : (
                <table.Subscribe
                    source={table.atoms.cellSelection}
                    selector={() =>
                        selectionOutlineRects(
                            table.getCellSelectionBounds(),
                            (displayIndex) => rowIndexes[displayIndex]
                        )
                    }
                >
                    {(rects) =>
                        rects.map((rect) => {
                            const box = selectionOutlineBox(rect, columnEdges, rowHeight);
                            if (box == null) return null;
                            return (
                                <div
                                    key={`${String(rect.firstRow)}:${String(rect.firstColumn)}:${String(rect.lastRow)}:${String(rect.lastColumn)}`}
                                    data-testid="cell-selection-outline"
                                    className={cn(
                                        "absolute",
                                        selectionVisibility === "muted"
                                            ? MUTED_OUTLINE
                                            : VISIBLE_OUTLINE
                                    )}
                                    style={{
                                        height: box.height,
                                        left: box.left,
                                        top: box.top,
                                        width: box.width
                                    }}
                                />
                            );
                        })
                    }
                </table.Subscribe>
            )}
        </div>
    );
}
