import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { InlineEditableStatus } from "@/components/features/transactions/cells/InlineEditableStatus";

const statuses = [
    { id: "for-review", name: "For Review" },
    { id: "paid", name: "Paid", behavior: "treatAsPaid" }
] as const;

beforeAll(() => {
    // jsdom lacks the layout and pointer-capture methods used by the real Radix Select.
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

function renderOpenStatusPicker() {
    const events: string[] = [];
    const onSave = vi.fn<(statusId: string) => void>();
    render(
        <InlineEditableStatus
            value="for-review"
            availableStatuses={statuses}
            onSave={onSave}
            startOpen
            onPopupOpenChange={(_, open) => events.push(open ? "popup-open" : "popup-closed")}
            onEditingChange={(editing) => events.push(editing ? "editing-open" : "editing-closed")}
        />
    );
    events.length = 0;
    return { events, onSave };
}

describe("InlineEditableStatus selection", () => {
    it.each(["touch", "pen"] as const)(
        "does not finish a $pointerType scroll gesture without a semantic click",
        (pointerType) => {
            const { events, onSave } = renderOpenStatusPicker();
            const selected = screen.getByRole("option", { name: "For Review" });

            fireEvent.pointerDown(selected, { pointerId: 7, pointerType });
            fireEvent.pointerMove(selected, { pointerId: 7, pointerType });
            fireEvent.pointerUp(selected, { pointerId: 7, pointerType });

            expect(onSave).not.toHaveBeenCalled();
            expect(events).not.toContain("editing-closed");
            expect(screen.getByRole("listbox")).toBeInTheDocument();
        }
    );

    it.each(["Enter", " "])(
        "finishes a %j keyboard selection when the selected value is unchanged",
        (key) => {
            const { events, onSave } = renderOpenStatusPicker();

            fireEvent.keyDown(screen.getByRole("option", { name: "For Review" }), { key });

            expect(onSave).not.toHaveBeenCalled();
            expect(events.slice(0, 2)).toEqual(["popup-closed", "editing-closed"]);
            expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        }
    );

    it("keeps Space search-owned while Radix typeahead is active", () => {
        const { events, onSave } = renderOpenStatusPicker();
        const selectedOption = screen.getByRole("option", { name: "For Review" });

        fireEvent.keyDown(selectedOption, { key: "F" });
        fireEvent.keyDown(selectedOption, { key: " " });

        expect(onSave).not.toHaveBeenCalled();
        expect(events).not.toContain("editing-closed");
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(selectedOption).toHaveFocus();
    });

    it("finishes exactly once when value change and semantic click share one selection", () => {
        const { events, onSave } = renderOpenStatusPicker();

        fireEvent.click(screen.getByRole("option", { name: "Paid" }));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith("paid");
        expect(events.filter((event) => event === "editing-closed")).toHaveLength(1);
        expect(events.slice(0, 2)).toEqual(["popup-closed", "editing-closed"]);
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("returns popup ownership on Escape without finishing the retained editor", () => {
        const { events, onSave } = renderOpenStatusPicker();

        fireEvent.keyDown(screen.getByRole("option", { name: "For Review" }), { key: "Escape" });

        expect(onSave).not.toHaveBeenCalled();
        expect(events).toContain("popup-closed");
        expect(events).not.toContain("editing-closed");
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
});
