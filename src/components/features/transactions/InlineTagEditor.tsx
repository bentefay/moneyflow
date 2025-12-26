"use client";

/**
 * Inline Tag Editor
 *
 * A floating tag editor that allows searching, selecting, and creating tags.
 * Displays selected tags as pills with remove buttons.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface TagData {
  id: string;
  name: string;
  parentTagId?: string;
}

export interface InlineTagEditorProps {
  /** Currently selected tag IDs */
  selectedTagIds: string[];
  /** All available tags */
  availableTags: TagData[];
  /** Callback when selection changes */
  onChange: (tagIds: string[]) => void;
  /** Callback when a new tag should be created */
  onCreateTag?: (name: string) => Promise<TagData>;
  /** Callback when the editor should close */
  onClose?: () => void;
  /** Position the editor relative to */
  anchorRef?: React.RefObject<HTMLElement>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tag pill component with remove button.
 */
function TagPill({
  tag,
  onRemove,
}: {
  tag: TagData;
  onRemove: () => void;
}) {
  return (
    <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm">
      {tag.name}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:bg-primary/20 ml-0.5 rounded-full p-0.5"
        aria-label={`Remove ${tag.name}`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

/**
 * Tag option in the dropdown.
 */
function TagOption({
  tag,
  isSelected,
  onToggle,
  indent = 0,
}: {
  tag: TagData;
  isSelected: boolean;
  onToggle: () => void;
  indent?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        isSelected && "bg-accent"
      )}
      style={{ paddingLeft: `${8 + indent * 12}px` }}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          isSelected && "bg-primary border-primary"
        )}
      >
        {isSelected && (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className={cn("flex-1 truncate", isSelected && "font-medium")}>{tag.name}</span>
    </button>
  );
}

/**
 * Inline tag editor component.
 */
export function InlineTagEditor({
  selectedTagIds,
  availableTags,
  onChange,
  onCreateTag,
  onClose,
  anchorRef,
  className,
}: InlineTagEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!anchorRef?.current || !anchorRef.current.contains(e.target as Node))
      ) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  // Build hierarchical tag list
  const buildTagHierarchy = useCallback(() => {
    const topLevel: TagData[] = [];
    const childrenByParent: Record<string, TagData[]> = {};

    availableTags.forEach((tag) => {
      if (tag.parentTagId) {
        if (!childrenByParent[tag.parentTagId]) {
          childrenByParent[tag.parentTagId] = [];
        }
        childrenByParent[tag.parentTagId].push(tag);
      } else {
        topLevel.push(tag);
      }
    });

    const result: { tag: TagData; indent: number }[] = [];
    const addWithChildren = (tag: TagData, indent: number) => {
      result.push({ tag, indent });
      const children = childrenByParent[tag.id] || [];
      children.forEach((child) => addWithChildren(child, indent + 1));
    };

    topLevel.forEach((tag) => addWithChildren(tag, 0));
    return result;
  }, [availableTags]);

  const tagHierarchy = buildTagHierarchy();

  // Filter tags based on search
  const filteredTags = tagHierarchy.filter(({ tag }) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected tag objects
  const selectedTags = availableTags.filter((t) => selectedTagIds.includes(t.id));

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!onCreateTag || !searchQuery.trim() || isCreating) return;

    // Check if tag already exists
    if (availableTags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase())) {
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(searchQuery.trim());
      onChange([...selectedTagIds, newTag.id]);
      setSearchQuery("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();
      const exactMatch = availableTags.find(
        (t) => t.name.toLowerCase() === searchQuery.toLowerCase()
      );
      if (exactMatch) {
        handleToggleTag(exactMatch.id);
        setSearchQuery("");
      } else if (onCreateTag) {
        handleCreateTag();
      }
    } else if (e.key === "Escape") {
      onClose?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-popover text-popover-foreground w-72 rounded-lg border shadow-lg",
        className
      )}
    >
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b p-2">
          {selectedTags.map((tag) => (
            <TagPill key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} />
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="border-b p-2">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search or create tag..."
          className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Tag list */}
      <div className="max-h-48 overflow-auto p-1">
        {filteredTags.map(({ tag, indent }) => (
          <TagOption
            key={tag.id}
            tag={tag}
            isSelected={selectedTagIds.includes(tag.id)}
            onToggle={() => handleToggleTag(tag.id)}
            indent={indent}
          />
        ))}

        {/* Create new tag option */}
        {searchQuery.trim() &&
          !availableTags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase()) &&
          onCreateTag && (
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={isCreating}
              className={cn(
                "text-primary flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                "hover:bg-accent focus:bg-accent focus:outline-none",
                isCreating && "opacity-50"
              )}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create "{searchQuery}"</span>
            </button>
          )}

        {/* Empty state */}
        {filteredTags.length === 0 && !searchQuery.trim() && (
          <div className="text-muted-foreground py-4 text-center text-sm">No tags available</div>
        )}
      </div>
    </div>
  );
}
