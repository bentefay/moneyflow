"use client";

import { useCallback } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
    /** Accessible label for the checkbox */
    ariaLabel: string;
    /**
     * Which row this checkbox is mounted in (UR-012).
     *
     * Required, and deliberately has no default. The full-cell activation area is a negative inset,
     * so a reach larger than the row it sits in lands on the NEXT row: the header's overlay, sized
     * for a 57px data row, covered the first 8px of the first transaction's checkbox cell and made
     * clicking one row's checkbox select the whole table. A default would let a third mount inherit
     * whichever geometry happened to be written first and reintroduce that silently.
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
                    // UR-012: the box keeps its drawn 16px size while a click anywhere in the cell
                    // toggles it. The reach comes from the caller because this component mounts in
                    // two row heights, and an overlay sized for the taller one reaches out of the
                    // shorter one into the row below.
                    CHECKBOX_HIT_AREA[rowGeometry]
                )}
            />
        </div>
    );
}
