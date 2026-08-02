"use client";

/**
 * Transaction Table
 *
 * Container component for the transaction list with infinite scroll.
 * Uses TanStack Virtual for performance with 10k+ rows.
 */

import { defaultRangeExtractor, type Range, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MemberDisplayName } from "@/lib/crdt/person";
import { cn } from "@/lib/utils";

import { AccountOption } from "../accounts";
import { type AllocationColumn, buildTransactionGridTemplate } from "./allocation-columns";
import type { StatusOption, TagOption } from "./cells";
import { CheckboxCell } from "./cells/CheckboxCell";
import type { DescriptionAliasEditOrigin } from "./cells/InlineEditableDescriptionAlias";
import { useGridCellNavigation } from "./hooks/useGridCellNavigation";
import { useTableSelection } from "./hooks/useTableSelection";
import {
    TransactionRow,
    type TransactionRowData,
    type TransactionRowPresence
} from "./TransactionRow";

/**
 * Shared grid template for transaction table columns.
 * This ensures header and rows have identical column widths.
 * Format: checkbox | date | description | account | tags | status | amount | actions
 */
export const TRANSACTION_GRID_TEMPLATE = buildTransactionGridTemplate(0);

/**
 * Stable empty selection.
 *
 * A `new Set()` default parameter allocates on every render, and the selection feeds the document
 * keydown effect's dependency list — a fresh identity tore the listener down and re-added it on
 * every render of the virtualized table.
 */
const EMPTY_SELECTION: ReadonlySet<string> = new Set();

export interface TransactionTableProps {
    /** Array of transactions to display */
    transactions: TransactionRowData[];
    /** Presence data keyed by transaction ID */
    presenceByTransactionId?: Record<string, TransactionRowPresence>;
    /** Resolves a member's pubkeyHash to their display name for row presence UI (UR-003) */
    resolveMemberName?: (pubkeyHash: string) => MemberDisplayName;
    /** Currently selected transaction IDs */
    selectedIds?: ReadonlySet<string>;
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
    /** Callback when selection changes */
    onSelectionChange?: (ids: Set<string>) => void;
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
     * Render the inline description-rule robot for a given transaction. The table forwards each
     * row's live editing state so the affordance can hide while the description is being edited.
     */
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
    renderDescriptionRobot?: (
        transactionId: string,
        context: { readonly isEditing: boolean }
    ) => React.ReactNode;
    /** Person-specific allocation columns shared by the header and every row */
    allocationColumns?: readonly AllocationColumn[];
    /** Memoized grid template matching allocationColumns */
    gridTemplateColumns?: string;
    /** Callback for one validated person allocation edit */
    onTransactionAllocationUpdate?: (id: string, personId: string, value: number) => void;
    /** Callback when more transactions should be loaded */
    onLoadMore?: () => void;
    /** Whether more transactions are available */
    hasMore?: boolean;
    /** Whether currently loading more */
    isLoading?: boolean;
    /** Callback when a transaction should be deleted */
    onTransactionDelete?: (id: string) => void;
    /** Callback when a duplicate is resolved (kept) */
    onResolveDuplicate?: (id: string) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Table header with column labels and select-all checkbox.
 */
interface TransactionTableHeaderProps {
    allocationColumns: readonly AllocationColumn[];
    gridTemplateColumns: string;
    /** Whether all filtered transactions are selected */
    isAllSelected: boolean;
    /** Whether some (but not all) filtered transactions are selected */
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
 * Loading indicator for infinite scroll.
 */
function LoadingIndicator() {
    return (
        <div className="flex items-center justify-center py-4">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-muted-foreground ml-2 text-sm">Loading more transactions...</span>
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
 * Transaction Table component with virtualization and infinite scroll.
 */
export function TransactionTable({
    transactions,
    presenceByTransactionId = {},
    resolveMemberName,
    selectedIds = EMPTY_SELECTION,
    availableAccounts = [],
    availableStatuses = [],
    availableTags = [],
    onCreateTag,
    availableAliases = [],
    onDescriptionCommitText,
    onDescriptionSelectAlias,
    onSelectionChange,
    focusDescriptionTransactionId = null,
    onFocusDescriptionApplied,
    onTransactionClick,
    onTransactionFocus,
    onTransactionFieldFocus,
    onTransactionBlur,
    onTransactionUpdate,
    allocationColumns = [],
    gridTemplateColumns = TRANSACTION_GRID_TEMPLATE,
    onTransactionAllocationUpdate,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    onTransactionDelete,
    onResolveDuplicate,
    renderDescriptionRobot,
    renderRuleProposal,
    className
}: TransactionTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Grid cell navigation for arrow up/down between cells
    const { handleGridKeyDown } = useGridCellNavigation();

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

    // Extract transaction IDs for selection hook
    const filteredIds = useMemo(() => transactions.map((t) => t.id), [transactions]);
    const transactionIndexById = useMemo(
        () => new Map(transactions.map((transaction, index) => [transaction.id, index])),
        [transactions]
    );
    const focusedIndex = focusedId == null ? undefined : transactionIndexById.get(focusedId);
    const focusDescriptionIndex =
        focusDescriptionTransactionId == null
            ? undefined
            : transactionIndexById.get(focusDescriptionTransactionId);
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

    // Use table selection hook for managing selection actions
    // The hook is controlled - it receives selectedIds from parent and calls onSelectionChange
    const { isAllSelected, isSomeSelected, selectAll, toggleRow } = useTableSelection({
        filteredIds,
        selectedIds,
        onSelectionChange
    });

    // Keyboard shortcuts for duplicate resolution and deletion
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle if we have a focused/selected transaction
            const targetId =
                focusedId || (selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);
            if (!targetId) return;

            // Only handle keys pressed while focus is inside the grid — a bare "d" or Backspace
            // aimed at a button or select elsewhere on the page must never delete a transaction.
            const target = event.target;
            if (!(target instanceof Node) || !containerRef.current?.contains(target)) return;

            // Don't handle if user is typing in an input
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)
            ) {
                return;
            }

            const transaction = transactions.find((t) => t.id === targetId);
            if (!transaction) return;

            switch (event.key.toLowerCase()) {
                case "k":
                    // K = Keep (resolve duplicate)
                    if (transaction.possibleDuplicateOf && onResolveDuplicate) {
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
                case "escape":
                    // Clear selection
                    event.preventDefault();
                    setFocusedId(null);
                    onSelectionChange?.(new Set());
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
        focusedId,
        selectedIds,
        transactions,
        onResolveDuplicate,
        onTransactionDelete,
        onSelectionChange
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

    // Handle checkbox click (toggles selection)
    const handleCheckboxChange = useCallback(
        (id: string) => {
            toggleRow(id, false);
        },
        [toggleRow]
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

    // Handle shift-click on checkbox for range selection
    const handleCheckboxShiftClick = useCallback(
        (id: string) => {
            toggleRow(id, true);
        },
        [toggleRow]
    );

    // Row height for virtualization (approximately 44px per row)
    const ROW_HEIGHT = 44;
    const OVERSCAN = 5;

    // Setup virtualizer for efficient rendering of large lists
    const virtualizer = useVirtualizer({
        count: transactions.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: OVERSCAN,
        rangeExtractor: extractVirtualRange,
        useFlushSync: true
    });

    // Get virtual items for rendering
    const virtualItems = virtualizer.getVirtualItems();

    // Load more when approaching the end of the list
    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoading) return;

        const lastItem = virtualItems.at(-1);
        if (!lastItem) return;

        // Trigger load when within last 10 items
        if (lastItem.index >= transactions.length - 10) {
            onLoadMore();
        }
    }, [virtualItems, onLoadMore, hasMore, isLoading, transactions.length]);

    if (transactions.length === 0 && !isLoading) {
        return <EmptyState />;
    }

    return (
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>
            <div ref={containerRef} className="flex min-h-0 flex-1 flex-col overflow-auto">
                <div
                    className="relative min-w-fit flex-1"
                    role="grid"
                    aria-label="Transactions"
                    data-testid="transaction-table"
                    onKeyDown={handleGridKeyDown}
                    onBlur={handleGridBlur}
                >
                    <TransactionTableHeader
                        allocationColumns={allocationColumns}
                        gridTemplateColumns={gridTemplateColumns}
                        isAllSelected={isAllSelected}
                        isSomeSelected={isSomeSelected}
                        onSelectAll={selectAll}
                    />

                    <div
                        className="relative min-w-fit"
                        role="rowgroup"
                        style={{ height: `${virtualizer.getTotalSize()}px` }}
                    >
                        {virtualItems.map((virtualRow) => {
                            const transaction = transactions[virtualRow.index];
                            const isSelected = selectedIds.has(transaction.id);
                            return (
                                <div
                                    key={transaction.id}
                                    data-index={virtualRow.index}
                                    ref={virtualizer.measureElement}
                                    className="absolute top-0 left-0 w-full"
                                    style={{
                                        transform: `translateY(${virtualRow.start}px)`
                                    }}
                                    role="presentation"
                                >
                                    <TransactionRow
                                        transaction={transaction}
                                        presence={presenceByTransactionId[transaction.id]}
                                        resolveMemberName={resolveMemberName}
                                        isSelected={isSelected}
                                        isExpanded={expandedIds.has(transaction.id)}
                                        focusDescriptionRequested={
                                            focusDescriptionTransactionId === transaction.id
                                        }
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
                                                      onDescriptionCommitText(
                                                          transaction.id,
                                                          text,
                                                          origin
                                                      )
                                                : undefined
                                        }
                                        onDescriptionSelectAlias={
                                            onDescriptionSelectAlias
                                                ? (aliasId, origin) =>
                                                      onDescriptionSelectAlias(
                                                          transaction.id,
                                                          aliasId,
                                                          origin
                                                      )
                                                : undefined
                                        }
                                        renderDescriptionRobot={
                                            renderDescriptionRobot
                                                ? (ctx) =>
                                                      renderDescriptionRobot(transaction.id, ctx)
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
                                        onFieldFocus={(field) =>
                                            onTransactionFieldFocus?.(transaction.id, field)
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
                                                      onTransactionAllocationUpdate(
                                                          transaction.id,
                                                          personId,
                                                          value
                                                      )
                                                : undefined
                                        }
                                        onDelete={
                                            onTransactionDelete
                                                ? () => onTransactionDelete(transaction.id)
                                                : undefined
                                        }
                                        onResolveDuplicate={
                                            onResolveDuplicate
                                                ? () => onResolveDuplicate(transaction.id)
                                                : undefined
                                        }
                                        onCheckboxChange={() =>
                                            handleCheckboxChange(transaction.id)
                                        }
                                        onCheckboxShiftClick={() =>
                                            handleCheckboxShiftClick(transaction.id)
                                        }
                                        onToggleExpand={() => handleToggleExpand(transaction.id)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {isLoading && <LoadingIndicator />}
        </div>
    );
}
