import { useCallback, useMemo, useState } from "react";

export interface UseTableSelectionOptions {
	/** All transaction IDs matching current filter (not just visible/rendered rows) */
	filteredIds: string[];
	/** Externally controlled selected IDs */
	selectedIds: Set<string>;
	/** Callback when selection changes */
	onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface UseTableSelectionReturn {
	/** Last selected ID (for shift-click range selection) */
	lastSelectedId: string | null;
	/** Whether all filtered transactions are selected */
	isAllSelected: boolean;
	/** Whether some (but not all) filtered transactions are selected */
	isSomeSelected: boolean;
	/** Number of selected transactions */
	selectedCount: number;
	/** Toggle select-all (selects all filtered if not all selected, clears if all selected) */
	selectAll: () => void;
	/** Toggle single row selection (with optional shift key for range selection) */
	toggleRow: (id: string, shiftKey?: boolean) => void;
	/** Clear all selection */
	clearSelection: () => void;
}

/**
 * Hook for managing table selection state across virtualized rows.
 * This is a controlled hook - selection state is owned by the parent.
 * Tracks selection by ID, not by rendered row index, so selection
 * persists when scrolling through virtualized content.
 *
 * Supports:
 * - Individual row selection
 * - Select-all for filtered rows (not just visible)
 * - Shift-click range selection
 * - Indeterminate state (some selected)
 */
export function useTableSelection({
	filteredIds,
	selectedIds,
	onSelectionChange,
}: UseTableSelectionOptions): UseTableSelectionReturn {
	// Track last selected ID for shift-click range selection
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

	// Compute derived state from controlled selectedIds
	const { isAllSelected, isSomeSelected, selectedCount } = useMemo(() => {
		const count = selectedIds.size;
		const filteredCount = filteredIds.length;

		// Check how many of the filtered IDs are selected
		let selectedInFiltered = 0;
		for (const id of filteredIds) {
			if (selectedIds.has(id)) {
				selectedInFiltered++;
			}
		}

		return {
			isAllSelected: filteredCount > 0 && selectedInFiltered === filteredCount,
			isSomeSelected: selectedInFiltered > 0 && selectedInFiltered < filteredCount,
			selectedCount: count,
		};
	}, [selectedIds, filteredIds]);

	// Toggle select-all
	const selectAll = useCallback(() => {
		if (isAllSelected) {
			// Deselect all filtered
			const newIds = new Set(selectedIds);
			for (const id of filteredIds) {
				newIds.delete(id);
			}
			onSelectionChange?.(newIds);
		} else {
			// Select all filtered
			const newIds = new Set(selectedIds);
			for (const id of filteredIds) {
				newIds.add(id);
			}
			onSelectionChange?.(newIds);
		}
		setLastSelectedId(null);
	}, [isAllSelected, selectedIds, filteredIds, onSelectionChange]);

	// Toggle single row (with optional shift for range)
	const toggleRow = useCallback(
		(id: string, shiftKey?: boolean) => {
			const newIds = new Set(selectedIds);

			if (shiftKey && lastSelectedId !== null) {
				// Range selection: select all between lastSelectedId and id
				const startIdx = filteredIds.indexOf(lastSelectedId);
				const endIdx = filteredIds.indexOf(id);

				if (startIdx !== -1 && endIdx !== -1) {
					const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
					for (let i = from; i <= to; i++) {
						newIds.add(filteredIds[i]);
					}
				}
			} else {
				// Single toggle
				if (newIds.has(id)) {
					newIds.delete(id);
				} else {
					newIds.add(id);
				}
			}

			onSelectionChange?.(newIds);
			setLastSelectedId(id);
		},
		[selectedIds, lastSelectedId, filteredIds, onSelectionChange]
	);

	// Clear all selection
	const clearSelection = useCallback(() => {
		onSelectionChange?.(new Set());
		setLastSelectedId(null);
	}, [onSelectionChange]);

	return {
		lastSelectedId,
		isAllSelected,
		isSomeSelected,
		selectedCount,
		selectAll,
		toggleRow,
		clearSelection,
	};
}
