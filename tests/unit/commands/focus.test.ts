import { afterEach, describe, expect, it } from "vitest";

import { isTextEntryTarget, shortcutFocusOf } from "@/lib/commands";

afterEach(() => {
    document.body.replaceChildren();
});

describe("shortcut focus", () => {
    it("treats inputs and every contenteditable form as text entry", () => {
        const input = document.createElement("input");
        const editable = document.createElement("div");
        editable.setAttribute("contenteditable", "true");
        const child = document.createElement("span");
        editable.append(child);
        const plaintext = document.createElement("div");
        plaintext.setAttribute("contenteditable", "plaintext-only");
        const textbox = document.createElement("div");
        textbox.setAttribute("role", "textbox");
        document.body.append(input, editable, plaintext, textbox);

        for (const target of [input, child, plaintext, textbox]) {
            expect(isTextEntryTarget(target)).toBe(true);
        }
        expect(isTextEntryTarget(document.body)).toBe(false);
        expect(isTextEntryTarget(null)).toBe(false);
    });

    it("knows when focus is inside the grid", () => {
        const grid = document.createElement("div");
        grid.setAttribute("role", "grid");
        const cell = document.createElement("div");
        cell.setAttribute("role", "gridcell");
        const editor = document.createElement("input");
        cell.append(editor);
        grid.append(cell);
        document.body.append(grid);

        expect(shortcutFocusOf(cell)).toEqual({ inGrid: true, inTextEntry: false });
        expect(shortcutFocusOf(editor)).toEqual({ inGrid: true, inTextEntry: true });
        expect(shortcutFocusOf(document.body)).toEqual({ inGrid: false, inTextEntry: false });
    });
});
