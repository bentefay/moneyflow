"use client";

/**
 * Transaction Row
 *
 * Individual row in the transaction list with presence highlighting.
 * Shows colored border when another user is focused on or editing the row.
 * Supports duplicate detection, resolution actions, deletion, and inline editing.
 */

import { useState } from "react";
import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";
import { cn } from "@/lib/utils";
import { hashToColor } from "@/lib/utils/color";
import { InlineEditableAmount } from "./cells/InlineEditableAmount";
import { InlineEditableDate } from "./cells/InlineEditableDate";
import { InlineEditableStatus, type StatusOption } from "./cells/InlineEditableStatus";
import { InlineEditableTags, type TagOption } from "./cells/InlineEditableTags";
import { InlineEditableText } from "./cells/InlineEditableText";
import { DuplicateBadge } from "./DuplicateBadge";

export interface TransactionRowData {
	id: string;
	date: string;
	description: string;
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
	/** Available statuses for inline editing */
	availableStatuses?: StatusOption[];
	/** Available tags for inline editing */
	availableTags?: TagOption[];
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
	availableStatuses = [],
	availableTags = [],
	onClick,
	onFocus,
	onResolveDuplicate,
	onDelete,
	onFieldUpdate,
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

	return (
		<div
			onClick={(e) => onClick?.(e)}
			onFocus={onFocus}
			tabIndex={0}
			data-testid="transaction-row"
			className={cn(
				"group relative flex items-center gap-4 border-b px-4 py-3",
				"hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
				"cursor-pointer transition-colors",
				isSelected && "bg-accent",
				isSelected && "focused selected",
				isDuplicate && "bg-yellow-50/50 dark:bg-yellow-950/20",
				className
			)}
			role="row"
			aria-selected={isSelected}
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

			{/* Duplicate indicator */}
			{isDuplicate && (
				<div className="shrink-0">
					<DuplicateBadge
						duplicateOfId={transaction.possibleDuplicateOf}
						onResolve={onResolveDuplicate}
					/>
				</div>
			)}

			{/* Date */}
			<div data-cell="date" className="w-24 shrink-0">
				<InlineEditableDate
					value={transaction.date}
					onSave={(value) => onFieldUpdate?.("date", value)}
					data-testid="date-editable"
				/>
			</div>

			{/* Merchant/Description */}
			<div data-cell="merchant" className="min-w-0 flex-1">
				<InlineEditableText
					value={transaction.description}
					onSave={(value) => onFieldUpdate?.("description", value)}
					className="truncate font-medium"
					inputClassName="font-medium"
					placeholder="No description"
					data-testid="merchant-editable"
				/>
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					{transaction.account && <span className="truncate">{transaction.account}</span>}
				</div>
			</div>

			{/* Tags */}
			<div data-cell="tags" className="w-32 shrink-0">
				<InlineEditableTags
					value={transaction.tags?.map((t) => t.id) ?? []}
					tags={transaction.tags ?? []}
					availableTags={availableTags}
					onSave={(tagIds) => onFieldUpdate?.("tags", tagIds)}
					data-testid="tags-editable"
				/>
			</div>

			{/* Status */}
			<div data-cell="status" className="w-24 shrink-0">
				<InlineEditableStatus
					value={transaction.statusId}
					statusName={transaction.status}
					availableStatuses={availableStatuses}
					onSave={(statusId) => onFieldUpdate?.("statusId", statusId)}
					data-testid="status-editable"
				/>
			</div>

			{/* Amount */}
			<div data-cell="amount" className="w-28 shrink-0">
				<InlineEditableAmount
					value={transaction.amount}
					onSave={(value) => onFieldUpdate?.("amount", value)}
					data-testid="amount-editable"
				/>
			</div>

			{/* Delete button */}
			{onDelete && (
				<button
					type="button"
					onClick={handleDelete}
					data-testid="delete-button"
					className={cn(
						"shrink-0 rounded p-1.5 transition-colors",
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

			{/* Presence avatar - shows when someone is focused/editing */}
			{presenceUserId && presenceUserId !== currentUserId && (
				<div className="absolute top-1/2 -right-2 -translate-y-1/2">
					<PresenceAvatar userId={presenceUserId} isOnline={true} size="sm" showIndicator={false} />
				</div>
			)}
		</div>
	);
}
