"use client";

/**
 * Inline Editable Amount
 *
 * Spreadsheet-style always-editable amount cell.
 * Shows red for expenses (negative) and green for income (positive).
 */

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface InlineEditableAmountProps {
	/** Current value (in major units, e.g., dollars) */
	value: number;
	/** Currency code (default: USD) */
	currency?: string;
	/** Callback when value is saved */
	onSave: (newValue: number) => void;
	/** Additional class names for the container */
	className?: string;
	/** Additional class names for the input */
	inputClassName?: string;
	/** Whether editing is disabled */
	disabled?: boolean;
	/** Test ID for testing */
	"data-testid"?: string;
}

/**
 * Parse a currency string to number.
 */
function parseCurrency(str: string): number {
	// Remove currency symbols, commas, and whitespace
	const cleaned = str.replace(/[^0-9.-]/g, "");
	const parsed = parseFloat(cleaned);
	return isNaN(parsed) ? 0 : parsed;
}

/**
 * Spreadsheet-style always-editable amount cell.
 *
 * - Click to focus and edit
 * - Enter to save
 * - Escape to revert
 * - Tab to save and move to next cell
 * - Blur to save
 */
export function InlineEditableAmount({
	value,
	onSave,
	className,
	inputClassName,
	disabled = false,
	"data-testid": testId,
}: InlineEditableAmountProps) {
	const [localValue, setLocalValue] = useState(value.toFixed(2));
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const isRevertingRef = useRef(false);

	// Sync local value when prop changes (only if not focused)
	const valueStr = value.toFixed(2);
	if (valueStr !== localValue && !isFocused) {
		setLocalValue(valueStr);
	}

	const handleSave = useCallback(() => {
		const parsed = parseCurrency(localValue);
		if (parsed !== value) {
			onSave(parsed);
		}
	}, [localValue, value, onSave]);

	const handleRevert = useCallback(() => {
		setLocalValue(value.toFixed(2));
	}, [value]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleSave();
			} else if (e.key === "Escape") {
				e.preventDefault();
				isRevertingRef.current = true;
				handleRevert();
				inputRef.current?.blur();
			}
		},
		[handleSave, handleRevert]
	);

	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	const handleBlur = useCallback(() => {
		setIsFocused(false);
		// Don't save on blur if we're reverting (Escape was pressed)
		if (isRevertingRef.current) {
			isRevertingRef.current = false;
			return;
		}
		handleSave();
	}, [handleSave]);

	const handleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent row selection
	}, []);

	// Determine color based on current input value
	const parsed = parseCurrency(localValue);
	const colorClass =
		parsed < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";

	return (
		<input
			ref={inputRef}
			type="text"
			inputMode="decimal"
			value={localValue}
			onChange={(e) => setLocalValue(e.target.value)}
			onKeyDown={handleKeyDown}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onClick={handleClick}
			disabled={disabled}
			data-testid={testId}
			className={cn(
				"w-full bg-transparent px-1 py-0.5 text-right text-sm font-medium tabular-nums",
				"border-transparent rounded",
				colorClass,
				"hover:bg-accent/30",
				"focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
				disabled && "cursor-not-allowed opacity-50",
				inputClassName,
				className
			)}
			placeholder="0.00"
		/>
	);
}
