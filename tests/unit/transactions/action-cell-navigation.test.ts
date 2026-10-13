import { describe, expect, it } from "vitest";

import { actionCellKeyResult } from "@/components/features/transactions/cells/action-cell-navigation";

const PLAIN = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

describe("actionCellKeyResult", () => {
    it.each([
        ["Right moves to the next button", 0, 2, "ArrowRight", { kind: "focus-button", index: 1 }],
        [
            "Left moves to the previous button",
            1,
            2,
            "ArrowLeft",
            { kind: "focus-button", index: 0 }
        ],
        ["Right stops at the last button", 1, 2, "ArrowRight", { kind: "stay" }],
        ["Left stops at the first button", 0, 2, "ArrowLeft", { kind: "stay" }],
        ["a single button never moves", 0, 1, "ArrowRight", { kind: "stay" }],
        ["Escape returns to the cell", 1, 2, "Escape", { kind: "return-to-cell" }],
        ["Enter stays native so the button activates once", 0, 2, "Enter", { kind: "native" }],
        ["Space stays native so the button activates once", 0, 2, " ", { kind: "native" }],
        ["Up stays native", 0, 2, "ArrowUp", { kind: "native" }]
    ] as const)("%s", (_name, index, count, key, expected) => {
        expect(actionCellKeyResult(index, count, { ...PLAIN, key })).toEqual(expected);
    });

    it.each([
        { ...PLAIN, altKey: true },
        { ...PLAIN, ctrlKey: true },
        { ...PLAIN, metaKey: true },
        { ...PLAIN, shiftKey: true }
    ])("leaves modified arrows to the grid and the browser: %o", (modifiers) => {
        expect(actionCellKeyResult(0, 2, { ...modifiers, key: "ArrowRight" })).toEqual({
            kind: "native"
        });
    });
});
