/**
 * Date Range Filter Time Zone Tests (UR-007)
 *
 * "No displayed value shifts because of a time zone." Range boundaries are
 * calendar dates, but the presets derived their ISO strings via `toISOString`,
 * which converts to UTC first. For any viewer east of Greenwich whose local
 * clock is before the UTC offset, that lands the boundary a day early: at
 * 09:00 on 2 August in Brisbane, "today" was emitted as 2026-08-01.
 *
 * The clock is pinned to exactly that moment so the bug is deterministic
 * rather than dependent on when the suite happens to run.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DateRange } from "@/components/features/transactions/filters/DateRangeFilter";
import { DateRangeFilter } from "@/components/features/transactions/filters/DateRangeFilter";

afterEach(() => {
    vi.useRealTimers();
    cleanup();
});

/** 09:00 local on 2 August 2026, which is still 1 August in UTC at +10. */
const MORNING_IN_UTC_PLUS_10 = new Date(2026, 7, 2, 9, 0, 0);

/** Open the filter and return the range the named preset emits. */
function rangeForPreset(label: string): DateRange {
    vi.useFakeTimers();
    vi.setSystemTime(MORNING_IN_UTC_PLUS_10);

    const onChange = vi.fn<(range: DateRange) => void>();
    render(<DateRangeFilter value={{ start: null, end: null }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(onChange).toHaveBeenCalledTimes(1);
    return onChange.mock.calls[0][0];
}

describe("DateRangeFilter boundaries do not shift by time zone", () => {
    it("ends a Month to date range on today's local date", () => {
        const range = rangeForPreset("Month to date");

        expect(range.end).toBe("2026-08-02");
        expect(range.start).toBe("2026-08-01");
    });

    it("ends a Year to date range on today's local date", () => {
        const range = rangeForPreset("Year to date");

        expect(range.end).toBe("2026-08-02");
        expect(range.start).toBe("2026-01-01");
    });

    it("keeps a fixed-length lookback aligned to local dates", () => {
        const range = rangeForPreset("Last 14 days");

        expect(range.end).toBe("2026-08-02");
        expect(range.start).toBe("2026-07-19");
    });

    it("keeps a whole-month range on its local month boundaries", () => {
        const range = rangeForPreset("Last month");

        expect(range.start).toBe("2026-07-01");
        expect(range.end).toBe("2026-07-31");
    });
});
