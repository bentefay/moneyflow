"use client";

/**
 * Transaction Row
 *
 * Individual row in the transaction list with presence highlighting.
 * Shows colored border when another user is focused on or editing the row.
 * Supports duplicate detection, resolution actions, deletion, and inline editing.
 *
 * Also supports "add" mode for creating new transactions with the same
 * layout and controls as existing transaction rows.
 */

import { Check, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountCombobox, AccountOption } from "@/components/features/accounts";
import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hashToColor } from "@/lib/utils/color";
import { CheckboxCell } from "./cells/CheckboxCell";
import { InlineEditableAmount } from "./cells/InlineEditableAmount";
import { InlineEditableDate } from "./cells/InlineEditableDate";
import { InlineEditableStatus, type StatusOption } from "./cells/InlineEditableStatus";
import { InlineEditableTags, type TagOption } from "./cells/InlineEditableTags";
import { InlineEditableText } from "./cells/InlineEditableText";
import { DuplicateBadge } from "./DuplicateBadge";
import { TRANSACTION_GRID_TEMPLATE } from "./TransactionTable";

/** Mode for the transaction row */
export type TransactionRowMode = "view" | "add";

export interface TransactionRowData {
	id: string;
	date: string;
	/** Description text (imported from bank file or user-entered) */
	description: string;
	/** Notes/memo (shown in expandable row) */
	notes?: string;
	amount: number;
	account?: string;
	accountId?: string;
	status?: string;
	statusId?: string;
	tags?: Array<{ id: string; name: string }>;
	balance?: number;
	/** ID of suspected duplicate transaction */
	possibleDuplicateOf?: string;
}

export interface TransactionRowPresence {
	/** User ID who is focused on this row */
	focusedBy?: string;
	/** User ID who is editing this row */
	editingBy?: string;
	/** Field being edited */
	editingField?: string;
}

export interface TransactionRowProps {
	/** Mode: "view" for existing transactions, "add" for new transaction entry */
	mode?: TransactionRowMode;
	/** Transaction data (required for view mode, optional for add mode) */
	transaction?: TransactionRowData;
	/** Presence info for this row */
	presence?: TransactionRowPresence;
	/** Current user's pubkey hash */
	currentUserId?: string;
	/** Whether this row is selected */
	isSelected?: boolean;
	/** Whether the notes row is expanded */
	isExpanded?: boolean;
	/** Available accounts for inline editing */
	availableAccounts?: AccountOption[];
	/** Available statuses for inline editing */
	availableStatuses?: StatusOption[];
	/** Available tags for inline editing */
	availableTags?: TagOption[];
	/** Callback when a new tag should be created */
	onCreateTag?: (name: string) => Promise<TagOption>;
	/** Callback when row is clicked (for navigation/focus, not selection) */
	onClick?: () => void;
	/** Callback when row is focused */
	onFocus?: () => void;
	/** Callback when resolving duplicate (keep = clear flag, delete = remove) */
	onResolveDuplicate?: (action: "keep" | "delete") => void;
	/** Callback when deleting the transaction */
	onDelete?: () => void;
	/** Callback when a field is updated via inline edit */
	onFieldUpdate?: (field: keyof TransactionRowData, value: unknown) => void;
	/** Callback when checkbox is toggled */
	onCheckboxChange?: () => void;
	/** Callback when shift-clicking checkbox for range selection */
	onCheckboxShiftClick?: () => void;
	/** Callback when expand/collapse is toggled */
	onToggleExpand?: () => void;
	/** Callback when a new transaction is submitted (add mode only) */
	onAdd?: (data: NewTransactionData) => void;
	/** Callback when add is cancelled (add mode only) */
	onCancel?: () => void;
	/** Default account ID for add mode */
	defaultAccountId?: string;
	/** Default status ID for add mode */
	defaultStatusId?: string;
	/** Additional CSS classes */
	className?: string;
}

/** Data for a new transaction (add mode) */
export interface NewTransactionData {
	date: string;
	description: string;
	notes?: string;
	amount: number;
	accountId: string;
	statusId?: string;
	tagIds?: string[];
}

/**
 * Transaction row component with presence highlighting.
 * Supports both "view" mode (existing transactions) and "add" mode (new entry).
 */
export function TransactionRow({
	mode = "view",
	transaction,
	presence,
	currentUserId,
	isSelected = false,
	isExpanded = false,
	availableAccounts = [],
	availableStatuses = [],
	availableTags = [],
	onCreateTag,
	onClick,
	onFocus,
	onResolveDuplicate,
	onDelete,
	onFieldUpdate,
	onCheckboxChange,
	onCheckboxShiftClick,
	onToggleExpand,
	onAdd,
	onCancel,
	defaultAccountId,
	defaultStatusId,
	className,
}: TransactionRowProps) {
	const isAddMode = mode === "add";

	// Add mode local state - use defaults directly, user changes override
	const [addDate, setAddDate] = useState(() => new Date().toISOString().split("T")[0]);
	const [addDescription, setAddDescription] = useState("");
	const [addNotes, setAddNotes] = useState("");
	const [addAmount, setAddAmount] = useState(0);
	// Track whether user has explicitly changed these values
	const [userChangedAccount, setUserChangedAccount] = useState(false);
	const [userChangedStatus, setUserChangedStatus] = useState(false);
	const [addAccountId, setAddAccountId] = useState(defaultAccountId ?? "");
	const [addStatusId, setAddStatusId] = useState(defaultStatusId ?? "");
	const [addTagIds, setAddTagIds] = useState<string[]>([]);
	const [isAddExpanded, setIsAddExpanded] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const notesRef = useRef<HTMLTextAreaElement>(null);

	// View mode state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Derive effective account/status - use user's choice if they changed it, otherwise use latest default
	const effectiveAddAccountId = userChangedAccount
		? addAccountId
		: (defaultAccountId ?? addAccountId);
	const effectiveAddStatusId = userChangedStatus ? addStatusId : (defaultStatusId ?? addStatusId);

	// Get effective values (either from transaction or add mode state)
	const effectiveData: TransactionRowData = isAddMode
		? {
				id: "add-row",
				date: addDate,
				description: addDescription,
				notes: addNotes,
				amount: addAmount,
				accountId: effectiveAddAccountId,
				account: availableAccounts.find((a) => a.id === effectiveAddAccountId)?.name,
				statusId: effectiveAddStatusId,
				status: availableStatuses.find((s) => s.id === effectiveAddStatusId)?.name,
				tags: addTagIds
					.map((id) => {
						const tag = availableTags.find((t) => t.id === id);
						return tag ? { id: tag.id, name: tag.name } : null;
					})
					.filter((t): t is { id: string; name: string } => t !== null),
			}
		: transaction!;

	const effectiveExpanded = isAddMode ? isAddExpanded : isExpanded;

	// Determine presence state (only for view mode)
	const focusedByOther = !isAddMode && presence?.focusedBy && presence.focusedBy !== currentUserId;
	const editingByOther = !isAddMode && presence?.editingBy && presence.editingBy !== currentUserId;
	const presenceUserId = presence?.editingBy || presence?.focusedBy;
	const borderColor = presenceUserId ? hashToColor(presenceUserId) : undefined;

	// Whether this is a potential duplicate (only for view mode)
	const isDuplicate = !isAddMode && !!effectiveData.possibleDuplicateOf;

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (showDeleteConfirm) {
			onDelete?.();
			setShowDeleteConfirm(false);
		} else {
			setShowDeleteConfirm(true);
			// Auto-hide after 3 seconds
			setTimeout(() => setShowDeleteConfirm(false), 3000);
		}
	};

	// Handle checkbox click without propagating to row click
	const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
	}, []);

	// Handle checkbox change (toggle) - CheckboxCell passes new value but we just notify toggle
	const handleCheckboxChange = useCallback(() => {
		onCheckboxChange?.();
	}, [onCheckboxChange]);

	// Handle shift-click on checkbox
	const handleShiftClick = useCallback(
		(event: React.MouseEvent) => {
			event.stopPropagation();
			onCheckboxShiftClick?.();
		},
		[onCheckboxShiftClick]
	);

	// Add mode: handle field updates locally
	const handleFieldUpdateForMode = useCallback(
		(field: keyof TransactionRowData, value: unknown) => {
			if (isAddMode) {
				switch (field) {
					case "date":
						setAddDate(value as string);
						break;
					case "description":
						setAddDescription(value as string);
						break;
					case "notes":
						setAddNotes(value as string);
						break;
					case "amount":
						setAddAmount(value as number);
						break;
					case "accountId":
						setAddAccountId(value as string);
						setUserChangedAccount(true);
						break;
					case "statusId":
						setAddStatusId(value as string);
						setUserChangedStatus(true);
						break;
					case "tags":
						setAddTagIds(value as string[]);
						break;
				}
			} else {
				onFieldUpdate?.(field, value);
			}
		},
		[isAddMode, onFieldUpdate]
	);

	// Add mode: submit handler
	const handleAddSubmit = useCallback(() => {
		if (!addDescription.trim() || !effectiveAddAccountId) {
			return;
		}

		onAdd?.({
			date: addDate,
			description: addDescription.trim(),
			notes: addNotes.trim() || undefined,
			amount: addAmount,
			accountId: effectiveAddAccountId,
			statusId: effectiveAddStatusId || undefined,
			tagIds: addTagIds.length > 0 ? addTagIds : undefined,
		});

		// Reset for next entry
		setAddDescription("");
		setAddNotes("");
		setAddAmount(0);
		setAddTagIds([]);
		setIsAddExpanded(false);
		// Keep date, account, status as user likely wants same defaults
	}, [
		addDate,
		addDescription,
		addNotes,
		addAmount,
		effectiveAddAccountId,
		effectiveAddStatusId,
		addTagIds,
		onAdd,
	]);

	// Add mode: cancel handler
	const handleAddCancel = useCallback(() => {
		setAddDate(new Date().toISOString().split("T")[0]);
		setAddDescription("");
		setAddNotes("");
		setAddAmount(0);
		setAddAccountId(defaultAccountId ?? "");
		setAddStatusId(defaultStatusId ?? "");
		setUserChangedAccount(false);
		setUserChangedStatus(false);
		setAddTagIds([]);
		setIsAddExpanded(false);
		onCancel?.();
	}, [defaultAccountId, defaultStatusId, onCancel]);

	// Add mode: keyboard handler
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!isAddMode) return;
			if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleAddSubmit();
			} else if (e.key === "Escape") {
				handleAddCancel();
			}
		},
		[isAddMode, handleAddSubmit, handleAddCancel]
	);

	// Add mode: toggle expand handler
	const handleToggleExpandForMode = useCallback(() => {
		if (isAddMode) {
			setIsAddExpanded((prev) => !prev);
		} else {
			onToggleExpand?.();
		}
	}, [isAddMode, onToggleExpand]);

	// Can submit in add mode?
	const canSubmit = isAddMode && addDescription.trim() && effectiveAddAccountId;

	// Auto-focus notes textarea when expanded
	useEffect(() => {
		if (effectiveExpanded && notesRef.current) {
			notesRef.current.focus();
		}
	}, [effectiveExpanded]);

	return (
		<div ref={containerRef} className="flex flex-col" onKeyDown={handleKeyDown}>
			{/* Main row */}
			<div
				onClick={isAddMode ? undefined : () => onClick?.()}
				onFocus={onFocus}
				tabIndex={0}
				data-testid={isAddMode ? "add-transaction-row" : "transaction-row"}
				className={cn(
					"group relative grid items-center gap-4 px-4 py-3",
					!effectiveExpanded && "border-b",
					isAddMode && "border-dashed bg-accent/30",
					!isAddMode && "hover:bg-accent/50 focus:bg-accent/50",
					"focus:outline-none",
					"transition-colors",
					!isAddMode && isSelected && "bg-accent",
					!isAddMode && isSelected && "focused selected",
					isDuplicate && "bg-yellow-50/50 dark:bg-yellow-950/20",
					className
				)}
				style={{ gridTemplateColumns: TRANSACTION_GRID_TEMPLATE }}
				role="row"
				aria-selected={isAddMode ? undefined : isSelected}
				aria-expanded={isAddMode ? effectiveExpanded : onToggleExpand ? isExpanded : undefined}
			>
				{/* Presence indicator - colored left border (view mode only) */}
				{!isAddMode && (focusedByOther || editingByOther) && (
					<div
						className={cn("absolute top-0 bottom-0 left-0 w-1", editingByOther && "animate-pulse")}
						style={{ backgroundColor: borderColor }}
						title={
							editingByOther
								? `Being edited by ${presence?.editingBy}`
								: `Viewed by ${presence?.focusedBy}`
						}
					/>
				)}

				{/* Checkbox for selection (view mode) / Add icon (add mode) */}
				{isAddMode ? (
					<div className="flex items-center justify-center text-muted-foreground">
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
					</div>
				) : (
					/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by CheckboxCell */
					<div
						data-cell="checkbox"
						data-testid="row-checkbox"
						onClick={handleCheckboxClick}
						className="flex h-full w-full cursor-pointer items-center justify-center"
					>
						<CheckboxCell
							checked={isSelected}
							onChange={() => handleCheckboxChange()}
							onShiftClick={handleShiftClick}
							ariaLabel={`Select transaction ${effectiveData.description}`}
						/>
					</div>
				)}

				{/* Date */}
				<div data-cell="date">
					<InlineEditableDate
						value={effectiveData.date}
						onSave={(value) => handleFieldUpdateForMode("date", value)}
						data-testid={isAddMode ? "new-transaction-date" : "date-editable"}
					/>
				</div>

				{/* Description */}
				<div data-cell="description" className="min-w-0">
					<InlineEditableText
						value={effectiveData.description}
						onSave={(value) => handleFieldUpdateForMode("description", value)}
						className="truncate font-medium"
						inputClassName="font-medium"
						placeholder={isAddMode ? "Description..." : "No description"}
						data-testid={isAddMode ? "new-transaction-description" : "description-editable"}
					/>
				</div>

				{/* Account */}
				<div data-cell="account" className="min-w-0">
					<AccountCombobox
						value={effectiveData.accountId ?? ""}
						onChange={(accountId) => handleFieldUpdateForMode("accountId", accountId)}
						accounts={availableAccounts}
						placeholder="Add account..."
						className="h-7 border-transparent bg-transparent px-1 text-muted-foreground shadow-none hover:bg-accent/30 focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
					/>
				</div>

				{/* Tags */}
				<div data-cell="tags">
					<InlineEditableTags
						value={effectiveData.tags?.map((t) => t.id) ?? []}
						tags={effectiveData.tags ?? []}
						availableTags={availableTags}
						onSave={(tagIds) => handleFieldUpdateForMode("tags", tagIds)}
						onCreateTag={onCreateTag}
						data-testid={isAddMode ? "new-transaction-tags" : "tags-editable"}
					/>
				</div>

				{/* Status */}
				<div data-cell="status">
					<InlineEditableStatus
						value={effectiveData.statusId}
						statusName={effectiveData.status}
						availableStatuses={availableStatuses}
						onSave={(statusId) => handleFieldUpdateForMode("statusId", statusId)}
						data-testid={isAddMode ? "new-transaction-status" : "status-editable"}
					/>
				</div>

				{/* Amount - In add mode, Enter submits after saving */}
				<div
					data-cell="amount"
					className="text-right"
					onKeyDown={
						isAddMode
							? (e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										// Schedule submit after the InlineEditableAmount has saved
										// Using setTimeout to let the save complete first
										setTimeout(() => handleAddSubmit(), 0);
									}
								}
							: undefined
					}
				>
					<InlineEditableAmount
						value={effectiveData.amount}
						onSave={(value) => handleFieldUpdateForMode("amount", value)}
						data-testid={isAddMode ? "new-transaction-amount" : "amount-editable"}
					/>
				</div>

				{/* Actions column */}
				<div className="flex items-center justify-end gap-1">
					{/* Add mode: Submit and Cancel buttons */}
					{isAddMode ? (
						<>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={handleAddSubmit}
								disabled={!canSubmit}
								data-testid="add-transaction-submit"
								className="text-primary"
								aria-label="Add transaction"
								title="Add transaction (Ctrl+Enter)"
							>
								<Check className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={handleAddCancel}
								data-testid="add-transaction-cancel"
								className="text-muted-foreground"
								aria-label="Cancel"
								title="Cancel (Escape)"
							>
								<X className="h-4 w-4" />
							</Button>
							{/* Expand/Notes toggle button for add mode */}
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={(e) => {
									e.stopPropagation();
									handleToggleExpandForMode();
								}}
								data-testid="expand-notes-button"
								className={cn(
									effectiveExpanded || addNotes
										? "text-primary hover:bg-primary/10"
										: "text-muted-foreground opacity-0 group-hover:opacity-100"
								)}
								title={effectiveExpanded ? "Collapse notes" : addNotes ? "Edit notes" : "Add notes"}
							>
								{effectiveExpanded ? (
									<ChevronUp className="h-4 w-4" />
								) : addNotes ? (
									<Pencil className="h-4 w-4" />
								) : (
									<Plus className="h-4 w-4" />
								)}
							</Button>
						</>
					) : (
						<>
							{/* Duplicate indicator (view mode only) */}
							{isDuplicate && (
								<DuplicateBadge
									duplicateOfId={effectiveData.possibleDuplicateOf}
									onResolve={onResolveDuplicate}
								/>
							)}

							{/* Expand/Notes toggle button (view mode) */}
							{onToggleExpand && (
								<div data-cell="expand">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={(e) => {
											e.stopPropagation();
											onToggleExpand();
										}}
										data-testid="expand-notes-button"
										className={cn(
											effectiveExpanded || effectiveData.notes
												? "text-primary hover:bg-primary/10"
												: "text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
										)}
										title={
											effectiveExpanded
												? "Collapse notes"
												: effectiveData.notes
													? "Edit notes"
													: "Add notes"
										}
									>
										{effectiveExpanded ? (
											<ChevronUp className="h-4 w-4" />
										) : effectiveData.notes ? (
											<Pencil className="h-4 w-4" />
										) : (
											<Plus className="h-4 w-4" />
										)}
									</Button>
								</div>
							)}

							{/* Delete button (view mode only) */}
							{onDelete && (
								<div data-cell="delete">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={handleDelete}
										data-testid="delete-button"
										className={cn(
											showDeleteConfirm
												? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
												: "text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
										)}
										title={
											showDeleteConfirm ? "Click again to confirm delete" : "Delete transaction"
										}
									>
										{showDeleteConfirm ? (
											<span className="px-1 font-medium text-xs">Confirm?</span>
										) : (
											<Trash2 className="h-4 w-4" />
										)}
									</Button>
								</div>
							)}
						</>
					)}
				</div>

				{/* Presence avatar - shows when someone is focused/editing (view mode only) */}
				{!isAddMode && presenceUserId && presenceUserId !== currentUserId && (
					<div className="absolute top-1/2 -right-2 -translate-y-1/2">
						<PresenceAvatar
							userId={presenceUserId}
							isOnline={true}
							size="sm"
							showIndicator={false}
						/>
					</div>
				)}
			</div>

			{/* Expanded notes row */}
			{effectiveExpanded && (
				<div
					className="grid items-center gap-4 border-b bg-muted/30 px-4 py-2"
					style={{ gridTemplateColumns: TRANSACTION_GRID_TEMPLATE }}
					data-testid="notes-row"
					role="row"
				>
					<div />
					<div className="col-span-7" data-cell="notes">
						<Textarea
							ref={notesRef}
							value={effectiveData.notes || ""}
							onChange={(e) => handleFieldUpdateForMode("notes", e.target.value)}
							onBlur={(e) => handleFieldUpdateForMode("notes", e.target.value)}
							rows={1}
							className="min-h-0 resize-none border-transparent bg-transparent py-1 text-muted-foreground text-sm shadow-none hover:bg-accent/30 focus:border-input focus:bg-background"
							placeholder="Add notes or a memo..."
							data-testid={isAddMode ? "new-transaction-notes" : "notes-editable"}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
