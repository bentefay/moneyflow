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
import {
    useTransactionGridControllerSnapshot,
    type TransactionGridWorkspaceController
} from "./hooks/useTransactionGridController";
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
    transactionSelectedCellMarkersFromRowKey,
    type TransactionRowOrder,
    type TransactionRowSelection,
    transactionGridTemplateColumns,
    transactionTableFeatures,
    transactionTableRowId
} from "./table-model";
import {
    TransactionRow,
    type TransactionGridRowSurface,
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
    /** Workspace authority for interaction state, projection generation and cell selection. */
    controller: TransactionGridWorkspaceController;
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
     * Row selection is re-derived against it. Cell selection is reconciled separately by the
     * workspace's structural projection authority; see `table-model/matching-set.ts`.
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
            aria-rowindex={1}
        >
            {/* Checkbox column */}
            <div
                data-testid="header-checkbox"
                role="columnheader"
                aria-label="Select all"
                aria-colindex={1}
            >
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
            <div role="columnheader" aria-colindex={2}>
                Date
            </div>
            <div className="truncate" role="columnheader" aria-colindex={3}>
                Description
            </div>
            <div className="truncate" role="columnheader" aria-colindex={4}>
                Account
            </div>
            <div role="columnheader" aria-colindex={5}>
                Tags
            </div>
            <div role="columnheader" aria-colindex={6}>
                Status
            </div>
            {allocationColumns.map((column, index) => (
                <div
                    key={column.personId}
                    className="truncate text-right"
                    title={`${column.label} allocation percentage`}
                    role="columnheader"
                    aria-colindex={index + 7}
                >
                    {column.label} %
                </div>
            ))}
            <div
                className="text-right"
                role="columnheader"
                aria-colindex={allocationColumns.length + 7}
            >
                Amount
            </div>
            <div
                role="columnheader"
                aria-label="Actions"
                aria-colindex={allocationColumns.length + 8}
            />
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
    controller,
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
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const controllerSnapshot = useTransactionGridControllerSnapshot(controller);
    const handleScrollElementChange = useCallback(
        (element: HTMLDivElement | null) => {
            setScrollElement(element);
            controller.registerScrollElement(element);
        },
        [controller]
    );
    const handleAfterGridElementChange = useCallback(
        (element: HTMLButtonElement | null) => controller.registerAfterGridElement(element),
        [controller]
    );

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
            atoms: { cellSelection: controller.cellSelectionAtom },
            columns,
            data: rowWindow.rows,
            features: transactionTableFeatures,
            getRowId: transactionTableRowId,
            matchingRowCount,
            onRowSelectionBaselineChange: onRowSelectionChange,
            state: { rowSelectionBaseline: rowSelection }
        }),
        [
            controller.cellSelectionAtom,
            columns,
            matchingRowCount,
            onRowSelectionChange,
            rowSelection,
            rowWindow
        ]
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
    const expandedRowIndexes = useMemo(
        () =>
            [...expandedIds]
                .flatMap((transactionId) => {
                    const index = rowOrder.indexOf(asTransactionId(transactionId));
                    return index < 0 ? [] : [index];
                })
                .sort((left, right) => left - right),
        [expandedIds, rowOrder]
    );
    const visibleColumnCount = table.getVisibleLeafColumns().length;
    const ariaRowCount = matchingRowCount + expandedRowIndexes.length + 1;

    /**
     * The columns whose cells can be part of a range, read off the table rather than re-listed.
     *
     * Checkbox and actions now participate as stable activation-cell identities; hidden or removed
     * columns remain absent because this derives from the table's visible leaves.
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
            controller.setFocusedCell(
                transactionId,
                marker != null && rangeableColumnIds.has(marker) ? marker : null
            );
        },
        [controller, rangeableColumnIds]
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
            if (applyTransactionCellKeyIntent(table, claimed, controller.clearCellSelection)) {
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
        [controller.clearCellSelection, handleGridKeyDown, table]
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
            const grid = event.currentTarget;
            const next = event.relatedTarget;
            if (next instanceof Node && grid.contains(next)) return;
            if (next instanceof Element && next.closest("[data-owned-by-row]") != null) return;
            // A blur with a null relatedTarget can be an intermediate browser state. Verify the final
            // active element after the focus transaction before surrendering grid ownership, so a
            // structural reconciliation cannot later steal focus back from an external filter.
            queueMicrotask(() => {
                const active = grid.ownerDocument.activeElement;
                if (active instanceof Node && grid.contains(active)) return;
                if (active instanceof Element && active.closest("[data-owned-by-row]") != null)
                    return;
                controller.parkExternalFocus();
                onTransactionBlur?.();
            });
        },
        [controller, onTransactionBlur]
    );

    const controllerPinnedIndexes = useMemo(
        () =>
            controllerSnapshot.pins.flatMap((pin) => {
                const index = rowIndexById.get(pin.transactionId);
                return index == null ? [] : [index];
            }),
        [controllerSnapshot.pins, rowIndexById]
    );
    // Active-origin and pending-target rows stay mounted regardless of scroll position: unmounting
    // the former loses the caret, while unmounting the latter prevents registration and fulfillment.
    const extractVirtualRange = useCallback(
        (range: Range) => {
            const visibleIndexes = defaultRangeExtractor(range);
            const pinnedIndexes = controllerPinnedIndexes.filter(
                (index) => !visibleIndexes.includes(index)
            );
            if (pinnedIndexes.length === 0) return visibleIndexes;
            return [...new Set([...visibleIndexes, ...pinnedIndexes])].sort(
                (left, right) => left - right
            );
        },
        [controllerPinnedIndexes]
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
            if (target instanceof Element && target.matches('[role="gridcell"]')) return;

            // Don't handle if user is typing in an input
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)
            ) {
                return;
            }

            // Actual DOM focus on legacy row chrome wins, without making that row canonical cell
            // authority. Otherwise use the canonical active cell, then exactly one selected row
            // resolved from the matching order rather than only the rows the grid currently holds.
            const targetId =
                controllerSnapshot.focusRetentionTransactionId ??
                controllerSnapshot.activeTransactionId ??
                resolveSingleSelectedRowId();
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
        controllerSnapshot.activeTransactionId,
        controllerSnapshot.focusRetentionTransactionId,
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

    const handleDescriptionInputElementChange = useCallback(
        (transactionId: string, element: HTMLInputElement | null) =>
            controller.registerEditor(
                { columnId: "description", transactionId: asTransactionId(transactionId) },
                element
            ),
        [controller]
    );
    const handleRowElementChange = useCallback(
        (transactionId: string, element: HTMLElement | null) =>
            controller.registerRow(asTransactionId(transactionId), element),
        [controller]
    );

    /**
     * Renders one transaction row for the virtualizer, addressed by absolute matching-order index.
     *
     * A callback rather than inline JSX because the virtualizer now lives in its own component:
     * `TransactionVirtualRows` is skipped by the React Compiler, so anything computed in there
     * would lose its memoization. Building the row up here keeps it in the compiled tree.
     */
    const renderRow = useCallback(
        (index: number, isIdleEntryRow: boolean, viewportRowDistance: number) => {
            const displayIndex = displayIndexByRowIndex.get(index);
            const row = displayIndex == null ? undefined : rows[displayIndex];
            if (row == null || displayIndex == null) return null;
            const transaction = row.original;
            const ariaRowIndex =
                index +
                2 +
                expandedRowIndexes.filter((expandedIndex) => expandedIndex < index).length;
            const parkedActiveAddress = controllerSnapshot.parkedActiveAddress;
            const gridCellSurface = {
                cells: row.getAllCells(),
                controller,
                initialTabStopColumnId: isIdleEntryRow ? "checkbox" : null,
                interactionKind: controllerSnapshot.interactionKind,
                parkedTabStopColumnId:
                    parkedActiveAddress?.transactionId === transaction.id
                        ? parkedActiveAddress.columnId
                        : null,
                viewportRowDistance
            } satisfies TransactionGridRowSurface;
            const rowElement = (selectedCellMarkers: ReadonlySet<string>) => (
                <TransactionRow
                    selectedCellMarkers={selectedCellMarkers}
                    gridCellSurface={gridCellSurface}
                    transaction={transaction}
                    ariaRowIndex={ariaRowIndex}
                    ariaColumnCount={visibleColumnCount}
                    presence={presenceByTransactionId[transaction.id]}
                    resolveMemberName={resolveMemberName}
                    isSelected={row.getIsSelected()}
                    isExpanded={expandedIds.has(transaction.id)}
                    suppressDescriptionFocusPresence={
                        controllerSnapshot.pending?.kind === "edit" &&
                        controllerSnapshot.pending.state.target.transactionId === transaction.id &&
                        controllerSnapshot.pending.state.target.columnId === "description"
                    }
                    onDescriptionInputElementChange={handleDescriptionInputElementChange}
                    onRowElementChange={handleRowElementChange}
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
                    onFocus={() => onTransactionFocus?.(transaction.id)}
                    onFieldFocus={(field) => onTransactionFieldFocus?.(transaction.id, field)}
                    onCellFocus={(marker) => applyFocusedCell(transaction.id, marker)}
                    onActivationDescendantFocus={() =>
                        controller.setFocusedActivation(transaction.id)
                    }
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
                    {(selectionRowKey) =>
                        rowElement(
                            transactionSelectedCellMarkersFromRowKey(
                                selectionRowKey,
                                gridCellSurface.cells.map((cell) => cell.column.id)
                            )
                        )
                    }
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
            controller,
            controllerSnapshot.interactionKind,
            controllerSnapshot.parkedActiveAddress,
            controllerSnapshot.pending,
            displayIndexByRowIndex,
            expandedIds,
            expandedRowIndexes,
            gridTemplateColumns,
            handleCheckboxChange,
            handleCheckboxShiftClick,
            handleDescriptionInputElementChange,
            handleRowElementChange,
            handleRowClick,
            handleToggleExpand,
            onCreateTag,
            onDescriptionCommitText,
            onDescriptionSelectAlias,
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
            table,
            visibleColumnCount
        ]
    );

    // After every hook, so a filter that matches nothing still reconciles the selections above.
    // Keyed on the matching count rather than on the rows the grid holds: those are a window, and an
    // empty window over a non-empty result set is a scroll position, not an empty grid. The explicit
    // after-grid fallback remains mounted in both branches so empty reconciliation can move focus
    // somewhere deterministic rather than leaving it on a removed row or document.body.
    return (
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>
            {matchingRowCount === 0 ? (
                <EmptyState />
            ) : (
                <div
                    ref={handleScrollElementChange}
                    className="flex min-h-0 flex-1 flex-col overflow-auto"
                >
                    <div
                        className="relative min-w-fit flex-1"
                        role="grid"
                        aria-label="Transactions"
                        aria-rowcount={ariaRowCount}
                        aria-colcount={visibleColumnCount}
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
            )}
            <button
                ref={handleAfterGridElementChange}
                type="button"
                tabIndex={-1}
                className="sr-only"
            >
                After transactions
            </button>
        </div>
    );
}
