/**
 * A real TanStack Table v9 instance for the transaction grid's model tests.
 *
 * Deliberately `constructTable` and not a mock. The behaviours under test — that a custom feature's
 * APIs are actually installed, that cell ranges resolve against the display order, that select-all
 * touches no rows — are all properties of the *table*, and a stand-in for the table cannot exhibit
 * or fail any of them.
 */

import {
    constructTable,
    createColumnHelper,
    functionalUpdate,
    makeStateUpdater,
    rowSelectionFeature,
    tableFeatures
} from "@tanstack/table-core";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";

import {
    createTransactionCellSelectionAtom,
    type TransactionCellSelectionAtom
} from "@/components/features/transactions/hooks/useTransactionGridController";
import {
    buildTransactionTableColumns,
    type TransactionAllocationColumn
} from "@/components/features/transactions/table-model/columns";
import {
    type TransactionTable,
    transactionTableFeatures,
    type TransactionTableRow
} from "@/components/features/transactions/table-model/features";
import {
    asTransactionId,
    type TransactionId
} from "@/components/features/transactions/table-model/ids";
import { TRANSACTION_CELL_SELECTION_OPTIONS } from "@/components/features/transactions/table-model/matching-set";

/**
 * The features used in tests.
 *
 * `useTable` injects React's reactivity bindings before spreading the app's features, so the app's
 * registry deliberately names none; a framework-neutral `constructTable` has to supply its own.
 */
export const testTransactionTableFeatures = {
    ...transactionTableFeatures,
    coreReactivityFeature: storeReactivityBindings()
};

/**
 * The same table type the app uses.
 *
 * `coreReactivityFeature` is a core slot rather than a registered feature, so adding it does not
 * widen the feature set the table's APIs are gated on. Aliasing rather than re-deriving keeps the
 * tests exercising the exact type the integration pass will hold, instead of a near-neighbour that
 * would let a real signature mismatch through.
 */
export type TestTransactionTable = TransactionTable;

export interface TestTransactionTableOptions {
    readonly transactions: readonly TransactionTableRow[];
    /**
     * Rows matching the active filters, including rows the table does not hold.
     *
     * Defaults to the number of rows handed in. Tests about selection scale pass a much larger
     * number on purpose: that gap is the thing under test.
     */
    readonly matchingRowCount?: number;
    readonly allocationColumns?: readonly TransactionAllocationColumn[];
    /** App-owned external atom supplied during table construction. */
    readonly cellSelectionAtom?: TransactionCellSelectionAtom;
    /** Counts every `getRowId` call, for the tests that assert nothing enumerated. */
    readonly onGetRowId?: () => void;
}

/**
 * How many times this table invokes each state updater. Exported so a cost assertion can be
 * expressed against it rather than against a magic number that silently loosens if this changes.
 */
export const UPDATER_INVOCATIONS = 2;

/** Two baselines are the same when their baseline and their exception set agree. */
function isSameRowSelectionBaseline(
    first: { baseline: string; exceptions: ReadonlySet<string> },
    second: { baseline: string; exceptions: ReadonlySet<string> }
): boolean {
    if (first.baseline !== second.baseline) return false;
    if (first.exceptions.size !== second.exceptions.size) return false;
    for (const id of first.exceptions) if (!second.exceptions.has(id)) return false;
    return true;
}

/**
 * Builds a table over the given rows.
 *
 * ## Every state updater is invoked TWICE, and the two results must agree
 *
 * React is permitted to call a `setState` updater more than once and throw the earlier results away
 * — it does so in development under Strict Mode, and when re-basing an update. A test table that
 * calls the updater exactly once is therefore a **weaker** environment than production, and anything
 * that only works when the updater runs once passes here and fails in a browser.
 *
 * That is not hypothetical. A lazy row order built on a bare generator — single-use — passed all
 * 2,805 unit tests and broke shift-click range selection in three E2E tests, because the browser
 * invoked the updater twice and the second pass found an exhausted iterator. Nothing in this file
 * could see it: every case iterated its span once and this table called the updater once.
 *
 * Double-invoking by default makes that class of defect die in the first unit test that touches it
 * rather than five minutes later in a load-flaky suite. A test that breaks under it is relying on a
 * guarantee React does not give, and the breakage is a finding rather than an obstacle.
 *
 * The two results are compared rather than the first discarded, so impurity is caught in EITHER
 * direction: a first pass that is wrong and a second that is right would otherwise be concealed by
 * discarding, not merely missed.
 *
 * The updater wrapped here is `onRowSelectionBaselineChange`, which is currently the table's only
 * React state updater — cell selection lives in the table's own atom store and never crosses into
 * React state. **If cell selection is ever made controlled, wrap its updater here too**, or this
 * docstring's "every" quietly stops being true.
 */
export function createTestTransactionTable(
    options: TestTransactionTableOptions
): TestTransactionTable {
    const {
        allocationColumns = [],
        cellSelectionAtom = createTransactionCellSelectionAtom(),
        onGetRowId,
        transactions
    } = options;
    // The handler needs the table, and the table needs the handler, so the reference is filled in
    // immediately after construction. No handler can fire before then: they run only from the
    // table's own APIs, which do not exist until `constructTable` returns.
    const built: { table: TestTransactionTable | null } = { table: null };

    built.table = constructTable({
        ...TRANSACTION_CELL_SELECTION_OPTIONS,
        atoms: { cellSelection: cellSelectionAtom },
        columns: buildTransactionTableColumns(allocationColumns),
        data: transactions,
        features: testTransactionTableFeatures,
        getRowId: (row) => {
            onGetRowId?.();
            return row.id;
        },
        matchingRowCount: options.matchingRowCount ?? transactions.length,
        onRowSelectionBaselineChange: (updater) => {
            const table = built.table;
            if (table == null) {
                throw new Error("a selection change fired before the table finished constructing");
            }
            makeStateUpdater(
                "rowSelectionBaseline",
                table
            )((previous) => {
                // React is entitled to throw the first result away, so the second is what counts.
                // The first is not discarded unexamined, though: both calls receive the SAME
                // `previous`, so any difference between them is impurity in the updater, which is
                // precisely what this harness exists to forbid. Comparing them closes the direction
                // that merely discarding leaves open — a defect whose first pass is wrong and whose
                // second is right would otherwise be actively concealed rather than just uncovered.
                const first = functionalUpdate(updater, previous);
                const second = functionalUpdate(updater, previous);
                if (!isSameRowSelectionBaseline(first, second)) {
                    throw new Error(
                        "a row-selection-baseline updater returned different results for the same " +
                            "previous state. React may invoke an updater more than once, so it must " +
                            "be a pure function of `previous` — a single-use iterator closed over by " +
                            "the updater is the usual cause."
                    );
                }
                return second;
            });
        }
    });
    return built.table;
}

/**
 * A table registering both this grid's selection feature and the stock one.
 *
 * Its own function, with its own feature set and its own trivial column, because the combination
 * is what is under test: threading it through the shared helpers would widen the feature type of
 * every other table built here and weaken every other assertion.
 */
export function createTableWithBothSelectionFeatures(
    rows: readonly TransactionTableRow[]
): unknown {
    const features = tableFeatures({
        ...transactionTableFeatures,
        coreReactivityFeature: storeReactivityBindings(),
        rowSelectionFeature
    });
    const helper = createColumnHelper<typeof features, TransactionTableRow>();
    return constructTable({
        atoms: { cellSelection: createTransactionCellSelectionAtom() },
        columns: helper.columns([helper.accessor("id", { id: "id" })]),
        data: rows,
        features,
        getRowId: (row) => row.id,
        matchingRowCount: rows.length
    });
}

/**
 * A table constructed without `matchingRowCount`.
 *
 * The option is required in `TableOptions_RowSelectionBaseline`, so TypeScript rejects this at
 * every ordinary call site; the omission is performed here, once, to exercise the runtime guard
 * that catches the same mistake arriving from untyped code. Without a helper like this the guard
 * would be code no test could reach.
 */
export function createTestTransactionTableWithoutMatchingRowCount(
    rows: readonly TransactionTableRow[]
): TestTransactionTable {
    const options = {
        columns: buildTransactionTableColumns([]),
        data: rows,
        features: testTransactionTableFeatures,
        getRowId: (row: TransactionTableRow) => row.id
    };
    return constructTable({ ...options, matchingRowCount: undefined as unknown as number });
}

/** A transaction with everything the grid reads, and nothing it does not. */
export function transaction(
    overrides: Partial<TransactionTableRow> & { readonly id: string }
): TransactionTableRow {
    return {
        account: "Everyday",
        amount: -1250,
        currency: "USD",
        date: "2026-03-04",
        description: `Transaction ${overrides.id}`,
        status: "Cleared",
        ...overrides
    };
}

/** `count` transactions, ids `tx-0` … `tx-{count-1}`, each with a distinguishable description. */
export function transactions(count: number): readonly TransactionTableRow[] {
    return Array.from({ length: count }, (_unused, index) =>
        transaction({
            amount: -(index + 1) * 100,
            date: `2026-03-${String((index % 28) + 1).padStart(2, "0")}`,
            description: `Payee ${String(index)}`,
            id: `tx-${String(index)}`
        })
    );
}

/** The ids of `count` transactions, in table order. */
export function transactionIds(count: number): readonly TransactionId[] {
    return Array.from({ length: count }, (_unused, index) =>
        asTransactionId(`tx-${String(index)}`)
    );
}

/** One id, tagged. */
export function id(value: string): TransactionId {
    return asTransactionId(value);
}
