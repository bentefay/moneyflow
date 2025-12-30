"use client";

/**
 * StatusRow Component
 *
 * Individual row in the statuses table with inline editing support.
 * Shows status name, behavior flag, default indicator, and actions.
 */

import { Check, CircleCheck, CircleDot, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Status } from "@/lib/crdt/schema";
import { cn } from "@/lib/utils";
import { BehaviorSelector } from "./BehaviorSelector";

export interface StatusRowProps {
	/** Status data */
	status: Status;
	/** Callback when status is updated */
	onUpdate: (id: string, data: Partial<Status>) => void;
	/** Callback when status is deleted */
	onDelete: (id: string) => void;
	/** Callback when status is set as default */
	onSetDefault: (id: string) => void;
	/** Whether this status can be deleted (not if it has transactions or is default) */
	canDelete?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Status row component with inline editing.
 */
export function StatusRow({
	status,
	onUpdate,
	onDelete,
	onSetDefault,
	canDelete = true,
	className,
}: StatusRowProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedName, setEditedName] = useState(status.name);
	const [editedBehavior, setEditedBehavior] = useState(status.behavior ?? "");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Handle starting edit mode
	const handleStartEdit = useCallback(() => {
		setEditedName(status.name);
		setEditedBehavior(status.behavior ?? "");
		setIsEditing(true);
	}, [status.name, status.behavior]);

	// Handle saving inline edits
	const handleSave = useCallback(() => {
		const trimmedName = editedName.trim();
		if (!trimmedName) {
			setIsEditing(false);
			return;
		}

		const updates: Partial<Status> = {};

		if (trimmedName !== status.name) {
			updates.name = trimmedName;
		}

		const newBehavior = editedBehavior || undefined;
		if (newBehavior !== status.behavior) {
			updates.behavior = newBehavior;
		}

		if (Object.keys(updates).length > 0) {
			onUpdate(status.id, updates);
		}

		setIsEditing(false);
	}, [status.id, status.name, status.behavior, editedName, editedBehavior, onUpdate]);

	// Handle canceling inline edits
	const handleCancel = useCallback(() => {
		setEditedName(status.name);
		setEditedBehavior(status.behavior ?? "");
		setIsEditing(false);
	}, [status.name, status.behavior]);

	// Handle keyboard shortcuts in edit mode
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				handleSave();
			} else if (e.key === "Escape") {
				handleCancel();
			}
		},
		[handleSave, handleCancel]
	);

	// Handle delete confirmation
	const handleDeleteClick = useCallback(() => {
		if (showDeleteConfirm) {
			onDelete(status.id);
			setShowDeleteConfirm(false);
		} else {
			setShowDeleteConfirm(true);
		}
	}, [showDeleteConfirm, status.id, onDelete]);

	// Reset delete confirmation on blur
	const handleDeleteBlur = useCallback(() => {
		setTimeout(() => setShowDeleteConfirm(false), 200);
	}, []);

	return (
		<div
			className={cn(
				"group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50",
				isEditing && "bg-muted/50",
				className
			)}
			data-testid={`status-row-${status.id}`}
		>
			{/* Status Icon */}
			<div className="flex-shrink-0 text-muted-foreground">
				{status.isDefault ? (
					<CircleCheck className="h-4 w-4 text-primary" />
				) : (
					<CircleDot className="h-4 w-4" />
				)}
			</div>

			{/* Status Name */}
			<div className="min-w-0 flex-1">
				{isEditing ? (
					<Input
						value={editedName}
						onChange={(e) => setEditedName(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus
						className="h-8"
						placeholder="Status name"
						data-testid="status-name-input"
					/>
				) : (
					<div className="flex items-center gap-2">
						<span className="truncate font-medium">{status.name}</span>
						{status.isDefault && (
							<Badge variant="secondary" className="text-xs">
								Default
							</Badge>
						)}
					</div>
				)}
			</div>

			{/* Behavior */}
			<div className="w-40 flex-shrink-0">
				{isEditing ? (
					<BehaviorSelector value={editedBehavior} onChange={setEditedBehavior} />
				) : (
					status.behavior === "treatAsPaid" && (
						<Badge variant="outline" className="text-xs">
							Treat as Paid
						</Badge>
					)
				)}
			</div>

			{/* Actions */}
			<div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{isEditing ? (
					<>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleSave}
							className="h-7 w-7"
							title="Save"
							data-testid="save-status-btn"
						>
							<Check className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleCancel}
							className="h-7 w-7"
							title="Cancel"
							data-testid="cancel-status-btn"
						>
							<X className="h-4 w-4" />
						</Button>
					</>
				) : (
					<>
						{!status.isDefault && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onSetDefault(status.id)}
								className="h-7 w-7"
								title="Set as default"
								data-testid="set-default-btn"
							>
								<CircleCheck className="h-4 w-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							onClick={handleStartEdit}
							className="h-7 w-7"
							title="Edit"
							data-testid="edit-status-btn"
						>
							<Pencil className="h-4 w-4" />
						</Button>
						{canDelete && !status.isDefault && (
							<Button
								variant="ghost"
								size="icon"
								onClick={handleDeleteClick}
								onBlur={handleDeleteBlur}
								className={cn(
									"h-7 w-7",
									showDeleteConfirm && "text-destructive hover:text-destructive"
								)}
								title={showDeleteConfirm ? "Click again to confirm" : "Delete"}
								data-testid="delete-status-btn"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</>
				)}
			</div>
		</div>
	);
}
