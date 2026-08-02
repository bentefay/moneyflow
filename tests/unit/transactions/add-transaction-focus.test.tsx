/**
 * UR-001: creating a transaction focuses the new row's description instead of selecting it.
 *
 * Two invariants are protected here, and both are behavioural rather than cosmetic:
 *
 * 1. Creating a row must leave any pre-existing selection untouched. Selection means "target for
 *    bulk operations", so an empty new row must never silently discard an in-progress multi-row
 *    selection the user built up for a bulk edit.
 * 2. The focus intent is consumed exactly once and then cleared, so it cannot re-assert on a later
 *    render — otherwise the caret would be yanked back into the new row while the user is typing
 *    somewhere else.
 *
 * The grid is virtualized, so the table is also asserted to keep the focus target mounted: a
 * request aimed at a row outside the visible window must still land, not be silently dropped.
 */

import type { Range } from "@tanstack/react-virtual";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    NO_ROWS_SELECTED,
    setRowsSelected
} from "@/components/features/transactions/table-selection";
import {
    pendingFocusDescriptionId,
    retireFocusDescription,
    retireScroll,
    revealCreatedTransaction,
    revealExistingTransaction
} from "@/components/features/transactions/transaction-reveal-intent";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";

interface CapturedVirtualizerOptions {
    count: number;
    getScrollElement: () => HTMLElement | null;
    estimateSize: () => number;
    overscan: number;
    rangeExtractor: (range: Range) => number[];
}

const virtualizerSpy = vi.hoisted(() =>
    vi.fn((options: CapturedVirtualizerOptions) => ({
        // Mirrors the real virtualizer closely enough to matter here: only the rows the range
        // extractor keeps are ever mounted, so a dropped index really is an unmounted row.
        getVirtualItems: () =>
            options
                .rangeExtractor({
                    startIndex: 0,
                    endIndex: Math.min(4, options.count - 1),
                    overscan: options.overscan,
                    count: options.count
                })
                .map((index) => ({
                    index,
                    key: index,
                    start: index * options.estimateSize(),
                    end: (index + 1) * options.estimateSize(),
                    size: options.estimateSize(),
                    lane: 0
                })),
        getTotalSize: () => options.count * options.estimateSize(),
        measureElement: vi.fn()
    }))
);

vi.mock("@tanstack/react-virtual", () => ({
    defaultRangeExtractor: (range: Range) => {
        const start = Math.max(range.startIndex - range.overscan, 0);
        const end = Math.min(range.endIndex + range.overscan, range.count - 1);
        return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    },
    useVirtualizer: virtualizerSpy
}));

vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

function createTransactions(count: number): TransactionRowData[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `transaction-${index}`,
        date: "2026-01-01",
        description: "",
        amount: 0
    }));
}

describe("transaction reveal intent", () => {
    it("asks a created row for focus and an existing deep-linked row only for a scroll", () => {
        const created = revealCreatedTransaction("new-row");
        expect(created).toEqual({
            transactionId: "new-row",
            scrollPending: true,
            focusDescriptionPending: true
        });

        const deepLinked = revealExistingTransaction("existing-row");
        expect(deepLinked.focusDescriptionPending).toBe(false);
        expect(pendingFocusDescriptionId(deepLinked)).toBeNull();
        expect(pendingFocusDescriptionId(created)).toBe("new-row");
        expect(pendingFocusDescriptionId(null)).toBeNull();
    });

    it("retires the scroll without retiring a focus that has not landed yet", () => {
        const scrolled = retireScroll(revealCreatedTransaction("new-row"));
        if (scrolled == null) throw new Error("Expected focus to keep the intent alive");

        expect(scrolled.scrollPending).toBe(false);
        expect(pendingFocusDescriptionId(scrolled)).toBe("new-row");
    });

    it("clears the intent once every step has landed, so it cannot re-assert", () => {
        const scrolled = retireScroll(revealCreatedTransaction("new-row"));
        if (scrolled == null) throw new Error("Expected focus to keep the intent alive");

        expect(retireFocusDescription(scrolled)).toBeNull();
        // Order is irrelevant: whichever step lands last is what retires the intent.
        const focused = retireFocusDescription(revealCreatedTransaction("new-row"));
        if (focused == null) throw new Error("Expected scroll to keep the intent alive");
        expect(retireScroll(focused)).toBeNull();
    });

    it("retires a scroll-only deep link in one step", () => {
        expect(retireScroll(revealExistingTransaction("existing-row"))).toBeNull();
    });

    it("never mutates the intent it is given", () => {
        const original = revealCreatedTransaction("new-row");
        retireScroll(original);
        retireFocusDescription(original);

        expect(original).toEqual({
            transactionId: "new-row",
            scrollPending: true,
            focusDescriptionPending: true
        });
    });
});

describe("transaction table description focus", () => {
    beforeEach(() => virtualizerSpy.mockClear());

    it("focuses the requested row's description and reports the request as applied once", () => {
        const onFocusDescriptionApplied = vi.fn();
        const { rerender } = render(
            <TransactionTable
                transactions={createTransactions(3)}
                focusDescriptionTransactionId="transaction-1"
                onFocusDescriptionApplied={onFocusDescriptionApplied}
            />
        );

        const descriptions = screen.getAllByTestId("description-editable");
        expect(document.activeElement).toBe(descriptions[1]);
        expect(onFocusDescriptionApplied).toHaveBeenCalledTimes(1);

        // A later re-render with the request already retired must not steal the caret back.
        descriptions[2].focus();
        rerender(
            <TransactionTable
                transactions={createTransactions(3)}
                focusDescriptionTransactionId={null}
                onFocusDescriptionApplied={onFocusDescriptionApplied}
            />
        );
        expect(document.activeElement).toBe(descriptions[2]);
        expect(onFocusDescriptionApplied).toHaveBeenCalledTimes(1);
    });

    it("touches no other row's description when no focus is requested", () => {
        render(<TransactionTable transactions={createTransactions(3)} />);

        expect(document.activeElement).toBe(document.body);
    });

    it("mounts a focus target that falls outside the visible virtual window", () => {
        render(
            <TransactionTable
                transactions={createTransactions(500)}
                focusDescriptionTransactionId="transaction-400"
            />
        );

        const options = virtualizerSpy.mock.calls.at(-1)?.[0];
        if (!options) throw new Error("Expected virtualizer options");
        const distantRange = { startIndex: 0, endIndex: 4, overscan: 5, count: 500 };
        expect(options.rangeExtractor(distantRange)).toContain(400);

        const row = screen
            .getAllByTestId("transaction-row")
            .find((element) => element.getAttribute("data-transaction-id") === "transaction-400");
        if (!row) throw new Error("Expected the pinned focus target to be mounted");
        expect(document.activeElement).toBe(
            row.querySelector('[data-testid="description-editable"]')
        );
    });

    it("leaves selection alone when a row is asked to take focus", () => {
        const onSelectionChange = vi.fn();
        render(
            <TransactionTable
                transactions={createTransactions(3)}
                selection={setRowsSelected(
                    NO_ROWS_SELECTED,
                    ["transaction-0", "transaction-2"],
                    true
                )}
                onSelectionChange={onSelectionChange}
                focusDescriptionTransactionId="transaction-1"
            />
        );

        expect(onSelectionChange).not.toHaveBeenCalled();
        const rows = screen.getAllByTestId("transaction-row");
        expect(rows.map((row) => row.getAttribute("aria-selected"))).toEqual([
            "true",
            "false",
            "true"
        ]);
    });
});
