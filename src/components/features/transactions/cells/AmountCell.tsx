"use client";

/**
 * Amount Cell
 *
 * Displays and allows editing of a transaction amount.
 * Shows red for expenses (negative) and green for income (positive).
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AmountCellProps {
	/** The amount value in cents or decimal */
	value: number;
	/** Currency code (default: USD) */
	currency?: string;
	/** Whether the cell is in edit mode */
	isEditing?: boolean;
	/** Callback when the amount changes */
	onChange?: (amount: number) => void;
	/** Callback when editing starts */
	onEditStart?: () => void;
	/** Callback when editing ends */
	onEditEnd?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Format amount as currency.
 */
function formatCurrency(amount: number, currency: string = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

/**
 * Parse a currency string to number.
 */
function parseCurrency(str: string): number {
	// Remove currency symbols, commas, and whitespace
	const cleaned = str.replace(/[^0-9.-]/g, "");
	const parsed = parseFloat(cleaned);
	return isNaN(parsed) ? 0 : parsed;
}

/**
 * Amount cell component with inline editing.
 */
export function AmountCell({
	value,
	currency = "USD",
	isEditing = false,
	onChange,
	onEditStart,
	onEditEnd,
	className,
}: AmountCellProps) {
	const [localValue, setLocalValue] = useState(value.toFixed(2));
	const inputRef = useRef<HTMLInputElement>(null);

	// Sync local value with prop
	useEffect(() => {
		setLocalValue(value.toFixed(2));
	}, [value]);

	// Focus input when editing starts
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleDoubleClick = () => {
		onEditStart?.();
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setLocalValue(e.target.value);
	};

	const handleBlur = () => {
		const parsed = parseCurrency(localValue);
		if (parsed !== value) {
			onChange?.(parsed);
		}
		onEditEnd?.();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			const parsed = parseCurrency(localValue);
			if (parsed !== value) {
				onChange?.(parsed);
			}
			onEditEnd?.();
		} else if (e.key === "Escape") {
			setLocalValue(value.toFixed(2));
			onEditEnd?.();
		}
	};

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				type="text"
				inputMode="decimal"
				value={localValue}
				onChange={handleChange}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				className={cn(
					"w-28 rounded border px-2 py-1 text-right text-sm tabular-nums",
					"focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
					className
				)}
				placeholder="0.00"
			/>
		);
	}

	return (
		<div
			onDoubleClick={handleDoubleClick}
			className={cn(
				"w-28 shrink-0 cursor-pointer text-right font-medium tabular-nums",
				value < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
				"transition-opacity hover:opacity-80",
				className
			)}
		>
			{formatCurrency(value, currency)}
		</div>
	);
}
