import { fireEvent, render, screen } from "@testing-library/react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";

import { TransactionGridCell } from "@/components/features/transactions/cells/TransactionGridCell";
import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";

import { createTestTransactionTable, transaction } from "./table-model/test-table";
import { updateTestTransactionGridController } from "./virtual-grid-harness";

function gridcellFixture(columnId: "checkbox" | "description" | "actions" = "description") {
    const rows = [transaction({ id: "transaction-1" }), transaction({ id: "transaction-2" })];
    const atom = createTransactionCellSelectionAtom();
    const controller = createTransactionGridWorkspaceController(atom);
    updateTestTransactionGridController(controller, rows);
    const table = createTestTransactionTable({ cellSelectionAtom: atom, transactions: rows });
    const cell = table.getRowsInDisplayOrder()[0].getAllCellsByColumnId()[columnId];
    const interaction = cell?.column.columnDef.meta?.interaction;
    if (cell == null || interaction == null) {
        throw new Error(`${columnId} cell fixture is missing`);
    }
    return { cell, controller, interaction };
}

describe("TransactionGridCell", () => {
    it("mounts exactly one display/editor branch", () => {
        const { cell, controller, interaction } = gridcellFixture();
        const view = render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span data-testid="display-branch">Display</span>}
                editor={<input data-testid="editor-branch" />}
            />
        );

        expect(screen.getByTestId("display-branch")).toBeInTheDocument();
        expect(screen.queryByTestId("editor-branch")).not.toBeInTheDocument();

        view.rerender(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="editing"
                isInitialTabStop={false}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span data-testid="display-branch">Display</span>}
                editor={<input data-testid="editor-branch" />}
                showEditor={true}
            />
        );

        expect(screen.queryByTestId("display-branch")).not.toBeInTheDocument();
        expect(screen.getByTestId("editor-branch")).toBeInTheDocument();
    });

    it("adapts double click to the typed full-edit seam", () => {
        const { cell, controller, interaction } = gridcellFixture();
        const onEditRequest = vi.fn();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
                onEditRequest={onEditRequest}
            />
        );

        fireEvent.doubleClick(screen.getByRole("gridcell"));

        expect(onEditRequest).toHaveBeenCalledTimes(1);
        expect(onEditRequest).toHaveBeenCalledWith("full", undefined);
    });

    it.each(["checkbox", "actions"] as const)(
        "does not adapt a %s background double click into edit",
        (columnId) => {
            const { cell, controller, interaction } = gridcellFixture(columnId);
            const dispatchCellIntent = vi.spyOn(controller, "dispatchCellIntent");
            controller.setFocusedCell("transaction-2", "description");
            const selectionBeforeDoubleClick = controller.cellSelectionAtom.get();
            const onEditRequest = vi.fn();
            render(
                <TransactionGridCell
                    address={{
                        columnId,
                        transactionId: asTransactionId("transaction-1")
                    }}
                    ariaColumnIndex={columnId === "checkbox" ? 1 : 8}
                    cell={cell}
                    controller={controller}
                    interaction={interaction}
                    selected={false}
                    interactionKind="navigating"
                    isInitialTabStop={false}
                    isParkedTabStop={false}
                    viewportRowDistance={5}
                    display={<span>Activation display</span>}
                    onEditRequest={onEditRequest}
                />
            );

            fireEvent.doubleClick(screen.getByRole("gridcell"));

            expect(dispatchCellIntent).not.toHaveBeenCalled();
            expect(onEditRequest).not.toHaveBeenCalled();
            expect(controller.cellSelectionAtom.get()).toEqual(selectionBeforeDoubleClick);
        }
    );

    it("restores an idle gridcell focus origin without turning it into selection", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<span>Display</span>}
            />
        );
        const gridcell = screen.getByRole("gridcell");
        const external = document.createElement("button");
        document.body.append(external);
        gridcell.focus();
        controller.clearUserFocus();

        controller.dispatchCellIntent(
            {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            },
            { kind: "move-to", target: { kind: "grid-end" } },
            5
        );
        const pending = controller.getPendingRequest();
        if (pending == null) throw new Error("navigation request was not retained");
        const accepted = {
            acceptedCommandId: pending.state.acceptedCommandId,
            projectionGeneration: pending.state.projectionGeneration
        };
        external.focus();
        controller.markRevealApplied(accepted);
        controller.registerCell(pending.state.target, document.createElement("div"));

        expect(controller.focusPendingActivation(accepted)).toBe("stale");
        expect(document.activeElement).toBe(gridcell);
        expect(controller.getInteractionState()).toEqual({ kind: "idle", selection: [] });
        expect(controller.cellSelectionAtom.get()).toEqual([]);
        external.remove();
    });

    it("keeps the parked anchor tabbable and exposes its retained range on focus", () => {
        const { cell, controller, interaction } = gridcellFixture();
        controller.setFocusedCell("transaction-1", "description");
        controller.dispatchCellIntent(
            {
                columnId: "description",
                transactionId: asTransactionId("transaction-1")
            },
            { direction: "right", kind: "extend" },
            5
        );
        const retainedSelection = controller.cellSelectionAtom.get();
        controller.setFocusedActivation("transaction-1");
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={true}
                interactionKind="parked"
                isInitialTabStop={false}
                isParkedTabStop={true}
                viewportRowDistance={5}
                display={<span>Display</span>}
            />
        );
        const gridcell = screen.getByRole("gridcell");

        expect(gridcell).toHaveAttribute("tabindex", "0");
        expect(gridcell).not.toHaveAttribute("aria-selected");
        gridcell.focus();

        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(controller.cellSelectionAtom.get()).toEqual(retainedSelection);
    });

    it("lets interactive descendants keep focus and pointer ownership", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={<div tabIndex={0}>Legacy editor</div>}
                legacyInteractive={true}
            />
        );

        const gridcell = screen.getByRole("gridcell");
        const editor = screen.getByText("Legacy editor");
        expect(gridcell).toHaveAttribute("tabindex", "0");

        fireEvent.focus(editor);
        expect(gridcell).toHaveAttribute("tabindex", "-1");
        fireEvent.pointerDown(editor, { button: 0 });
        fireEvent.keyDown(editor, { key: "ArrowRight" });

        expect(controller.cellSelectionAtom.get()).toEqual([]);
    });

    it("lets portaled descendants keep pointer ownership", () => {
        const { cell, controller, interaction } = gridcellFixture();
        render(
            <TransactionGridCell
                address={{
                    columnId: "description",
                    transactionId: asTransactionId("transaction-1")
                }}
                cell={cell}
                ariaColumnIndex={3}
                controller={controller}
                interaction={interaction}
                selected={false}
                interactionKind="idle"
                isInitialTabStop={true}
                isParkedTabStop={false}
                viewportRowDistance={5}
                display={createPortal(<button type="button">Popup option</button>, document.body)}
            />
        );

        fireEvent.pointerDown(screen.getByRole("button", { name: "Popup option" }), { button: 0 });

        expect(controller.cellSelectionAtom.get()).toEqual([]);
    });
});
