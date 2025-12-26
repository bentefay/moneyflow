"use client";

/**
 * Tags Cell
 *
 * Displays tags as pills and allows inline editing.
 * Clicking opens an inline tag editor.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TagData {
  id: string;
  name: string;
}

export interface TagsCellProps {
  /** Array of tag objects */
  tags: TagData[];
  /** All available tags for selection */
  availableTags?: TagData[];
  /** Whether the cell is in edit mode */
  isEditing?: boolean;
  /** Callback when tags change */
  onChange?: (tagIds: string[]) => void;
  /** Callback when a new tag should be created */
  onCreateTag?: (name: string) => Promise<TagData>;
  /** Callback when editing starts */
  onEditStart?: () => void;
  /** Callback when editing ends */
  onEditEnd?: () => void;
  /** Maximum number of tags to display before showing "+N" */
  maxDisplay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tag pill component.
 */
function TagPill({
  tag,
  onRemove,
  removable = false,
}: {
  tag: TagData;
  onRemove?: () => void;
  removable?: boolean;
}) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        removable && "pr-1"
      )}
    >
      {tag.name}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5"
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
 * Tags cell component with inline editing.
 */
export function TagsCell({
  tags,
  availableTags = [],
  isEditing = false,
  onChange,
  onCreateTag,
  onEditStart,
  onEditEnd,
  maxDisplay = 2,
  className,
}: TagsCellProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(tags.map((t) => t.id));
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selected tags with prop
  useEffect(() => {
    setSelectedTagIds(tags.map((t) => t.id));
  }, [tags]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Handle click outside to close
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, selectedTagIds]);

  const handleDoubleClick = () => {
    onEditStart?.();
  };

  const handleSave = () => {
    if (JSON.stringify(selectedTagIds) !== JSON.stringify(tags.map((t) => t.id))) {
      onChange?.(selectedTagIds);
    }
    setSearchQuery("");
    onEditEnd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim() && onCreateTag) {
      e.preventDefault();
      onCreateTag(searchQuery.trim()).then((newTag) => {
        setSelectedTagIds((prev) => [...prev, newTag.id]);
        setSearchQuery("");
      });
    } else if (e.key === "Escape") {
      setSelectedTagIds(tags.map((t) => t.id));
      setSearchQuery("");
      onEditEnd?.();
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  // Filter available tags based on search
  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedTagIds.includes(tag.id)
  );

  if (isEditing) {
    const selectedTags = availableTags.filter((t) => selectedTagIds.includes(t.id));

    return (
      <div ref={containerRef} className={cn("relative w-48", className)}>
        <div className="bg-background rounded-md border p-2 shadow-lg">
          {/* Selected tags */}
          <div className="mb-2 flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <TagPill key={tag.id} tag={tag} removable onRemove={() => removeTag(tag.id)} />
            ))}
          </div>

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or create..."
            className="w-full rounded border-none bg-transparent px-1 py-0.5 text-sm outline-none"
          />

          {/* Available tags dropdown */}
          {(filteredTags.length > 0 || searchQuery.trim()) && (
            <div className="mt-2 max-h-32 overflow-auto border-t pt-2">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="hover:bg-muted block w-full rounded px-2 py-1 text-left text-sm"
                >
                  {tag.name}
                </button>
              ))}
              {searchQuery.trim() &&
                !availableTags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onCreateTag) {
                        onCreateTag(searchQuery.trim()).then((newTag) => {
                          setSelectedTagIds((prev) => [...prev, newTag.id]);
                          setSearchQuery("");
                        });
                      }
                    }}
                    className="hover:bg-muted text-primary block w-full rounded px-2 py-1 text-left text-sm"
                  >
                    Create "{searchQuery}"
                  </button>
                )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Display mode
  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn("flex cursor-pointer gap-1", "transition-opacity hover:opacity-80", className)}
    >
      {displayTags.length > 0 ? (
        <>
          {displayTags.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
          {remainingCount > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
              +{remainingCount}
            </span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground text-xs italic">No tags</span>
      )}
    </div>
  );
}
