import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import {
    INNER_CELL_FOCUS_CHROME,
    PARKED_ACTION_FOCUS_CHROME,
    RESTING_CELL_CHROME,
    TRANSACTION_GRID_EDITOR_INLINE_CHROME,
    TRANSACTION_GRIDCELL_CHROME,
    TRANSACTION_GRIDCELL_FOCUS_CHROME,
    TRANSACTION_GRID_HEADER_CELL_CHROME
} from "@/components/features/transactions/cells/cell-chrome";
import { CheckboxCell } from "@/components/features/transactions/cells/CheckboxCell";
import { InlineEditableDate } from "@/components/features/transactions/cells/InlineEditableDate";
import { InlineEditableTags } from "@/components/features/transactions/cells/InlineEditableTags";
import { cn } from "@/lib/utils";

const SHARED_PRIMITIVE_BASES = {
    input: "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive",
    select: "border-input dark:bg-input/30 dark:hover:bg-input/50 flex rounded-md border bg-transparent px-3 py-2 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50",
    outlineButton:
        "bg-background hover:bg-accent dark:border-input dark:bg-input/30 dark:hover:bg-input/50 border px-4 has-[>svg]:px-3 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
} as const;

function utilities(classes: string): string[] {
    return classes.split(" ").filter((utility) => utility.length > 0);
}

describe("transaction spreadsheet chrome", () => {
    it("makes staged inner controls square and visually neutral in every owned state", () => {
        for (const [primitive, base] of Object.entries(SHARED_PRIMITIVE_BASES)) {
            const merged = utilities(cn(base, RESTING_CELL_CHROME));
            expect(merged, primitive).toContain("rounded-none");
            expect(merged, primitive).toContain("bg-transparent");
            expect(merged, primitive).toContain("dark:bg-transparent");
            expect(merged, primitive).toContain("hover:bg-transparent");
            expect(merged, primitive).toContain("dark:hover:bg-transparent");
            expect(merged, primitive).toContain("border-transparent");
            expect(merged, primitive).toContain("focus-visible:ring-0");
            expect(merged, primitive).toContain("focus-visible:border-transparent");
            expect(merged, primitive).toContain("aria-invalid:border-transparent");
            expect(merged, primitive).not.toContain("rounded-md");
            expect(merged, primitive).not.toContain("focus-visible:ring-[3px]");
            expect(merged, primitive).not.toContain("hover:bg-accent");
            expect(merged, primitive).not.toContain("dark:hover:bg-input/50");
            expect(merged, primitive).not.toContain("aria-invalid:border-destructive");
        }
    });

    it("cancels primitive inline padding so editor text starts at the outer cell inset", () => {
        for (const [primitive, base] of Object.entries(SHARED_PRIMITIVE_BASES)) {
            const merged = utilities(cn(base, TRANSACTION_GRID_EDITOR_INLINE_CHROME));
            expect(merged, primitive).toContain("px-0");
            expect(merged, primitive).toContain("has-[>svg]:px-0");
            expect(merged, primitive).not.toContain("px-3");
            expect(merged, primitive).not.toContain("px-4");
            expect(merged, primitive).not.toContain("has-[>svg]:px-3");
        }
    });

    it("suppresses focus rings on non-primitive descendants too", () => {
        const merged = utilities(
            cn(
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                INNER_CELL_FOCUS_CHROME
            )
        );
        expect(merged).toContain("focus-visible:ring-0");
        expect(merged).toContain("focus-visible:ring-offset-0");
        expect(merged).not.toContain("focus-visible:ring-2");
    });

    it("restores a parked action descendant outline without reviving its neutralized ring", () => {
        const merged = utilities(PARKED_ACTION_FOCUS_CHROME);
        expect(merged).toEqual(
            expect.arrayContaining([
                "focus-visible:outline-2",
                "focus-visible:outline-ring",
                "focus-visible:outline-solid",
                "focus-visible:-outline-offset-2",
                "focus-visible:ring-0"
            ])
        );
        expect(merged).not.toContain("focus-visible:outline-none");
    });

    it("puts spacing, neighboring rules and validation paint on the outer gridcell", () => {
        const chrome = utilities(TRANSACTION_GRIDCELL_CHROME);
        expect(chrome).toEqual(
            expect.arrayContaining([
                "h-full",
                "overflow-hidden",
                "rounded-none",
                "border-r",
                "border-b",
                "border-border/60",
                "px-2",
                "has-[[aria-invalid=true]]:ring-2"
            ])
        );
        expect(chrome.some((utility) => utility.startsWith("aria-selected:"))).toBe(false);
        expect(chrome).not.toEqual(
            expect.arrayContaining(["gap-4", "rounded-md", "focus-within:ring-2"])
        );
    });

    it("keeps whole-cell focus paint separable from parked geometry", () => {
        expect(utilities(TRANSACTION_GRIDCELL_FOCUS_CHROME)).toEqual(
            expect.arrayContaining([
                "focus-within:ring-2",
                "focus-within:ring-inset",
                "focus-visible:ring-2",
                "focus-visible:ring-inset"
            ])
        );
    });

    it("uses the same square neighboring rules for the header tracks", () => {
        expect(utilities(TRANSACTION_GRID_HEADER_CELL_CHROME)).toEqual(
            expect.arrayContaining([
                "rounded-none",
                "border-r",
                "border-b",
                "border-border/60",
                "px-2",
                "py-2"
            ])
        );
    });

    it.each([false, true])(
        "gives a parked data-row checkbox an inset outline when checked=%s",
        (checked) => {
            render(
                createElement(CheckboxCell, {
                    ariaLabel: "Select transaction",
                    checked,
                    onChange: vi.fn(),
                    rowGeometry: "dataRow",
                    showFocusIndicator: true
                })
            );

            const checkbox = screen.getByRole("checkbox", { name: "Select transaction" });
            expect(checkbox.className).toContain("focus-visible:outline-2");
            expect(checkbox.className).toContain("focus-visible:-outline-offset-2");
            expect(checkbox.className).not.toContain("focus-visible:outline-none");
        }
    );

    it("gives a tag pill remove button an inset focus outline", () => {
        render(
            createElement(InlineEditableTags, {
                availableTags: [],
                onSave: vi.fn(),
                tags: [
                    {
                        id: "tag-1",
                        name: "Long household groceries and recurring provisions"
                    }
                ],
                value: ["tag-1"]
            })
        );

        const remove = screen.getByRole("button", {
            name: "Remove Long household groceries and recurring provisions"
        });
        expect(remove.className).toContain("focus-visible:outline-2");
        expect(remove.className).toContain("focus-visible:-outline-offset-2");
        expect(remove.className).not.toContain("focus-visible:outline-none");
        const strip = remove.closest("[data-tag-strip]");
        if (!(strip instanceof HTMLElement)) throw new Error("tag editor strip is missing");
        expect(strip.className).toContain("px-0");
        expect(strip.className).not.toContain("px-1");
    });

    it("neutralizes the calendar trigger's resting and hover chrome", () => {
        render(createElement(InlineEditableDate, { onSave: vi.fn(), value: "2026-08-25" }));

        const input = screen.getByRole("textbox");
        expect(input.className).toContain("px-0");
        expect(input.className).toContain("pr-6");
        expect(input.className).not.toContain("px-3");
        expect(input.className).not.toContain("pr-8");

        const trigger = screen.getByRole("button", { name: "Open calendar" });
        expect(trigger.className).toContain("rounded-none");
        expect(trigger.className).toContain("hover:bg-transparent");
        expect(trigger.className).toContain("dark:hover:bg-transparent");
        expect(trigger.className).not.toContain("rounded-md");
        expect(trigger.className).not.toContain("hover:bg-accent");
    });
});
