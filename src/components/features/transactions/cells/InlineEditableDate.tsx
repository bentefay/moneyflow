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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TransactionId } from "@/components/features/transactions/table-model";
import { useDateLocale } from "@/components/providers/date-locale-provider";
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
import { dayPickerLocalization } from "@/lib/utils/day-picker-locale";

import { RESTING_CELL_CHROME, TRANSACTION_GRID_EDITOR_INLINE_CHROME } from "./cell-chrome";
import {
    finishTransactionGridPopupEditing,
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
    type TransactionGridEditorCommitResult,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle,
    useTransactionGridEditorPortalOwnership,
    useTransactionGridEditorPortalRef
} from "./editor-lifecycle";

export interface InlineEditableDateProps {
    /** Current value in ISO format (YYYY-MM-DD) */
    value: string;
    /** Callback when value is saved */
    onSave: (newValue: string) => void;
    /** Reports actual editor focus/open state to the authoritative grid controller. */
    onEditingChange?: (editing: boolean) => void;
    /** Reports the controller-owned calendar layer independently from edit focus. */
    onPopupOpenChange?: (popup: "calendar", open: boolean) => void;
    /** Stable row owner stamped on the portaled calendar. */
    ownerRowId?: TransactionId;
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
    onEditingChange,
    onPopupOpenChange,
    ownerRowId,
    className,
    inputClassName,
    disabled = false,
    "data-testid": testId
}: InlineEditableDateProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [inputError, setInputError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const externalExitValidationResult = useRef<TransactionGridEditorCommitResult | null>(null);
    const calendarTriggerPointerDown = useRef(false);
    const calendarEscapeKeyDown = useRef(false);
    const registerEditorPortal = useTransactionGridEditorPortalRef<HTMLDivElement>();
    const isEditorPortalTargetOwned = useTransactionGridEditorPortalOwnership();

    // The viewer's chosen presentation, or undefined to follow the browser. Every format and parse
    // below takes it, so what the cell displays is always what it will accept back.
    const locale = useDateLocale();
    const calendarLocalization = useMemo(() => dayPickerLocalization(locale), [locale]);

    useEffect(() => {
        if (!isOpen) return;
        onPopupOpenChange?.("calendar", true);
        return () => onPopupOpenChange?.("calendar", false);
    }, [isOpen, onPopupOpenChange]);

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
    const displayDate = value ? formatTransactionDate(value, undefined, locale) : "";

    const commitInput = useCallback(() => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setInputError(false);
            return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
        }
        const isoDate = parseLocaleDate(trimmed, locale);
        if (isoDate == null) {
            setInputError(true);
            return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
        }
        if (isoDate === value) {
            setInputError(false);
            return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
        }
        onSave(isoDate);
        setInputError(false);
        return TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS;
    }, [inputValue, locale, onSave, value]);
    const cancelInput = useCallback(() => {
        setIsOpen(false);
        setInputError(false);
        setInputValue(value ? formatDateForEditing(value, locale) : "");
    }, [locale, value]);
    const editorLifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            beginExternalExitValidation: () => {
                externalExitValidationResult.current = null;
            },
            cancel: cancelInput,
            commit: commitInput,
            externalExitValidation: "blur",
            readExternalExitValidation: () => externalExitValidationResult.current
        }),
        [cancelInput, commitInput]
    );
    useTransactionGridEditorLifecycle(editorLifecycle);

    // When focused, show the editing presentation: the locale's own field order
    // and separators, with the year in full.
    const handleFocus = useCallback(() => {
        setIsFocused(true);
        onEditingChange?.(true);
        // An invalid blur queues focus restoration while this editor is still active. Reinitialising
        // here would erase the rejected draft before the user can correct it.
        if (isFocused) return;
        setInputValue(value ? formatDateForEditing(value, locale) : "");
        // Select all text after state update for spreadsheet-style navigation
        queueMicrotask(() => {
            inputRef.current?.select();
        });
    }, [isFocused, locale, onEditingChange, value]);

    // When blurred, parse input and save if valid
    const handleBlur = useCallback(
        (event: React.FocusEvent<HTMLInputElement>) => {
            const nextTarget = event.relatedTarget;
            const fallbackPortal =
                isEditorPortalTargetOwned == null && nextTarget instanceof Element
                    ? nextTarget.closest<HTMLElement>("[data-owned-by-row][data-owned-by-field]")
                    : null;
            const portalTargetOwned =
                isEditorPortalTargetOwned?.(nextTarget) ??
                (fallbackPortal?.dataset.ownedByRow === ownerRowId &&
                    fallbackPortal?.dataset.ownedByField === "date");
            if (
                calendarTriggerPointerDown.current ||
                (nextTarget instanceof Node && containerRef.current?.contains(nextTarget)) ||
                portalTargetOwned
            ) {
                calendarTriggerPointerDown.current = false;
                return;
            }
            const committed = commitInput();
            externalExitValidationResult.current = committed;
            if (!committed.ok) {
                queueMicrotask(() => inputRef.current?.focus({ preventScroll: true }));
                return;
            }
            setIsFocused(false);
            // Reset input value (will show abbreviated format)
            setInputValue("");
            onEditingChange?.(false);
        },
        [commitInput, isEditorPortalTargetOwned, onEditingChange, ownerRowId]
    );

    // Handle input changes - parse as user types to update calendar
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            if (inputError) setInputError(false);

            // Try to parse and update calendar preview
            const parsedIso = parseLocaleDate(newValue, locale);
            const parsed = parsedIso ? fromIsoDate(parsedIso) : undefined;
            if (parsed) {
                setMonthOverride(parsed);
            }
        },
        [inputError, locale]
    );

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

    const handleCalendarOpenChange = useCallback((nextOpen: boolean) => {
        if (!nextOpen) calendarTriggerPointerDown.current = false;
        setIsOpen(nextOpen);
    }, []);

    // Handle calendar date selection
    const handleCalendarSelect = useCallback(
        (date: Date | undefined) => {
            if (date) {
                const isoDate = toIsoDate(date);
                onSave(isoDate);
                setInputValue("");
                setInputError(false);
                setIsFocused(false);
            }
            setIsOpen(false);
            finishTransactionGridPopupEditing("calendar", onPopupOpenChange, onEditingChange);
        },
        [onEditingChange, onPopupOpenChange, onSave]
    );

    // Handle container click to prevent row selection
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn("relative flex items-center", className)}
            onClick={handleContainerClick}
        >
            <Input
                ref={inputRef}
                type="text"
                value={isFocused ? inputValue : displayDate}
                placeholder="Pick a date"
                disabled={disabled}
                data-testid={testId}
                aria-invalid={inputError ? "true" : undefined}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={cn(
                    "h-7 w-full min-w-0 text-[13px] tabular-nums",
                    RESTING_CELL_CHROME,
                    TRANSACTION_GRID_EDITOR_INLINE_CHROME,
                    "pr-6",
                    !dateValue && !isFocused && "text-muted-foreground",
                    disabled && "cursor-not-allowed opacity-50",
                    inputClassName
                )}
            />
            <Popover open={isOpen} onOpenChange={handleCalendarOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        data-grid-open-interaction="calendar"
                        onPointerDown={() => {
                            calendarTriggerPointerDown.current = true;
                        }}
                        className={cn(
                            "absolute top-1/2 right-0 size-6 -translate-y-1/2",
                            RESTING_CELL_CHROME
                        )}
                        tabIndex={-1}
                    >
                        <CalendarIcon className="text-muted-foreground size-3.5" />
                        <span className="sr-only">Open calendar</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    ref={registerEditorPortal}
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    onEscapeKeyDown={(event) => {
                        calendarEscapeKeyDown.current = true;
                        event.stopPropagation();
                    }}
                    onCloseAutoFocus={(event) => {
                        calendarTriggerPointerDown.current = false;
                        calendarEscapeKeyDown.current = false;
                        if (!isFocused) return;
                        event.preventDefault();
                        inputRef.current?.focus({ preventScroll: true });
                    }}
                    data-owned-by-row={ownerRowId}
                    data-owned-by-field="date"
                >
                    <Calendar
                        mode="single"
                        required
                        captionLayout="dropdown"
                        selected={dateValue}
                        month={month}
                        onMonthChange={setMonthOverride}
                        onSelect={handleCalendarSelect}
                        // Without these the calendar is en-US whatever the rest of the cell says:
                        // react-day-picker's own default locale is `enUS`, so the week would start
                        // on Sunday for a viewer whose every other date reads day-first.
                        weekStartsOn={calendarLocalization.weekStartsOn}
                        formatters={calendarLocalization.formatters}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
