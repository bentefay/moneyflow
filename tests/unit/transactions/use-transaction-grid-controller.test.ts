import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController,
    useTransactionGridController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import {
    allocationColumnId,
    asTransactionId,
    type TransactionColumnId
} from "@/components/features/transactions/table-model/ids";
import {
    TransactionGridWorkspace,
    useTransactionGridWorkspace
} from "@/components/features/transactions/TransactionGridWorkspace";
import type { TransactionInput } from "@/lib/crdt/schema";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

import { populateStore } from "../crdt/transaction-cursor-fixtures";
import {
    createTestTransactionTable,
    transaction as tableTransaction
} from "./table-model/test-table";

const COLUMNS = ["date", "description", "amount"] as const;

function transaction(id: string, description = id): TransactionInput {
    return {
        accountId: "acc-1",
        allocations: {},
        amount: asMinorUnits(-1000),
        creationInstant: Temporal.Instant.from("2026-08-24T10:00:00Z"),
        date: Temporal.PlainDate.from("2026-08-24"),
        deletedAt: undefined,
        description,
        descriptionAliasId: undefined,
        id,
        importId: "",
        importRowIndex: 0,
        notes: "",
        originalAmount: undefined,
        statusId: "status-for-review",
        suspectedDuplicates: [],
        tagIds: []
    };
}

function cursorFor(rows: readonly TransactionInput[]) {
    return createTransactionCursor(buildTransactionIndex(populateStore(rows)));
}

function address(transactionId: string, columnId: (typeof COLUMNS)[number] = "description") {
    return { columnId, transactionId: asTransactionId(transactionId) };
}

function rowWithFocusableCell(columnId: string) {
    const row = document.createElement("div");
    const cell = document.createElement("div");
    const input = document.createElement("input");
    cell.dataset.cell = columnId;
    cell.append(input);
    row.append(cell);
    document.body.append(row);
    return { input, row };
}

function createController() {
    return createTransactionGridWorkspaceController(createTransactionCellSelectionAtom());
}

function WorkspaceWrapper({ children }: { readonly children: ReactNode }) {
    return createElement(TransactionGridWorkspace, null, children);
}

describe("transaction grid workspace controller", () => {
    it("creates one stable supported React atom per workspace mount", () => {
        const firstMount = renderHook(useTransactionGridWorkspace, {
            wrapper: WorkspaceWrapper
        });
        const firstController = firstMount.result.current;
        const firstAtom = firstController.cellSelectionAtom;

        firstMount.rerender();
        expect(firstMount.result.current).toBe(firstController);
        expect(firstMount.result.current.cellSelectionAtom).toBe(firstAtom);
        firstMount.unmount();

        const secondMount = renderHook(useTransactionGridWorkspace, {
            wrapper: WorkspaceWrapper
        });
        expect(secondMount.result.current.cellSelectionAtom).not.toBe(firstAtom);
        secondMount.unmount();
    });
    it("publishes the canonical selection through its external TanStack atom", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);

        controller.setFocusedCell("tx-1", "description");

        expect(controller.cellSelectionAtom.get()).toEqual([
            {
                anchorColumnId: "description",
                anchorRowId: "tx-1",
                focusColumnId: "description",
                focusRowId: "tx-1",
                operation: "include"
            }
        ]);
        expect(controller.getSnapshot().activeTransactionId).toBe("tx-1");
        expect(controller.getSnapshot().focusRetentionTransactionId).toBeNull();
    });

    it("is the same writable atom used by a real TanStack table", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const table = createTestTransactionTable({
            cellSelectionAtom: controller.cellSelectionAtom,
            transactions: [tableTransaction({ id: "tx-1" })]
        });

        table.setFocusedCell("tx-1", "description");

        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        expect(controller.getSnapshot().activeTransactionId).toBe("tx-1");
        controller.clearCellSelection();
        expect(table.getSelectedCellCount()).toBe(0);
    });

    it("advances generation only when stable row or column structure changes", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1", "before")]), COLUMNS);
        const initial = controller.getSnapshot().generation;

        controller.updateProjection(cursorFor([transaction("tx-1", "after")]), [...COLUMNS]);
        expect(controller.getSnapshot().generation).toBe(initial);

        controller.updateProjection(
            cursorFor([transaction("tx-1", "after"), transaction("tx-2")]),
            COLUMNS
        );
        const afterRowChange = controller.getSnapshot().generation;
        expect(afterRowChange).toBe(initial + 1);

        controller.updateProjection(
            cursorFor([transaction("tx-1", "after"), transaction("tx-2")]),
            ["date", "amount"]
        );
        expect(controller.getSnapshot().generation).toBe(afterRowChange + 1);
    });

    it("reconciles and focuses the replacement cell when the active row is removed", () => {
        const controller = createController();
        const initialCursor = cursorFor([transaction("tx-1"), transaction("tx-2")]);
        const nextCursor = cursorFor([transaction("tx-2")]);
        const replacement = rowWithFocusableCell("description");
        controller.registerRow(asTransactionId("tx-2"), replacement.row);
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => controller.setFocusedCell("tx-1", "description"));

        hook.rerender({ cursor: nextCursor });

        expect(controller.getSnapshot().activeTransactionId).toBe("tx-2");
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-2"
        });
        expect(document.activeElement).toBe(replacement.input);
        hook.unmount();
        replacement.row.remove();
    });

    it("reconciles an active removed allocation column against the previous column order", () => {
        const controller = createController();
        const cursor = cursorFor([transaction("tx-1")]);
        const allocation = allocationColumnId("deleted-person");
        const initialColumns: readonly TransactionColumnId[] = ["date", allocation, "amount"];
        const nextColumns: readonly TransactionColumnId[] = ["date", "amount"];
        const replacement = rowWithFocusableCell("date");
        controller.registerRow(asTransactionId("tx-1"), replacement.row);
        const hook = renderHook(
            ({ columns }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: columns
                }),
            { initialProps: { columns: initialColumns } }
        );
        act(() => controller.setFocusedCell("tx-1", allocation));

        hook.rerender({ columns: nextColumns });

        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "date",
            anchorRowId: "tx-1"
        });
        expect(document.activeElement).toBe(replacement.input);
        hook.unmount();
        replacement.row.remove();
    });

    it("focuses the explicit after-grid fallback when the active projection becomes empty", () => {
        const controller = createController();
        const initialCursor = cursorFor([transaction("tx-1")]);
        const afterGrid = document.createElement("button");
        document.body.append(afterGrid);
        controller.registerAfterGridElement(afterGrid);
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => controller.setFocusedCell("tx-1", "description"));

        hook.rerender({ cursor: cursorFor([]) });

        expect(controller.getInteractionState()).toEqual({ kind: "idle", selection: [] });
        expect(document.activeElement).toBe(afterGrid);
        hook.unmount();
        afterGrid.remove();
    });

    it("rebases a pending Add target and rejects its stale reveal identity", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-added")
        });

        controller.updateProjection(
            cursorFor([transaction("tx-1"), transaction("tx-added")]),
            COLUMNS
        );

        const rebased = controller.getPendingRequest();
        expect(rebased?.state.acceptedCommandId).toBe(accepted.acceptedCommandId);
        expect(rebased?.state.projectionGeneration).toBe(controller.getSnapshot().generation);
        expect(controller.markRevealApplied(accepted)).toBe(false);
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "pending-target", transactionId: "tx-added" }
        ]);
    });

    it("pins the active origin and pending target independently", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        controller.setFocusedCell("tx-1", "description");

        controller.beginActivation({ entry: "full", target: address("tx-2") });

        expect(controller.getSnapshot().pins).toEqual([
            { kind: "active-origin", transactionId: "tx-1" },
            { kind: "pending-target", transactionId: "tx-2" }
        ]);
    });

    it("pins one legacy live-control focus row without making it active selection authority", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);

        controller.setFocusedCell("tx-1", null);

        expect(controller.getSnapshot().activeTransactionId).toBeNull();
        expect(controller.getSnapshot().focusRetentionTransactionId).toBe("tx-1");
        expect(controller.cellSelectionAtom.get()).toEqual([]);
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "focus-retention", transactionId: "tx-1" }
        ]);

        controller.beginActivation({ entry: "full", target: address("tx-2") });
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "focus-retention", transactionId: "tx-1" },
            { kind: "pending-target", transactionId: "tx-2" }
        ]);
    });

    it("cancels an older pending activation when explicit user focus replaces or clears it", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        const replaced = controller.beginActivation({
            entry: "full",
            target: address("tx-2")
        });

        controller.setFocusedCell("tx-1", "date");

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.markRevealApplied(replaced)).toBe(false);
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "date",
            anchorRowId: "tx-1"
        });

        const cleared = controller.beginActivation({
            entry: "full",
            target: address("tx-2")
        });
        controller.clearUserFocus();

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.markRevealApplied(cleared)).toBe(false);
        expect(controller.cellSelectionAtom.get()).toEqual([]);
        expect(controller.getSnapshot().pins).toEqual([]);
    });

    it("fulfills only after the current target is registered and actually focused", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-1")
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("unregistered");

        const input = document.createElement("input");
        const focus = vi.spyOn(input, "focus");
        document.body.append(input);
        controller.registerCell(address("tx-1"), input);

        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
        expect(document.activeElement).toBe(input);
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({
            editor: { entry: "full" },
            kind: "editing"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        expect(controller.focusPendingActivation(accepted)).toBe("stale");
        expect(focus).toHaveBeenCalledTimes(1);
        input.remove();
    });

    it("restores same-generation model focus scroll and held window when focus fails", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        controller.setFocusedCell("tx-1", "description");
        const priorFocus = document.createElement("input");
        const scrollElement = document.createElement("div");
        document.body.append(priorFocus, scrollElement);
        scrollElement.scrollLeft = 12;
        scrollElement.scrollTop = 240;
        controller.registerScrollElement(scrollElement);
        let heldWindowStart = 400;
        const restoreHeldWindowStart = vi.fn((start: number) => {
            heldWindowStart = start;
        });
        controller.setHeldWindowState(heldWindowStart, restoreHeldWindowStart);
        priorFocus.focus();
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-2")
        });
        scrollElement.scrollLeft = 80;
        scrollElement.scrollTop = 900;
        heldWindowStart = 800;
        expect(controller.markRevealApplied(accepted)).toBe(true);
        controller.registerCell(address("tx-2"), document.createElement("input"));

        expect(controller.focusPendingActivation(accepted)).toBe("stale");
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-2"),
            kind: "focus-failed"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        expect(document.activeElement).toBe(priorFocus);
        expect(scrollElement.scrollLeft).toBe(12);
        expect(scrollElement.scrollTop).toBe(240);
        expect(restoreHeldWindowStart).toHaveBeenCalledWith(400);
        expect(heldWindowStart).toBe(400);
        priorFocus.remove();
        scrollElement.remove();
    });

    it("retries focus when the current target registers after focus phase begins", () => {
        const controller = createController();
        const cursor = cursorFor([transaction("tx-1")]);
        controller.updateProjection(cursor, COLUMNS);
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-1")
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        const { unmount } = renderHook(() =>
            useTransactionGridController({ controller, cursor, selectableColumnIds: COLUMNS })
        );
        expect(controller.getPendingRequest()).not.toBeNull();

        const input = document.createElement("input");
        document.body.append(input);
        act(() => controller.registerCell(address("tx-1"), input));

        expect(document.activeElement).toBe(input);
        expect(controller.getPendingRequest()).toBeNull();
        unmount();
        input.remove();
    });

    it("notifies effect coordinators when registration changes without other state changes", () => {
        const controller = createController();
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot().registrationVersion;

        controller.registerCell(address("tx-1"), document.createElement("input"));

        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it("times out an absent reveal target and restores resources without manual phase advance", () => {
        vi.useFakeTimers();
        const controller = createController();
        const cursor = cursorFor([transaction("tx-1")]);
        controller.updateProjection(cursor, COLUMNS);
        controller.setFocusedCell("tx-1", "description");
        const priorFocus = document.createElement("input");
        const scrollElement = document.createElement("div");
        document.body.append(priorFocus, scrollElement);
        scrollElement.scrollTop = 120;
        controller.registerScrollElement(scrollElement);
        let heldWindowStart = 200;
        controller.setHeldWindowState(heldWindowStart, (start) => {
            heldWindowStart = start;
        });
        priorFocus.focus();
        const { unmount } = renderHook(() =>
            useTransactionGridController({
                controller,
                cursor,
                materializationTimeoutMs: 25,
                selectableColumnIds: COLUMNS
            })
        );
        act(() => {
            controller.beginActivation({
                entry: "full",
                target: address("tx-absent")
            });
        });
        scrollElement.scrollTop = 800;
        heldWindowStart = 600;

        act(() => vi.advanceTimersByTime(25));

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-absent"),
            kind: "load-failed"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        expect(document.activeElement).toBe(priorFocus);
        expect(scrollElement.scrollTop).toBe(120);
        expect(heldWindowStart).toBe(200);
        unmount();
        priorFocus.remove();
        scrollElement.remove();
        vi.useRealTimers();
    });

    it("restores the origin when the current focus target does not register in time", () => {
        vi.useFakeTimers();
        const controller = createController();
        const cursor = cursorFor([transaction("tx-1"), transaction("tx-2")]);
        controller.updateProjection(cursor, COLUMNS);
        controller.setFocusedCell("tx-1", "description");
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-2")
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);

        const { unmount } = renderHook(() =>
            useTransactionGridController({
                controller,
                cursor,
                registrationTimeoutMs: 25,
                selectableColumnIds: COLUMNS
            })
        );
        act(() => vi.advanceTimersByTime(25));

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-2"),
            kind: "registration-timeout"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        unmount();
        vi.useRealTimers();
    });
});
