"use client";

/**
 * TagRow Component
 *
 * Individual row in the tags table with inline editing support.
 * Shows tag name, parent hierarchy, transfer flag, and actions.
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Check, X, Tag as TagIcon, ArrowLeftRight } from "lucide-react";
import type { Tag } from "@/lib/crdt/schema";
import { ParentTagSelector } from "./ParentTagSelector";

export interface TagRowProps {
  /** Tag data */
  tag: Tag;
  /** All tags for parent selection */
  allTags: Tag[];
  /** Computed hierarchy depth (for indentation) */
  depth: number;
  /** Parent tag name (if any) */
  parentName?: string;
  /** Callback when tag is updated */
  onUpdate: (id: string, data: Partial<Tag>) => void;
  /** Callback when tag is deleted */
  onDelete: (id: string) => void;
  /** Whether this tag can be deleted (not if it has transactions or children) */
  canDelete?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tag row component with inline editing.
 */
export function TagRow({
  tag,
  allTags,
  depth,
  parentName,
  onUpdate,
  onDelete,
  canDelete = true,
  className,
}: TagRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(tag.name);
  const [editedParentId, setEditedParentId] = useState(tag.parentTagId ?? "");
  const [editedIsTransfer, setEditedIsTransfer] = useState(tag.isTransfer ?? false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle starting edit mode
  const handleStartEdit = useCallback(() => {
    setEditedName(tag.name);
    setEditedParentId(tag.parentTagId ?? "");
    setEditedIsTransfer(tag.isTransfer ?? false);
    setIsEditing(true);
  }, [tag.name, tag.parentTagId, tag.isTransfer]);

  // Handle saving inline edits
  const handleSave = useCallback(() => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setIsEditing(false);
      return;
    }

    const updates: Partial<Tag> = {};

    if (trimmedName !== tag.name) {
      updates.name = trimmedName;
    }

    const newParentId = editedParentId || undefined;
    if (newParentId !== tag.parentTagId) {
      updates.parentTagId = newParentId;
    }

    if (editedIsTransfer !== (tag.isTransfer ?? false)) {
      updates.isTransfer = editedIsTransfer;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(tag.id, updates);
    }

    setIsEditing(false);
  }, [
    tag.id,
    tag.name,
    tag.parentTagId,
    tag.isTransfer,
    editedName,
    editedParentId,
    editedIsTransfer,
    onUpdate,
  ]);

  // Handle canceling inline edits
  const handleCancel = useCallback(() => {
    setEditedName(tag.name);
    setEditedParentId(tag.parentTagId ?? "");
    setEditedIsTransfer(tag.isTransfer ?? false);
    setIsEditing(false);
  }, [tag.name, tag.parentTagId, tag.isTransfer]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  // Handle delete confirmation
  const handleDeleteClick = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete(tag.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  }, [tag.id, onDelete, showDeleteConfirm]);

  // Cancel delete confirmation
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Filter out current tag and its descendants from parent options
  const availableParents = allTags.filter((t) => {
    if (t.id === tag.id) return false;
    // Prevent circular references by excluding descendants
    let current: Tag | undefined = t;
    while (current?.parentTagId) {
      if (current.parentTagId === tag.id) return false;
      current = allTags.find((p) => p.id === current?.parentTagId);
    }
    return true;
  });

  return (
    <div
      className={cn(
        "group bg-card flex items-center gap-3 rounded-lg border p-4 transition-colors",
        "hover:bg-accent/50",
        className
      )}
      style={{ marginLeft: depth * 24 }}
    >
      {/* Tag icon */}
      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <TagIcon className="text-muted-foreground h-5 w-5" />
      </div>

      {/* Name and details section */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            {/* Name input */}
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tag name"
                className="h-8 max-w-xs"
                autoFocus
              />
            </div>

            {/* Parent selection */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Parent:</span>
              <ParentTagSelector
                value={editedParentId}
                onChange={setEditedParentId}
                availableTags={availableParents}
                className="max-w-xs"
              />
            </div>

            {/* Transfer toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`transfer-${tag.id}`}
                checked={editedIsTransfer}
                onCheckedChange={(checked) => setEditedIsTransfer(checked === true)}
              />
              <label
                htmlFor={`transfer-${tag.id}`}
                className="text-muted-foreground cursor-pointer text-sm"
              >
                Transfer tag (exclude from expense reports)
              </label>
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSave} className="h-8 gap-1">
                <Check className="h-4 w-4 text-green-600" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 gap-1">
                <X className="text-destructive h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{tag.name}</span>
              {tag.isTransfer && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <ArrowLeftRight className="h-3 w-3" />
                  Transfer
                </Badge>
              )}
            </div>

            {/* Parent info */}
            {parentName && (
              <span className="text-muted-foreground truncate text-xs">Parent: {parentName}</span>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!isEditing && (
          <>
            <Button variant="ghost" size="sm" onClick={handleStartEdit} className="h-8 w-8 p-0">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                onBlur={handleDeleteCancel}
                className={cn(
                  "h-8 w-8 p-0",
                  showDeleteConfirm && "bg-destructive text-destructive-foreground"
                )}
              >
                {showDeleteConfirm ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                <span className="sr-only">{showDeleteConfirm ? "Confirm delete" : "Delete"}</span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
