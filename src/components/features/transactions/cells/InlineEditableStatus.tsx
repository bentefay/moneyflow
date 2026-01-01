"use client";

/**
 * Inline Editable Status
 *
 * Spreadsheet-style always-editable status dropdown.
 * Always shows a select element, styled minimally.
 */

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface StatusOption {
	id: string;
	name: string;
	behavior?: "treatAsPaid" | null;
}

export interface InlineEditableStatusProps {
	/** Current status ID */
	value: string | undefined;
	/** Current status name for display (unused in spreadsheet mode) */
	statusName?: string;
	/** All available statuses for selection */
	availableStatuses: StatusOption[];
	/** Callback when value is saved */
	onSave: (newStatusId: string) => void;
	/** Additional class names for the container */
	className?: string;
	/** Whether editing is disabled */
	disabled?: boolean;
	/** Test ID for testing */
	"data-testid"?: string;
}

/**
 * Spreadsheet-style always-editable status dropdown.
 *
 * - Click to focus and select
 * - Change selection to save immediately
 * - Escape to revert
 * - Tab to move to next cell
 */
export function InlineEditableStatus({
	value,
	availableStatuses,
	onSave,
	className,
	disabled = false,
	"data-testid": testId,
}: InlineEditableStatusProps) {
	const [localValue, setLocalValue] = useState(value ?? "");
	const [isFocused, setIsFocused] = useState(false);
	const selectRef = useRef<HTMLSelectElement>(null);

	// Sync local value when prop changes (only if not focused)
	const valueStr = value ?? "";
	if (valueStr !== localValue && !isFocused) {
		setLocalValue(valueStr);
	}

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const newValue = e.target.value;
			setLocalValue(newValue);
			if (newValue && newValue !== value) {
				onSave(newValue);
			}
		},
		[value, onSave]
	);

	const handleRevert = useCallback(() => {
		setLocalValue(value ?? "");
	}, [value]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLSelectElement>) => {
			if (e.key === "Escape") {
				e.preventDefault();
				handleRevert();
				selectRef.current?.blur();
			}
		},
		[handleRevert]
	);

	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	const handleBlur = useCallback(() => {
		setIsFocused(false);
	}, []);

	const handleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent row selection
	}, []);

	return (
		<select
			ref={selectRef}
			value={localValue}
			onChange={handleChange}
			onKeyDown={handleKeyDown}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onClick={handleClick}
			disabled={disabled}
			data-testid={testId}
			className={cn(
				"w-full bg-transparent px-1 py-0.5 text-sm",
				"border-transparent rounded appearance-none cursor-pointer",
				"hover:bg-accent/30",
				"focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
				disabled && "cursor-not-allowed opacity-50",
				className
			)}
		>
			<option value="">Select...</option>
			{availableStatuses.map((s) => (
				<option key={s.id} value={s.id}>
					{s.name}
				</option>
			))}
		</select>
	);
}
