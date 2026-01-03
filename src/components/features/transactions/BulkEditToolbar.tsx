"use client";

/**
 * Bulk Edit Toolbar
 *
 * Floating toolbar that appears when multiple transactions are selected.
 * Allows bulk operations like editing tags, status, notes, amount, or deleting.
 * Includes progress indicator for large bulk operations.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FilterOption } from "./filters/MultiSelectFilter";

export interface BulkEditProgress {
	current: number;
	total: number;
	operation: string;
}

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
	/** Callback to set notes on selected transactions */
	onSetNotes?: (notes: string) => void;
	/** Callback to set amount on selected transactions */
	onSetAmount?: (amount: number) => void;
	/** Available tags for bulk edit */
	availableTags?: FilterOption[];
	/** Available statuses for bulk edit */
	availableStatuses?: FilterOption[];
	/** Available accounts for bulk edit */
	availableAccounts?: FilterOption[];
	/** Progress of current bulk operation */
	progress?: BulkEditProgress | null;
	/** Additional CSS classes */
	className?: string;
}

type ActiveDropdown = "tags" | "status" | "account" | "notes" | "amount" | null;

/**
 * Progress bar component for bulk operations.
 */
function ProgressBar({ progress }: { progress: BulkEditProgress }) {
	const percentage = Math.round((progress.current / progress.total) * 100);

	return (
		<div className="flex items-center gap-3" data-testid="bulk-progress">
			<div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full bg-primary transition-all duration-150"
					style={{ width: `${percentage}%` }}
				/>
			</div>
			<span className="text-muted-foreground text-xs">
				{progress.current}/{progress.total}
			</span>
		</div>
	);
}

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
	onSetNotes,
	onSetAmount,
	availableTags = [],
	availableStatuses = [],
	availableAccounts = [],
	progress,
	className,
}: BulkEditToolbarProps) {
	const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [notesValue, setNotesValue] = useState("");
	const [amountValue, setAmountValue] = useState("");
	const notesInputRef = useRef<HTMLInputElement>(null);
	const amountInputRef = useRef<HTMLInputElement>(null);

	// Focus input when dropdown opens
	useEffect(() => {
		if (activeDropdown === "notes" && notesInputRef.current) {
			notesInputRef.current.focus();
		}
		if (activeDropdown === "amount" && amountInputRef.current) {
			amountInputRef.current.focus();
		}
	}, [activeDropdown]);

	// Handle Escape key to close dropdown
	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setActiveDropdown(null);
			setNotesValue("");
			setAmountValue("");
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

	const handleAmountSubmit = () => {
		const parsed = Number.parseFloat(amountValue);
		if (!Number.isNaN(parsed) && onSetAmount) {
			// Convert to cents (minor units)
			const amountInCents = Math.round(parsed * 100);
			onSetAmount(amountInCents);
			setAmountValue("");
			closeDropdowns();
		}
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
				{/* Progress indicator or selection count */}
				{progress ? (
					<ProgressBar progress={progress} />
				) : (
					<span className="font-medium text-sm text-nowrap">Edit {selectedCount}</span>
				)}

				<div className="mx-2 h-6 w-px bg-border" />

				{/* Tags button */}
				{onSetTags && availableTags.length > 0 && (
					<div className="relative">
						<button
							type="button"
							data-testid="bulk-edit-tags-button"
							onClick={() => setActiveDropdown(activeDropdown === "tags" ? null : "tags")}
							disabled={!!progress}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								"disabled:pointer-events-none disabled:opacity-50",
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
							Tags
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
							data-testid="bulk-edit-status-button"
							onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
							disabled={!!progress}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								"disabled:pointer-events-none disabled:opacity-50",
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
							Status
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
							disabled={!!progress}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								"disabled:pointer-events-none disabled:opacity-50",
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
							Account
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

				{/* Notes button */}
				{onSetNotes && (
					<div className="relative">
						<button
							type="button"
							data-testid="bulk-edit-notes-button"
							onClick={() => setActiveDropdown(activeDropdown === "notes" ? null : "notes")}
							disabled={!!progress}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								"disabled:pointer-events-none disabled:opacity-50",
								activeDropdown === "notes" && "bg-accent"
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
							Notes
						</button>

						{activeDropdown === "notes" && (
							<div
								className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border bg-popover p-3 shadow-lg"
								onKeyDown={handleKeyDown}
							>
								<Input
									ref={notesInputRef}
									type="text"
									value={notesValue}
									onChange={(e) => setNotesValue(e.target.value)}
									placeholder="Enter notes..."
									onKeyDown={(e) => {
										if (e.key === "Enter" && notesValue.trim()) {
											onSetNotes(notesValue.trim());
											setNotesValue("");
											closeDropdowns();
										} else if (e.key === "Escape") {
											setNotesValue("");
											closeDropdowns();
										}
									}}
								/>
								<div className="mt-2 flex justify-end gap-2">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											setNotesValue("");
											closeDropdowns();
										}}
									>
										Cancel
									</Button>
									<Button
										type="button"
										size="sm"
										onClick={() => {
											if (notesValue.trim()) {
												onSetNotes(notesValue.trim());
												setNotesValue("");
												closeDropdowns();
											}
										}}
										disabled={!notesValue.trim()}
									>
										Apply
									</Button>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Amount button */}
				{onSetAmount && (
					<div className="relative">
						<button
							type="button"
							onClick={() => setActiveDropdown(activeDropdown === "amount" ? null : "amount")}
							disabled={!!progress}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
								"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary",
								"disabled:pointer-events-none disabled:opacity-50",
								activeDropdown === "amount" && "bg-accent"
							)}
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Amount
						</button>

						{activeDropdown === "amount" && (
							<div
								className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border bg-popover p-3 shadow-lg"
								onKeyDown={handleKeyDown}
							>
								<div className="relative">
									<span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground text-sm">
										$
									</span>
									<Input
										ref={amountInputRef}
										type="number"
										step="0.01"
										value={amountValue}
										onChange={(e) => setAmountValue(e.target.value)}
										placeholder="0.00"
										className="pl-7"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleAmountSubmit();
											} else if (e.key === "Escape") {
												setAmountValue("");
												closeDropdowns();
											}
										}}
									/>
								</div>
								<div className="mt-2 flex justify-end gap-2">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											setAmountValue("");
											closeDropdowns();
										}}
									>
										Cancel
									</Button>
									<Button
										type="button"
										size="sm"
										onClick={handleAmountSubmit}
										disabled={!amountValue || Number.isNaN(Number.parseFloat(amountValue))}
									>
										Apply
									</Button>
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
						disabled={!!progress}
						data-testid="bulk-delete"
						className={cn(
							"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
							"hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive",
							"disabled:pointer-events-none disabled:opacity-50",
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
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						onClearSelection();
						closeDropdowns();
					}}
					disabled={!!progress}
					data-testid="clear-selection"
				>
					Clear
				</Button>
			</div>
		</div>
	);
}
