/**
 * UR-001: a pending Add activation targets the new row's Description cell without changing the
 * independent row-checkbox selection.
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
import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";

import {
    contiguousRowWindow,
    createTestTransactionGridController,
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

function renderGrid(props: {
    readonly transactions: TransactionRowData[];
    readonly targetId?: string;
    readonly rowSelection?: TransactionRowSelection;
    readonly onRowSelectionChange?: OnChangeFn<TransactionRowSelection>;
}) {
    const controller = createTestTransactionGridController(props.transactions);
    const accepted =
        props.targetId == null
            ? null
            : controller.beginActivation({
                  entry: "full",
                  target: {
                      columnId: "description",
                      transactionId: asTransactionId(props.targetId)
                  }
              });
    if (accepted != null) controller.markRevealApplied(accepted);
    const view = render(
        <TransactionTable
            controller={controller}
            rowWindow={contiguousRowWindow(props.transactions)}
            matchingRowCount={props.transactions.length}
            rowOrder={transactionRowOrderFromIds(
                props.transactions.map((transaction) => asTransactionId(transaction.id))
            )}
            rowSelection={props.rowSelection ?? NO_TRANSACTION_ROWS_SELECTED}
            onRowSelectionChange={props.onRowSelectionChange ?? (() => undefined)}
            matchingRowsChange={null}
            onMatchingSetReconciled={() => undefined}
        />
    );
    if (accepted != null) act(() => controller.focusPendingActivation(accepted));
    return { accepted, controller, ...view };
}

describe("transaction table pending Add focus", () => {
    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
    });
    afterEach(() => restoreLayout());

    it("focuses exactly the requested Description cell with full edit intent", () => {
        const { controller } = renderGrid({
            targetId: "transaction-1",
            transactions: createTransactions(3)
        });

        expect(document.activeElement).toBe(screen.getAllByTestId("description-editable")[1]);
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.cellSelectionAtom.get()).toEqual([
            {
                anchorColumnId: "description",
                anchorRowId: "transaction-1",
                focusColumnId: "description",
                focusRowId: "transaction-1",
                operation: "include"
            }
        ]);
    });

    it("mounts a pending target outside the visible virtual range", () => {
        renderGrid({ targetId: "transaction-400", transactions: createTransactions(500) });

        const indexes = mountedRowIndexes();
        expect(indexes).toContain(400);
        expect(indexes).not.toContain(300);
        expect(indexes.length).toBeLessThan(500);
        expect(document.querySelector('[data-index="400"]')).toHaveStyle({
            transform: `translateY(${String(400 * HARNESS_ROW_HEIGHT)}px)`
        });
    });

    it("leaves row-checkbox selection orthogonal to pending activation", () => {
        const onRowSelectionChange = vi.fn();
        renderGrid({
            targetId: "transaction-1",
            onRowSelectionChange,
            rowSelection: setTransactionRowsSelected(
                NO_TRANSACTION_ROWS_SELECTED,
                [asTransactionId("transaction-0"), asTransactionId("transaction-2")],
                true
            ),
            transactions: createTransactions(3)
        });

        expect(onRowSelectionChange).not.toHaveBeenCalled();
        expect(
            screen.getAllByTestId("transaction-row").map((row) => row.getAttribute("aria-selected"))
        ).toEqual(["true", "false", "true"]);
    });

    it("does not focus any description without a pending activation", () => {
        renderGrid({ transactions: createTransactions(3) });

        expect(document.activeElement).toBe(document.body);
    });
});
