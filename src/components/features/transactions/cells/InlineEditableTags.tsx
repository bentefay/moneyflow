"use client";

/**
 * Inline Editable Tags
 *
 * Spreadsheet-style always-editable tags multi-select.
 * Shows selected tags as colored pills with a dropdown for adding more.
 * Uses shadcn Command for the dropdown with search.
 */

import { Check, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { DEFAULT_TAG_COLOR, getContrastingTextColor } from "@/lib/domain";
import { cn } from "@/lib/utils";

import { tagSetChanged } from "../field-rule-proposal-state";
import {
    INNER_CELL_FOCUS_CHROME,
    PARKED_ACTION_FOCUS_CHROME,
    TRANSACTION_GRID_EDITOR_INLINE_CHROME
} from "./cell-chrome";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
    type TransactionGridEditorCommitResult,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle,
    useTransactionGridEditorPortalRef,
    useTransactionGridStartOpen
} from "./editor-lifecycle";

export interface TagOption {
    id: string;
    name: string;
    color?: string;
}

function normalizeTagName(name: string): string {
    return name.trim().toLowerCase();
}

function tagNameMatches(tag: TagOption, query: string): boolean {
    return normalizeTagName(tag.name) === normalizeTagName(query);
}

function selectableTagOptions(
    committedTags: readonly TagOption[],
    availableTags: readonly TagOption[],
    draftCreatedTags: readonly TagOption[]
): readonly TagOption[] {
    const byId = new Map<string, TagOption>();
    for (const tag of [...committedTags, ...availableTags, ...draftCreatedTags]) {
        if (!byId.has(tag.id)) byId.set(tag.id, tag);
    }
    return [...byId.values()];
}

export interface InlineEditableTagsProps {
    /** Current tag IDs */
    value: string[];
    /** Current tags for display */
    tags: TagOption[];
    /** All available tags for selection */
    availableTags: TagOption[];
    /** Commit selected IDs and any locally-created tag records in one transaction mutation. */
    onSave: (
        newTagIds: string[],
        createdTags: readonly TagOption[]
    ) => TransactionGridEditorCommitResult;
    /** Callback when a new tag should be created */
    onCreateTag?: (name: string) => Promise<TagOption>;
    /** Completed printable quick-entry text used as the initial tag query. */
    initialSearch?: string;
    /** Whether the picker opens immediately when its editor branch mounts. */
    startOpen?: boolean;
    /**
     * Reports whether the tag dropdown is open, i.e. whether the user is actively editing this
     * cell. Callers use it to decide when an edit has finished; the tag VALUES are never reported.
     */
    onEditingChange?: (isEditing: boolean) => void;
    /** Reports the controller-owned combobox independently from edit focus. */
    onPopupOpenChange?: (popup: "combobox", open: boolean) => void;
    /**
     * Transaction id of the row owning this cell. Stamped on the PORTALED dropdown so focus-tracking
     * elsewhere can tell this row's own picker from another row's.
     */
    ownerRowId?: string;
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
    disabled
}: {
    tag: TagOption;
    onRemove: () => void;
    disabled?: boolean;
}) {
    const bgColor = tag.color ?? DEFAULT_TAG_COLOR;
    const textColor = getContrastingTextColor(bgColor);

    return (
        <span
            className={cn(
                "relative inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                disabled && "opacity-50"
            )}
            style={{ backgroundColor: bgColor, color: textColor }}
        >
            {tag.name}
            {!disabled && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className={cn(
                        "-m-1 cursor-pointer rounded-full p-1 hover:opacity-70",
                        PARKED_ACTION_FOCUS_CHROME
                    )}
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
    initialSearch = "",
    startOpen = false,
    onEditingChange,
    onPopupOpenChange,
    ownerRowId,
    className,
    disabled = false,
    "data-testid": testId
}: InlineEditableTagsProps) {
    const [isOpen, setIsOpen] = useTransactionGridStartOpen(startOpen);
    const [draftTagIds, setDraftTagIds] = useState<readonly string[]>(value);
    const [draftCreatedTags, setDraftCreatedTags] = useState<readonly TagOption[]>([]);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [isCreating, setIsCreating] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const registerEditorPortal = useTransactionGridEditorPortalRef<HTMLDivElement>();
    const registerDropdown = useCallback(
        (element: HTMLDivElement | null) => {
            dropdownRef.current = element;
            if (element == null) return;
            const unregister = registerEditorPortal?.(element);
            return () => {
                if (dropdownRef.current === element) dropdownRef.current = null;
                if (typeof unregister === "function") unregister();
            };
        },
        [registerEditorPortal]
    );
    const cancelPicker = useCallback(() => {
        setDraftTagIds(value);
        setDraftCreatedTags([]);
        setIsOpen(false);
        setSearchQuery("");
    }, [setIsOpen, value]);
    const closePopupAndFocusEditor = useCallback(() => {
        setIsOpen(false);
        setSearchQuery("");
        onPopupOpenChange?.("combobox", false);
        queueMicrotask(() => {
            containerRef.current
                ?.querySelector<HTMLElement>("[data-tag-strip]")
                ?.focus({ preventScroll: true });
        });
    }, [onPopupOpenChange, setIsOpen]);
    const editorLifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            automation: {
                draftTagIds,
                field: "tags",
                originalTagIds: value
            },
            cancel: cancelPicker,
            commit: () => {
                if (!tagSetChanged(value, draftTagIds)) {
                    return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
                }
                return onSave(
                    [...draftTagIds],
                    draftCreatedTags.filter((tag) => draftTagIds.includes(tag.id))
                );
            },
            externalExitValidation: "controller"
        }),
        [cancelPicker, draftCreatedTags, draftTagIds, onSave, value]
    );
    useTransactionGridEditorLifecycle(editorLifecycle);

    // Closing only the popup returns controller ownership to the retained editor. A later Escape or
    // outside-grid gesture owns cancellation or commit of that editor.
    useEffect(() => {
        if (!isOpen) return;
        onEditingChange?.(true);
        onPopupOpenChange?.("combobox", true);
        return () => onPopupOpenChange?.("combobox", false);
    }, [isOpen, onEditingChange, onPopupOpenChange]);

    // Calculate dropdown position when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4, // 4px gap below trigger
                left: rect.left
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
            const target = e.target;
            if (!(target instanceof Node)) return;
            // Check if click is inside container or the portaled dropdown
            if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
                return;
            }
            setIsOpen(false);
            setSearchQuery("");
            onPopupOpenChange?.("combobox", false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onPopupOpenChange, setIsOpen]);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent row selection
            if (!disabled) {
                setIsOpen(true);
            }
        },
        [disabled, setIsOpen]
    );

    const toggleTag = useCallback((tagId: string) => {
        setDraftTagIds((current) =>
            current.includes(tagId)
                ? current.filter((candidate) => candidate !== tagId)
                : [...current, tagId]
        );
    }, []);

    const removeTag = useCallback((tagId: string) => {
        setDraftTagIds((current) => current.filter((candidate) => candidate !== tagId));
    }, []);
    const selectableTags = useMemo(
        () => selectableTagOptions(tags, availableTags, draftCreatedTags),
        [availableTags, draftCreatedTags, tags]
    );

    // Handle creating a new tag
    const handleCreateTag = useCallback(async () => {
        if (!onCreateTag || !searchQuery.trim() || isCreating) return;

        // Check if exact match already exists
        const exactMatch = selectableTags.some((tag) => tagNameMatches(tag, searchQuery));
        if (exactMatch) return;

        setIsCreating(true);
        try {
            const newTag = await onCreateTag(searchQuery.trim());
            setDraftCreatedTags((current) =>
                current.some((tag) => tag.id === newTag.id) ? current : [...current, newTag]
            );
            setDraftTagIds((current) =>
                current.includes(newTag.id) ? current : [...current, newTag.id]
            );
            setSearchQuery("");
        } finally {
            setIsCreating(false);
        }
    }, [isCreating, onCreateTag, searchQuery, selectableTags]);

    // Handle keyboard events on the display area (Enter/Space to open, Escape to close)
    const handleDisplayKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                e.preventDefault();
                e.stopPropagation();
                closePopupAndFocusEditor();
            } else if ((e.key === "Enter" || e.key === " ") && !isOpen && !disabled) {
                e.preventDefault();
                setIsOpen(true);
            }
        },
        [closePopupAndFocusEditor, disabled, isOpen, setIsOpen]
    );

    // Handle keyboard events on input (Enter to create/toggle, Escape to close)
    const handleInputKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closePopupAndFocusEditor();
            } else if (e.key === "Enter" && searchQuery.trim()) {
                e.preventDefault();
                e.stopPropagation(); // Prevent double-firing
                // If there's an exact match, toggle it
                const exactMatch = selectableTags.find((tag) => tagNameMatches(tag, searchQuery));
                if (exactMatch) {
                    toggleTag(exactMatch.id);
                    setSearchQuery("");
                } else if (onCreateTag) {
                    // Otherwise materialize a local draft tag; the editor commit persists it.
                    void handleCreateTag();
                }
            }
        },
        [
            closePopupAndFocusEditor,
            handleCreateTag,
            onCreateTag,
            searchQuery,
            selectableTags,
            toggleTag
        ]
    );

    const normalizedSearchQuery = normalizeTagName(searchQuery);

    // Filter available tags based on the same normalized query used for exact creation authority.
    const filteredTags = selectableTags.filter((tag) =>
        normalizeTagName(tag.name).includes(normalizedSearchQuery)
    );

    // Selected tags for display
    const selectedTags = draftTagIds.flatMap((tagId) => {
        const tag =
            tags.find((candidate) => candidate.id === tagId) ??
            selectableTags.find((candidate) => candidate.id === tagId);
        return tag == null ? [] : [tag];
    });

    // Check if we can create a new tag (search has content and no exact match)
    const canCreateTag =
        onCreateTag != null &&
        normalizedSearchQuery !== "" &&
        !selectableTags.some((tag) => tagNameMatches(tag, searchQuery));

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
                aria-expanded={isOpen}
                data-gridcell-interactive
                data-legacy-edit-activation
                data-tag-strip
                onKeyDown={handleDisplayKeyDown}
                className={cn(
                    "flex h-7 min-w-0 cursor-pointer flex-nowrap items-center gap-1 overflow-hidden rounded-none border border-transparent bg-transparent py-0.5 shadow-none outline-none",
                    INNER_CELL_FOCUS_CHROME,
                    TRANSACTION_GRID_EDITOR_INLINE_CHROME,
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
                        ref={registerDropdown}
                        // Portaled to document.body, so it is outside the row in the DOM while still
                        // being part of editing that row. Marked so focus-tracking elsewhere can
                        // tell "the user moved into this row's own dropdown" from "the user left".
                        data-owned-by-row={ownerRowId}
                        data-owned-by-field="tags"
                        className="bg-popover fixed z-[9999] w-56 rounded-md border shadow-lg"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left
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
                                    {filteredTags.map((tag) => {
                                        const tagColor = tag.color ?? DEFAULT_TAG_COLOR;
                                        return (
                                            <CommandItem
                                                key={tag.id}
                                                value={tag.name}
                                                onSelect={() => toggleTag(tag.id)}
                                            >
                                                <span
                                                    className="h-3 w-3 shrink-0 rounded-full"
                                                    style={{ backgroundColor: tagColor }}
                                                />
                                                {tag.name}
                                                {draftTagIds.includes(tag.id) && (
                                                    <Check className="ml-auto h-4 w-4" />
                                                )}
                                            </CommandItem>
                                        );
                                    })}
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
