"use client";

/**
 * AccountsTable Component
 *
 * Table displaying all accounts with inline editing and ownership management.
 * Connects to Loro state for real-time sync.
 */

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	useActiveAccounts,
	useActivePeople,
	useVaultAction,
	useVaultPreferences,
} from "@/lib/crdt/context";
import type { Account, AccountInput, Person } from "@/lib/crdt/schema";
import { createEqualOwnerships } from "@/lib/domain/ownership";
import { cn } from "@/lib/utils";
import { AccountRow } from "./AccountRow";

export interface AccountsTableProps {
	/** Additional CSS classes */
	className?: string;
}

/**
 * Accounts table with inline editing and real-time sync.
 */
export function AccountsTable({ className }: AccountsTableProps) {
	const accounts = useActiveAccounts();
	const people = useActivePeople();
	const preferences = useVaultPreferences();

	// Get vault default currency (fallback to USD)
	const defaultCurrency = preferences?.defaultCurrency ?? "USD";

	const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
	const [isAddingAccount, setIsAddingAccount] = useState(false);
	const [newAccountName, setNewAccountName] = useState("");

	// Vault actions for mutations
	const updateAccount = useVaultAction((state, id: string, data: Partial<Account>) => {
		const existing = state.accounts[id];
		if (existing) {
			Object.assign(existing, data);
		}
	});

	const addAccount = useVaultAction((state, data: AccountInput) => {
		state.accounts[data.id] = data as (typeof state.accounts)[string];
	});

	const deleteAccount = useVaultAction((state, id: string) => {
		const account = state.accounts[id];
		if (account) {
			account.deletedAt = Date.now();
		}
	});

	// Sort accounts by name
	const sortedAccounts = useMemo(() => {
		return Object.values(accounts)
			.filter((acc): acc is Account => typeof acc === "object")
			.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
	}, [accounts]);

	// Handle toggle expand
	const handleToggleExpand = useCallback((accountId: string) => {
		setExpandedAccountId((prev) => (prev === accountId ? null : accountId));
	}, []);

	// Handle update
	const handleUpdate = useCallback(
		(id: string, data: Partial<Account>) => {
			updateAccount(id, data);
		},
		[updateAccount]
	);

	// Handle delete
	const handleDelete = useCallback(
		(id: string) => {
			deleteAccount(id);
			if (expandedAccountId === id) {
				setExpandedAccountId(null);
			}
		},
		[deleteAccount, expandedAccountId]
	);

	// Handle add new account
	const handleAddAccount = useCallback(() => {
		const name = newAccountName.trim();
		if (!name) return;

		// Filter out $cid property from people keys (loro-mirror injects it)
		const personIds = Object.keys(people).filter((k) => k !== "$cid");
		const defaultOwnerships = personIds.length > 0 ? createEqualOwnerships(personIds) : {};

		const newAccount = {
			id: crypto.randomUUID(),
			name,
			accountType: "checking",
			currency: "", // Empty string = inherit from vault default
			balance: 0,
			ownerships: defaultOwnerships,
		};

		addAccount(newAccount as AccountInput);
		setNewAccountName("");
		setIsAddingAccount(false);
	}, [newAccountName, people, addAccount]);

	// Handle cancel add
	const handleCancelAdd = useCallback(() => {
		setNewAccountName("");
		setIsAddingAccount(false);
	}, []);

	return (
		<div className={cn("flex flex-col", className)}>
			{/* Header */}
			<div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2 font-medium text-sm">
				<div className="w-5 shrink-0" /> {/* Expand indicator space */}
				<div className="min-w-0 flex-1">Account</div>
				<div className="w-28 shrink-0">Type</div>
				<div className="w-32 shrink-0 text-center">Currency</div>
				<div className="hidden w-32 shrink-0 md:block">Owners</div>
				<div className="w-28 shrink-0 text-right">Balance</div>
				<div className="w-20 shrink-0" /> {/* Actions space */}
			</div>

			{/* Account rows */}
			<div className="divide-y">
				{sortedAccounts.map((account) => (
					<AccountRow
						key={account.id}
						account={account}
						people={people as unknown as Record<string, Person>}
						vaultDefaultCurrency={defaultCurrency}
						onUpdate={handleUpdate}
						onDelete={handleDelete}
						isExpanded={expandedAccountId === account.id}
						onToggleExpand={() => handleToggleExpand(account.id)}
					/>
				))}
			</div>

			{/* Add account row */}
			{isAddingAccount ? (
				<div className="flex items-center gap-4 border-b px-4 py-3">
					<div className="w-5 shrink-0" />
					<div className="flex flex-1 items-center gap-2">
						<Input
							value={newAccountName}
							onChange={(e) => setNewAccountName(e.target.value)}
							placeholder="Account name"
							className="h-9 max-w-xs"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter") handleAddAccount();
								if (e.key === "Escape") handleCancelAdd();
							}}
						/>
						<Button onClick={handleAddAccount} size="sm">
							Add
						</Button>
						<Button variant="ghost" size="sm" onClick={handleCancelAdd}>
							Cancel
						</Button>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setIsAddingAccount(true)}
					className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm transition-colors hover:bg-accent/50 cursor-pointer"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					Add account
				</button>
			)}

			{/* Empty state */}
			{sortedAccounts.length === 0 && !isAddingAccount && (
				<div className="py-12 text-center">
					<div className="text-muted-foreground">
						<svg
							className="mx-auto h-12 w-12 text-muted-foreground/50"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
							/>
						</svg>
						<h3 className="mt-4 font-medium text-lg">No accounts yet</h3>
						<p className="mt-1">Add your first account to start tracking transactions.</p>
					</div>
					<Button className="mt-6" onClick={() => setIsAddingAccount(true)}>
						<svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add Account
					</Button>
				</div>
			)}
		</div>
	);
}
