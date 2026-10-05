import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import {
    BASE_TRANSACTION_GRID_SUFFIX,
    buildAllocationColumnModel,
    parseAllocationDraft
} from "@/components/features/transactions/allocation-columns";
import { PersonAllocationCell } from "@/components/features/transactions/cells";
import { TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS } from "@/components/features/transactions/cells/editor-lifecycle";
import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";
import { TransactionRow } from "@/components/features/transactions/TransactionRow";
import { allocationPresenceField } from "@/lib/crdt/allocations";

import { createTestTransactionTable, transaction } from "./table-model/test-table";
import { updateTestTransactionGridController } from "./virtual-grid-harness";

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
        expect(BASE_TRANSACTION_GRID_SUFFIX).toBe("112px 120px");
        expect(model.gridTemplateColumns).toMatch(/112px 120px$/);
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

    it("preserves canonical zero and invalid semantics in the display-first row branch", () => {
        const model = buildModel();
        const transactionData = {
            id: "tx-resting-allocation",
            date: "2026-07-25",
            description: "Lunch",
            amount: -1250,
            allocations: { "person-a": 0 },
            accountOwnerships: { "person-a": 100 }
        };
        const { rerender } = render(
            <TransactionRow transaction={transactionData} allocationColumns={model.columns} />
        );
        const zero = screen.getByTestId("allocation-cell-person-a");

        expect(zero.firstChild?.textContent).toBe("—");
        expect(zero).not.toHaveAttribute("aria-invalid");
        expect(zero).toHaveAccessibleDescription(
            /Explicit: 0%.*Effective: 100%.*Owner remainder: 100%/i
        );

        for (const invalidValue of [Number.NaN, Number.POSITIVE_INFINITY, 101, -101, -0, "25"]) {
            rerender(
                <TransactionRow
                    transaction={{
                        ...transactionData,
                        allocations: { "person-a": invalidValue }
                    }}
                    allocationColumns={model.columns}
                />
            );
            const invalid = screen.getByTestId("allocation-cell-person-a");
            expect(invalid.firstChild?.textContent).toBe("Invalid");
            expect(invalid).toHaveAttribute("aria-invalid", "true");
            expect(invalid).toHaveAccessibleDescription(/effective allocation unavailable/i);
        }
    });

    it("edits one person by pointer and keyboard, keeping invalid drafts local", () => {
        const onCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        render(
            <PersonAllocationCell
                personId="person-a"
                personLabel="Ada"
                presenceField={allocationPresenceField("person-a")}
                allocations={{}}
                accountOwnerships={{ "person-a": 100 }}
                onCommit={onCommit}
            />
        );

        const display = screen.getByRole("button", { name: /edit Ada allocation/i });
        expect(display).toHaveAttribute("data-presence-field", allocationPresenceField("person-a"));
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
        expect(onCommit).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole("button", { name: /edit Ada allocation/i }));
        const escapeInput = screen.getByRole("textbox", { name: "Ada allocation percentage" });
        fireEvent.change(escapeInput, { target: { value: "40" } });
        fireEvent.keyDown(escapeInput, { key: "Escape" });
        expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("uses the allocation model's shared template for a real row", () => {
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
            />
        );

        expect(screen.getByTestId("transaction-row")).toHaveStyle({
            gridTemplateColumns: model.gridTemplateColumns
        });
        expect(screen.queryByTestId("notes-row")).not.toBeInTheDocument();
        expect(screen.getAllByTestId(/^allocation-cell-/)).toHaveLength(model.columns.length);
    });

    it("selects the full description value without mounting row automation descendants", async () => {
        const transactionData = transaction({ id: "tx-description-editor" });
        const rows = [transactionData];
        const atom = createTransactionCellSelectionAtom();
        const controller = createTransactionGridWorkspaceController(atom);
        updateTestTransactionGridController(controller, rows);
        const table = createTestTransactionTable({ cellSelectionAtom: atom, transactions: rows });
        const row = table.getRowsInDisplayOrder()[0];
        if (row == null) throw new Error("transaction row fixture is missing");
        const gridCellSurface = {
            cells: row.getAllCells(),
            controller,
            editor: {
                address: {
                    columnId: "description",
                    transactionId: asTransactionId(transactionData.id)
                },
                entry: "full"
            },
            initialTabStopColumnId: "description",
            interactionKind: "editing",
            selectionVisibility: "suppressed",
            parkedTabStopColumnId: null,
            viewportRowDistance: 5
        } satisfies ComponentProps<typeof TransactionRow>["gridCellSurface"];
        render(<TransactionRow transaction={transactionData} gridCellSurface={gridCellSurface} />);

        expect(screen.queryByTestId(/rule-(proposal|robot)/)).not.toBeInTheDocument();
        const descriptionEditor = screen.getByTestId<HTMLInputElement>("description-editable");
        await expect
            .poll(() => ({
                selectionEnd: descriptionEditor.selectionEnd,
                selectionStart: descriptionEditor.selectionStart
            }))
            .toEqual({ selectionEnd: descriptionEditor.value.length, selectionStart: 0 });
    });

    it("indexes each row cell once instead of scanning the row for every rendered field", () => {
        const transactionData = transaction({ id: "tx-indexed" });
        const rows = [transactionData];
        const atom = createTransactionCellSelectionAtom();
        const controller = createTransactionGridWorkspaceController(atom);
        updateTestTransactionGridController(controller, rows);
        const table = createTestTransactionTable({ cellSelectionAtom: atom, transactions: rows });
        const row = table.getRowsInDisplayOrder()[0];
        if (row == null) throw new Error("transaction row fixture is missing");
        let columnIdReads = 0;
        const cells = row.getAllCells().map((cell) => {
            const column = new Proxy(cell.column, {
                get(target, property, receiver) {
                    if (property === "id") columnIdReads += 1;
                    return Reflect.get(target, property, receiver);
                }
            });
            return new Proxy(cell, {
                get(target, property, receiver) {
                    return property === "column" ? column : Reflect.get(target, property, receiver);
                }
            });
        });

        render(
            <TransactionRow
                transaction={transactionData}
                gridCellSurface={{
                    cells,
                    controller,
                    editor: null,
                    initialTabStopColumnId: "description",
                    interactionKind: "idle",
                    selectionVisibility: "suppressed",
                    parkedTabStopColumnId: null,
                    viewportRowDistance: 5
                }}
            />
        );

        expect(columnIdReads).toBe(cells.length);
    });

    it("maps a bounded allocation collaborator back to its raw local column", () => {
        const personId = "person.with spaces.名字";
        const model = buildAllocationColumnModel({
            activePeople: [{ id: personId, name: "Arbitrary person" }],
            allPeople: [{ id: personId, name: "Arbitrary person" }],
            transactions: []
        });
        const transactionData = transaction({ id: "tx-allocation-presence" });
        const rows = [transactionData];
        const atom = createTransactionCellSelectionAtom();
        const controller = createTransactionGridWorkspaceController(atom);
        updateTestTransactionGridController(controller, rows);
        const table = createTestTransactionTable({
            allocationColumns: model.columns,
            cellSelectionAtom: atom,
            transactions: rows
        });
        const row = table.getRowsInDisplayOrder()[0];
        if (row == null) throw new Error("transaction row fixture is missing");
        const presenceField = allocationPresenceField(personId);
        const presence = {
            editingBy: ["a".repeat(64)],
            editingByField: { [presenceField]: ["a".repeat(64)] },
            focusedBy: ["a".repeat(64)]
        };
        const gridCellSurface = {
            cells: row.getAllCells(),
            controller,
            editor: null,
            initialTabStopColumnId: "description",
            interactionKind: "idle",
            selectionVisibility: "suppressed",
            parkedTabStopColumnId: null,
            viewportRowDistance: 5
        } satisfies ComponentProps<typeof TransactionRow>["gridCellSurface"];
        const view = render(
            <TransactionRow
                transaction={transactionData}
                allocationColumns={model.columns}
                presence={presence}
                gridCellSurface={gridCellSurface}
            />
        );

        const allocation = view.container.querySelector(
            `[role="gridcell"][data-cell="allocation:${personId}"]`
        );
        if (!(allocation instanceof HTMLElement)) {
            throw new Error("allocation gridcell is missing");
        }
        expect(allocation).toHaveAttribute("data-presence", "true");
        expect(screen.getByTestId(`allocation-cell-${personId}`)).toHaveAttribute(
            "data-presence-field",
            presenceField
        );
    });

    it("renders an Amount collaborator on its exact field without an inline Notes row", () => {
        const transactionData = transaction({ id: "tx-1" });
        const rows = [transactionData];
        const atom = createTransactionCellSelectionAtom();
        const controller = createTransactionGridWorkspaceController(atom);
        updateTestTransactionGridController(controller, rows);
        const table = createTestTransactionTable({ cellSelectionAtom: atom, transactions: rows });
        const row = table.getRowsInDisplayOrder()[0];
        if (row == null) throw new Error("transaction row fixture is missing");

        const view = render(
            <TransactionRow
                transaction={transactionData}
                presence={{
                    editingBy: ["a".repeat(64), "b".repeat(64)],
                    editingByField: {
                        amount: ["a".repeat(64)],
                        notes: ["b".repeat(64)]
                    },
                    focusedBy: ["a".repeat(64), "b".repeat(64)]
                }}
                gridCellSurface={{
                    cells: row.getAllCells(),
                    controller,
                    editor: null,
                    initialTabStopColumnId: "description",
                    interactionKind: "idle",
                    selectionVisibility: "suppressed",
                    parkedTabStopColumnId: null,
                    viewportRowDistance: 5
                }}
            />
        );

        const amount = view.container.querySelector('[role="gridcell"][data-cell="amount"]');
        if (!(amount instanceof HTMLElement)) throw new Error("amount gridcell is missing");

        expect(amount).toHaveAttribute("data-presence", "true");
        expect(amount.style.outlineColor).not.toBe("");
        expect(view.container.querySelector('[role="gridcell"][data-cell="notes"]')).toBeNull();
    });
});
