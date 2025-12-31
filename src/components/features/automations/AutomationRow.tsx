"use client";

/**
 * AutomationRow Component
 *
 * Individual row in the automations table with inline editing support.
 * Shows automation name, conditions summary, actions summary, and controls.
 */

import {
	Check,
	ChevronDown,
	ChevronRight,
	GripVertical,
	Pencil,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Automation, Person, Status, Tag } from "@/lib/crdt/schema";
import { cn } from "@/lib/utils";
import { type ActionData, ActionEditor } from "./ActionEditor";
import { type ConditionData, ConditionEditor } from "./ConditionEditor";

export interface AutomationRowProps {
	/** Automation data */
	automation: Automation;
	/** All tags for action editor */
	tags: Tag[];
	/** All statuses for action editor */
	statuses: Status[];
	/** All people for action editor */
	people: Person[];
	/** Callback when automation is updated */
	onUpdate: (id: string, data: Partial<Automation>) => void;
	/** Callback when automation is deleted */
	onDelete: (id: string) => void;
	/** Whether this automation can be deleted */
	canDelete?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Summarize conditions for compact display.
 */
function summarizeConditions(conditions: ConditionData[]): string {
	if (conditions.length === 0) return "No conditions";
	if (conditions.length === 1) {
		const c = conditions[0];
		return `${c.column} ${c.operator} "${c.value}"`;
	}
	return `${conditions.length} conditions`;
}

/**
 * Summarize actions for compact display.
 */
function summarizeActions(actions: ActionData[], tags: Tag[], statuses: Status[]): string {
	if (actions.length === 0) return "No actions";

	const summaries = actions.map((a) => {
		switch (a.type) {
			case "setTags":
				const tagIds = Array.isArray(a.value) ? a.value : [];
				const tagNames = tagIds
					.map((id: string) => tags.find((t) => t.id === id)?.name)
					.filter(Boolean);
				return tagNames.length > 0 ? `Tags: ${tagNames.join(", ")}` : "Set tags";
			case "setStatus":
				const status = statuses.find((s) => s.id === a.value);
				return status ? `Status: ${status.name}` : "Set status";
			case "setAllocation":
				return "Set allocation";
			default:
				return a.type;
		}
	});

	return summaries.join("; ");
}

/**
 * Automation row component with inline editing.
 */
export function AutomationRow({
	automation,
	tags,
	statuses,
	people,
	onUpdate,
	onDelete,
	canDelete = true,
	className,
}: AutomationRowProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editedName, setEditedName] = useState(automation.name);
	const [editedConditions, setEditedConditions] = useState<ConditionData[]>(
		(automation.conditions ?? []) as ConditionData[]
	);
	const [editedActions, setEditedActions] = useState<ActionData[]>(
		(automation.actions ?? []) as ActionData[]
	);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Handle starting edit mode
	const handleStartEdit = useCallback(() => {
		setEditedName(automation.name);
		setEditedConditions((automation.conditions ?? []) as ConditionData[]);
		setEditedActions((automation.actions ?? []) as ActionData[]);
		setIsEditing(true);
		setIsExpanded(true);
	}, [automation]);

	// Handle saving inline edits
	const handleSave = useCallback(() => {
		const trimmedName = editedName.trim();
		if (!trimmedName) {
			setIsEditing(false);
			return;
		}

		const updates: Partial<Automation> = {};

		if (trimmedName !== automation.name) {
			updates.name = trimmedName;
		}

		// Check if conditions changed
		const conditionsChanged =
			JSON.stringify(editedConditions) !== JSON.stringify(automation.conditions);
		if (conditionsChanged) {
			updates.conditions = editedConditions as unknown as Automation["conditions"];
		}

		// Check if actions changed
		const actionsChanged = JSON.stringify(editedActions) !== JSON.stringify(automation.actions);
		if (actionsChanged) {
			updates.actions = editedActions as unknown as Automation["actions"];
		}

		if (Object.keys(updates).length > 0) {
			onUpdate(automation.id, updates);
		}

		setIsEditing(false);
	}, [automation, editedName, editedConditions, editedActions, onUpdate]);

	// Handle canceling inline edits
	const handleCancel = useCallback(() => {
		setEditedName(automation.name);
		setEditedConditions((automation.conditions ?? []) as ConditionData[]);
		setEditedActions((automation.actions ?? []) as ActionData[]);
		setIsEditing(false);
	}, [automation]);

	// Handle adding a new condition
	const handleAddCondition = useCallback(() => {
		const newCondition: ConditionData = {
			id: crypto.randomUUID(),
			column: "merchant",
			operator: "contains",
			value: "",
		};
		setEditedConditions([...editedConditions, newCondition]);
	}, [editedConditions]);

	// Handle updating a condition
	const handleUpdateCondition = useCallback(
		(index: number, condition: ConditionData) => {
			const newConditions = [...editedConditions];
			newConditions[index] = condition;
			setEditedConditions(newConditions);
		},
		[editedConditions]
	);

	// Handle removing a condition
	const handleRemoveCondition = useCallback(
		(index: number) => {
			setEditedConditions(editedConditions.filter((_, i) => i !== index));
		},
		[editedConditions]
	);

	// Handle adding a new action
	const handleAddAction = useCallback(() => {
		const newAction: ActionData = {
			id: crypto.randomUUID(),
			type: "setTags",
			value: [],
		};
		setEditedActions([...editedActions, newAction]);
	}, [editedActions]);

	// Handle updating an action
	const handleUpdateAction = useCallback(
		(index: number, action: ActionData) => {
			const newActions = [...editedActions];
			newActions[index] = action;
			setEditedActions(newActions);
		},
		[editedActions]
	);

	// Handle removing an action
	const handleRemoveAction = useCallback(
		(index: number) => {
			setEditedActions(editedActions.filter((_, i) => i !== index));
		},
		[editedActions]
	);

	// Handle delete confirmation
	const handleDeleteClick = useCallback(() => {
		if (showDeleteConfirm) {
			onDelete(automation.id);
			setShowDeleteConfirm(false);
		} else {
			setShowDeleteConfirm(true);
		}
	}, [showDeleteConfirm, automation.id, onDelete]);

	// Reset delete confirmation on blur
	const handleDeleteBlur = useCallback(() => {
		setTimeout(() => setShowDeleteConfirm(false), 200);
	}, []);

	const conditions = (automation.conditions ?? []) as ConditionData[];
	const actions = (automation.actions ?? []) as ActionData[];

	return (
		<div
			className={cn("group rounded-md border", isEditing && "ring-2 ring-primary", className)}
			data-testid={`automation-row-${automation.id}`}
		>
			{/* Header row */}
			<div className="flex items-center gap-2 p-3">
				{/* Drag handle */}
				<div className="cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
					<GripVertical className="h-4 w-4" />
				</div>

				{/* Expand toggle */}
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => setIsExpanded(!isExpanded)}
				>
					{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
				</Button>

				{/* Automation icon */}
				<Zap className="h-4 w-4 text-muted-foreground" />

				{/* Name */}
				<div className="min-w-0 flex-1">
					{isEditing ? (
						<Input
							value={editedName}
							onChange={(e) => setEditedName(e.target.value)}
							autoFocus
							className="h-8"
							placeholder="Automation name"
							data-testid="automation-name-input"
						/>
					) : (
						<span className="truncate font-medium">{automation.name}</span>
					)}
				</div>

				{/* Summary badges (when collapsed) */}
				{!isExpanded && !isEditing && (
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs">
							{summarizeConditions(conditions)}
						</Badge>
						<Badge variant="secondary" className="text-xs">
							{summarizeActions(actions, tags, statuses)}
						</Badge>
					</div>
				)}

				{/* Actions */}
				<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					{isEditing ? (
						<>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleSave}
								className="h-7 w-7"
								title="Save"
								data-testid="save-automation-btn"
							>
								<Check className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleCancel}
								className="h-7 w-7"
								title="Cancel"
								data-testid="cancel-automation-btn"
							>
								<X className="h-4 w-4" />
							</Button>
						</>
					) : (
						<>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleStartEdit}
								className="h-7 w-7"
								title="Edit"
								data-testid="edit-automation-btn"
							>
								<Pencil className="h-4 w-4" />
							</Button>
							{canDelete && (
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
									data-testid="delete-automation-btn"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</>
					)}
				</div>
			</div>

			{/* Expanded content */}
			{isExpanded && (
				<div className="space-y-4 border-t px-3 pt-3 pb-3">
					{/* Conditions */}
					<div className="space-y-2">
						<div className="font-medium text-sm">When transaction matches:</div>
						{isEditing ? (
							<>
								{editedConditions.map((condition, index) => (
									<ConditionEditor
										key={condition.id}
										condition={condition}
										onChange={(c) => handleUpdateCondition(index, c)}
										onRemove={() => handleRemoveCondition(index)}
										canRemove={editedConditions.length > 1}
									/>
								))}
								<Button
									variant="outline"
									size="sm"
									onClick={handleAddCondition}
									data-testid="add-condition-btn"
								>
									Add Condition
								</Button>
							</>
						) : (
							<div className="space-y-1 text-muted-foreground text-sm">
								{conditions.length === 0 ? (
									<span>No conditions defined</span>
								) : (
									conditions.map((c, i) => (
										<div key={i}>
											{c.column} {c.operator} &quot;{c.value}&quot;
											{c.caseSensitive && " (case sensitive)"}
										</div>
									))
								)}
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="space-y-2">
						<div className="font-medium text-sm">Then apply:</div>
						{isEditing ? (
							<>
								{editedActions.map((action, index) => (
									<ActionEditor
										key={action.id}
										action={action}
										onChange={(a) => handleUpdateAction(index, a)}
										onRemove={() => handleRemoveAction(index)}
										tags={tags}
										statuses={statuses}
										people={people}
										canRemove={editedActions.length > 1}
									/>
								))}
								<Button
									variant="outline"
									size="sm"
									onClick={handleAddAction}
									data-testid="add-action-btn"
								>
									Add Action
								</Button>
							</>
						) : (
							<div className="space-y-1 text-muted-foreground text-sm">
								{actions.length === 0 ? (
									<span>No actions defined</span>
								) : (
									<span>{summarizeActions(actions, tags, statuses)}</span>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
