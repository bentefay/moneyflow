import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface CheckboxCellProps {
	/** Whether the checkbox is checked */
	checked: boolean;
	/** Callback when checkbox state changes */
	onChange: (checked: boolean) => void;
	/** Whether shift key was pressed (for range selection) */
	onShiftClick?: (event: React.MouseEvent) => void;
	/** Whether the checkbox is disabled */
	disabled?: boolean;
	/** Whether this is a "select all" checkbox (shows indeterminate state) */
	indeterminate?: boolean;
	/** Accessible label for the checkbox */
	ariaLabel: string;
	/** Additional class names */
	className?: string;
}

/**
 * Checkbox cell for transaction selection.
 *
 * Supports:
 * - Standard click to toggle
 * - Shift+click for range selection (via onShiftClick callback)
 * - Indeterminate state for "select all" header
 * - Keyboard accessibility (Space to toggle)
 */
export function CheckboxCell({
	checked,
	onChange,
	onShiftClick,
	disabled = false,
	indeterminate = false,
	ariaLabel,
	className,
}: CheckboxCellProps) {
	// Handle click - either shift+click for range or normal toggle
	const handleClick = useCallback(
		(event: React.MouseEvent) => {
			if (disabled) return;

			if (event.shiftKey && onShiftClick) {
				// Prevent default toggle for shift+click - let parent handle range selection
				event.preventDefault();
				event.stopPropagation();
				onShiftClick(event);
				return;
			}

			// Normal click - toggle the checkbox
			// We handle this manually because Radix onCheckedChange fires AFTER onClick
			// and we need consistent behavior
			event.preventDefault();
			onChange(!checked);
		},
		[checked, disabled, onChange, onShiftClick]
	);

	return (
		<div
			className={cn("flex items-center justify-center w-full h-full", className)}
			role="gridcell"
		>
			<Checkbox
				checked={indeterminate ? "indeterminate" : checked}
				onClick={handleClick}
				disabled={disabled}
				aria-label={ariaLabel}
				className={cn(disabled && "opacity-50")}
			/>
		</div>
	);
}
