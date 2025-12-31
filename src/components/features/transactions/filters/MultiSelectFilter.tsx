"use client";

/**
 * Multi-Select Filter
 *
 * Reusable multi-select dropdown for filtering by tags, people, accounts, or statuses.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FilterOption {
	id: string;
	label: string;
	group?: string;
}

export interface MultiSelectFilterProps {
	/** Placeholder text when nothing selected */
	placeholder: string;
	/** Available options */
	options: FilterOption[];
	/** Currently selected option IDs */
	selectedIds: string[];
	/** Callback when selection changes */
	onChange: (ids: string[]) => void;
	/** Whether to show search input */
	searchable?: boolean;
	/** Icon to show in the button */
	icon?: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Multi-select filter component.
 */
export function MultiSelectFilter({
	placeholder,
	options,
	selectedIds,
	onChange,
	searchable = true,
	icon,
	className,
}: MultiSelectFilterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Handle click outside
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
				setSearchQuery("");
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	// Focus search input when opening
	useEffect(() => {
		if (isOpen && searchable && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen, searchable]);

	// Filter options by search query
	const filteredOptions = options.filter((option) =>
		option.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Group options if they have groups
	const groupedOptions = filteredOptions.reduce<Record<string, FilterOption[]>>((acc, option) => {
		const group = option.group ?? "";
		if (!acc[group]) {
			acc[group] = [];
		}
		acc[group].push(option);
		return acc;
	}, {});

	const toggleOption = (optionId: string) => {
		if (selectedIds.includes(optionId)) {
			onChange(selectedIds.filter((id) => id !== optionId));
		} else {
			onChange([...selectedIds, optionId]);
		}
	};

	const clearAll = () => {
		onChange([]);
	};

	const selectAll = () => {
		onChange(options.map((o) => o.id));
	};

	// Get selected labels for display
	const selectedLabels = selectedIds
		.map((id) => options.find((o) => o.id === id)?.label)
		.filter(Boolean);

	const displayText =
		selectedLabels.length === 0
			? placeholder
			: selectedLabels.length <= 2
				? selectedLabels.join(", ")
				: `${selectedLabels[0]}, +${selectedLabels.length - 1}`;

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			{/* Trigger button */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
					"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
					selectedIds.length > 0 && "border-primary",
					isOpen && "ring-2 ring-primary"
				)}
			>
				{icon && <span className="h-4 w-4">{icon}</span>}
				<span className={cn(selectedIds.length === 0 && "text-muted-foreground")}>
					{displayText}
				</span>
				{selectedIds.length > 0 && (
					<span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 font-medium text-primary-foreground text-xs">
						{selectedIds.length}
					</span>
				)}
				<svg
					className={cn("ml-auto h-4 w-4 transition-transform", isOpen && "rotate-180")}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{/* Dropdown */}
			{isOpen && (
				<div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border bg-popover text-popover-foreground shadow-lg">
					{/* Search input */}
					{searchable && (
						<div className="border-b p-2">
							<input
								ref={inputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search..."
								className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							/>
						</div>
					)}

					{/* Quick actions */}
					<div className="flex gap-2 border-b p-2">
						<button
							type="button"
							onClick={selectAll}
							className="text-primary text-xs hover:underline"
						>
							Select all
						</button>
						<button
							type="button"
							onClick={clearAll}
							className="text-muted-foreground text-xs hover:underline"
						>
							Clear
						</button>
					</div>

					{/* Options list */}
					<div className="max-h-48 overflow-auto p-1">
						{Object.entries(groupedOptions).map(([group, groupOptions]) => (
							<div key={group}>
								{group && (
									<div className="px-2 py-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
										{group}
									</div>
								)}
								{groupOptions.map((option) => (
									<button
										key={option.id}
										type="button"
										onClick={() => toggleOption(option.id)}
										className={cn(
											"flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
											"hover:bg-accent focus:bg-accent focus:outline-none",
											selectedIds.includes(option.id) && "bg-accent"
										)}
									>
										<span
											className={cn(
												"flex h-4 w-4 items-center justify-center rounded border",
												selectedIds.includes(option.id) && "border-primary bg-primary"
											)}
										>
											{selectedIds.includes(option.id) && (
												<svg
													className="h-3 w-3 text-white"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={3}
														d="M5 13l4 4L19 7"
													/>
												</svg>
											)}
										</span>
										<span className="flex-1 truncate">{option.label}</span>
									</button>
								))}
							</div>
						))}

						{filteredOptions.length === 0 && (
							<div className="py-4 text-center text-muted-foreground text-sm">
								{searchQuery ? "No matches found" : "No options available"}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
