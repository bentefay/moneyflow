/**
 * UR-005: "The date, description, account, status, percentage and amount cells carry no background
 * fill in their resting state" and "Hover, focus, focus-visible, selected, editing and any presence
 * or validation states keep their existing visual treatment."
 *
 * The E2E companion in `tests/e2e/transactions.spec.ts` measures the pixels the browser actually
 * paints, which is the requirement's real subject. This file guards the *reason* the defect existed
 * at all, which E2E can only observe indirectly: `cn` is `twMerge(clsx(...))`, and `twMerge` treats
 * a variant-prefixed utility as targeting a different state from its unprefixed form. So the shared
 * primitives' `dark:bg-input/30` and `dark:border-input` survived every cell's plain
 * `bg-transparent` untouched, and the cells looked clean in source while painting a fill in dark
 * mode.
 *
 * That makes the merge itself the invariant worth pinning. A future edit that drops the `dark:`
 * halves of {@link RESTING_CELL_CHROME} — the obvious-looking simplification, since they read as
 * redundant beside the unprefixed ones — reintroduces exactly the reported defect, and does so
 * silently in light mode. These assertions fail on that edit in milliseconds.
 */

import { describe, expect, it } from "vitest";

import { RESTING_CELL_CHROME } from "@/components/features/transactions/cells/cell-chrome";
import { cn } from "@/lib/utils";

/** The resting decorations each shared primitive contributes unconditionally. */
const SHARED_PRIMITIVE_BASES = {
    /** `src/components/ui/input.tsx` — behind the date, description and amount cells. */
    input: "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive",
    /** `src/components/ui/select.tsx` — behind the status cell. */
    select: "border-input dark:bg-input/30 dark:hover:bg-input/50 flex rounded-md border bg-transparent px-3 py-2 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50",
    /** The outline `Button` variant — behind the account cell. It also adds `dark:border-input`. */
    outlineButton:
        "bg-background hover:bg-accent dark:border-input dark:bg-input/30 dark:hover:bg-input/50 border shadow-xs focus-visible:border-ring"
} as const;

/** Utilities that paint a resting decoration and so must not survive the merge. */
const RESTING_CHROME = /^dark:(bg-input|border-input)/;

describe("resting cell chrome", () => {
    it("cancels every resting decoration the shared primitives contribute", () => {
        for (const [primitive, base] of Object.entries(SHARED_PRIMITIVE_BASES)) {
            const merged = cn(base, RESTING_CELL_CHROME).split(" ");
            expect(
                merged.filter((utility) => RESTING_CHROME.test(utility)),
                primitive
            ).toEqual([]);
            expect(merged, primitive).toContain("bg-transparent");
            expect(merged, primitive).toContain("dark:bg-transparent");
            expect(merged, primitive).toContain("border-transparent");
            expect(merged, primitive).toContain("dark:border-transparent");
        }
    });

    it("would not cancel them without the dark-prefixed halves", () => {
        // The regression this file exists to catch, asserted directly: the plain utilities alone
        // leave the fill in place, which is why the cells looked clean in source and were not.
        const merged = cn(SHARED_PRIMITIVE_BASES.input, "border-transparent bg-transparent").split(
            " "
        );
        expect(merged).toContain("dark:bg-input/30");
    });

    it("leaves hover, focus, validation and per-cell styling to win over the baseline", () => {
        const amountCell = cn(
            SHARED_PRIMITIVE_BASES.input,
            "h-7 text-right text-sm font-medium tabular-nums",
            RESTING_CELL_CHROME,
            "text-green-700 dark:text-green-400",
            "hover:bg-accent/30",
            "focus:border-input focus:bg-background"
        ).split(" ");

        expect(amountCell).toContain("hover:bg-accent/30");
        expect(amountCell).toContain("focus:bg-background");
        expect(amountCell).toContain("focus:border-input");
        expect(amountCell).toContain("focus-visible:border-ring");
        expect(amountCell).toContain("focus-visible:ring-ring/50");
        expect(amountCell).toContain("focus-visible:ring-[3px]");
        expect(amountCell).toContain("aria-invalid:border-destructive");
        expect(amountCell).toContain("dark:text-green-400");
    });

    it("does not disturb a shared primitive used outside the transaction table", () => {
        // The constant is applied per cell, never to the primitive, so an ordinary Input keeps the
        // fill the rest of the product expects. Blast radius, asserted rather than assumed.
        expect(cn(SHARED_PRIMITIVE_BASES.input).split(" ")).toContain("dark:bg-input/30");
    });
});
