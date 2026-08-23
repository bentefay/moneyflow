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

import type { OnChangeFn } from "@tanstack/table-core";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    asTransactionId,
    NO_TRANSACTION_ROWS_SELECTED,
    setTransactionRowsSelected,
    transactionRowOrderFromIds,
    type TransactionRowSelection
} from "@/components/features/transactions/table-model";
import {
    pendingFocusDescriptionId,
    retireFocusDescription,
    retireScroll,
    revealCreatedTransaction,
    revealExistingTransaction
} from "@/components/features/transactions/transaction-reveal-intent";
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";

import {
    contiguousRowWindow,
    HARNESS_ROW_HEIGHT,
    installVirtualGridLayout,
    mountedRowIndexes
} from "./virtual-grid-harness";

vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

function createTransactions(count: number): TransactionRowData[] {
    return Array.from({ length: count }, (unused, index) => ({
        id: `transaction-${String(index)}`,
        date: "2026-01-01",
        description: "",
        amount: 0
    }));
}

/** The grid, with the selection wiring every test here needs and nothing more. */
function renderGrid(props: {
    readonly transactions: TransactionRowData[];
    readonly focusDescriptionTransactionId?: string | null;
    readonly onFocusDescriptionApplied?: () => void;
    readonly rowSelection?: TransactionRowSelection;
    readonly onRowSelectionChange?: OnChangeFn<TransactionRowSelection>;
}) {
    const element = (
        <TransactionTable
            rowWindow={contiguousRowWindow(props.transactions)}
            matchingRowCount={props.transactions.length}
            rowOrder={transactionRowOrderFromIds(
                props.transactions.map((transaction) => asTransactionId(transaction.id))
            )}
            rowSelection={props.rowSelection ?? NO_TRANSACTION_ROWS_SELECTED}
            onRowSelectionChange={props.onRowSelectionChange ?? (() => undefined)}
            matchingRowsChange={null}
            onMatchingSetReconciled={() => undefined}
            focusDescriptionTransactionId={props.focusDescriptionTransactionId}
            onFocusDescriptionApplied={props.onFocusDescriptionApplied}
        />
    );
    return { element, ...render(element) };
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
    // The real virtualizer, given real element sizes. A focus request aimed at a row outside the
    // window is only interesting if the window is genuinely bounded, which a fake window could
    // assert about itself but not demonstrate.
    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
    });
    afterEach(() => restoreLayout());

    it("focuses the requested row's description and reports the request as applied once", () => {
        const onFocusDescriptionApplied = vi.fn();
        const { rerender } = renderGrid({
            focusDescriptionTransactionId: "transaction-1",
            onFocusDescriptionApplied,
            transactions: createTransactions(3)
        });

        const descriptions = screen.getAllByTestId("description-editable");
        expect(document.activeElement).toBe(descriptions[1]);
        expect(onFocusDescriptionApplied).toHaveBeenCalledTimes(1);

        // A later re-render with the request already retired must not steal the caret back. Wrapped,
        // because focusing a live description input is a real gesture that updates its own state.
        act(() => descriptions[2].focus());
        rerender(
            <TransactionTable
                rowWindow={contiguousRowWindow(createTransactions(3))}
                matchingRowCount={3}
                rowOrder={transactionRowOrderFromIds([])}
                rowSelection={NO_TRANSACTION_ROWS_SELECTED}
                onRowSelectionChange={() => undefined}
                matchingRowsChange={null}
                onMatchingSetReconciled={() => undefined}
                focusDescriptionTransactionId={null}
                onFocusDescriptionApplied={onFocusDescriptionApplied}
            />
        );
        expect(document.activeElement).toBe(descriptions[2]);
        expect(onFocusDescriptionApplied).toHaveBeenCalledTimes(1);
    });

    it("touches no other row's description when no focus is requested", () => {
        renderGrid({ transactions: createTransactions(3) });

        expect(document.activeElement).toBe(document.body);
    });

    it("mounts a focus target that falls outside the visible virtual window", () => {
        renderGrid({
            focusDescriptionTransactionId: "transaction-400",
            transactions: createTransactions(500)
        });

        // Row 400 is far outside the measured window — the grid mounts it anyway, because a focus
        // request that lands on an unmounted row is a request silently dropped.
        const indexes = mountedRowIndexes();
        expect(indexes).toContain(400);
        expect(indexes).not.toContain(300);
        expect(indexes.length).toBeLessThan(500);
        // The pinned row sits where the virtualizer placed it, not at the top of the group.
        const pinnedWrapper = document.querySelector('[data-index="400"]');
        expect(pinnedWrapper).toHaveStyle({
            transform: `translateY(${String(400 * HARNESS_ROW_HEIGHT)}px)`
        });

        const row = screen
            .getAllByTestId("transaction-row")
            .find((element) => element.getAttribute("data-transaction-id") === "transaction-400");
        if (!row) throw new Error("Expected the pinned focus target to be mounted");
        expect(document.activeElement).toBe(
            row.querySelector('[data-testid="description-editable"]')
        );
    });

    it("leaves selection alone when a row is asked to take focus", () => {
        const onRowSelectionChange = vi.fn();
        renderGrid({
            focusDescriptionTransactionId: "transaction-1",
            onRowSelectionChange,
            rowSelection: setTransactionRowsSelected(
                NO_TRANSACTION_ROWS_SELECTED,
                [asTransactionId("transaction-0"), asTransactionId("transaction-2")],
                true
            ),
            transactions: createTransactions(3)
        });

        expect(onRowSelectionChange).not.toHaveBeenCalled();
        const rows = screen.getAllByTestId("transaction-row");
        expect(rows.map((row) => row.getAttribute("aria-selected"))).toEqual([
            "true",
            "false",
            "true"
        ]);
    });
});
