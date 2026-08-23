"use client";

/**
 * Transaction Table
 *
 * The transaction grid. Its model is one TanStack Table v9 instance: the columns, the row identity,
 * the row model, row selection and cell selection all live there rather than in state kept beside it.
 * The virtualizer presents the whole matching set, while the rows the table holds are a bounded
 * window of a Loro cursor around what is visible.
 *
 * ## Why the table instance lives here rather than in the page
 *
 * The page owns the filters, the cursor and the selection value; this component owns the DOM. The
 * instance sits on this side of that line for a measured reason: a cell-selection drag writes state
 * on every cell boundary the pointer crosses, and the top-level `useTable` subscription must stay
 * unnarrowed (see `table-model/features.ts` and the React Compiler note below). A page-level table
 * would therefore re-render the filters, the toolbar and the whole page on every step of a drag.
 *
 * Row selection is still the page's: it is passed in and written back through the state/on-change
 * pair, because the bulk-edit toolbar and the deep-link reveal both act on it from outside the grid.
 *
 * ## The two counts
 *
 * `matchingRowCount` is the whole matching set: it drives the virtualizer, so the scrollbar
 * represents every matching row, and it drives every selection count. `rowWindow` is the bounded set
 * of rows the table actually holds, addressed by absolute position in that set. They coincide in
 * small fixtures and must never be conflated — feeding the row model the whole matching set is the
 * regression the cursor exists to prevent, and feeding selection the window breaks select-all. See
 * `row-window.ts` and `table-model/row-selection-baseline-feature.ts`.
 */

import { useTable } from "@tanstack/react-table";
import { defaultRangeExtractor, type Range } from "@tanstack/react-virtual";
import type { OnChangeFn } from "@tanstack/table-core";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { MemberDisplayName } from "@/lib/crdt/person";
import { cn } from "@/lib/utils";

import { AccountOption } from "../accounts";
import { type AllocationColumn, buildTransactionGridTemplate } from "./allocation-columns";
import type { StatusOption, TagOption } from "./cells";
import { CheckboxCell } from "./cells/CheckboxCell";
import type { DescriptionAliasEditOrigin } from "./cells/InlineEditableDescriptionAlias";
import { useGridCellNavigation } from "./hooks/useGridCellNavigation";
import type { TransactionRowWindow, TransactionVisibleRange } from "./row-window";
import {
    applyTransactionCellKeyIntent,
    applyTransactionMatchingSetChange,
    asTransactionId,
    buildTransactionTableColumns,
    type MatchingTransactionRows,
    readFocusedControlBoundary,
    TRANSACTION_CELL_SELECTION_OPTIONS,
    transactionCellKeyIntent,
    transactionCellSelectionRowKey,
    transactionCopyOnKeyDown,
    type TransactionRowOrder,
    type TransactionRowSelection,
    transactionGridTemplateColumns,
    transactionTableFeatures,
    transactionTableRowId
} from "./table-model";
import {
    TransactionRow,
    type TransactionRowData,
    type TransactionRowPresence
} from "./TransactionRow";
import { TransactionVirtualRows } from "./TransactionVirtualRows";

/**
 * Shared grid template for transaction table columns.
 *
 * The grid itself derives its template from the table's own columns
 * ({@link transactionGridTemplateColumns}), so this is the no-allocation-columns fallback for
 * surfaces that render a `TransactionRow` outside a table. `columns.test.ts` pins the two against
 * each other.
 */
export const TRANSACTION_GRID_TEMPLATE = buildTransactionGridTemplate(0);

export interface TransactionTableProps {
    /**
     * The rows the grid holds, each with its absolute position in the matching order.
     *
     * A bounded block around what is visible, not the whole matching set and not everything scrolled
     * past: see `row-window.ts`. The grid addresses rows by absolute position throughout — that is
     * the number the virtualizer speaks in, and the number `data-index` carries.
     */
    rowWindow: TransactionRowWindow<TransactionRowData>;
    /**
     * How many rows match the active filters, including rows that are never rendered and rows the
     * grid does not hold. The virtualizer's count, every selection count and the header's tri-state
     * all derive from it.
     *
     * Required, with no default: the only number the grid could invent for itself is the number of
     * rows it happens to hold, which is the exact bug the inverted selection representation exists
     * to prevent.
     */
    matchingRowCount: number;
    /**
     * Reports the visible span of the matching order, so the owner of the cursor can move the window
     * of rows it hands back.
     */
    onVisibleRowRangeChange?: (range: TransactionVisibleRange) => void;
    /** An absolute matching-order index the grid should scroll to, or `null`. */
    scrollToRowIndex?: number | null;
    /** Reports that {@link TransactionTableProps.scrollToRowIndex} has been applied. */
    onScrollToRowIndexApplied?: () => void;
    /**
     * Positions within the matching order, for shift-click ranges. Backed by the cursor's index, so
     * a range can span rows that are neither rendered nor paged in.
     */
    rowOrder: TransactionRowOrder;
    /** Current selection over the whole matching result set, owned by the page */
    rowSelection: TransactionRowSelection;
    /** Called with an updater whenever the grid changes the selection */
    onRowSelectionChange: OnChangeFn<TransactionRowSelection>;
    /**
     * The new matching result set, when it has changed since the last reconciliation, else `null`.
     *
     * Row selection is re-derived against it and cell selection is dropped; see
     * `table-model/matching-set.ts` for why the two answers differ.
     */
    matchingRowsChange: MatchingTransactionRows | null;
    /** Reports that {@link TransactionTableProps.matchingRowsChange} has been applied. */
    onMatchingSetReconciled: () => void;
    /** Presence data keyed by transaction ID */
    presenceByTransactionId?: Record<string, TransactionRowPresence>;
    /** Resolves a member's pubkeyHash to their display name for row presence UI (UR-003) */
    resolveMemberName?: (pubkeyHash: string) => MemberDisplayName;
    /** Available accounts for inline editing */
    availableAccounts?: AccountOption[];
    /** Available statuses for inline editing */
    availableStatuses?: StatusOption[];
    /** Available tags for inline editing */
    availableTags?: TagOption[];
    /** Callback when a new tag should be created */
    onCreateTag?: (name: string) => Promise<TagOption>;
    /** Available description aliases for autocomplete */
    availableAliases?: import("./cells/InlineEditableDescriptionAlias").DescriptionAliasOption[];
    /** Callback when user commits description text */
    onDescriptionCommitText?: (
        txId: string,
        text: string,
        origin: DescriptionAliasEditOrigin
    ) => void;
    /** Callback when user selects an existing alias from dropdown */
    onDescriptionSelectAlias?: (
        txId: string,
        aliasId: string,
        origin: DescriptionAliasEditOrigin
    ) => void;
    /**
     * Stable ID of a transaction whose description input should take keyboard focus as soon as its
     * row mounts. The table pins that row into the virtual range so a row outside the visible
     * window still mounts and can be focused, rather than the request being silently dropped.
     */
    focusDescriptionTransactionId?: string | null;
    /** Reports that the {@link focusDescriptionTransactionId} request landed, so it can be cleared. */
    onFocusDescriptionApplied?: () => void;
    /** Callback when a transaction is clicked */
    onTransactionClick?: (id: string) => void;
    /** Callback when a transaction row receives focus */
    onTransactionFocus?: (id: string) => void;
    /** Callback when focus lands in a specific cell, identified by its stable field name */
    onTransactionFieldFocus?: (id: string, field: string | undefined) => void;
    /** Callback when focus leaves the table entirely */
    onTransactionBlur?: () => void;
    /** Callback when transaction is updated */
    onTransactionUpdate?: (id: string, updates: Partial<TransactionRowData>) => void;
    /**
     * Wrap a rule-backed cell of a given transaction so a change to it can offer to become an
     * automation rule (UR-009). Forwarded per row exactly like {@link renderDescriptionRobot}.
     */
    renderRuleProposal?: (
        transactionId: string,
        field: "descriptionAlias" | "tags" | "allocation",
        context: { readonly isEditing: boolean },
        cell: React.ReactNode,
        anchorClassName: string | undefined,
        style: React.CSSProperties | undefined
    ) => React.ReactNode;
    /**
     * Render the inline description-rule robot for a given transaction. The table forwards each
     * row's live editing state so the affordance can hide while the description is being edited.
     */
    renderDescriptionRobot?: (
        transactionId: string,
        context: { readonly isEditing: boolean }
    ) => React.ReactNode;
    /** Person-specific allocation columns shared by the header and every row */
    allocationColumns?: readonly AllocationColumn[];
    /** Callback for one validated person allocation edit */
    onTransactionAllocationUpdate?: (id: string, personId: string, value: number) => void;
    /** Callback when a transaction should be deleted */
    onTransactionDelete?: (id: string) => void;
    /** Callback when a duplicate is resolved (kept) */
    onResolveDuplicate?: (id: string) => void;
    /** Additional CSS classes */
    className?: string;
}

/** No allocation columns, as one module-level constant so the columns memo has a stable default. */
const NO_ALLOCATION_COLUMNS: readonly AllocationColumn[] = [];

/**
 * The `data-cell` markers of one row's selected cells.
 *
 * Asked of the cells rather than derived from the selection's rectangles, so a column that opts out
 * of selection cannot appear here and the answer cannot disagree with the feature's own geometry. For
 * every column that takes part in a range, the marker and the column id are the same string.
 */
function selectedCellMarkersOfRow(row: {
    readonly getAllCells: () => readonly {
        readonly column: { readonly id: string };
        readonly getIsSelected: () => boolean;
    }[];
}): ReadonlySet<string> {
    const markers = new Set<string>();
    for (const cell of row.getAllCells()) {
        if (cell.getIsSelected()) markers.add(cell.column.id);
    }
    return markers;
}

/**
 * Table header with column labels and select-all checkbox.
 */
interface TransactionTableHeaderProps {
    allocationColumns: readonly AllocationColumn[];
    gridTemplateColumns: string;
    /** Whether all matching transactions are selected */
    isAllSelected: boolean;
    /** Whether some (but not all) matching transactions are selected */
    isSomeSelected: boolean;
    /** Callback to toggle select-all */
    onSelectAll: () => void;
}

function TransactionTableHeader({
    allocationColumns,
    gridTemplateColumns,
    isAllSelected,
    isSomeSelected,
    onSelectAll
}: TransactionTableHeaderProps) {
    return (
        <div
            className="bg-muted sticky top-0 z-10 grid min-w-fit items-center gap-4 border-b px-4 py-2 text-sm font-medium"
            style={{ gridTemplateColumns }}
            role="row"
        >
            {/* Checkbox column */}
            <div data-testid="header-checkbox" role="columnheader" aria-label="Select all">
                <CheckboxCell
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={onSelectAll}
                    ariaLabel={
                        isAllSelected ? "Deselect all transactions" : "Select all transactions"
                    }
                    // The header is `py-2` against the data row's `py-3`, so it is 20px shorter.
                    // Its activation area must be sized for its own row or it reaches past the
                    // header's bottom edge and into the first transaction's checkbox cell.
                    rowGeometry="header"
                />
            </div>
            <div role="columnheader">Date</div>
            <div className="truncate" role="columnheader">
                Description
            </div>
            <div className="truncate" role="columnheader">
                Account
            </div>
            <div role="columnheader">Tags</div>
            <div role="columnheader">Status</div>
            {allocationColumns.map((column) => (
                <div
                    key={column.personId}
                    className="truncate text-right"
                    title={`${column.label} allocation percentage`}
                    role="columnheader"
                >
                    {column.label} %
                </div>
            ))}
            <div className="text-right" role="columnheader">
                Amount
            </div>
            <div role="columnheader" aria-label="Actions" />
        </div>
    );
}

/**
 * Empty state when no transactions exist.
 */
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-4xl">📊</div>
            <h3 className="mt-4 text-lg font-semibold">No transactions yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
                Import transactions or add them manually to get started.
            </p>
        </div>
    );
}

/**
 * Transaction Table component with virtualization over the whole matching set.
 */
export function TransactionTable({
    rowWindow,
    matchingRowCount,
    onVisibleRowRangeChange,
    scrollToRowIndex = null,
    onScrollToRowIndexApplied,
    rowOrder,
    rowSelection,
    onRowSelectionChange,
    matchingRowsChange,
    onMatchingSetReconciled,
    presenceByTransactionId = {},
    resolveMemberName,
    availableAccounts = [],
    availableStatuses = [],
    availableTags = [],
    onCreateTag,
    availableAliases = [],
    onDescriptionCommitText,
    onDescriptionSelectAlias,
    focusDescriptionTransactionId = null,
    onFocusDescriptionApplied,
    onTransactionClick,
    onTransactionFocus,
    onTransactionFieldFocus,
    onTransactionBlur,
    onTransactionUpdate,
    allocationColumns = NO_ALLOCATION_COLUMNS,
    onTransactionAllocationUpdate,
    onTransactionDelete,
    onResolveDuplicate,
    renderDescriptionRobot,
    renderRuleProposal,
    className
}: TransactionTableProps) {
    // The scroll container, held as state rather than only as a ref. `TransactionVirtualRows` needs
    // the element itself on its first layout effect, and a ref is still `null` then — see the note on
    // its `scrollElement` prop. A `useState`-backed callback ref costs one extra render on mount and
    // gets the virtualizer a real viewport to measure.
    const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Grid cell navigation for arrow up/down between cells
    const { handleGridKeyDown } = useGridCellNavigation();

    // v9 requires a reference-stable `columns` array, and the people are the only thing that changes
    // it — exactly the memoisation boundary `buildAllocationColumnModel` already has upstream.
    const columns = useMemo(
        () => buildTransactionTableColumns(allocationColumns),
        [allocationColumns]
    );

    // Memoised so the table object `useTable` returns keeps its identity across renders that change
    // neither the options nor the state. That identity is what the React Compiler keys its cache of
    // table reads on, so rebuilding it every render would quietly discard the memoisation.
    const tableOptions = useMemo(
        () => ({
            ...TRANSACTION_CELL_SELECTION_OPTIONS,
            columns,
            // Cell ranges are keyboard-only here, because mousedown in a rangeable cell is already
            // claimed by a control — a drag-to-select range would fight the gesture it shares.
            //
            // Stated accurately, because the shorter version of this claim ("every cell is a live
            // input, so mousedown places a caret") is overstated and was corrected: of the eight
            // rangeable columns only date, description and amount are text inputs where mousedown
            // places a caret. Account is a combobox, tags and allocation are buttons, and status is
            // a Radix `SelectTrigger` — there mousedown opens a popover instead. Either way the
            // gesture belongs to the control, which is why the conclusion holds for all of them;
            // it just does not hold for the reason originally given.
            //
            // Drag and disjoint Ctrl/Cmd ranges are **not wired in this port**, which is a different
            // statement from "omitted" and the accurate one: multi-cell selection is entirely new
            // here. At the pre-port commit `git grep -iE 'cellSelection|selectedCells|anchorCell|
            // onMouseDown'` across `src` returns nothing, so there was no cell-range behaviour to
            // preserve and nothing regressed. The honest residue is that the capability's APIs *are*
            // installed — `selectAllCells`, `getSelectionStartHandler` and `getSelectionExtendHandler`
            // all exist on the table — and are deliberately left unbound, so the feature is partly
            // wired rather than absent.
            enableCellSelectionDrag: false,
            data: rowWindow.rows,
            features: transactionTableFeatures,
            getRowId: transactionTableRowId,
            matchingRowCount,
            onRowSelectionBaselineChange: onRowSelectionChange,
            state: { rowSelectionBaseline: rowSelection }
        }),
        [columns, matchingRowCount, onRowSelectionChange, rowSelection, rowWindow]
    );

    // The default, unnarrowed subscription, deliberately. A narrowed selector stops `useTable` from
    // returning a new identity when an excluded slice changes, and under this repo's React Compiler
    // a compiled read of that slice is then frozen for the component's lifetime. Fine-grained
    // subscriptions belong in the subtree, via `table.Subscribe`.
    const table = useTable(tableOptions);

    const rows = table.getRowModel().rows;
    const gridTemplateColumns = transactionGridTemplateColumns(table);
    const headerState = table.getRowSelectionHeaderState();

    /**
     * Absolute matching-order position → position in the row model.
     *
     * The two differ by more than an offset: the window is a contiguous block *plus* whatever rows
     * are pinned outside it, so the mapping is the window's own index list rather than arithmetic.
     */
    const displayIndexByRowIndex = useMemo(
        () => new Map(rowWindow.indexes.map((rowIndex, displayIndex) => [rowIndex, displayIndex])),
        [rowWindow]
    );
    /** The inverse, for the rows the grid is asked about by id rather than by position. */
    const rowIndexById = useMemo(
        () =>
            new Map(
                rowWindow.rows.map((row, displayIndex) => [row.id, rowWindow.indexes[displayIndex]])
            ),
        [rowWindow]
    );

    /**
     * The columns whose cells can be part of a range, read off the table rather than re-listed.
     *
     * The checkbox and actions columns opt out in their own column defs, so asking the table keeps
     * this from drifting away from them.
     */
    const rangeableColumnIds = useMemo(
        () =>
            new Set(
                table
                    .getVisibleLeafColumns()
                    .filter((column) => column.columnDef.enableCellSelection !== false)
                    .map((column) => column.id)
            ),
        [table]
    );

    /**
     * Single-cell selection follows focus.
     *
     * This adds no gesture: focus already moves by arrow key, Tab and click, so anchoring on it makes
     * the single-cell state real without competing with anything the user already does. `field` is
     * the cell's stable `data-cell` marker, which for every rangeable column *is* the column id.
     *
     * Focus landing anywhere else in the row — the checkbox, an action button, the notes row, or the
     * row's own chrome — drops the selection rather than leaving a stale anchor behind. A stale anchor
     * is worse than none: the next Shift+arrow would extend a range from a cell the caret is not in.
     *
     * `TransactionRow` calls this only for a focus target inside the row's own DOM, which is what keeps
     * a cell's *portaled* editor from looking like focus leaving the row. That distinction is not
     * cosmetic: the date calendar renders into `document.body` while its focus still bubbles through
     * the React tree, so an earlier version cleared the selection on mousedown inside the popover, and
     * the resulting re-render meant the day button's click never completed — the date silently failed
     * to save and the calendar stayed open, with no error anywhere.
     */
    const applyFocusedCell = useCallback(
        (transactionId: string, marker: string | null) => {
            if (marker != null && rangeableColumnIds.has(marker)) {
                table.setFocusedCell(transactionId, marker);
                return;
            }
            table.resetCellSelection(true);
        },
        [rangeableColumnIds, table]
    );

    /**
     * The grid's own keyboard gestures, ahead of cell-to-cell focus navigation.
     *
     * Two claims, both narrow:
     *
     * - **Shift+arrow** extends the cell range, but only once the caret has run out of room in that
     *   direction — inside a text control with text left to select, the control keeps the key. That
     *   is the same boundary convention plain arrows already follow.
     * - **Ctrl/Cmd+C** copies the range, but only when it spans more than one cell and no text is
     *   selected anywhere. See `copy-intent.ts`.
     *
     * A plain arrow is deliberately *not* routed to `moveCellSelection`. Focus navigation already
     * moves the caret and `applyFocusedCell` re-anchors on arrival, so one keystroke would otherwise
     * have two owners that can disagree: `useGridCellNavigation` sends Down from a description into
     * that row's expanded notes, while `moveCellSelection("down")` goes to the next row — leaving the
     * range pointing at a cell the caret is not in.
     */
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            // The control is read off the event's **target**, not `document.activeElement`. By the
            // time a keystroke bubbles up here a cell's own handler may already have moved focus —
            // Escape in a description cell reverts its value and blurs — and reading the live focus
            // would then see `document.body`, conclude "not a text control", and clear the whole
            // selection on a keystroke the cell had already consumed. The target is where the key was
            // delivered, which is the control that owned it.
            const control = event.target instanceof Element ? event.target : null;
            const intent = transactionCellKeyIntent(event, readFocusedControlBoundary(control));
            const claimed = intent.kind === "move" ? ({ kind: "ignore" } as const) : intent;
            if (applyTransactionCellKeyIntent(table, claimed, () => setFocusedId(null))) {
                event.preventDefault();
                return;
            }

            const payload = transactionCopyOnKeyDown(table, event, {
                activeElement: control,
                selection: window.getSelection()
            });
            if (payload != null) {
                event.preventDefault();
                void navigator.clipboard.writeText(payload.text);
                return;
            }

            handleGridKeyDown(event);
        },
        [handleGridKeyDown, table]
    );

    /**
     * The change already applied, so a re-render that only gives the table a new identity does not
     * reconcile twice — and in particular does not enumerate the newly-matching rows again.
     */
    const appliedMatchingChange = useRef<MatchingTransactionRows | null>(null);
    // A layout effect rather than a passive one: the reconciled counts feed the toolbars, and a
    // painted frame reporting rows that no longer match would be a visible lie.
    useLayoutEffect(() => {
        if (matchingRowsChange == null || appliedMatchingChange.current === matchingRowsChange) {
            return;
        }
        appliedMatchingChange.current = matchingRowsChange;
        applyTransactionMatchingSetChange(table, matchingRowsChange);
        onMatchingSetReconciled();
    }, [matchingRowsChange, onMatchingSetReconciled, table]);

    /**
     * Retracts presence when focus leaves the table entirely.
     *
     * Checked against `relatedTarget` so moving between rows or cells does not retract — that would
     * make a peer's indicator flicker on every arrow key. Only leaving the grid (or the document)
     * clears focus.
     */
    const handleGridBlur = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            onTransactionBlur?.();
        },
        [onTransactionBlur]
    );

    const focusedIndex = focusedId == null ? undefined : rowIndexById.get(focusedId);
    const focusDescriptionIndex =
        focusDescriptionTransactionId == null
            ? undefined
            : rowIndexById.get(focusDescriptionTransactionId);
    // Both the row that currently holds focus and the row that has been asked to take focus must
    // stay mounted regardless of scroll position: unmounting the former loses the caret, and
    // unmounting the latter means the focus request never lands at all.
    const extractVirtualRange = useCallback(
        (range: Range) => {
            const visibleIndexes = defaultRangeExtractor(range);
            const pinnedIndexes = [focusedIndex, focusDescriptionIndex].filter(
                (index): index is number => index != null && !visibleIndexes.includes(index)
            );
            if (pinnedIndexes.length === 0) return visibleIndexes;
            return [...new Set([...visibleIndexes, ...pinnedIndexes])].sort(
                (left, right) => left - right
            );
        },
        [focusDescriptionIndex, focusedIndex]
    );

    // Keyboard shortcuts for duplicate resolution and deletion
    useEffect(() => {
        /**
         * The one selected row, when the selection names exactly one, by id and without the grid
         * having to hold it.
         *
         * Under the ordinary `no-rows` baseline the answer is the single exception, which costs a
         * set read. Under `all-matching` every matching row but one is an exception, so the
         * survivor has to be found by walking the matching order — reachable only by selecting all
         * and then deselecting all but one, and paid on that keystroke rather than in render.
         */
        const resolveSingleSelectedRowId = (): string | null => {
            if (table.getSelectedRowCount() !== 1) return null;
            const selection = table.getRowSelectionBaseline();
            if (selection.baseline === "no-rows") {
                for (const transactionId of selection.exceptions) return transactionId;
                return null;
            }
            for (const transactionId of rowOrder.slice(0, matchingRowCount - 1)) {
                if (!selection.exceptions.has(transactionId)) return transactionId;
            }
            return null;
        };

        const handleRowShortcutKeyDown = (event: KeyboardEvent) => {
            // Only handle keys pressed while focus is inside the grid — a bare "d" or Backspace
            // aimed at a button or select elsewhere on the page must never delete a transaction.
            // Checked before resolving a target, because this rejects almost every keystroke the
            // page sees and costs a `contains` rather than a walk over the loaded rows.
            const target = event.target;
            if (!(target instanceof Node) || !scrollElement?.contains(target)) return;

            // Don't handle if user is typing in an input
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)
            ) {
                return;
            }

            // Exactly one selected row, resolved from the selection itself and the matching order
            // rather than from the rows the grid happens to hold. The count was always over the
            // whole matching set while the lookup was over the loaded rows, so a selected row
            // scrolled out of the window simply stopped resolving and the keystroke did nothing.
            const targetId = focusedId ?? resolveSingleSelectedRowId();
            if (targetId == null) return;

            const transaction = table
                .getRowModel()
                .rows.find((row) => row.id === targetId)?.original;

            switch (event.key.toLowerCase()) {
                case "k":
                    // K = Keep (resolve duplicate). The only branch that reads the row's data, so
                    // the only one that needs the row to be one the grid currently holds.
                    if (transaction?.possibleDuplicateOf && onResolveDuplicate) {
                        event.preventDefault();
                        onResolveDuplicate(targetId);
                    }
                    break;
                case "d":
                    // D = Delete (only if not shift/ctrl/cmd pressed for other shortcuts)
                    if (
                        !event.shiftKey &&
                        !event.ctrlKey &&
                        !event.metaKey &&
                        onTransactionDelete
                    ) {
                        event.preventDefault();
                        onTransactionDelete(targetId);
                    }
                    break;
                case "delete":
                case "backspace":
                    // Delete/Backspace = Delete transaction
                    if (onTransactionDelete) {
                        event.preventDefault();
                        onTransactionDelete(targetId);
                    }
                    break;
            }
        };

        document.addEventListener("keydown", handleRowShortcutKeyDown);
        return () => document.removeEventListener("keydown", handleRowShortcutKeyDown);
    }, [
        focusedId,
        matchingRowCount,
        onResolveDuplicate,
        onTransactionDelete,
        rowOrder,
        scrollElement,
        table
    ]);

    // Handle single row click (navigation/focus only - selection is handled by checkbox)
    const handleRowClick = useCallback(
        (id: string) => {
            if (onTransactionClick) {
                onTransactionClick(id);
            }
        },
        [onTransactionClick]
    );

    // Handle checkbox click (toggles selection, and anchors a later shift-click here)
    const handleCheckboxChange = useCallback(
        (id: string) => {
            table.toggleRowSelected(asTransactionId(id));
        },
        [table]
    );

    // Handle expand/collapse for notes
    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Handle shift-click on checkbox for range selection. The order is the cursor's, so the range
    // covers rows that are neither rendered nor paged in.
    const handleCheckboxShiftClick = useCallback(
        (id: string) => {
            table.extendRowSelectionTo(asTransactionId(id), rowOrder);
        },
        [rowOrder, table]
    );

    const handleSelectAll = useCallback(() => {
        table.toggleAllMatchingRowsSelected();
    }, [table]);

    /**
     * A collapsed row's height, which is what the virtualizer estimates every unmeasured row at.
     *
     * 57px is measured in the running app and recorded in `cells/cell-hit-area.ts`: the row is
     * `px-4 py-3` with a `border-b`, and that file's geometry table reads `row | 219, 57`. This was
     * 44 — 23% short of a row that had already been measured and written down elsewhere in the same
     * component tree — which made the scrollable extent 23% short of the content it represents, and
     * gave every first measurement a non-zero delta to correct.
     *
     * Dynamic measurement still corrects it, and still has to: an expanded notes row is 75px or
     * 103px, and one constant cannot be right for all three. The estimate only has to be right for
     * the common row, which is the collapsed one.
     *
     * ## Why this is a constant and not `estimateSize: (index) => …`
     *
     * TanStack Virtual passes the index, so the estimate *could* return 75 or 103 for a row whose
     * notes are expanded — `expandedIds` is right here in this component. It deliberately does not,
     * and the reason is worth stating because the omission looks like an oversight:
     *
     * - Three real heights exist (57 collapsed, 75 and 103 expanded), so index-awareness would be
     *   right for the expanded rows and would leave the collapsed ones exactly as they are. The
     *   collapsed row is the overwhelming majority, and it is the one this constant now matches.
     * - The estimate governs only the guess for rows that have **not been measured yet**. Expansion
     *   is a gesture the user makes on a row that is on screen, and an on-screen row is measured —
     *   so the rows whose height index-awareness would fix are precisely the rows whose real height
     *   the virtualizer already knows.
     * - It was proposed as a fix for the trailing-gap defect and investigated at length. The
     *   per-row geometry from the browser diagnostic ruled it out: `translateY` deltas equalled
     *   `offsetHeight` exactly on the 75px and 103px rows, so the measurements those rows were
     *   positioned from were already correct.
     *
     * If a future measurement shows the pre-measurement guess for expanded rows mattering, adding
     * it is a small change. It should arrive with that measurement rather than on the argument
     * above being reversed.
     */
    const ROW_HEIGHT = 57;
    const OVERSCAN = 5;

    // Wrapped so the leaf's contract stays unconditional. The leaf is outside the compiled tree, so
    // it must be handed callbacks rather than deciding anything about them.
    const handleVisibleRangeChange = useCallback(
        (range: TransactionVisibleRange) => onVisibleRowRangeChange?.(range),
        [onVisibleRowRangeChange]
    );
    const handleScrollToRowIndexApplied = useCallback(
        () => onScrollToRowIndexApplied?.(),
        [onScrollToRowIndexApplied]
    );

    /**
     * The row's React key, or `null` for a position the grid does not hold.
     *
     * `null` is reachable: the virtualizer addresses the whole matching set while the grid holds a
     * bounded window of it, so a jump that outruns the window asks about a position for one commit
     * before the window has moved. The virtualizer skips those positions rather than mounting an
     * empty row, which cannot be told apart from a real one.
     */
    const getRowKey = useCallback(
        (index: number) => {
            const displayIndex = displayIndexByRowIndex.get(index);
            return displayIndex == null ? null : (rowWindow.rows[displayIndex]?.id ?? null);
        },
        [displayIndexByRowIndex, rowWindow]
    );

    /**
     * Renders one transaction row for the virtualizer, addressed by absolute matching-order index.
     *
     * A callback rather than inline JSX because the virtualizer now lives in its own component:
     * `TransactionVirtualRows` is skipped by the React Compiler, so anything computed in there
     * would lose its memoization. Building the row up here keeps it in the compiled tree.
     */
    const renderRow = useCallback(
        (index: number) => {
            const displayIndex = displayIndexByRowIndex.get(index);
            const row = displayIndex == null ? undefined : rows[displayIndex];
            if (row == null || displayIndex == null) return null;
            const transaction = row.original;
            const rowElement = (selectedCellMarkers: ReadonlySet<string>) => (
                <TransactionRow
                    selectedCellMarkers={selectedCellMarkers}
                    transaction={transaction}
                    presence={presenceByTransactionId[transaction.id]}
                    resolveMemberName={resolveMemberName}
                    isSelected={row.getIsSelected()}
                    isExpanded={expandedIds.has(transaction.id)}
                    focusDescriptionRequested={focusDescriptionTransactionId === transaction.id}
                    onFocusDescriptionApplied={onFocusDescriptionApplied}
                    availableAccounts={availableAccounts}
                    availableStatuses={availableStatuses}
                    availableTags={availableTags}
                    allocationColumns={allocationColumns}
                    gridTemplateColumns={gridTemplateColumns}
                    onCreateTag={onCreateTag}
                    availableAliases={availableAliases}
                    onDescriptionCommitText={
                        onDescriptionCommitText
                            ? (text, origin) =>
                                  onDescriptionCommitText(transaction.id, text, origin)
                            : undefined
                    }
                    onDescriptionSelectAlias={
                        onDescriptionSelectAlias
                            ? (aliasId, origin) =>
                                  onDescriptionSelectAlias(transaction.id, aliasId, origin)
                            : undefined
                    }
                    renderDescriptionRobot={
                        renderDescriptionRobot
                            ? (ctx) => renderDescriptionRobot(transaction.id, ctx)
                            : undefined
                    }
                    renderRuleProposal={
                        renderRuleProposal
                            ? (field, ctx, cell, anchorClassName, style) =>
                                  renderRuleProposal(
                                      transaction.id,
                                      field,
                                      ctx,
                                      cell,
                                      anchorClassName,
                                      style
                                  )
                            : undefined
                    }
                    onClick={() => handleRowClick(transaction.id)}
                    onFocus={() => {
                        setFocusedId(transaction.id);
                        onTransactionFocus?.(transaction.id);
                    }}
                    onFieldFocus={(field) => onTransactionFieldFocus?.(transaction.id, field)}
                    onCellFocus={(marker) => applyFocusedCell(transaction.id, marker)}
                    onFieldUpdate={
                        onTransactionUpdate
                            ? (field, value) =>
                                  onTransactionUpdate(transaction.id, {
                                      [field]: value
                                  })
                            : undefined
                    }
                    onAllocationUpdate={
                        onTransactionAllocationUpdate
                            ? (personId, value) =>
                                  onTransactionAllocationUpdate(transaction.id, personId, value)
                            : undefined
                    }
                    onDelete={
                        onTransactionDelete ? () => onTransactionDelete(transaction.id) : undefined
                    }
                    onResolveDuplicate={
                        onResolveDuplicate ? () => onResolveDuplicate(transaction.id) : undefined
                    }
                    onCheckboxChange={() => handleCheckboxChange(transaction.id)}
                    onCheckboxShiftClick={() => handleCheckboxShiftClick(transaction.id)}
                    onToggleExpand={() => handleToggleExpand(transaction.id)}
                />
            );

            // Subscribed per row, and projected through a value that changes only when *this* row's
            // selection painting should change. `cellSelection` is an ordered log of rectangle
            // operations that a Shift+arrow appends to on every step, so a table-level subscription
            // would reconcile every mounted row for each one.
            return (
                <table.Subscribe
                    source={table.atoms.cellSelection}
                    selector={() => transactionCellSelectionRowKey(table, displayIndex)}
                >
                    {() => rowElement(selectedCellMarkersOfRow(row))}
                </table.Subscribe>
            );
        },
        [
            allocationColumns,
            applyFocusedCell,
            availableAccounts,
            availableAliases,
            availableStatuses,
            availableTags,
            displayIndexByRowIndex,
            expandedIds,
            focusDescriptionTransactionId,
            gridTemplateColumns,
            handleCheckboxChange,
            handleCheckboxShiftClick,
            handleRowClick,
            handleToggleExpand,
            onCreateTag,
            onDescriptionCommitText,
            onDescriptionSelectAlias,
            onFocusDescriptionApplied,
            onResolveDuplicate,
            onTransactionAllocationUpdate,
            onTransactionDelete,
            onTransactionFieldFocus,
            onTransactionFocus,
            onTransactionUpdate,
            presenceByTransactionId,
            renderDescriptionRobot,
            renderRuleProposal,
            resolveMemberName,
            rows,
            table
        ]
    );

    // After every hook, so a filter that matches nothing still reconciles the selections above.
    // Keyed on the matching count rather than on the rows the grid holds: those are a window, and an
    // empty window over a non-empty result set is a scroll position, not an empty grid.
    if (matchingRowCount === 0) {
        return <EmptyState />;
    }

    return (
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>
            <div ref={setScrollElement} className="flex min-h-0 flex-1 flex-col overflow-auto">
                <div
                    className="relative min-w-fit flex-1"
                    role="grid"
                    aria-label="Transactions"
                    data-testid="transaction-table"
                    onKeyDown={handleKeyDown}
                    onBlur={handleGridBlur}
                >
                    <TransactionTableHeader
                        allocationColumns={allocationColumns}
                        gridTemplateColumns={gridTemplateColumns}
                        isAllSelected={headerState === "all"}
                        isSomeSelected={headerState === "some"}
                        onSelectAll={handleSelectAll}
                    />

                    <TransactionVirtualRows
                        count={matchingRowCount}
                        scrollElement={scrollElement}
                        estimatedRowHeight={ROW_HEIGHT}
                        overscan={OVERSCAN}
                        rangeExtractor={extractVirtualRange}
                        getRowKey={getRowKey}
                        onVisibleRangeChange={handleVisibleRangeChange}
                        scrollToRowIndex={scrollToRowIndex}
                        onScrollToRowIndexApplied={handleScrollToRowIndexApplied}
                        renderRow={renderRow}
                    />
                </div>
            </div>
        </div>
    );
}
