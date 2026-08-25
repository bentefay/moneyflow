import { describe, expect, expectTypeOf, it } from "vitest";

import {
    asTransactionCompositionSequence,
    asTransactionGridCommandId,
    beginTransactionPendingActivation,
    INACTIVE_TRANSACTION_COMPOSITION
} from "@/components/features/transactions/table-model/grid-interaction-state";
import {
    activationTransactionGridKeyCell,
    editableTransactionGridKeyCell,
    transactionGridCompositionStartIntent,
    transactionGridKeyContext,
    transactionGridKeyIntent,
    type TransactionGridKeyCellContext,
    type TransactionGridKeyContext
} from "@/components/features/transactions/table-model/grid-key-intent";
import {
    asTransactionId,
    asTransactionProjectionGeneration
} from "@/components/features/transactions/table-model/ids";

const NAVIGATING: TransactionGridKeyContext = {
    cell: editableTransactionGridKeyCell(),
    mode: "navigating"
};

function key(
    value: string,
    modifiers: Partial<{
        altKey: boolean;
        ctrlKey: boolean;
        isComposing: boolean;
        keyCode: number;
        metaKey: boolean;
        shiftKey: boolean;
    }> = {}
) {
    return {
        altKey: false,
        ctrlKey: false,
        isComposing: false,
        key: value,
        keyCode: 0,
        metaKey: false,
        shiftKey: false,
        ...modifiers
    };
}

describe("transaction grid key intent", () => {
    it("makes activation and editable key contexts mutually exclusive", () => {
        expectTypeOf<{
            readonly activation: "checkbox";
            readonly editable: true;
        }>().not.toMatchTypeOf<TransactionGridKeyCellContext>();
        expectTypeOf<{
            readonly activation: "inspector";
            readonly editable: true;
        }>().not.toMatchTypeOf<TransactionGridKeyCellContext>();
        expectTypeOf(
            editableTransactionGridKeyCell()
        ).toMatchTypeOf<TransactionGridKeyCellContext>();
        expectTypeOf(
            activationTransactionGridKeyCell("checkbox")
        ).toMatchTypeOf<TransactionGridKeyCellContext>();
    });

    it("derives key ownership from canonical state and immutable column capabilities", () => {
        const base = {
            automationField: null,
            copyable: true,
            focusable: true,
            popupOwner: "none",
            selectable: true
        } as const;

        expect(
            transactionGridKeyContext(
                { kind: "idle", selection: [] },
                {
                    ...base,
                    activationKind: "none",
                    editKind: "date",
                    popupOwner: "grid-editor"
                }
            )
        ).toEqual({
            cell: { activation: "none", editable: true, tabBehavior: "open-calendar" },
            mode: "idle"
        });
        expect(
            transactionGridKeyContext(
                { kind: "idle", selection: [] },
                {
                    ...base,
                    activationKind: "checkbox",
                    copyable: false,
                    editKind: "none"
                }
            )
        ).toEqual({
            cell: { activation: "checkbox", editable: false },
            mode: "idle"
        });

        const pending = beginTransactionPendingActivation({
            acceptedCommandId: asTransactionGridCommandId("pending-key-context"),
            current: { kind: "idle", selection: [] },
            phase: "focus",
            projectionGeneration: asTransactionProjectionGeneration(1),
            target: {
                columnId: "date",
                transactionId: asTransactionId("transaction-1")
            }
        });
        expect(
            transactionGridKeyContext(pending, {
                ...base,
                activationKind: "none",
                editKind: "date",
                popupOwner: "grid-editor"
            })
        ).toBeNull();
    });

    it.each([
        ["idle", "Enter", "establish"],
        ["parked", "Enter", "expose-selection"],
        ["navigating", "Enter", "enter-edit"],
        ["editing-quick", "Enter", "commit-and-move"],
        ["editing-full", "Enter", "commit-and-move"],
        ["interacting-grid-editor", "Enter", "native"],
        ["inspecting", "Enter", "native"],
        ["interacting-inspector", "Enter", "native"]
    ] as const)("maps %s + Enter to %s", (mode, pressed, expected) => {
        expect(
            transactionGridKeyIntent(
                {
                    cell: { activation: "none", editable: true },
                    mode
                },
                key(pressed)
            ).kind
        ).toBe(expected);
    });

    it("enters quick edit for printable input and leaves F2 unbound", () => {
        expect(transactionGridKeyIntent(NAVIGATING, key("x"))).toEqual({
            kind: "enter-edit",
            entry: "quick",
            initialText: "x"
        });
        expect(transactionGridKeyIntent(NAVIGATING, key("F2"))).toEqual({ kind: "native" });
    });

    it("activates checkbox and actions cells without activating on navigation", () => {
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "checkbox", editable: false }, mode: "navigating" },
                key("Enter")
            )
        ).toEqual({ activation: "checkbox", kind: "activate" });
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "inspector", editable: false }, mode: "navigating" },
                key(" ")
            )
        ).toEqual({ activation: "inspector", kind: "activate" });
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "checkbox", editable: false }, mode: "navigating" },
                key("ArrowRight")
            )
        ).toEqual({ direction: "right", kind: "move" });
    });

    it.each(["checkbox", "inspector"] as const)(
        "does not quick-edit or compose in %s activation cells",
        (activation) => {
            const cell = activationTransactionGridKeyCell(activation);

            expect(transactionGridKeyIntent({ cell, mode: "navigating" }, key("x"))).toEqual({
                kind: "native"
            });
            expect(
                transactionGridCompositionStartIntent({ cell, mode: "navigating" }, true)
            ).toEqual({ kind: "ignore-composition" });
        }
    );

    it("layers Escape through popup, edit, navigation, and parked state", () => {
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "interacting-grid-editor" },
                key("Escape")
            )
        ).toEqual({ kind: "close-interaction" });
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "editing-quick" },
                key("Escape")
            )
        ).toEqual({ kind: "cancel-edit" });
        expect(transactionGridKeyIntent(NAVIGATING, key("Escape"))).toEqual({ kind: "park" });
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "parked" },
                key("Escape")
            )
        ).toEqual({ kind: "native" });
    });

    it("keeps full-edit horizontal keys and native shortcuts in the editor", () => {
        const context: TransactionGridKeyContext = {
            cell: { activation: "none", editable: true },
            mode: "editing-full"
        };
        expect(transactionGridKeyIntent(context, key("ArrowLeft"))).toEqual({ kind: "native" });
        expect(transactionGridKeyIntent(context, key("Home", { shiftKey: true }))).toEqual({
            kind: "native"
        });
        expect(transactionGridKeyIntent(context, key("a", { ctrlKey: true }))).toEqual({
            kind: "native"
        });
        expect(transactionGridKeyIntent(context, key("c", { metaKey: true }))).toEqual({
            kind: "native"
        });
        expect(transactionGridKeyIntent(context, key("ArrowUp"))).toEqual({
            direction: "up",
            kind: "commit-and-move",
            preserveEntry: "full"
        });
    });

    it.each([
        ["Home", {}],
        ["End", {}],
        ["Home", { shiftKey: true }],
        ["End", { shiftKey: true }],
        ["Home", { altKey: true }],
        ["End", { altKey: true }],
        ["Home", { altKey: true, shiftKey: true }],
        ["End", { altKey: true, shiftKey: true }],
        ["Home", { ctrlKey: true }],
        ["End", { metaKey: true }]
    ] as const)("keeps full-edit %s modifiers native", (pressed, modifiers) => {
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "editing-full" },
                key(pressed, modifiers)
            )
        ).toEqual({ kind: "native" });
    });

    it("assigns Alt to grid movement only for arrows", () => {
        expect(transactionGridKeyIntent(NAVIGATING, key("PageDown", { altKey: true }))).toEqual({
            kind: "native"
        });
        expect(transactionGridKeyIntent(NAVIGATING, key("Home", { altKey: true }))).toEqual({
            kind: "native"
        });
        expect(transactionGridKeyIntent(NAVIGATING, key("ArrowDown", { altKey: true }))).toEqual({
            direction: "down",
            kind: "move"
        });
    });

    it("keeps grid movement for quick edit and modifier extension", () => {
        const quick: TransactionGridKeyContext = {
            cell: { activation: "none", editable: true },
            mode: "editing-quick"
        };
        expect(transactionGridKeyIntent(quick, key("ArrowLeft"))).toEqual({
            direction: "left",
            kind: "commit-and-move",
            preserveEntry: "quick"
        });
        expect(transactionGridKeyIntent(quick, key("ArrowDown", { shiftKey: true }))).toEqual({
            direction: "down",
            kind: "commit-and-extend"
        });
        expect(transactionGridKeyIntent(quick, key("ArrowRight", { altKey: true }))).toEqual({
            direction: "right",
            kind: "commit-and-move",
            preserveEntry: "quick"
        });
    });

    it.each([
        ["ArrowLeft", {}, { direction: "left", kind: "move" }],
        ["ArrowRight", { shiftKey: true }, { direction: "right", kind: "extend" }],
        ["ArrowUp", { altKey: true }, { direction: "up", kind: "move" }],
        ["ArrowDown", { altKey: true, shiftKey: true }, { direction: "down", kind: "extend" }],
        ["Home", {}, { kind: "move-to", target: { kind: "row-start" } }],
        ["End", {}, { kind: "move-to", target: { kind: "row-end" } }],
        ["Home", { ctrlKey: true }, { kind: "move-to", target: { kind: "grid-start" } }],
        ["End", { metaKey: true }, { kind: "move-to", target: { kind: "grid-end" } }],
        ["PageUp", {}, { kind: "move-to", target: { kind: "page-up" } }],
        ["PageDown", { shiftKey: true }, { kind: "extend-to", target: { kind: "page-down" } }]
    ] as const)(
        "maps navigating %s with modifiers to projection intent",
        (pressed, modifiers, expected) => {
            expect(transactionGridKeyIntent(NAVIGATING, key(pressed, modifiers))).toEqual(expected);
        }
    );

    it.each([
        ["idle", false, { kind: "establish", target: { kind: "grid-start" } }],
        ["idle", true, { kind: "establish", target: { kind: "grid-end" } }],
        ["navigating", false, { direction: "forward", kind: "traverse-tab" }],
        ["navigating", true, { direction: "reverse", kind: "traverse-tab" }],
        ["editing-quick", false, { direction: "forward", kind: "traverse-tab" }],
        ["editing-full", true, { direction: "reverse", kind: "traverse-tab" }],
        ["interacting-grid-editor", false, { kind: "native" }],
        ["interacting-inspector", true, { kind: "native" }],
        ["inspecting", false, { kind: "native" }]
    ] as const)("maps %s Tab shift=%s", (mode, shiftKey, expected) => {
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode },
                key("Tab", { shiftKey })
            )
        ).toEqual(expected);
    });

    it("opens the date calendar only from forward full-edit Tab", () => {
        const dateEditor: TransactionGridKeyContext = {
            cell: { activation: "none", editable: true, tabBehavior: "open-calendar" },
            mode: "editing-full"
        };

        expect(transactionGridKeyIntent(dateEditor, key("Tab"))).toEqual({
            kind: "open-interaction",
            popup: "calendar"
        });
        expect(transactionGridKeyIntent(dateEditor, key("Tab", { shiftKey: true }))).toEqual({
            direction: "reverse",
            kind: "traverse-tab"
        });
    });

    it("does not assign primary-modified arrows to the grid", () => {
        expect(transactionGridKeyIntent(NAVIGATING, key("ArrowLeft", { ctrlKey: true }))).toEqual({
            kind: "native"
        });
        expect(transactionGridKeyIntent(NAVIGATING, key("ArrowRight", { metaKey: true }))).toEqual({
            kind: "native"
        });
    });

    it("models compositionstart ownership before preview input", () => {
        expect(transactionGridCompositionStartIntent(NAVIGATING, true)).toEqual({
            kind: "begin-quick-composition",
            prepare: "none"
        });
        expect(
            transactionGridCompositionStartIntent(
                { cell: { activation: "none", editable: true }, mode: "parked" },
                true
            )
        ).toEqual({ kind: "begin-quick-composition", prepare: "expose-selection" });
        expect(
            transactionGridCompositionStartIntent(
                { cell: { activation: "none", editable: true }, mode: "idle" },
                false
            )
        ).toEqual({ kind: "ignore-composition" });
        expect(
            transactionGridCompositionStartIntent(
                { cell: { activation: "none", editable: true }, mode: "editing-full" },
                true
            )
        ).toEqual({ kind: "ignore-composition" });
    });

    it("makes copy and select-all native outside navigation", () => {
        expect(transactionGridKeyIntent(NAVIGATING, key("c", { ctrlKey: true }))).toEqual({
            kind: "copy"
        });
        expect(transactionGridKeyIntent(NAVIGATING, key("a", { metaKey: true }))).toEqual({
            kind: "select-all"
        });
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "editing-quick" },
                key("c", { ctrlKey: true })
            )
        ).toEqual({ kind: "native" });
    });

    it("preserves the requested command while establishing or exposing selection", () => {
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "parked" },
                key("ArrowRight")
            )
        ).toEqual({
            kind: "expose-selection",
            then: { direction: "right", kind: "move" }
        });
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "idle" },
                key("x")
            )
        ).toEqual({
            kind: "establish",
            then: { entry: "quick", initialText: "x", kind: "enter-edit" }
        });
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: true }, mode: "parked" },
                key("Tab", { shiftKey: true })
            )
        ).toEqual({
            kind: "expose-selection",
            then: { direction: "reverse", kind: "traverse-tab" }
        });
    });

    it("closes the inspector after its popup layer is gone", () => {
        expect(
            transactionGridKeyIntent(
                { cell: { activation: "none", editable: false }, mode: "inspecting" },
                key("Escape")
            )
        ).toEqual({ kind: "close-inspector" });
    });

    it.each(["Enter", "Escape"])(
        "does not reinterpret composition-ending %s before the consumed barrier resumes",
        (pressed) => {
            const sequence = asTransactionCompositionSequence(12);
            const consumed = { kind: "consumed", sequence } as const;

            expect(
                transactionGridKeyIntent({ ...NAVIGATING, composition: consumed }, key(pressed))
            ).toEqual({ kind: "composition-owned" });
            expect(
                transactionGridKeyIntent(
                    { ...NAVIGATING, composition: INACTIVE_TRANSACTION_COMPOSITION },
                    key(pressed)
                ).kind
            ).not.toBe("composition-owned");
        }
    );

    it("suppresses all grid commands throughout composition and legacy keyCode 229", () => {
        expect(transactionGridKeyIntent(NAVIGATING, key("Enter", { isComposing: true }))).toEqual({
            kind: "composition-owned"
        });
        expect(transactionGridKeyIntent(NAVIGATING, key("ArrowDown", { keyCode: 229 }))).toEqual({
            kind: "composition-owned"
        });
        expect(
            transactionGridKeyIntent(
                {
                    ...NAVIGATING,
                    composition: {
                        kind: "active",
                        preview: "",
                        sequence: asTransactionCompositionSequence(1)
                    }
                },
                key("ArrowDown")
            )
        ).toEqual({ kind: "composition-owned" });
    });
});
