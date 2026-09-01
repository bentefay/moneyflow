import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import type { TransactionAutomationOwner } from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";
import type { TransactionId } from "@/components/features/transactions/table-model";
import type { TransactionInput } from "@/lib/crdt/schema";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

import { populateStore } from "../crdt/transaction-cursor-fixtures";

const COLUMNS = ["description", "tags", "amount", "actions"] as const;

function transaction(id: string): TransactionInput {
    return {
        accountId: "acc-1",
        allocations: {},
        amount: asMinorUnits(-1000),
        creationInstant: Temporal.Instant.from("2026-08-29T10:00:00Z"),
        date: Temporal.PlainDate.from("2026-08-29"),
        deletedAt: undefined,
        description: id,
        descriptionAliasId: undefined,
        id,
        importId: "import-1",
        importRowIndex: 0,
        notes: "",
        originalAmount: undefined,
        statusId: "status-for-review",
        suspectedDuplicates: [],
        tagIds: []
    };
}

function cursorFor(transactionIds: readonly string[]) {
    return createTransactionCursor(
        buildTransactionIndex(populateStore(transactionIds.map(transaction)))
    );
}

function canonicalLivenessFor(transactions: readonly TransactionInput[]) {
    const canonicalById = buildTransactionIndex(populateStore(transactions)).canonicalById;
    return (transactionId: TransactionId): boolean => {
        const current = canonicalById.get(transactionId);
        return current != null && current.deletedAt == null;
    };
}

function createController() {
    const controller = createTransactionGridWorkspaceController(
        createTransactionCellSelectionAtom()
    );
    controller.updateProjection(cursorFor(["tx-1", "tx-2"]), COLUMNS);
    return controller;
}

function tagsAddress(transactionId: string) {
    return { columnId: "tags" as const, transactionId: asTransactionId(transactionId) };
}

describe("controller-owned automation finalization", () => {
    it("retains the editor and publishes no proposal for a rejected commit", () => {
        const controller = createController();
        const address = tagsAddress("tx-1");
        controller.publishAutomationEditorEntry(address, {
            draftTagIds: ["tag-1"],
            field: "tags",
            originalTagIds: []
        });

        controller.publishAutomationEditorCommit(address, { ok: false, status: "rejected" });

        expect(controller.getSnapshot().automation).toEqual({
            editor: {
                context: {
                    draftTagIds: ["tag-1"],
                    field: "tags",
                    originalTagIds: []
                },
                owner: { field: "tags", transactionId: asTransactionId("tx-1") }
            },
            proposal: null
        });
    });

    it("clears the editor and publishes no proposal for an unchanged commit", () => {
        const controller = createController();
        const address = tagsAddress("tx-1");
        controller.publishAutomationEditorEntry(address, {
            draftTagIds: [],
            field: "tags",
            originalTagIds: []
        });

        controller.publishAutomationEditorCommit(address, { ok: true, status: "unchanged" });

        expect(controller.getSnapshot().automation).toEqual({ editor: null, proposal: null });
    });

    it("does not run a dismissed proposal callback on a later owner exit", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const apply = vi.fn();
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        controller.registerAutomationFinalizer(owner, apply);

        expect(controller.dismissAutomationProposal(owner)).toBe(true);
        controller.setFocusedCell("tx-2", "tags");

        expect(apply).not.toHaveBeenCalled();
    });

    it("cannot run a superseded proposal callback", () => {
        const controller = createController();
        const firstOwner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const secondOwner = { field: "tags" as const, transactionId: asTransactionId("tx-2") };
        const firstApply = vi.fn();
        const secondApply = vi.fn();
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        controller.registerAutomationFinalizer(firstOwner, firstApply);
        controller.publishAutomationEditorCommit(tagsAddress("tx-2"), {
            ok: true,
            status: "changed"
        });
        controller.registerAutomationFinalizer(secondOwner, secondApply);

        controller.clearUserFocus();

        expect(firstApply).not.toHaveBeenCalled();
        expect(secondApply).toHaveBeenCalledTimes(1);
    });

    it("cannot run an unmounted proposal callback", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const apply = vi.fn();
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        const unregister = controller.registerAutomationFinalizer(owner, apply);
        unregister();

        controller.parkExternalFocus();

        expect(apply).not.toHaveBeenCalled();
        expect(controller.getSnapshot().automation.proposal?.owner).toEqual(owner);
    });

    it("retains a canonically live manual proposal when filtering removes its owner", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const finalizeManualProposal = vi.fn();
        controller.setFocusedCell("tx-1", "tags");
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        controller.registerAutomationFinalizer(owner, finalizeManualProposal);

        controller.updateProjection(
            cursorFor(["tx-2"]),
            COLUMNS,
            canonicalLivenessFor([transaction("tx-1"), transaction("tx-2")])
        );

        expect(finalizeManualProposal).toHaveBeenCalledOnce();
        expect(controller.getSnapshot().automation.proposal?.owner).toEqual(owner);
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
    });

    it("retires a filtered owner when canonical deletion leaves cursor structure unchanged", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const filteredCursor = cursorFor(["tx-2"]);
        controller.setFocusedCell("tx-1", "tags");
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });

        controller.updateProjection(
            filteredCursor,
            COLUMNS,
            canonicalLivenessFor([transaction("tx-1"), transaction("tx-2")])
        );
        const filteredGeneration = controller.getSnapshot().generation;
        expect(controller.getSnapshot().automation.proposal?.owner).toEqual(owner);

        controller.updateProjection(
            filteredCursor,
            COLUMNS,
            canonicalLivenessFor([
                {
                    ...transaction("tx-1"),
                    deletedAt: Temporal.Instant.from("2026-08-31T13:00:00Z")
                },
                transaction("tx-2")
            ])
        );

        expect(controller.getSnapshot().generation).toBe(filteredGeneration);
        expect(controller.getSnapshot().automation.proposal).toBeNull();
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
    });

    it("retains a structurally removed proposal when canonical liveness evidence is omitted", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        controller.setFocusedCell("tx-1", "tags");
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });

        controller.updateProjection(cursorFor(["tx-2"]), COLUMNS);

        expect(controller.getSnapshot().automation.proposal?.owner).toEqual(owner);
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
    });

    it("retires a canonically deleted proposal after its finalizer already unmounted", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const apply = vi.fn();
        controller.setFocusedCell("tx-1", "tags");
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        const unregister = controller.registerAutomationFinalizer(owner, apply);
        unregister();

        controller.updateProjection(
            cursorFor(["tx-2"]),
            COLUMNS,
            canonicalLivenessFor([
                {
                    ...transaction("tx-1"),
                    deletedAt: Temporal.Instant.from("2026-08-31T13:00:00Z")
                },
                transaction("tx-2")
            ])
        );

        expect(apply).not.toHaveBeenCalled();
        expect(controller.getSnapshot().automation.proposal).toBeNull();
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
    });

    it("finalizes a deleted owner once before dismissal and replacement publication", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const sourceObservations: Array<{
            readonly activeTransactionId: TransactionId | null;
            readonly proposalOwner: TransactionAutomationOwner | null;
        }> = [];
        controller.setFocusedCell("tx-1", "tags");
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        const finalize = vi.fn(() => {
            const snapshot = controller.getSnapshot();
            sourceObservations.push({
                activeTransactionId: snapshot.activeTransactionId,
                proposalOwner: snapshot.automation.proposal?.owner ?? null
            });
        });
        controller.registerAutomationFinalizer(owner, finalize);
        const filteredCursor = cursorFor(["tx-2"]);
        const deletedLiveness = canonicalLivenessFor([
            {
                ...transaction("tx-1"),
                deletedAt: Temporal.Instant.from("2026-08-31T13:00:00Z")
            },
            transaction("tx-2")
        ]);

        controller.updateProjection(filteredCursor, COLUMNS, deletedLiveness);
        controller.updateProjection(filteredCursor, COLUMNS, deletedLiveness);

        expect(finalize).toHaveBeenCalledOnce();
        expect(sourceObservations).toEqual([
            {
                activeTransactionId: asTransactionId("tx-1"),
                proposalOwner: owner
            }
        ]);
        expect(controller.getSnapshot().automation.proposal).toBeNull();
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
    });

    it("finalizes a structurally removed owner before publishing its reconciled replacement", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const order: string[] = [];
        controller.setFocusedCell("tx-1", "tags");
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        const finalize = vi.fn(() => {
            order.push(`finalize:${controller.getSnapshot().activeTransactionId ?? "none"}`);
        });
        controller.registerAutomationFinalizer(owner, finalize);
        const unsubscribe = controller.subscribe(() => {
            const activeOwner = controller.getSnapshot().activeTransactionId;
            if (activeOwner === asTransactionId("tx-2")) order.push(`publish:${activeOwner}`);
        });

        controller.updateProjection(cursorFor(["tx-2"]), COLUMNS);
        unsubscribe();
        controller.updateProjection(cursorFor(["tx-2"]), COLUMNS);

        expect(finalize).toHaveBeenCalledOnce();
        expect(order).toEqual(["finalize:tx-1", "publish:tx-2"]);
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
    });

    it("does not let an unrelated hidden proposal block editor commit navigation", () => {
        const controller = createController();
        controller.updateProjection(cursorFor(["tx-1", "tx-2", "tx-3"]), COLUMNS);
        const sourceAddress = tagsAddress("tx-1");
        const hiddenOwner = {
            field: "tags" as const,
            transactionId: asTransactionId("tx-3")
        };
        const finalizeHiddenProposal = vi.fn();
        const sourceEditor = document.createElement("input");
        const destinationEditor = document.createElement("input");
        document.body.append(sourceEditor, destinationEditor);
        controller.registerEditor(sourceAddress, sourceEditor);
        controller.registerEditor(tagsAddress("tx-2"), destinationEditor);
        const accepted = controller.beginActivation({ entry: "full", target: sourceAddress });
        expect(controller.markRevealApplied(accepted)).toBe(true);
        expect(controller.focusPendingActivation(accepted)).toBe("focused");
        controller.publishAutomationEditorCommit(tagsAddress("tx-3"), {
            ok: true,
            status: "changed"
        });
        controller.registerAutomationFinalizer(hiddenOwner, finalizeHiddenProposal);

        expect(
            controller.dispatchCellIntent(
                sourceAddress,
                { direction: "down", kind: "commit-and-move", preserveEntry: "full" },
                1
            )
        ).toEqual({ ok: true, value: { kind: "handled" } });

        const pending = controller.getPendingRequest();
        if (pending == null) throw new Error("Expected destination editor activation");
        expect(pending).toMatchObject({
            kind: "edit",
            state: { target: tagsAddress("tx-2") }
        });
        expect(controller.markRevealApplied(pending.state)).toBe(true);
        expect(controller.focusPendingActivation(pending.state)).toBe("focused");
        expect(finalizeHiddenProposal).toHaveBeenCalledOnce();
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
        expect(controller.getSnapshot().automation.proposal?.owner).toEqual(hiddenOwner);
        sourceEditor.remove();
        destinationEditor.remove();
    });

    it("retains the exact owner within its row and finalizes before publishing another row", () => {
        const controller = createController();
        const owner = { field: "tags" as const, transactionId: asTransactionId("tx-1") };
        const observations: Array<string | null> = [];
        controller.setFocusedCell("tx-1", "tags");
        controller.publishAutomationEditorCommit(tagsAddress("tx-1"), {
            ok: true,
            status: "changed"
        });
        controller.registerAutomationFinalizer(owner, () => {
            observations.push(controller.getSnapshot().activeTransactionId);
        });

        controller.setFocusedCell("tx-1", "description");
        expect(observations).toEqual([]);
        controller.setFocusedCell("tx-2", "tags");

        expect(observations).toEqual([asTransactionId("tx-1")]);
        expect(controller.getSnapshot().activeTransactionId).toBe(asTransactionId("tx-2"));
    });
});
