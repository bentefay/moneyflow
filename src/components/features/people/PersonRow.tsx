"use client";

/**
 * PersonRow Component
 *
 * Individual row in the people list with inline editing support.
 * Shows person's name, linked identity status, and actions.
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Check, X, Link2, User } from "lucide-react";
import type { Person } from "@/lib/crdt/schema";

export interface PersonRowProps {
  /** Person data */
  person: Person;
  /** Current user's pubkeyHash (to show "You" badge) */
  currentUserPubkeyHash?: string;
  /** Callback when person is updated */
  onUpdate: (id: string, data: Partial<Person>) => void;
  /** Callback when person is deleted */
  onDelete: (id: string) => void;
  /** Whether this person can be deleted (not if they have transactions) */
  canDelete?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Person row component with inline editing.
 */
export function PersonRow({
  person,
  currentUserPubkeyHash,
  onUpdate,
  onDelete,
  canDelete = true,
  className,
}: PersonRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(person.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if this person is the current user
  const isCurrentUser = person.linkedUserId === currentUserPubkeyHash;

  // Check if person is linked to an identity
  const isLinked = Boolean(person.linkedUserId);

  // Handle saving inline edits
  const handleSave = useCallback(() => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== person.name) {
      onUpdate(person.id, { name: trimmedName });
    }
    setIsEditing(false);
  }, [person.id, person.name, editedName, onUpdate]);

  // Handle canceling inline edits
  const handleCancel = useCallback(() => {
    setEditedName(person.name);
    setIsEditing(false);
  }, [person.name]);

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
      onDelete(person.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  }, [person.id, onDelete, showDeleteConfirm]);

  // Cancel delete confirmation after a timeout
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <div
      className={cn(
        "group bg-card flex items-center gap-3 rounded-lg border p-4 transition-colors",
        "hover:bg-accent/50",
        className
      )}
    >
      {/* Person icon */}
      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <User className="text-muted-foreground h-5 w-5" />
      </div>

      {/* Name section */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Person name"
              className="h-8 max-w-xs"
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={handleSave} className="h-8 w-8 p-0">
              <Check className="h-4 w-4 text-green-600" />
              <span className="sr-only">Save</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 w-8 p-0">
              <X className="text-destructive h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{person.name}</span>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">
                You
              </Badge>
            )}
            {isLinked && !isCurrentUser && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Link2 className="h-3 w-3" />
                Linked
              </Badge>
            )}
          </div>
        )}

        {/* Linked identity info */}
        {isLinked && (
          <span className="text-muted-foreground truncate text-xs">
            {isCurrentUser
              ? "This is your identity in the vault"
              : `Linked to identity: ${person.linkedUserId?.slice(0, 8)}...`}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!isEditing && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>

            {canDelete && !isLinked && (
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
