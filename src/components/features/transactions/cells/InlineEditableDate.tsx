"use client";

/**
 * Inline Editable Date
 *
 * Spreadsheet-style date cell with text input and calendar popover.
 * - When blurred: Shows abbreviated date (e.g., "15/1" or "15/1/24")
 * - When focused: Shows the same date with a two-digit year for editing
 * - Both presentations, and date entry, follow the viewer's resolved locale
 * - Supports natural language input (e.g., "tomorrow", "next tuesday")
 * - Calendar icon opens date picker popover
 */

import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
    formatDateForEditing,
    formatTransactionDate,
    parseLocaleDate
} from "@/lib/utils/date-format";

import { RESTING_CELL_CHROME } from "./cell-chrome";
import { INPUT_CELL_HIT_AREA } from "./cell-hit-area";

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
 * Format a Date to ISO format (YYYY-MM-DD)
 */
function toIsoDate(date: Date): string {
    return format(date, "yyyy-MM-dd");
}

/**
 * Parse an ISO date string to a Date object
 */
function fromIsoDate(isoDate: string): Date | undefined {
    if (!isoDate) return undefined;
    try {
        return parse(isoDate, "yyyy-MM-dd", new Date());
    } catch {
        return undefined;
    }
}

/**
 * Spreadsheet-style date cell with text input and calendar popover.
 *
 * - Shows abbreviated date when not focused
 * - Shows full internationalized date when editing
 * - Supports natural language input (e.g., "tomorrow", "next week")
 * - Calendar icon opens date picker popover
 */
export function InlineEditableDate({
    value,
    onSave,
    className,
    inputClassName,
    disabled = false,
    "data-testid": testId
}: InlineEditableDateProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Parse ISO date string to Date object
    const dateValue = fromIsoDate(value);

    // Track the month for calendar navigation
    // Uses a key-based reset: when value changes, month will be undefined initially
    // and we use dateValue as fallback. User can override by navigating calendar.
    const [monthOverride, setMonthOverride] = useState<Date | undefined>(undefined);
    const [lastValue, setLastValue] = useState(value);

    // Reset month override when value changes externally
    let month = monthOverride;
    if (value !== lastValue) {
        month = dateValue;
        // Schedule state update for next render to avoid updating during render
        queueMicrotask(() => {
            setLastValue(value);
            setMonthOverride(undefined);
        });
    } else if (!month && dateValue) {
        month = dateValue;
    }

    // Format the display date using the transaction date formatter (abbreviated)
    const displayDate = value ? formatTransactionDate(value) : "";

    // When focused, show the editing presentation: the locale's own field order
    // and separators, with a two-digit year.
    const handleFocus = useCallback(() => {
        setIsFocused(true);
        setInputValue(value ? formatDateForEditing(value) : "");
        // Select all text after state update for spreadsheet-style navigation
        queueMicrotask(() => {
            inputRef.current?.select();
        });
    }, [value]);

    // When blurred, parse input and save if valid
    const handleBlur = useCallback(() => {
        setIsFocused(false);

        // If input is empty or unchanged, don't save
        if (!inputValue.trim()) return;

        // Parse in the viewer's own locale, so whatever was displayed can be
        // typed straight back rather than being read in US field order.
        const isoDate = parseLocaleDate(inputValue);
        if (isoDate && isoDate !== value) {
            onSave(isoDate);
        }
        // Reset input value (will show abbreviated format)
        setInputValue("");
    }, [inputValue, value, onSave]);

    // Handle input changes - parse as user types to update calendar
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Try to parse and update calendar preview
        const parsedIso = parseLocaleDate(newValue);
        const parsed = parsedIso ? fromIsoDate(parsedIso) : undefined;
        if (parsed) {
            setMonthOverride(parsed);
        }
    }, []);

    // Handle keyboard events
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // Open calendar popup on Enter (like select components)
            setIsOpen(true);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsFocused(false);
            setInputValue("");
            inputRef.current?.blur();
        }
        // Arrow up/down: don't handle here, let them bubble for grid navigation
    }, []);

    // Handle calendar date selection
    const handleCalendarSelect = useCallback(
        (date: Date | undefined) => {
            if (date) {
                const isoDate = toIsoDate(date);
                onSave(isoDate);
                setInputValue("");
                setIsFocused(false);
            }
            setIsOpen(false);
        },
        [onSave]
    );

    // Handle container click to prevent row selection
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div className={cn("relative flex items-center", className)} onClick={handleContainerClick}>
            <Input
                ref={inputRef}
                type="text"
                value={isFocused ? inputValue : displayDate}
                placeholder="Pick a date"
                disabled={disabled}
                data-testid={testId}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={cn(
                    "h-7 pr-7 text-sm",
                    // UR-012: the field accepts a click anywhere in its cell. The calendar icon is
                    // positioned against this container rather than the input, so it stays exactly
                    // where it was; only the input's own box grows.
                    INPUT_CELL_HIT_AREA,
                    RESTING_CELL_CHROME,
                    "hover:bg-accent/30",
                    "focus:border-input focus:bg-background",
                    !dateValue && !isFocused && "text-muted-foreground",
                    disabled && "cursor-not-allowed opacity-50",
                    inputClassName
                )}
            />
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        className="absolute top-1/2 right-0 size-6 -translate-y-1/2"
                        tabIndex={-1}
                    >
                        <CalendarIcon className="text-muted-foreground size-3.5" />
                        <span className="sr-only">Open calendar</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                    <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        selected={dateValue}
                        month={month}
                        onMonthChange={setMonthOverride}
                        onSelect={handleCalendarSelect}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
