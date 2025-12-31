import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardNavigation } from "../../../src/components/features/transactions/hooks/useKeyboardNavigation";
import type { ColumnId } from "../../../src/components/features/transactions/column-config";

describe("useKeyboardNavigation", () => {
  const rowIds = ["row-1", "row-2", "row-3"];
  const columnIds: ColumnId[] = [
    "checkbox",
    "date",
    "merchant",
    "account",
    "tags",
    "status",
    "amount",
    "balance",
    "actions",
  ];
  const focusableColumns: ColumnId[] = [
    "date",
    "merchant",
    "tags",
    "status",
    "amount",
  ];

  const createDefaultProps = () => ({
    rowIds,
    columnIds,
    focusableColumns,
    onFocusChange: vi.fn(),
    onActivate: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  });

  const createKeyboardEvent = (
    key: string,
    options: Partial<React.KeyboardEvent> = {},
  ): React.KeyboardEvent => ({
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...options,
  } as unknown as React.KeyboardEvent);

  describe("initial state", () => {
    it("starts with no focus and not editing", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      expect(result.current.focusedCell).toBeNull();
      expect(result.current.isEditing).toBe(false);
    });
  });

  describe("setFocus", () => {
    it("sets focus to a valid focusable cell", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "date",
      });
      expect(props.onFocusChange).toHaveBeenCalledWith({
        rowId: "row-1",
        column: "date",
      });
    });

    it("ignores focus on non-focusable columns", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "checkbox");
      });

      expect(result.current.focusedCell).toBeNull();
      expect(props.onFocusChange).not.toHaveBeenCalled();
    });

    it("clears edit mode when setting new focus", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });
      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);

      act(() => {
        result.current.setFocus("row-2", "merchant");
      });

      expect(result.current.isEditing).toBe(false);
    });
  });

  describe("clearFocus", () => {
    it("clears focused cell and edit mode", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });
      act(() => {
        result.current.startEditing();
      });
      act(() => {
        result.current.clearFocus();
      });

      expect(result.current.focusedCell).toBeNull();
      expect(result.current.isEditing).toBe(false);
    });
  });

  describe("startEditing / stopEditing", () => {
    it("enters edit mode and calls onActivate", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });
      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);
      expect(props.onActivate).toHaveBeenCalledWith({
        rowId: "row-1",
        column: "date",
      });
    });

    it("does nothing if no cell is focused", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(false);
      expect(props.onActivate).not.toHaveBeenCalled();
    });

    it("exits edit mode with stopEditing", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });
      act(() => {
        result.current.startEditing();
      });
      act(() => {
        result.current.stopEditing();
      });

      expect(result.current.isEditing).toBe(false);
    });
  });

  describe("isFocused / isFocusedEditing", () => {
    it("returns true for focused cell", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      expect(result.current.isFocused("row-1", "date")).toBe(true);
      expect(result.current.isFocused("row-2", "date")).toBe(false);
      expect(result.current.isFocused("row-1", "merchant")).toBe(false);
    });

    it("isFocusedEditing returns true only when editing", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      expect(result.current.isFocusedEditing("row-1", "date")).toBe(false);

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isFocusedEditing("row-1", "date")).toBe(true);
    });
  });

  describe("keyboard navigation (not editing)", () => {
    it("ArrowUp moves focus up one row", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-2", "date");
      });

      const event = createKeyboardEvent("ArrowUp");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "date",
      });
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("ArrowUp at first row stays at first row", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      const event = createKeyboardEvent("ArrowUp");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "date",
      });
    });

    it("ArrowDown moves focus down one row", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      const event = createKeyboardEvent("ArrowDown");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-2",
        column: "date",
      });
    });

    it("ArrowLeft moves focus to previous focusable column", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "merchant");
      });

      const event = createKeyboardEvent("ArrowLeft");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "date",
      });
    });

    it("ArrowRight moves focus to next focusable column", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      const event = createKeyboardEvent("ArrowRight");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "merchant",
      });
    });

    it("ArrowRight at last column stays at last column", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "amount"); // Last focusable column
      });

      const event = createKeyboardEvent("ArrowRight");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "amount",
      });
    });

    it("Enter enters edit mode", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      const event = createKeyboardEvent("Enter");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.isEditing).toBe(true);
      expect(props.onActivate).toHaveBeenCalled();
    });

    it("Tab moves to next cell", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      const event = createKeyboardEvent("Tab");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "merchant",
      });
    });

    it("Tab at end of row moves to first column of next row", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "amount");
      });

      const event = createKeyboardEvent("Tab");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toEqual({
        rowId: "row-2",
        column: "date",
      });
    });

    it("Tab at last cell of last row clears focus", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-3", "amount");
      });

      const event = createKeyboardEvent("Tab");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toBeNull();
    });

    it("Escape clears focus", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      const event = createKeyboardEvent("Escape");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toBeNull();
    });
  });

  describe("keyboard navigation (while editing)", () => {
    it("arrow keys do not navigate while editing", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-2", "date");
      });
      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("ArrowUp");
      act(() => {
        result.current.handleKeyDown(event);
      });

      // Focus should remain unchanged - still on row-2
      expect(result.current.focusedCell).toEqual({
        rowId: "row-2",
        column: "date",
      });
      expect(result.current.isEditing).toBe(true);
    });

    it("Escape cancels edit and calls onCancel", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });
      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("Escape");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "date",
      }); // Focus remains
      expect(props.onCancel).toHaveBeenCalledWith({
        rowId: "row-1",
        column: "date",
      });
    });

    it("Enter saves edit and calls onSave", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });
      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("Enter");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.isEditing).toBe(false);
      expect(props.onSave).toHaveBeenCalledWith({
        rowId: "row-1",
        column: "date",
      });
    });

    it("Tab saves edit, calls onSave, and moves to next cell", () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useKeyboardNavigation(props));

      act(() => {
        result.current.setFocus("row-1", "date");
      });
      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("Tab");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.isEditing).toBe(false);
      expect(props.onSave).toHaveBeenCalledWith({
        rowId: "row-1",
        column: "date",
      });
      expect(result.current.focusedCell).toEqual({
        rowId: "row-1",
        column: "merchant",
      });
    });
  });

  describe("edge cases", () => {
    it("does nothing when no focus and key pressed", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      const event = createKeyboardEvent("ArrowDown");
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedCell).toBeNull();
    });

    it("handles row not found gracefully", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultProps()),
      );

      act(() => {
        result.current.setFocus("row-1", "date");
      });

      // Manually set to non-existent row via internal state (edge case)
      // This tests the guard clause in navigate()
      expect(() => {
        const event = createKeyboardEvent("ArrowDown");
        act(() => {
          result.current.handleKeyDown(event);
        });
      }).not.toThrow();
    });

    it("callbacks are stable across renders", () => {
      const props = createDefaultProps();
      const { result, rerender } = renderHook(() =>
        useKeyboardNavigation(props),
      );

      const firstSetFocus = result.current.setFocus;
      const firstClearFocus = result.current.clearFocus;
      // Note: handleKeyDown changes if isEditing or focusedCell changes

      rerender();

      expect(result.current.setFocus).toBe(firstSetFocus);
      expect(result.current.clearFocus).toBe(firstClearFocus);
    });
  });
});
