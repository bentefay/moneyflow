/**
 * UR-007: a stored date presentation overrides what the browser reports.
 *
 * This is the assertion the whole setting exists for, so it is made against the real provider and
 * the real cell rather than against the formatter alone. The browser is pinned to `en-US`
 * throughout — which is exactly the machine that produced the report: an `en_US.UTF-8` desktop
 * sitting in Australia/Brisbane, where `navigator.language` is `en-US`, `LC_TIME` says `en_AU`, and
 * no browser reads `LC_TIME`.
 *
 * Only the vault store is stubbed, because it cannot be constructed in jsdom. The provider, the
 * context, the cell, the formatter and the parser are all the real ones, so a provider that is not
 * mounted, or a cell that formats without the locale, fails here.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    dateFormat: vi.fn(),
    pubkeyHash: vi.fn()
}));

vi.mock("@/lib/crdt/context", () => ({
    useUserDateFormat: () => mocks.dateFormat()
}));

vi.mock("@/hooks/use-identity", () => ({
    usePubkeyHash: () => mocks.pubkeyHash()
}));

import { InlineEditableDate } from "@/components/features/transactions/cells/InlineEditableDate";
import { DateLocaleProvider } from "@/components/providers/date-locale-provider";
import type { DateFormatPreference } from "@/lib/domain/date-format-preference";

beforeEach(() => {
    // The reported environment: a browser that reports United States English.
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    mocks.pubkeyHash.mockReturnValue("viewer-1");
});

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

/** Render the date cell under a viewer whose stored preference is `preference`. */
function renderCell(value: string, preference: DateFormatPreference) {
    mocks.dateFormat.mockReturnValue(preference);
    const onSave = vi.fn<(newValue: string) => void>();

    render(
        <DateLocaleProvider>
            <InlineEditableDate value={value} onSave={onSave} data-testid="date-cell" />
        </DateLocaleProvider>
    );

    const input = screen.getByTestId("date-cell");
    if (!(input instanceof HTMLInputElement)) {
        throw new Error("expected the date cell to render an input");
    }
    return { input, onSave };
}

describe("a stored preference beats the browser locale", () => {
    const cases = [
        { preference: "dayFirst", displayed: "27/1/1988" },
        { preference: "monthFirst", displayed: "1/27/1988" },
        { preference: "yearFirst", displayed: "1988-01-27" }
    ] as const satisfies readonly { preference: DateFormatPreference; displayed: string }[];

    it.each(cases)("renders $preference as $displayed", ({ preference, displayed }) => {
        const { input } = renderCell("1988-01-27", preference);
        expect(input.value).toBe(displayed);
    });

    it("shows an Australian viewer their own order on a US browser", () => {
        // The reported defect, stated as the fix: the same stored date, the same browser, and a
        // presentation that now disagrees with the browser because the viewer said so.
        const { input } = renderCell("1988-01-27", "dayFirst");
        expect(input.value).toBe("27/1/1988");
        expect(input.value).not.toBe("1/27/1988");
    });

    it("follows the browser when no choice has been made", () => {
        const { input } = renderCell("1988-01-27", "automatic");
        expect(input.value).toBe("1/27/1988");
    });
});

describe("entry is read in the chosen presentation, not the browser's", () => {
    it("reads a typed date day-first once day-first is chosen", () => {
        // The dangerous case: both fields are 12 or under, so a transposition changes the stored
        // date without changing how it looks.
        const { input, onSave } = renderCell("2026-01-15", "dayFirst");

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "3/8/2026" } });
        fireEvent.blur(input);

        expect(onSave).toHaveBeenCalledWith("2026-08-03");
    });

    it("reads the same keystrokes month-first under the browser default", () => {
        // Same input, same browser, opposite meaning — which is what makes the preference load
        // bearing rather than cosmetic.
        const { input, onSave } = renderCell("2026-01-15", "automatic");

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "3/8/2026" } });
        fireEvent.blur(input);

        expect(onSave).toHaveBeenCalledWith("2026-03-08");
    });

    it("accepts back exactly what it displayed while editing", () => {
        const { input, onSave } = renderCell("1988-01-27", "dayFirst");

        fireEvent.focus(input);
        const shown = input.value;
        fireEvent.change(input, { target: { value: shown } });
        fireEvent.blur(input);

        // An unchanged value is not written back, which is only true if it parsed to the same date.
        expect(onSave).not.toHaveBeenCalled();
    });
});

describe("the calendar popover follows the same choice", () => {
    /** The day the calendar grid's first column is headed by, read from its own accessible name. */
    function firstWeekdayColumn(): string | null {
        const heading = document.querySelector("th[aria-label]");
        return heading?.getAttribute("aria-label") ?? null;
    }

    it("starts the week on Monday for a day-first viewer", () => {
        renderCell("1988-01-27", "dayFirst");

        fireEvent.click(screen.getByRole("button", { name: /open calendar/i }));

        expect(firstWeekdayColumn()).toBe("Monday");
    });

    it("starts the week on Sunday for a month-first viewer", () => {
        // react-day-picker defaults to en-US, so this case would pass even unwired. It is here to
        // prove the Monday case above is a consequence of the choice rather than of a blanket
        // change, which is the only way that case means anything.
        renderCell("1988-01-27", "monthFirst");

        fireEvent.click(screen.getByRole("button", { name: /open calendar/i }));

        expect(firstWeekdayColumn()).toBe("Sunday");
    });
});
