import { describe, expect, it } from "vitest";

import {
    abortTransactionPendingActivation,
    activeTransactionGridAddress,
    asTransactionCompositionSequence,
    asTransactionGridCommandId,
    beginTransactionPendingActivation,
    cancelTransactionPendingActivation,
    clearTransactionContinuousEdit,
    fulfillTransactionPendingActivation,
    INACTIVE_TRANSACTION_COMPOSITION,
    moveTransactionContinuousEdit,
    NO_TRANSACTION_CONTINUOUS_EDIT,
    reduceTransactionComposition,
    transactionGridPins,
    transactionGridPresence,
    transactionGridSelectionVisibility,
    transitionTransactionContinuousEdit,
    type NonEmptyTransactionGridSelection,
    type TransactionGridEngagedSnapshot,
    type TransactionGridInteractionState
} from "@/components/features/transactions/table-model/grid-interaction-state";
import {
    asTransactionId,
    asTransactionProjectionGeneration
} from "@/components/features/transactions/table-model/ids";

const SELECTION: NonEmptyTransactionGridSelection = [
    {
        anchorColumnId: "description",
        anchorRowId: asTransactionId("tx-anchor"),
        focusColumnId: "amount",
        focusRowId: asTransactionId("tx-extent")
    }
];

const ENGAGED: TransactionGridEngagedSnapshot<string> = {
    focusOwner: { kind: "grid" },
    state: { continuous: NO_TRANSACTION_CONTINUOUS_EDIT, kind: "navigating", selection: SELECTION }
};

describe("transaction grid interaction state", () => {
    it("derives active identity from the latest operation anchor", () => {
        const selection: NonEmptyTransactionGridSelection = [
            ...SELECTION,
            {
                anchorColumnId: "date",
                anchorRowId: asTransactionId("tx-latest"),
                focusColumnId: "status",
                focusRowId: asTransactionId("tx-moving")
            }
        ];

        expect(activeTransactionGridAddress(selection)).toEqual({
            columnId: "date",
            transactionId: "tx-latest"
        });
    });

    it.each([
        [{ kind: "idle", selection: [] }, "suppressed"],
        [{ kind: "parked", selection: SELECTION }, "suppressed"],
        [
            {
                continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
                kind: "navigating",
                selection: SELECTION
            },
            "visible"
        ],
        [{ kind: "inspecting", selection: SELECTION }, "muted"]
    ] as const)("projects %s visibility", (state, expected) => {
        expect(transactionGridSelectionVisibility(state)).toBe(expected);
    });

    it("publishes only stable owner and active field identity", () => {
        const navigating: TransactionGridInteractionState = {
            continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
            kind: "navigating",
            selection: SELECTION
        };
        const editing: TransactionGridInteractionState<string> = {
            editor: {
                binding: { kind: "field" },
                composition: INACTIVE_TRANSACTION_COMPOSITION,
                continuous: { entry: "quick", kind: "continue" },
                draft: "private query",
                entry: "quick"
            },
            kind: "editing",
            selection: SELECTION
        };

        expect(transactionGridPresence(navigating)).toEqual({
            kind: "viewing",
            transactionId: "tx-anchor"
        });
        expect(transactionGridPresence(editing)).toEqual({
            columnId: "description",
            kind: "editing",
            transactionId: "tx-anchor"
        });
        expect(JSON.stringify(transactionGridPresence(editing))).not.toContain("private query");
        expect(JSON.stringify(transactionGridPresence(editing))).not.toContain("tx-extent");
    });

    it("represents neutral pending activation without publishing engagement", () => {
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command-1"),
            current: { kind: "idle", selection: [] },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(4),
            target: { columnId: "description", transactionId: asTransactionId("target") }
        });

        expect(pending).toMatchObject({
            acceptedCommandId: "command-1",
            kind: "pending-activation",
            origin: { kind: "neutral" },
            phase: "reveal",
            projectionGeneration: 4,
            target: { columnId: "description", transactionId: "target" }
        });
        expect(transactionGridPresence(pending)).toEqual({ kind: "none" });
        expect(transactionGridSelectionVisibility(pending)).toBe("suppressed");
        expect(transactionGridPins(pending)).toEqual([
            { kind: "pending-target", transactionId: "target" }
        ]);
        expect(JSON.stringify(pending)).not.toContain("selection");
    });

    it("bounds engaged pending activation to active-origin and exact target pins", () => {
        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command-2"),
            current: { kind: "engaged-origin", snapshot: ENGAGED },
            phase: "focus",
            projectionGeneration: asTransactionProjectionGeneration(7),
            target: { columnId: "actions", transactionId: asTransactionId("target") }
        });

        expect(transactionGridPresence(pending)).toEqual({ kind: "none" });
        expect(transactionGridPins(pending)).toEqual([
            { kind: "active-origin", transactionId: "tx-anchor" },
            { kind: "pending-target", transactionId: "target" }
        ]);
    });

    it("atomically replaces pending command identity, target, phase and pin", () => {
        const first = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command-1"),
            current: { kind: "engaged-origin", snapshot: ENGAGED },
            phase: "reveal",
            projectionGeneration: asTransactionProjectionGeneration(2),
            target: { columnId: "date", transactionId: asTransactionId("first") }
        });
        const second = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("command-2"),
            current: first,
            phase: "focus",
            projectionGeneration: asTransactionProjectionGeneration(2),
            target: { columnId: "amount", transactionId: asTransactionId("second") }
        });

        expect(second.origin).toBe(first.origin);
        expect(second.acceptedCommandId).toBe("command-2");
        expect(second.phase).toBe("focus");
        expect(transactionGridPins(second)).toEqual([
            { kind: "active-origin", transactionId: "tx-anchor" },
            { kind: "pending-target", transactionId: "second" }
        ]);
        expect(JSON.stringify(second)).not.toContain("first");
    });

    it("fulfillment clears both pending record and pending pin", () => {
        const acceptedCommandId = asTransactionGridCommandId("command");
        const projectionGeneration = asTransactionProjectionGeneration(1);
        const pending = beginTransactionPendingActivation({
            acceptedCommandId,
            current: { kind: "idle", selection: [] },
            phase: "focus",
            projectionGeneration,
            target: { columnId: "description", transactionId: asTransactionId("target") }
        });
        const fulfilled = fulfillTransactionPendingActivation(
            pending,
            { acceptedCommandId, projectionGeneration },
            { kind: "navigating" }
        );

        expect(fulfilled.ok).toBe(true);
        if (!fulfilled.ok) return;
        expect(fulfilled.value.kind).toBe("navigating");
        expect(transactionGridPins(fulfilled.value)).toEqual([
            { kind: "active-origin", transactionId: "target" }
        ]);
        expect(JSON.stringify(fulfilled.value)).not.toContain("command");
        expect(JSON.stringify(fulfilled.value)).not.toContain("pending-target");
    });

    it("cancellation clears neutral pending record and pin", () => {
        const acceptedCommandId = asTransactionGridCommandId("command");
        const projectionGeneration = asTransactionProjectionGeneration(1);
        const pending = beginTransactionPendingActivation({
            acceptedCommandId,
            current: { kind: "idle", selection: [] },
            phase: "reveal",
            projectionGeneration,
            target: { columnId: "description", transactionId: asTransactionId("target") }
        });
        const cancelled = cancelTransactionPendingActivation(pending, {
            acceptedCommandId,
            projectionGeneration
        });

        expect(cancelled).toEqual({ ok: true, value: { kind: "idle", selection: [] } });
        if (!cancelled.ok || !("kind" in cancelled.value)) return;
        expect(transactionGridPins(cancelled.value)).toEqual([]);
    });

    it("cancellation restores the latest engaged origin without the target", () => {
        const acceptedCommandId = asTransactionGridCommandId("command");
        const projectionGeneration = asTransactionProjectionGeneration(1);
        const pending = beginTransactionPendingActivation({
            acceptedCommandId,
            current: { kind: "engaged-origin", snapshot: ENGAGED },
            phase: "focus",
            projectionGeneration,
            target: { columnId: "amount", transactionId: asTransactionId("target") }
        });

        expect(
            cancelTransactionPendingActivation(pending, {
                acceptedCommandId,
                projectionGeneration
            })
        ).toEqual({ ok: true, value: ENGAGED });
    });

    it.each(["fulfill", "cancel"] as const)("rejects late %s after a replacement", (completion) => {
        const firstCommandId = asTransactionGridCommandId("command-1");
        const secondCommandId = asTransactionGridCommandId("command-2");
        const generation = asTransactionProjectionGeneration(2);
        const first = beginTransactionPendingActivation({
            acceptedCommandId: firstCommandId,
            current: { kind: "idle", selection: [] },
            phase: "reveal",
            projectionGeneration: generation,
            target: { columnId: "date", transactionId: asTransactionId("first") }
        });
        const second = beginTransactionPendingActivation({
            acceptedCommandId: secondCommandId,
            current: first,
            phase: "focus",
            projectionGeneration: generation,
            target: { columnId: "amount", transactionId: asTransactionId("second") }
        });
        const expected = {
            acceptedCommandId: firstCommandId,
            projectionGeneration: generation
        };
        const result =
            completion === "fulfill"
                ? fulfillTransactionPendingActivation(second, expected, { kind: "navigating" })
                : cancelTransactionPendingActivation(second, expected);

        expect(result).toEqual({
            error: {
                actualCommandId: secondCommandId,
                actualGeneration: generation,
                expectedCommandId: firstCommandId,
                expectedGeneration: generation,
                kind: "stale-operation"
            },
            ok: false
        });
    });

    it("applies the same current-command authority to aborts", () => {
        const acceptedCommandId = asTransactionGridCommandId("command");
        const generation = asTransactionProjectionGeneration(3);
        const current: TransactionGridInteractionState = {
            continuous: NO_TRANSACTION_CONTINUOUS_EDIT,
            kind: "navigating",
            selection: SELECTION
        };

        expect(
            abortTransactionPendingActivation(current, {
                acceptedCommandId,
                projectionGeneration: generation
            })
        ).toEqual({
            error: {
                actualCommandId: null,
                actualGeneration: null,
                expectedCommandId: acceptedCommandId,
                expectedGeneration: generation,
                kind: "stale-operation"
            },
            ok: false
        });
    });

    it.each(["quick", "full"] as const)(
        "retains canonical %s intent through activation cells and resumes on editable movement",
        (entry) => {
            const continuous = { entry, kind: "continue" } as const;
            const editing = {
                editor: {
                    binding: { kind: "field" } as const,
                    composition: INACTIVE_TRANSACTION_COMPOSITION,
                    continuous,
                    draft: "draft",
                    entry
                },
                kind: "editing" as const,
                selection: SELECTION
            };
            const activation = moveTransactionContinuousEdit(editing, SELECTION, false);
            const action = moveTransactionContinuousEdit(activation.state, SELECTION, false);
            const editable = moveTransactionContinuousEdit(action.state, SELECTION, true);

            expect(activation).toEqual({
                resumeEntry: null,
                state: { continuous, kind: "navigating", selection: SELECTION }
            });
            expect(action).toEqual(activation);
            expect(editable).toEqual({
                resumeEntry: entry,
                state: { continuous, kind: "navigating", selection: SELECTION }
            });
            expect(transitionTransactionContinuousEdit(continuous, true)).toEqual({
                continuous,
                entry,
                kind: "resume"
            });
        }
    );

    it.each([
        "pointer-selection",
        "inspector-entry",
        "escape",
        "grid-boundary-tab",
        "external-blur"
    ] as const)("clears canonical continuous intent for %s", (reason) => {
        expect(
            clearTransactionContinuousEdit(
                {
                    continuous: { entry: "quick", kind: "continue" },
                    kind: "navigating",
                    selection: SELECTION
                },
                reason
            ).continuous
        ).toEqual(NO_TRANSACTION_CONTINUOUS_EDIT);
    });
});

describe("transaction grid IME composition", () => {
    it("applies authoritative final input exactly once and retains a consumed barrier", () => {
        const sequence = asTransactionCompositionSequence(7);
        const started = reduceTransactionComposition(INACTIVE_TRANSACTION_COMPOSITION, {
            kind: "start",
            sequence
        });
        const ended = reduceTransactionComposition(started.composition, {
            data: "日本",
            kind: "end"
        });
        const inserted = reduceTransactionComposition(ended.composition, {
            data: "日本",
            kind: "authoritative-insertion",
            sequence
        });
        const lateFallback = reduceTransactionComposition(inserted.composition, {
            kind: "fallback",
            sequence
        });

        expect(inserted).toEqual({
            composition: { kind: "consumed", sequence },
            insertedText: "日本"
        });
        expect(lateFallback.insertedText).toBeNull();
        expect(
            reduceTransactionComposition(lateFallback.composition, { kind: "resume", sequence })
        ).toEqual({ composition: { kind: "inactive" }, insertedText: null });
    });

    it("deduplicates late authoritative input from an older overlapping sequence", () => {
        const first = asTransactionCompositionSequence(8);
        const second = asTransactionCompositionSequence(9);
        const firstStarted = reduceTransactionComposition(INACTIVE_TRANSACTION_COMPOSITION, {
            kind: "start",
            sequence: first
        });
        const firstEnded = reduceTransactionComposition(firstStarted.composition, {
            data: "é",
            kind: "end"
        });
        const secondStarted = reduceTransactionComposition(firstEnded.composition, {
            kind: "start",
            sequence: second
        });
        const lateFirst = reduceTransactionComposition(secondStarted.composition, {
            data: "é",
            kind: "authoritative-insertion",
            sequence: first
        });
        const secondEnded = reduceTransactionComposition(lateFirst.composition, {
            data: "ê",
            kind: "end"
        });

        expect(lateFirst.insertedText).toBeNull();
        expect(
            reduceTransactionComposition(secondEnded.composition, {
                data: "ê",
                kind: "authoritative-insertion",
                sequence: second
            }).insertedText
        ).toBe("ê");
    });

    it("uses fallback once and ignores a later authoritative insertion", () => {
        const sequence = asTransactionCompositionSequence(10);
        const started = reduceTransactionComposition(INACTIVE_TRANSACTION_COMPOSITION, {
            kind: "start",
            sequence
        });
        const ended = reduceTransactionComposition(started.composition, {
            data: "한",
            kind: "end"
        });
        const fallback = reduceTransactionComposition(ended.composition, {
            kind: "fallback",
            sequence
        });

        expect(fallback.insertedText).toBe("한");
        expect(
            reduceTransactionComposition(fallback.composition, {
                data: "한",
                kind: "authoritative-insertion",
                sequence
            }).insertedText
        ).toBeNull();
    });

    it("keeps an empty composition behind the same consumed barrier", () => {
        const sequence = asTransactionCompositionSequence(11);
        const started = reduceTransactionComposition(INACTIVE_TRANSACTION_COMPOSITION, {
            kind: "start",
            sequence
        });

        expect(
            reduceTransactionComposition(started.composition, { data: "", kind: "end" })
        ).toEqual({ composition: { kind: "consumed", sequence }, insertedText: null });
    });
});
