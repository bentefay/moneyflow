"use client";

/**
 * Bulk Edit Toolbar
 *
 * Floating toolbar that appears when multiple transactions are selected.
 * Allows bulk operations like editing tags, status, description, or deleting.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { FilterOption } from "./filters/MultiSelectFilter";

export interface BulkEditToolbarProps {
	/** Number of selected transactions */
	selectedCount: number;
	/** Callback to clear selection */
	onClearSelection: () => void;
	/** Callback to delete selected transactions */
	onDelete?: () => void;
	/** Callback to set tags on selected transactions */
	onSetTags?: (tagIds: string[]) => void;
	/** Callback to set status on selected transactions */
	onSetStatus?: (statusId: string) => void;
	/** Callback to set account on selected transactions */
	onSetAccount?: (accountId: string) => void;
	/** Callback to set description on selected transactions */
	onSetDescription?: (description: string) => void;
	/** Available tags for bulk edit */
	availableTags?: FilterOption[];
	/** Available statuses for bulk edit */
	availableStatuses?: FilterOption[];
	/** Available accounts for bulk edit */
	availableAccounts?: FilterOption[];
	/** Additional CSS classes */
	className?: string;
}

type ActiveDropdown = "tags" | "status" | "account" | "description" | null;

/**
 * Bulk edit toolbar component.
 */
export function BulkEditToolbar({
	selectedCount,
	onClearSelection,
	onDelete,
	onSetTags,
	onSetStatus,
	onSetAccount,
	onSetDescription,
	availableTags = [],
	availableStatuses = [],
	availableAccounts = [],
	className,
}: BulkEditToolbarProps) {
	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [descriptionValue, setDescriptionValue] = useState("");
	const descriptionInputRef = useRef<HTMLInputElement>(null);

	// Focus input when description dropdown opens
	useEffect(() => {
		if (activeDropdown === "description" && descriptionInputRef.current) {
			descriptionInputRef.current.focus();
		}
	}, [activeDropdown]);

	// Handle Escape key to close dropdown
	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setActiveDropdown(null);
			setDescriptionValue("");
		}
	}, []);

	if (selectedCount === 0) {
		return null;
	}

	const handleDelete = () => {
		if (confirmDelete) {
			onDelete?.();
			setConfirmDelete(false);
		} else {
			setConfirmDelete(true);
		}
	};

	const closeDropdowns = () => {
		setActiveDropdown(null);
		setConfirmDelete(false);
	};

	return (
		<div
			className={cn(
				"fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-background/95 shadow-lg backdrop-blur-sm",
				className
			)}
			data-testid="bulk-edit-toolbar"
		>
			<div className="flex items-center gap-2 px-4 py-3">
				{/* Selection count */}
				<span className="font-medium text-sm">{selectedCount} selected</span>

				<div className="mx-2 h-6 w-px bg-border" />

				{/* Tags button */}
				{onSetTags && availableTags.length > 0 && (
					<div className="relative">
						<button
							type="button"
							onClick={() => setActiveDropdown(activeDropdown === "tags" ? null : "tags")}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								activeDropdown === "tags" && "bg-accent"
							)}
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
								/>
							</svg>
							Set Tags
						</button>

						{activeDropdown === "tags" && (
							<div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border bg-popover p-2 shadow-lg">
								{availableTags.map((tag) => (
									<button
										key={tag.id}
										type="button"
										onClick={() => {
											onSetTags([tag.id]);
											closeDropdowns();
										}}
										className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
									>
										{tag.label}
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Status button */}
				{onSetStatus && availableStatuses.length > 0 && (
					<div className="relative">
						<button
							type="button"
							onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								activeDropdown === "status" && "bg-accent"
							)}
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Set Status
						</button>

						{activeDropdown === "status" && (
							<div className="absolute bottom-full left-0 mb-2 w-40 rounded-lg border bg-popover p-2 shadow-lg">
								{availableStatuses.map((status) => (
									<button
										key={status.id}
										type="button"
										onClick={() => {
											onSetStatus(status.id);
											closeDropdowns();
										}}
										className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
									>
										{status.label}
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Account button */}
				{onSetAccount && availableAccounts.length > 0 && (
					<div className="relative">
						<button
							type="button"
							onClick={() => setActiveDropdown(activeDropdown === "account" ? null : "account")}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								activeDropdown === "account" && "bg-accent"
							)}
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
								/>
							</svg>
							Set Account
						</button>

						{activeDropdown === "account" && (
							<div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border bg-popover p-2 shadow-lg">
								{availableAccounts.map((account) => (
									<button
										key={account.id}
										type="button"
										onClick={() => {
											onSetAccount(account.id);
											closeDropdowns();
										}}
										className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
									>
										{account.label}
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Description button */}
				{onSetDescription && (
					<div className="relative">
						<button
							type="button"
							onClick={() =>
								setActiveDropdown(activeDropdown === "description" ? null : "description")
							}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								activeDropdown === "description" && "bg-accent"
							)}
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
							Set Description
						</button>

						{activeDropdown === "description" && (
							<div
								className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border bg-popover p-3 shadow-lg"
								onKeyDown={handleKeyDown}
							>
								<input
									ref={descriptionInputRef}
									type="text"
									value={descriptionValue}
									onChange={(e) => setDescriptionValue(e.target.value)}
									placeholder="Enter description..."
									className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
									onKeyDown={(e) => {
										if (e.key === "Enter" && descriptionValue.trim()) {
											onSetDescription(descriptionValue.trim());
											setDescriptionValue("");
											closeDropdowns();
										} else if (e.key === "Escape") {
											setDescriptionValue("");
											closeDropdowns();
										}
									}}
								/>
								<div className="mt-2 flex justify-end gap-2">
									<button
										type="button"
										onClick={() => {
											setDescriptionValue("");
											closeDropdowns();
										}}
										className="rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={() => {
											if (descriptionValue.trim()) {
												onSetDescription(descriptionValue.trim());
												setDescriptionValue("");
												closeDropdowns();
											}
										}}
										disabled={!descriptionValue.trim()}
										className="rounded bg-primary px-3 py-1 text-primary-foreground text-sm disabled:opacity-50"
									>
										Apply
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Delete button */}
				{onDelete && (
					<button
						type="button"
						onClick={handleDelete}
						data-testid="bulk-delete"
						className={cn(
							"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
							"hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive",
							confirmDelete ? "bg-destructive text-destructive-foreground" : "text-destructive"
						)}
					>
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
						{confirmDelete ? "Confirm Delete" : "Delete"}
					</button>
				)}

				<div className="mx-2 h-6 w-px bg-border" />

				{/* Clear selection */}
				<button
					type="button"
					onClick={() => {
						onClearSelection();
						closeDropdowns();
					}}
					data-testid="clear-selection"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					Clear
				</button>
			</div>
		</div>
	);
}
