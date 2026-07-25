import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
    buildAllocationColumnModel,
    parseAllocationDraft
} from "@/components/features/transactions/allocation-columns";
import { PersonAllocationCell } from "@/components/features/transactions/cells";
import { TransactionRow } from "@/components/features/transactions/TransactionRow";

vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));

const people = {
    "person-z": { id: "person-z", name: "Zoe" },
    "person-a": { id: "person-a", name: "Ada" },
    "person-d": { id: "person-d", name: "Dee", deletedAt: "2026-01-01T00:00:00Z" }
};

function buildModel() {
    return buildAllocationColumnModel({
        activePeople: [people["person-z"], people["person-a"]],
        allPeople: Object.values(people),
        transactions: [
            {
                allocations: {
                    "person-d": 25,
                    "person-missing-b": 12.5,
                    "person-missing-a": Number.NaN,
                    "zero-history": 0,
                    $cid: 42
                }
            }
        ]
    });
}

describe("transaction allocation grid", () => {
    it("builds active columns first, then every nonzero historical reference with honest labels", () => {
        const model = buildModel();

        expect(model.columns.map(({ personId }) => personId)).toEqual([
            "person-a",
            "person-z",
            "person-d",
            "person-missing-a",
            "person-missing-b"
        ]);
        expect(model.columns.map(({ label }) => label)).toEqual([
            "Ada",
            "Zoe",
            "Dee (deleted)",
            "Unknown person person-missing-a",
            "Unknown person person-missing-b"
        ]);
        expect(model.columns.map(({ field }) => field)).toEqual([
            "allocation:person-a",
            "allocation:person-z",
            "allocation:person-d",
            "allocation:person-missing-a",
            "allocation:person-missing-b"
        ]);
        expect(model.gridTemplateColumns.split(" ")).toHaveLength(13);
    });

    it("parses exact valid percentages and rejects malformed or destructive drafts", () => {
        expect(parseAllocationDraft("-35.125")).toEqual({ ok: true, value: -35.125 });
        expect(parseAllocationDraft("0")).toEqual({ ok: true, value: 0 });
        expect(parseAllocationDraft("1e2")).toEqual({ ok: true, value: 100 });

        for (const invalid of [
            "",
            " ",
            "-101",
            "101",
            "NaN",
            "Infinity",
            "1e999",
            "0x10",
            "12 apples",
            "-0"
        ]) {
            expect(parseAllocationDraft(invalid), invalid).toMatchObject({ ok: false });
        }
    });

    it("renders explicit, effective and invalid legacy states without inventing a stored value", () => {
        const { rerender } = render(
            <PersonAllocationCell
                personId="person-a"
                personLabel="Ada"
                explicitValue={25}
                allocations={{ "person-a": 25 }}
                accountOwnerships={{ "person-a": 60, "person-z": 40 }}
            />
        );

        expect(screen.getByTestId("allocation-cell-person-a")).toHaveTextContent("25%");
        expect(screen.getByTestId("allocation-cell-person-a")).toHaveAccessibleDescription(
            /Explicit: 25%.*Effective: 70%.*Owner remainder: 75%/i
        );

        rerender(
            <PersonAllocationCell
                personId="person-z"
                personLabel="Zoe"
                allocations={{ "person-a": 25 }}
                accountOwnerships={{ "person-a": 60, "person-z": 40 }}
            />
        );
        expect(screen.getByTestId("allocation-cell-person-z")).toHaveTextContent("—");
        expect(screen.getByTestId("allocation-cell-person-z")).toHaveAccessibleDescription(
            /Explicit: not stored.*Effective: 30%.*Owner remainder: 75%/i
        );

        rerender(
            <PersonAllocationCell
                personId="person-z"
                personLabel="Zoe"
                explicitValue={Number.NaN}
                allocations={{ "person-z": Number.NaN }}
                accountOwnerships={{ "person-z": 100 }}
            />
        );
        expect(screen.getByTestId("allocation-cell-person-z")).toHaveTextContent("Invalid");
        expect(screen.getByTestId("allocation-cell-person-z")).toHaveAccessibleDescription(
            /effective allocation unavailable/i
        );
    });

    it("edits one person by pointer and keyboard, keeping invalid drafts local", () => {
        const onCommit = vi.fn();
        render(
            <PersonAllocationCell
                personId="person-a"
                personLabel="Ada"
                allocations={{}}
                accountOwnerships={{ "person-a": 100 }}
                onCommit={onCommit}
            />
        );

        const display = screen.getByRole("button", { name: /edit Ada allocation/i });
        expect(display).toHaveAttribute("data-presence-field", "allocation:person-a");
        fireEvent.click(display);

        const input = screen.getByRole("textbox", { name: "Ada allocation percentage" });
        fireEvent.change(input, { target: { value: "-35.5" } });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(onCommit).toHaveBeenLastCalledWith("person-a", -35.5);

        fireEvent.click(screen.getByRole("button", { name: /edit Ada allocation/i }));
        const invalidInput = screen.getByRole("textbox", {
            name: "Ada allocation percentage"
        });
        fireEvent.change(invalidInput, { target: { value: "101" } });
        fireEvent.keyDown(invalidInput, { key: "Enter" });
        expect(invalidInput).toHaveAttribute("aria-invalid", "true");
        expect(invalidInput).toHaveFocus();
        expect(onCommit).toHaveBeenCalledTimes(1);

        fireEvent.change(invalidInput, { target: { value: "0" } });
        fireEvent.blur(invalidInput);
        expect(onCommit).toHaveBeenLastCalledWith("person-a", 0);

        fireEvent.click(screen.getByRole("button", { name: /edit Ada allocation/i }));
        const escapeInput = screen.getByRole("textbox", { name: "Ada allocation percentage" });
        fireEvent.change(escapeInput, { target: { value: "40" } });
        fireEvent.keyDown(escapeInput, { key: "Escape" });
        expect(onCommit).toHaveBeenCalledTimes(2);
    });

    it("uses one shared template for a real row and its expanded notes", () => {
        const model = buildModel();
        render(
            <TransactionRow
                transaction={{
                    id: "tx-1",
                    date: "2026-07-25",
                    description: "Lunch",
                    amount: -1250,
                    allocations: { "person-a": 25 },
                    accountOwnerships: { "person-a": 100 }
                }}
                allocationColumns={model.columns}
                gridTemplateColumns={model.gridTemplateColumns}
                isExpanded
            />
        );

        expect(screen.getByTestId("transaction-row")).toHaveStyle({
            gridTemplateColumns: model.gridTemplateColumns
        });
        expect(screen.getByTestId("notes-row")).toHaveStyle({
            gridTemplateColumns: model.gridTemplateColumns
        });
        expect(screen.getAllByTestId(/^allocation-cell-/)).toHaveLength(model.columns.length);
    });
});
