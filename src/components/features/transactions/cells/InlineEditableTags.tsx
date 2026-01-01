"use client";

/**
 * Inline Editable Tags
 *
 * Spreadsheet-style always-editable tags multi-select.
 * Shows selected tags as pills with a dropdown for adding more.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface TagOption {
	id: string;
	name: string;
}

export interface InlineEditableTagsProps {
	/** Current tag IDs */
	value: string[];
	/** Current tags for display */
	tags: TagOption[];
	/** All available tags for selection */
	availableTags: TagOption[];
	/** Callback when value is saved */
	onSave: (newTagIds: string[]) => void;
	/** Callback when a new tag should be created */
	onCreateTag?: (name: string) => Promise<TagOption>;
	/** Maximum number of tags to display before showing "+N" */
	maxDisplay?: number;
	/** Additional class names for the container */
	className?: string;
	/** Whether editing is disabled */
	disabled?: boolean;
	/** Test ID for testing */
	"data-testid"?: string;
}

/**
 * Tag pill component with remove button.
 */
function TagPill({
	tag,
	onRemove,
	disabled,
}: {
	tag: TagOption;
	onRemove: () => void;
	disabled?: boolean;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs",
				disabled && "opacity-50"
			)}
		>
			{tag.name}
			{!disabled && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="ml-0.5 rounded hover:bg-muted-foreground/20"
					aria-label={`Remove ${tag.name}`}
				>
					<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			)}
		</span>
	);
}

/**
 * Spreadsheet-style always-editable tags multi-select.
 *
 * - Click to open dropdown
 * - Click tags to toggle selection
 * - Click outside to close
 * - Escape to close
 */
export function InlineEditableTags({
	value,
	tags,
	availableTags,
	onSave,
	onCreateTag,
	className,
	disabled = false,
	"data-testid": testId,
}: InlineEditableTagsProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
	const containerRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Calculate dropdown position when opening
	useEffect(() => {
		if (isOpen && containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			setDropdownPosition({
				top: rect.bottom + 4, // 4px gap below trigger
				left: rect.left,
			});
		}
	}, [isOpen]);

	// Focus search input when dropdown opens
	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	// Handle click outside to close
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			// Check if click is inside container or the portaled dropdown
			if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
				return;
			}
			setIsOpen(false);
			setSearchQuery("");
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation(); // Prevent row selection
			if (!disabled) {
				setIsOpen(true);
			}
		},
		[disabled]
	);

	const toggleTag = useCallback(
		(tagId: string) => {
			const newValue = value.includes(tagId)
				? value.filter((id) => id !== tagId)
				: [...value, tagId];
			onSave(newValue);
		},
		[value, onSave]
	);

	const removeTag = useCallback(
		(tagId: string) => {
			onSave(value.filter((id) => id !== tagId));
		},
		[value, onSave]
	);

	// Handle creating a new tag
	const handleCreateTag = useCallback(async () => {
		if (!onCreateTag || !searchQuery.trim() || isCreating) return;

		// Check if exact match already exists
		const exactMatch = availableTags.some(
			(t) => t.name.toLowerCase() === searchQuery.toLowerCase()
		);
		if (exactMatch) return;

		setIsCreating(true);
		try {
			const newTag = await onCreateTag(searchQuery.trim());
			// Add the new tag to the selection
			onSave([...value, newTag.id]);
			setSearchQuery("");
		} finally {
			setIsCreating(false);
		}
	}, [onCreateTag, searchQuery, isCreating, availableTags, onSave, value]);

	// Handle keyboard events on container (just Escape to close)
	const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			setIsOpen(false);
			setSearchQuery("");
		}
	}, []);

	// Handle keyboard events on input (Enter to create/toggle, Escape to close)
	const handleInputKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setIsOpen(false);
				setSearchQuery("");
			} else if (e.key === "Enter" && searchQuery.trim()) {
				e.preventDefault();
				e.stopPropagation(); // Prevent double-firing
				// If there's an exact match, toggle it
				const exactMatch = availableTags.find(
					(t) => t.name.toLowerCase() === searchQuery.toLowerCase()
				);
				if (exactMatch) {
					toggleTag(exactMatch.id);
					setSearchQuery("");
				} else if (onCreateTag) {
					// Otherwise create a new tag (handleCreateTag already calls onSave)
					void handleCreateTag();
				}
			}
		},
		[availableTags, searchQuery, toggleTag, onCreateTag, handleCreateTag]
	);

	// Filter available tags based on search
	const filteredTags = availableTags.filter((tag) =>
		tag.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Selected tags for display
	const selectedTags = tags.length > 0 ? tags : availableTags.filter((t) => value.includes(t.id));

	return (
		<div
			ref={containerRef}
			onClick={handleClick}
			onKeyDown={handleContainerKeyDown}
			data-testid={testId}
			className={cn("relative", className)}
		>
			{/* Display area */}
			<div
				className={cn(
					"flex min-h-[26px] cursor-pointer flex-wrap items-center gap-1 rounded px-1 py-0.5",
					"border-transparent",
					"hover:bg-accent/30",
					isOpen && "bg-background ring-1 ring-primary",
					disabled && "cursor-not-allowed opacity-50"
				)}
			>
				{selectedTags.length === 0 ? (
					<span className="text-muted-foreground text-xs">Add tags...</span>
				) : (
					selectedTags.map((tag) => (
						<TagPill
							key={tag.id}
							tag={tag}
							onRemove={() => removeTag(tag.id)}
							disabled={disabled}
						/>
					))
				)}
			</div>

			{/* Dropdown - rendered in portal with fixed positioning */}
			{isOpen &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={dropdownRef}
						className="fixed z-[9999] w-48 rounded-md border bg-popover p-2 shadow-lg"
						style={{
							top: dropdownPosition.top,
							left: dropdownPosition.left,
						}}
					>
						{/* Search input */}
						<input
							ref={inputRef}
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={handleInputKeyDown}
							placeholder="Search tags..."
							className="mb-2 w-full rounded border px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						/>

						{/* Tag list */}
						<div className="max-h-32 overflow-auto">
							{filteredTags.length === 0 && !searchQuery.trim() ? (
								<div className="px-2 py-1 text-muted-foreground text-xs">No tags found</div>
							) : (
								filteredTags.map((tag) => (
									<button
										key={tag.id}
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											toggleTag(tag.id);
										}}
										className={cn(
											"flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-accent",
											value.includes(tag.id) && "bg-accent/50"
										)}
									>
										<span
											className={cn(
												"h-3 w-3 rounded border",
												value.includes(tag.id) && "border-primary bg-primary"
											)}
										>
											{value.includes(tag.id) && (
												<svg
													className="h-3 w-3 text-primary-foreground"
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
										{tag.name}
									</button>
								))
							)}

							{/* Create button - always visible when searching and callback provided */}
							{searchQuery.trim() && onCreateTag && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleCreateTag();
									}}
									disabled={
										isCreating ||
										availableTags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase())
									}
									data-testid="create-tag-button"
									className={cn(
										"flex w-full items-center gap-2 rounded px-2 py-1 text-left text-primary text-sm hover:bg-accent",
										(isCreating ||
											availableTags.some(
												(t) => t.name.toLowerCase() === searchQuery.toLowerCase()
											)) &&
											"cursor-not-allowed opacity-50"
									)}
								>
									<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4v16m8-8H4"
										/>
									</svg>
									{isCreating ? "Creating..." : `Create "${searchQuery}"`}
								</button>
							)}
						</div>
					</div>,
					document.body
				)}
		</div>
	);
}
