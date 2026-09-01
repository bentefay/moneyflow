import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    asTransactionGridCommandId,
    beginTransactionPendingActivation,
    cancelTransactionPendingActivation,
    fulfillTransactionPendingActivation,
    INACTIVE_TRANSACTION_COMPOSITION,
    NO_TRANSACTION_CONTINUOUS_EDIT,
    type NonEmptyTransactionGridSelection,
    type TransactionGridInteractionState
} from "@/components/features/transactions/table-model/grid-interaction-state";
import { createTransactionProjectionSnapshot } from "@/components/features/transactions/table-model/grid-navigation";
import {
    reconcileTransactionGridProjection,
    resolveTransactionGridFailure,
    transactionInspectorBindingEquals,
    type TransactionGridOperationError,
    type TransactionGridReconciliationResult
} from "@/components/features/transactions/table-model/grid-reconciliation";
import {
    asTransactionId,
    asTransactionProjectionGeneration,
    type TransactionColumnId,
    type TransactionId
} from "@/components/features/transactions/table-model/ids";

function projection(
    ids: readonly TransactionId[],
    columns: readonly TransactionColumnId[],
    generation: number,
    onIndexOf?: (id: string) => void,
    currentGeneration = generation
) {
    const projectionGeneration = asTransactionProjectionGeneration(generation);
    return createTransactionProjectionSnapshot({
        currentGeneration: () => asTransactionProjectionGeneration(currentGeneration),
        generation: projectionGeneration,
        idOf: (id: TransactionId) => id,
        selectableColumnIds: columns,
        source: {
            count: ids.length,
            indexOf: (id: string) => {
                onIndexOf?.(id);
                return ids.indexOf(asTransactionId(id));
            },
            slice: (offset: number, limit: number) => ids.slice(offset, offset + limit)
        }
    });
}

function selection(transactionId: TransactionId, columnId: TransactionColumnId) {
    return [
        {
            anchorColumnId: columnId,
            anchorRowId: transactionId,
            focusColumnId: "amount" as const,
            focusRowId: asTransactionId("old-extent")
        }
    ] satisfies NonEmptyTransactionGridSelection;
}

function navigating(transactionId: TransactionId, columnId: TransactionColumnId) {
    return {
        continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
        kind: "navigating",
        selection: selection(transactionId, columnId)
    } satisfies TransactionGridInteractionState;
}

function idleReconciliation(
    previousIds: readonly TransactionId[],
    nextIds: readonly TransactionId[]
) {
    return reconcileTransactionGridProjection({
        nextProjection: projection(nextIds, ["description"], 2),
        previousProjection: projection(previousIds, ["description"], 1),
        previousState: { kind: "idle", selection: [] }
    });
}

function emptyReconciliation(generation: number): TransactionGridReconciliationResult {
    return {
        cancelledDraft: false,
        cancelledPopup: false,
        focus: { kind: "after-grid" },
        generation: asTransactionProjectionGeneration(generation),
        pins: { kind: "clear" },
        state: { kind: "idle", selection: [] }
    };
}

describe("transaction inspector binding equality", () => {
    it("distinguishes automation rule fields from each other and other binding kinds", () => {
        const tags = { field: "tags", kind: "automation" } as const;

        expect(transactionInspectorBindingEquals(tags, tags)).toBe(true);
        expect(
            transactionInspectorBindingEquals(tags, {
                field: "descriptionAlias",
                kind: "automation"
            })
        ).toBe(false);
        expect(
            transactionInspectorBindingEquals(tags, {
                field: "allocation",
                kind: "automation"
            })
        ).toBe(false);
        expect(transactionInspectorBindingEquals(tags, { action: "notes", kind: "action" })).toBe(
            false
        );
        expect(
            transactionInspectorBindingEquals(tags, {
                columnId: "description",
                kind: "field"
            })
        ).toBe(false);
    });
});

describe("transaction grid structural reconciliation", () => {
    it.each([
        [[], []],
        [[], [asTransactionId("appeared")]],
        [[asTransactionId("before")], [asTransactionId("after")]],
        [[asTransactionId("before")], []]
    ] as const)("preserves neutral idle for projection transition %#", (before, after) => {
        expect(idleReconciliation(before, after)).toEqual({
            ok: true,
            value: {
                cancelledDraft: false,
                cancelledPopup: false,
                focus: { kind: "none" },
                generation: 2,
                pins: { kind: "clear" },
                state: { kind: "idle", selection: [] }
            }
        });
    });

    it("keeps rows returning after an engaged empty result neutral", () => {
        const tx = asTransactionId("tx");
        const emptied = reconcileTransactionGridProjection({
            focusOwner: { kind: "grid" },
            nextProjection: projection([], ["description"], 2),
            previousProjection: projection([tx], ["description"], 1),
            previousState: navigating(tx, "description")
        });
        expect(emptied.ok).toBe(true);
        if (!emptied.ok || emptied.value.state.kind !== "idle") return;

        const returned = reconcileTransactionGridProjection({
            nextProjection: projection([tx], ["description"], 3),
            previousProjection: projection([], ["description"], 2),
            previousState: emptied.value.state
        });

        expect(returned.ok).toBe(true);
        if (!returned.ok) return;
        expect(returned.value.state).toEqual({ kind: "idle", selection: [] });
        expect(returned.value.focus).toEqual({ kind: "none" });
        expect(returned.value.pins).toEqual({ kind: "clear" });
    });

    it.each([
        [2, "equal"],
        [1, "older"]
    ] as const)("rejects a %s structural generation", (nextGeneration, direction) => {
        const tx = asTransactionId("tx");
        expect(
            reconcileTransactionGridProjection({
                focusOwner: { kind: "grid" },
                nextProjection: projection([tx], ["description"], nextGeneration),
                previousProjection: projection([tx], ["description"], 2),
                previousState: navigating(tx, "description")
            })
        ).toEqual({
            error: {
                direction,
                kind: "non-advancing-generation",
                next: nextGeneration,
                previous: 2
            },
            ok: false
        });
    });

    it("reconciles a skipped generation through historical prior order", () => {
        const removed = asTransactionId("removed");
        const replacement = asTransactionId("replacement");
        const previousProjection = projection(
            [removed, replacement],
            ["description"],
            1,
            undefined,
            5
        );

        expect(previousProjection.indexOf(previousProjection.generation, removed)).toEqual({
            error: { actual: 5, expected: 1, kind: "stale-projection" },
            ok: false
        });
        expect(
            reconcileTransactionGridProjection({
                focusOwner: { kind: "grid" },
                nextProjection: projection([replacement], ["description"], 5),
                previousProjection,
                previousState: navigating(removed, "description")
            })
        ).toMatchObject({
            ok: true,
            value: {
                generation: 5,
                state: {
                    kind: "navigating",
                    selection: [{ anchorRowId: replacement }]
                }
            }
        });
    });

    it("rejects a stale next snapshot before publishing idle", () => {
        expect(
            reconcileTransactionGridProjection({
                nextProjection: projection([], ["description"], 2, undefined, 3),
                previousProjection: projection([], ["description"], 1, undefined, 3),
                previousState: { kind: "idle", selection: [] }
            })
        ).toEqual({
            error: { actual: 3, expected: 2, kind: "stale-projection" },
            ok: false
        });
    });

    it("keeps a surviving identity, discards old extent and avoids a survivor row read", () => {
        const tx1 = asTransactionId("tx-1");
        const tx2 = asTransactionId("tx-2");
        const indexReads: string[] = [];
        const result = reconcileTransactionGridProjection({
            focusOwner: { kind: "grid" },
            nextProjection: projection([tx2, tx1], ["date", "description"], 2, (id) =>
                indexReads.push(`next:${id}`)
            ),
            previousProjection: projection([tx1, tx2], ["date", "description", "amount"], 1, (id) =>
                indexReads.push(`previous:${id}`)
            ),
            previousState: navigating(tx1, "description")
        });

        expect(result.ok).toBe(true);
        if (!result.ok || result.value.state.kind !== "navigating") return;
        expect(result.value.state.selection).toEqual([
            {
                anchorColumnId: "description",
                anchorRowId: "tx-1",
                focusColumnId: "description",
                focusRowId: "tx-1",
                operation: "include"
            }
        ]);
        expect(indexReads).toEqual(["previous:tx-1", "next:tx-1"]);
    });

    it("rejects an active ID absent from the prior projection instead of clamping -1", () => {
        const stale = asTransactionId("stale");
        expect(
            reconcileTransactionGridProjection({
                focusOwner: { kind: "grid" },
                nextProjection: projection([asTransactionId("next")], ["description"], 2),
                previousProjection: projection([asTransactionId("previous")], ["description"], 1),
                previousState: navigating(stale, "description")
            })
        ).toEqual({
            error: {
                address: { columnId: "description", transactionId: "stale" },
                kind: "unknown-address"
            },
            ok: false
        });
    });

    it("chooses the row at the prior absolute position", () => {
        const before = ["a", "removed", "c"].map(asTransactionId);
        const after = ["a", "c"].map(asTransactionId);
        const result = reconcileTransactionGridProjection({
            focusOwner: { kind: "external" },
            nextProjection: projection(after, ["date", "amount"], 2),
            previousProjection: projection(before, ["date", "amount"], 1),
            previousState: {
                kind: "parked",
                selection: selection(asTransactionId("removed"), "amount")
            }
        });

        expect(result.ok).toBe(true);
        if (!result.ok || result.value.state.kind !== "parked") return;
        expect(result.value.state.selection[0]).toMatchObject({
            anchorColumnId: "amount",
            anchorRowId: "c"
        });
    });

    it("uses prior canonical distance and a left tie across dynamic allocation changes", () => {
        const tx = asTransactionId("tx");
        const result = reconcileTransactionGridProjection({
            focusOwner: { kind: "grid" },
            nextProjection: projection(
                [tx],
                ["date", "allocation:new", "allocation:a", "allocation:b", "amount"],
                2
            ),
            previousProjection: projection(
                [tx],
                ["date", "allocation:a", "allocation:removed", "allocation:b", "amount"],
                1
            ),
            previousState: navigating(tx, "allocation:removed")
        });

        expect(result.ok).toBe(true);
        if (!result.ok || result.value.state.kind !== "navigating") return;
        expect(result.value.state.selection[0].anchorColumnId).toBe("allocation:a");
    });

    it("retains a Notes inspector control when only the active grid column disappears", () => {
        const tx = asTransactionId("tx");
        const binding = { action: "notes", kind: "action" } as const;
        const result = reconcileTransactionGridProjection({
            availableInspectorBindings: [{ binding, transactionOwner: tx }],
            focusOwner: {
                focused: { binding, kind: "control" },
                headingRegistered: false,
                kind: "inspector",
                panelOpen: true
            },
            nextProjection: projection([tx], ["amount"], 2),
            previousProjection: projection([tx], ["description", "amount"], 1),
            previousState: { kind: "inspecting", selection: selection(tx, "description") }
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.focus).toEqual({ binding, kind: "retain-inspector-control" });
        expect(result.value.state.kind).toBe("inspecting");
        if (result.value.state.kind === "inspecting") {
            expect(result.value.state.selection[0].anchorColumnId).toBe("amount");
        }
    });

    it.each([
        [false, true],
        [false, false]
    ])(
        "falls back to grid when panelOpen=%s headingRegistered=%s",
        (panelOpen, headingRegistered) => {
            const tx = asTransactionId("tx");
            const binding = { columnId: "description", kind: "field" } as const;
            const result = reconcileTransactionGridProjection({
                availableInspectorBindings: [{ binding, transactionOwner: tx }],
                focusOwner: {
                    focused: { binding, kind: "control" },
                    headingRegistered,
                    kind: "inspector",
                    panelOpen
                },
                nextProjection: projection([tx], ["description"], 2),
                previousProjection: projection([tx], ["description"], 1),
                previousState: { kind: "inspecting", selection: selection(tx, "description") }
            });

            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.value.focus).toEqual({
                address: { columnId: "description", transactionId: "tx" },
                kind: "gridcell"
            });
            expect(result.value.state.kind).toBe("navigating");
        }
    );

    it.each([
        [true, false],
        [false, true]
    ])(
        "retains a focused heading only when panelOpen=%s and headingRegistered=%s are both true",
        (panelOpen, headingRegistered) => {
            const tx = asTransactionId("tx");
            const result = reconcileTransactionGridProjection({
                focusOwner: {
                    focused: { kind: "heading" },
                    headingRegistered,
                    kind: "inspector",
                    panelOpen
                },
                nextProjection: projection([tx], ["description"], 2),
                previousProjection: projection([tx], ["description"], 1),
                previousState: { kind: "inspecting", selection: selection(tx, "description") }
            });

            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.value.focus).toEqual({
                address: { columnId: "description", transactionId: "tx" },
                kind: "gridcell"
            });
        }
    );

    it("uses a registered heading when a rebound owner invalidates a control", () => {
        const removed = asTransactionId("removed");
        const replacement = asTransactionId("replacement");
        const binding = { columnId: "description", kind: "field" } as const;
        const result = reconcileTransactionGridProjection({
            availableInspectorBindings: [{ binding, transactionOwner: replacement }],
            focusOwner: {
                focused: { binding, kind: "control" },
                headingRegistered: true,
                kind: "inspector",
                panelOpen: true
            },
            nextProjection: projection([replacement], ["description"], 2),
            previousProjection: projection([removed], ["description"], 1),
            previousState: { kind: "inspecting", selection: selection(removed, "description") }
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.focus).toEqual({ kind: "inspector-heading" });
    });

    it("retains an inspector-owned popup when only the active grid column disappears", () => {
        const tx = asTransactionId("tx");
        const binding = { action: "notes", kind: "action" } as const;
        const interacting: TransactionGridInteractionState = {
            binding,
            kind: "interacting",
            owner: "inspector",
            popup: "modal",
            returnState: { kind: "inspecting" },
            selection: selection(tx, "description")
        };
        const result = reconcileTransactionGridProjection({
            availableInspectorBindings: [{ binding, transactionOwner: tx }],
            focusOwner: {
                focused: { binding, kind: "control" },
                headingRegistered: true,
                kind: "inspector",
                panelOpen: true
            },
            nextProjection: projection([tx], ["amount"], 2),
            previousProjection: projection([tx], ["description", "amount"], 1),
            previousState: interacting
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.cancelledPopup).toBe(false);
        expect(result.value.focus).toEqual({ binding, kind: "retain-inspector-control" });
        expect(result.value.state).toMatchObject({
            kind: "interacting",
            owner: "inspector",
            selection: [{ anchorColumnId: "amount", anchorRowId: tx }]
        });
    });

    it("retains a valid grid-editor popup and cancels it only when its cell disappears", () => {
        const tx = asTransactionId("tx");
        const interacting: TransactionGridInteractionState<string> = {
            kind: "interacting",
            owner: "grid-editor",
            popup: "combobox",
            returnState: {
                editor: {
                    binding: { kind: "field" },
                    composition: INACTIVE_TRANSACTION_COMPOSITION,
                    continuous: { entry: "full", kind: "continue" },
                    draft: "draft",
                    entry: "full"
                },
                kind: "editing"
            },
            selection: selection(tx, "description")
        };
        const surviving = reconcileTransactionGridProjection({
            focusOwner: { kind: "grid" },
            nextProjection: projection([tx], ["description", "amount"], 2),
            previousProjection: projection([tx], ["description"], 1),
            previousState: interacting
        });
        const invalidated = reconcileTransactionGridProjection({
            focusOwner: { kind: "grid" },
            nextProjection: projection([tx], ["amount"], 2),
            previousProjection: projection([tx], ["description", "amount"], 1),
            previousState: interacting
        });

        expect(surviving.ok).toBe(true);
        if (surviving.ok) {
            expect(surviving.value.cancelledDraft).toBe(false);
            expect(surviving.value.cancelledPopup).toBe(false);
            expect(surviving.value.state.kind).toBe("interacting");
        }
        expect(invalidated.ok).toBe(true);
        if (invalidated.ok) {
            expect(invalidated.value.cancelledDraft).toBe(true);
            expect(invalidated.value.cancelledPopup).toBe(true);
            expect(invalidated.value.state.kind).toBe("navigating");
            expect(JSON.stringify(invalidated.value)).not.toContain("draft");
        }
    });

    it("atomically enters idle and clears pins for an empty engaged projection", () => {
        const tx = asTransactionId("tx");
        const result = reconcileTransactionGridProjection({
            focusOwner: {
                focused: { kind: "heading" },
                headingRegistered: true,
                kind: "inspector",
                panelOpen: true
            },
            nextProjection: projection([], ["description"], 2),
            previousProjection: projection([tx], ["description"], 1),
            previousState: { kind: "inspecting", selection: selection(tx, "description") }
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.state).toEqual({ kind: "idle", selection: [] });
        expect(result.value.pins).toEqual({ kind: "clear" });
        expect(result.value.focus).toEqual({ kind: "inspector-heading" });
    });

    it("rebases a neutral pending target by exact stable IDs", () => {
        const target = asTransactionId("target");
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: { kind: "idle", selection: [] },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "description", transactionId: target }
        });
        const result = reconcileTransactionGridProjection({
            nextProjection: projection([asTransactionId("other"), target], ["description"], 2),
            previousProjection: projection([], ["description"], 1),
            previousState: pending
        });

        expect(result.ok).toBe(true);
        if (!result.ok || result.value.state.kind !== "pending-activation") return;
        expect(result.value.state.target).toEqual({
            columnId: "description",
            transactionId: "target"
        });
        expect(result.value.state.projectionGeneration).toBe(2);
        expect(result.value.pins).toEqual({ kind: "pending-only", transactionId: "target" });
    });

    it("retains a neutral reveal command across an absent-target generation until it materializes", () => {
        const target = asTransactionId("target");
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: { kind: "idle", selection: [] },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "description", transactionId: target }
        });
        const beforeMaterialization = reconcileTransactionGridProjection({
            nextProjection: projection([asTransactionId("existing")], ["description"], 2),
            previousProjection: projection([], ["description"], 1),
            previousState: pending
        });

        expect(beforeMaterialization).toMatchObject({
            ok: true,
            value: { state: { kind: "pending-activation" } }
        });
        if (
            !beforeMaterialization.ok ||
            beforeMaterialization.value.state.kind !== "pending-activation"
        ) {
            return;
        }
        expect(beforeMaterialization.value.state).toMatchObject({
            acceptedCommandId: "command",
            phase: "reveal",
            projectionGeneration: 2,
            target: { columnId: "description", transactionId: "target" }
        });
        expect(beforeMaterialization.value.pins).toEqual({
            kind: "pending-only",
            transactionId: "target"
        });

        const materialized = reconcileTransactionGridProjection({
            nextProjection: projection([asTransactionId("existing"), target], ["description"], 3),
            previousProjection: projection([asTransactionId("existing")], ["description"], 2),
            previousState: beforeMaterialization.value.state
        });

        expect(materialized).toMatchObject({
            ok: true,
            value: { state: { kind: "pending-activation" } }
        });
        if (!materialized.ok || materialized.value.state.kind !== "pending-activation") return;
        expect(materialized.value.state).toMatchObject({
            acceptedCommandId: "command",
            phase: "reveal",
            projectionGeneration: 3,
            target: { columnId: "description", transactionId: "target" }
        });
        expect(
            fulfillTransactionPendingActivation(
                materialized.value.state,
                {
                    acceptedCommandId: materialized.value.state.acceptedCommandId,
                    projectionGeneration: materialized.value.state.projectionGeneration
                },
                { kind: "navigating" }
            )
        ).toMatchObject({
            ok: true,
            value: {
                kind: "navigating",
                selection: [{ anchorRowId: "target", focusRowId: "target" }]
            }
        });
    });

    it.each(["transaction", "column"])(
        "aborts a neutral pending target when its exact %s disappears without fallback",
        (removedPart) => {
            const target = asTransactionId("target");
            const pending = beginTransactionPendingActivation({
                acceptedCommandId: asTransactionGridCommandId("command"),
                current: { kind: "idle", selection: [] },
                phase: "focus",
                projectionGeneration: asTransactionProjectionGeneration(1),
                target: { columnId: "description", transactionId: target }
            });
            const result = reconcileTransactionGridProjection({
                nextProjection: projection(
                    removedPart === "transaction" ? [asTransactionId("replacement")] : [target],
                    removedPart === "column" ? ["amount"] : ["description"],
                    2
                ),
                previousProjection: projection([target], ["description"], 1),
                previousState: pending
            });

            expect(result).toEqual({
                ok: true,
                value: {
                    cancelledDraft: false,
                    cancelledPopup: false,
                    focus: { kind: "none" },
                    generation: 2,
                    pins: { kind: "clear" },
                    state: { kind: "idle", selection: [] }
                }
            });
        }
    );

    it("aborts a reveal immediately when its target column is removed", () => {
        const target = asTransactionId("target");
        const indexReads: string[] = [];
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: { kind: "idle", selection: [] },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "description", transactionId: target }
        });

        expect(
            reconcileTransactionGridProjection({
                nextProjection: projection([target], ["amount"], 2, (id) => indexReads.push(id)),
                previousProjection: projection([target], ["description"], 1),
                previousState: pending
            })
        ).toEqual({
            ok: true,
            value: {
                cancelledDraft: false,
                cancelledPopup: false,
                focus: { kind: "none" },
                generation: 2,
                pins: { kind: "clear" },
                state: { kind: "idle", selection: [] }
            }
        });
        expect(indexReads).toEqual([]);
    });

    it("returns the reconciled engaged origin when a focus-phase target disappears", () => {
        const origin = asTransactionId("origin");
        const replacement = asTransactionId("replacement");
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: {
                kind: "engaged-origin",
                snapshot: {
                    focusOwner: { kind: "grid" },
                    state: navigating(origin, "description")
                }
            },
            phase: "focus",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "amount", transactionId: asTransactionId("missing-target") }
        });
        const result = reconcileTransactionGridProjection({
            nextProjection: projection([replacement], ["description", "amount"], 2),
            previousProjection: projection([origin], ["description", "amount"], 1),
            previousState: pending
        });

        expect(result.ok).toBe(true);
        if (!result.ok || result.value.state.kind !== "navigating") return;
        expect(result.value.state.selection[0]).toMatchObject({
            anchorColumnId: "description",
            anchorRowId: "replacement"
        });
        expect(result.value.pins).toEqual({
            kind: "active-only",
            transactionId: "replacement"
        });
    });

    it("returns neutral idle when a focus-phase origin reconciles through an empty result", () => {
        const origin = asTransactionId("origin");
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: {
                kind: "engaged-origin",
                snapshot: {
                    focusOwner: { kind: "grid" },
                    state: navigating(origin, "description")
                }
            },
            phase: "focus",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "description", transactionId: asTransactionId("target") }
        });
        const result = reconcileTransactionGridProjection({
            nextProjection: projection([], ["description"], 2),
            previousProjection: projection([origin], ["description"], 1),
            previousState: pending
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.state).toEqual({ kind: "idle", selection: [] });
        expect(result.value.pins).toEqual({ kind: "clear" });
    });

    it("defers after-grid focus when an engaged reveal origin reconciles through empty", () => {
        const origin = asTransactionId("origin");
        const target = asTransactionId("target");
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: {
                kind: "engaged-origin",
                snapshot: {
                    focusOwner: { kind: "grid" },
                    state: navigating(origin, "description")
                }
            },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "description", transactionId: target }
        });

        const result = reconcileTransactionGridProjection({
            nextProjection: projection([], ["description"], 2),
            previousProjection: projection([origin], ["description"], 1),
            previousState: pending
        });

        expect(result.ok).toBe(true);
        if (!result.ok || result.value.state.kind !== "pending-activation") return;
        expect(result.value.state).toMatchObject({
            acceptedCommandId: "command",
            origin: { kind: "neutral" },
            phase: "reveal",
            projectionGeneration: 2,
            target: { columnId: "description", transactionId: "target" }
        });
        expect(result.value.focus).toEqual({ kind: "none" });
        expect(result.value.pendingAbortFocus).toEqual({ kind: "after-grid" });
        expect(result.value.pins).toEqual({ kind: "pending-only", transactionId: "target" });
    });

    it("retains a parked origin range while a reveal target is absent and after it appears", () => {
        const origin = asTransactionId("origin");
        const extent = asTransactionId("extent");
        const target = asTransactionId("target");
        const retainedSelection = [
            {
                anchorColumnId: "description",
                anchorRowId: origin,
                focusColumnId: "amount",
                focusRowId: extent,
                operation: "include"
            }
        ] satisfies NonEmptyTransactionGridSelection;
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: {
                kind: "engaged-origin",
                snapshot: {
                    focusOwner: { kind: "external" },
                    state: { kind: "parked", selection: retainedSelection }
                }
            },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "description", transactionId: target }
        });
        const beforeMaterialization = reconcileTransactionGridProjection({
            nextProjection: projection([origin, extent], ["description", "amount"], 2),
            previousProjection: projection([origin, extent], ["description", "amount"], 1),
            previousState: pending
        });

        expect(beforeMaterialization).toMatchObject({
            ok: true,
            value: { state: { kind: "pending-activation", origin: { kind: "engaged" } } }
        });
        if (
            !beforeMaterialization.ok ||
            beforeMaterialization.value.state.kind !== "pending-activation" ||
            beforeMaterialization.value.state.origin.kind !== "engaged"
        ) {
            return;
        }
        expect(beforeMaterialization.value.state).toMatchObject({
            acceptedCommandId: "command",
            phase: "reveal",
            projectionGeneration: 2,
            target: { columnId: "description", transactionId: "target" }
        });
        expect(beforeMaterialization.value.state.origin.snapshot).toEqual({
            focusOwner: { kind: "external" },
            state: { kind: "parked", selection: retainedSelection }
        });
        expect(beforeMaterialization.value.pins).toEqual({
            activeTransactionId: "origin",
            kind: "active-and-pending",
            pendingTransactionId: "target"
        });

        const materialized = reconcileTransactionGridProjection({
            nextProjection: projection([origin, extent, target], ["description", "amount"], 3),
            previousProjection: projection([origin, extent], ["description", "amount"], 2),
            previousState: beforeMaterialization.value.state
        });

        expect(materialized).toMatchObject({
            ok: true,
            value: { state: { kind: "pending-activation", origin: { kind: "engaged" } } }
        });
        if (
            !materialized.ok ||
            materialized.value.state.kind !== "pending-activation" ||
            materialized.value.state.origin.kind !== "engaged"
        ) {
            return;
        }
        expect(materialized.value.state.origin.snapshot).toEqual({
            focusOwner: { kind: "external" },
            state: { kind: "parked", selection: retainedSelection }
        });
        expect(materialized.value.state.target.transactionId).toBe(target);
    });

    it("retains a navigating origin while a reveal target is absent", () => {
        const origin = asTransactionId("origin");
        const target = asTransactionId("target");
        const originState = {
            continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
            kind: "navigating",
            selection: [
                {
                    anchorColumnId: "description",
                    anchorRowId: origin,
                    focusColumnId: "description",
                    focusRowId: origin,
                    operation: "include"
                }
            ]
        } satisfies TransactionGridInteractionState;
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: {
                kind: "engaged-origin",
                snapshot: { focusOwner: { kind: "grid" }, state: originState }
            },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "amount", transactionId: target }
        });
        const result = reconcileTransactionGridProjection({
            nextProjection: projection([origin], ["description", "amount"], 2),
            previousProjection: projection([origin], ["description", "amount"], 1),
            previousState: pending
        });

        expect(result).toMatchObject({
            ok: true,
            value: { state: { kind: "pending-activation", origin: { kind: "engaged" } } }
        });
        if (
            !result.ok ||
            result.value.state.kind !== "pending-activation" ||
            result.value.state.origin.kind !== "engaged"
        ) {
            return;
        }
        expect(result.value.state.origin.snapshot).toEqual({
            focusOwner: { kind: "grid" },
            state: originState
        });
        expect(result.value.state).toMatchObject({
            acceptedCommandId: "command",
            phase: "reveal",
            projectionGeneration: 2,
            target: { columnId: "amount", transactionId: "target" }
        });
    });

    it("rebases the engaged origin before continuing exact pending target work", () => {
        const origin = asTransactionId("origin");
        const target = asTransactionId("target");
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command"),
            current: {
                kind: "engaged-origin",
                snapshot: {
                    focusOwner: { kind: "external" },
                    state: { kind: "parked", selection: selection(origin, "description") }
                }
            },
            phase: "focus",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: { columnId: "amount", transactionId: target }
        });
        const result = reconcileTransactionGridProjection({
            nextProjection: projection([target], ["description", "amount"], 2),
            previousProjection: projection([origin, target], ["description", "amount"], 1),
            previousState: pending
        });

        expect(result.ok).toBe(true);
        if (!result.ok || result.value.state.kind !== "pending-activation") return;
        expect(result.value.state.origin.kind).toBe("engaged");
        if (result.value.state.origin.kind !== "engaged") return;
        expect(result.value.state.origin.snapshot.state.kind).toBe("parked");
        expect(result.value.pins).toEqual({
            activeTransactionId: "target",
            kind: "active-and-pending",
            pendingTransactionId: "target"
        });
        const cancelled = cancelTransactionPendingActivation(result.value.state, {
            acceptedCommandId: result.value.state.acceptedCommandId,
            projectionGeneration: result.value.state.projectionGeneration
        });
        expect(cancelled).toEqual({ ok: true, value: result.value.state.origin.snapshot });
    });

    it("always returns either neutral idle, pending, or one canonical one-cell engagement", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), {
                    minLength: 1,
                    maxLength: 30
                }),
                fc.nat(),
                (rawIds, arbitraryIndex) => {
                    const ids = rawIds.map(asTransactionId);
                    const active = ids[arbitraryIndex % ids.length];
                    const nextIds = ids.filter((_id, index) => index % 3 !== 0);
                    const result = reconcileTransactionGridProjection({
                        focusOwner: { kind: "grid" },
                        nextProjection: projection(nextIds, ["date", "description"], 2),
                        previousProjection: projection(ids, ["date", "description"], 1),
                        previousState: navigating(active, "description")
                    });

                    expect(result.ok).toBe(true);
                    if (!result.ok) return;
                    if (
                        result.value.state.kind === "idle" ||
                        result.value.state.kind === "pending-activation"
                    ) {
                        return;
                    }
                    expect(result.value.state.selection).toHaveLength(1);
                    const [only] = result.value.state.selection;
                    expect(only.anchorRowId).toBe(only.focusRowId);
                    expect(only.anchorColumnId).toBe(only.focusColumnId);
                }
            ),
            { numRuns: 300 }
        );
    });
});

describe("transaction grid failure resolution", () => {
    const snapshot = {
        generation: asTransactionProjectionGeneration(5),
        resources: { scrollTop: 100 },
        state: navigating(asTransactionId("same"), "description")
    };

    it.each([
        {
            address: { columnId: "description", transactionId: asTransactionId("tx") },
            kind: "registration-timeout"
        },
        {
            address: { columnId: "description", transactionId: asTransactionId("tx") },
            kind: "focus-failed"
        },
        {
            address: { columnId: "description", transactionId: asTransactionId("tx") },
            kind: "load-failed"
        },
        {
            actualCommandId: asTransactionGridCommandId("current"),
            actualGeneration: asTransactionProjectionGeneration(5),
            expectedCommandId: asTransactionGridCommandId("stale"),
            expectedGeneration: asTransactionProjectionGeneration(4),
            kind: "stale-operation"
        }
    ] satisfies readonly TransactionGridOperationError[])(
        "applies same/current-generation policy to $kind",
        (error) => {
            expect(
                resolveTransactionGridFailure({
                    currentGeneration: snapshot.generation,
                    error,
                    newerReconciliation: emptyReconciliation(5),
                    snapshot
                })
            ).toEqual({ error, kind: "restore-snapshot", snapshot });
            expect(
                resolveTransactionGridFailure({
                    currentGeneration: asTransactionProjectionGeneration(6),
                    error,
                    newerReconciliation: emptyReconciliation(6),
                    snapshot
                }).kind
            ).toBe("use-newer-reconciliation");
        }
    );

    it("uses a newer reconciliation only when it exactly equals current generation", () => {
        const error = { index: 8, kind: "invalid-index" } as const;
        expect(
            resolveTransactionGridFailure({
                currentGeneration: asTransactionProjectionGeneration(7),
                error,
                newerReconciliation: emptyReconciliation(7),
                snapshot
            }).kind
        ).toBe("use-newer-reconciliation");
    });

    it("rejects a skipped reconciliation generation", () => {
        const error = { index: 8, kind: "invalid-index" } as const;
        expect(
            resolveTransactionGridFailure({
                currentGeneration: asTransactionProjectionGeneration(8),
                error,
                newerReconciliation: emptyReconciliation(7),
                snapshot
            })
        ).toEqual({
            error,
            kind: "invalid-reconciliation",
            reason: { current: 8, kind: "reconciliation-generation-mismatch", reconciliation: 7 }
        });
    });

    it("rejects reversed current and snapshot generations", () => {
        const error = { index: 8, kind: "invalid-index" } as const;
        expect(
            resolveTransactionGridFailure({
                currentGeneration: asTransactionProjectionGeneration(4),
                error,
                newerReconciliation: emptyReconciliation(4),
                snapshot
            })
        ).toEqual({
            error,
            kind: "invalid-reconciliation",
            reason: { current: 4, kind: "current-generation-precedes-snapshot", snapshot: 5 }
        });
    });
});
