/**
 * The transaction grid's virtualization, against the real TanStack Virtual.
 *
 * These tests used to replace `useVirtualizer` with a fake that mounted a fixed window and recorded
 * the options it was handed. Every assertion was then about the fake: `count`, `estimateSize`,
 * `overscan` and the range extractor were read back out of the object the test itself had
 * constructed, so no change in measurement, range extraction or the scroll-element handshake could
 * make any of them red. The real virtualizer needs only element sizes, which
 * `virtual-grid-harness.ts` supplies — see the note there, and note that switching to it immediately
 * exposed a live defect the fake had hidden.
 *
 * `TransactionRow` is still substituted, and for a different reason: the row mounts comboboxes and
 * dialogs that reach for the vault, and none of that is what virtualization is about. The
 * substitution reports the props the row was handed and nothing more.
 *
 * The grid addresses rows by their absolute position in the matching set, which is why every case
 * here supplies a `rowWindow` and a `matchingRowCount` separately. Where the two disagree is where
 * the interesting behaviour lives: the virtualizer counts the matching set while the grid holds the
 * window.
 */

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionGridWorkspaceController } from "@/components/features/transactions/hooks/useTransactionGridController";
import {
    NO_TRANSACTION_ROWS_SELECTED,
    transactionRowOrderFromIds
} from "@/components/features/transactions/table-model";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";
import { transactionViewportRowDistance } from "@/components/features/transactions/TransactionVirtualRows";
import { allocationPresenceField } from "@/lib/crdt/allocations";

import {
    contiguousRowWindow,
    createTestTransactionGridController,
    gridScrollContainer,
    HARNESS_OVERSCAN,
    HARNESS_ROW_HEIGHT,
    HARNESS_VIEWPORT_ROWS,
    installVirtualGridLayout,
    mountedRowIndexes,
    scrollGridTo,
    updateTestTransactionGridController
} from "./virtual-grid-harness";

vi.mock("@/components/features/transactions/TransactionRow", () => ({
    TransactionRow: ({
        transaction,
        onFocus,
        onActivationDescendantFocus,
        allocationColumns,
        gridTemplateColumns
    }: {
        transaction?: TransactionRowData;
        onFocus?: () => void;
        onActivationDescendantFocus?: () => void;
        allocationColumns?: ReadonlyArray<{ personId: string }>;
        gridTemplateColumns?: string;
    }) => (
        <div
            role="row"
            data-testid="transaction-row"
            data-allocation-count={allocationColumns?.length ?? 0}
            data-grid-template={gridTemplateColumns}
            tabIndex={0}
            onFocus={onFocus}
        >
            {transaction?.description}
            <button type="button" onFocus={onActivationDescendantFocus}>
                Checkbox control
            </button>
            <button type="button" onFocus={onActivationDescendantFocus}>
                Action control
            </button>
        </div>
    )
}));

const TOTAL_ROWS = 10_000;

/**
 * The window a correct measurement produces at the top of the list: the rows that fit the viewport
 * plus the trailing overscan. The leading overscan is clipped against index 0, which is why this is
 * not symmetric — mid-list the window is `HARNESS_VIEWPORT_ROWS + 2 * HARNESS_OVERSCAN`.
 */
const WINDOW_AT_TOP = HARNESS_VIEWPORT_ROWS + HARNESS_OVERSCAN;

/** The window mid-list, where overscan applies on both edges. */
const WINDOW_MID_LIST = HARNESS_VIEWPORT_ROWS + 2 * HARNESS_OVERSCAN;

function createTransactions(count: number): TransactionRowData[] {
    return Array.from({ length: count }, (unused, index) => ({
        id: `transaction-${String(index)}`,
        date: "2026-01-01",
        description: `Virtual transaction ${String(index)}`,
        amount: -index
    }));
}

interface GridProps {
    readonly controller?: TransactionGridWorkspaceController;
    readonly transactions?: TransactionRowData[];
    /** Where the supplied rows sit in the matching order. Defaults to the front. */
    readonly windowStartIndex?: number;
    /** Defaults to the number of rows supplied, i.e. "the grid holds the whole matching set". */
    readonly matchingRowCount?: number;
    readonly allocationColumns?: readonly {
        readonly personId: string;
        readonly label: string;
        readonly field: `allocation:${string}`;
        readonly presenceField: `allocation:h:${string}`;
    }[];
    readonly onVisibleRowRangeChange?: (range: {
        readonly startIndex: number;
        readonly endIndex: number;
    }) => void;
    readonly scrollToRowIndex?: number | null;
    readonly onScrollToRowIndexApplied?: () => void;
}

function gridElement(props: GridProps) {
    const transactions = props.transactions ?? createTransactions(TOTAL_ROWS);
    return (
        <TransactionTable
            controller={props.controller ?? createTestTransactionGridController(transactions)}
            rowWindow={contiguousRowWindow(transactions, props.windowStartIndex ?? 0)}
            matchingRowCount={props.matchingRowCount ?? transactions.length}
            onVisibleRowRangeChange={props.onVisibleRowRangeChange}
            scrollToRowIndex={props.scrollToRowIndex}
            onScrollToRowIndexApplied={props.onScrollToRowIndexApplied}
            rowOrder={transactionRowOrderFromIds([])}
            rowSelection={NO_TRANSACTION_ROWS_SELECTED}
            onRowSelectionChange={() => undefined}
            matchingRowsChange={null}
            onMatchingSetReconciled={() => undefined}
            allocationColumns={props.allocationColumns}
        />
    );
}

function renderGrid(props: GridProps = {}) {
    return render(gridElement(props));
}

describe("transactionViewportRowDistance", () => {
    it.each([
        [null, 1],
        [{ endIndex: 10, startIndex: 3 }, 7],
        [{ endIndex: 3, startIndex: 3 }, 1]
    ] as const)("derives the current visible-row distance from %j", (range, expected) => {
        expect(transactionViewportRowDistance(range)).toBe(expected);
    });
});

describe("TransactionTable virtualization", () => {
    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
    });
    afterEach(() => restoreLayout());

    it("mounts a small window over 10,000 rows and sizes the group from the matching count", () => {
        renderGrid({ transactions: createTransactions(40), matchingRowCount: TOTAL_ROWS });

        // The group's height is the count times the estimate — the one place the number the
        // virtualizer was given appears in the DOM. It is the *matching* count, so the scrollbar
        // represents every matching row and not merely the forty this grid happens to hold.
        expect(screen.getByRole("rowgroup")).toHaveStyle({
            height: `${String(TOTAL_ROWS * HARNESS_ROW_HEIGHT)}px`
        });

        // A real measurement against a real viewport: ten rows fit, five more are overscanned.
        expect(screen.getAllByTestId("transaction-row")).toHaveLength(WINDOW_AT_TOP);
        expect(mountedRowIndexes()).toEqual(
            Array.from({ length: WINDOW_AT_TOP }, (unused, index) => index)
        );
    });

    it("estimates a row at the height a row actually renders at", () => {
        // Measured in the running app and written down in `cells/cell-hit-area.ts`: the row is
        // `px-4 py-3` with a `border-b`, giving a 57px box — its table reads `row | 219, 57`.
        //
        // Deliberately a literal rather than `HARNESS_ROW_HEIGHT`. The harness reports whatever it
        // is told to, so comparing the estimate against the harness would compare the grid to
        // itself; the number has to come from the independent measurement to mean anything.
        const MEASURED_COLLAPSED_ROW_HEIGHT = 57;

        renderGrid({ transactions: createTransactions(40), matchingRowCount: TOTAL_ROWS });

        // Almost every row in a 10,000-row set is unmeasured, so the group's height is essentially
        // `count x estimate`. It is the scrollbar: an estimate that is 23% short makes the scrollable
        // extent 23% short of the content, which is a wrong scrollbar before it is anything else.
        const declaredHeight = Number.parseFloat(screen.getByRole("rowgroup").style.height);
        const trueHeight = TOTAL_ROWS * MEASURED_COLLAPSED_ROW_HEIGHT;
        const relativeError = Math.abs(declaredHeight - trueHeight) / trueHeight;

        expect(relativeError).toBeLessThan(0.05);
    });

    it("measures on its first render, without waiting for a later one", () => {
        renderGrid({ transactions: createTransactions(40) });

        // The regression this guards: the virtualizer lives in a child component, so a ref to the
        // grid's ancestor scroll container is still null when that child's layout effect asks for it
        // — and `useVirtualizer` schedules no retry. The grid then rendered a correctly-sized but
        // completely empty row group until some unrelated later render happened to run the effect
        // again. Asserting after exactly one render is what makes that visible.
        expect(screen.getAllByTestId("transaction-row").length).toBeGreaterThan(0);
        expect(gridScrollContainer().offsetHeight).toBeGreaterThan(0);
    });

    it("moves its window as the container scrolls, and keeps it bounded", () => {
        renderGrid();

        scrollGridTo(400 * HARNESS_ROW_HEIGHT);

        const indexes = mountedRowIndexes();
        expect(indexes).toContain(400);
        expect(indexes).not.toContain(0);
        // Still a window, not the whole list: this is what makes 10,000 rows affordable.
        expect(indexes).toHaveLength(WINDOW_MID_LIST);
    });

    it("addresses rows by absolute position, so a window into the middle mounts its own indexes", () => {
        // The grid holds rows 500-539 of a ten-thousand-row set. Every index it speaks is absolute:
        // the scroll offset, `data-index` and the key it looks a row up by.
        renderGrid({
            transactions: createTransactions(40),
            windowStartIndex: 500,
            matchingRowCount: TOTAL_ROWS
        });

        scrollGridTo(505 * HARNESS_ROW_HEIGHT);

        const indexes = mountedRowIndexes();
        expect(indexes).toContain(505);
        expect(indexes.every((index) => index >= 500 && index < 540)).toBe(true);
        expect(screen.getByText("Virtual transaction 5")).toBeInTheDocument();
    });

    it("mounts nothing for a position it does not hold, rather than an empty row", () => {
        // Reachable for one commit when a jump outruns the window. An element carrying a real row's
        // `data-index` but no row inside it cannot be told apart from the row, so there is none.
        renderGrid({ transactions: createTransactions(40), matchingRowCount: TOTAL_ROWS });

        scrollGridTo(5_000 * HARNESS_ROW_HEIGHT);

        expect(mountedRowIndexes()).toEqual([]);
        expect(screen.queryAllByTestId("transaction-row")).toEqual([]);
        // The geometry is still the whole set's, so the scroll position remains meaningful.
        expect(screen.getByRole("rowgroup")).toHaveStyle({
            height: `${String(TOTAL_ROWS * HARNESS_ROW_HEIGHT)}px`
        });
    });

    it("reports the visible range, in absolute positions, as the container scrolls", () => {
        const ranges: Array<{ startIndex: number; endIndex: number }> = [];
        renderGrid({ onVisibleRowRangeChange: (range) => ranges.push(range) });

        scrollGridTo(400 * HARNESS_ROW_HEIGHT);

        // This report is the only thing that can move the window, so a grid that never made it would
        // hold its first block forever.
        const latest = ranges.at(-1);
        expect(latest).toBeDefined();
        expect(latest?.startIndex).toBe(400);
        expect(latest?.endIndex).toBeGreaterThanOrEqual(400 + HARNESS_VIEWPORT_ROWS - 1);
    });

    it("scrolls to a requested absolute index and reports the request applied", async () => {
        const applied = vi.fn();
        renderGrid({ scrollToRowIndex: 4_000, onScrollToRowIndexApplied: applied });

        // The virtualizer's own `scrollToIndex`, which knows each row's measured height. The reveal
        // path used to derive an offset from an averaged row height instead, which is wrong whenever
        // a notes row is expanded.
        expect(applied).toHaveBeenCalledTimes(1);
        expect(gridScrollContainer().scrollTop).toBeGreaterThan(3_900 * HARNESS_ROW_HEIGHT);

        // The `scroll` event a browser fires for a programmatic scroll arrives in a later task, so
        // the range follows the offset rather than moving with it.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        expect(mountedRowIndexes()).toContain(4_000);
    });

    it("keeps the active controller row mounted after scrolling far away from it", () => {
        const transactions = createTransactions(TOTAL_ROWS);
        const controller = createTestTransactionGridController(transactions);
        controller.setFocusedCell("transaction-0", "description");
        renderGrid({ controller, transactions });

        scrollGridTo(400 * HARNESS_ROW_HEIGHT);

        // Unmounting the focused row loses the caret, so the range extractor pins it. Asserting on
        // the mounted DOM rather than on the extractor's return value means the pin has to survive
        // measurement and rendering too.
        const indexes = mountedRowIndexes();
        expect(indexes).toContain(0);
        expect(indexes).toContain(400);
    });

    it("keeps a legacy checkbox or action focus row mounted without creating cell selection", () => {
        const transactions = createTransactions(TOTAL_ROWS);
        const controller = createTestTransactionGridController(transactions);
        renderGrid({ controller, transactions });
        const checkbox = screen.getAllByRole("button", { name: "Checkbox control" })[0];
        const action = screen.getAllByRole("button", { name: "Action control" })[0];
        if (checkbox == null || action == null)
            throw new Error("first transaction controls missing");

        act(() => checkbox.focus());
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "focus-retention", transactionId: "transaction-0" }
        ]);
        expect(controller.cellSelectionAtom.get()).toEqual([]);
        act(() => action.focus());
        scrollGridTo(400 * HARNESS_ROW_HEIGHT);

        const indexes = mountedRowIndexes();
        expect(indexes).toContain(0);
        expect(indexes).toContain(400);
        expect(document.activeElement).toBe(action);
    });

    it("pins a focused activation row alongside a retained range anchored in another row", () => {
        const transactions = createTransactions(TOTAL_ROWS);
        const controller = createTestTransactionGridController(transactions);
        controller.setFocusedCell("transaction-1", "description");
        renderGrid({ controller, transactions });
        const action = screen.getAllByRole("button", { name: "Action control" })[0];
        if (action == null) throw new Error("first transaction action is missing");

        act(() => action.focus());

        expect(controller.getSnapshot()).toMatchObject({
            focusRetentionTransactionId: "transaction-0",
            pins: [
                { kind: "focus-retention", transactionId: "transaction-0" },
                { kind: "active-origin", transactionId: "transaction-1" }
            ]
        });
        expect(controller.cellSelectionAtom.get()).toMatchObject([
            { anchorRowId: "transaction-1", focusRowId: "transaction-1" }
        ]);

        scrollGridTo(400 * HARNESS_ROW_HEIGHT);

        const indexes = mountedRowIndexes();
        expect(indexes).toContain(0);
        expect(indexes).toContain(1);
        expect(indexes).toContain(400);
        expect(document.activeElement).toBe(action);
    });

    it("follows the active controller row when a new row inserts ahead of it", () => {
        const original = createTransactions(TOTAL_ROWS);
        const controller = createTestTransactionGridController(original);
        controller.setFocusedCell("transaction-0", "description");
        const { rerender } = renderGrid({ controller, transactions: original });

        scrollGridTo(400 * HARNESS_ROW_HEIGHT);
        expect(mountedRowIndexes()).toContain(0);

        const withInsertedRow = [
            {
                id: "new-empty-row",
                date: "2026-01-01",
                description: "",
                amount: 0
            },
            ...original
        ];
        updateTestTransactionGridController(controller, withInsertedRow);
        rerender(gridElement({ controller, transactions: withInsertedRow }));

        // The focused transaction is index 1 now. The pin follows the row's identity, not its
        // position, so it is still mounted — and index 0, which nothing pinned, is not.
        const indexes = mountedRowIndexes();
        expect(indexes).toContain(1);
        expect(indexes).not.toContain(0);
    });

    it("shares one grid template, derived from the table's own columns, with every row", () => {
        const allocationColumns = [
            {
                personId: "person-a",
                label: "Ada",
                field: "allocation:person-a",
                presenceField: allocationPresenceField("person-a")
            }
        ] satisfies GridProps["allocationColumns"];
        renderGrid({ transactions: createTransactions(40), allocationColumns });

        // One template string for the header and every row, and it is built from the table's visible
        // columns rather than passed in — so an allocation column cannot appear in the cells without
        // its track appearing in the template.
        const header = screen.getByRole("row", { name: /Select all/ });
        const headerTemplate = header.style.gridTemplateColumns;
        expect(headerTemplate).toContain("minmax(112px,128px)");

        const rows = screen.getAllByTestId("transaction-row");
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row).toHaveAttribute("data-allocation-count", "1");
            expect(row).toHaveAttribute("data-grid-template", headerTemplate);
        }
    });
});
