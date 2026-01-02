"use client";

/**
 * Inline Editable Tags
 *
 * Spreadsheet-style always-editable tags multi-select.
 * Shows selected tags as pills with a dropdown for adding more.
 * Uses shadcn Command for the dropdown with search.
 */

import { Check, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
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
				"inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs font-medium",
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
					className="rounded-full hover:text-primary-foreground/50 cursor-pointer -m-1 p-1"
					aria-label={`Remove ${tag.name}`}
				>
					<X className="h-3 w-3" />
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

	// Handle keyboard events on the display area (Enter/Space to open, Escape to close)
	const handleDisplayKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setIsOpen(false);
				setSearchQuery("");
			} else if ((e.key === "Enter" || e.key === " ") && !isOpen && !disabled) {
				e.preventDefault();
				setIsOpen(true);
			}
		},
		[isOpen, disabled]
	);

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

	// Check if we can create a new tag (search has content and no exact match)
	const canCreateTag =
		onCreateTag &&
		searchQuery.trim() &&
		!availableTags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase());

	return (
		<div
			ref={containerRef}
			onClick={handleClick}
			data-testid={testId}
			className={cn("relative", className)}
		>
			{/* Display area */}
			<div
				tabIndex={disabled ? -1 : 0}
				onKeyDown={handleDisplayKeyDown}
				className={cn(
					"flex min-h-[28px] cursor-pointer flex-wrap items-center gap-1 rounded-md px-1 py-0.5",
					"border border-transparent bg-transparent shadow-none outline-none",
					"hover:bg-accent/30",
					"focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50",
					disabled && "cursor-not-allowed opacity-50"
				)}
			>
				{selectedTags.length === 0 ? (
					<span className="text-muted-foreground text-sm">Add tags...</span>
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
						className="fixed z-[9999] w-56 rounded-md border bg-popover shadow-lg"
						style={{
							top: dropdownPosition.top,
							left: dropdownPosition.left,
						}}
					>
						<Command shouldFilter={false}>
							<CommandInput
								ref={inputRef}
								value={searchQuery}
								onValueChange={setSearchQuery}
								onKeyDown={handleInputKeyDown}
								placeholder="Search tags..."
							/>
							<CommandList>
								<CommandEmpty className="py-2 text-sm">No tags found.</CommandEmpty>
								<CommandGroup>
									{filteredTags.map((tag) => (
										<CommandItem key={tag.id} value={tag.name} onSelect={() => toggleTag(tag.id)}>
											{tag.name}
											{value.includes(tag.id) && <Check className="ml-auto h-4 w-4" />}
										</CommandItem>
									))}
									{/* Create option - always visible when search has content and no exact match */}
									{canCreateTag && (
										<CommandItem
											value={`create-${searchQuery}`}
											onSelect={() => handleCreateTag()}
											disabled={isCreating}
											data-testid="create-tag-button"
											className="text-primary"
										>
											<Plus className="h-4 w-4" />
											{isCreating ? "Creating..." : `Create "${searchQuery}"`}
										</CommandItem>
									)}
								</CommandGroup>
							</CommandList>
						</Command>
					</div>,
					document.body
				)}
		</div>
	);
}
