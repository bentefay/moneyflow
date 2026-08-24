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

/**
 * The row height `TransactionTable` estimates with, which is also a collapsed row's real height.
 *
 * Kept in step with `ROW_HEIGHT` there deliberately: tests that scroll by whole rows need the two to
 * agree, or their arithmetic silently drifts. Do not read this as the *measured* height in a test
 * about the estimate — see the note on `measuredRowHeight`.
 */
export const HARNESS_ROW_HEIGHT = 57;

/** Viewport height, in whole rows, so the expected window size is arithmetic rather than a guess. */
export const HARNESS_VIEWPORT_ROWS = 10;

export const HARNESS_VIEWPORT_HEIGHT = HARNESS_ROW_HEIGHT * HARNESS_VIEWPORT_ROWS;

/** The overscan `TransactionTable` configures. */
export const HARNESS_OVERSCAN = 5;

/** How this harness answers `offsetHeight` for a row at a given absolute index. */
export interface VirtualGridLayoutOptions {
    /**
     * The height a row actually renders at, which is **not** the same thing as the height the grid
     * estimates it at.
     *
     * Defaulting this to `HARNESS_ROW_HEIGHT` — the grid's own estimate — makes every row measure
     * exactly as guessed, and that silently disables every measurement-driven code path in the
     * virtualizer: `resizeItem` early-returns on `delta === 0`, so no re-measurement, no total-size
     * growth and no scroll adjustment can ever occur. A test written against that default cannot
     * observe any of them, however real the virtualizer otherwise is. Pass real heights to exercise
     * them; the production grid estimates 44 while rows render at 57, 75 and 103.
     */
    readonly measuredRowHeight?: (index: number) => number;
    /** Records every scroll the *virtualizer* performs, i.e. every scroll adjustment it applies. */
    readonly onProgrammaticScroll?: (top: number) => void;
}

/**
 * Gives jsdom enough layout for the real virtualizer to work, and returns a cleanup.
 *
 * The scroll container is identified by the `overflow-auto` class `TransactionTable` puts on it, and
 * measured rows by the `data-index` attribute the virtualizer itself writes. Everything else keeps a
 * zero height, so nothing else can accidentally become a viewport.
 */
export function installVirtualGridLayout(options: VirtualGridLayoutOptions = {}): () => void {
    const isScrollContainer = (element: HTMLElement) => element.classList.contains("overflow-auto");
    const measuredRowHeight = options.measuredRowHeight ?? (() => HARNESS_ROW_HEIGHT);

    /** The height the grid itself has declared for its row group, i.e. the scrollable content. */
    const declaredContentHeight = (container: HTMLElement): number => {
        const rowGroup = container.querySelector<HTMLElement>('[role="rowgroup"]');
        return rowGroup == null ? 0 : Number.parseFloat(rowGroup.style.height) || 0;
    };

    const restore = replaceOnHtmlElementPrototype({
        offsetHeight: {
            get(this: HTMLElement) {
                if (isScrollContainer(this)) return HARNESS_VIEWPORT_HEIGHT;
                const index = this.dataset.index;
                return index == null ? 0 : measuredRowHeight(Number(index));
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
        // jsdom implements no scrolling, so `scrollTo` — which is how react-virtual's `elementScroll`
        // moves the container — is either absent or a no-op.
        //
        // The `scroll` event is fired in a *later* task, deliberately, because that is what a browser
        // does. Firing it synchronously delivers it while React is still inside the effect that asked
        // for the scroll, and react-virtual's `useFlushSync: true` then calls `flushSync` from inside
        // a lifecycle — the React warning the E2E scale test fails the whole run on. That warning
        // would be an artefact of an impatient stand-in rather than anything the product does.
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
                // The only route react-virtual has to move the container, so every call is a scroll
                // the *virtualizer* performed — which is what `applyScrollAdjustment` does.
                options.onProgrammaticScroll?.(top);
                this.scrollTop = top;
                setTimeout(() => this.dispatchEvent(new Event("scroll")), 0);
            }
        }
    });

    const restoreResizeObserver = installMeasuringResizeObserver();

    return () => {
        restoreResizeObserver();
        restore();
    };
}

/**
 * A `ResizeObserver` that actually reports a size, because jsdom has none at all.
 *
 * This is load-bearing far beyond its size. react-virtual's `measureElement` ref measures
 * synchronously **only when `!isScrolling`**; while a scroll is in flight it merely calls
 * `observer.observe(node)` and waits for the observer to report. With no `ResizeObserver` the
 * virtualizer's own `observer` getter returns `null`, so rows mounted during a scroll are **never
 * measured** and keep their estimate forever. That silently disables `resizeItem`, dynamic
 * measurement, total-size correction and the whole scroll-adjustment path — every measurement-driven
 * behaviour the grid has — while leaving the virtualizer otherwise real, so tests look like they are
 * exercising it. A no-op stub is no better: it makes `observe` succeed and then never reports.
 *
 * Sizes come from `offsetHeight`, which this harness already answers, and are delivered in a later
 * task because that is when a browser delivers them.
 */
function installMeasuringResizeObserver(): () => void {
    const previous = Reflect.get(globalThis, "ResizeObserver") as unknown;

    class MeasuringResizeObserver {
        private readonly targets = new Set<Element>();

        constructor(private readonly callback: ResizeObserverCallback) {}

        observe(target: Element): void {
            this.targets.add(target);
            setTimeout(() => this.report(target), 0);
        }

        unobserve(target: Element): void {
            this.targets.delete(target);
        }

        disconnect(): void {
            this.targets.clear();
        }

        private report(target: Element): void {
            if (!this.targets.has(target) || !target.isConnected) return;
            const blockSize = target instanceof HTMLElement ? target.offsetHeight : 0;
            const entry = {
                target,
                borderBoxSize: [{ blockSize, inlineSize: 0 }],
                contentBoxSize: [{ blockSize, inlineSize: 0 }],
                contentRect: new DOMRect(0, 0, 0, blockSize),
                devicePixelContentBoxSize: [{ blockSize, inlineSize: 0 }]
            };
            // The callback shape react-virtual reads: `entry.borderBoxSize[0].blockSize`.
            this.callback([entry] as unknown as ResizeObserverEntry[], this as never);
        }
    }

    Reflect.set(globalThis, "ResizeObserver", MeasuringResizeObserver);
    return () => {
        Reflect.set(globalThis, "ResizeObserver", previous);
    };
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
        creationInstant: Temporal.Instant.fromEpochMilliseconds(1_700_000_000_000 + index),
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
    return createTransactionCursor(buildTransactionIndex(buildFakeTransactionStore(transactions)));
}

/** Publishes a new real cursor projection into an existing direct-table test controller. */
export function updateTestTransactionGridController(
    controller: TransactionGridWorkspaceController,
    rows: readonly TransactionRowData[]
): void {
    controller.updateProjection(testTransactionCursor(rows), transactionColumnIds([]));
}

/** A real controller and cursor projection for direct TransactionTable component tests. */
export function createTestTransactionGridController(rows: readonly TransactionRowData[]) {
    const controller = createTransactionGridWorkspaceController(
        createTransactionCellSelectionAtom()
    );
    updateTestTransactionGridController(controller, rows);
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
