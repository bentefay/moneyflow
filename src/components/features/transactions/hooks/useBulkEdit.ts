import { useCallback, useRef, useState } from "react";

export interface BulkEditProgress {
	current: number;
	total: number;
	operation: string;
}

export interface UseBulkEditOptions {
	/** Maximum selections before showing warning toast */
	warnThreshold?: number;
	/** Callback when warning threshold exceeded */
	onWarnThreshold?: (count: number) => void;
	/** Callback when bulk operation starts */
	onOperationStart?: (operation: string, count: number) => void;
	/** Callback when bulk operation completes */
	onOperationComplete?: (operation: string, count: number) => void;
	/** Callback when bulk operation fails */
	onOperationError?: (operation: string, error: Error) => void;
}

export interface UseBulkEditReturn {
	/** Whether a bulk operation is in progress */
	isProcessing: boolean;
	/** Current progress of the bulk operation */
	progress: BulkEditProgress | null;
	/** Set tags on selected transactions (replaces existing tags) */
	setTags: (
		selectedIds: string[],
		tagIds: string[],
		applyMutation: (id: string, tagIds: string[]) => Promise<void>
	) => Promise<void>;
	/** Set notes on selected transactions */
	setNotes: (
		selectedIds: string[],
		notes: string,
		applyMutation: (id: string, notes: string) => Promise<void>
	) => Promise<void>;
	/** Set amount on selected transactions */
	setAmount: (
		selectedIds: string[],
		amount: number,
		applyMutation: (id: string, amount: number) => Promise<void>
	) => Promise<void>;
	/** Set status on selected transactions */
	setStatus: (
		selectedIds: string[],
		statusId: string,
		applyMutation: (id: string, statusId: string) => Promise<void>
	) => Promise<void>;
	/** Delete selected transactions */
	deleteSelected: (
		selectedIds: string[],
		applyDelete: (id: string) => Promise<void>
	) => Promise<void>;
	/** Cancel the current bulk operation */
	cancel: () => void;
}

/**
 * Hook for performing bulk edit operations on selected transactions.
 *
 * All bulk operations:
 * 1. Check if count exceeds warn threshold (default 500)
 * 2. Show progress indicator during operation
 * 3. Process mutations sequentially to avoid overwhelming CRDT
 * 4. Can be cancelled mid-operation
 *
 * Note: Tags are REPLACED, not merged. This is intentional per spec.
 */
export function useBulkEdit({
	warnThreshold = 500,
	onWarnThreshold,
	onOperationStart,
	onOperationComplete,
	onOperationError,
}: UseBulkEditOptions = {}): UseBulkEditReturn {
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState<BulkEditProgress | null>(null);
	const cancelledRef = useRef(false);

	// Check threshold and warn if exceeded
	const checkThreshold = useCallback(
		(count: number): boolean => {
			if (count > warnThreshold) {
				onWarnThreshold?.(count);
				return true;
			}
			return false;
		},
		[warnThreshold, onWarnThreshold]
	);

	// Generic bulk operation executor
	const executeBulk = useCallback(
		async <T>(
			selectedIds: string[],
			operation: string,
			value: T,
			applyMutation: (id: string, value: T) => Promise<void>
		): Promise<void> => {
			if (selectedIds.length === 0) return;

			checkThreshold(selectedIds.length);
			cancelledRef.current = false;

			setIsProcessing(true);
			setProgress({
				current: 0,
				total: selectedIds.length,
				operation,
			});

			onOperationStart?.(operation, selectedIds.length);

			try {
				for (let i = 0; i < selectedIds.length; i++) {
					if (cancelledRef.current) {
						break;
					}

					const id = selectedIds[i];
					await applyMutation(id, value);

					setProgress({
						current: i + 1,
						total: selectedIds.length,
						operation,
					});
				}

				if (!cancelledRef.current) {
					onOperationComplete?.(operation, selectedIds.length);
				}
			} catch (error) {
				onOperationError?.(operation, error instanceof Error ? error : new Error(String(error)));
			} finally {
				setIsProcessing(false);
				setProgress(null);
			}
		},
		[checkThreshold, onOperationStart, onOperationComplete, onOperationError]
	);

	const setTags = useCallback(
		async (
			selectedIds: string[],
			tagIds: string[],
			applyMutation: (id: string, tagIds: string[]) => Promise<void>
		): Promise<void> => {
			await executeBulk(selectedIds, "setTags", tagIds, applyMutation);
		},
		[executeBulk]
	);

	const setNotes = useCallback(
		async (
			selectedIds: string[],
			notes: string,
			applyMutation: (id: string, notes: string) => Promise<void>
		): Promise<void> => {
			await executeBulk(selectedIds, "setNotes", notes, applyMutation);
		},
		[executeBulk]
	);

	const setAmount = useCallback(
		async (
			selectedIds: string[],
			amount: number,
			applyMutation: (id: string, amount: number) => Promise<void>
		): Promise<void> => {
			await executeBulk(selectedIds, "setAmount", amount, applyMutation);
		},
		[executeBulk]
	);

	const setStatus = useCallback(
		async (
			selectedIds: string[],
			statusId: string,
			applyMutation: (id: string, statusId: string) => Promise<void>
		): Promise<void> => {
			await executeBulk(selectedIds, "setStatus", statusId, applyMutation);
		},
		[executeBulk]
	);

	const deleteSelected = useCallback(
		async (selectedIds: string[], applyDelete: (id: string) => Promise<void>): Promise<void> => {
			if (selectedIds.length === 0) return;

			checkThreshold(selectedIds.length);
			cancelledRef.current = false;

			setIsProcessing(true);
			setProgress({
				current: 0,
				total: selectedIds.length,
				operation: "delete",
			});

			onOperationStart?.("delete", selectedIds.length);

			try {
				for (let i = 0; i < selectedIds.length; i++) {
					if (cancelledRef.current) {
						break;
					}

					await applyDelete(selectedIds[i]);

					setProgress({
						current: i + 1,
						total: selectedIds.length,
						operation: "delete",
					});
				}

				if (!cancelledRef.current) {
					onOperationComplete?.("delete", selectedIds.length);
				}
			} catch (error) {
				onOperationError?.("delete", error instanceof Error ? error : new Error(String(error)));
			} finally {
				setIsProcessing(false);
				setProgress(null);
			}
		},
		[checkThreshold, onOperationStart, onOperationComplete, onOperationError]
	);

	const cancel = useCallback(() => {
		cancelledRef.current = true;
	}, []);

	return {
		isProcessing,
		progress,
		setTags,
		setNotes,
		setAmount,
		setStatus,
		deleteSelected,
		cancel,
	};
}
