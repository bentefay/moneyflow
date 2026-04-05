"use client";

/**
 * Inline Editable Amount
 *
 * Spreadsheet-style always-editable amount cell.
 * Shows red for expenses (negative) and green for income (positive).
 *
 * Amounts are stored as integers in minor units (e.g., cents for USD, yen for JPY)
 * but displayed and edited in major units (e.g., dollars). Conversion happens internally
 * using the currency's decimal_digits to determine the multiplier.
 */

import { useCallback, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { getMinorUnitMultiplier, toMinorUnitsForCurrency } from "@/lib/domain/currency";
import { cn } from "@/lib/utils";

export interface InlineEditableAmountProps {
    /** Current value in minor units (e.g., cents) - integer */
    value: number;
    /** Currency code for conversion (default: USD) */
    currency?: string;
    /** Callback when value is saved (returns minor units as integer) */
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
 * Parse a currency string to number (major units).
 */
function parseCurrency(str: string): number {
    // Remove currency symbols, commas, and whitespace
    const cleaned = str.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format minor units as a display string.
 */
function formatForDisplay(minorUnits: number, currencyCode: string): string {
    const multiplier = getMinorUnitMultiplier(currencyCode);
    const majorUnits = minorUnits / multiplier;
    // Get decimal places from multiplier (100 = 2, 1000 = 3, 1 = 0)
    const decimalPlaces = Math.log10(multiplier);
    return majorUnits.toFixed(decimalPlaces);
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
    currency = "USD",
    onSave,
    className,
    inputClassName,
    disabled = false,
    "data-testid": testId,
}: InlineEditableAmountProps) {
    // Convert minor units to display string
    const displayValue = useMemo(() => formatForDisplay(value, currency), [value, currency]);

    const [localValue, setLocalValue] = useState(displayValue);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isRevertingRef = useRef(false);

    // Sync local value when prop changes (only if not focused)
    if (displayValue !== localValue && !isFocused) {
        setLocalValue(displayValue);
    }

    const handleSave = useCallback(() => {
        const parsedMajorUnits = parseCurrency(localValue);
        const newMinorUnits = toMinorUnitsForCurrency(parsedMajorUnits, currency);
        if (newMinorUnits !== value) {
            onSave(newMinorUnits);
        }
    }, [localValue, value, currency, onSave]);

    const handleRevert = useCallback(() => {
        setLocalValue(displayValue);
    }, [displayValue]);

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
        <Input
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
                "h-7 border-transparent bg-transparent text-right text-sm font-medium tabular-nums shadow-none",
                colorClass,
                "hover:bg-accent/30",
                "focus:border-input focus:bg-background",
                disabled && "cursor-not-allowed opacity-50",
                inputClassName,
                className
            )}
            placeholder="0.00"
        />
    );
}
