import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTableSelection } from "@/components/features/transactions/hooks/useTableSelection";

describe("useTableSelection (controlled mode)", () => {
	const filteredIds = ["tx-1", "tx-2", "tx-3", "tx-4", "tx-5"];

	describe("initial state", () => {
		it("starts with empty selection", () => {
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds: new Set(),
				})
			);

			expect(result.current.isAllSelected).toBe(false);
			expect(result.current.isSomeSelected).toBe(false);
			expect(result.current.selectedCount).toBe(0);
			expect(result.current.lastSelectedId).toBeNull();
		});

		it("computes derived state from controlled selectedIds", () => {
			const selectedIds = new Set(["tx-1", "tx-2"]);
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds,
				})
			);

			expect(result.current.selectedCount).toBe(2);
			expect(result.current.isSomeSelected).toBe(true);
			expect(result.current.isAllSelected).toBe(false);
		});
	});

	describe("toggleRow", () => {
		it("calls onSelectionChange with new selection when toggling row", () => {
			const onSelectionChange = vi.fn();
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds: new Set(),
					onSelectionChange,
				})
			);

			act(() => {
				result.current.toggleRow("tx-2");
			});

			expect(onSelectionChange).toHaveBeenCalledWith(new Set(["tx-2"]));
		});

		it("calls onSelectionChange to deselect when row already selected", () => {
			const onSelectionChange = vi.fn();
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds: new Set(["tx-2"]),
					onSelectionChange,
				})
			);

			act(() => {
				result.current.toggleRow("tx-2");
			});

			expect(onSelectionChange).toHaveBeenCalledWith(new Set());
		});

		it("supports shift-click range selection", () => {
			const onSelectionChange = vi.fn();
			// Simulate controlled mode: first select tx-1, then shift-click tx-4
			const { result, rerender } = renderHook(
				({ selectedIds }) =>
					useTableSelection({
						filteredIds,
						selectedIds,
						onSelectionChange,
					}),
				{ initialProps: { selectedIds: new Set<string>() } }
			);

			// First click on tx-1
			act(() => {
				result.current.toggleRow("tx-1");
			});
			expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["tx-1"]));

			// Simulate parent updating state
			rerender({ selectedIds: new Set(["tx-1"]) });

			// Shift-click on tx-4
			act(() => {
				result.current.toggleRow("tx-4", true);
			});

			// Should have tx-1 through tx-4 selected
			expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["tx-1", "tx-2", "tx-3", "tx-4"]));
		});

		it("supports reverse range selection (shift-click above)", () => {
			const onSelectionChange = vi.fn();
			const { result, rerender } = renderHook(
				({ selectedIds }) =>
					useTableSelection({
						filteredIds,
						selectedIds,
						onSelectionChange,
					}),
				{ initialProps: { selectedIds: new Set<string>() } }
			);

			// First click on tx-4
			act(() => {
				result.current.toggleRow("tx-4");
			});
			rerender({ selectedIds: new Set(["tx-4"]) });

			// Shift-click on tx-2
			act(() => {
				result.current.toggleRow("tx-2", true);
			});

			expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["tx-2", "tx-3", "tx-4"]));
		});
	});

	describe("selectAll", () => {
		it("calls onSelectionChange with all filtered IDs", () => {
			const onSelectionChange = vi.fn();
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds: new Set(),
					onSelectionChange,
				})
			);

			act(() => {
				result.current.selectAll();
			});

			expect(onSelectionChange).toHaveBeenCalledWith(new Set(filteredIds));
		});

		it("deselects all when all are selected", () => {
			const onSelectionChange = vi.fn();
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds: new Set(filteredIds),
					onSelectionChange,
				})
			);

			act(() => {
				result.current.selectAll();
			});

			expect(onSelectionChange).toHaveBeenCalledWith(new Set());
		});

		it("selects remaining when some are already selected", () => {
			const onSelectionChange = vi.fn();
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds: new Set(["tx-2"]),
					onSelectionChange,
				})
			);

			act(() => {
				result.current.selectAll();
			});

			expect(onSelectionChange).toHaveBeenCalledWith(new Set(filteredIds));
		});
	});

	describe("clearSelection", () => {
		it("calls onSelectionChange with empty set", () => {
			const onSelectionChange = vi.fn();
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds,
					selectedIds: new Set(filteredIds),
					onSelectionChange,
				})
			);

			act(() => {
				result.current.clearSelection();
			});

			expect(onSelectionChange).toHaveBeenCalledWith(new Set());
		});

		it("resets lastSelectedId", () => {
			const onSelectionChange = vi.fn();
			const { result, rerender } = renderHook(
				({ selectedIds }) =>
					useTableSelection({
						filteredIds,
						selectedIds,
						onSelectionChange,
					}),
				{ initialProps: { selectedIds: new Set<string>() } }
			);

			act(() => {
				result.current.toggleRow("tx-1");
			});
			expect(result.current.lastSelectedId).toBe("tx-1");

			rerender({ selectedIds: new Set(["tx-1"]) });

			act(() => {
				result.current.clearSelection();
			});
			expect(result.current.lastSelectedId).toBeNull();
		});
	});

	describe("derived state", () => {
		it("computes isSomeSelected correctly", () => {
			const { result, rerender } = renderHook(
				({ selectedIds }) =>
					useTableSelection({
						filteredIds,
						selectedIds,
					}),
				{ initialProps: { selectedIds: new Set<string>() } }
			);

			// None selected
			expect(result.current.isSomeSelected).toBe(false);

			// Some selected
			rerender({ selectedIds: new Set(["tx-1"]) });
			expect(result.current.isSomeSelected).toBe(true);

			// All selected
			rerender({ selectedIds: new Set(filteredIds) });
			expect(result.current.isSomeSelected).toBe(false);
			expect(result.current.isAllSelected).toBe(true);
		});

		it("handles empty filteredIds", () => {
			const { result } = renderHook(() =>
				useTableSelection({
					filteredIds: [],
					selectedIds: new Set(),
				})
			);

			expect(result.current.isAllSelected).toBe(false);
			expect(result.current.isSomeSelected).toBe(false);
		});
	});

	describe("selection with changing filteredIds", () => {
		it("recalculates derived state when filteredIds changes", () => {
			const selectedIds = new Set(["tx-2", "tx-4"]);
			const { result, rerender } = renderHook(
				({ filteredIds }) =>
					useTableSelection({
						filteredIds,
						selectedIds,
					}),
				{ initialProps: { filteredIds } }
			);

			// Initial: 2 out of 5 selected
			expect(result.current.selectedCount).toBe(2);
			expect(result.current.isSomeSelected).toBe(true);
			expect(result.current.isAllSelected).toBe(false);

			// Change filter to only show tx-2, tx-4 (both selected)
			rerender({ filteredIds: ["tx-2", "tx-4"] });

			// Now all filtered are selected
			expect(result.current.isAllSelected).toBe(true);
			expect(result.current.isSomeSelected).toBe(false);
		});
	});
});
