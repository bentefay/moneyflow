"use client";

/**
 * Transactions Page
 *
 * Main transactions view with filtering, inline editing, bulk edit,
 * and real-time collaborative sync.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AddTransactionRow,
	BulkEditToolbar,
	createEmptyFilters,
	hasActiveFilters,
	type NewTransactionData,
	TransactionFilters,
	type TransactionFiltersState,
	type TransactionRowData,
	TransactionTable,
} from "@/components/features/transactions";
import { useToast } from "@/components/ui/toast";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";

/** Threshold for showing warning when selecting all */
const LARGE_SELECTION_THRESHOLD = 500;

import { useVaultPresence } from "@/hooks/use-vault-presence";
import {
	useActiveAccounts,
	useActivePeople,
	useActiveTags,
	useActiveTransactions,
	useStatuses,
	useVaultAction,
} from "@/lib/crdt/context";
import type { Account, Person, Status, Tag, Transaction } from "@/lib/crdt/schema";

// Number of transactions to load per page
const PAGE_SIZE = 50;

/** Generate unique ID */
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Transactions page component.
 */
export default function TransactionsPage() {
	// Toast notifications
	const { toast } = useToast();

	// CRDT state
	const transactions = useActiveTransactions();
	const accounts = useActiveAccounts();
	const tags = useActiveTags();
	const statuses = useStatuses();
	const people = useActivePeople();

	// Vault & identity for presence
	const { activeVault } = useActiveVault();
	const { pubkeyHash } = useIdentity();

	// Presence (only active when vault & identity are available)
	useVaultPresence(activeVault?.id ?? null, pubkeyHash ?? null);

	// Vault actions for mutations
	const setTransaction = useVaultAction((state, id: string, data: Partial<Transaction>) => {
		const existing = state.transactions[id];
		if (existing) {
			Object.assign(existing, data);
		}
	});

	const addTransaction = useVaultAction((state, data: Transaction) => {
		state.transactions[data.id] = data as (typeof state.transactions)[string];
	});

	const deleteTransactions = useVaultAction((state, ids: string[]) => {
		const now = Date.now();
		for (const id of ids) {
			const tx = state.transactions[id];
			if (tx) {
				tx.deletedAt = now;
			}
		}
	});

	const addTag = useVaultAction((state, tag: { id: string; name: string }) => {
		state.tags[tag.id] = {
			id: tag.id,
			name: tag.name,
			parentTagId: "",
			deletedAt: 0,
		} as (typeof state.tags)[string];
	});

	// Filter state
	const [filters, setFilters] = useState<TransactionFiltersState>(createEmptyFilters());

	// Pagination state
	const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

	// Selection state - simple Set instead of custom hook
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const selectedCount = selectedIds.size;

	// Clear selection helper
	const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

	// Warn when selection exceeds threshold
	useEffect(() => {
		if (selectedCount > LARGE_SELECTION_THRESHOLD) {
			toast({
				message: `Selected ${selectedCount} transactions. Large selections may be slow.`,
				type: "warning",
			});
		}
	}, [selectedCount, toast]);

	// Convert presence list to presence by transaction ID
	// For now, we don't have transaction-level presence tracking
	// This would require extending the presence system
	const presenceByTransactionId = useMemo(() => ({}), []);

	// Filter and sort transactions
	const filteredTransactions = useMemo(() => {
		let txList = Object.values(transactions) as Transaction[];

		// Apply filters
		if (filters.dateRange.start || filters.dateRange.end) {
			txList = txList.filter((tx) => {
				if (filters.dateRange.start && tx.date < filters.dateRange.start) return false;
				if (filters.dateRange.end && tx.date > filters.dateRange.end) return false;
				return true;
			});
		}

		if (filters.tagIds.length > 0) {
			txList = txList.filter((tx) => tx.tagIds?.some((tagId) => filters.tagIds.includes(tagId)));
		}

		if (filters.personIds.length > 0) {
			txList = txList.filter((tx) => {
				const allocations = tx.allocations ?? {};
				return Object.keys(allocations).some((personId) => filters.personIds.includes(personId));
			});
		}

		if (filters.accountIds.length > 0) {
			txList = txList.filter((tx) => filters.accountIds.includes(tx.accountId));
		}

		if (filters.statusIds.length > 0) {
			txList = txList.filter((tx) => filters.statusIds.includes(tx.statusId));
		}

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			txList = txList.filter(
				(tx) =>
					tx.merchant?.toLowerCase().includes(searchLower) ||
					tx.description?.toLowerCase().includes(searchLower)
			);
		}

		if (filters.showDuplicatesOnly) {
			txList = txList.filter((tx) => tx.duplicateOf);
		}

		// Sort by date descending
		txList.sort((a, b) => b.date.localeCompare(a.date));

		return txList;
	}, [transactions, filters]);

	// Paginate
	const displayedTransactions = useMemo(
		() => filteredTransactions.slice(0, displayCount),
		[filteredTransactions, displayCount]
	);
	const hasMore = displayCount < filteredTransactions.length;

	// Load more handler
	const handleLoadMore = useCallback(() => {
		setDisplayCount((prev) => prev + PAGE_SIZE);
	}, []);

	// Convert to row data format
	const tableData = useMemo(
		() =>
			displayedTransactions.map((tx) => {
				const acc = accounts[tx.accountId];
				const stat = statuses[tx.statusId];
				return {
					id: tx.id,
					date: tx.date,
					merchant: tx.merchant || "",
					description: tx.description || "",
					amount: tx.amount,
					account: typeof acc === "object" ? acc.name : "Unknown",
					accountId: tx.accountId,
					status: typeof stat === "object" ? stat.name : "Unknown",
					statusId: tx.statusId,
					tags: (tx.tagIds ?? []).map((id) => {
						const tag = tags[id];
						return {
							id,
							name: typeof tag === "object" ? tag.name : "Unknown",
						};
					}),
					balance: 0, // Will be calculated separately
					possibleDuplicateOf: tx.duplicateOf,
				};
			}),
		[displayedTransactions, accounts, statuses, tags]
	);

	// Account options for AddTransactionRow
	const accountOptions = useMemo(
		() =>
			Object.values(accounts)
				.filter((acc): acc is Account & { $cid: string } => typeof acc === "object")
				.map((acc) => ({
					id: acc.id,
					name: acc.name,
				})),
		[accounts]
	);

	// Get default status ID
	const defaultStatusId = useMemo(() => {
		const defaultStatus = Object.values(statuses).find(
			(s): s is Status & { $cid: string } => typeof s === "object" && s.isDefault
		);
		return defaultStatus?.id ?? Object.keys(statuses)[0] ?? "";
	}, [statuses]);

	// Handle add transaction
	const handleAddTransaction = useCallback(
		(data: NewTransactionData) => {
			// Create new transaction with minimal required fields
			// The CRDT layer will handle $cid internally
			const newTx = {
				id: generateId(),
				date: data.date,
				merchant: data.description,
				description: "",
				amount: data.amount,
				accountId: data.accountId,
				tagIds: [] as string[],
				statusId: defaultStatusId,
				allocations: {} as Record<string, number>,
				importId: "",
				duplicateOf: "",
				deletedAt: 0,
			};
			addTransaction(newTx as Transaction);
		},
		[addTransaction, defaultStatusId]
	);

	// Handle bulk delete
	const handleBulkDelete = useCallback(() => {
		const ids = Array.from(selectedIds);
		deleteTransactions(ids);
		clearSelection();
	}, [selectedIds, deleteTransactions, clearSelection]);

	// Handle bulk set tags
	const handleBulkSetTags = useCallback(
		(tagIds: string[]) => {
			for (const id of selectedIds) {
				setTransaction(id, { tagIds });
			}
		},
		[selectedIds, setTransaction]
	);

	// Handle bulk set status
	const handleBulkSetStatus = useCallback(
		(statusId: string) => {
			for (const id of selectedIds) {
				setTransaction(id, { statusId });
			}
		},
		[selectedIds, setTransaction]
	);

	// Handle bulk set account
	const handleBulkSetAccount = useCallback(
		(accountId: string) => {
			for (const id of selectedIds) {
				setTransaction(id, { accountId });
			}
		},
		[selectedIds, setTransaction]
	);

	// Handle bulk set description
	const handleBulkSetDescription = useCallback(
		(description: string) => {
			for (const id of selectedIds) {
				setTransaction(id, { description });
			}
		},
		[selectedIds, setTransaction]
	);

	// Handle bulk set amount
	const handleBulkSetAmount = useCallback(
		(amount: number) => {
			for (const id of selectedIds) {
				setTransaction(id, { amount });
			}
		},
		[selectedIds, setTransaction]
	);

	// Handle creating a new tag
	const handleCreateTag = useCallback(
		async (name: string): Promise<{ id: string; name: string }> => {
			const id = generateId();
			addTag({ id, name });
			return { id, name };
		},
		[addTag]
	);

	// Handle single transaction delete
	const handleSingleDelete = useCallback(
		(id: string) => {
			deleteTransactions([id]);
			// Clear selection if the deleted transaction was selected
			if (selectedIds.has(id)) {
				setSelectedIds((prev) => {
					const newSelection = new Set(prev);
					newSelection.delete(id);
					return newSelection;
				});
			}
		},
		[deleteTransactions, selectedIds]
	);

	// Handle resolve duplicate (mark as not a duplicate)
	const handleResolveDuplicate = useCallback(
		(id: string) => {
			setTransaction(id, { duplicateOf: undefined });
		},
		[setTransaction]
	);

	// Handle inline edit update (from TransactionTable)
	const handleTransactionUpdate = useCallback(
		(id: string, updates: Partial<TransactionRowData>) => {
			// Map TransactionRowData fields to Transaction fields
			const transactionUpdates: Partial<Transaction> = {};
			if ("merchant" in updates && updates.merchant !== undefined) {
				transactionUpdates.merchant = updates.merchant;
			}
			if ("description" in updates && updates.description !== undefined) {
				transactionUpdates.description = updates.description;
			}
			if ("date" in updates && updates.date !== undefined) {
				transactionUpdates.date = updates.date;
			}
			if ("amount" in updates && updates.amount !== undefined) {
				transactionUpdates.amount = updates.amount;
			}
			if ("statusId" in updates && updates.statusId !== undefined) {
				transactionUpdates.statusId = updates.statusId;
			}
			if ("accountId" in updates && updates.accountId !== undefined) {
				transactionUpdates.accountId = updates.accountId;
			}
			if ("tags" in updates && Array.isArray(updates.tags)) {
				// Tags come as array of IDs (string[]) from inline editor
				// But TransactionRowData.tags type is Array<{id, name}>, so check first element
				const tagIds =
					updates.tags.length > 0 && typeof updates.tags[0] === "string"
						? (updates.tags as unknown as string[])
						: updates.tags.map((t) => (typeof t === "string" ? t : t.id));
				transactionUpdates.tagIds = tagIds;
			}
			// Only call setTransaction if we have updates
			if (Object.keys(transactionUpdates).length > 0) {
				setTransaction(id, transactionUpdates);
			}
		},
		[setTransaction]
	);

	// Tag options for filter/bulk edit (with label for FilterOption)
	const tagOptions = useMemo(
		() =>
			Object.values(tags)
				.filter((t): t is Tag & { $cid: string } => typeof t === "object")
				.map((t) => ({
					id: t.id,
					label: t.name,
				})),
		[tags]
	);

	// Tag options for inline editing (with name for TagOption)
	const tagOptionsForInlineEdit = useMemo(
		() =>
			Object.values(tags)
				.filter((t): t is Tag & { $cid: string } => typeof t === "object")
				.map((t) => ({
					id: t.id,
					name: t.name,
				})),
		[tags]
	);

	// Status options for filter/bulk edit (with label for FilterOption)
	const statusOptions = useMemo(
		() =>
			Object.values(statuses)
				.filter((s): s is Status & { $cid: string } => typeof s === "object")
				.map((s) => ({
					id: s.id,
					label: s.name,
				})),
		[statuses]
	);

	// Status options for inline editing (with name and behavior for StatusOption)
	const statusOptionsForInlineEdit = useMemo(
		() =>
			Object.values(statuses)
				.filter((s): s is Status & { $cid: string } => typeof s === "object")
				.map((s) => ({
					id: s.id,
					name: s.name,
					behavior: s.behavior as "treatAsPaid" | null | undefined,
				})),
		[statuses]
	);

	// Account options for filter/bulk edit (with label for FilterOption)
	const accountOptionsForFilter = useMemo(
		() =>
			accountOptions.map((acc) => ({
				id: acc.id,
				label: acc.name,
			})),
		[accountOptions]
	);

	// People options for filter (with label for FilterOption)
	const peopleOptions = useMemo(
		() =>
			Object.values(people)
				.filter((p): p is Person & { $cid: string } => typeof p === "object")
				.map((p) => ({
					id: p.id,
					label: p.name,
				})),
		[people]
	);

	return (
		<div className="flex h-full flex-col">
			{/* Page header */}
			<div className="border-b px-6 py-4">
				<h1 className="font-semibold text-2xl">Transactions</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
					{hasActiveFilters(filters) && " (filtered)"}
				</p>
			</div>

			{/* Transactions content */}
			<div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
				{/* Filters */}
				<TransactionFilters
					filters={filters}
					onChange={setFilters}
					availableTags={tagOptions}
					availablePeople={peopleOptions}
					availableAccounts={accountOptionsForFilter}
					availableStatuses={statusOptions}
				/>

				{/* Transaction Table */}
				<div className="flex-1 overflow-hidden rounded-lg border">
					{/* Add Transaction Row */}
					<AddTransactionRow
						availableAccounts={accountOptions}
						onAdd={handleAddTransaction}
						defaultAccountId={accountOptions[0]?.id}
						selectedCount={selectedCount}
					/>

					{/* Table */}
					<TransactionTable
						transactions={tableData}
						presenceByTransactionId={presenceByTransactionId}
						selectedIds={selectedIds}
						availableStatuses={statusOptionsForInlineEdit}
						availableTags={tagOptionsForInlineEdit}
						onCreateTag={handleCreateTag}
						onSelectionChange={setSelectedIds}
						onLoadMore={handleLoadMore}
						hasMore={hasMore}
						onTransactionDelete={handleSingleDelete}
						onResolveDuplicate={handleResolveDuplicate}
						onTransactionUpdate={handleTransactionUpdate}
					/>
				</div>

				{/* Bulk Edit Toolbar */}
				{selectedCount > 0 && (
					<BulkEditToolbar
						selectedCount={selectedCount}
						onClearSelection={clearSelection}
						onDelete={handleBulkDelete}
						onSetTags={handleBulkSetTags}
						onSetStatus={handleBulkSetStatus}
						onSetAccount={handleBulkSetAccount}
						onSetDescription={handleBulkSetDescription}
						onSetAmount={handleBulkSetAmount}
						availableTags={tagOptions}
						availableStatuses={statusOptions}
						availableAccounts={accountOptionsForFilter}
					/>
				)}
			</div>
		</div>
	);
}
