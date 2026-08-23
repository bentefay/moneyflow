/**
 * UR-007: the settings control that overrides the browser's date presentation.
 *
 * The examples beside each option are the entire basis on which a viewer picks one, so they are
 * asserted here at the render boundary rather than only in the domain module. An example that does
 * not match what the grid then does is worse than showing no example at all.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DateFormatSelector } from "@/components/features/vault/DateFormatSelector";
import {
    DATE_FORMAT_EXAMPLE_ISO,
    DATE_FORMAT_PREFERENCES,
    localeForDateFormatPreference,
    type DateFormatPreference
} from "@/lib/domain/date-format-preference";
import { formatTransactionDate } from "@/lib/utils/date-format";

beforeAll(() => {
    // jsdom implements neither layout nor the Pointer Capture API, and Radix's select uses both
    // when its list opens. Supplying exactly the methods jsdom lacks keeps the real Radix component
    // under test; stubbing the component instead would leave these assertions talking to a fake.
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

/**
 * Open the select's list from the keyboard.
 *
 * Deliberately the keyboard path rather than a synthetic pointerdown: Radix opens on pointer
 * CAPTURE, which jsdom does not implement, so a faked pointer sequence tests the fake. Enter on the
 * trigger is a real user path and needs nothing jsdom lacks.
 */
function openList(): void {
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Date format" }), { key: "Enter" });
}

describe("DateFormatSelector", () => {
    it("is addressable by its accessible name", () => {
        // The E2E suite reaches this control by role and accessible name, as it does the currency
        // selector beside it, so the label is part of the contract rather than decoration.
        render(<DateFormatSelector value="automatic" onChange={vi.fn()} />);

        expect(screen.getByRole("combobox", { name: "Date format" })).toBeInTheDocument();
    });

    it("shows the current choice on the trigger", () => {
        render(<DateFormatSelector value="dayFirst" onChange={vi.fn()} />);

        expect(screen.getByRole("combobox", { name: "Date format" })).toHaveTextContent(
            /day first/i
        );
    });

    it("is disabled when there is no viewer to store a choice against", () => {
        // The identity resolves in an effect, so the control renders before there is a key to file
        // the preference under. Accepting a click then would silently discard it.
        render(<DateFormatSelector value="automatic" onChange={vi.fn()} disabled />);

        expect(screen.getByRole("combobox", { name: "Date format" })).toBeDisabled();
    });

    /** The date the grid would render under `preference`, computed rather than written out. */
    function gridWouldRender(preference: DateFormatPreference): string {
        return formatTransactionDate(
            DATE_FORMAT_EXAMPLE_ISO,
            undefined,
            localeForDateFormatPreference(preference)
        );
    }

    const explicitChoices = [
        { preference: "dayFirst", label: /day first/i },
        { preference: "monthFirst", label: /month first/i },
        { preference: "yearFirst", label: /year first/i }
    ] as const satisfies readonly { preference: DateFormatPreference; label: RegExp }[];

    it.each(explicitChoices)(
        "labels the $preference option with the date choosing it produces",
        ({ preference, label }) => {
            // Asserted per OPTION rather than by searching the list for the string: an example
            // sitting on the wrong row is precisely the failure that would mislead someone into
            // picking the opposite of what they wanted. The expected value comes from the
            // formatter itself, so this fails only when the label stops agreeing with the grid.
            render(<DateFormatSelector value="automatic" onChange={vi.fn()} />);

            openList();

            const option = within(screen.getByRole("listbox")).getByRole("option", { name: label });
            expect(option).toHaveTextContent(gridWouldRender(preference));
        }
    );

    it("offers every preference as an option", () => {
        render(<DateFormatSelector value="automatic" onChange={vi.fn()} />);

        openList();

        expect(screen.getAllByRole("option")).toHaveLength(DATE_FORMAT_PREFERENCES.length);
    });

    it.each(explicitChoices)("carries $preference's example onto the trigger", ({ preference }) => {
        // The example a viewer sees once the list is closed has to agree too, or the settings page
        // says one thing at rest and another while choosing.
        render(<DateFormatSelector value={preference} onChange={vi.fn()} />);

        expect(screen.getByRole("combobox", { name: "Date format" })).toHaveTextContent(
            gridWouldRender(preference)
        );
    });
});
