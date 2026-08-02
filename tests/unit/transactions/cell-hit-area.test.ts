/**
 * UR-012: "every editable control in the transaction table must occupy its whole grid cell, so that
 * clicking anywhere in the cell begins editing that field", while "the resting appearance is
 * unchanged".
 *
 * The E2E companion in `tests/e2e/transactions.spec.ts` clicks the cell edges in a real browser,
 * which is the requirement's real subject. This file guards two things E2E can only observe
 * indirectly, and which would fail silently if they broke.
 *
 * First, the constants must survive `cn`. `cn` is `twMerge(clsx(...))`, and twMerge resolves
 * conflicts within a utility GROUP by last-wins — so a cell that lists its own `h-7` after the hit
 * area would quietly drop the enlargement and restore the dead strip, looking entirely reasonable in
 * source. P26 hit exactly this class of bug from the other direction; these assertions pin the
 * order that actually reaches the DOM.
 *
 * Second, the geometry must stay internally consistent: the input mechanism only leaves the resting
 * appearance untouched while its added height, negative margin and compensating padding cancel. A
 * future tweak to one of the three numbers without the others moves the text, and the arithmetic
 * below fails rather than the change reaching a screenshot.
 */

import { describe, expect, it } from "vitest";

import { RESTING_CELL_CHROME } from "@/components/features/transactions/cells/cell-chrome";
import {
    CHECKBOX_HIT_AREA,
    INPUT_CELL_HIT_AREA,
    SHORT_CONTROL_HIT_AREA,
    TALL_CONTROL_HIT_AREA
} from "@/components/features/transactions/cells/cell-hit-area";
import { cn } from "@/lib/utils";

/** Pull the pixel value out of a utility such as `h-[56px]` or `before:-top-[14px]`. */
function pixels(utility: string): number {
    const matched = /\[-?(\d+(?:\.\d+)?)px\]/.exec(utility);
    if (matched?.[1] == null) throw new Error(`no pixel value in "${utility}"`);
    return Number(matched[1]);
}

function utilities(classes: string): string[] {
    return classes.split(" ").filter((utility) => utility.length > 0);
}

/** The measured row geometry these constants exist to match. */
const ROW = {
    /** The row's own height, `py-3` either side of a 32px content band plus a 1px border. */
    height: 57,
    /** `py-3`. */
    verticalPadding: 12
} as const;

describe("cell hit area", () => {
    describe("the enlargement reaches the DOM", () => {
        it("survives the cell's own height and padding in the same merge", () => {
            // The exact merge each text cell performs: its own `h-7` first, hit area second.
            const merged = utilities(cn("h-7 text-sm", INPUT_CELL_HIT_AREA, RESTING_CELL_CHROME));

            expect(merged).toContain("h-[56px]");
            expect(merged, "the cell's own h-7 must not survive").not.toContain("h-7");
        });

        it("would be cancelled if a cell listed its own height afterwards", () => {
            // The regression this guards, asserted directly rather than described: ordering the
            // cell's own height last silently restores the dead strip.
            const merged = utilities(cn(INPUT_CELL_HIT_AREA, "h-7"));
            expect(merged).toContain("h-7");
            expect(merged).not.toContain("h-[56px]");
        });

        it("keeps the overlay intact for every control that uses one", () => {
            for (const [label, hitArea] of Object.entries({
                short: SHORT_CONTROL_HIT_AREA,
                tall: TALL_CONTROL_HIT_AREA,
                checkbox: CHECKBOX_HIT_AREA
            })) {
                const merged = utilities(cn("h-7 w-full px-1", hitArea, RESTING_CELL_CHROME));
                // `relative` is what the absolutely positioned overlay is measured against, so
                // losing it would silently move the hit area to some ancestor.
                expect(merged, label).toContain("relative");
                expect(merged, label).toContain("before:absolute");
                expect(merged, label).toContain("before:content-['']");
            }
        });

        it("leaves the resting chrome guarantee untouched", () => {
            // UR-005 requires a resting cell to paint nothing. The overlay must therefore contribute
            // no background of its own, in either theme.
            for (const hitArea of [
                SHORT_CONTROL_HIT_AREA,
                TALL_CONTROL_HIT_AREA,
                CHECKBOX_HIT_AREA,
                INPUT_CELL_HIT_AREA
            ]) {
                expect(utilities(hitArea).filter((u) => /(^|:)bg-/.test(u))).toEqual([]);
                expect(
                    utilities(hitArea).filter((u) => /(^|:)(border|shadow|ring)-/.test(u))
                ).toEqual([]);
            }
        });
    });

    describe("the geometry cancels", () => {
        it("gives back exactly the height the input takes, so the text cannot move", () => {
            const merged = utilities(INPUT_CELL_HIT_AREA);
            const height = pixels(merged.filter((u) => u.startsWith("h-"))[0] ?? "");
            const margin = pixels(merged.filter((u) => u.startsWith("-my-"))[0] ?? "");
            const padding = pixels(merged.filter((u) => u.startsWith("py-"))[0] ?? "");

            // The control's own drawn height, `h-7`.
            const drawnHeight = 28;
            // Grown to the row's full inner height, reaching both edges.
            expect(height).toBe(drawnHeight + margin * 2);
            expect(height).toBe(ROW.height - 1);
            // The margin is negative and equal to the growth per side, so the row's layout is
            // unchanged: the input occupies the same space it always did.
            expect(margin).toBe((height - drawnHeight) / 2);
            // The added padding equals the growth plus the shared `Input` base's own 4px `py-1`,
            // which is what holds the text on its original baseline.
            expect(padding).toBe(margin + 4);
        });

        it("reaches the row edge from each control's measured resting position", () => {
            // Each overlay's reach must equal the dead strip actually measured for that control:
            // the row's padding, plus half the difference between the content band and the control.
            const reachOf = (hitArea: string) =>
                pixels(utilities(hitArea).filter((u) => u.startsWith("before:-top-"))[0] ?? "");

            // `h-7` controls sit in a 32px band, so they are 2px inset within it as well.
            expect(reachOf(SHORT_CONTROL_HIT_AREA)).toBe(ROW.verticalPadding + 2);
            // `h-8` controls fill the band exactly.
            expect(reachOf(TALL_CONTROL_HIT_AREA)).toBe(ROW.verticalPadding);
            // The checkbox draws at 16px inside the same 32px band.
            expect(reachOf(CHECKBOX_HIT_AREA)).toBe(ROW.verticalPadding + (32 - 16) / 2);
        });

        it("keeps the checkbox's drawn size while widening only its activation area", () => {
            const merged = utilities(CHECKBOX_HIT_AREA);
            // Nothing here may set a size: the frozen text requires the box keep its drawn size.
            expect(merged.filter((u) => /^(h-|w-|size-)/.test(u))).toEqual([]);
            // 8px per side is the measured gap between the 16px box and its 32px cell.
            expect(pixels(merged.filter((u) => u.startsWith("before:-left-"))[0] ?? "")).toBe(8);
            expect(pixels(merged.filter((u) => u.startsWith("before:-right-"))[0] ?? "")).toBe(8);
        });

        it("stretches the overlay across the full cell width for the others", () => {
            // Every other control already spans its cell horizontally — measured dead space of 0px
            // on both sides — so the overlay matches the control's width rather than overhanging
            // into a neighbouring cell and stealing its clicks.
            for (const hitArea of [SHORT_CONTROL_HIT_AREA, TALL_CONTROL_HIT_AREA]) {
                expect(utilities(hitArea)).toContain("before:inset-x-0");
            }
        });
    });
});
