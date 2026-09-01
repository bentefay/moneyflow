import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController,
    useTransactionGridController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import type {
    TransactionEditEntry,
    TransactionEditorPopupKind,
    TransactionGridAddress
} from "@/components/features/transactions/table-model";
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
const EDIT_ENTRIES = ["quick", "full"] satisfies readonly TransactionEditEntry[];
const ACTIVATION_ONLY_COLUMNS = ["checkbox", "actions"] satisfies readonly TransactionColumnId[];
const OWNED_POPUP_FIXTURES = [
    { columnId: "account", label: "Account", popup: "combobox" },
    { columnId: "status", label: "Status", popup: "listbox" },
    { columnId: "date", label: "Date", popup: "calendar" }
] satisfies readonly {
    readonly columnId: TransactionColumnId;
    readonly label: string;
    readonly popup: TransactionEditorPopupKind;
}[];

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

function address(transactionId: string, columnId: TransactionColumnId = "description") {
    return { columnId, transactionId: asTransactionId(transactionId) };
}

function descriptionAddress(
    transactionId: string
): TransactionGridAddress & { readonly columnId: "description" } {
    return { columnId: "description", transactionId: asTransactionId(transactionId) };
}

function rowWithFocusableCell(columnId: string) {
    const row = document.createElement("div");
    const cell = document.createElement("div");
    const input = document.createElement("input");
    cell.dataset.cell = columnId;
    cell.setAttribute("role", "gridcell");
    cell.tabIndex = -1;
    cell.append(input);
    row.append(cell);
    document.body.append(row);
    return { cell, input, row };
}

function createController(materializationTimeoutMs?: number) {
    return createTransactionGridWorkspaceController(createTransactionCellSelectionAtom(), {
        materializationTimeoutMs
    });
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

    it("keeps exact live cell ownership through stale cleanup and remount", () => {
        const controller = createController();
        const first = document.createElement("div");
        const replacement = document.createElement("div");
        const remount = document.createElement("div");

        const unregisterFirst = controller.registerCell(address("tx-1"), first);
        const unregisterReplacement = controller.registerCell(address("tx-1"), replacement);
        unregisterFirst();

        expect(controller.isRegisteredCellElement(first)).toBe(false);
        expect(controller.isRegisteredCellElement(replacement)).toBe(true);

        unregisterReplacement();
        expect(controller.isRegisteredCellElement(replacement)).toBe(false);

        const unregisterRemount = controller.registerCell(address("tx-1"), remount);
        expect(controller.isRegisteredCellElement(remount)).toBe(true);
        unregisterRemount();
        expect(controller.isRegisteredCellElement(remount)).toBe(false);
    });

    it("owns exact live editor portal roots and descendants through stale cleanup", () => {
        const controller = createController();
        const portal = document.createElement("div");
        portal.dataset.ownedByRow = "tx-1";
        portal.dataset.ownedByField = "description";
        const descendant = document.createElement("button");
        portal.append(descendant);
        const spoof = portal.cloneNode(true);
        if (!(spoof instanceof HTMLElement)) throw new Error("the spoofed portal did not clone");

        const unregisterFirst = controller.registerEditorPortal(address("tx-1"), portal);
        const unregisterReplacement = controller.registerEditorPortal(address("tx-1"), portal);
        unregisterFirst();

        expect(controller.isRegisteredEditorPortalTarget(address("tx-1"), portal)).toBe(true);
        expect(controller.isRegisteredEditorPortalTarget(address("tx-1"), descendant)).toBe(true);
        expect(controller.isRegisteredEditorPortalTarget(address("tx-1"), spoof)).toBe(false);
        expect(controller.isRegisteredEditorPortalTarget(address("tx-2"), descendant)).toBe(false);

        unregisterReplacement();
        expect(controller.isRegisteredEditorPortalTarget(address("tx-1"), descendant)).toBe(false);
    });

    it("dispatches pure movement through projection coordinates and registered gridcells", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        const first = document.createElement("div");
        const second = document.createElement("div");
        first.tabIndex = -1;
        second.tabIndex = -1;
        document.body.append(first, second);
        controller.registerCell(address("tx-1"), first);
        controller.registerCell(address("tx-2"), second);
        controller.setFocusedCell("tx-1", "description");
        first.focus();

        expect(
            controller.dispatchCellIntent(
                address("tx-1"),
                {
                    direction: "down",
                    kind: "move"
                },
                1
            )
        ).toEqual({ ok: true, value: { kind: "handled" } });
        expect(document.activeElement).toBe(second);
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-2",
            focusColumnId: "description",
            focusRowId: "tx-2"
        });
        first.remove();
        second.remove();
    });

    it.each([
        ["page-down", "tx-3", "tx-8"],
        ["page-up", "tx-8", "tx-3"]
    ] as const)(
        "uses the supplied viewport distance for %s across an unregistered boundary",
        (targetKind, originId, targetId) => {
            const controller = createController();
            controller.updateProjection(
                cursorFor(
                    Array.from({ length: 10 }, (unused, index) =>
                        transaction(`tx-${String(index + 1)}`)
                    )
                ),
                COLUMNS
            );
            controller.setFocusedCell(originId, "description");

            expect(
                controller.dispatchCellIntent(
                    address(originId),
                    { kind: "move-to", target: { kind: targetKind } },
                    5
                )
            ).toEqual({ ok: true, value: { kind: "handled" } });
            expect(controller.getPendingRequest()).toMatchObject({
                kind: "navigation",
                state: { target: address(targetId) }
            });
        }
    );

    it("extends PageDown by the supplied viewport distance without moving the active anchor", () => {
        const controller = createController();
        controller.updateProjection(
            cursorFor(
                Array.from({ length: 10 }, (unused, index) =>
                    transaction(`tx-${String(index + 1)}`)
                )
            ),
            COLUMNS
        );
        controller.setFocusedCell("tx-2", "description");

        expect(
            controller.dispatchCellIntent(
                address("tx-2"),
                { kind: "extend-to", target: { kind: "page-down" } },
                4
            )
        ).toEqual({ ok: true, value: { kind: "handled" } });
        expect(controller.cellSelectionAtom.get()).toEqual([
            {
                anchorColumnId: "description",
                anchorRowId: "tx-2",
                focusColumnId: "description",
                focusRowId: "tx-6",
                operation: "include"
            }
        ]);
    });

    it("reveals and focuses an unregistered canonical navigation target before publishing it", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        const source = document.createElement("div");
        const target = document.createElement("div");
        const focusTarget = vi.spyOn(target, "focus");
        source.tabIndex = -1;
        target.tabIndex = -1;
        document.body.append(source, target);
        controller.registerCell(address("tx-1"), source);
        controller.setFocusedCell("tx-1", "description");
        source.focus();

        expect(
            controller.dispatchCellIntent(
                address("tx-1"),
                {
                    direction: "down",
                    kind: "move"
                },
                1
            )
        ).toEqual({ ok: true, value: { kind: "handled" } });
        const pending = controller.getPendingRequest();
        expect(pending).toMatchObject({
            kind: "navigation",
            state: { phase: "reveal", target: address("tx-2") }
        });
        expect(controller.cellSelectionAtom.get()).toEqual([]);
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "active-origin", transactionId: "tx-1" },
            { kind: "pending-target", transactionId: "tx-2" }
        ]);
        if (pending == null) throw new Error("navigation request was not retained");
        const accepted = {
            acceptedCommandId: pending.state.acceptedCommandId,
            projectionGeneration: pending.state.projectionGeneration
        };

        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("unregistered");
        controller.registerCell(address("tx-2"), target);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        expect(focusTarget).toHaveBeenCalledWith({ preventScroll: true });
        expect(document.activeElement).toBe(target);
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-2",
            focusColumnId: "description",
            focusRowId: "tx-2"
        });
        source.remove();
        target.remove();
    });

    it("extends geometry from the latest extent while the anchor keeps DOM focus", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const anchor = document.createElement("div");
        anchor.tabIndex = -1;
        document.body.append(anchor);
        controller.registerCell(address("tx-1", "date"), anchor);
        controller.setFocusedCell("tx-1", "date");
        anchor.focus();

        controller.dispatchCellIntent(
            address("tx-1", "date"),
            {
                direction: "right",
                kind: "extend"
            },
            1
        );
        controller.dispatchCellIntent(
            address("tx-1", "date"),
            {
                direction: "right",
                kind: "extend"
            },
            1
        );

        expect(document.activeElement).toBe(anchor);
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "date",
            focusColumnId: "amount"
        });
        anchor.remove();
    });

    it("parks canonical selection without clearing its active identity", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        controller.setFocusedCell("tx-1", "description");

        expect(controller.dispatchCellIntent(address("tx-1"), { kind: "park" }, 1)).toEqual({
            ok: true,
            value: { kind: "handled" }
        });
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toHaveLength(1);
        expect(controller.getSnapshot().activeTransactionId).toBe("tx-1");
    });

    it("parks an existing range while retaining the focused activation row as shortcut authority", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        controller.setFocusedCell("tx-1", "date");
        controller.dispatchCellIntent(
            address("tx-1", "date"),
            { direction: "right", kind: "extend" },
            1
        );
        const selection = controller.cellSelectionAtom.get();

        controller.setFocusedActivation("tx-2");

        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toEqual(selection);
        expect(controller.getSnapshot()).toMatchObject({
            focusRetentionTransactionId: "tx-2",
            parkedActiveAddress: address("tx-1", "date"),
            pins: [
                { kind: "focus-retention", transactionId: "tx-2" },
                { kind: "active-origin", transactionId: "tx-1" }
            ]
        });
    });

    it("parks external ownership while retaining the canonical origin and cancelling pending focus", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        controller.setFocusedCell("tx-1", "date");
        controller.dispatchCellIntent(
            address("tx-1", "date"),
            { direction: "right", kind: "extend" },
            1
        );
        const retained = controller.cellSelectionAtom.get();
        controller.beginActivation({ entry: "full", target: address("tx-2") });

        controller.parkExternalFocus();

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()).toEqual(retained);
    });

    it("keeps gridcell and editor registrations distinct for full-edit focus", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const gridcell = document.createElement("div");
        const editor = document.createElement("input");
        gridcell.tabIndex = 0;
        document.body.append(gridcell, editor);
        controller.registerCell(address("tx-1"), gridcell);
        controller.registerEditor(address("tx-1"), editor);
        const accepted = controller.beginActivation({ entry: "full", target: address("tx-1") });
        expect(controller.markRevealApplied(accepted)).toBe(true);

        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        expect(document.activeElement).toBe(editor);
        gridcell.remove();
        editor.remove();
    });

    it("retains quick-entry text through editor focus fulfillment", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const editor = document.createElement("input");
        document.body.append(editor);
        controller.registerEditor(address("tx-1"), editor);

        const accepted = controller.beginActivation({
            entry: "quick",
            initialText: "q",
            target: address("tx-1")
        });
        expect(controller.getSnapshot().editor).toMatchObject({
            address: address("tx-1"),
            entry: "quick",
            initialText: "q"
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        expect(controller.getInteractionState()).toMatchObject({
            editor: { draft: { initialText: "q" }, entry: "quick" },
            kind: "editing"
        });
        expect(controller.getSnapshot().editor).toEqual({
            address: address("tx-1"),
            entry: "quick",
            initialText: "q"
        });
        editor.remove();
    });

    it.each(EDIT_ENTRIES)(
        "fulfills %s continuous editing into an already mounted destination editor",
        (entry) => {
            const controller = createController();
            const columns = ["description", "amount"] satisfies readonly TransactionColumnId[];
            controller.updateProjection(cursorFor([transaction("tx-1")]), columns);
            const sourceEditor = document.createElement("input");
            const destinationEditor = document.createElement("input");
            document.body.append(sourceEditor, destinationEditor);
            controller.registerEditor(address("tx-1"), sourceEditor);
            controller.registerEditor(address("tx-1", "amount"), destinationEditor);
            const accepted = controller.beginActivation({
                entry,
                initialText: entry === "quick" ? "q" : undefined,
                target: address("tx-1")
            });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");

            expect(
                controller.dispatchCellIntent(
                    address("tx-1"),
                    { direction: "right", kind: "commit-and-move", preserveEntry: entry },
                    1
                )
            ).toEqual({ ok: true, value: { kind: "handled" } });
            const pending = controller.getPendingRequest();
            if (pending == null) throw new Error("continuous destination was not pending");
            const identity = {
                acceptedCommandId: pending.state.acceptedCommandId,
                projectionGeneration: pending.state.projectionGeneration
            };

            expect(pending).toMatchObject({
                continuous: { entry, kind: "continue" },
                entry,
                kind: "edit",
                state: { target: address("tx-1", "amount") }
            });
            expect(controller.markRevealApplied(identity)).toBe(true);
            expect(controller.focusPendingActivation(identity)).toBe("focused");
            expect(document.activeElement).toBe(destinationEditor);
            expect(controller.getInteractionState()).toMatchObject({
                editor: { continuous: { entry, kind: "continue" }, entry },
                kind: "editing"
            });
            sourceEditor.remove();
            destinationEditor.remove();
        }
    );

    it.each(EDIT_ENTRIES)(
        "ends %s continuous editing at a clamped directional boundary",
        (entry) => {
            const controller = createController();
            controller.updateProjection(cursorFor([transaction("tx-1")]), ["description"]);
            const gridcell = document.createElement("div");
            const editor = document.createElement("input");
            gridcell.tabIndex = 0;
            document.body.append(gridcell, editor);
            controller.registerCell(address("tx-1"), gridcell);
            controller.registerEditor(address("tx-1"), editor);
            const accepted = controller.beginActivation({ entry, target: address("tx-1") });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");

            expect(
                controller.dispatchCellIntent(
                    address("tx-1"),
                    { direction: "down", kind: "commit-and-move", preserveEntry: entry },
                    1
                )
            ).toEqual({ ok: true, value: { kind: "handled" } });

            expect(controller.getPendingRequest()).toBeNull();
            expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
            expect(controller.getSnapshot().editor).toBeNull();
            expect(document.activeElement).toBe(gridcell);
            gridcell.remove();
            editor.remove();
        }
    );

    it.each(EDIT_ENTRIES)(
        "retains %s continuous editing until the exact offscreen editor registers",
        (entry) => {
            const controller = createController();
            const columns = ["description", "amount"] satisfies readonly TransactionColumnId[];
            controller.updateProjection(cursorFor([transaction("tx-1")]), columns);
            const sourceEditor = document.createElement("input");
            document.body.append(sourceEditor);
            controller.registerEditor(address("tx-1"), sourceEditor);
            const accepted = controller.beginActivation({ entry, target: address("tx-1") });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");

            expect(
                controller.dispatchCellIntent(
                    address("tx-1"),
                    { direction: "right", kind: "commit-and-move", preserveEntry: entry },
                    1
                )
            ).toEqual({ ok: true, value: { kind: "handled" } });
            const pending = controller.getPendingRequest();
            if (pending == null) throw new Error("offscreen destination was not pending");
            const identity = {
                acceptedCommandId: pending.state.acceptedCommandId,
                projectionGeneration: pending.state.projectionGeneration
            };
            expect(controller.markRevealApplied(identity)).toBe(true);
            expect(controller.focusPendingActivation(identity)).toBe("unregistered");

            const registrationVersion = controller.getSnapshot().registrationVersion;
            const unrelatedEditor = document.createElement("input");
            document.body.append(unrelatedEditor);
            controller.registerEditor(address("tx-1", "date"), unrelatedEditor);
            expect(controller.getSnapshot().registrationVersion).toBe(registrationVersion);
            expect(controller.focusPendingActivation(identity)).toBe("unregistered");

            const destinationEditor = document.createElement("input");
            document.body.append(destinationEditor);
            controller.registerEditor(address("tx-1", "amount"), destinationEditor);
            expect(controller.getSnapshot().registrationVersion).toBe(registrationVersion + 1);
            expect(controller.focusPendingActivation(identity)).toBe("focused");
            expect(document.activeElement).toBe(destinationEditor);
            expect(controller.getInteractionState()).toMatchObject({
                editor: { continuous: { entry, kind: "continue" }, entry },
                kind: "editing"
            });
            sourceEditor.remove();
            unrelatedEditor.remove();
            destinationEditor.remove();
        }
    );

    it.each(EDIT_ENTRIES)(
        "carries %s continuous editing through checkbox and actions destinations",
        (entry) => {
            for (const activationColumn of ACTIVATION_ONLY_COLUMNS) {
                const controller = createController();
                const columns = [
                    "description",
                    activationColumn,
                    "amount"
                ] satisfies readonly TransactionColumnId[];
                controller.updateProjection(cursorFor([transaction("tx-1")]), columns);
                const sourceEditor = document.createElement("input");
                const activationCell = document.createElement("button");
                const destinationEditor = document.createElement("input");
                const activation = vi.fn();
                activationCell.tabIndex = -1;
                activationCell.addEventListener("click", activation);
                document.body.append(sourceEditor, activationCell, destinationEditor);
                controller.registerEditor(address("tx-1"), sourceEditor);
                controller.registerCell(address("tx-1", activationColumn), activationCell);
                controller.registerEditor(address("tx-1", "amount"), destinationEditor);
                const accepted = controller.beginActivation({ entry, target: address("tx-1") });
                expect(controller.markRevealApplied(accepted)).toBe(true);
                expect(controller.focusPendingActivation(accepted)).toBe("focused");

                expect(
                    controller.dispatchCellIntent(
                        address("tx-1"),
                        { direction: "right", kind: "commit-and-move", preserveEntry: entry },
                        1
                    )
                ).toEqual({ ok: true, value: { kind: "handled" } });
                expect(document.activeElement).toBe(activationCell);
                expect(activation).not.toHaveBeenCalled();
                expect(controller.getInteractionState()).toMatchObject({
                    continuous: { entry, kind: "continue" },
                    kind: "navigating"
                });

                expect(
                    controller.dispatchCellIntent(
                        address("tx-1", activationColumn),
                        { direction: "right", kind: "move" },
                        1
                    )
                ).toEqual({ ok: true, value: { kind: "handled" } });
                const pending = controller.getPendingRequest();
                if (pending == null) throw new Error("resumed destination was not pending");
                const identity = {
                    acceptedCommandId: pending.state.acceptedCommandId,
                    projectionGeneration: pending.state.projectionGeneration
                };
                expect(pending).toMatchObject({
                    continuous: { entry, kind: "continue" },
                    entry,
                    kind: "edit",
                    state: { target: address("tx-1", "amount") }
                });
                expect(controller.markRevealApplied(identity)).toBe(true);
                expect(controller.focusPendingActivation(identity)).toBe("focused");
                expect(document.activeElement).toBe(destinationEditor);
                expect(controller.getInteractionState()).toMatchObject({
                    editor: { continuous: { entry, kind: "continue" }, entry },
                    kind: "editing"
                });
                sourceEditor.remove();
                activationCell.remove();
                destinationEditor.remove();
            }
        }
    );

    it("restores canonical gridcell focus after an editor blur releases focus to body", async () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const gridcell = document.createElement("div");
        const editor = document.createElement("input");
        gridcell.tabIndex = -1;
        document.body.append(gridcell, editor);
        controller.registerCell(address("tx-1"), gridcell);
        controller.registerEditor(address("tx-1"), editor);
        const accepted = controller.beginActivation({ entry: "full", target: address("tx-1") });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        editor.blur();
        expect(document.activeElement).toBe(document.body);
        expect(controller.finishEditing(address("tx-1"))).toBe(true);
        await Promise.resolve();

        expect(document.activeElement).toBe(gridcell);
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        gridcell.remove();
        editor.remove();
    });

    it.each(OWNED_POPUP_FIXTURES)(
        "restores the $label editor after its owned portal unmounts",
        async ({ columnId, popup }) => {
            const controller = createController();
            controller.updateProjection(cursorFor([transaction("tx-1")]), [columnId]);
            const editor = document.createElement("button");
            const portal = document.createElement("div");
            const portalControl = document.createElement("button");
            const target = { columnId, transactionId: asTransactionId("tx-1") };
            portal.dataset.ownedByRow = "tx-1";
            portal.dataset.ownedByField = columnId;
            portal.append(portalControl);
            document.body.append(editor, portal);
            controller.registerEditor(target, editor);
            const accepted = controller.beginActivation({ entry: "full", target });
            expect(controller.markRevealApplied(accepted)).toBe(true);
            expect(controller.focusPendingActivation(accepted)).toBe("focused");
            expect(controller.setEditorInteraction(target, popup, true)).toBe(true);
            portalControl.focus();

            expect(controller.getInteractionState()).toMatchObject({
                kind: "interacting",
                owner: "grid-editor",
                popup
            });
            portal.remove();
            expect(document.activeElement).toBe(document.body);
            expect(controller.setEditorInteraction(target, popup, false)).toBe(true);
            await Promise.resolve();

            expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
            expect(document.activeElement).toBe(editor);
            editor.remove();
        }
    );

    it("does not let a stale popup-return microtask steal focus from a newer destination", async () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const editor = document.createElement("input");
        const portalControl = document.createElement("button");
        const target = address("tx-1", "date");
        document.body.append(editor, portalControl);
        controller.registerEditor(target, editor);
        const accepted = controller.beginActivation({ entry: "full", target });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        expect(controller.setEditorInteraction(target, "calendar", true)).toBe(true);
        portalControl.focus();
        portalControl.remove();

        expect(controller.setEditorInteraction(target, "calendar", false)).toBe(true);
        controller.setFocusedCell("tx-1", "amount");
        await Promise.resolve();

        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(controller.getSnapshot().activeTransactionId).toBe("tx-1");
        expect(document.activeElement).toBe(document.body);
        editor.remove();
    });

    it("switches popup layers without accepting a stale close from the previous layer", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const editor = document.createElement("input");
        const target = address("tx-1");
        document.body.append(editor);
        controller.registerEditor(target, editor);
        const accepted = controller.beginActivation({ entry: "full", target });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        expect(controller.setEditorInteraction(target, "listbox", true)).toBe(true);
        expect(controller.setEditorInteraction(target, "modal", true)).toBe(true);
        expect(controller.setEditorInteraction(target, "listbox", false)).toBe(false);
        expect(controller.getInteractionState()).toMatchObject({
            kind: "interacting",
            popup: "modal"
        });
        expect(controller.setEditorInteraction(target, "modal", false)).toBe(true);
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        editor.remove();
    });

    it("cancels controller editing back to visible canonical navigation", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1")]), COLUMNS);
        const editor = document.createElement("input");
        document.body.append(editor);
        controller.registerEditor(address("tx-1"), editor);
        const accepted = controller.beginActivation({ entry: "full", target: address("tx-1") });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");

        expect(controller.dispatchCellIntent(address("tx-1"), { kind: "cancel-edit" }, 1)).toEqual({
            ok: true,
            value: { kind: "handled" }
        });

        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(controller.getSnapshot().editor).toBeNull();
        editor.remove();
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
        const focusOrder: string[] = [];
        replacement.cell.scrollIntoView = () => focusOrder.push("reveal");
        replacement.cell.addEventListener("focus", () => focusOrder.push("focus"));
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
        expect(document.activeElement).toBe(replacement.cell);
        expect(focusOrder).toEqual(["reveal", "focus"]);
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
        expect(document.activeElement).toBe(replacement.cell);
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

    it("keeps Add Presence silent through exact editor focus and releases it only on gesture or exit", () => {
        const controller = createController();
        const target = descriptionAddress("tx-added");
        controller.updateProjection(
            cursorFor([transaction("tx-origin"), transaction("tx-added")]),
            COLUMNS
        );
        controller.setFocusedCell("tx-origin", "description");
        const accepted = controller.beginActivation({
            entry: "full",
            presence: "defer-add-until-editor-gesture",
            target
        });

        expect(controller.getSnapshot().deferredPresence).toEqual({
            address: target,
            kind: "add-description-editor-gesture"
        });
        expect(controller.getInteractionState()).toMatchObject({
            kind: "pending-activation",
            target
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        const editor = document.createElement("input");
        document.body.append(editor);
        controller.registerEditor(target, editor);

        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        expect(document.activeElement).toBe(editor);
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        expect(controller.getSnapshot().deferredPresence).toEqual({
            address: target,
            kind: "add-description-editor-gesture"
        });

        controller.acknowledgeEditorGesture(descriptionAddress("tx-origin"));
        expect(controller.getSnapshot().deferredPresence).not.toBeNull();
        controller.acknowledgeEditorGesture(target);
        expect(controller.getSnapshot().deferredPresence).toBeNull();

        const exitAccepted = controller.beginActivation({
            entry: "full",
            presence: "defer-add-until-editor-gesture",
            target
        });
        expect(controller.markRevealApplied(exitAccepted)).toBe(true);
        expect(controller.focusPendingActivation(exitAccepted)).toBe("focused");
        expect(controller.getSnapshot().deferredPresence).not.toBeNull();
        expect(controller.finishEditing(target)).toBe(true);
        expect(controller.getSnapshot().deferredPresence).toBeNull();
        editor.remove();
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

    it("atomically restores same-generation navigation resources when gridcell focus fails", () => {
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

        controller.dispatchCellIntent(
            address("tx-1"),
            {
                direction: "down",
                kind: "move"
            },
            1
        );
        const pending = controller.getPendingRequest();
        if (pending == null) throw new Error("navigation request was not retained");
        const accepted = {
            acceptedCommandId: pending.state.acceptedCommandId,
            projectionGeneration: pending.state.projectionGeneration
        };
        scrollElement.scrollLeft = 80;
        scrollElement.scrollTop = 900;
        heldWindowStart = 800;
        expect(controller.markRevealApplied(accepted)).toBe(true);
        controller.registerCell(address("tx-2"), document.createElement("div"));

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

    it("aborts when synchronous target focus redirects and unmounts before fulfillment", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-1"), transaction("tx-2")]), COLUMNS);
        controller.setFocusedCell("tx-1", "description");
        const origin = document.createElement("button");
        const external = document.createElement("input");
        const target = document.createElement("input");
        const scrollElement = document.createElement("div");
        document.body.append(origin, external, target, scrollElement);
        origin.focus();
        scrollElement.scrollTop = 120;
        controller.registerScrollElement(scrollElement);
        let heldWindowStart = 200;
        controller.setHeldWindowState(heldWindowStart, (start) => {
            heldWindowStart = start;
        });
        controller.registerEditor(address("tx-2"), target);
        const accepted = controller.beginActivation({ entry: "full", target: address("tx-2") });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        scrollElement.scrollTop = 900;
        heldWindowStart = 700;
        target.addEventListener(
            "focus",
            () => {
                target.remove();
                external.focus();
            },
            { once: true }
        );

        expect(controller.focusPendingActivation(accepted)).toBe("stale");

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-2"),
            kind: "focus-failed"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        expect(document.activeElement).toBe(origin);
        expect(scrollElement.scrollTop).toBe(120);
        expect(heldWindowStart).toBe(200);
        origin.remove();
        external.remove();
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

    it("focuses the latest exact editor replacement through duplicate child and ancestor ownership", () => {
        const controller = createController();
        const cursor = cursorFor([transaction("tx-target")]);
        const targetAddress = address("tx-target");
        const firstEditor = document.createElement("input");
        const replacementEditor = document.createElement("input");
        const firstFocus = vi.spyOn(firstEditor, "focus");
        const replacementFocus = vi.spyOn(replacementEditor, "focus");
        document.body.append(firstEditor, replacementEditor);
        controller.updateProjection(cursor, COLUMNS);
        const unregisterFirst = controller.registerEditor(targetAddress, firstEditor);
        const accepted = controller.beginActivation({ entry: "full", target: targetAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot().registrationVersion;

        const unregisterChild = controller.registerEditor(targetAddress, replacementEditor);
        const unregisterAncestor = controller.registerEditor(targetAddress, replacementEditor);
        unregisterFirst();
        unregisterChild();

        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        const hook = renderHook(() =>
            useTransactionGridController({ controller, cursor, selectableColumnIds: COLUMNS })
        );

        expect(firstFocus).not.toHaveBeenCalled();
        expect(replacementFocus).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(replacementEditor);
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        unregisterAncestor();
        unsubscribe();
        hook.unmount();
        firstEditor.remove();
        replacementEditor.remove();
    });

    it("keeps unrelated and unregister churn out of a pending focus subscription", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-target")]), COLUMNS);
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-target")
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot().registrationVersion;
        const cell = document.createElement("div");
        const editor = document.createElement("input");
        const row = document.createElement("div");
        const afterGrid = document.createElement("button");

        const unregisterUnrelatedCell = controller.registerCell(address("tx-unrelated"), cell);
        controller.registerEditor(address("tx-unrelated"), editor);
        controller.registerRow(asTransactionId("tx-unrelated"), row);
        controller.registerAfterGridElement(afterGrid);
        unregisterUnrelatedCell();
        controller.registerEditor(address("tx-unrelated"), null);
        controller.registerRow(asTransactionId("tx-unrelated"), null);
        controller.registerAfterGridElement(null);
        controller.registerEditor(address("tx-target"), null);
        controller.registerRow(asTransactionId("tx-target"), null);

        expect(controller.getSnapshot().registrationVersion).toBe(before);
        expect(listener).not.toHaveBeenCalled();
        unsubscribe();
    });

    it("notifies a pending exact target once across editor cell and row registration churn", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-target")]), COLUMNS);
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-target")
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot().registrationVersion;
        const firstEditor = document.createElement("input");
        const replacementEditor = document.createElement("input");
        const legacyCell = document.createElement("input");
        const row = document.createElement("div");
        document.body.append(firstEditor, replacementEditor, legacyCell, row);

        controller.registerEditor(address("tx-target"), firstEditor);
        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);

        controller.registerEditor(address("tx-target"), null);
        controller.registerEditor(address("tx-target"), replacementEditor);
        controller.registerCell(address("tx-target"), legacyCell);
        controller.registerRow(asTransactionId("tx-target"), row);

        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
        firstEditor.remove();
        replacementEditor.remove();
        legacyCell.remove();
        row.remove();
    });

    it("releases a pending editor wake after a transient registration disappears before consume", () => {
        const controller = createController();
        const cursor = cursorFor([transaction("tx-target")]);
        const targetAddress = address("tx-target");
        controller.updateProjection(cursor, COLUMNS);
        const accepted = controller.beginActivation({ entry: "full", target: targetAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        const focusPendingActivation = vi.spyOn(controller, "focusPendingActivation");
        const hook = renderHook(() =>
            useTransactionGridController({ controller, cursor, selectableColumnIds: COLUMNS })
        );
        expect(focusPendingActivation).toHaveReturnedWith("unregistered");
        focusPendingActivation.mockClear();
        const before = controller.getSnapshot().registrationVersion;
        const observedWakes: number[] = [];
        let observedRegistrationVersion = before;
        const unsubscribe = controller.subscribe(() => {
            const nextRegistrationVersion = controller.getSnapshot().registrationVersion;
            if (nextRegistrationVersion === observedRegistrationVersion) return;
            observedRegistrationVersion = nextRegistrationVersion;
            observedWakes.push(nextRegistrationVersion);
        });
        const transientEditor = document.createElement("input");
        const replacementEditor = document.createElement("input");
        const replacementFocus = vi.spyOn(replacementEditor, "focus");
        document.body.append(transientEditor, replacementEditor);
        let unregisterTransient: (() => void) | null = null;

        act(() => {
            unregisterTransient = controller.registerEditor(targetAddress, transientEditor);
            unregisterTransient();
        });

        expect(focusPendingActivation).toHaveReturnedWith("unregistered");
        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(observedWakes).toEqual([before + 1]);
        focusPendingActivation.mockClear();
        const unregisterReplacement = { current: () => {} };
        act(() => {
            const unregisterChild = controller.registerEditor(targetAddress, replacementEditor);
            unregisterReplacement.current = controller.registerEditor(
                targetAddress,
                replacementEditor
            );
            unregisterTransient?.();
            unregisterChild();
        });

        expect(focusPendingActivation).toHaveReturnedWith("focused");
        expect(controller.getSnapshot().registrationVersion).toBe(before + 2);
        expect(observedWakes).toEqual([before + 1, before + 2]);
        expect(replacementFocus).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(replacementEditor);
        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "editing" });
        unregisterReplacement.current();
        unsubscribe();
        hook.unmount();
        transientEditor.remove();
        replacementEditor.remove();
    });

    it("reveals then focuses the latest exact cell replacement after reconciliation authority", () => {
        const controller = createController();
        const initialCursor = cursorFor([transaction("tx-a"), transaction("tx-c")]);
        const reconciledCursor = cursorFor([transaction("tx-c")]);
        const origin = document.createElement("div");
        const firstTarget = document.createElement("div");
        const replacementTarget = document.createElement("div");
        const focusOrder: string[] = [];
        origin.tabIndex = -1;
        firstTarget.tabIndex = -1;
        replacementTarget.tabIndex = -1;
        replacementTarget.scrollIntoView = () => focusOrder.push("reveal");
        replacementTarget.addEventListener("focus", () => focusOrder.push("focus"));
        document.body.append(origin, firstTarget, replacementTarget);
        controller.updateProjection(initialCursor, COLUMNS);
        const unregisterOrigin = controller.registerCell(address("tx-a"), origin);
        const unregisterFirstTarget = controller.registerCell(address("tx-c"), firstTarget);
        controller.setFocusedCell("tx-a", "description");
        origin.focus();

        controller.updateProjection(reconciledCursor, COLUMNS);

        const generation = controller.getSnapshot().generation;
        expect(controller.getSnapshot().reconciliationFocus).toMatchObject({
            generation,
            intent: { address: address("tx-c"), kind: "gridcell" },
            revealBeforeFocus: true
        });
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot().registrationVersion;
        const unregisterReplacement = controller.registerCell(address("tx-c"), replacementTarget);
        unregisterFirstTarget();

        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        origin.remove();
        const hook = renderHook(() =>
            useTransactionGridController({
                controller,
                cursor: reconciledCursor,
                selectableColumnIds: COLUMNS
            })
        );

        expect(focusOrder).toEqual(["reveal", "focus"]);
        expect(document.activeElement).toBe(replacementTarget);
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();
        unregisterOrigin();
        unregisterReplacement();
        unsubscribe();
        hook.unmount();
        firstTarget.remove();
        replacementTarget.remove();
    });

    it("wakes an exact reconciliation target once and preserves row fallback focus", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-a"), transaction("tx-c")]), COLUMNS);
        controller.setFocusedCell("tx-a", "description");

        controller.updateProjection(cursorFor([transaction("tx-c")]), COLUMNS);

        const generation = controller.getSnapshot().generation;
        expect(controller.getSnapshot().reconciliationFocus).toMatchObject({
            generation,
            intent: { address: address("tx-c"), kind: "gridcell" }
        });
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot().registrationVersion;
        const row = document.createElement("div");
        const cell = document.createElement("div");
        cell.dataset.cell = "description";
        cell.setAttribute("role", "gridcell");
        cell.tabIndex = -1;
        row.append(cell);
        document.body.append(row);

        controller.registerRow(asTransactionId("tx-c"), row);
        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        const unregisterCell = controller.registerCell(address("tx-c"), cell);
        unregisterCell();
        controller.registerRow(asTransactionId("tx-c"), null);
        controller.registerRow(asTransactionId("tx-c"), row);
        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);

        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(cell);
        unsubscribe();
        row.remove();
    });

    it("releases a reconciliation cell wake after a transient registration disappears before consume", () => {
        const controller = createController();
        const initialCursor = cursorFor([transaction("tx-a"), transaction("tx-c")]);
        const reconciledCursor = cursorFor([transaction("tx-c")]);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-a", "description");
        const focusReconciliation = vi.spyOn(controller, "focusReconciliation");
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );

        act(() => hook.rerender({ cursor: reconciledCursor }));

        const generation = controller.getSnapshot().generation;
        expect(controller.getSnapshot().reconciliationFocus).toMatchObject({
            generation,
            intent: { address: address("tx-c"), kind: "gridcell" }
        });
        expect(focusReconciliation).toHaveReturnedWith("unregistered");
        focusReconciliation.mockClear();
        const before = controller.getSnapshot().registrationVersion;
        const observedWakes: number[] = [];
        let observedRegistrationVersion = before;
        const unsubscribe = controller.subscribe(() => {
            const nextRegistrationVersion = controller.getSnapshot().registrationVersion;
            if (nextRegistrationVersion === observedRegistrationVersion) return;
            observedRegistrationVersion = nextRegistrationVersion;
            observedWakes.push(nextRegistrationVersion);
        });
        const transientCell = document.createElement("div");
        const replacementCell = document.createElement("div");
        const reveal = vi.fn();
        const replacementFocus = vi.spyOn(replacementCell, "focus");
        transientCell.tabIndex = -1;
        replacementCell.tabIndex = -1;
        replacementCell.scrollIntoView = reveal;
        document.body.append(transientCell, replacementCell);
        let unregisterTransient: (() => void) | null = null;

        act(() => {
            unregisterTransient = controller.registerCell(address("tx-c"), transientCell);
            unregisterTransient();
        });

        expect(focusReconciliation).toHaveReturnedWith("unregistered");
        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(observedWakes).toEqual([before + 1]);
        focusReconciliation.mockClear();
        const unregisterReplacement = { current: () => {} };
        act(() => {
            const unregisterChild = controller.registerCell(address("tx-c"), replacementCell);
            unregisterReplacement.current = controller.registerCell(
                address("tx-c"),
                replacementCell
            );
            unregisterTransient?.();
            unregisterChild();
        });

        expect(focusReconciliation).toHaveReturnedWith("focused");
        expect(controller.getSnapshot().registrationVersion).toBe(before + 2);
        expect(observedWakes).toEqual([before + 1, before + 2]);
        expect(reveal).toHaveBeenCalledWith({ block: "center", inline: "nearest" });
        expect(replacementFocus).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(replacementCell);
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();
        unregisterReplacement.current();
        unsubscribe();
        hook.unmount();
        transientCell.remove();
        replacementCell.remove();
    });

    it("notifies only an after-grid reconciliation registration and only once", () => {
        const controller = createController();
        controller.updateProjection(cursorFor([transaction("tx-a")]), COLUMNS);
        controller.setFocusedCell("tx-a", "description");

        controller.updateProjection(cursorFor([]), COLUMNS);

        const generation = controller.getSnapshot().generation;
        expect(controller.getSnapshot().reconciliationFocus).toMatchObject({
            generation,
            intent: { kind: "after-grid" }
        });
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot().registrationVersion;
        const unrelatedCell = document.createElement("div");
        const unrelatedRow = document.createElement("div");
        const firstAfterGrid = document.createElement("button");
        const replacementAfterGrid = document.createElement("button");
        document.body.append(unrelatedCell, unrelatedRow, firstAfterGrid, replacementAfterGrid);

        controller.registerCell(address("tx-unrelated"), unrelatedCell);
        controller.registerRow(asTransactionId("tx-unrelated"), unrelatedRow);
        expect(controller.getSnapshot().registrationVersion).toBe(before);
        expect(listener).not.toHaveBeenCalled();

        controller.registerAfterGridElement(firstAfterGrid);
        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);
        controller.registerAfterGridElement(null);
        controller.registerAfterGridElement(replacementAfterGrid);
        expect(controller.getSnapshot().registrationVersion).toBe(before + 1);
        expect(listener).toHaveBeenCalledTimes(1);

        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(replacementAfterGrid);
        unsubscribe();
        unrelatedCell.remove();
        unrelatedRow.remove();
        firstAfterGrid.remove();
        replacementAfterGrid.remove();
    });

    it("times out an absent reveal target and restores resources without manual phase advance", () => {
        vi.useFakeTimers();
        const controller = createController(25);
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

    it("keeps one materialization deadline across absent reveal-target rebases", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
        const controller = createController(25);
        const initialCursor = cursorFor([transaction("tx-1")]);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-1", "description");
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => {
            controller.beginActivation({
                entry: "full",
                target: address("tx-absent")
            });
        });
        const acceptedAt = controller.getPendingRequest()?.acceptedAt;
        expect(acceptedAt).toBe(Date.now());

        act(() => vi.advanceTimersByTime(10));
        hook.rerender({
            cursor: cursorFor([transaction("tx-1"), transaction("tx-2")])
        });
        expect(controller.getPendingRequest()).toMatchObject({
            acceptedAt,
            state: {
                phase: "reveal",
                target: address("tx-absent")
            }
        });

        act(() => vi.advanceTimersByTime(10));
        hook.rerender({
            cursor: cursorFor([transaction("tx-1"), transaction("tx-2"), transaction("tx-3")])
        });
        expect(controller.getPendingRequest()?.acceptedAt).toBe(acceptedAt);

        act(() => vi.advanceTimersByTime(4));
        expect(controller.getPendingRequest()).not.toBeNull();
        act(() => vi.advanceTimersByTime(1));

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-absent"),
            kind: "load-failed"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "active-origin", transactionId: "tx-1" }
        ]);
        hook.unmount();
        vi.useRealTimers();
    });

    it("rejects callback-first materialization at the immutable absolute deadline", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
        const controller = createController(25);
        const initialCursor = cursorFor([transaction("tx-1")]);
        const target = document.createElement("input");
        const focusTarget = vi.spyOn(target, "focus");
        document.body.append(target);
        controller.updateProjection(initialCursor, COLUMNS);
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => {
            controller.beginActivation({ entry: "full", target: address("tx-late") });
        });

        vi.setSystemTime(new Date("2026-08-25T12:00:00.025Z"));
        hook.rerender({ cursor: cursorFor([transaction("tx-1"), transaction("tx-late")]) });
        const rebased = controller.getPendingRequest();
        if (rebased == null) throw new Error("late reveal request was not retained");
        const identity = {
            acceptedCommandId: rebased.state.acceptedCommandId,
            projectionGeneration: rebased.state.projectionGeneration
        };
        controller.registerEditor(address("tx-late"), target);

        act(() => {
            expect(controller.markRevealApplied(identity)).toBe(false);
        });

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-late"),
            kind: "load-failed"
        });
        expect(focusTarget).not.toHaveBeenCalled();
        hook.unmount();
        target.remove();
        vi.useRealTimers();
    });

    it("admits materialization just before the absolute deadline", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
        const controller = createController(25);
        const initialCursor = cursorFor([transaction("tx-1")]);
        controller.updateProjection(initialCursor, COLUMNS);
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => {
            controller.beginActivation({ entry: "full", target: address("tx-current") });
        });

        vi.setSystemTime(new Date("2026-08-25T12:00:00.024Z"));
        hook.rerender({ cursor: cursorFor([transaction("tx-1"), transaction("tx-current")]) });
        const rebased = controller.getPendingRequest();
        if (rebased == null) throw new Error("current reveal request was not retained");
        const identity = {
            acceptedCommandId: rebased.state.acceptedCommandId,
            projectionGeneration: rebased.state.projectionGeneration
        };
        const target = document.createElement("input");
        document.body.append(target);
        act(() => controller.registerEditor(address("tx-current"), target));

        act(() => {
            expect(controller.markRevealApplied(identity)).toBe(true);
        });

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toBeNull();
        expect(document.activeElement).toBe(target);
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-current"
        });
        hook.unmount();
        target.remove();
        vi.useRealTimers();
    });

    it("focuses the latest reconciled grid origin only after a rebased reveal times out", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
        const controller = createController(25);
        const initialCursor = cursorFor([transaction("tx-a")]);
        const origin = document.createElement("div");
        const replacement = document.createElement("div");
        const focusOrder: string[] = [];
        origin.tabIndex = -1;
        replacement.tabIndex = -1;
        replacement.scrollIntoView = () => focusOrder.push("reveal");
        replacement.addEventListener("focus", () => focusOrder.push("focus"));
        document.body.append(origin, replacement);
        controller.registerCell(address("tx-a"), origin);
        controller.registerCell(address("tx-c"), replacement);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-a", "description");
        origin.focus();
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => {
            controller.beginActivation({ entry: "full", target: address("tx-x") });
        });

        origin.remove();
        act(() => vi.advanceTimersByTime(10));
        hook.rerender({ cursor: cursorFor([transaction("tx-c")]) });
        expect(controller.getPendingRequest()).toMatchObject({
            abortFallbackFocus: {
                generation: controller.getSnapshot().generation,
                intent: { address: address("tx-c"), kind: "gridcell" }
            },
            state: { phase: "reveal", target: address("tx-x") }
        });
        expect(controller.cellSelectionAtom.get()).toEqual([]);
        expect(document.activeElement).not.toBe(replacement);
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();

        act(() => vi.advanceTimersByTime(15));

        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-x"),
            kind: "load-failed"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-c"
        });
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "active-origin", transactionId: "tx-c" }
        ]);
        expect(document.activeElement).toBe(replacement);
        expect(focusOrder).toEqual(["reveal", "focus"]);
        hook.unmount();
        replacement.remove();
        vi.useRealTimers();
    });

    it("does not steal focus from an external target after rebased target focus fails", () => {
        const controller = createController();
        const initialCursor = cursorFor([transaction("tx-a")]);
        const origin = document.createElement("div");
        const replacement = document.createElement("div");
        const redirected = document.createElement("input");
        origin.tabIndex = -1;
        replacement.tabIndex = -1;
        document.body.append(origin, replacement, redirected);
        controller.registerCell(address("tx-a"), origin);
        controller.registerCell(address("tx-c"), replacement);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-a", "description");
        origin.focus();
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => {
            controller.beginActivation({ entry: "full", target: address("tx-x") });
        });

        origin.remove();
        hook.rerender({ cursor: cursorFor([transaction("tx-c"), transaction("tx-x")]) });
        const rebased = controller.getPendingRequest();
        if (rebased == null) throw new Error("rebased focus request was not retained");
        const identity = {
            acceptedCommandId: rebased.state.acceptedCommandId,
            projectionGeneration: rebased.state.projectionGeneration
        };
        expect(document.activeElement).not.toBe(replacement);
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();
        act(() => {
            expect(controller.markRevealApplied(identity)).toBe(true);
        });
        const target = document.createElement("input");
        document.body.append(target);
        target.addEventListener(
            "focus",
            () => {
                target.remove();
                redirected.focus();
            },
            { once: true }
        );

        act(() => controller.registerEditor(address("tx-x"), target));

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toBeNull();
        expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-c"
        });
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();
        expect(document.activeElement).toBe(redirected);
        hook.unmount();
        replacement.remove();
        redirected.remove();
    });

    it.each(["external", "header", "wrong-row-portal", "wrong-field-portal"] as const)(
        "retires a delayed fallback when a %s control owns focus before registration",
        (focusOwnerKind) => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
            const controller = createController(25);
            const initialCursor = cursorFor([transaction("tx-a")]);
            const origin = document.createElement("div");
            const replacement = document.createElement("div");
            const focusOwner = document.createElement("button");
            const focusContainer = document.createElement("div");
            const reveal = vi.fn();
            origin.tabIndex = -1;
            replacement.tabIndex = -1;
            replacement.scrollIntoView = reveal;
            if (focusOwnerKind === "header") focusContainer.setAttribute("role", "columnheader");
            if (focusOwnerKind === "wrong-row-portal") {
                focusContainer.dataset.ownedByRow = "tx-other";
                focusContainer.dataset.ownedByField = "description";
            }
            if (focusOwnerKind === "wrong-field-portal") {
                focusContainer.dataset.ownedByRow = "tx-c";
                focusContainer.dataset.ownedByField = "amount";
            }
            focusContainer.append(focusOwner);
            document.body.append(origin, replacement, focusContainer);
            controller.registerCell(address("tx-a"), origin);
            controller.updateProjection(initialCursor, COLUMNS);
            controller.setFocusedCell("tx-a", "description");
            origin.focus();
            const hook = renderHook(
                ({ cursor }) =>
                    useTransactionGridController({
                        controller,
                        cursor,
                        selectableColumnIds: COLUMNS
                    }),
                { initialProps: { cursor: initialCursor } }
            );
            act(() => {
                controller.beginActivation({ entry: "full", target: address("tx-x") });
            });

            origin.remove();
            hook.rerender({ cursor: cursorFor([transaction("tx-c")]) });
            act(() => vi.advanceTimersByTime(25));
            expect(controller.getSnapshot().reconciliationFocus).toMatchObject({
                intent: { address: address("tx-c"), kind: "gridcell" },
                revealBeforeFocus: true
            });

            focusOwner.focus();
            act(() => controller.registerCell(address("tx-c"), replacement));

            expect(document.activeElement).toBe(focusOwner);
            expect(reveal).not.toHaveBeenCalled();
            expect(controller.getSnapshot().reconciliationFocus).toBeNull();
            expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
            expect(controller.cellSelectionAtom.get()[0]).toMatchObject({ anchorRowId: "tx-c" });
            hook.unmount();
            replacement.remove();
            focusContainer.remove();
            vi.useRealTimers();
        }
    );

    it("retires BODY-owned delayed focus before a replacement can register", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
        const controller = createController(25);
        const initialCursor = cursorFor([transaction("tx-a")]);
        const origin = document.createElement("div");
        const replacement = document.createElement("div");
        const reveal = vi.fn();
        origin.tabIndex = -1;
        replacement.tabIndex = -1;
        replacement.scrollIntoView = reveal;
        document.body.append(origin, replacement);
        controller.registerCell(address("tx-a"), origin);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-a", "description");
        origin.focus();
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => {
            controller.beginActivation({ entry: "full", target: address("tx-x") });
        });

        origin.remove();
        hook.rerender({ cursor: cursorFor([transaction("tx-c")]) });
        act(() => vi.advanceTimersByTime(25));
        expect(document.activeElement).toBe(document.body);
        expect(controller.getSnapshot().reconciliationFocus).not.toBeNull();

        act(() => controller.retireDelayedFocus());
        act(() => controller.registerCell(address("tx-c"), replacement));

        expect(document.activeElement).toBe(document.body);
        expect(reveal).not.toHaveBeenCalled();
        expect(controller.getSnapshot().reconciliationFocus).toBeNull();
        hook.unmount();
        replacement.remove();
        vi.useRealTimers();
    });

    it("retains an after-grid abort fallback across empty reveal rebases", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
        const controller = createController(25);
        const initialCursor = cursorFor([transaction("tx-a")]);
        const origin = document.createElement("div");
        const afterGrid = document.createElement("button");
        origin.tabIndex = -1;
        document.body.append(origin, afterGrid);
        controller.registerCell(address("tx-a"), origin);
        controller.registerAfterGridElement(afterGrid);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-a", "description");
        origin.focus();
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );
        act(() => {
            controller.beginActivation({ entry: "full", target: address("tx-x") });
        });

        hook.rerender({ cursor: cursorFor([]) });
        expect(controller.getPendingRequest()).toMatchObject({
            abortFallbackFocus: {
                intent: { kind: "after-grid" },
                revealBeforeFocus: false
            },
            state: { origin: { kind: "neutral" }, phase: "reveal" }
        });
        hook.rerender({ cursor: cursorFor([transaction("tx-c")]) });
        expect(controller.getPendingRequest()?.abortFallbackFocus?.intent).toEqual({
            kind: "after-grid"
        });

        act(() => vi.advanceTimersByTime(25));

        expect(controller.getInteractionState()).toEqual({ kind: "idle", selection: [] });
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-x"),
            kind: "load-failed"
        });
        expect(document.activeElement).toBe(afterGrid);
        hook.unmount();
        origin.remove();
        afterGrid.remove();
        vi.useRealTimers();
    });

    it("consumes a retained after-grid fallback on terminal pending invalidation", () => {
        const controller = createController();
        const initialCursor = cursorFor([transaction("tx-a")]);
        const origin = document.createElement("div");
        const afterGrid = document.createElement("button");
        origin.tabIndex = -1;
        document.body.append(origin, afterGrid);
        controller.registerCell(address("tx-a"), origin);
        controller.registerAfterGridElement(afterGrid);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-a", "description");
        origin.focus();
        controller.beginActivation({ entry: "full", target: address("tx-x") });

        controller.updateProjection(cursorFor([]), COLUMNS);
        expect(controller.getPendingRequest()?.abortFallbackFocus?.intent).toEqual({
            kind: "after-grid"
        });
        const terminalColumns: readonly TransactionColumnId[] = ["date", "amount"];
        controller.updateProjection(cursorFor([]), terminalColumns);

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getInteractionState()).toEqual({ kind: "idle", selection: [] });
        expect(controller.focusReconciliation(controller.getSnapshot().generation)).toBe("focused");
        expect(document.activeElement).toBe(afterGrid);
        origin.remove();
        afterGrid.remove();
    });

    it.each(["neutral", "parked"] as const)(
        "does not steal focus for a %s origin after a newer-generation timeout",
        (originKind) => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
            const controller = createController(25);
            const initialCursor = cursorFor([transaction("tx-a")]);
            const external = document.createElement("button");
            const replacement = document.createElement("div");
            replacement.tabIndex = -1;
            document.body.append(external, replacement);
            controller.registerCell(address("tx-c"), replacement);
            controller.updateProjection(initialCursor, COLUMNS);
            if (originKind === "parked") {
                controller.setFocusedCell("tx-a", "description");
                controller.parkExternalFocus();
            }
            external.focus();
            const hook = renderHook(
                ({ cursor }) =>
                    useTransactionGridController({
                        controller,
                        cursor,
                        selectableColumnIds: COLUMNS
                    }),
                { initialProps: { cursor: initialCursor } }
            );
            act(() => {
                controller.beginActivation({ entry: "full", target: address("tx-x") });
            });

            hook.rerender({ cursor: cursorFor([transaction("tx-c")]) });
            expect(controller.getPendingRequest()?.abortFallbackFocus).toBeNull();
            act(() => vi.advanceTimersByTime(25));

            expect(document.activeElement).toBe(external);
            expect(controller.getSnapshot().reconciliationFocus).toBeNull();
            if (originKind === "neutral") {
                expect(controller.getInteractionState()).toEqual({ kind: "idle", selection: [] });
            } else {
                expect(controller.getInteractionState()).toMatchObject({ kind: "parked" });
                expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
                    anchorColumnId: "description",
                    anchorRowId: "tx-c"
                });
            }
            hook.unmount();
            external.remove();
            replacement.remove();
            vi.useRealTimers();
        }
    );

    it("keeps one registration deadline across surviving focus-phase rebases", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
        const controller = createController();
        const initialCursor = cursorFor([transaction("tx-1"), transaction("tx-2")]);
        controller.updateProjection(initialCursor, COLUMNS);
        controller.setFocusedCell("tx-1", "description");
        const accepted = controller.beginActivation({
            entry: "full",
            target: address("tx-2")
        });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        const hook = renderHook(
            ({ cursor }) =>
                useTransactionGridController({
                    controller,
                    cursor,
                    registrationTimeoutMs: 25,
                    selectableColumnIds: COLUMNS
                }),
            { initialProps: { cursor: initialCursor } }
        );

        act(() => vi.advanceTimersByTime(20));
        hook.rerender({
            cursor: cursorFor([transaction("tx-1"), transaction("tx-2"), transaction("tx-3")])
        });
        const rebased = controller.getPendingRequest();
        expect(rebased?.state.phase).toBe("focus");
        expect(rebased?.state.projectionGeneration).toBe(controller.getSnapshot().generation);

        act(() => vi.advanceTimersByTime(4));
        expect(controller.getPendingRequest()).not.toBeNull();
        act(() => vi.advanceTimersByTime(1));

        expect(controller.getPendingRequest()).toBeNull();
        expect(controller.getSnapshot().failure).toEqual({
            address: address("tx-2"),
            kind: "registration-timeout"
        });
        expect(controller.cellSelectionAtom.get()[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "tx-1"
        });
        expect(controller.getSnapshot().pins).toEqual([
            { kind: "active-origin", transactionId: "tx-1" }
        ]);
        hook.unmount();
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
