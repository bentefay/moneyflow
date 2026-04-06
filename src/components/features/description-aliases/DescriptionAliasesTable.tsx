"use client";

/**
 * DescriptionAliasesTable Component
 *
 * Container component for managing description aliases in the vault.
 * Displays aliases as a flat list with inline editing.
 */

import { Check, Pencil, Plus, TextCursorInput, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDescriptionAliases, useVaultAction } from "@/lib/crdt/context";
import type { DescriptionAlias, DescriptionAliasInput } from "@/lib/crdt/schema";
import { getActiveRealAliases } from "@/lib/domain/description-aliases";
import { cn } from "@/lib/utils";

export interface DescriptionAliasesTableProps {
    className?: string;
}

/**
 * Description aliases table with flat display and inline editing.
 */
export function DescriptionAliasesTable({ className }: DescriptionAliasesTableProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newAliasName, setNewAliasName] = useState("");

    // Get aliases from CRDT state
    const aliases = useDescriptionAliases();

    // Create CRDT mutation action
    const updateVault = useVaultAction(
        (
            draft,
            action: {
                type: "add" | "update" | "delete";
                id: string;
                data?: Partial<DescriptionAliasInput>;
            }
        ) => {
            switch (action.type) {
                case "add":
                    if (action.data) {
                        draft.descriptionAliases[action.id] =
                            action.data as unknown as (typeof draft.descriptionAliases)[string];
                    }
                    break;
                case "update":
                    if (draft.descriptionAliases[action.id] && action.data) {
                        Object.assign(draft.descriptionAliases[action.id], action.data);
                    }
                    break;
                case "delete":
                    if (draft.descriptionAliases[action.id]) {
                        draft.descriptionAliases[action.id].deletedAt = Temporal.Now.instant();
                    }
                    break;
            }
        },
        []
    );

    // Get list of active real aliases (not deleted, not symlinks)
    const activeAliases = useMemo(() => {
        return getActiveRealAliases(aliases).sort((a, b) => a.name.localeCompare(b.name));
    }, [aliases]);

    // Check if an alias can be deleted (no transactions and no symlinks)
    const canDeleteAlias = useCallback(
        (alias: DescriptionAlias): { canDelete: boolean; reason?: string } => {
            const txCount = Object.keys(alias.transactionIds).filter((k) => k !== "$cid").length;
            const symlinkCount = Object.keys(alias.symlinkIds).filter((k) => k !== "$cid").length;

            if (txCount > 0) {
                return {
                    canDelete: false,
                    reason: `Cannot delete: ${txCount} transaction${txCount > 1 ? "s" : ""} use this alias`
                };
            }
            if (symlinkCount > 0) {
                return {
                    canDelete: false,
                    reason: `Cannot delete: ${symlinkCount} other alias${symlinkCount > 1 ? "es" : ""} reference this alias`
                };
            }
            return { canDelete: true };
        },
        []
    );

    // Handle adding a new alias
    const handleAdd = useCallback(() => {
        const trimmedName = newAliasName.trim();
        if (!trimmedName) return;

        const id = crypto.randomUUID();
        updateVault({
            type: "add",
            id,
            data: {
                id,
                name: trimmedName,
                targetAliasId: undefined,
                symlinkIds: {},
                transactionIds: {},
                deletedAt: undefined
            }
        });

        setNewAliasName("");
        setIsAdding(false);
    }, [newAliasName, updateVault]);

    // Handle keyboard events for add input
    const handleAddKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
            } else if (e.key === "Escape") {
                e.preventDefault();
                setIsAdding(false);
                setNewAliasName("");
            }
        },
        [handleAdd]
    );

    // Handle cancel add
    const handleCancelAdd = useCallback(() => {
        setIsAdding(false);
        setNewAliasName("");
    }, []);

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TextCursorInput className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Description Aliases</h2>
                    <span className="text-muted-foreground text-sm">({activeAliases.length})</span>
                </div>

                {!isAdding && (
                    <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Alias
                    </Button>
                )}
            </div>

            {/* Add new alias form */}
            {isAdding && (
                <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                        <Input
                            value={newAliasName}
                            onChange={(e) => setNewAliasName(e.target.value)}
                            onKeyDown={handleAddKeyDown}
                            placeholder="Enter alias name"
                            className="max-w-xs"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleAdd} disabled={!newAliasName.trim()}>
                            Add Alias
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelAdd}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Aliases list */}
            <div className="space-y-2">
                {activeAliases.length === 0 ? (
                    <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                        No description aliases created yet. Aliases are created automatically when
                        you edit transaction descriptions, or you can add them here.
                    </p>
                ) : (
                    activeAliases.map((alias) => (
                        <AliasRow
                            key={alias.id}
                            alias={alias}
                            canDeleteResult={canDeleteAlias(alias)}
                            onUpdate={(id, data) => updateVault({ type: "update", id, data })}
                            onDelete={(id) => updateVault({ type: "delete", id })}
                        />
                    ))
                )}
            </div>

            {/* Help text */}
            <div className="text-muted-foreground text-sm">
                <p>
                    <strong>Tip:</strong> Description aliases replace raw imported transaction
                    descriptions with curated names. Edit a transaction&apos;s description in the
                    transaction table to create aliases automatically.
                </p>
            </div>
        </div>
    );
}

// ============================================
// AliasRow Component
// ============================================

interface AliasRowProps {
    alias: DescriptionAlias;
    canDeleteResult: { canDelete: boolean; reason?: string };
    onUpdate: (id: string, data: Partial<DescriptionAlias>) => void;
    onDelete: (id: string) => void;
}

function AliasRow({ alias, canDeleteResult, onUpdate, onDelete }: AliasRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(alias.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleStartEdit = useCallback(() => {
        setEditedName(alias.name);
        setIsEditing(true);
    }, [alias.name]);

    const handleSave = useCallback(() => {
        const trimmedName = editedName.trim();
        if (!trimmedName) {
            setIsEditing(false);
            return;
        }

        if (trimmedName !== alias.name) {
            onUpdate(alias.id, { name: trimmedName });
        }

        setIsEditing(false);
    }, [alias.id, alias.name, editedName, onUpdate]);

    const handleCancel = useCallback(() => {
        setEditedName(alias.name);
        setIsEditing(false);
    }, [alias.name]);

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

    const handleDeleteClick = useCallback(() => {
        if (showDeleteConfirm) {
            onDelete(alias.id);
            setShowDeleteConfirm(false);
        } else {
            setShowDeleteConfirm(true);
        }
    }, [alias.id, onDelete, showDeleteConfirm]);

    const handleDeleteCancel = useCallback(() => {
        setShowDeleteConfirm(false);
    }, []);

    const txCount = Object.keys(alias.transactionIds).filter((k) => k !== "$cid").length;

    return (
        <div
            data-testid={`alias-row-${alias.id}`}
            data-alias-name={alias.name}
            className={cn(
                "group bg-card flex items-center gap-3 rounded-lg border p-4 transition-colors",
                "hover:bg-accent/50"
            )}
        >
            {/* Icon */}
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <TextCursorInput className="text-muted-foreground h-5 w-5" />
            </div>

            {/* Name and details */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                {isEditing ? (
                    <div className="flex flex-col gap-3">
                        <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Alias name"
                            className="h-8 max-w-xs"
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSave}
                                className="h-8 gap-1"
                            >
                                <Check className="h-4 w-4 text-green-600" />
                                Save
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancel}
                                className="h-8 gap-1"
                            >
                                <X className="text-destructive h-4 w-4" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <span className="truncate font-medium">{alias.name}</span>
                        {txCount > 0 && (
                            <span className="text-muted-foreground text-xs">
                                {txCount} transaction{txCount !== 1 ? "s" : ""}
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!isEditing && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleStartEdit}
                            className="h-8 w-8 p-0"
                        >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>

                        {canDeleteResult.canDelete ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDeleteClick}
                                onBlur={handleDeleteCancel}
                                className={cn(
                                    "h-8 w-8 p-0",
                                    showDeleteConfirm &&
                                        "bg-destructive text-destructive-foreground"
                                )}
                            >
                                {showDeleteConfirm ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                <span className="sr-only">
                                    {showDeleteConfirm ? "Confirm delete" : "Delete"}
                                </span>
                            </Button>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled
                                            className="h-8 w-8 p-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>{canDeleteResult.reason}</TooltipContent>
                            </Tooltip>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
