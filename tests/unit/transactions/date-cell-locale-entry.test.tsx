/**
 * Inline Date Cell Locale Entry Tests (UR-007)
 *
 * "Date entry accepts what the same locale displays, so a value can be typed
 * back in the form it was shown."
 *
 * The cell previously parsed with chrono-node's default export, which is the
 * US-ordered `en` parser. For a day-first viewer that silently transposed day
 * and month: the `03/08` the cell had just displayed was saved as 8 March.
 * The corruption is invisible whenever the day is 12 or lower, so this is
 * asserted through the value handed to `onSave` rather than through anything
 * on screen.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InlineEditableDate } from "@/components/features/transactions/cells/InlineEditableDate";

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

/** Pin the browser locale the component reads for display and parsing. */
function withLocale(locale: string): void {
    vi.spyOn(navigator, "language", "get").mockReturnValue(locale);
}

/** Render the cell and return its input plus the save spy. */
function renderCell(value: string) {
    const onSave = vi.fn<(newValue: string) => void>();
    render(<InlineEditableDate value={value} onSave={onSave} data-testid="date-cell" />);
    const input = screen.getByTestId("date-cell");
    if (!(input instanceof HTMLInputElement)) {
        throw new Error("expected the date cell to render an input");
    }
    return { input, onSave };
}

/** Focus the cell, replace its contents with `typed`, and blur to commit. */
function typeAndCommit(input: HTMLInputElement, typed: string): void {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: typed } });
    fireEvent.blur(input);
}

describe("date entry follows the viewer's locale", () => {
    it("reads a day-first entry day-first", () => {
        // The frozen text's own example: for an Australian-English viewer,
        // 03/08 is the third of August, not the eighth of March.
        withLocale("en-AU");
        const { input, onSave } = renderCell("2026-01-15");

        typeAndCommit(input, "03/08/26");

        expect(onSave).toHaveBeenCalledWith("2026-08-03");
    });

    it("reads a month-first entry month-first", () => {
        // The same keystrokes legitimately mean a different date under en-US.
        withLocale("en-US");
        const { input, onSave } = renderCell("2026-01-15");

        typeAndCommit(input, "03/08/26");

        expect(onSave).toHaveBeenCalledWith("2026-03-08");
    });

    it("round-trips the form it displayed while editing", () => {
        withLocale("en-AU");
        const { input, onSave } = renderCell("2026-08-03");

        // Focusing shows the editing presentation; committing it unchanged
        // must not move the date.
        fireEvent.focus(input);
        const shown = input.value;
        expect(shown).toBe("3/8/2026");

        fireEvent.change(input, { target: { value: shown } });
        fireEvent.blur(input);

        // Unchanged values are not written back.
        expect(onSave).not.toHaveBeenCalled();
    });

    it("still accepts natural language", () => {
        withLocale("en-AU");
        const { input, onSave } = renderCell("2026-01-15");

        typeAndCommit(input, "25 December 2026");

        expect(onSave).toHaveBeenCalledWith("2026-12-25");
    });

    it("ignores input that is not a date", () => {
        withLocale("en-AU");
        const { input, onSave } = renderCell("2026-01-15");

        typeAndCommit(input, "not a date");

        expect(onSave).not.toHaveBeenCalled();
    });
});

describe("the editing presentation carries a four-digit year", () => {
    const testCases = [
        { locale: "en-AU", value: "2026-08-03", expected: "3/8/2026" },
        { locale: "en-US", value: "2026-08-03", expected: "8/3/2026" },
        { locale: "en-GB", value: "2025-06-15", expected: "15/6/2025" },
        { locale: "de-DE", value: "2026-08-03", expected: "3.8.2026" }
    ] as const;

    it.each(testCases)("shows $expected for $value in $locale", ({ locale, value, expected }) => {
        withLocale(locale);
        const { input } = renderCell(value);

        fireEvent.focus(input);

        expect(input.value).toBe(expected);
        // A two-digit year cannot say which century it means, and editing is
        // where that matters: what the field shows is what gets typed back.
        expect(input.value).toContain(value.slice(0, 4));
    });
});

describe("the resting presentation follows the locale", () => {
    it("omits the year for a current-year date and orders it day-first", () => {
        withLocale("en-AU");
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 2, 9, 0, 0));

        try {
            const { input } = renderCell("2026-08-03");
            expect(input.value).toBe("3/8");
        } finally {
            vi.useRealTimers();
        }
    });

    it("includes a four-digit year for a different-year date", () => {
        withLocale("en-AU");
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 2, 9, 0, 0));

        try {
            const { input } = renderCell("2025-06-15");
            expect(input.value).toBe("15/6/2025");
        } finally {
            vi.useRealTimers();
        }
    });
});
