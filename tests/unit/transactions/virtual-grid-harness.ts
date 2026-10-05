/**
 * Driving the *real* TanStack Virtual in jsdom.
 *
 * Five tests used to replace `useVirtualizer` with a hand-written fake that mounted a fixed window.
 * That made them unable to fail for any virtualizer reason at all: the range they asserted on was
 * computed by the fake, so a real change in measurement, range extraction or the scroll-element
 * handshake was invisible. One such change was in fact live and undetected — the grid measured
 * nothing on its first render, because a ref to an ancestor element is still `null` when the child
 * holding `useVirtualizer` runs its layout effect.
 *
 * The real virtualizer needs exactly one thing jsdom does not provide: element sizes. It measures
 * through `offsetHeight` (`getRect` in virtual-core) and reads scroll position from `scrollTop`, so
 * stubbing the first and writing the second is enough to get a genuine range, a genuine total size
 * and genuine re-measurement. Nothing about the virtualizer itself is faked here.
 */

import { act } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";

import type { AllocationColumn } from "@/components/features/transactions/allocation-columns";
import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController,
    type TransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import type { TransactionRowWindow } from "@/components/features/transactions/row-window";
import { transactionColumnIds } from "@/components/features/transactions/table-model";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { insertTransaction } from "@/lib/crdt/mutations";
import type { TransactionInput, TransactionStore } from "@/lib/crdt/schema";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

/** The single fixed transaction-row geometry shared with production. */
export const HARNESS_ROW_HEIGHT = 57;

/** Viewport height, in whole rows, so the expected window size is arithmetic rather than a guess. */
export const HARNESS_VIEWPORT_ROWS = 10;

export const HARNESS_VIEWPORT_HEIGHT = HARNESS_ROW_HEIGHT * HARNESS_VIEWPORT_ROWS;

/** The overscan `TransactionTable` configures. */
export const HARNESS_OVERSCAN = 5;

/**
 * Gives jsdom fixed production-shaped geometry for the real virtualizer, and returns a cleanup.
 *
 * The scroll container is identified by the `overflow-auto` class `TransactionTable` puts on it.
 * Rows always report the same 57px box as production; there is deliberately no variable-height or
 * element-measurement seam left for tests to revive.
 */
export function installVirtualGridLayout(): () => void {
    const isScrollContainer = (element: HTMLElement) => element.classList.contains("overflow-auto");
    const isVirtualRow = (element: HTMLElement) => element.dataset.index != null;

    /** The height the grid itself has declared for its row group, i.e. the scrollable content. */
    const declaredContentHeight = (container: HTMLElement): number => {
        const rowGroup = container.querySelector<HTMLElement>('[role="rowgroup"]');
        return rowGroup == null ? 0 : Number.parseFloat(rowGroup.style.height) || 0;
    };

    return replaceOnHtmlElementPrototype({
        getBoundingClientRect: {
            writable: true,
            value: function getBoundingClientRectStandIn(this: HTMLElement) {
                if (isScrollContainer(this)) {
                    return new DOMRect(0, 0, 1_000, HARNESS_VIEWPORT_HEIGHT);
                }
                if (isVirtualRow(this)) return new DOMRect(0, 0, 1_000, HARNESS_ROW_HEIGHT);
                return new DOMRect();
            }
        },
        offsetHeight: {
            get(this: HTMLElement) {
                if (isScrollContainer(this)) return HARNESS_VIEWPORT_HEIGHT;
                return isVirtualRow(this) ? HARNESS_ROW_HEIGHT : 0;
            }
        },
        offsetWidth: { get: () => 1_000 },
        // `scrollToIndex` clamps its target to `scrollHeight - clientHeight`, and both are 0 in a
        // layout-free jsdom — so without these every programmatic scroll silently lands on offset 0
        // and an assertion about it would be an assertion about nothing.
        clientHeight: {
            get(this: HTMLElement) {
                return isScrollContainer(this) ? HARNESS_VIEWPORT_HEIGHT : 0;
            }
        },
        scrollHeight: {
            get(this: HTMLElement) {
                return isScrollContainer(this) ? declaredContentHeight(this) : 0;
            }
        },
        // jsdom implements no scrolling, so `scrollTo` — which is how the real virtualizer moves the
        // container — is either absent or a no-op. The browser delivers its `scroll` event later, so
        // the stand-in does too rather than re-entering React from the applying effect.
        scrollTo: {
            writable: true,
            value: function scrollToStandIn(
                this: HTMLElement,
                scrollOptions?: ScrollToOptions | number
            ) {
                const top =
                    typeof scrollOptions === "number"
                        ? scrollOptions
                        : (scrollOptions?.top ?? this.scrollTop);
                this.scrollTop = top;
                setTimeout(() => this.dispatchEvent(new Event("scroll")), 0);
            }
        }
    });
}

/**
 * Installs property descriptors on `HTMLElement.prototype` and returns a cleanup that puts back
 * exactly what was there — including removing a property that `HTMLElement.prototype` did not own,
 * so a definition that was shadowing `Element.prototype` does not survive the test.
 */
function replaceOnHtmlElementPrototype(
    descriptors: Readonly<Record<string, PropertyDescriptor>>
): () => void {
    const previous = Object.entries(descriptors).map(
        ([name]) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)] as const
    );
    for (const [name, descriptor] of Object.entries(descriptors)) {
        Object.defineProperty(HTMLElement.prototype, name, { configurable: true, ...descriptor });
    }
    return () => {
        for (const [name, descriptor] of previous) {
            if (descriptor) {
                Object.defineProperty(HTMLElement.prototype, name, descriptor);
            } else {
                Reflect.deleteProperty(HTMLElement.prototype, name);
            }
        }
    };
}

/** The grid's scroll container, which is also the element the virtualizer measures. */
export function gridScrollContainer(): HTMLElement {
    const container = document.querySelector<HTMLElement>(".overflow-auto");
    if (container == null) throw new Error("the grid's scroll container is not mounted");
    return container;
}

/**
 * Scrolls the grid, the way the browser does: move `scrollTop`, then fire `scroll`.
 *
 * react-virtual reads the offset off the element inside its own listener, so writing the property
 * without dispatching the event would move nothing, and dispatching without writing it would report
 * a scroll to zero.
 */
export function scrollGridTo(offset: number): void {
    const container = gridScrollContainer();
    act(() => {
        container.scrollTop = offset;
        container.dispatchEvent(new Event("scroll"));
    });
}

/**
 * A hierarchical transaction store holding the given rows, built by the real mutation.
 *
 * The page's grid reads a `TransactionIndex` over this store rather than a flat array, so a fake
 * vault has to hand it a real hierarchy — which is an improvement on handing it a list: the cursor,
 * the canonical-copy resolution and the day-bucket grouping are then all the production ones.
 */
export function buildFakeTransactionStore(
    transactions: readonly TransactionInput[]
): TransactionStore {
    // loro-mirror infers `TransactionStore` as an account index signature intersected with a required
    // `$cid`, so no object literal satisfies it and an empty store can only come from an assertion.
    // Both assertions in this module are contained in these two builders, matching
    // `tests/unit/crdt/transaction-cursor-fixtures.ts`.
    const store = {} as TransactionStore;
    for (const transaction of transactions) insertTransaction(store, { transaction });
    return store;
}

/** One more transaction inserted into a fake store, through the real hierarchical mutation. */
export function insertIntoFakeStore(
    store: TransactionStore,
    transaction: TransactionInput
): TransactionStore {
    // A fresh object so the mocked index hook, which memoises on a revision counter, is matched by
    // an actual change of identity in the store it reads.
    const next = { ...store } as TransactionStore;
    insertTransaction(next, { transaction });
    return next;
}

function testTransactionCursor(rows: readonly TransactionRowData[]) {
    const transactions = rows.map((row, index): TransactionInput => ({
        accountId: row.accountId ?? "account-test",
        allocations: {},
        amount: asMinorUnits(row.amount),
        // The production cursor sorts equal-date rows newest-first. Decreasing fixture instants keeps
        // its canonical order aligned with the caller's row-window order.
        creationInstant: Temporal.Instant.fromEpochMilliseconds(1_700_000_000_000 - index),
        date: Temporal.PlainDate.from(row.date),
        deletedAt: undefined,
        description: row.description,
        descriptionAliasId: row.descriptionAliasId,
        id: row.id,
        importId: "",
        importRowIndex: index,
        notes: row.notes ?? "",
        originalAmount: undefined,
        statusId: row.statusId ?? "status-test",
        suspectedDuplicates: [],
        tagIds: row.tags?.map((tag) => tag.id) ?? []
    }));
    // Insert oldest-first so every newer row lands at index zero instead of making the 10,000-row
    // harness scan the full same-day bucket for each insertion.
    return createTransactionCursor(
        buildTransactionIndex(buildFakeTransactionStore(transactions.toReversed()))
    );
}

/** Publishes a new real cursor projection into an existing direct-table test controller. */
export function updateTestTransactionGridController(
    controller: TransactionGridWorkspaceController,
    rows: readonly TransactionRowData[],
    allocationColumns: readonly AllocationColumn[] = []
): void {
    controller.updateProjection(
        testTransactionCursor(rows),
        transactionColumnIds(allocationColumns)
    );
}

/** A real controller and cursor projection for direct TransactionTable component tests. */
export function createTestTransactionGridController(
    rows: readonly TransactionRowData[],
    allocationColumns: readonly AllocationColumn[] = []
) {
    const controller = createTransactionGridWorkspaceController(
        createTransactionCellSelectionAtom()
    );
    updateTestTransactionGridController(controller, rows, allocationColumns);
    return controller;
}

/**
 * A contiguous row window starting at a given position in the matching order.
 *
 * The grid addresses rows by absolute position, so a test that hands it a plain list has to say
 * where that list sits. `startIndex` defaults to 0, i.e. "these are the first rows of the set".
 */
export function contiguousRowWindow<TRow>(
    rows: readonly TRow[],
    startIndex = 0
): TransactionRowWindow<TRow> {
    return { indexes: rows.map((unused, offset) => startIndex + offset), rows };
}

/** Indexes of the rows the virtualizer currently has mounted, in ascending order. */
export function mountedRowIndexes(): readonly number[] {
    return [...document.querySelectorAll<HTMLElement>("[data-index]")]
        .map((element) => Number(element.dataset.index))
        .sort((left, right) => left - right);
}
