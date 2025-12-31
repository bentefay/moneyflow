"use client";

/**
 * AutomationsTable Component
 *
 * Displays all automations with drag-to-reorder and inline editing.
 * Automations are executed in order (lower order values first).
 */

import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultAction, useVaultSelector } from "@/lib/crdt/context";
import type { Automation, AutomationInput, Person, Status, Tag } from "@/lib/crdt/schema";
import { AutomationRow } from "./AutomationRow";

export interface AutomationsTableProps {
	/** Additional CSS classes */
	className?: string;
}

/**
 * Filter out loro-mirror's $cid from object entries.
 */
function filterCid<T>(record: Record<string, T>): Array<[string, T]> {
	return Object.entries(record).filter(([key]) => key !== "$cid");
}

/**
 * Automations table with creation and management.
 */
export function AutomationsTable({ className }: AutomationsTableProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");

	// Get data from CRDT state
	const automations = useVaultSelector((state) => state.automations);
	const tags = useVaultSelector((state) => state.tags);
	const statuses = useVaultSelector((state) => state.statuses);
	const people = useVaultSelector((state) => state.people);

	// Create CRDT mutation action
	const updateVault = useVaultAction(
		(
			draft,
			action: {
				type: "add" | "update" | "delete" | "reorder";
				id: string;
				data?: Partial<AutomationInput>;
				newOrder?: number;
			}
		) => {
			switch (action.type) {
				case "add":
					if (action.data) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(draft.automations as any)[action.id] = action.data as AutomationInput;
					}
					break;
				case "update":
					if (draft.automations[action.id] && action.data) {
						Object.assign(draft.automations[action.id], action.data);
					}
					break;
				case "delete":
					if (draft.automations[action.id]) {
						draft.automations[action.id].deletedAt = Date.now();
					}
					break;
				case "reorder":
					if (draft.automations[action.id] && action.newOrder !== undefined) {
						draft.automations[action.id].order = action.newOrder;
					}
					break;
			}
		},
		[]
	);

	// Get list of active automations (not deleted)
	const activeAutomations = useMemo(() => {
		return filterCid(automations as unknown as Record<string, Automation>)
			.filter(([, automation]) => automation && !automation.deletedAt)
			.map(([id, automation]) => ({ ...automation, id }));
	}, [automations]);

	// Sort automations by order
	const sortedAutomations = useMemo(() => {
		return [...activeAutomations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	}, [activeAutomations]);

	// Get active tags, statuses, and people
	const activeTags = useMemo(() => {
		return filterCid(tags as unknown as Record<string, Tag>)
			.filter(([, tag]) => tag && !tag.deletedAt)
			.map(([id, tag]) => ({ ...tag, id }));
	}, [tags]);

	const activeStatuses = useMemo(() => {
		return filterCid(statuses as unknown as Record<string, Status>)
			.filter(([, status]) => status && !status.deletedAt)
			.map(([id, status]) => ({ ...status, id }));
	}, [statuses]);

	const activePeople = useMemo(() => {
		return filterCid(people as unknown as Record<string, Person>)
			.filter(([, person]) => person && !person.deletedAt)
			.map(([id, person]) => ({ ...person, id }));
	}, [people]);

	// Handle creating a new automation
	const handleCreate = useCallback(() => {
		const trimmedName = newName.trim();
		if (!trimmedName) return;

		const id = crypto.randomUUID();
		const maxOrder = sortedAutomations.reduce((max, a) => Math.max(max, a.order ?? 0), 0);

		const automationData: Record<string, unknown> = {
			id,
			name: trimmedName,
			conditions: [],
			actions: [],
			order: maxOrder + 1,
			excludedTransactionIds: [],
		};

		updateVault({ type: "add", id, data: automationData as Partial<AutomationInput> });

		setNewName("");
		setIsCreating(false);
	}, [newName, sortedAutomations, updateVault]);

	// Handle canceling creation
	const handleCancelCreate = useCallback(() => {
		setNewName("");
		setIsCreating(false);
	}, []);

	// Handle keyboard shortcuts in creation mode
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				handleCreate();
			} else if (e.key === "Escape") {
				handleCancelCreate();
			}
		},
		[handleCreate, handleCancelCreate]
	);

	// Handle updating an automation
	const handleUpdate = useCallback(
		(id: string, data: Partial<Automation>) => {
			updateVault({ type: "update", id, data });
		},
		[updateVault]
	);

	// Handle deleting an automation
	const handleDelete = useCallback(
		(id: string) => {
			updateVault({ type: "delete", id });
		},
		[updateVault]
	);

	return (
		<div className={className}>
			{/* Automation list */}
			<div className="space-y-2">
				{sortedAutomations.map((automation) => (
					<AutomationRow
						key={automation.id}
						automation={automation}
						tags={activeTags}
						statuses={activeStatuses}
						people={activePeople}
						onUpdate={handleUpdate}
						onDelete={handleDelete}
					/>
				))}

				{sortedAutomations.length === 0 && !isCreating && (
					<div className="py-8 text-center text-muted-foreground">
						<p>No automations yet.</p>
						<p className="mt-1 text-sm">
							Create automation rules to automatically categorize transactions.
						</p>
					</div>
				)}
			</div>

			{/* Create new automation form */}
			{isCreating ? (
				<div className="mt-4 flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2">
					<div className="flex-1">
						<Input
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={handleKeyDown}
							autoFocus
							placeholder="Automation name"
							className="h-8"
							data-testid="new-automation-name-input"
						/>
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="default"
							size="sm"
							onClick={handleCreate}
							disabled={!newName.trim()}
							data-testid="create-automation-btn"
						>
							Create
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleCancelCreate}
							data-testid="cancel-create-automation-btn"
						>
							Cancel
						</Button>
					</div>
				</div>
			) : (
				<Button
					variant="outline"
					onClick={() => setIsCreating(true)}
					className="mt-4 w-full"
					data-testid="add-automation-btn"
				>
					<Plus className="mr-2 h-4 w-4" />
					Add Automation
				</Button>
			)}
		</div>
	);
}
