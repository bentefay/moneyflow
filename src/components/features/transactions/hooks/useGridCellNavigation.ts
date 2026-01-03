/**
 * Grid Cell Navigation Hook
 *
 * Provides arrow key navigation for grid cells at the table level.
 * Listens to bubbling keydown events and navigates between cells.
 *
 * Vertical navigation (Up/Down):
 * - Special handling for notes rows:
 *   - Down from description: if notes row exists, focus notes first
 *   - Down from notes: focus next row's description
 *   - Up from description: if previous row has notes, focus it; else focus previous description
 *   - Up from notes: focus same row's description
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
 * Each transaction can have a main row and optionally a notes row.
 * Returns: Array of { mainRow, notesRow? } ordered by position.
 */
function getTransactionRowGroups(grid: Element): Array<{
	mainRow: Element;
	notesRow?: Element;
}> {
	const allRows = Array.from(grid.querySelectorAll('[role="row"]'));
	const groups: Array<{ mainRow: Element; notesRow?: Element }> = [];

	for (let i = 0; i < allRows.length; i++) {
		const row = allRows[i];
		const hasNotes = row.querySelector('[data-cell="notes"]');

		if (hasNotes) {
			// This is a notes row - should be attached to previous group
			if (groups.length > 0) {
				groups[groups.length - 1].notesRow = row;
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

			// Find which group and whether we're in main or notes row
			let currentGroupIndex = -1;
			let isInNotes = false;

			for (let i = 0; i < groups.length; i++) {
				if (groups[i].mainRow === currentRow) {
					currentGroupIndex = i;
					isInNotes = false;
					break;
				}
				if (groups[i].notesRow === currentRow) {
					currentGroupIndex = i;
					isInNotes = true;
					break;
				}
			}

			if (currentGroupIndex === -1) return;

			const currentGroup = groups[currentGroupIndex];

			// Navigation logic
			if (isInNotes) {
				// We're in a notes row
				if (isGoingUp) {
					// Up from notes → same row's description
					const descriptionCell = currentGroup.mainRow.querySelector('[data-cell="description"]');
					if (descriptionCell && focusCellElement(descriptionCell)) {
						event.preventDefault();
						onNavigate?.("up");
					}
				} else {
					// Down from notes → next row's description
					const nextGroup = groups[currentGroupIndex + 1];
					if (nextGroup) {
						const descriptionCell = nextGroup.mainRow.querySelector('[data-cell="description"]');
						if (descriptionCell && focusCellElement(descriptionCell)) {
							event.preventDefault();
							onNavigate?.("down");
						}
					}
				}
			} else {
				// We're in a main row
				if (cellName === "description") {
					// Special handling for description column
					if (isGoingDown && currentGroup.notesRow) {
						// Down from description with notes → focus notes
						const notesCell = currentGroup.notesRow.querySelector('[data-cell="notes"]');
						if (notesCell && focusCellElement(notesCell)) {
							event.preventDefault();
							onNavigate?.("down");
							return;
						}
					}

					if (isGoingUp) {
						// Up from description → check if previous row has notes
						const prevGroup = groups[currentGroupIndex - 1];
						if (prevGroup?.notesRow) {
							const notesCell = prevGroup.notesRow.querySelector('[data-cell="notes"]');
							if (notesCell && focusCellElement(notesCell)) {
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
