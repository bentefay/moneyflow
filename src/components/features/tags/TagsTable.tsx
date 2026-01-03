"use client";

/**
 * TagsTable Component
 *
 * Container component for managing tags in the vault.
 * Displays tags in hierarchical order with inline editing.
 */

import { Plus, Tag as TagIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useVaultAction, useVaultSelector } from "@/lib/crdt/context";
import type { Tag, TagInput } from "@/lib/crdt/schema";
import { getNextTagColor } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { ParentTagSelector } from "./ParentTagSelector";
import { TagRow } from "./TagRow";

export interface TagsTableProps {
	/** Additional CSS classes */
	className?: string;
}

/**
 * Filter out loro-mirror's $cid from object entries.
 */
function filterCid<T>(record: Record<string, T>): Array<[string, T]> {
	return Object.entries(record).filter(([key]) => key !== "$cid");
}

interface TagWithDepth {
	tag: Tag;
	depth: number;
	parentName?: string;
}

/**
 * Build hierarchical list of tags with depths for display.
 */
function buildHierarchicalTagList(tags: Tag[]): TagWithDepth[] {
	const result: TagWithDepth[] = [];
	const tagMap = new Map<string, Tag>();
	const childrenMap = new Map<string, Tag[]>();

	// Build maps
	for (const tag of tags) {
		tagMap.set(tag.id, tag);
		const parentId = tag.parentTagId ?? "";
		if (!childrenMap.has(parentId)) {
			childrenMap.set(parentId, []);
		}
		childrenMap.get(parentId)!.push(tag);
	}

	// Sort children alphabetically
	for (const children of childrenMap.values()) {
		children.sort((a, b) => a.name.localeCompare(b.name));
	}

	// DFS traversal
	function traverse(parentId: string, depth: number) {
		const children = childrenMap.get(parentId) ?? [];
		for (const child of children) {
			const parent = parentId ? tagMap.get(parentId) : undefined;
			result.push({
				tag: child,
				depth,
				parentName: parent?.name,
			});
			traverse(child.id, depth + 1);
		}
	}

	traverse("", 0);

	return result;
}

/**
 * Check if a tag has any children.
 */
function hasChildren(tagId: string, tags: Tag[]): boolean {
	return tags.some((t) => t.parentTagId === tagId);
}

/**
 * Tags table with hierarchical display and inline editing.
 */
export function TagsTable({ className }: TagsTableProps) {
	const [isAdding, setIsAdding] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [newTagParentId, setNewTagParentId] = useState("");
	const [newTagIsTransfer, setNewTagIsTransfer] = useState(false);

	// Get tags and transactions from CRDT state
	const tags = useVaultSelector((state) => state.tags);
	const transactions = useVaultSelector((state) => state.transactions);

	// Create CRDT mutation action
	const updateVault = useVaultAction(
		(
			draft,
			action: { type: "add" | "update" | "delete"; id: string; data?: Partial<TagInput> }
		) => {
			switch (action.type) {
				case "add":
					if (action.data) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(draft.tags as any)[action.id] = action.data as TagInput;
					}
					break;
				case "update":
					if (draft.tags[action.id] && action.data) {
						Object.assign(draft.tags[action.id], action.data);
					}
					break;
				case "delete":
					if (draft.tags[action.id]) {
						draft.tags[action.id].deletedAt = Date.now();
					}
					break;
			}
		},
		[]
	);

	// Get list of active tags (not deleted)
	const activeTags = useMemo(() => {
		return filterCid(tags as unknown as Record<string, Tag>)
			.filter(([, tag]) => tag && !tag.deletedAt)
			.map(([id, tag]) => ({ ...tag, id }));
	}, [tags]);

	// Build hierarchical list for display
	const hierarchicalTags = useMemo(() => buildHierarchicalTagList(activeTags), [activeTags]);

	// Check if a tag has transactions
	const tagHasTransactions = useCallback(
		(tagId: string): boolean => {
			for (const [, tx] of filterCid(
				transactions as unknown as Record<string, { tagIds?: string[]; deletedAt?: number }>
			)) {
				if (tx && !tx.deletedAt && tx.tagIds) {
					if (tx.tagIds.includes(tagId)) {
						return true;
					}
				}
			}
			return false;
		},
		[transactions]
	);

	// Check if a tag can be deleted (no transactions and no children)
	const canDeleteTag = useCallback(
		(tagId: string): boolean => {
			return !tagHasTransactions(tagId) && !hasChildren(tagId, activeTags);
		},
		[tagHasTransactions, activeTags]
	);

	// Handle adding a new tag
	const handleAdd = useCallback(() => {
		const trimmedName = newTagName.trim();
		if (!trimmedName) return;

		const id = crypto.randomUUID();
		const usedColors = activeTags.map((t) => t.color);
		const color = getNextTagColor(usedColors);

		updateVault({
			type: "add",
			id,
			data: {
				id,
				name: trimmedName,
				color,
				parentTagId: newTagParentId || undefined,
				isTransfer: newTagIsTransfer,
			},
		});

		setNewTagName("");
		setNewTagParentId("");
		setNewTagIsTransfer(false);
		setIsAdding(false);
	}, [newTagName, newTagParentId, newTagIsTransfer, activeTags, updateVault]);

	// Handle updating a tag
	const handleUpdate = useCallback(
		(id: string, data: Partial<Tag>) => {
			updateVault({ type: "update", id, data });
		},
		[updateVault]
	);

	// Handle deleting a tag
	const handleDelete = useCallback(
		(id: string) => {
			updateVault({ type: "delete", id });
		},
		[updateVault]
	);

	// Handle keyboard events for add input
	const handleAddKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleAdd();
			} else if (e.key === "Escape") {
				e.preventDefault();
				setIsAdding(false);
				setNewTagName("");
				setNewTagParentId("");
				setNewTagIsTransfer(false);
			}
		},
		[handleAdd]
	);

	// Handle cancel add
	const handleCancelAdd = useCallback(() => {
		setIsAdding(false);
		setNewTagName("");
		setNewTagParentId("");
		setNewTagIsTransfer(false);
	}, []);

	return (
		<div className={cn("space-y-6", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<TagIcon className="h-5 w-5" />
					<h2 className="font-semibold text-lg">Tags</h2>
					<span className="text-muted-foreground text-sm">({activeTags.length})</span>
				</div>

				{!isAdding && (
					<Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Tag
					</Button>
				)}
			</div>

			{/* Add new tag form */}
			{isAdding && (
				<div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
					<div className="flex items-center gap-2">
						<Input
							value={newTagName}
							onChange={(e) => setNewTagName(e.target.value)}
							onKeyDown={handleAddKeyDown}
							placeholder="Enter tag name"
							className="max-w-xs"
							autoFocus
						/>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">Parent:</span>
						<ParentTagSelector
							value={newTagParentId}
							onChange={setNewTagParentId}
							availableTags={activeTags}
							className="max-w-xs"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox
							id="new-tag-transfer"
							checked={newTagIsTransfer}
							onCheckedChange={(checked) => setNewTagIsTransfer(checked === true)}
						/>
						<label
							htmlFor="new-tag-transfer"
							className="cursor-pointer text-muted-foreground text-sm"
						>
							Transfer tag (exclude from expense reports)
						</label>
					</div>

					<div className="flex items-center gap-2">
						<Button size="sm" onClick={handleAdd} disabled={!newTagName.trim()}>
							Add Tag
						</Button>
						<Button size="sm" variant="ghost" onClick={handleCancelAdd}>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Tags list */}
			<div className="space-y-2">
				{activeTags.length === 0 ? (
					<p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
						No tags created yet. Add tags to categorize your transactions.
					</p>
				) : (
					hierarchicalTags.map(({ tag, depth, parentName }) => (
						<TagRow
							key={tag.id}
							tag={tag}
							allTags={activeTags}
							depth={depth}
							parentName={parentName}
							onUpdate={handleUpdate}
							onDelete={handleDelete}
							canDelete={canDeleteTag(tag.id)}
						/>
					))
				)}
			</div>

			{/* Help text */}
			<div className="text-muted-foreground text-sm">
				<p>
					<strong>Tip:</strong> Use hierarchical tags (e.g., Food → Groceries, Food → Restaurants)
					to organize categories. Mark tags as &quot;Transfer&quot; to exclude internal money
					movements from expense reports.
				</p>
			</div>
		</div>
	);
}
