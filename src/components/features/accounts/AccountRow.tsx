"use client";

/**
 * AccountRow Component
 *
 * Individual row in the accounts list with inline editing support.
 * Shows account name, type, currency, balance, and ownership percentages.
 */

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Account, Person } from "@/lib/crdt/schema";
import { Currencies } from "@/lib/domain/currencies";
import { createCurrencyFormatter, getCurrency, type MoneyMinorUnits } from "@/lib/domain/currency";
import { isValidOwnership } from "@/lib/domain/ownership";
import { cn } from "@/lib/utils";
import { OwnershipEditor } from "./OwnershipEditor";

export interface AccountRowProps {
	/** Account data */
	account: Account;
	/** All people in the vault (for displaying owner names) */
	people: Record<string, Person>;
	/** Callback when account is updated */
	onUpdate: (id: string, data: Partial<Account>) => void;
	/** Callback when account is deleted */
	onDelete: (id: string) => void;
	/** Whether this row is expanded to show ownership editor */
	isExpanded?: boolean;
	/** Callback when row expansion is toggled */
	onToggleExpand?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/** Account type labels */
const ACCOUNT_TYPES: Record<string, string> = {
	checking: "Checking",
	savings: "Savings",
	credit: "Credit Card",
	cash: "Cash",
	loan: "Loan",
	investment: "Investment",
};

/**
 * Account row component with inline editing.
 */
export function AccountRow({
	account,
	people,
	onUpdate,
	onDelete,
	isExpanded = false,
	onToggleExpand,
	className,
}: AccountRowProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedName, setEditedName] = useState(account.name);
	const [editedAccountNumber, setEditedAccountNumber] = useState(account.accountNumber || "");
	const [editedType, setEditedType] = useState(account.accountType || "checking");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Get currency info for formatting
	const currency = getCurrency(account.currency || "USD") || Currencies.USD;
	const formatter = createCurrencyFormatter(currency, "en-US");
	const balance = account.balance as MoneyMinorUnits;

	// Get owner names as a comma-separated string
	const ownerNames = Object.keys(account.ownerships || {})
		.map((personId) => {
			const person = people[personId];
			if (typeof person === "object" && person.name) {
				const pct = account.ownerships[personId];
				return `${person.name} (${pct.toFixed(0)}%)`;
			}
			return null;
		})
		.filter(Boolean)
		.join(", ");

	// Handle saving inline edits
	const handleSave = useCallback(() => {
		onUpdate(account.id, {
			name: editedName.trim() || "Untitled Account",
			accountNumber: editedAccountNumber.trim() || undefined,
			accountType: editedType,
		});
		setIsEditing(false);
	}, [account.id, editedName, editedAccountNumber, editedType, onUpdate]);

	// Handle canceling inline edits
	const handleCancel = useCallback(() => {
		setEditedName(account.name);
		setEditedAccountNumber(account.accountNumber || "");
		setEditedType(account.accountType || "checking");
		setIsEditing(false);
	}, [account]);

	// Handle ownership change - filter out $cid from loro-mirror
	const handleOwnershipChange = useCallback(
		(newOwnerships: Record<string, number>) => {
			// Filter out $cid property that loro-mirror injects, then cast back to expected type
			const filtered = Object.fromEntries(
				Object.entries(newOwnerships).filter(([key]) => key !== "$cid")
			);
			onUpdate(account.id, { ownerships: filtered as unknown as typeof account.ownerships });
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- typeof account.ownerships is a type reference, not runtime dependency
		[account.id, onUpdate]
	);

	// Handle delete with confirmation
	const handleDelete = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (showDeleteConfirm) {
				onDelete(account.id);
				setShowDeleteConfirm(false);
			} else {
				setShowDeleteConfirm(true);
				setTimeout(() => setShowDeleteConfirm(false), 3000);
			}
		},
		[account.id, onDelete, showDeleteConfirm]
	);

	// Check if ownerships are valid
	const ownershipsValid = isValidOwnership(account.ownerships || {});

	return (
		<div
			className={cn(
				"group border-b",
				!ownershipsValid && "border-l-4 border-l-amber-400",
				className
			)}
		>
			{/* Main row */}
			<div
				className={cn(
					"flex items-center gap-4 px-4 py-3",
					"cursor-pointer transition-colors hover:bg-accent/50",
					isExpanded && "bg-accent/30"
				)}
				onClick={onToggleExpand}
				role="row"
			>
				{/* Expand/collapse indicator */}
				<div className="w-5 shrink-0 text-muted-foreground">
					<svg
						className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</div>

				{/* Account name & number */}
				<div className="min-w-0 flex-1">
					{isEditing ? (
						<div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
							<Input
								value={editedName}
								onChange={(e) => setEditedName(e.target.value)}
								placeholder="Account name"
								className="h-8"
								autoFocus
							/>
							<Input
								value={editedAccountNumber}
								onChange={(e) => setEditedAccountNumber(e.target.value)}
								placeholder="Account number (optional)"
								className="h-7 text-sm"
							/>
						</div>
					) : (
						<>
							<div className="truncate font-medium">{account.name}</div>
							{account.accountNumber && (
								<div className="truncate text-muted-foreground text-sm">
									···{account.accountNumber.slice(-4)}
								</div>
							)}
						</>
					)}
				</div>

				{/* Account type */}
				<div className="w-28 shrink-0">
					{isEditing ? (
						<select
							value={editedType}
							onChange={(e) => setEditedType(e.target.value)}
							onClick={(e) => e.stopPropagation()}
							className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
						>
							{Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					) : (
						<span className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">
							{ACCOUNT_TYPES[account.accountType || "checking"] || account.accountType}
						</span>
					)}
				</div>

				{/* Currency */}
				<div className="w-12 shrink-0 text-center text-muted-foreground text-sm">
					{account.currency || "USD"}
				</div>

				{/* Owners */}
				<div className="hidden w-40 shrink-0 truncate text-muted-foreground text-sm md:block">
					{ownerNames || <span className="text-amber-500 italic">No owners</span>}
				</div>

				{/* Balance */}
				<div
					className={cn(
						"w-28 shrink-0 text-right font-medium tabular-nums",
						balance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
					)}
				>
					{formatter.format(balance)}
				</div>

				{/* Actions */}
				<div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					{isEditing ? (
						<>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									handleSave();
								}}
								className="h-7 px-2"
							>
								Save
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									handleCancel();
								}}
								className="h-7 px-2"
							>
								Cancel
							</Button>
						</>
					) : (
						<>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									setIsEditing(true);
								}}
								className="h-7 w-7 p-0 text-muted-foreground"
								aria-label="Edit account"
							>
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleDelete}
								className={cn(
									"h-7 w-7 p-0",
									showDeleteConfirm
										? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
										: "text-muted-foreground hover:text-destructive"
								)}
								aria-label={showDeleteConfirm ? "Confirm delete" : "Delete account"}
							>
								{showDeleteConfirm ? (
									<span className="text-xs">!</span>
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
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Expanded ownership editor */}
			{isExpanded && (
				<div className="border-t bg-accent/20 px-4 py-4">
					<div className="mx-auto max-w-md">
						<h4 className="mb-3 font-medium text-sm">Ownership</h4>
						<OwnershipEditor
							ownerships={account.ownerships || {}}
							onChange={handleOwnershipChange}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
