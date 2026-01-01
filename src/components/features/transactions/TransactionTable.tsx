"use client";

/**
 * Transaction Table
 *
 * Container component for the transaction list with infinite scroll.
 * Uses TanStack Virtual for performance with 10k+ rows.
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { StatusOption, TagOption } from "./cells";
import {
	TransactionRow,
	type TransactionRowData,
	type TransactionRowPresence,
} from "./TransactionRow";

export interface TransactionTableProps {
	/** Array of transactions to display */
	transactions: TransactionRowData[];
	/** Presence data keyed by transaction ID */
	presenceByTransactionId?: Record<string, TransactionRowPresence>;
	/** Current user's pubkey hash */
	currentUserId?: string;
	/** Currently selected transaction IDs */
	selectedIds?: Set<string>;
	/** Available statuses for inline editing */
	availableStatuses?: StatusOption[];
	/** Available tags for inline editing */
	availableTags?: TagOption[];
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
	/** Additional CSS classes */
	className?: string;
}

/**
 * Table header with column labels.
 */
function TransactionTableHeader() {
	return (
		<div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-muted/50 px-4 py-2 font-medium text-sm">
			<div className="w-8 shrink-0" /> {/* Checkbox column */}
			<div className="w-24 shrink-0">Date</div>
			<div className="min-w-0 flex-1">Description</div>
			<div className="w-32 shrink-0">Tags</div>
			<div className="w-24 shrink-0">Status</div>
			<div className="w-28 shrink-0 text-right">Amount</div>
			<div className="w-28 shrink-0 text-right">Balance</div>
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
	availableStatuses = [],
	availableTags = [],
	onSelectionChange,
	onTransactionClick,
	onTransactionFocus,
	onTransactionUpdate,
	onLoadMore,
	hasMore = false,
	isLoading = false,
	onTransactionDelete,
	onResolveDuplicate,
	className,
}: TransactionTableProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
	const [focusedId, setFocusedId] = useState<string | null>(null);

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
				case "arrowdown": {
					// Navigate to next transaction
					event.preventDefault();
					const currentIdx = transactions.findIndex((t) => t.id === targetId);
					if (currentIdx < transactions.length - 1) {
						const nextId = transactions[currentIdx + 1].id;
						setFocusedId(nextId);
						if (!event.shiftKey) {
							onSelectionChange?.(new Set([nextId]));
						}
					}
					break;
				}
				case "arrowup": {
					// Navigate to previous transaction
					event.preventDefault();
					const currIdx = transactions.findIndex((t) => t.id === targetId);
					if (currIdx > 0) {
						const prevId = transactions[currIdx - 1].id;
						setFocusedId(prevId);
						if (!event.shiftKey) {
							onSelectionChange?.(new Set([prevId]));
						}
					}
					break;
				}
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

	// Handle single row click
	const handleRowClick = useCallback(
		(id: string, event: React.MouseEvent) => {
			if (onTransactionClick) {
				onTransactionClick(id);
			}

			if (!onSelectionChange) return;

			if (event.shiftKey && lastSelectedId) {
				// Shift-click: select range
				const startIdx = transactions.findIndex((t) => t.id === lastSelectedId);
				const endIdx = transactions.findIndex((t) => t.id === id);
				if (startIdx !== -1 && endIdx !== -1) {
					const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
					const rangeIds = transactions.slice(from, to + 1).map((t) => t.id);
					const newSelected = new Set(selectedIds);
					rangeIds.forEach((rangeId) => newSelected.add(rangeId));
					onSelectionChange(newSelected);
				}
			} else if (event.metaKey || event.ctrlKey) {
				// Cmd/Ctrl-click: toggle selection
				const newSelected = new Set(selectedIds);
				if (newSelected.has(id)) {
					newSelected.delete(id);
				} else {
					newSelected.add(id);
				}
				onSelectionChange(newSelected);
				setLastSelectedId(id);
			} else {
				// Regular click: select only this one
				onSelectionChange(new Set([id]));
				setLastSelectedId(id);
			}
		},
		[transactions, selectedIds, lastSelectedId, onSelectionChange, onTransactionClick]
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

	if (transactions.length === 0 && !isLoading) {
		return <EmptyState />;
	}

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			<TransactionTableHeader />
			<div
				ref={containerRef}
				className="min-h-0 flex-1 overflow-auto"
				role="grid"
				aria-label="Transactions"
				data-testid="transaction-table"
			>
				<div
					className="relative"
					role="rowgroup"
					style={{ height: `${virtualizer.getTotalSize()}px` }}
				>
					{virtualItems.map((virtualRow) => {
						const transaction = transactions[virtualRow.index];
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
									isSelected={selectedIds.has(transaction.id)}
									availableStatuses={availableStatuses}
									availableTags={availableTags}
									onClick={(e?: React.MouseEvent) =>
										handleRowClick(transaction.id, e as React.MouseEvent)
									}
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
								/>
							</div>
						);
					})}
				</div>
			</div>
			{isLoading && <LoadingIndicator />}
			{!isLoading && hasMore && transactions.length > 0 && (
				<div className="py-4 text-center text-muted-foreground text-sm">Scroll to load more</div>
			)}
		</div>
	);
}
