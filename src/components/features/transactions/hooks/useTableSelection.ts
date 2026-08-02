import { useCallback, useMemo, useState } from "react";

import {
    ALL_MATCHING_ROWS_SELECTED,
    anchorMatchesSelection,
    findRowRange,
    isRowSelected,
    NO_ROWS_SELECTED,
    rowIdsInRange,
    type SelectionAnchor,
    type SelectionHeaderState,
    selectedRowCount,
    selectionHeaderState,
    setRowsSelected,
    type TransactionSelection
} from "../table-selection";

export interface UseTableSelectionOptions {
    /**
     * Every row matching the active filters, in the order the table currently presents them — not
     * only the rows that happen to be rendered or paged in. Selection is a property of this set.
     */
    matchingRowIds: readonly string[];
    /** Externally controlled selection (read-only; the hook never mutates it) */
    selection: TransactionSelection;
    /** Callback when the selection changes */
    onSelectionChange?: (selection: TransactionSelection) => void;
}

export interface UseTableSelectionReturn {
    /** The row a further shift-click extends from, and what was done to it */
    anchor: SelectionAnchor | null;
    /** Tri-state of the header checkbox over the whole filtered result set */
    headerState: SelectionHeaderState;
    /** Whether every matching row is selected */
    isAllSelected: boolean;
    /** Whether some (but not all) matching rows are selected */
    isSomeSelected: boolean;
    /** Number of selected matching rows */
    selectedCount: number;
    /** Toggle select-all over every matching row, rendered or not */
    selectAll: () => void;
    /** Toggle a single row, or extend the anchor's outcome across a range when shift is held */
    toggleRow: (id: string, shiftKey?: boolean) => void;
    /** Clear the selection entirely */
    clearSelection: () => void;
}

/**
 * Hook for managing transaction-table selection across virtualized, paginated rows.
 *
 * This is a controlled hook — the selection is owned by the parent and expressed as a baseline plus
 * exceptions (see `table-selection.ts`), so selecting every matching row costs the same whether the
 * filters match five rows or a hundred thousand, and neither the selection nor the header's own
 * state is derived by scanning what is on screen.
 *
 * Supports:
 * - Individual row selection
 * - Select-all across the whole filtered result set, not just the rendered rows
 * - Shift-click range selection that extends selection and deselection symmetrically
 * - Indeterminate header state
 */
export function useTableSelection({
    matchingRowIds,
    selection,
    onSelectionChange
}: UseTableSelectionOptions): UseTableSelectionReturn {
    // The anchor carries what was done to the row as well as which row it was: a range gesture has
    // to apply the anchor's own outcome, and the row's identity alone cannot say what that was.
    const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);

    const { headerState, selectedCount } = useMemo(() => {
        const matchingRowCount = matchingRowIds.length;
        return {
            headerState: selectionHeaderState(selection, matchingRowCount),
            selectedCount: selectedRowCount(selection, matchingRowCount)
        };
    }, [selection, matchingRowIds]);

    const selectAll = useCallback(() => {
        onSelectionChange?.(headerState === "all" ? NO_ROWS_SELECTED : ALL_MATCHING_ROWS_SELECTED);
        setAnchor(null);
    }, [headerState, onSelectionChange]);

    const toggleRow = useCallback(
        (id: string, shiftKey?: boolean) => {
            // A stale anchor — one whose row no longer holds the outcome it recorded, because the
            // selection was cleared or replaced from elsewhere — describes nothing to extend, so
            // the gesture degrades to an ordinary single toggle rather than extending a fiction.
            const range =
                shiftKey && anchor != null && anchorMatchesSelection(anchor, selection)
                    ? findRowRange(matchingRowIds, anchor.rowId, id)
                    : null;

            if (range != null && anchor != null) {
                onSelectionChange?.(
                    setRowsSelected(
                        selection,
                        rowIdsInRange(matchingRowIds, range),
                        anchor.outcome === "selected"
                    )
                );
                // The clicked row becomes the new anchor, carrying the outcome the range applied,
                // so a further shift-click extends the same direction from it.
                setAnchor({ rowId: id, outcome: anchor.outcome });
                return;
            }

            const nowSelected = !isRowSelected(selection, id);
            onSelectionChange?.(setRowsSelected(selection, [id], nowSelected));
            setAnchor({ rowId: id, outcome: nowSelected ? "selected" : "deselected" });
        },
        [anchor, matchingRowIds, onSelectionChange, selection]
    );

    const clearSelection = useCallback(() => {
        onSelectionChange?.(NO_ROWS_SELECTED);
        setAnchor(null);
    }, [onSelectionChange]);

    return {
        anchor,
        headerState,
        isAllSelected: headerState === "all",
        isSomeSelected: headerState === "some",
        selectedCount,
        selectAll,
        toggleRow,
        clearSelection
    };
}
