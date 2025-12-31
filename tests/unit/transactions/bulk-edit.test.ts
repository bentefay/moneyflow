import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBulkEdit } from "../../../src/components/features/transactions/hooks/useBulkEdit";

describe("useBulkEdit", () => {
  const createDefaultProps = () => ({
    warnThreshold: 500,
    onWarnThreshold: vi.fn(),
    onOperationStart: vi.fn(),
    onOperationComplete: vi.fn(),
    onOperationError: vi.fn(),
  });

  // Create a mock mutation that resolves immediately
  const createImmediateMutation = <T>() =>
    vi.fn<(id: string, value: T) => Promise<void>>().mockResolvedValue(undefined);

  // Create a mock mutation that we can control
  const createControlledMutation = <T>() => {
    const resolvers: Array<() => void> = [];
    const fn = vi.fn<(id: string, value: T) => Promise<void>>().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    return { fn, resolvers };
  };

  describe("initial state", () => {
    it("starts with isProcessing false and no progress", () => {
      const { result } = renderHook(() => useBulkEdit(createDefaultProps()));

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBeNull();
    });
  });

  describe("setTags", () => {
    it("applies tags to all selected transactions", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<string[]>();

      await act(async () => {
        await result.current.setTags(
          ["tx-1", "tx-2", "tx-3"],
          ["tag-a", "tag-b"],
          mutation,
        );
      });

      expect(mutation).toHaveBeenCalledTimes(3);
      expect(mutation).toHaveBeenCalledWith("tx-1", ["tag-a", "tag-b"]);
      expect(mutation).toHaveBeenCalledWith("tx-2", ["tag-a", "tag-b"]);
      expect(mutation).toHaveBeenCalledWith("tx-3", ["tag-a", "tag-b"]);
    });

    it("calls onOperationStart and onOperationComplete", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<string[]>();

      await act(async () => {
        await result.current.setTags(["tx-1", "tx-2"], ["tag-a"], mutation);
      });

      expect(props.onOperationStart).toHaveBeenCalledWith("setTags", 2);
      expect(props.onOperationComplete).toHaveBeenCalledWith("setTags", 2);
    });

    it("does nothing for empty selection", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<string[]>();

      await act(async () => {
        await result.current.setTags([], ["tag-a"], mutation);
      });

      expect(mutation).not.toHaveBeenCalled();
      expect(props.onOperationStart).not.toHaveBeenCalled();
    });
  });

  describe("setDescription", () => {
    it("applies description to all selected transactions", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<string>();

      await act(async () => {
        await result.current.setDescription(
          ["tx-1", "tx-2"],
          "Updated description",
          mutation,
        );
      });

      expect(mutation).toHaveBeenCalledTimes(2);
      expect(mutation).toHaveBeenCalledWith("tx-1", "Updated description");
      expect(mutation).toHaveBeenCalledWith("tx-2", "Updated description");
    });
  });

  describe("setAmount", () => {
    it("applies amount to all selected transactions", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<number>();

      await act(async () => {
        await result.current.setAmount(["tx-1", "tx-2"], 1234, mutation);
      });

      expect(mutation).toHaveBeenCalledTimes(2);
      expect(mutation).toHaveBeenCalledWith("tx-1", 1234);
      expect(mutation).toHaveBeenCalledWith("tx-2", 1234);
    });
  });

  describe("setStatus", () => {
    it("applies status to all selected transactions", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<string>();

      await act(async () => {
        await result.current.setStatus(["tx-1", "tx-2"], "paid", mutation);
      });

      expect(mutation).toHaveBeenCalledTimes(2);
      expect(mutation).toHaveBeenCalledWith("tx-1", "paid");
      expect(mutation).toHaveBeenCalledWith("tx-2", "paid");
    });
  });

  describe("deleteSelected", () => {
    it("deletes all selected transactions", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const deleteFn = vi.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.deleteSelected(["tx-1", "tx-2", "tx-3"], deleteFn);
      });

      expect(deleteFn).toHaveBeenCalledTimes(3);
      expect(deleteFn).toHaveBeenCalledWith("tx-1");
      expect(deleteFn).toHaveBeenCalledWith("tx-2");
      expect(deleteFn).toHaveBeenCalledWith("tx-3");
      expect(props.onOperationComplete).toHaveBeenCalledWith("delete", 3);
    });

    it("does nothing for empty selection", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const deleteFn = vi.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.deleteSelected([], deleteFn);
      });

      expect(deleteFn).not.toHaveBeenCalled();
    });
  });

  describe("progress tracking", () => {
    it("updates progress during operation", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const { fn: mutation, resolvers } = createControlledMutation<string[]>();

      // Start the operation
      let operationPromise: Promise<void>;
      act(() => {
        operationPromise = result.current.setTags(
          ["tx-1", "tx-2", "tx-3"],
          ["tag-a"],
          mutation,
        );
      });

      // Should be processing with initial progress
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.progress).toEqual({
        current: 0,
        total: 3,
        operation: "setTags",
      });

      // Resolve first mutation
      await act(async () => {
        resolvers[0]();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.progress).toEqual({
        current: 1,
        total: 3,
        operation: "setTags",
      });

      // Resolve second mutation
      await act(async () => {
        resolvers[1]();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.progress).toEqual({
        current: 2,
        total: 3,
        operation: "setTags",
      });

      // Resolve last mutation
      await act(async () => {
        resolvers[2]();
        await operationPromise;
      });

      // Should be done
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBeNull();
    });
  });

  describe("threshold warning", () => {
    it("calls onWarnThreshold when exceeding threshold", async () => {
      const props = createDefaultProps();
      props.warnThreshold = 2;
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<string[]>();

      await act(async () => {
        await result.current.setTags(
          ["tx-1", "tx-2", "tx-3"], // 3 > threshold of 2
          ["tag-a"],
          mutation,
        );
      });

      expect(props.onWarnThreshold).toHaveBeenCalledWith(3);
    });

    it("does not warn when at or below threshold", async () => {
      const props = createDefaultProps();
      props.warnThreshold = 3;
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = createImmediateMutation<string[]>();

      await act(async () => {
        await result.current.setTags(["tx-1", "tx-2", "tx-3"], ["tag-a"], mutation);
      });

      expect(props.onWarnThreshold).not.toHaveBeenCalled();
    });

    it("uses default threshold of 500", async () => {
      const onWarnThreshold = vi.fn();
      const { result } = renderHook(() => useBulkEdit({ onWarnThreshold }));
      const mutation = createImmediateMutation<string[]>();

      // Create 501 IDs
      const ids = Array.from({ length: 501 }, (_, i) => `tx-${i}`);

      await act(async () => {
        await result.current.setTags(ids, ["tag-a"], mutation);
      });

      expect(onWarnThreshold).toHaveBeenCalledWith(501);
    });
  });

  describe("cancellation", () => {
    it("stops processing when cancelled", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const { fn: mutation, resolvers } = createControlledMutation<string[]>();

      // Start operation
      let operationPromise: Promise<void>;
      act(() => {
        operationPromise = result.current.setTags(
          ["tx-1", "tx-2", "tx-3"],
          ["tag-a"],
          mutation,
        );
      });

      // Resolve first, then cancel before it proceeds
      await act(async () => {
        resolvers[0]();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.progress?.current).toBe(1);

      // Cancel before next iteration starts
      act(() => {
        result.current.cancel();
      });

      // Resolve second to let the loop continue and check cancellation
      await act(async () => {
        resolvers[1]();
        await operationPromise;
      });

      // Should not have called complete callback (was cancelled)
      expect(props.onOperationComplete).not.toHaveBeenCalled();
      // Mutation should have been called only twice (first completed, second started before cancel check)
      expect(mutation).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("calls onOperationError when mutation fails", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const error = new Error("Mutation failed");
      const mutation = vi.fn().mockRejectedValue(error);

      await act(async () => {
        await result.current.setTags(["tx-1"], ["tag-a"], mutation);
      });

      expect(props.onOperationError).toHaveBeenCalledWith("setTags", error);
      expect(props.onOperationComplete).not.toHaveBeenCalled();
    });

    it("wraps non-Error objects in Error", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = vi.fn().mockRejectedValue("string error");

      await act(async () => {
        await result.current.setTags(["tx-1"], ["tag-a"], mutation);
      });

      expect(props.onOperationError).toHaveBeenCalledWith(
        "setTags",
        expect.any(Error),
      );
      expect((props.onOperationError.mock.calls[0][1] as Error).message).toBe(
        "string error",
      );
    });

    it("cleans up state after error", async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useBulkEdit(props));
      const mutation = vi.fn().mockRejectedValue(new Error("fail"));

      await act(async () => {
        await result.current.setTags(["tx-1"], ["tag-a"], mutation);
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBeNull();
    });
  });

  describe("callback stability", () => {
    it("maintains stable callback references", () => {
      const props = createDefaultProps();
      const { result, rerender } = renderHook(() => useBulkEdit(props));

      const firstSetTags = result.current.setTags;
      const firstSetDescription = result.current.setDescription;
      const firstSetAmount = result.current.setAmount;
      const firstSetStatus = result.current.setStatus;
      const firstDeleteSelected = result.current.deleteSelected;
      const firstCancel = result.current.cancel;

      rerender();

      expect(result.current.setTags).toBe(firstSetTags);
      expect(result.current.setDescription).toBe(firstSetDescription);
      expect(result.current.setAmount).toBe(firstSetAmount);
      expect(result.current.setStatus).toBe(firstSetStatus);
      expect(result.current.deleteSelected).toBe(firstDeleteSelected);
      expect(result.current.cancel).toBe(firstCancel);
    });
  });
});
