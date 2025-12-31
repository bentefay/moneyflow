"use client";

/**
 * useTransactionSelection Hook
 *
 * Manages transaction selection state including:
 * - Individual selection via checkboxes
 * - Shift-click for range selection
 * - Select all visible transactions
 */

import { useCallback, useMemo, useState } from "react";

export interface UseTransactionSelectionOptions {
	/** All transaction IDs in the current view */
	transactionIds: string[];
	/** Optional initial selection */
	initialSelection?: Set<string>;
}

export interface UseTransactionSelectionReturn {
	/** Currently selected transaction IDs */
	selectedIds: Set<string>;
	/** Whether all visible transactions are selected */
	allSelected: boolean;
	/** Whether some but not all visible transactions are selected */
	someSelected: boolean;
	/** Count of selected transactions */
	selectedCount: number;
	/** Toggle selection of a single transaction */
	toggleSelection: (id: string) => void;
	/** Toggle selection with shift-click support */
	toggleSelectionWithShift: (id: string, shiftKey: boolean) => void;
	/** Select a range of transactions (for shift-click) */
	selectRange: (startId: string, endId: string) => void;
	/** Select all visible transactions */
	selectAll: () => void;
	/** Deselect all transactions */
	clearSelection: () => void;
	/** Toggle select all/none */
	toggleSelectAll: () => void;
	/** Check if a transaction is selected */
	isSelected: (id: string) => boolean;
	/** Set selection to specific IDs */
	setSelection: (ids: Set<string>) => void;
	/** ID of the last selected transaction (for shift-click ranges) */
	lastSelectedId: string | null;
}

/**
 * Hook for managing transaction selection.
 */
export function useTransactionSelection({
	transactionIds,
	initialSelection = new Set(),
}: UseTransactionSelectionOptions): UseTransactionSelectionReturn {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelection);
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

	// Memoized set for O(1) lookups
	const transactionIdSet = useMemo(() => new Set(transactionIds), [transactionIds]);

	// Filter selection to only include visible transactions
	const visibleSelectedIds = useMemo(() => {
		const visible = new Set<string>();
		selectedIds.forEach((id) => {
			if (transactionIdSet.has(id)) {
				visible.add(id);
			}
		});
		return visible;
	}, [selectedIds, transactionIdSet]);

	const allSelected =
		visibleSelectedIds.size === transactionIds.length && transactionIds.length > 0;
	const someSelected = visibleSelectedIds.size > 0 && !allSelected;
	const selectedCount = visibleSelectedIds.size;

	const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

	const toggleSelection = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
		setLastSelectedId(id);
	}, []);

	const selectRange = useCallback(
		(startId: string, endId: string) => {
			const startIndex = transactionIds.indexOf(startId);
			const endIndex = transactionIds.indexOf(endId);

			if (startIndex === -1 || endIndex === -1) return;

			const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
			const rangeIds = transactionIds.slice(from, to + 1);

			setSelectedIds((prev) => {
				const next = new Set(prev);
				rangeIds.forEach((id) => next.add(id));
				return next;
			});
		},
		[transactionIds]
	);

	const toggleSelectionWithShift = useCallback(
		(id: string, shiftKey: boolean) => {
			if (shiftKey && lastSelectedId && lastSelectedId !== id) {
				selectRange(lastSelectedId, id);
				setLastSelectedId(id);
			} else {
				toggleSelection(id);
			}
		},
		[lastSelectedId, selectRange, toggleSelection]
	);

	const selectAll = useCallback(() => {
		setSelectedIds(new Set(transactionIds));
	}, [transactionIds]);

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
		setLastSelectedId(null);
	}, []);

	const toggleSelectAll = useCallback(() => {
		if (allSelected) {
			clearSelection();
		} else {
			selectAll();
		}
	}, [allSelected, clearSelection, selectAll]);

	const setSelection = useCallback((ids: Set<string>) => {
		setSelectedIds(ids);
	}, []);

	return {
		selectedIds: visibleSelectedIds,
		allSelected,
		someSelected,
		selectedCount,
		toggleSelection,
		toggleSelectionWithShift,
		selectRange,
		selectAll,
		clearSelection,
		toggleSelectAll,
		isSelected,
		setSelection,
		lastSelectedId,
	};
}
