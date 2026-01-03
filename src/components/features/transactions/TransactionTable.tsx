"use client";

/**
 * Transaction Table
 *
 * Container component for the transaction list with infinite scroll.
 * Uses TanStack Virtual for performance with 10k+ rows.
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AccountOption } from "../accounts";
import type { StatusOption, TagOption } from "./cells";
import { CheckboxCell } from "./cells/CheckboxCell";
import { useGridCellNavigation } from "./hooks/useGridCellNavigation";
import { useTableSelection } from "./hooks/useTableSelection";
import {
	type NewTransactionData,
	TransactionRow,
	type TransactionRowData,
	type TransactionRowPresence,
} from "./TransactionRow";

/**
 * Shared grid template for transaction table columns.
 * This ensures header and rows have identical column widths.
 * Format: checkbox | date | description | account | tags | status | amount | actions
 */
export const TRANSACTION_GRID_TEMPLATE =
	"32px 120px minmax(150px, 2fr) 160px 140px 110px 112px 88px";

export interface TransactionTableProps {
	/** Array of transactions to display */
	transactions: TransactionRowData[];
	/** Presence data keyed by transaction ID */
	presenceByTransactionId?: Record<string, TransactionRowPresence>;
	/** Current user's pubkey hash */
	currentUserId?: string;
	/** Currently selected transaction IDs */
	selectedIds?: Set<string>;
	/** Available accounts for inline editing */
	availableAccounts?: AccountOption[];
	/** Available statuses for inline editing */
	availableStatuses?: StatusOption[];
	/** Available tags for inline editing */
	availableTags?: TagOption[];
	/** Callback when a new tag should be created */
	onCreateTag?: (name: string) => Promise<TagOption>;
	/** Callback when selection changes */
	onSelectionChange?: (ids: Set<string>) => void;
	/** Callback when a transaction is clicked */
	onTransactionClick?: (id: string) => void;
	/** Callback when a transaction field is focused for editing */
	onTransactionFocus?: (id: string) => void;
	/** Callback when transaction is updated */
	onTransactionUpdate?: (id: string, updates: Partial<TransactionRowData>) => void;
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
	/** Whether to show the add transaction row at the top */
	isAddingTransaction?: boolean;
	/** Callback when a new transaction is added */
	onAddTransaction?: (data: NewTransactionData) => void;
	/** Callback when add transaction is cancelled */
	onCancelAddTransaction?: () => void;
	/** Default account ID for add row */
	defaultAccountId?: string;
	/** Default status ID for add row */
	defaultStatusId?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Table header with column labels and select-all checkbox.
 */
interface TransactionTableHeaderProps {
	/** Whether all filtered transactions are selected */
	isAllSelected: boolean;
	/** Whether some (but not all) filtered transactions are selected */
	isSomeSelected: boolean;
	/** Callback to toggle select-all */
	onSelectAll: () => void;
}

function TransactionTableHeader({
	isAllSelected,
	isSomeSelected,
	onSelectAll,
}: TransactionTableHeaderProps) {
	return (
		<div
			className="sticky top-0 z-10 grid min-w-fit items-center gap-4 border-b bg-slate-50 px-4 py-2 font-medium text-sm"
			style={{ gridTemplateColumns: TRANSACTION_GRID_TEMPLATE }}
		>
			{/* Checkbox column */}
			<div data-testid="header-checkbox">
				<CheckboxCell
					checked={isAllSelected}
					indeterminate={isSomeSelected}
					onChange={onSelectAll}
					ariaLabel={isAllSelected ? "Deselect all transactions" : "Select all transactions"}
				/>
			</div>
			<div>Date</div>
			<div className="truncate">Description</div>
			<div className="truncate">Account</div>
			<div>Tags</div>
			<div>Status</div>
			<div className="text-right">Amount</div>
			<div>{/* Actions */}</div>
		</div>
	);
}

/**
 * Loading indicator for infinite scroll.
 */
function LoadingIndicator() {
	return (
		<div className="flex items-center justify-center py-4">
			<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			<span className="ml-2 text-muted-foreground text-sm">Loading more transactions...</span>
		</div>
	);
}

/**
 * Empty state when no transactions exist.
 */
function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="text-4xl text-muted-foreground">📊</div>
			<h3 className="mt-4 font-semibold text-lg">No transactions yet</h3>
			<p className="mt-1 text-muted-foreground text-sm">
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
	currentUserId,
	selectedIds = new Set(),
	availableAccounts = [],
	availableStatuses = [],
	availableTags = [],
	onCreateTag,
	onSelectionChange,
	onTransactionClick,
	onTransactionFocus,
	onTransactionUpdate,
	onLoadMore,
	hasMore = false,
	isLoading = false,
	onTransactionDelete,
	onResolveDuplicate,
	isAddingTransaction = false,
	onAddTransaction,
	onCancelAddTransaction,
	defaultAccountId,
	defaultStatusId,
	className,
}: TransactionTableProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [focusedId, setFocusedId] = useState<string | null>(null);
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	// Grid cell navigation for arrow up/down between cells
	const { handleGridKeyDown } = useGridCellNavigation();

	// Extract transaction IDs for selection hook
	const filteredIds = useMemo(() => transactions.map((t) => t.id), [transactions]);

	// Use table selection hook for managing selection actions
	// The hook is controlled - it receives selectedIds from parent and calls onSelectionChange
	const { isAllSelected, isSomeSelected, selectAll, toggleRow } = useTableSelection({
		filteredIds,
		selectedIds,
		onSelectionChange,
	});

	// Keyboard shortcuts for duplicate resolution and deletion
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Only handle if we have a focused/selected transaction
			const targetId = focusedId || (selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);
			if (!targetId) return;

			// Don't handle if user is typing in an input
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				(event.target as HTMLElement)?.isContentEditable
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
					if (!event.shiftKey && !event.ctrlKey && !event.metaKey && onTransactionDelete) {
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
		onSelectionChange,
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

	if (transactions.length === 0 && !isLoading && !isAddingTransaction) {
		return <EmptyState />;
	}

	return (
		<div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>
			<div ref={containerRef} className="flex min-h-0 flex-1 flex-col overflow-auto">
				<TransactionTableHeader
					isAllSelected={isAllSelected}
					isSomeSelected={isSomeSelected}
					onSelectAll={selectAll}
				/>

				{/* Add Transaction Row - appears at top of table when active */}
				{isAddingTransaction && onAddTransaction && (
					<TransactionRow
						mode="add"
						availableAccounts={availableAccounts}
						availableStatuses={availableStatuses}
						availableTags={availableTags}
						onCreateTag={onCreateTag}
						onAdd={onAddTransaction}
						onCancel={onCancelAddTransaction}
						defaultAccountId={defaultAccountId}
						defaultStatusId={defaultStatusId}
					/>
				)}

				<div
					className="relative min-w-fit flex-1"
					role="grid"
					aria-label="Transactions"
					data-testid="transaction-table"
					onKeyDown={handleGridKeyDown}
				>
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
										transform: `translateY(${virtualRow.start}px)`,
									}}
								>
									<TransactionRow
										transaction={transaction}
										presence={presenceByTransactionId[transaction.id]}
										currentUserId={currentUserId}
										isSelected={isSelected}
										isExpanded={expandedIds.has(transaction.id)}
										availableAccounts={availableAccounts}
										availableStatuses={availableStatuses}
										availableTags={availableTags}
										onCreateTag={onCreateTag}
										onClick={() => handleRowClick(transaction.id)}
										onFocus={() => {
											setFocusedId(transaction.id);
											onTransactionFocus?.(transaction.id);
										}}
										onFieldUpdate={
											onTransactionUpdate
												? (field, value) => onTransactionUpdate(transaction.id, { [field]: value })
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
