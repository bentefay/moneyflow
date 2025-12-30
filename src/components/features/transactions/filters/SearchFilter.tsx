"use client";

/**
 * Search Filter
 *
 * Free-text search input for filtering transactions by merchant or description.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SearchFilterProps {
	/** Current search value */
	value: string;
	/** Callback when search changes */
	onChange: (value: string) => void;
	/** Placeholder text */
	placeholder?: string;
	/** Debounce delay in ms */
	debounceMs?: number;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Search filter component with debounce.
 */
export function SearchFilter({
	value,
	onChange,
	placeholder = "Search transactions...",
	debounceMs = 300,
	className,
}: SearchFilterProps) {
	const [localValue, setLocalValue] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// Sync with external value
	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	// Debounce the onChange callback
	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		debounceRef.current = setTimeout(() => {
			if (localValue !== value) {
				onChange(localValue);
			}
		}, debounceMs);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [localValue, value, onChange, debounceMs]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setLocalValue(e.target.value);
	};

	const handleClear = () => {
		setLocalValue("");
		onChange("");
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			handleClear();
		} else if (e.key === "Enter") {
			// Immediately trigger search on Enter
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
			onChange(localValue);
		}
	};

	return (
		<div className={cn("relative", className)}>
			{/* Search icon */}
			<svg
				className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>

			{/* Input */}
			<input
				ref={inputRef}
				type="text"
				value={localValue}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				data-testid="search-filter"
				className={cn(
					"w-full rounded-md border py-2 pr-8 pl-9 text-sm",
					"focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
					"placeholder:text-muted-foreground"
				)}
			/>

			{/* Clear button */}
			{localValue && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
					aria-label="Clear search"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			)}
		</div>
	);
}
