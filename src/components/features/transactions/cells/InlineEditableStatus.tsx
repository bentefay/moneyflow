"use client";

/**
 * Inline Editable Status
 *
 * Spreadsheet-style always-editable status dropdown.
 * Uses shadcn Select for consistent styling.
 */

import { useCallback, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
 * - Click to open dropdown
 * - Change selection to save immediately
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
	const [open, setOpen] = useState(false);

	const handleValueChange = useCallback(
		(newValue: string) => {
			if (newValue && newValue !== value) {
				onSave(newValue);
			}
		},
		[value, onSave]
	);

	const handleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent row selection
	}, []);

	// Prevent arrow keys from opening the dropdown when closed,
	// but let the event bubble for grid navigation
	const handleTriggerKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!open && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
				// Prevent Radix from opening the dropdown
				e.preventDefault();
				// Don't stopPropagation - let it bubble for grid navigation
			}
		},
		[open]
	);

	return (
		<div onClick={handleClick} className={cn("w-full", className)}>
			<Select
				value={value ?? ""}
				onValueChange={handleValueChange}
				disabled={disabled}
				open={open}
				onOpenChange={setOpen}
			>
				<SelectTrigger
					data-testid={testId}
					size="sm"
					onKeyDown={handleTriggerKeyDown}
					className={cn(
						"h-7 w-full border-transparent bg-transparent px-1 shadow-none",
						"hover:bg-accent/30",
						"focus:border-input focus:bg-background",
						disabled && "cursor-not-allowed opacity-50"
					)}
				>
					<SelectValue placeholder="Select..." />
				</SelectTrigger>
				<SelectContent align="start">
					{availableStatuses.map((s) => (
						<SelectItem key={s.id} value={s.id}>
							{s.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
