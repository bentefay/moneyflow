import { useCallback, useState } from "react";
import type { ColumnId } from "../column-config";

export interface FocusedCell {
  rowId: string;
  column: ColumnId;
}

export interface UseKeyboardNavigationOptions {
  /** Row IDs in display order */
  rowIds: string[];
  /** Column IDs in display order */
  columnIds: ColumnId[];
  /** Columns that can receive focus (subset of columnIds) */
  focusableColumns: ColumnId[];
  /** Callback when focus changes */
  onFocusChange?: (cell: FocusedCell | null) => void;
  /** Callback when Enter is pressed on a focused cell */
  onActivate?: (cell: FocusedCell) => void;
  /** Callback when a cell value should be saved (Tab, Enter while editing) */
  onSave?: (cell: FocusedCell) => void;
  /** Callback when edit should be cancelled (Escape) */
  onCancel?: (cell: FocusedCell) => void;
}

export interface UseKeyboardNavigationReturn {
  /** Currently focused cell, or null if none */
  focusedCell: FocusedCell | null;
  /** Whether the focused cell is in edit mode */
  isEditing: boolean;
  /** Set focus to a specific cell */
  setFocus: (rowId: string, column: ColumnId) => void;
  /** Clear focus entirely */
  clearFocus: () => void;
  /** Enter edit mode for the focused cell */
  startEditing: () => void;
  /** Exit edit mode (without saving - call onSave separately) */
  stopEditing: () => void;
  /** Keyboard event handler - attach to table container */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Check if a specific cell is focused */
  isFocused: (rowId: string, column: ColumnId) => boolean;
  /** Check if a specific cell is focused and in edit mode */
  isFocusedEditing: (rowId: string, column: ColumnId) => boolean;
}

/**
 * Hook for keyboard navigation between table cells.
 *
 * State machine:
 * - [No Focus] → click cell → [Focused, Not Editing]
 * - [Focused, Not Editing] → type/Enter → [Focused, Editing]
 * - [Focused, Editing] → Enter/Tab → [Focused, Not Editing] + Save
 * - [Focused, Editing] → Escape → [Focused, Not Editing] + Cancel
 * - [Focused, Not Editing] → Arrow keys → Move focus
 * - [Focused, Editing] → Arrow keys → Move cursor (no navigation)
 */
export function useKeyboardNavigation({
  rowIds,
  columnIds: _columnIds,
  focusableColumns,
  onFocusChange,
  onActivate,
  onSave,
  onCancel,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [focusedCell, setFocusedCellState] = useState<FocusedCell | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Helper to update focus and notify
  const setFocusedCell = useCallback(
    (cell: FocusedCell | null) => {
      setFocusedCellState(cell);
      onFocusChange?.(cell);
    },
    [onFocusChange],
  );

  // Set focus to a specific cell
  const setFocus = useCallback(
    (rowId: string, column: ColumnId) => {
      // Only allow focusing on focusable columns
      if (!focusableColumns.includes(column)) {
        return;
      }
      setFocusedCell({ rowId, column });
      setIsEditing(false);
    },
    [focusableColumns, setFocusedCell],
  );

  // Clear focus
  const clearFocus = useCallback(() => {
    setFocusedCell(null);
    setIsEditing(false);
  }, [setFocusedCell]);

  // Enter edit mode
  const startEditing = useCallback(() => {
    if (focusedCell) {
      setIsEditing(true);
      onActivate?.(focusedCell);
    }
  }, [focusedCell, onActivate]);

  // Exit edit mode
  const stopEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Navigate to adjacent cell
  const navigate = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!focusedCell) return;

      const { rowId, column } = focusedCell;
      const rowIndex = rowIds.indexOf(rowId);
      const colIndex = focusableColumns.indexOf(column);

      if (rowIndex === -1 || colIndex === -1) return;

      let newRowIndex = rowIndex;
      let newColIndex = colIndex;

      switch (direction) {
        case "up":
          newRowIndex = Math.max(0, rowIndex - 1);
          break;
        case "down":
          newRowIndex = Math.min(rowIds.length - 1, rowIndex + 1);
          break;
        case "left":
          newColIndex = Math.max(0, colIndex - 1);
          break;
        case "right":
          newColIndex = Math.min(focusableColumns.length - 1, colIndex + 1);
          break;
      }

      const newRowId = rowIds[newRowIndex];
      const newColumn = focusableColumns[newColIndex];

      if (newRowId && newColumn) {
        setFocus(newRowId, newColumn);
      }
    },
    [focusedCell, rowIds, focusableColumns, setFocus],
  );

  // Move to next focusable cell (for Tab)
  const moveToNextCell = useCallback(() => {
    if (!focusedCell) return;

    const { rowId, column } = focusedCell;
    const rowIndex = rowIds.indexOf(rowId);
    const colIndex = focusableColumns.indexOf(column);

    if (rowIndex === -1 || colIndex === -1) return;

    // Move to next column in same row
    if (colIndex < focusableColumns.length - 1) {
      setFocus(rowId, focusableColumns[colIndex + 1]);
    }
    // Move to first column of next row
    else if (rowIndex < rowIds.length - 1) {
      setFocus(rowIds[rowIndex + 1], focusableColumns[0]);
    }
    // At end of table - clear focus
    else {
      clearFocus();
    }
  }, [focusedCell, rowIds, focusableColumns, setFocus, clearFocus]);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // If editing, only handle Escape, Enter, Tab
      if (isEditing) {
        switch (event.key) {
          case "Escape":
            event.preventDefault();
            setIsEditing(false);
            if (focusedCell) {
              onCancel?.(focusedCell);
            }
            break;
          case "Enter":
            event.preventDefault();
            setIsEditing(false);
            if (focusedCell) {
              onSave?.(focusedCell);
            }
            break;
          case "Tab":
            event.preventDefault();
            setIsEditing(false);
            if (focusedCell) {
              onSave?.(focusedCell);
            }
            moveToNextCell();
            break;
          // Allow other keys to pass through for text editing
        }
        return;
      }

      // Not editing - handle navigation
      if (!focusedCell) return;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          navigate("up");
          break;
        case "ArrowDown":
          event.preventDefault();
          navigate("down");
          break;
        case "ArrowLeft":
          event.preventDefault();
          navigate("left");
          break;
        case "ArrowRight":
          event.preventDefault();
          navigate("right");
          break;
        case "Enter":
          event.preventDefault();
          startEditing();
          break;
        case "Tab":
          event.preventDefault();
          moveToNextCell();
          break;
        case "Escape":
          event.preventDefault();
          clearFocus();
          break;
      }
    },
    [
      isEditing,
      focusedCell,
      navigate,
      startEditing,
      moveToNextCell,
      clearFocus,
      onSave,
      onCancel,
    ],
  );

  // Check if a cell is focused
  const isFocused = useCallback(
    (rowId: string, column: ColumnId) =>
      focusedCell?.rowId === rowId && focusedCell?.column === column,
    [focusedCell],
  );

  // Check if a cell is focused and editing
  const isFocusedEditing = useCallback(
    (rowId: string, column: ColumnId) => isFocused(rowId, column) && isEditing,
    [isFocused, isEditing],
  );

  return {
    focusedCell,
    isEditing,
    setFocus,
    clearFocus,
    startEditing,
    stopEditing,
    handleKeyDown,
    isFocused,
    isFocusedEditing,
  };
}
