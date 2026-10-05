/**
 * A deleted person's allocation column, against the real page and the real sliding window.
 *
 * `historical-allocation-columns.test.ts` proves the two pure functions. What it cannot see is
 * whether the page *uses* them: deleting the `retainedHistoricalPersonIds` argument at the call site
 * leaves every one of those tests green while the column vanishes the moment its row scrolls out of
 * the window. So this drives the page itself, over a vault larger than the window, and reads the
 * column out of the rendered header.
 *
 * Both directions are here for the same reason they are there. Retaining forever is as wrong as not
 * retaining: a column for a person no matching row references is one the user cannot account for.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionTable as TransactionTableComponent } from "@/components/features/transactions";
import type { TransactionGridWorkspaceController } from "@/components/features/transactions/hooks/useTransactionGridController";
import { TRANSACTION_ROW_WINDOW_ROWS } from "@/components/features/transactions/row-window";
import type { TransactionInput } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { asPercentage } from "@/types";

import {
    ACCOUNT_ID,
    createCrdtContextMock,
    importMock,
    presenceMock,
    renderTransactionsPage,
    routerMock,
    seedVaultPeople,
    seedVaultWith,
    STATUS_ID
} from "./transactions-page-harness";
import { HARNESS_ROW_HEIGHT, installVirtualGridLayout, scrollGridTo } from "./virtual-grid-harness";

/** Comfortably more than the window, so a row at the front is genuinely dropped when scrolled past. */
const TOTAL_TRANSACTIONS = 800;

const ADA = { id: "person-ada", name: "Ada" };
const DEE = { id: "person-dee", name: "Dee", deletedAt: "2026-01-01T00:00:00Z" };

/** The only row that allocates to the deleted person, at the front of the initial held window. */
const ROW_WITH_HISTORICAL_ALLOCATION = 0;

const controllerCapture = vi.hoisted<{
    current: TransactionGridWorkspaceController | null;
}>(() => ({ current: null }));

vi.mock("next/navigation", () => routerMock);
vi.mock("@/lib/crdt/context", () => createCrdtContextMock());
vi.mock("@/hooks/use-identity", () => ({ usePubkeyHash: () => null }));
vi.mock("@/components/providers/vault-presence-provider", () => ({
    useVaultPresenceContext: () => presenceMock
}));
vi.mock("@/components/features/import", () => importMock);
vi.mock("@/components/features/accounts", () => ({
    AccountCombobox: () => <button type="button">Account</button>
}));
vi.mock("@/components/features/transactions", async () => {
    const actual = await vi.importActual<typeof import("@/components/features/transactions")>(
        "@/components/features/transactions"
    );
    return {
        ...actual,
        TransactionTable: (props: ComponentProps<typeof TransactionTableComponent>) => {
            controllerCapture.current = props.controller;
            return <actual.TransactionTable {...props} />;
        }
    };
});

/** Index 0 is newest, so the matching order is index order. Even rows carry "Groceries". */
function createTransaction(index: number): TransactionInput {
    return {
        id: `tx-${index.toString().padStart(4, "0")}`,
        date: Temporal.PlainDate.from("2026-01-01").add({ days: TOTAL_TRANSACTIONS - index }),
        description: index % 2 === 0 ? `Groceries ${String(index)}` : `Fuel ${String(index)}`,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-(index + 1) * 100),
        originalAmount: undefined,
        accountId: ACCOUNT_ID,
        tagIds: [],
        statusId: STATUS_ID,
        importId: "import-1",
        allocations: index === ROW_WITH_HISTORICAL_ALLOCATION ? { [DEE.id]: asPercentage(25) } : {},
        creationInstant: Temporal.Instant.from("2026-01-01T09:00:00Z"),
        importRowIndex: index,
        suspectedDuplicates: [],
        deletedAt: undefined
    };
}

/** The labels of the grid's allocation column headers, which is where a column is visible at all. */
function allocationColumnLabels(): readonly string[] {
    return screen
        .getAllByRole("columnheader")
        .map((header) => header.textContent ?? "")
        .filter((label) => label.endsWith(" %"));
}

function rowIsRendered(index: number): boolean {
    return (
        document.querySelector(`[data-transaction-id="tx-${index.toString().padStart(4, "0")}"]`) !=
        null
    );
}

describe("a deleted person's allocation column under a sliding window", () => {
    vi.setConfig({ testTimeout: 60_000 });

    let restoreLayout: () => void;

    beforeEach(() => {
        restoreLayout = installVirtualGridLayout();
        controllerCapture.current = null;
        seedVaultWith(
            Array.from({ length: TOTAL_TRANSACTIONS }, (unused, index) => createTransaction(index))
        );
        seedVaultPeople({
            active: { [ADA.id]: ADA },
            all: { [ADA.id]: ADA, [DEE.id]: DEE }
        });
    });

    afterEach(() => restoreLayout());

    it("holds a fixture larger than the window, so scrolling really does drop the front row", () => {
        expect(TOTAL_TRANSACTIONS).toBeGreaterThan(TRANSACTION_ROW_WINDOW_ROWS);
    });

    it("keeps the retained column stable after its source row leaves the held window", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(rowIsRendered(ROW_WITH_HISTORICAL_ALLOCATION)).toBe(true));
        expect(allocationColumnLabels()).toEqual(["Ada %", "Dee (deleted) %"]);

        const controller = controllerCapture.current;
        if (controller == null) throw new Error("Expected the page grid controller");
        controller.setFocusedCell("tx-0001", "description");
        const generationBeforeScroll = controller.getSnapshot().generation;
        const selectionBeforeScroll = controller.cellSelectionAtom.get();

        scrollGridTo((TOTAL_TRANSACTIONS - 1) * HARNESS_ROW_HEIGHT);
        await waitFor(() => expect(rowIsRendered(TOTAL_TRANSACTIONS - 1)).toBe(true));

        expect(rowIsRendered(ROW_WITH_HISTORICAL_ALLOCATION)).toBe(false);
        expect(allocationColumnLabels()).toEqual(["Ada %", "Dee (deleted) %"]);
        expect(controller.getSnapshot().generation).toBe(generationBeforeScroll);
        expect(controller.cellSelectionAtom.get()).toEqual(selectionBeforeScroll);
    });

    it("drops the column when the filters exclude every row that references the person", async () => {
        await renderTransactionsPage();
        await waitFor(() => expect(rowIsRendered(0)).toBe(true));
        expect(allocationColumnLabels()).toEqual(["Ada %", "Dee (deleted) %"]);

        // "Fuel" matches the odd rows only, so the one even row allocating to Dee leaves the set.
        fireEvent.change(screen.getByTestId("search-filter"), { target: { value: "Fuel" } });
        await waitFor(() =>
            expect(screen.getByTestId("transaction-table-toolbar")).toHaveTextContent(
                `${String(TOTAL_TRANSACTIONS / 2)} transactions (filtered)`
            )
        );

        expect(allocationColumnLabels()).toEqual(["Ada %"]);
    });
});
