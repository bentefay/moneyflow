"use client";

/**
 * Transaction Row
 *
 * Individual row in the transaction list with presence highlighting.
 * Shows colored border when another user is focused on or editing the row.
 * Supports duplicate detection, resolution actions, deletion, and inline editing.
 */

import { useCallback, useState } from "react";
import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";
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

export interface TransactionRowData {
	id: string;
	date: string;
	/** Merchant/payee name (primary display in main row) */
	merchant: string;
	/** Description/memo (shown in expandable row) */
	description?: string;
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
	/** Transaction data */
	transaction: TransactionRowData;
	/** Presence info for this row */
	presence?: TransactionRowPresence;
	/** Current user's pubkey hash */
	currentUserId?: string;
	/** Whether this row is selected */
	isSelected?: boolean;
	/** Whether the description row is expanded */
	isExpanded?: boolean;
	/** Available statuses for inline editing */
	availableStatuses?: StatusOption[];
	/** Available tags for inline editing */
	availableTags?: TagOption[];
	/** Callback when a new tag should be created */
	onCreateTag?: (name: string) => Promise<TagOption>;
	/** Callback when row is clicked */
	onClick?: (event?: React.MouseEvent) => void;
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
	/** Additional CSS classes */
	className?: string;
}

/**
 * Transaction row component with presence highlighting.
 */
export function TransactionRow({
	transaction,
	presence,
	currentUserId,
	isSelected = false,
	isExpanded = false,
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
	className,
}: TransactionRowProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Determine presence state
	const focusedByOther = presence?.focusedBy && presence.focusedBy !== currentUserId;
	const editingByOther = presence?.editingBy && presence.editingBy !== currentUserId;
	const presenceUserId = presence?.editingBy || presence?.focusedBy;
	const borderColor = presenceUserId ? hashToColor(presenceUserId) : undefined;

	// Whether this is a potential duplicate
	const isDuplicate = !!transaction.possibleDuplicateOf;

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

	return (
		<div className="flex flex-col">
			{/* Main row */}
			<div
				onClick={(e) => onClick?.(e)}
				onFocus={onFocus}
				tabIndex={0}
				data-testid="transaction-row"
				className={cn(
					"group relative grid items-center gap-4 px-4 py-3",
					!isExpanded && "border-b",
					"hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
					"cursor-pointer transition-colors",
					isSelected && "bg-accent",
					isSelected && "focused selected",
					isDuplicate && "bg-yellow-50/50 dark:bg-yellow-950/20",
					className
				)}
				style={{ gridTemplateColumns: TRANSACTION_GRID_TEMPLATE }}
				role="row"
				aria-selected={isSelected}
				aria-expanded={onToggleExpand ? isExpanded : undefined}
			>
				{/* Presence indicator - colored left border */}
				{(focusedByOther || editingByOther) && (
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

				{/* Checkbox for selection */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by CheckboxCell */}
				<div data-testid="row-checkbox" onClick={handleCheckboxClick}>
					<CheckboxCell
						checked={isSelected}
						onChange={() => handleCheckboxChange()}
						onShiftClick={handleShiftClick}
						ariaLabel={`Select transaction ${transaction.merchant}`}
					/>
				</div>

				{/* Date */}
				<div data-cell="date">
					<InlineEditableDate
						value={transaction.date}
						onSave={(value) => onFieldUpdate?.("date", value)}
						data-testid="date-editable"
					/>
				</div>

				{/* Merchant */}
				<div data-cell="merchant" className="min-w-0 truncate">
					<InlineEditableText
						value={transaction.merchant}
						onSave={(value) => onFieldUpdate?.("merchant", value)}
						className="truncate font-medium"
						inputClassName="font-medium"
						placeholder="No merchant"
						data-testid="merchant-editable"
					/>
				</div>

				{/* Account */}
				<div data-cell="account" className="min-w-0 truncate">
					<span className="truncate text-muted-foreground text-sm">
						{transaction.account || "—"}
					</span>
				</div>

				{/* Tags */}
				<div data-cell="tags">
					<InlineEditableTags
						value={transaction.tags?.map((t) => t.id) ?? []}
						tags={transaction.tags ?? []}
						availableTags={availableTags}
						onSave={(tagIds) => onFieldUpdate?.("tags", tagIds)}
						onCreateTag={onCreateTag}
						data-testid="tags-editable"
					/>
				</div>

				{/* Status */}
				<div data-cell="status">
					<InlineEditableStatus
						value={transaction.statusId}
						statusName={transaction.status}
						availableStatuses={availableStatuses}
						onSave={(statusId) => onFieldUpdate?.("statusId", statusId)}
						data-testid="status-editable"
					/>
				</div>

				{/* Amount */}
				<div data-cell="amount" className="text-right">
					<InlineEditableAmount
						value={transaction.amount}
						onSave={(value) => onFieldUpdate?.("amount", value)}
						data-testid="amount-editable"
					/>
				</div>

				{/* Actions column - contains expand button and optionally duplicate badge */}
				<div className="flex items-center justify-end gap-1">
					{/* Duplicate indicator */}
					{isDuplicate && (
						<DuplicateBadge
							duplicateOfId={transaction.possibleDuplicateOf}
							onResolve={onResolveDuplicate}
						/>
					)}

					{/* Expand/Description toggle button */}
					{onToggleExpand && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onToggleExpand();
							}}
							data-testid="expand-description-button"
							className={cn(
								"rounded p-1.5 transition-colors",
								isExpanded || transaction.description
									? "text-primary hover:bg-primary/10"
									: "text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
							)}
							title={
								isExpanded
									? "Collapse description"
									: transaction.description
										? "Edit description"
										: "Add description"
							}
						>
							{isExpanded ? (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 15l7-7 7 7"
									/>
								</svg>
							) : transaction.description ? (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							) : (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 4v16m8-8H4"
									/>
								</svg>
							)}
						</button>
					)}

					{/* Delete button */}
					{onDelete && (
						<button
							type="button"
							onClick={handleDelete}
							data-testid="delete-button"
							className={cn(
								"rounded p-1.5 transition-colors",
								showDeleteConfirm
									? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
									: "text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
							)}
							title={showDeleteConfirm ? "Click again to confirm delete" : "Delete transaction"}
						>
							{showDeleteConfirm ? (
								<span className="px-1 font-medium text-xs">Confirm?</span>
							) : (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							)}
						</button>
					)}
				</div>

				{/* Presence avatar - shows when someone is focused/editing */}
				{presenceUserId && presenceUserId !== currentUserId && (
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

			{/* Expanded description row */}
			{isExpanded && (
				<div
					className="grid items-center gap-4 border-b bg-muted/30 px-4 py-2"
					style={{ gridTemplateColumns: TRANSACTION_GRID_TEMPLATE }}
					data-testid="description-row"
				>
					{/* Checkbox column spacer */}
					<div />
					{/* Date column - label */}
					<div>
						<span className="text-muted-foreground text-xs">Description:</span>
					</div>
					{/* Merchant column - description editor (spans merchant + account) */}
					<div className="col-span-2">
						<InlineEditableText
							value={transaction.description || ""}
							onSave={(value) => onFieldUpdate?.("description", value)}
							className="text-muted-foreground text-sm"
							inputClassName="text-sm"
							placeholder="Add a description or memo..."
							data-testid="description-editable"
						/>
					</div>
					{/* Tags column */}
					<div />
					{/* Status column */}
					<div />
					{/* Amount column */}
					<div />
					{/* Actions column */}
					<div />
				</div>
			)}
		</div>
	);
}
