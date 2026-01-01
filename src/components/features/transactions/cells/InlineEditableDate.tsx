"use client";

/**
 * Inline Editable Date
 *
 * Spreadsheet-style always-editable date cell.
 * No mode switching - always shows date input, styled minimally.
 */

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface InlineEditableDateProps {
	/** Current value in ISO format (YYYY-MM-DD) */
	value: string;
	/** Callback when value is saved */
	onSave: (newValue: string) => void;
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
 * Spreadsheet-style always-editable date cell.
 *
 * - Click to focus and edit
 * - Enter to save
 * - Escape to revert
 * - Tab to save and move to next cell
 * - Blur to save
 */
export function InlineEditableDate({
	value,
	onSave,
	className,
	inputClassName,
	disabled = false,
	"data-testid": testId,
}: InlineEditableDateProps) {
	const [localValue, setLocalValue] = useState(value);
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const isRevertingRef = useRef(false);

	// Sync local value when prop changes (only if not focused)
	if (value !== localValue && !isFocused) {
		setLocalValue(value);
	}

	const handleSave = useCallback(() => {
		if (localValue !== value) {
			onSave(localValue);
		}
	}, [localValue, value, onSave]);

	const handleRevert = useCallback(() => {
		setLocalValue(value);
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

	return (
		<input
			ref={inputRef}
			type="date"
			value={localValue}
			onChange={(e) => setLocalValue(e.target.value)}
			onKeyDown={handleKeyDown}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onClick={handleClick}
			disabled={disabled}
			data-testid={testId}
			className={cn(
				"w-full bg-transparent px-1 py-0.5 text-sm text-muted-foreground",
				"border-transparent rounded",
				"hover:bg-accent/30 hover:text-foreground",
				"focus:bg-background focus:text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
				disabled && "cursor-not-allowed opacity-50",
				inputClassName,
				className
			)}
		/>
	);
}
