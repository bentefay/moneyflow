import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import type {
    TransactionInspectorBindingRegistration,
    TransactionInspectorControlBinding
} from "@/components/features/transactions/table-model";
import {
    asTransactionId,
    type TransactionColumnId
} from "@/components/features/transactions/table-model/ids";
import type { TransactionInput } from "@/lib/crdt/schema";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

import { populateStore } from "../crdt/transaction-cursor-fixtures";
import {
    createTestTransactionTable,
    transaction as tableTransaction
} from "./table-model/test-table";

const COLUMNS = ["date", "description", "amount", "actions"] as const;
const NOTES_BINDING = { action: "notes", kind: "action" } as const;
const CLOSE_BINDING = { action: "close", kind: "action" } as const;
const DESCRIPTION_BINDING = { columnId: "description", kind: "field" } as const;
const DESCRIPTION_AUTOMATION_BINDING = {
    field: "descriptionAlias",
    kind: "automation"
} as const;
const TAGS_AUTOMATION_BINDING = { field: "tags", kind: "automation" } as const;
const ALLOCATION_AUTOMATION_BINDING = { field: "allocation", kind: "automation" } as const;

function transaction(id: string): TransactionInput {
    return {
        accountId: "acc-1",
        allocations: {},
        amount: asMinorUnits(-1000),
        creationInstant: Temporal.Instant.from("2026-08-24T10:00:00Z"),
        date: Temporal.PlainDate.from("2026-08-24"),
        deletedAt: undefined,
        description: id,
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

function cursorFor(ids: readonly string[]) {
    return createTransactionCursor(buildTransactionIndex(populateStore(ids.map(transaction))));
}

function address(transactionId: string, columnId: TransactionColumnId = "description") {
    return { columnId, transactionId: asTransactionId(transactionId) };
}

function actionsAddress(transactionId: string) {
    return { columnId: "actions" as const, transactionId: asTransactionId(transactionId) };
}

function registration(
    transactionId: string,
    binding: TransactionInspectorControlBinding
): TransactionInspectorBindingRegistration {
    return { binding, transactionOwner: asTransactionId(transactionId) };
}

function mountedButton() {
    const element = document.createElement("button");
    document.body.append(element);
    return element;
}

async function drainInspectorFocusSettlement(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

function createController(ids: readonly string[] = ["tx-1"]) {
    const controller = createTransactionGridWorkspaceController(
        createTransactionCellSelectionAtom()
    );
    controller.updateProjection(cursorFor(ids), COLUMNS);
    return controller;
}

describe("transaction grid inspector controller adapter", () => {
    it("reveals then focuses the inspector heading from the canonical active actions cell", () => {
        const controller = createController();
        const actions = actionsAddress("tx-1");
        const heading = mountedButton();
        const gridcell = mountedButton();
        const focusOrder: string[] = [];
        const reveal = vi.fn(() => focusOrder.push("reveal"));
        heading.scrollIntoView = reveal;
        heading.addEventListener("focus", () => focusOrder.push("focus"));
        controller.registerCell(actions, gridcell);
        controller.registerInspectorHeading(heading);
        controller.setFocusedCell("tx-1", "actions");
        gridcell.focus();

        expect(controller.activateInspectorFromActionCell(actions)).toBe("focused");

        expect(focusOrder).toEqual(["reveal", "focus"]);
        expect(reveal).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
        expect(document.activeElement).toBe(heading);
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: actions,
            activeTransactionId: asTransactionId("tx-1"),
            inspectorPanelOpen: true,
            interactionKind: "inspecting",
            selectionVisibility: "muted"
        });
        heading.remove();
        gridcell.remove();
    });

    it("wakes heading focus again after a transient current-generation registration disappears", () => {
        const controller = createController();
        const actions = actionsAddress("tx-1");
        const gridcell = mountedButton();
        const transientHeading = mountedButton();
        const replacementHeading = mountedButton();
        controller.registerCell(actions, gridcell);
        controller.setFocusedCell("tx-1", "actions");
        gridcell.focus();

        expect(controller.activateInspectorFromActionCell(actions)).toBe("unregistered");
        const generation = controller.getSnapshot().generation;
        const registrationVersion = controller.getSnapshot().registrationVersion;
        const unregisterTransient = controller.registerInspectorHeading(transientHeading);
        expect(controller.getSnapshot().registrationVersion).toBe(registrationVersion + 1);
        unregisterTransient();
        expect(controller.focusReconciliation(generation)).toBe("unregistered");

        const unregisterReplacement = controller.registerInspectorHeading(replacementHeading);
        expect(controller.getSnapshot().registrationVersion).toBe(registrationVersion + 2);
        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(replacementHeading);
        unregisterReplacement();
        gridcell.remove();
        transientHeading.remove();
        replacementHeading.remove();
    });

    it("keeps exact heading and control registrations through stale replacement cleanup", () => {
        const controller = createController();
        const firstHeading = mountedButton();
        const replacementHeading = mountedButton();
        const firstControl = mountedButton();
        const replacementControl = mountedButton();
        const notes = registration("tx-1", NOTES_BINDING);

        const unregisterFirstHeading = controller.registerInspectorHeading(firstHeading);
        const unregisterReplacementHeading =
            controller.registerInspectorHeading(replacementHeading);
        const unregisterFirstControl = controller.registerInspectorControl(notes, firstControl);
        const unregisterReplacementControl = controller.registerInspectorControl(
            notes,
            replacementControl
        );
        unregisterFirstHeading();
        unregisterFirstControl();

        expect(controller.getSnapshot().inspectorHeadingRegistered).toBe(true);
        expect(controller.getSnapshot().availableInspectorBindings).toEqual([notes]);
        expect(controller.isRegisteredInspectorOwnedTarget(firstHeading)).toBe(false);
        expect(controller.isRegisteredInspectorOwnedTarget(replacementHeading)).toBe(true);
        expect(controller.isRegisteredInspectorTarget(notes, firstControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(notes, replacementControl)).toBe(true);
        expect(controller.isRegisteredInspectorOwnedTarget(replacementControl)).toBe(true);

        unregisterReplacementHeading();
        unregisterReplacementControl();
        expect(controller.getSnapshot().inspectorHeadingRegistered).toBe(false);
        expect(controller.getSnapshot().availableInspectorBindings).toEqual([]);
        firstHeading.remove();
        replacementHeading.remove();
        firstControl.remove();
        replacementControl.remove();
    });

    it("owns only exact current inspector controls and registered portal descendants", () => {
        const controller = createController();
        const notes = registration("tx-1", NOTES_BINDING);
        const wrongRow = registration("tx-2", NOTES_BINDING);
        const control = mountedButton();
        const portal = document.createElement("div");
        const portalControl = document.createElement("button");
        const spoof = document.createElement("div");
        const spoofControl = document.createElement("button");
        portal.append(portalControl);
        spoof.append(spoofControl);
        document.body.append(portal, spoof);
        controller.registerInspectorControl(notes, control);
        const unregisterPortal = controller.registerInspectorPortal(notes, portal);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);

        expect(controller.isRegisteredInspectorTarget(notes, control)).toBe(true);
        expect(controller.isRegisteredInspectorTarget(notes, portalControl)).toBe(true);
        expect(controller.isRegisteredInspectorOwnedTarget(control)).toBe(true);
        expect(controller.isRegisteredInspectorOwnedTarget(portalControl)).toBe(true);
        expect(controller.isRegisteredInspectorTarget(wrongRow, portalControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(notes, spoofControl)).toBe(false);
        expect(controller.isRegisteredInspectorOwnedTarget(spoofControl)).toBe(false);
        expect(controller.enterInspector(portalControl)).toBe(true);
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });

        const unregisterReboundPortal = controller.registerInspectorPortal(wrongRow, portal);
        unregisterPortal();
        expect(controller.isRegisteredInspectorTarget(notes, portalControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(wrongRow, portalControl)).toBe(true);
        unregisterReboundPortal();
        expect(controller.isRegisteredInspectorTarget(wrongRow, portalControl)).toBe(false);
        control.remove();
        portal.remove();
        spoof.remove();
    });

    it("owns automation controls and portals by exact transaction and rule field", () => {
        const controller = createController(["tx-1", "tx-2"]);
        const description = registration("tx-1", DESCRIPTION_AUTOMATION_BINDING);
        const tags = registration("tx-1", TAGS_AUTOMATION_BINDING);
        const allocation = registration("tx-1", ALLOCATION_AUTOMATION_BINDING);
        const wrongRowTags = registration("tx-2", TAGS_AUTOMATION_BINDING);
        const descriptionControl = mountedButton();
        const tagsControl = mountedButton();
        const tagsPortal = document.createElement("div");
        const tagsPortalControl = document.createElement("button");
        tagsPortal.append(tagsPortalControl);
        document.body.append(tagsPortal);
        controller.registerInspectorControl(description, descriptionControl);
        controller.registerInspectorControl(tags, tagsControl);
        const unregisterTagsPortal = controller.registerInspectorPortal(tags, tagsPortal);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);

        expect(controller.isRegisteredInspectorTarget(description, descriptionControl)).toBe(true);
        expect(controller.isRegisteredInspectorTarget(tags, descriptionControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(tags, tagsControl)).toBe(true);
        expect(controller.isRegisteredInspectorTarget(description, tagsControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(tags, tagsPortalControl)).toBe(true);
        expect(controller.isRegisteredInspectorTarget(description, tagsPortalControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(allocation, tagsPortalControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(wrongRowTags, tagsPortalControl)).toBe(false);
        expect(controller.isRegisteredInspectorOwnedTarget(tagsPortalControl)).toBe(true);

        const unregisterAllocationPortal = controller.registerInspectorPortal(
            allocation,
            tagsPortal
        );
        unregisterTagsPortal();
        expect(controller.isRegisteredInspectorTarget(tags, tagsPortalControl)).toBe(false);
        expect(controller.isRegisteredInspectorTarget(allocation, tagsPortalControl)).toBe(true);

        unregisterAllocationPortal();
        descriptionControl.remove();
        tagsControl.remove();
        tagsPortal.remove();
    });

    it.each(["heading", "control", "portal"] as const)(
        "uses the immediate relatedTarget guard for a registered %s without transient parking",
        async (destinationKind) => {
            const controller = createController();
            const heading = mountedButton();
            const control = mountedButton();
            const portal = document.createElement("div");
            const portalControl = document.createElement("button");
            const unsettledActiveElement = mountedButton();
            portal.append(portalControl);
            document.body.append(portal);
            const notes = registration("tx-1", NOTES_BINDING);
            controller.registerInspectorHeading(heading);
            controller.registerInspectorControl(notes, control);
            controller.registerInspectorPortal(notes, portal);
            controller.setFocusedCell("tx-1", "description");
            controller.setInspectorPanelOpen(true);
            control.focus();
            expect(controller.enterInspector(control)).toBe(true);
            const transitions: string[] = [];
            const unsubscribe = controller.subscribe(() => {
                transitions.push(controller.getSnapshot().interactionKind);
            });
            const destination =
                destinationKind === "heading"
                    ? heading
                    : destinationKind === "control"
                      ? control
                      : portalControl;

            controller.handleInspectorFocusOut(destination, document);
            unsettledActiveElement.focus();
            await drainInspectorFocusSettlement();

            expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
            expect(transitions).not.toContain("parked");
            destination.focus();
            expect(controller.enterInspector(destination)).toBe(true);

            expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
            expect(controller.getSnapshot().selectionVisibility).toBe("muted");
            expect(transitions).not.toContain("parked");
            unsubscribe();
            heading.remove();
            control.remove();
            unsettledActiveElement.remove();
            portal.remove();
        }
    );

    it("waits for external focus settlement before parking while leaving the panel open", async () => {
        const controller = createController();
        const heading = mountedButton();
        const control = mountedButton();
        const external = mountedButton();
        const notes = registration("tx-1", NOTES_BINDING);
        controller.registerInspectorHeading(heading);
        controller.registerInspectorControl(notes, control);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        control.focus();
        controller.enterInspector(control);

        controller.handleInspectorFocusOut(external, document);

        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
        external.focus();
        await drainInspectorFocusSettlement();

        expect(document.activeElement).toBe(external);
        expect(controller.getSnapshot()).toMatchObject({
            inspectorPanelOpen: true,
            interactionKind: "parked",
            selectionVisibility: "suppressed"
        });
        heading.remove();
        control.remove();
        external.remove();
    });

    it("classifies an inspector exit into a registered grid destination as navigation", () => {
        const controller = createController();
        const control = mountedButton();
        const gridcell = mountedButton();
        const destination = address("tx-1", "amount");
        controller.registerInspectorControl(registration("tx-1", NOTES_BINDING), control);
        controller.registerCell(destination, gridcell);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        control.focus();
        controller.enterInspector(control);

        controller.handleInspectorFocusOut(gridcell, document);
        gridcell.focus();

        expect(document.activeElement).toBe(gridcell);
        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: destination,
            inspectorPanelOpen: true,
            interactionKind: "navigating",
            selectionVisibility: "visible"
        });
        control.remove();
        gridcell.remove();
    });

    it("retains the exact same-owner control across structural updates without focus theft", () => {
        const controller = createController(["tx-1", "tx-2"]);
        const heading = mountedButton();
        const notesControl = mountedButton();
        const notes = registration("tx-1", NOTES_BINDING);
        controller.registerInspectorHeading(heading);
        controller.registerInspectorControl(notes, notesControl);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        notesControl.focus();
        expect(controller.enterInspector(notesControl)).toBe(true);

        controller.updateProjection(cursorFor(["tx-1", "tx-2", "tx-3"]), COLUMNS);
        const generation = controller.getSnapshot().generation;

        expect(controller.getSnapshot().reconciliationFocus).toEqual(
            expect.objectContaining({
                generation,
                intent: { binding: NOTES_BINDING, kind: "retain-inspector-control" }
            })
        );
        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(notesControl);
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });

        controller.updateProjection(cursorFor(["tx-1", "tx-2", "tx-3", "tx-4"]), COLUMNS);
        const nextGeneration = controller.getSnapshot().generation;
        expect(controller.getSnapshot().reconciliationFocus).toEqual(
            expect.objectContaining({
                intent: { binding: NOTES_BINDING, kind: "retain-inspector-control" }
            })
        );
        expect(controller.focusReconciliation(nextGeneration)).toBe("focused");
        expect(document.activeElement).toBe(notesControl);
        heading.remove();
        notesControl.remove();
    });

    it("wakes retained-control focus only for the current-generation replacement registration", () => {
        const controller = createController(["tx-1", "tx-2"]);
        const heading = mountedButton();
        const firstControl = mountedButton();
        const replacementControl = mountedButton();
        const notes = registration("tx-1", NOTES_BINDING);
        controller.registerInspectorHeading(heading);
        const unregisterFirst = controller.registerInspectorControl(notes, firstControl);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        firstControl.focus();
        controller.enterInspector(firstControl);
        controller.updateProjection(cursorFor(["tx-1", "tx-2", "tx-3"]), COLUMNS);
        const generation = controller.getSnapshot().generation;
        const registrationVersion = controller.getSnapshot().registrationVersion;

        unregisterFirst();
        expect(controller.focusReconciliation(generation)).toBe("unregistered");
        const unregisterReplacement = controller.registerInspectorControl(
            notes,
            replacementControl
        );

        expect(controller.getSnapshot().registrationVersion).toBe(registrationVersion + 1);
        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(replacementControl);
        unregisterReplacement();
        heading.remove();
        firstControl.remove();
        replacementControl.remove();
    });

    it.each([
        ["removed binding", false],
        ["rebound owner", true]
    ] as const)("invalidates a focused inspector control for a %s", (scenario, reboundOwner) => {
        const controller = createController(["tx-1", "tx-2"]);
        const heading = mountedButton();
        const control = mountedButton();
        const current = registration("tx-1", DESCRIPTION_BINDING);
        controller.registerInspectorHeading(heading);
        const unregisterCurrent = controller.registerInspectorControl(current, control);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        control.focus();
        expect(controller.enterInspector(control)).toBe(true);

        if (reboundOwner) {
            controller.registerInspectorControl(registration("tx-2", DESCRIPTION_BINDING), control);
            unregisterCurrent();
        } else {
            unregisterCurrent();
        }
        controller.updateProjection(cursorFor(["tx-2"]), COLUMNS);
        const generation = controller.getSnapshot().generation;

        expect(controller.getSnapshot().reconciliationFocus).toEqual(
            expect.objectContaining({ intent: { kind: "inspector-heading" } })
        );
        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(heading);
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
        heading.remove();
        control.remove();
    });

    it("does not retain a close control after the element is rebound to another owner", () => {
        const controller = createController(["tx-1", "tx-2"]);
        const heading = mountedButton();
        const closeControl = mountedButton();
        const currentClose = registration("tx-1", CLOSE_BINDING);
        controller.registerInspectorHeading(heading);
        const unregisterCurrentClose = controller.registerInspectorControl(
            currentClose,
            closeControl
        );
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        closeControl.focus();
        expect(controller.enterInspector(closeControl)).toBe(true);

        const unregisterReboundClose = controller.registerInspectorControl(
            registration("tx-2", CLOSE_BINDING),
            closeControl
        );
        unregisterCurrentClose();
        controller.updateProjection(cursorFor(["tx-1", "tx-2", "tx-3"]), COLUMNS);
        const generation = controller.getSnapshot().generation;

        expect(controller.getSnapshot().reconciliationFocus).toEqual(
            expect.objectContaining({ intent: { kind: "inspector-heading" } })
        );
        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(heading);
        expect(document.activeElement).not.toBe(closeControl);
        unregisterReboundClose();
        heading.remove();
        closeControl.remove();
    });

    it("invalidates a same-owner control when its stable binding changes", () => {
        const controller = createController(["tx-1", "tx-2"]);
        const heading = mountedButton();
        const control = mountedButton();
        const description = registration("tx-1", DESCRIPTION_BINDING);
        controller.registerInspectorHeading(heading);
        const unregisterDescription = controller.registerInspectorControl(description, control);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        control.focus();
        expect(controller.enterInspector(control)).toBe(true);

        controller.registerInspectorControl(registration("tx-1", NOTES_BINDING), control);
        unregisterDescription();
        controller.updateProjection(cursorFor(["tx-1", "tx-2", "tx-3"]), COLUMNS);
        const generation = controller.getSnapshot().generation;

        expect(controller.getSnapshot().reconciliationFocus).toEqual(
            expect.objectContaining({ intent: { kind: "inspector-heading" } })
        );
        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(heading);
        heading.remove();
        control.remove();
    });

    it("closes from inspector focus and reveals the current-generation active gridcell", () => {
        const controller = createController();
        const actions = actionsAddress("tx-1");
        const heading = mountedButton();
        const staleCell = mountedButton();
        const currentCell = mountedButton();
        const focusOrder: string[] = [];
        const reveal = vi.fn(() => focusOrder.push("reveal"));
        currentCell.scrollIntoView = reveal;
        currentCell.addEventListener("focus", () => focusOrder.push("focus"));
        const unregisterStale = controller.registerCell(actions, staleCell);
        controller.registerCell(actions, currentCell);
        unregisterStale();
        controller.registerInspectorHeading(heading);
        controller.setFocusedCell("tx-1", "actions");
        currentCell.focus();
        expect(controller.activateInspectorFromActionCell(actions)).toBe("focused");
        focusOrder.length = 0;
        reveal.mockClear();

        expect(controller.dispatchCellIntent(actions, { kind: "close-inspector" }, 1)).toEqual({
            ok: true,
            value: { kind: "handled" }
        });

        expect(focusOrder).toEqual(["reveal", "focus"]);
        expect(reveal).toHaveBeenCalledWith({ block: "center", inline: "nearest" });
        expect(document.activeElement).toBe(currentCell);
        expect(controller.getInteractionState()).toMatchObject({ kind: "navigating" });
        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: actions,
            inspectorPanelOpen: false,
            selectionVisibility: "visible"
        });
        heading.remove();
        staleCell.remove();
        currentCell.remove();
    });

    it.each(["close", "direct-panel-close"] as const)(
        "returns an empty reconciled inspector to after-grid on %s",
        (closeKind) => {
            const controller = createController();
            const root = document.createElement("aside");
            const heading = document.createElement("h2");
            heading.tabIndex = -1;
            const control = document.createElement("textarea");
            const afterGrid = mountedButton();
            root.append(heading, control);
            document.body.append(root);
            controller.registerInspectorRoot(root);
            controller.registerInspectorHeading(heading);
            controller.registerInspectorControl(registration("tx-1", NOTES_BINDING), control);
            controller.registerAfterGridElement(afterGrid);
            controller.setFocusedCell("tx-1", "description");
            controller.setInspectorPanelOpen(true);
            control.focus();
            controller.enterInspector(control);

            controller.updateProjection(cursorFor([]), COLUMNS);
            const generation = controller.getSnapshot().generation;
            expect(controller.focusReconciliation(generation)).toBe("focused");
            expect(document.activeElement).toBe(heading);
            expect(controller.getSnapshot()).toMatchObject({
                inspectorPanelOpen: true,
                interactionKind: "idle"
            });

            if (closeKind === "close") expect(controller.closeInspector()).toBe(true);
            else controller.setInspectorPanelOpen(false);

            expect(document.activeElement).toBe(afterGrid);
            expect(controller.getSnapshot()).toMatchObject({
                inspectorPanelOpen: false,
                interactionKind: "idle"
            });
            root.remove();
            afterGrid.remove();
        }
    );

    it("routes removed-owner focus to heading, gridcell, and after-grid fallbacks", () => {
        const headingController = createController(["tx-1", "tx-2"]);
        const heading = mountedButton();
        const notesControl = mountedButton();
        headingController.registerInspectorHeading(heading);
        headingController.registerInspectorControl(
            registration("tx-1", NOTES_BINDING),
            notesControl
        );
        headingController.setFocusedCell("tx-1", "description");
        headingController.setInspectorPanelOpen(true);
        notesControl.focus();
        headingController.enterInspector(notesControl);
        headingController.updateProjection(cursorFor(["tx-2"]), COLUMNS);
        expect(
            headingController.focusReconciliation(headingController.getSnapshot().generation)
        ).toBe("focused");
        expect(document.activeElement).toBe(heading);

        const gridController = createController(["tx-1", "tx-2"]);
        const sourceCell = mountedButton();
        const replacementCell = mountedButton();
        gridController.registerCell(address("tx-1"), sourceCell);
        gridController.registerCell(address("tx-2"), replacementCell);
        gridController.setFocusedCell("tx-1", "description");
        sourceCell.focus();
        gridController.updateProjection(cursorFor(["tx-2"]), COLUMNS);
        expect(gridController.focusReconciliation(gridController.getSnapshot().generation)).toBe(
            "focused"
        );
        expect(document.activeElement).toBe(replacementCell);

        const emptyController = createController();
        const emptyHeading = mountedButton();
        const emptyControl = mountedButton();
        const afterGrid = mountedButton();
        emptyController.registerInspectorHeading(emptyHeading);
        emptyController.registerInspectorControl(registration("tx-1", NOTES_BINDING), emptyControl);
        emptyController.registerAfterGridElement(afterGrid);
        emptyController.setFocusedCell("tx-1", "description");
        emptyController.setInspectorPanelOpen(true);
        emptyControl.focus();
        emptyController.enterInspector(emptyControl);
        emptyController.setInspectorPanelOpen(false);
        emptyController.updateProjection(cursorFor([]), COLUMNS);
        expect(emptyController.focusReconciliation(emptyController.getSnapshot().generation)).toBe(
            "focused"
        );
        expect(document.activeElement).toBe(afterGrid);

        heading.remove();
        notesControl.remove();
        sourceCell.remove();
        replacementCell.remove();
        emptyHeading.remove();
        emptyControl.remove();
        afterGrid.remove();
    });

    it("retains inspector-owned interaction only for the exact owner and binding", async () => {
        const controller = createController();
        const heading = mountedButton();
        const control = mountedButton();
        const portal = document.createElement("div");
        const portalControl = document.createElement("button");
        portal.append(portalControl);
        document.body.append(portal);
        const notes = registration("tx-1", NOTES_BINDING);
        controller.registerInspectorHeading(heading);
        controller.registerInspectorControl(notes, control);
        controller.registerInspectorPortal(notes, portal);
        controller.setFocusedCell("tx-1", "description");
        controller.setInspectorPanelOpen(true);
        control.focus();
        controller.enterInspector(control);

        expect(controller.setInspectorInteraction(notes, "modal", true)).toBe(true);
        portalControl.focus();
        expect(controller.getInteractionState()).toMatchObject({
            binding: NOTES_BINDING,
            kind: "interacting",
            owner: "inspector"
        });

        controller.updateProjection(cursorFor(["tx-1", "tx-2"]), COLUMNS);
        const generation = controller.getSnapshot().generation;
        expect(controller.getSnapshot().reconciliationFocus).toEqual(
            expect.objectContaining({
                intent: { binding: NOTES_BINDING, kind: "retain-inspector-control" }
            })
        );
        expect(controller.focusReconciliation(generation)).toBe("focused");
        expect(document.activeElement).toBe(portalControl);
        expect(controller.getInteractionState()).toMatchObject({
            binding: NOTES_BINDING,
            kind: "interacting",
            owner: "inspector"
        });

        portal.remove();
        expect(controller.setInspectorInteraction(notes, "modal", false)).toBe(true);
        await Promise.resolve();
        expect(document.activeElement).toBe(control);
        expect(
            controller.setInspectorInteraction(registration("tx-2", NOTES_BINDING), "modal", true)
        ).toBe(false);
        expect(
            controller.setInspectorInteraction(
                registration("tx-1", DESCRIPTION_BINDING),
                "modal",
                true
            )
        ).toBe(false);
        heading.remove();
        control.remove();
    });

    it("does not derive inspector ownership from row-checkbox selection", () => {
        const controller = createController(["tx-1", "tx-2"]);
        const table = createTestTransactionTable({
            cellSelectionAtom: controller.cellSelectionAtom,
            transactions: [tableTransaction({ id: "tx-1" }), tableTransaction({ id: "tx-2" })]
        });
        controller.setFocusedCell("tx-1", "description");
        const before = controller.getSnapshot();

        table.toggleRowSelected(asTransactionId("tx-2"));

        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: before.activeAddress,
            activeTransactionId: asTransactionId("tx-1"),
            interactionKind: "navigating"
        });
        expect(table.getIsRowSelected(asTransactionId("tx-2"))).toBe(true);
    });

    it("does not focus a closed panel but retains the canonical transaction identity", () => {
        const controller = createController();
        const heading = mountedButton();
        const focusHeading = vi.spyOn(heading, "focus");
        controller.registerInspectorHeading(heading);
        controller.setFocusedCell("tx-1", "description");

        controller.setInspectorPanelOpen(false);

        expect(controller.enterInspector(heading)).toBe(false);
        expect(focusHeading).not.toHaveBeenCalled();
        expect(controller.getSnapshot()).toMatchObject({
            activeAddress: address("tx-1"),
            activeTransactionId: asTransactionId("tx-1"),
            inspectorPanelOpen: false,
            interactionKind: "navigating"
        });
        heading.remove();
    });
});
