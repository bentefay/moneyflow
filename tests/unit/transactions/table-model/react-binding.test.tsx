/**
 * How the v9 React binding behaves under this repo's React Compiler, and what that costs.
 *
 * This repo builds with `reactCompiler: true`. The compiler carries a hardcoded incompatible-library
 * list, and its `@tanstack/react-table` entry is keyed on the hook name `useReactTable` — which v9
 * does not export. So v9's `useTable` gets **no bail-out**: compiled output caches table reads
 * keyed on the `table` binding, e.g.
 *
 * ```js
 * if ($[4] !== table) { const rows = table.getRowModel().rows; t2 = rows.map(...); $[4] = table; }
 * ```
 *
 * (measured by running `babel-plugin-react-compiler` over such a component; the same probe leaves a
 * `useVirtualizer` component entirely uncompiled, confirming the bail-out list works and simply does
 * not cover `useTable`.)
 *
 * That caching is only safe if the object `useTable` returns takes a **new identity** whenever the
 * state a read depends on changes. It does — `useTable` ends in
 * `useMemo(() => ({...table, options, state}), [table, tableOptions, state])`. These tests measure
 * that, because the whole compiler story rests on it, and because vitest does **not** run the
 * compiler: no unit test in this repo can catch a compiler-induced freeze directly, so the premise
 * is what has to be pinned instead.
 *
 * The second describe block is the sharp edge: narrowing the `useTable` selector for performance is
 * exactly what breaks the premise for the slices it excludes.
 */

import { type TableState, useTable } from "@tanstack/react-table";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
    buildTransactionTableColumns,
    type TransactionAllocationColumn
} from "@/components/features/transactions/table-model/columns";
import {
    type TransactionTable,
    transactionTableFeatures,
    type TransactionTableFeatures,
    type TransactionTableRow
} from "@/components/features/transactions/table-model/features";
import { TRANSACTION_CELL_SELECTION_OPTIONS } from "@/components/features/transactions/table-model/matching-set";

import { id, transactions } from "./test-table";

const NO_PEOPLE: readonly TransactionAllocationColumn[] = [];
const columns = buildTransactionTableColumns(NO_PEOPLE);
const data = transactions(4);

interface Recorded {
    /** The object `useTable` returned on each render, in order. */
    readonly tables: TransactionTable[];
}

/**
 * Renders a grid through the real React adapter and records the table object each render produced.
 *
 * `selector` mirrors what an integration would pass to narrow its top-level subscription.
 */
function renderGrid(
    selector?: (state: TableState<TransactionTableFeatures>) => unknown
): Recorded & { readonly table: () => TransactionTable } {
    const tables: TransactionTable[] = [];

    function Grid() {
        const table = useTable(
            {
                ...TRANSACTION_CELL_SELECTION_OPTIONS,
                columns,
                data,
                features: transactionTableFeatures,
                getRowId: (row: TransactionTableRow) => row.id,
                matchingRowCount: data.length
            },
            selector
        );
        tables.push(table);
        // A read of the kind the compiler caches keyed on `table`.
        return <div>{table.getRowModel().rows.length}</div>;
    }

    render(<Grid />);
    return { table: () => tables[tables.length - 1], tables };
}

describe("useTable with the default subscription", () => {
    it("returns a new table identity when a state slice changes", () => {
        const recorded = renderGrid();
        const before = recorded.table();

        act(() => {
            before.toggleRowSelected(id("tx-1"));
        });

        // The premise the compiler's caching depends on: a state change produces a *different*
        // `table` object, so a memo keyed on `table` invalidates and the rows re-render.
        expect(recorded.tables.length).toBeGreaterThan(1);
        expect(recorded.table()).not.toBe(before);
        expect(recorded.table().getIsRowSelected(id("tx-1"))).toBe(true);
    });

    it("returns a new identity for a cell-selection change too", () => {
        const recorded = renderGrid();
        const before = recorded.table();

        act(() => {
            before.setFocusedCell(id("tx-2"), "amount");
        });

        expect(recorded.table()).not.toBe(before);
        expect(recorded.table().getSelectedCellCount()).toBe(1);
    });
});

describe("useTable with a narrowed subscription", () => {
    it("does NOT re-render, and does NOT change identity, for an excluded slice", () => {
        // Narrowed to cell selection only — the shape an integration would reach for to avoid
        // re-rendering the grid on every row-selection change.
        const recorded = renderGrid((state) => ({ cellSelection: state.cellSelection }));
        const before = recorded.table();
        const rendersBefore = recorded.tables.length;

        act(() => {
            before.toggleRowSelected(id("tx-1"));
        });

        // The write landed in table state...
        expect(before.getIsRowSelected(id("tx-1"))).toBe(true);
        // ...but the component neither re-rendered nor got a new table identity. Under the compiler
        // this is a frozen read: a memo keyed on `table` would never invalidate, so anything derived
        // from row selection would keep its first-render value. The mitigation is not a wider
        // selector by default — it is to read that slice through `table.Subscribe` /
        // `useSelector(table.atoms.rowSelectionBaseline, ...)` in the subtree that needs it.
        expect(recorded.tables.length).toBe(rendersBefore);
        expect(recorded.table()).toBe(before);
    });

    it("still re-renders for the slice it does subscribe to", () => {
        const recorded = renderGrid((state) => ({ cellSelection: state.cellSelection }));
        const before = recorded.table();

        act(() => {
            before.setFocusedCell(id("tx-2"), "amount");
        });

        expect(recorded.table()).not.toBe(before);
    });
});
