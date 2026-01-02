"use client";

/**
 * Inline Editable Text
 *
 * Spreadsheet-style always-editable text cell.
 * No mode switching - always shows input, styled minimally.
 */

import { useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface InlineEditableTextProps {
	/** Current value */
	value: string;
	/** Callback when value is saved */
	onSave: (newValue: string) => void;
	/** Additional class names for the container */
	className?: string;
	/** Additional class names for the input */
	inputClassName?: string;
	/** Placeholder when empty */
	placeholder?: string;
	/** Whether editing is disabled */
	disabled?: boolean;
	/** Test ID for testing */
	"data-testid"?: string;
}

/**
 * Spreadsheet-style always-editable text cell.
 *
 * - Click to focus and edit
 * - Enter to save (stays focused)
 * - Escape to revert
 * - Tab to save and move to next cell
 * - Blur to save
 */
export function InlineEditableText({
	value,
	onSave,
	className,
	inputClassName,
	placeholder = "",
	disabled = false,
	"data-testid": testId,
}: InlineEditableTextProps) {
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
			// Tab is handled by browser focus management + onBlur
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
		<Input
			ref={inputRef}
			type="text"
			value={localValue}
			onChange={(e) => setLocalValue(e.target.value)}
			onKeyDown={handleKeyDown}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onClick={handleClick}
			disabled={disabled}
			data-testid={testId}
			className={cn(
				"h-7 border-transparent bg-transparent text-sm shadow-none",
				"hover:bg-accent/30",
				"focus:border-input focus:bg-background",
				disabled && "cursor-not-allowed opacity-50",
				inputClassName,
				className
			)}
			placeholder={placeholder}
		/>
	);
}
