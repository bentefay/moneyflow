import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableSelection } from "@/components/features/transactions/hooks/useTableSelection";

describe("useTableSelection", () => {
  const filteredIds = ["tx-1", "tx-2", "tx-3", "tx-4", "tx-5"];

  describe("initial state", () => {
    it("starts with empty selection by default", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isSomeSelected).toBe(false);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.lastSelectedId).toBeNull();
    });

    it("accepts initial selected IDs", () => {
      const initialIds = new Set(["tx-1", "tx-2"]);
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds, initialSelectedIds: initialIds }),
      );

      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected("tx-1")).toBe(true);
      expect(result.current.isSelected("tx-2")).toBe(true);
      expect(result.current.isSomeSelected).toBe(true);
    });
  });

  describe("toggleRow", () => {
    it("selects a row when clicking checkbox", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      act(() => {
        result.current.toggleRow("tx-2");
      });

      expect(result.current.isSelected("tx-2")).toBe(true);
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.lastSelectedId).toBe("tx-2");
    });

    it("deselects a row when clicking again", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      act(() => {
        result.current.toggleRow("tx-2");
      });
      expect(result.current.isSelected("tx-2")).toBe(true);

      act(() => {
        result.current.toggleRow("tx-2");
      });
      expect(result.current.isSelected("tx-2")).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it("supports shift-click range selection", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      // Select tx-1 first
      act(() => {
        result.current.toggleRow("tx-1");
      });

      // Shift-click tx-4 to select range
      act(() => {
        result.current.toggleRow("tx-4", true);
      });

      expect(result.current.isSelected("tx-1")).toBe(true);
      expect(result.current.isSelected("tx-2")).toBe(true);
      expect(result.current.isSelected("tx-3")).toBe(true);
      expect(result.current.isSelected("tx-4")).toBe(true);
      expect(result.current.isSelected("tx-5")).toBe(false);
      expect(result.current.selectedCount).toBe(4);
    });

    it("supports reverse range selection (shift-click above)", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      // Select tx-4 first
      act(() => {
        result.current.toggleRow("tx-4");
      });

      // Shift-click tx-2 to select range upward
      act(() => {
        result.current.toggleRow("tx-2", true);
      });

      expect(result.current.isSelected("tx-1")).toBe(false);
      expect(result.current.isSelected("tx-2")).toBe(true);
      expect(result.current.isSelected("tx-3")).toBe(true);
      expect(result.current.isSelected("tx-4")).toBe(true);
      expect(result.current.selectedCount).toBe(3);
    });
  });

  describe("selectAll", () => {
    it("selects all filtered transactions", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.isSomeSelected).toBe(false);
      expect(result.current.selectedCount).toBe(5);
      for (const id of filteredIds) {
        expect(result.current.isSelected(id)).toBe(true);
      }
    });

    it("deselects all when all are selected", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      act(() => {
        result.current.selectAll();
      });
      expect(result.current.isAllSelected).toBe(true);

      act(() => {
        result.current.selectAll();
      });
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it("selects remaining when some are already selected", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      act(() => {
        result.current.toggleRow("tx-2");
      });
      expect(result.current.isSomeSelected).toBe(true);

      act(() => {
        result.current.selectAll();
      });
      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.selectedCount).toBe(5);
    });
  });

  describe("clearSelection", () => {
    it("clears all selected items", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      act(() => {
        result.current.selectAll();
      });
      expect(result.current.selectedCount).toBe(5);

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.lastSelectedId).toBeNull();
    });
  });

  describe("derived state", () => {
    it("computes isSomeSelected correctly", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds }),
      );

      // None selected
      expect(result.current.isSomeSelected).toBe(false);

      // Some selected
      act(() => {
        result.current.toggleRow("tx-1");
      });
      expect(result.current.isSomeSelected).toBe(true);

      // All selected
      act(() => {
        result.current.selectAll();
      });
      expect(result.current.isSomeSelected).toBe(false);
      expect(result.current.isAllSelected).toBe(true);
    });

    it("handles empty filteredIds", () => {
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds: [] }),
      );

      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isSomeSelected).toBe(false);
    });
  });

  describe("onSelectionChange callback", () => {
    it("calls callback when selection changes", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds, onSelectionChange }),
      );

      act(() => {
        result.current.toggleRow("tx-1");
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(["tx-1"]));
    });

    it("calls callback on selectAll", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds, onSelectionChange }),
      );

      act(() => {
        result.current.selectAll();
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(filteredIds));
    });

    it("calls callback on clearSelection", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useTableSelection({ filteredIds, onSelectionChange }),
      );

      act(() => {
        result.current.toggleRow("tx-1");
      });
      act(() => {
        result.current.clearSelection();
      });

      expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());
    });
  });

  describe("selection with changing filteredIds", () => {
    it("preserves selection when filteredIds changes", () => {
      const { result, rerender } = renderHook(
        ({ filteredIds }) => useTableSelection({ filteredIds }),
        { initialProps: { filteredIds } },
      );

      act(() => {
        result.current.toggleRow("tx-2");
      });
      act(() => {
        result.current.toggleRow("tx-4");
      });
      expect(result.current.selectedCount).toBe(2);

      // Change filter to only show tx-2, tx-3
      rerender({ filteredIds: ["tx-2", "tx-3"] });

      // tx-2 still selected, tx-4 still in selectedIds but not in filtered
      expect(result.current.isSelected("tx-2")).toBe(true);
      expect(result.current.isSelected("tx-4")).toBe(true);
      expect(result.current.selectedCount).toBe(2);
      // But isAllSelected should be false (tx-3 not selected)
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isSomeSelected).toBe(true);
    });
  });
});
