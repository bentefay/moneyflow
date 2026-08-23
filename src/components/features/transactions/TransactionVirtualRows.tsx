"use client";

/**
 * The transaction grid's virtualized row group.
 *
 * This exists as its own component for a reason that is structural rather than aesthetic. The React
 * Compiler carries a hardcoded incompatible-library list, and `useVirtualizer` is on it: TanStack
 * Virtual returns functions that cannot be memoized safely, so the compiler **skips the entire
 * component** that calls the hook. While the call lived in `TransactionTable`, that meant all ~635
 * lines of the grid — every callback, every derived value — went unmemoized, and the bail-out warning
 * had to be read as "this whole file opts out".
 *
 * Isolating the hook here confines the bail-out to this file. Everything above it stays compilable.
 * That is why this component takes the virtualizer's whole surface as props rather than reaching for
 * context or reading the table: nothing that belongs to the compiled tree may be computed in here,
 * or it loses its memoization too.
 *
 * `count` is the **whole** matching set, so the scrollbar represents every matching row and any
 * position in it can be scrolled to directly. The rows the grid actually holds are a bounded window
 * of that set — see `row-window.ts` — which this component reports the visible range for and asks
 * the parent for by absolute index.
 */

import { type Range, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect } from "react";

import type { TransactionVisibleRange } from "./row-window";

export interface TransactionVirtualRowsProps {
    /** Rows the grid presents: the whole matching count, not the number it holds. */
    readonly count: number;
    /**
     * The scroll container. Owned by the parent, which also renders the sticky header inside it.
     *
     * The **element**, not a ref to it, and that is load-bearing. React attaches a host element's
     * ref during the layout phase in child-first order, so this component's own layout effect — where
     * `useVirtualizer` first calls `getScrollElement()` — runs *before* an ancestor div's ref is
     * attached. A ref therefore reads `null` on mount, and `useVirtualizer` schedules no retry: it
     * measures nothing and renders no rows until some later render happens to run its effect again.
     * Passing the element means the parent's `useState`-backed callback ref re-renders both
     * components as soon as it exists, so the first measurement is against a real viewport.
     */
    readonly scrollElement: HTMLDivElement | null;
    readonly estimatedRowHeight: number;
    readonly overscan: number;
    /**
     * Keeps rows mounted beyond the visible window — the focused row and any row asked to take
     * focus. Supplied by the parent because only it knows which those are.
     */
    readonly rangeExtractor: (range: Range) => number[];
    /**
     * React key for the row at an absolute matching-order index — the transaction's stable id, never
     * the index, so a row keeps its identity when rows are inserted above it.
     *
     * `null` means the grid does not hold that row, and the index is skipped entirely rather than
     * mounted empty. Only reachable for the commit in which a jump has outrun the loaded window; an
     * empty element carrying a real row's `data-index` would be indistinguishable from the row.
     */
    readonly getRowKey: (index: number) => string | null;
    readonly renderRow: (index: number) => React.ReactNode;
    /**
     * Reports what the viewport is showing, so the parent can move the window of rows it holds.
     *
     * Called from the virtualizer's own change notification rather than from an effect: that runs
     * inside the scroll handler which produced the range, so the parent's window moves in the same
     * task the range moved in rather than a commit later.
     */
    readonly onVisibleRangeChange: (range: TransactionVisibleRange) => void;
    /**
     * An absolute index the grid has been asked to scroll to, or `null`.
     *
     * The virtualizer's own `scrollToIndex`, which accounts for measured row heights. The grid used
     * to derive a scroll offset from an averaged row height instead, which is wrong by construction
     * whenever a notes row is expanded.
     */
    readonly scrollToRowIndex: number | null;
    /** Reports that {@link TransactionVirtualRowsProps.scrollToRowIndex} has been applied. */
    readonly onScrollToRowIndexApplied: () => void;
}

/**
 * Renders the grid's `rowgroup`, mounting only the rows near the viewport.
 *
 * Dynamic measurement is on: a row whose notes are expanded is taller than the estimate, and
 * `measureElement` is what lets the group's total height account for it.
 */
export function TransactionVirtualRows({
    count,
    estimatedRowHeight,
    getRowKey,
    onScrollToRowIndexApplied,
    onVisibleRangeChange,
    overscan,
    rangeExtractor,
    renderRow,
    scrollElement,
    scrollToRowIndex
}: TransactionVirtualRowsProps) {
    const virtualizer = useVirtualizer({
        count,
        estimateSize: () => estimatedRowHeight,
        getScrollElement: () => scrollElement,
        onChange: (instance) => {
            const range = instance.range;
            if (range != null) {
                onVisibleRangeChange({
                    startIndex: range.startIndex,
                    endIndex: range.endIndex
                });
            }
        },
        overscan,
        rangeExtractor,
        // Re-measurement is flushed synchronously so a row that grows does not paint at the old
        // height first. Note this routes `resizeItem` through `flushSync` from inside a
        // ResizeObserver callback; a `flushSync` console warning here is a real finding, not noise.
        //
        // NOT COVERED BY ANY UNIT TEST, deliberately declared rather than left to be discovered:
        // flipping this to `false` fails nothing under vitest. What it changes is *when* a
        // re-measured row's new height reaches the DOM relative to paint, and jsdom has no paint, so
        // there is no observable to assert. Its only guard is the E2E scale test's console gate in
        // `tests/e2e/transactions.spec.ts`, which fails the whole run on a `flushSync` warning — so
        // that gate catches the option being wrong in the *noisy* direction and nothing catches it
        // being wrong in the quiet one. If you change it, change it against a browser measurement.
        useFlushSync: true
    });

    const virtualItems = virtualizer.getVirtualItems();

    useEffect(() => {
        // Not applied — and not reported applied — until there is something to scroll. The parent
        // holds the scroll element in state behind a callback ref, so on the very first render it is
        // still `null`; scrolling then would move nothing while retiring the request for good.
        if (scrollToRowIndex == null || scrollElement == null) return;
        // Centred rather than aligned to the top: the grid's header is sticky inside the same
        // scroll container, so a row scrolled flush to the start would sit underneath it.
        virtualizer.scrollToIndex(scrollToRowIndex, { align: "center" });
        onScrollToRowIndexApplied();
    }, [onScrollToRowIndexApplied, scrollElement, scrollToRowIndex, virtualizer]);

    return (
        <div
            className="relative min-w-fit"
            role="rowgroup"
            style={{ height: `${String(virtualizer.getTotalSize())}px` }}
        >
            {virtualItems.map((virtualRow) => {
                const rowKey = getRowKey(virtualRow.index);
                if (rowKey == null) return null;
                return (
                    <div
                        key={rowKey}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        className="absolute top-0 left-0 w-full"
                        style={{ transform: `translateY(${String(virtualRow.start)}px)` }}
                        role="presentation"
                    >
                        {renderRow(virtualRow.index)}
                    </div>
                );
            })}
        </div>
    );
}
