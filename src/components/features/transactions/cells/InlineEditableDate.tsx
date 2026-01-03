"use client";

/**
 * Inline Editable Date
 *
 * Spreadsheet-style date cell with text input and calendar popover.
 * - When blurred: Shows abbreviated date (e.g., "15/1" or "15/1/24")
 * - When focused: Shows full internationalized date for editing
 * - Supports natural language input via chrono-node (e.g., "tomorrow", "next tuesday")
 * - Calendar icon opens date picker popover
 */

import { parseDate } from "chrono-node";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatTransactionDate } from "@/lib/utils/date-format";

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
 * Format a Date to full internationalized display for editing.
 * Uses the browser's locale for date formatting with numeric format (e.g., 01/01/2026).
 */
function formatDateFull(date: Date | undefined, locale?: string): string {
	if (!date) return "";
	return date.toLocaleDateString(locale ?? navigator.language, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
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
	"data-testid": testId,
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

	// When focused, show full internationalized date for editing
	const handleFocus = useCallback(() => {
		setIsFocused(true);
		// Set input to full date format for editing
		setInputValue(formatDateFull(dateValue));
		// Select all text after state update for spreadsheet-style navigation
		queueMicrotask(() => {
			inputRef.current?.select();
		});
	}, [dateValue]);

	// When blurred, parse input and save if valid
	const handleBlur = useCallback(() => {
		setIsFocused(false);

		// If input is empty or unchanged, don't save
		if (!inputValue.trim()) return;

		// Try to parse with chrono-node (handles natural language)
		const parsed = parseDate(inputValue);
		if (parsed) {
			const isoDate = toIsoDate(parsed);
			if (isoDate !== value) {
				onSave(isoDate);
			}
		}
		// Reset input value (will show abbreviated format)
		setInputValue("");
	}, [inputValue, value, onSave]);

	// Handle input changes - parse as user types to update calendar
	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setInputValue(newValue);

		// Try to parse and update calendar preview
		const parsed = parseDate(newValue);
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
					"h-7 border-transparent bg-transparent pr-7 text-sm shadow-none",
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
						className="absolute right-0 top-1/2 size-6 -translate-y-1/2"
						tabIndex={-1}
					>
						<CalendarIcon className="size-3.5 text-muted-foreground" />
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
