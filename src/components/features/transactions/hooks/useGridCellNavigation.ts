/**
 * Grid Cell Navigation Hook
 *
 * Provides arrow key navigation for grid cells at the table level.
 * Listens to bubbling keydown events and navigates between cells.
 *
 * Vertical navigation (Up/Down):
 * - Special handling for description rows:
 *   - Down from merchant: if description row exists, focus description first
 *   - Down from description: focus next row's merchant
 *   - Up from merchant: if previous row has description, focus it; else focus previous merchant
 *   - Up from description: focus same row's merchant
 * - For textareas: only navigate away when cursor is on first/last line.
 *
 * Horizontal navigation (Left/Right):
 * - For text inputs: only navigate when cursor is at start (left) or end (right)
 * - For other elements: always navigate
 *
 * Usage:
 * ```tsx
 * const { handleGridKeyDown } = useGridCellNavigation();
 *
 * return (
 *   <div role="grid" onKeyDown={handleGridKeyDown}>
 *     ...rows with [data-cell="columnName"] attributes...
 *   </div>
 * );
 * ```
 */

import { useCallback } from "react";

export interface UseGridCellNavigationOptions {
	/** Optional callback when navigation occurs */
	onNavigate?: (direction: "up" | "down" | "left" | "right") => void;
}

export interface UseGridCellNavigationReturn {
	/**
	 * Key down handler for the grid container.
	 * Handles arrow keys to navigate between cells.
	 */
	handleGridKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Focus the first focusable element within a cell.
 * For text inputs, also selects all text for spreadsheet-style behavior.
 */
function focusCellElement(cell: Element): boolean {
	const focusable =
		cell.querySelector<HTMLElement>(
			'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
		) || (cell as HTMLElement);

	if (focusable && typeof focusable.focus === "function") {
		focusable.focus();
		// Select all text in text inputs for spreadsheet-style navigation
		if (focusable instanceof HTMLInputElement || focusable instanceof HTMLTextAreaElement) {
			focusable.select();
		}
		return true;
	}
	return false;
}

/**
 * Check if cursor is on the first line of a textarea.
 */
function isOnFirstLine(textarea: HTMLTextAreaElement): boolean {
	const { selectionStart, value } = textarea;
	const textBeforeCursor = value.substring(0, selectionStart);
	return !textBeforeCursor.includes("\n");
}

/**
 * Check if cursor is on the last line of a textarea.
 */
function isOnLastLine(textarea: HTMLTextAreaElement): boolean {
	const { selectionStart, value } = textarea;
	const textAfterCursor = value.substring(selectionStart);
	return !textAfterCursor.includes("\n");
}

/**
 * Check if cursor/selection is at the start of a text input.
 * Returns true if selectionStart is 0 (cursor at start or selection includes start).
 */
function isCursorAtStart(element: HTMLInputElement | HTMLTextAreaElement): boolean {
	return element.selectionStart === 0;
}

/**
 * Check if cursor/selection is at the end of a text input.
 * Returns true if selectionEnd is at the end (cursor at end or selection includes end).
 */
function isCursorAtEnd(element: HTMLInputElement | HTMLTextAreaElement): boolean {
	return element.selectionEnd === element.value.length;
}

/**
 * Get transaction rows grouped by their transaction container.
 * Each transaction can have a main row and optionally a description row.
 * Returns: Array of { mainRow, descriptionRow? } ordered by position.
 */
function getTransactionRowGroups(grid: Element): Array<{
	mainRow: Element;
	descriptionRow?: Element;
}> {
	const allRows = Array.from(grid.querySelectorAll('[role="row"]'));
	const groups: Array<{ mainRow: Element; descriptionRow?: Element }> = [];

	for (let i = 0; i < allRows.length; i++) {
		const row = allRows[i];
		const hasDescription = row.querySelector('[data-cell="description"]');

		if (hasDescription) {
			// This is a description row - should be attached to previous group
			if (groups.length > 0) {
				groups[groups.length - 1].descriptionRow = row;
			}
		} else {
			// This is a main row
			groups.push({ mainRow: row });
		}
	}

	return groups;
}

/**
 * Get all cells in a row, ordered left to right.
 */
function getCellsInRow(row: Element): Element[] {
	return Array.from(row.querySelectorAll("[data-cell]"));
}

/**
 * Hook for grid-like arrow key navigation between cells.
 */
export function useGridCellNavigation(
	options: UseGridCellNavigationOptions = {}
): UseGridCellNavigationReturn {
	const { onNavigate } = options;

	const handleGridKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			const isVertical = event.key === "ArrowUp" || event.key === "ArrowDown";
			const isHorizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";

			if (!isVertical && !isHorizontal) {
				return;
			}

			const focusedElement = event.target as HTMLElement;
			if (!focusedElement) return;

			const isTextInput =
				focusedElement.tagName === "INPUT" || focusedElement.tagName === "TEXTAREA";

			// For text inputs, check cursor position before navigating
			if (isTextInput) {
				const textElement = focusedElement as HTMLInputElement | HTMLTextAreaElement;

				if (isVertical) {
					// For textareas, only navigate when on first/last line
					if (focusedElement.tagName === "TEXTAREA") {
						const textarea = focusedElement as HTMLTextAreaElement;
						if (event.key === "ArrowUp" && !isOnFirstLine(textarea)) return;
						if (event.key === "ArrowDown" && !isOnLastLine(textarea)) return;
					}
				}

				if (isHorizontal) {
					// Only navigate when cursor is at start (left) or end (right)
					if (event.key === "ArrowLeft" && !isCursorAtStart(textElement)) return;
					if (event.key === "ArrowRight" && !isCursorAtEnd(textElement)) return;
				}
			}

			const cellContainer = focusedElement.closest("[data-cell]") as HTMLElement;
			if (!cellContainer) return;

			const cellName = cellContainer.getAttribute("data-cell");
			if (!cellName) return;

			const currentRow = cellContainer.closest('[role="row"]');
			if (!currentRow) return;

			const grid = currentRow.closest('[role="grid"]');
			if (!grid) return;

			// Handle horizontal navigation
			if (isHorizontal) {
				const cells = getCellsInRow(currentRow);
				const currentIndex = cells.indexOf(cellContainer);

				if (currentIndex === -1) return;

				const direction = event.key === "ArrowLeft" ? -1 : 1;
				const targetIndex = currentIndex + direction;

				if (targetIndex < 0 || targetIndex >= cells.length) return;

				const targetCell = cells[targetIndex];
				if (targetCell && focusCellElement(targetCell)) {
					event.preventDefault();
					onNavigate?.(event.key === "ArrowLeft" ? "left" : "right");
				}
				return;
			}

			// Handle vertical navigation
			const groups = getTransactionRowGroups(grid);
			const isGoingDown = event.key === "ArrowDown";
			const isGoingUp = event.key === "ArrowUp";

			// Find which group and whether we're in main or description row
			let currentGroupIndex = -1;
			let isInDescription = false;

			for (let i = 0; i < groups.length; i++) {
				if (groups[i].mainRow === currentRow) {
					currentGroupIndex = i;
					isInDescription = false;
					break;
				}
				if (groups[i].descriptionRow === currentRow) {
					currentGroupIndex = i;
					isInDescription = true;
					break;
				}
			}

			if (currentGroupIndex === -1) return;

			const currentGroup = groups[currentGroupIndex];

			// Navigation logic
			if (isInDescription) {
				// We're in a description row
				if (isGoingUp) {
					// Up from description → same row's merchant
					const merchantCell = currentGroup.mainRow.querySelector('[data-cell="merchant"]');
					if (merchantCell && focusCellElement(merchantCell)) {
						event.preventDefault();
						onNavigate?.("up");
					}
				} else {
					// Down from description → next row's merchant
					const nextGroup = groups[currentGroupIndex + 1];
					if (nextGroup) {
						const merchantCell = nextGroup.mainRow.querySelector('[data-cell="merchant"]');
						if (merchantCell && focusCellElement(merchantCell)) {
							event.preventDefault();
							onNavigate?.("down");
						}
					}
				}
			} else {
				// We're in a main row
				if (cellName === "merchant") {
					// Special handling for merchant column
					if (isGoingDown && currentGroup.descriptionRow) {
						// Down from merchant with description → focus description
						const descCell = currentGroup.descriptionRow.querySelector('[data-cell="description"]');
						if (descCell && focusCellElement(descCell)) {
							event.preventDefault();
							onNavigate?.("down");
							return;
						}
					}

					if (isGoingUp) {
						// Up from merchant → check if previous row has description
						const prevGroup = groups[currentGroupIndex - 1];
						if (prevGroup?.descriptionRow) {
							const descCell = prevGroup.descriptionRow.querySelector('[data-cell="description"]');
							if (descCell && focusCellElement(descCell)) {
								event.preventDefault();
								onNavigate?.("up");
								return;
							}
						}
					}
				}

				// Default: navigate to same cell in adjacent row
				const targetGroupIndex = currentGroupIndex + (isGoingDown ? 1 : -1);
				if (targetGroupIndex < 0 || targetGroupIndex >= groups.length) return;

				const targetGroup = groups[targetGroupIndex];
				const targetCell = targetGroup.mainRow.querySelector(`[data-cell="${cellName}"]`);

				if (targetCell && focusCellElement(targetCell)) {
					event.preventDefault();
					onNavigate?.(isGoingDown ? "down" : "up");
				}
			}
		},
		[onNavigate]
	);

	return { handleGridKeyDown };
}
