"use client";

/**
 * Add Transaction Row
 *
 * Empty row at the top of the transaction table for adding new transactions.
 * Shows a placeholder when inactive, expands to full TransactionRow when clicked.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AccountOption } from "./cells/InlineEditableAccount";
import type { StatusOption } from "./cells/InlineEditableStatus";
import type { TagOption } from "./cells/InlineEditableTags";
import { type NewTransactionData, TransactionRow } from "./TransactionRow";

// Re-export types for backwards compatibility
export type { AccountOption, NewTransactionData };

export interface AddTransactionRowProps {
	/** Available accounts for selection */
	availableAccounts?: AccountOption[];
	/** Available statuses for selection */
	availableStatuses?: StatusOption[];
	/** Available tags for selection */
	availableTags?: TagOption[];
	/** Callback when a new tag should be created */
	onCreateTag?: (name: string) => Promise<TagOption>;
	/** Callback when a new transaction is submitted */
	onAdd: (transaction: NewTransactionData) => void;
	/** Callback when the add row is focused */
	onFocus?: () => void;
	/** Default account ID to pre-select */
	defaultAccountId?: string;
	/** Default status ID to pre-select */
	defaultStatusId?: string;
	/** Number of selected transactions (shown on right side) */
	selectedCount?: number;
	/** Total number of transactions (shown on right side) */
	totalCount?: number;
	/** Whether filters are currently active */
	isFiltered?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Add transaction row component.
 * Shows a placeholder when inactive, full inline editing when active.
 */
export function AddTransactionRow({
	availableAccounts = [],
	availableStatuses = [],
	availableTags = [],
	onCreateTag,
	onAdd,
	onFocus,
	defaultAccountId,
	defaultStatusId,
	selectedCount = 0,
	totalCount = 0,
	isFiltered = false,
	className,
}: AddTransactionRowProps) {
	const [isActive, setIsActive] = useState(false);

	const handleActivate = () => {
		setIsActive(true);
		onFocus?.();
	};

	const handleAdd = (data: NewTransactionData) => {
		onAdd(data);
		// Stay active for adding more transactions
	};

	const handleCancel = () => {
		setIsActive(false);
	};

	// Inactive state - show placeholder
	if (!isActive) {
		return (
			<div
				onClick={handleActivate}
				data-testid="add-transaction-row"
				className={cn(
					"flex cursor-pointer items-center gap-4 border-b border-dashed px-4 py-3",
					"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
					"transition-colors",
					className
				)}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => e.key === "Enter" && handleActivate()}
			>
				<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
				</svg>
				<span className="flex-1 text-sm">Add transaction...</span>
				<span className="text-muted-foreground text-sm">
					{totalCount} transaction{totalCount !== 1 ? "s" : ""}
					{isFiltered && " (filtered)"}
					{selectedCount > 0 && (
						<span className="ml-2 font-medium text-foreground">· {selectedCount} selected</span>
					)}
				</span>
			</div>
		);
	}

	// Active state - use TransactionRow in add mode
	return (
		<TransactionRow
			mode="add"
			availableAccounts={availableAccounts}
			availableStatuses={availableStatuses}
			availableTags={availableTags}
			onCreateTag={onCreateTag}
			onAdd={handleAdd}
			onCancel={handleCancel}
			defaultAccountId={defaultAccountId}
			defaultStatusId={defaultStatusId}
			onFocus={onFocus}
			className={className}
		/>
	);
}
