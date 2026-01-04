"use client";

/**
 * AccountRow Component
 *
 * Individual row in the accounts list with per-field inline editing support.
 * Shows account name, type, currency, balance, and ownership percentages.
 *
 * Each field can be edited individually by clicking on it:
 * - Name: Text input
 * - Account Number: Text input (shown below name)
 * - Type: Select dropdown
 * - Currency: CurrencySelect component
 *
 * All editors support:
 * - Enter to save
 * - Escape to cancel
 * - Click outside to save
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Account, Person } from "@/lib/crdt/schema";
import { Currencies } from "@/lib/domain/currencies";
import {
	createCurrencyFormatter,
	getCurrency,
	type MoneyMinorUnits,
	resolveAccountCurrency,
} from "@/lib/domain/currency";
import { isValidOwnership } from "@/lib/domain/ownership";
import { cn } from "@/lib/utils";
import { CurrencySelect } from "./CurrencySelect";
import { OwnershipEditor } from "./OwnershipEditor";

export interface AccountRowProps {
	/** Account data */
	account: Account;
	/** All people in the vault (for displaying owner names) */
	people: Record<string, Person>;
	/** Vault's default currency code (used for fallback display) */
	vaultDefaultCurrency: string;
	/** Callback when account is updated */
	onUpdate: (id: string, data: Partial<Account>) => void;
	/** Callback when account is deleted */
	onDelete: (id: string) => void;
	/** Whether this account can be deleted (FR-013: last account cannot be deleted) */
	canDelete?: boolean;
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

/** Which field is currently being edited (or "all" for full edit mode) */
type EditingField = "name" | "accountNumber" | "type" | "currency" | "all" | null;

/**
 * Account row component with per-field inline editing.
 */
export function AccountRow({
	account,
	people,
	vaultDefaultCurrency,
	onUpdate,
	onDelete,
	canDelete = true,
	isExpanded = false,
	onToggleExpand,
	className,
}: AccountRowProps) {
	// Per-field editing state ("all" = full edit mode from edit button)
	const [editingField, setEditingField] = useState<EditingField>(null);
	const [editedName, setEditedName] = useState(account.name);
	const [editedAccountNumber, setEditedAccountNumber] = useState(account.accountNumber || "");
	const [editedType, setEditedType] = useState(account.accountType || "checking");
	const [editedCurrency, setEditedCurrency] = useState(account.currency || "");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Whether in full edit mode (all fields editable at once)
	const isEditMode = editingField === "all";

	// Refs for input focus management
	const nameInputRef = useRef<HTMLInputElement>(null);
	const accountNumberInputRef = useRef<HTMLInputElement>(null);
	const typeSelectRef = useRef<HTMLSelectElement>(null);

	// Resolve currency with inheritance indicator
	const { code: resolvedCurrency, isInherited } = resolveAccountCurrency(
		account.currency,
		vaultDefaultCurrency
	);

	// Get currency info for formatting using resolved currency
	const currency = getCurrency(resolvedCurrency) || Currencies.USD;
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

	// Focus input when editing starts
	useEffect(() => {
		if (editingField === "name" && nameInputRef.current) {
			nameInputRef.current.focus();
			nameInputRef.current.select();
		} else if (editingField === "accountNumber" && accountNumberInputRef.current) {
			accountNumberInputRef.current.focus();
			accountNumberInputRef.current.select();
		} else if (editingField === "type" && typeSelectRef.current) {
			typeSelectRef.current.focus();
		}
	}, [editingField]);

	// Reset edited values when account changes
	useEffect(() => {
		setEditedName(account.name);
		setEditedAccountNumber(account.accountNumber || "");
		setEditedType(account.accountType || "checking");
		setEditedCurrency(account.currency || "");
	}, [account]);

	// Save name field
	const saveName = useCallback(() => {
		const newName = editedName.trim() || "Untitled Account";
		if (newName !== account.name) {
			onUpdate(account.id, { name: newName });
		}
		setEditingField(null);
	}, [account.id, account.name, editedName, onUpdate]);

	// Save account number field
	const saveAccountNumber = useCallback(() => {
		const newNumber = editedAccountNumber.trim() || undefined;
		if (newNumber !== (account.accountNumber || undefined)) {
			onUpdate(account.id, { accountNumber: newNumber });
		}
		setEditingField(null);
	}, [account.id, account.accountNumber, editedAccountNumber, onUpdate]);

	// Save type field
	const saveType = useCallback(() => {
		if (editedType !== account.accountType) {
			onUpdate(account.id, { accountType: editedType });
		}
		setEditingField(null);
	}, [account.id, account.accountType, editedType, onUpdate]);

	// Cancel editing
	const cancelEditing = useCallback(() => {
		setEditedName(account.name);
		setEditedAccountNumber(account.accountNumber || "");
		setEditedType(account.accountType || "checking");
		setEditedCurrency(account.currency || "");
		setEditingField(null);
	}, [account]);

	// Handle keyboard events for fields
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent, saveHandler: () => void) => {
			if (e.key === "Enter") {
				e.preventDefault();
				saveHandler();
			} else if (e.key === "Escape") {
				e.preventDefault();
				cancelEditing();
			}
		},
		[cancelEditing]
	);

	// Start editing a field
	const startEditing = useCallback((field: EditingField, e: React.MouseEvent) => {
		e.stopPropagation();
		setEditingField(field);
	}, []);

	// Enter full edit mode (all fields editable)
	const enterEditMode = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		setEditingField("all");
	}, []);

	// Exit edit mode and save all changes
	const exitEditMode = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			// Save all changed values
			const updates: Partial<Account> = {};
			const newName = editedName.trim() || "Untitled Account";
			if (newName !== account.name) updates.name = newName;
			const newNumber = editedAccountNumber.trim() || undefined;
			if (newNumber !== (account.accountNumber || undefined)) updates.accountNumber = newNumber;
			if (editedType !== account.accountType) updates.accountType = editedType;
			if (editedCurrency !== (account.currency || "")) updates.currency = editedCurrency;

			if (Object.keys(updates).length > 0) {
				onUpdate(account.id, updates);
			}
			setEditingField(null);
		},
		[account, editedName, editedAccountNumber, editedType, editedCurrency, onUpdate]
	);

	// Handle currency change from CurrencySelect
	const handleCurrencyChange = useCallback(
		(newCurrency: string) => {
			setEditedCurrency(newCurrency);
			// In edit mode, just update state - save happens on exitEditMode
			// Otherwise, save immediately since CurrencySelect is a popover
			if (!isEditMode) {
				if (newCurrency !== (account.currency || "")) {
					onUpdate(account.id, { currency: newCurrency });
				}
				setEditingField(null);
			}
		},
		[account.id, account.currency, onUpdate, isEditMode]
	);

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
					{/* Name field */}
					{editingField === "name" || isEditMode ? (
						<div onClick={(e) => e.stopPropagation()}>
							<Input
								ref={nameInputRef}
								value={editedName}
								onChange={(e) => setEditedName(e.target.value)}
								onKeyDown={(e) => !isEditMode && handleKeyDown(e, saveName)}
								onBlur={() => !isEditMode && saveName()}
								placeholder="Account name"
								className="h-8"
							/>
						</div>
					) : (
						<div
							className={cn(
								"group/name cursor-text truncate font-medium rounded px-1 -mx-1",
								"hover:bg-accent/50 hover:ring-1 hover:ring-border"
							)}
							onClick={(e) => startEditing("name", e)}
							title="Click to edit name"
						>
							{account.name}
						</div>
					)}

					{/* Account number field */}
					{editingField === "accountNumber" || isEditMode ? (
						<div onClick={(e) => e.stopPropagation()}>
							<Input
								ref={accountNumberInputRef}
								value={editedAccountNumber}
								onChange={(e) => setEditedAccountNumber(e.target.value)}
								onKeyDown={(e) => !isEditMode && handleKeyDown(e, saveAccountNumber)}
								onBlur={() => !isEditMode && saveAccountNumber()}
								placeholder="Account number (optional)"
								className="mt-1 h-7 text-sm"
							/>
						</div>
					) : account.accountNumber ? (
						<div
							className={cn(
								"cursor-text truncate text-muted-foreground text-sm rounded px-1 -mx-1",
								"hover:bg-accent/50 hover:ring-1 hover:ring-border"
							)}
							onClick={(e) => startEditing("accountNumber", e)}
							title="Click to edit account number"
						>
							···{account.accountNumber.slice(-4)}
						</div>
					) : (
						<div
							className={cn(
								"cursor-text text-muted-foreground/50 text-sm italic rounded px-1 -mx-1",
								"hover:bg-accent/50 hover:ring-1 hover:ring-border"
							)}
							onClick={(e) => startEditing("accountNumber", e)}
							title="Click to add account number"
						>
							No account number
						</div>
					)}
				</div>

				{/* Account type */}
				<div className="w-28 shrink-0">
					{editingField === "type" || isEditMode ? (
						<select
							ref={typeSelectRef}
							value={editedType}
							onChange={(e) => {
								setEditedType(e.target.value);
								// In edit mode, just update state
								if (!isEditMode) {
									if (e.target.value !== account.accountType) {
										onUpdate(account.id, { accountType: e.target.value });
									}
									setEditingField(null);
								}
							}}
							onKeyDown={(e) => !isEditMode && handleKeyDown(e, saveType)}
							onBlur={() => !isEditMode && saveType()}
							onClick={(e) => e.stopPropagation()}
							className="h-8 w-full appearance-none rounded-md border border-input bg-background px-2 pr-6 text-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.25rem_center] bg-no-repeat"
						>
							{Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					) : (
						<span
							className={cn(
								"cursor-pointer rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs",
								"hover:bg-accent hover:ring-1 hover:ring-border"
							)}
							onClick={(e) => startEditing("type", e)}
							title="Click to change type"
						>
							{ACCOUNT_TYPES[account.accountType || "checking"] || account.accountType}
						</span>
					)}
				</div>

				{/* Currency */}
				<div className="w-32 shrink-0 text-center text-sm" onClick={(e) => e.stopPropagation()}>
					{editingField === "currency" || isEditMode ? (
						<CurrencySelect
							value={editedCurrency}
							vaultDefaultCurrency={vaultDefaultCurrency}
							onChange={handleCurrencyChange}
						/>
					) : (
						<span
							className={cn(
								"inline-flex items-center gap-1 cursor-pointer rounded px-1 -mx-1",
								"hover:bg-accent/50 hover:ring-1 hover:ring-border",
								isInherited && "text-muted-foreground"
							)}
							onClick={(e) => startEditing("currency", e)}
							title="Click to change currency"
						>
							{resolvedCurrency}
							{isInherited && <span className="text-muted-foreground/60 text-xs">(default)</span>}
						</span>
					)}
				</div>

				{/* Owners */}
				<div className="hidden w-32 shrink-0 truncate text-muted-foreground text-sm md:block">
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
				<div
					className={cn(
						"flex w-20 shrink-0 gap-1 transition-opacity",
						isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
					)}
				>
					{/* Edit / Done button */}
					{isEditMode ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={exitEditMode}
							className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
							aria-label="Save changes"
						>
							{/* Checkmark icon */}
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</Button>
					) : (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={enterEditMode}
							className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
							aria-label="Edit account"
						>
							{/* Pencil icon */}
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
								/>
							</svg>
						</Button>
					)}

					{/* Delete button */}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleDelete}
						disabled={!canDelete}
						title={canDelete ? undefined : "Cannot delete the last account"}
						className={cn(
							"h-7 w-7 p-0",
							!canDelete && "opacity-50 cursor-not-allowed",
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
