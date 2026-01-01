"use client";

/**
 * Inline Editable Date
 *
 * Spreadsheet-style date cell with calendar popover.
 * Click to open calendar, select date to save.
 */

import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
 * Spreadsheet-style date cell with calendar popover.
 *
 * - Click to open calendar popover
 * - Select date to save and close
 * - Click outside to close without saving
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

	// Parse ISO date string to Date object
	const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

	const handleSelect = useCallback(
		(date: Date | undefined) => {
			if (date) {
				const isoDate = format(date, "yyyy-MM-dd");
				onSave(isoDate);
			}
			setIsOpen(false);
		},
		[onSave]
	);

	const handleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent row selection
	}, []);

	// Format the display date
	const displayDate = dateValue ? format(dateValue, "MMM d, yyyy") : "Pick a date";

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					onClick={handleClick}
					disabled={disabled}
					data-testid={testId}
					className={cn(
						"flex w-full items-center gap-1.5 bg-transparent px-1 py-0.5 text-left text-sm",
						"rounded border-transparent",
						"hover:bg-accent/30",
						"focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary",
						disabled && "cursor-not-allowed opacity-50",
						inputClassName,
						className
					)}
				>
					<CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<span className={cn(!dateValue && "text-muted-foreground")}>{displayDate}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={dateValue}
					onSelect={handleSelect}
					defaultMonth={dateValue}
				/>
			</PopoverContent>
		</Popover>
	);
}
