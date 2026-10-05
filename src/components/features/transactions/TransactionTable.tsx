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
import { TRANSACTION_GRID_HEADER_CELL_CHROME } from "./cells/cell-chrome";
import { CheckboxCell } from "./cells/CheckboxCell";
import type { TransactionGridEditorCommitResult } from "./cells/editor-lifecycle";
import type { DescriptionAliasEditOrigin } from "./cells/InlineEditableDescriptionAlias";
import {
    useTransactionGridControllerSnapshot,
    type TransactionGridEditorProjection,
    type TransactionGridWorkspaceController
} from "./hooks/useTransactionGridController";
import type { TransactionRowWindow, TransactionVisibleRange } from "./row-window";
import {
    applyTransactionMatchingSetChange,
    asTransactionId,
    buildTransactionTableColumns,
    type MatchingTransactionRows,
    NONEDITABLE_TRANSACTION_GRID_KEY_CELL,
    TRANSACTION_CELL_SELECTION_OPTIONS,
    transactionGridKeyIntent,
    transactionCellSelectionRowKey,
    transactionCopyOnKeyDown,
    transactionSelectedCellMarkersFromRowKey,
    type TransactionRowOrder,
    type TransactionRowSelection,
    transactionGridTemplateColumns,
    transactionTableFeatures,
    transactionTableRowId,
    type TransactionId
} from "./table-model";
import { TRANSACTION_MAIN_ROW_HEIGHT_PX } from "./transaction-row-geometry";
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
    /** Materialize a new tag in the editor draft without mutating the vault. */
    onCreateTag?: (name: string) => Promise<TagOption>;
    /** Commit selected tag IDs and locally-created tags in one vault mutation. */
    onTransactionTagsCommit?: (
        transactionId: TransactionId,
        tagIds: string[],
        createdTags: readonly TagOption[]
    ) => TransactionGridEditorCommitResult;
    /** Available description aliases for autocomplete */
    availableAliases?: import("./cells/InlineEditableDescriptionAlias").DescriptionAliasOption[];
    /** Callback when user commits description text */
    onDescriptionCommitText?: (
        transactionId: TransactionId,
        text: string,
        origin: DescriptionAliasEditOrigin
    ) => TransactionGridEditorCommitResult;
    /** Callback when user selects an existing alias from dropdown */
    onDescriptionSelectAlias?: (
        transactionId: TransactionId,
        aliasId: string,
        origin: DescriptionAliasEditOrigin
    ) => TransactionGridEditorCommitResult;
    /** Callback when a transaction is clicked */
    onTransactionClick?: (id: string) => void;
    /** Callback when a transaction row receives focus */
    onTransactionFocus?: (id: string) => void;
    /** Makes the persistent inspector visible before actions-cell keyboard focus enters it. */
    onInspectorOpenRequest?: () => void;
    /** Callback when focus leaves the table entirely */
    onTransactionBlur?: () => void;
    /** Callback when transaction is updated */
    onTransactionUpdate?: (id: string, updates: Partial<TransactionRowData>) => void;
    /** Person-specific allocation columns shared by the header and every row */
    allocationColumns?: readonly AllocationColumn[];
    /** Callback for one validated person allocation edit */
    onTransactionAllocationUpdate?: (
        id: string,
        personId: string,
        value: number
    ) => TransactionGridEditorCommitResult;
    /** Callback when a transaction should be deleted */
    onTransactionDelete?: (id: string) => void;
    /** Callback when a duplicate is resolved (kept) */
    onResolveDuplicate?: (id: string) => void;
    /** Additional CSS classes */
    className?: string;
}

/** No allocation columns, as one module-level constant so the columns memo has a stable default. */
const NO_ALLOCATION_COLUMNS: readonly AllocationColumn[] = [];

export function isExactTransactionGridEditorPortal(
    controller: TransactionGridWorkspaceController,
    element: Element,
    editor: TransactionGridEditorProjection | null
): boolean {
    return editor != null && controller.isRegisteredEditorPortalTarget(editor.address, element);
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
            className="bg-muted border-border/60 sticky top-0 z-10 grid min-w-fit items-stretch gap-0 border-t border-l p-0 text-sm font-medium"
            style={{ gridTemplateColumns }}
            role="row"
            aria-rowindex={1}
        >
            {/* Checkbox column */}
            <div
                data-testid="header-checkbox"
                className={cn(TRANSACTION_GRID_HEADER_CELL_CHROME, "justify-center p-0")}
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
                    // The checkbox target is sized to this 37px header cell and cannot reach the
                    // first transaction row beneath the contiguous rule.
                    rowGeometry="header"
                />
            </div>
            <div
                className={TRANSACTION_GRID_HEADER_CELL_CHROME}
                role="columnheader"
                aria-colindex={2}
            >
                Date
            </div>
            <div
                className={cn(TRANSACTION_GRID_HEADER_CELL_CHROME, "truncate")}
                role="columnheader"
                aria-colindex={3}
            >
                Description
            </div>
            <div
                className={cn(TRANSACTION_GRID_HEADER_CELL_CHROME, "truncate")}
                role="columnheader"
                aria-colindex={4}
            >
                Account
            </div>
            <div
                className={TRANSACTION_GRID_HEADER_CELL_CHROME}
                role="columnheader"
                aria-colindex={5}
            >
                Tags
            </div>
            <div
                className={TRANSACTION_GRID_HEADER_CELL_CHROME}
                role="columnheader"
                aria-colindex={6}
            >
                Status
            </div>
            {allocationColumns.map((column, index) => (
                <div
                    key={column.personId}
                    className={cn(
                        TRANSACTION_GRID_HEADER_CELL_CHROME,
                        "justify-end truncate text-right"
                    )}
                    title={`${column.label} allocation percentage`}
                    role="columnheader"
                    aria-colindex={index + 7}
                >
                    {column.label} %
                </div>
            ))}
            <div
                className={cn(TRANSACTION_GRID_HEADER_CELL_CHROME, "justify-end text-right")}
                role="columnheader"
                aria-colindex={allocationColumns.length + 7}
            >
                Amount
            </div>
            <div
                className={TRANSACTION_GRID_HEADER_CELL_CHROME}
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
    onTransactionTagsCommit,
    availableAliases = [],
    onDescriptionCommitText,
    onDescriptionSelectAlias,
    onTransactionClick,
    onTransactionFocus,
    onInspectorOpenRequest,
    onTransactionBlur,
    onTransactionUpdate,
    allocationColumns = NO_ALLOCATION_COLUMNS,
    onTransactionAllocationUpdate,
    onTransactionDelete,
    onResolveDuplicate,
    className
}: TransactionTableProps) {
    // The scroll container, held as state rather than only as a ref. `TransactionVirtualRows` needs
    // the element itself on its first layout effect, and a ref is still `null` then — see the note on
    // its `scrollElement` prop. A `useState`-backed callback ref costs one extra render on mount and
    // gets the virtualizer a real viewport to measure.
    const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
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
    const handleAfterGridKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLButtonElement>) => {
            if (
                event.key !== "ArrowDown" &&
                event.key !== "ArrowLeft" &&
                event.key !== "ArrowRight" &&
                event.key !== "ArrowUp"
            ) {
                return;
            }
            const parkedActiveAddress = controller.getSnapshot().parkedActiveAddress;
            if (parkedActiveAddress == null) return;
            const intent = transactionGridKeyIntent(
                { cell: NONEDITABLE_TRANSACTION_GRID_KEY_CELL, mode: "parked" },
                {
                    altKey: event.altKey,
                    ctrlKey: event.ctrlKey,
                    isComposing: event.nativeEvent.isComposing,
                    key: event.key,
                    keyCode: event.keyCode,
                    metaKey: event.metaKey,
                    shiftKey: event.shiftKey
                }
            );
            if (intent.kind === "native") return;
            // Arrow movement does not consult the viewport-row count; that input is for page targets.
            const result = controller.dispatchCellIntent(parkedActiveAddress, intent, 0);
            if (!result.ok || result.value.kind !== "handled") return;
            event.preventDefault();
            event.stopPropagation();
        },
        [controller]
    );

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
    const visibleColumnCount = table.getVisibleLeafColumns().length;
    const ariaRowCount = matchingRowCount + 1;

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
     * Focus landing anywhere else in the row — a legacy activation descendant or the row's own
     * chrome — drops the selection rather than leaving a stale anchor behind. A stale anchor
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
     * The table owns only the browser clipboard effect. Cell navigation, extension, and Escape are
     * canonical controller commands at the gridcell boundary; handling them here would create a
     * second selection owner after editor and popup events bubble.
     */
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.defaultPrevented) return;
            const control = event.target instanceof Element ? event.target : null;
            const payload = transactionCopyOnKeyDown(table, event, {
                activeElement: control,
                selection: window.getSelection()
            });
            if (payload == null) return;
            event.preventDefault();
            void navigator.clipboard.writeText(payload.text);
        },
        [table]
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
            if (controller.isRegisteredInspectorOwnedTarget(next)) return;
            if (
                next instanceof Element &&
                isExactTransactionGridEditorPortal(
                    controller,
                    next,
                    controller.getSnapshot().editor
                )
            ) {
                return;
            }
            // An active editor's blur validation owns the first microtask even when relatedTarget
            // already names a real external control. Parking it synchronously would unmount an invalid
            // editor before its queued refocus can restore authority. Exact editor popups retain that
            // validation ownership while interacting. Other lifecycles still park now: pending focus
            // redirection relies on synchronous retirement to stay a stale request rather than publishing
            // a focus-failed result before this handler's reconciliation microtask.
            const state = controller.getInteractionState();
            const editorOwnsValidation =
                state.kind === "editing" ||
                (state.kind === "interacting" && state.owner === "grid-editor");
            if (next == null) controller.retireDelayedFocus();
            else if (!editorOwnsValidation) controller.parkExternalFocus();
            queueMicrotask(() => {
                queueMicrotask(() => {
                    const active = grid.ownerDocument.activeElement;
                    if (active instanceof Node && grid.contains(active)) return;
                    if (controller.isRegisteredInspectorOwnedTarget(active)) return;
                    if (
                        active instanceof Element &&
                        isExactTransactionGridEditorPortal(
                            controller,
                            active,
                            controller.getSnapshot().editor
                        )
                    ) {
                        return;
                    }
                    controller.parkExternalFocus();
                    onTransactionBlur?.();
                });
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

    // The DOM and virtualizer share one fixed 57px data-row contract.
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
        (transactionId: TransactionId, element: HTMLInputElement | null) => {
            const address = { columnId: "description", transactionId } as const;
            if (element == null) {
                controller.registerEditor(address, null);
                return;
            }
            return controller.registerEditor(address, element);
        },
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
            const transactionId = asTransactionId(transaction.id);
            const ariaRowIndex = index + 2;
            const parkedActiveAddress = controllerSnapshot.parkedActiveAddress;
            const gridCellSurface = {
                cells: row.getAllCells(),
                controller,
                editor: controllerSnapshot.editor,
                initialTabStopColumnId: isIdleEntryRow ? "checkbox" : null,
                interactionKind: controllerSnapshot.interactionKind,
                selectionVisibility: controllerSnapshot.selectionVisibility,
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
                    presence={presenceByTransactionId[transaction.id]}
                    resolveMemberName={resolveMemberName}
                    isSelected={row.getIsSelected()}
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
                    onTagsCommit={
                        onTransactionTagsCommit == null
                            ? undefined
                            : (tagIds, createdTags) =>
                                  onTransactionTagsCommit(transactionId, tagIds, createdTags)
                    }
                    availableAliases={availableAliases}
                    onDescriptionCommitText={
                        onDescriptionCommitText
                            ? (text, origin) => onDescriptionCommitText(transactionId, text, origin)
                            : undefined
                    }
                    onDescriptionSelectAlias={
                        onDescriptionSelectAlias
                            ? (aliasId, origin) =>
                                  onDescriptionSelectAlias(transactionId, aliasId, origin)
                            : undefined
                    }
                    onClick={() => handleRowClick(transaction.id)}
                    onFocus={() => onTransactionFocus?.(transaction.id)}
                    onCellFocus={(marker) => applyFocusedCell(transaction.id, marker)}
                    onInspectorOpenRequest={onInspectorOpenRequest}
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
            controllerSnapshot.editor,
            controllerSnapshot.interactionKind,
            controllerSnapshot.parkedActiveAddress,
            controllerSnapshot.pending,
            controllerSnapshot.selectionVisibility,
            displayIndexByRowIndex,
            gridTemplateColumns,
            handleCheckboxChange,
            handleCheckboxShiftClick,
            handleDescriptionInputElementChange,
            handleRowElementChange,
            handleRowClick,
            onCreateTag,
            onDescriptionCommitText,
            onDescriptionSelectAlias,
            onInspectorOpenRequest,
            onResolveDuplicate,
            onTransactionAllocationUpdate,
            onTransactionDelete,
            onTransactionFocus,
            onTransactionTagsCommit,
            onTransactionUpdate,
            presenceByTransactionId,
            resolveMemberName,
            rows,
            table
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
                    className="flex min-h-0 flex-1 scroll-pt-[37px] flex-col overflow-auto"
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
                            estimatedRowHeight={TRANSACTION_MAIN_ROW_HEIGHT_PX}
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
                onKeyDown={handleAfterGridKeyDown}
            >
                After transactions
            </button>
        </div>
    );
}
