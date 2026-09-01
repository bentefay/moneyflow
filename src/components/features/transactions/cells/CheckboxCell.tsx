"use client";

import { useCallback } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { INNER_CELL_FOCUS_CHROME, PARKED_ACTION_FOCUS_CHROME } from "./cell-chrome";
import { CHECKBOX_HIT_AREA, type CheckboxRowGeometry } from "./cell-hit-area";

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
    /** Show an inset keyboard outline when the outer data gridcell is parked. */
    showFocusIndicator?: boolean;
    /** Accessible label for the checkbox */
    ariaLabel: string;
    /**
     * Which row this checkbox is mounted in (UR-012).
     *
     * Required, and deliberately has no default. The header owns a full-cell select-all target while
     * a transaction row owns only the centred control target, leaving its gridcell background to cell
     * selection. A default would let a third mount inherit the wrong interaction geometry silently.
     */
    rowGeometry: CheckboxRowGeometry;
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
    showFocusIndicator = false,
    ariaLabel,
    rowGeometry,
    className
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
            className={cn("relative flex h-full w-full items-center justify-center", className)}
            role="presentation"
        >
            <Checkbox
                checked={indeterminate ? "indeterminate" : checked}
                onClick={handleClick}
                disabled={disabled}
                aria-label={ariaLabel}
                className={cn(
                    disabled && "opacity-50",
                    rowGeometry === "dataRow" &&
                        (showFocusIndicator ? PARKED_ACTION_FOCUS_CHROME : INNER_CELL_FOCUS_CHROME),
                    // The box keeps its drawn 16px size while the required mount geometry
                    // supplies either the row's centred control target or the header's full-cell target.
                    CHECKBOX_HIT_AREA[rowGeometry]
                )}
            />
        </div>
    );
}
