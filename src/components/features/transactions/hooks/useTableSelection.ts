import { useCallback, useMemo, useState } from "react";

export interface UseTableSelectionOptions {
	/** All transaction IDs matching current filter (not just visible/rendered rows) */
	filteredIds: string[];
	/** Callback when selection changes */
	onSelectionChange?: (selectedIds: Set<string>) => void;
	/** Initial selected IDs */
	initialSelectedIds?: Set<string>;
}

export interface UseTableSelectionReturn {
	/** Currently selected transaction IDs */
	selectedIds: Set<string>;
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
	/** Check if a specific row is selected */
	isSelected: (id: string) => boolean;
	/** Select specific IDs (replaces current selection) */
	setSelectedIds: (ids: Set<string>) => void;
}

/**
 * Hook for managing table selection state across virtualized rows.
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
	onSelectionChange,
	initialSelectedIds,
}: UseTableSelectionOptions): UseTableSelectionReturn {
	const [selectedIds, setSelectedIdsState] = useState<Set<string>>(
		() => initialSelectedIds ?? new Set()
	);
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

	// Compute derived state
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

	// Helper to update selection and notify
	const updateSelection = useCallback(
		(newIds: Set<string>) => {
			setSelectedIdsState(newIds);
			onSelectionChange?.(newIds);
		},
		[onSelectionChange]
	);

	// Toggle select-all
	const selectAll = useCallback(() => {
		if (isAllSelected) {
			// Deselect all filtered
			const newIds = new Set(selectedIds);
			for (const id of filteredIds) {
				newIds.delete(id);
			}
			updateSelection(newIds);
		} else {
			// Select all filtered
			const newIds = new Set(selectedIds);
			for (const id of filteredIds) {
				newIds.add(id);
			}
			updateSelection(newIds);
		}
		setLastSelectedId(null);
	}, [isAllSelected, selectedIds, filteredIds, updateSelection]);

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

			updateSelection(newIds);
			setLastSelectedId(id);
		},
		[selectedIds, lastSelectedId, filteredIds, updateSelection]
	);

	// Clear all selection
	const clearSelection = useCallback(() => {
		updateSelection(new Set());
		setLastSelectedId(null);
	}, [updateSelection]);

	// Check if a row is selected
	const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

	// Set selection directly
	const setSelectedIds = useCallback(
		(ids: Set<string>) => {
			updateSelection(ids);
		},
		[updateSelection]
	);

	return {
		selectedIds,
		lastSelectedId,
		isAllSelected,
		isSomeSelected,
		selectedCount,
		selectAll,
		toggleRow,
		clearSelection,
		isSelected,
		setSelectedIds,
	};
}
