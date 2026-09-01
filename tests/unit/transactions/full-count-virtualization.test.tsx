/**
 * The grid presents the whole matching set and holds only a bounded part of it.
 *
 * Those two facts are the point of the design, and neither is visible in the DOM: virtualization
 * bounds the rendered rows either way, so a grid that quietly materialises ten thousand `Row` objects
 * looks exactly like one that materialises six hundred. That is how the defect these tests guard
 * survived — the grid was infinite scroll wearing a virtualizer, and scrolling to the end put every
 * matching row into TanStack's row model.
 *
 * So two observables are used, both at page level because the page owns the cursor:
 *
 *  - **the row group's height**, which is the count times the row estimate. It is the one place the
 *    number the virtualizer was given appears in the DOM, so it says directly whether the scrollbar
 *    represents the matching set or only what has been loaded.
 *  - **the `rowWindow` prop the page hands the grid**, intercepted through the barrel. That prop is
 *    the table's `data` option verbatim (`TransactionTable.tsx`), and v9's core row model is one
 *    `Row` per element of `data` — so its length *is* the size of the row model.
 *
 * Everything else is real: the real page, the real cursor over a real hierarchical store, the real
 * table, the real virtualizer.
 */

import { act, screen, waitFor } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TRANSACTION_ROW_WINDOW_ROWS } from "@/components/features/transactions/row-window";
import type { TransactionTableProps } from "@/components/features/transactions/TransactionTable";
import type { TransactionInput } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

import {
    ACCOUNT_ID,
    createCrdtContextMock,
    importMock,
    presenceMock,
    renderTransactionsPage,
    routerMock,
    seedVaultWith,
    STATUS_ID
} from "./transactions-page-harness";
import {
    HARNESS_ROW_HEIGHT,
    installVirtualGridLayout,
    mountedRowIndexes,
    scrollGridTo
} from "./virtual-grid-harness";

/** Deep enough that reaching the end used to cost 200 page-in steps. */
const TOTAL_TRANSACTIONS = 10_000;

/**
 * Rows per calendar day. More than one so the fixture needs a hundred day buckets rather than ten
 * thousand — the ordering is unaffected, because rows sharing a date and a creation instant are
 * ordered by `importRowIndex` ascending, which is the row index.
 */
const ROWS_PER_DAY = 100;

/** The size of every `rowWindow` the page has handed the grid, in order. */
const observedWindowSizes = vi.hoisted(() => [] as number[]);

vi.mock("next/navigation", () => routerMock);
vi.mock("@/lib/crdt/context", () => createCrdtContextMock());
vi.mock("@/hooks/use-identity", () => ({ usePubkeyHash: () => null }));
vi.mock("@/components/providers/vault-presence-provider", () => ({
    useVaultPresenceContext: () => presenceMock
}));
vi.mock("@/components/features/import", () => importMock);
vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

// The real grid, with its `rowWindow` recorded on the way in. A wrapper rather than a stand-in: every
// assertion below depends on the real table and the real virtualizer running underneath.
vi.mock("@/components/features/transactions", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/components/features/transactions")>();
    const { createElement } = await import("react");
    return {
        ...actual,
        TransactionTable: (props: TransactionTableProps) => {
            observedWindowSizes.push(props.rowWindow.rows.length);
            return createElement(actual.TransactionTable, props);
        }
    };
});

/**
 * One row. Index 0 is newest, so the matching order is index order: dates run backwards in blocks of
 * `ROWS_PER_DAY`, and within a block the `importRowIndex` tie-break keeps the indexes ascending.
 */
function createTransaction(index: number): TransactionInput {
    const dayCount = Math.ceil(TOTAL_TRANSACTIONS / ROWS_PER_DAY);
    const dayOffset = dayCount - Math.floor(index / ROWS_PER_DAY);
    return {
        id: `tx-${index.toString().padStart(5, "0")}`,
        date: Temporal.PlainDate.from("2026-01-01").add({ days: dayOffset }),
        description: `Deep row ${String(index)}`,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-(index + 1) * 100),
        originalAmount: undefined,
        accountId: ACCOUNT_ID,
        tagIds: [],
        statusId: STATUS_ID,
        importId: "import-1",
        allocations: {},
        creationInstant: Temporal.Instant.from("2026-01-01T09:00:00Z"),
        importRowIndex: index,
        suspectedDuplicates: [],
        deletedAt: undefined
    };
}

function rowIdAt(index: number): string {
    return `tx-${index.toString().padStart(5, "0")}`;
}

function renderedRow(index: number): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-transaction-id="${rowIdAt(index)}"]`);
}

/** The largest `rowWindow` the page has handed the grid since the last reset. */
function largestWindowSize(): number {
    return Math.max(...observedWindowSizes);
}

describe("the grid presents every matching row and holds a bounded window", () => {
    // Building and indexing ten thousand rows, then mounting the real page over them, is well past
    // the 5s default under a saturated full-suite run. A ceiling, not a wait.
    vi.setConfig({ testTimeout: 120_000 });

    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
        seedVaultWith(
            Array.from({ length: TOTAL_TRANSACTIONS }, (unused, index) => createTransaction(index))
        );
        observedWindowSizes.length = 0;
    });

    afterEach(() => restoreLayout());

    it("sizes its scrollable area from the whole matching set, not from what it holds", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(renderedRow(0)).not.toBeNull());

        // The count the virtualizer was given, as it appears in the DOM. Under the pagination this
        // replaces, the first render reported 50 rows' worth of scroll — a scrollbar that grew as
        // the user scrolled, which is what made a deep position unaddressable.
        expect(screen.getByRole("rowgroup")).toHaveStyle({
            height: `${String(TOTAL_TRANSACTIONS * HARNESS_ROW_HEIGHT)}px`
        });
    });

    it("addresses a row ten thousand deep from a single scroll", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(renderedRow(0)).not.toBeNull());

        const deepIndex = TOTAL_TRANSACTIONS - 1;
        scrollGridTo(deepIndex * HARNESS_ROW_HEIGHT);

        // One scroll. No paging, no round trips: the position was already addressable, so the row's
        // own element exists and carries its absolute position in the matching order.
        expect(renderedRow(deepIndex)).not.toBeNull();
        expect(mountedRowIndexes()).toContain(deepIndex);
    });

    it("keeps the rows it holds bounded however deep it is scrolled", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(renderedRow(0)).not.toBeNull());

        for (const index of [200, 1_000, 5_000, TOTAL_TRANSACTIONS - 1]) {
            scrollGridTo(index * HARNESS_ROW_HEIGHT);
            expect(renderedRow(index)).not.toBeNull();
        }

        // The regression this file exists for. The old grid's window was `cursor.slice(0,
        // displayCount)` and `displayCount` only ever grew, so scrolling to the end put all ten
        // thousand rows into the row model. One extra row is allowed for a pinned focused row.
        expect(largestWindowSize()).toBeLessThanOrEqual(TRANSACTION_ROW_WINDOW_ROWS + 1);
        expect(largestWindowSize()).toBeLessThan(TOTAL_TRANSACTIONS);
    });

    it("keeps the focused row mounted after scrolling far outside the window", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(renderedRow(0)).not.toBeNull());

        const firstRow = renderedRow(0);
        if (firstRow == null) throw new Error("Expected the first row to render");
        const descriptionCell = firstRow.querySelector<HTMLElement>(
            '[role="gridcell"][data-cell="description"]'
        );
        if (descriptionCell == null)
            throw new Error("Expected the first row to hold a Description gridcell");
        // A real focus. `fireEvent.focus` does not move `document.activeElement` in jsdom, so the
        // pin would have nothing to pin and the test would pass without testing anything.
        act(() => descriptionCell.focus());
        expect(document.activeElement).toBe(descriptionCell);

        scrollGridTo(5_000 * HARNESS_ROW_HEIGHT);

        // Five thousand rows away — many windows past the block the grid now holds. The row is kept
        // in the window and pinned into the virtual range, because unmounting it would drop the
        // caret, and the window is still bounded while holding it.
        expect(renderedRow(0)).not.toBeNull();
        expect(mountedRowIndexes()).toContain(0);
        expect(document.activeElement).toBe(descriptionCell);
        expect(largestWindowSize()).toBeLessThanOrEqual(TRANSACTION_ROW_WINDOW_ROWS + 1);
    });
});
