"use client";

/**
 * Transactions Page
 *
 * Main transactions view with filtering, inline editing, bulk edit,
 * and real-time collaborative sync.
 *
 * Uses hierarchical transaction storage for O(1) account filtering
 * and pre-sorted data (date desc, creationInstant desc, importRowIndex asc).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import {
    BulkEditToolbar,
    createEmptyFilters,
    hasActiveFilters,
    type NewTransactionData,
    TransactionFilters,
    type TransactionFiltersState,
    type TransactionRowData,
    TransactionTable,
    TransactionTableToolbar,
} from "@/components/features/transactions";
import { useToast } from "@/components/ui/toast";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";

/** Threshold for showing warning when selecting all */
const LARGE_SELECTION_THRESHOLD = 500;

import { Temporal } from "temporal-polyfill";

import { useVaultPresence } from "@/hooks/use-vault-presence";
import {
    useActiveAccounts,
    useActivePeople,
    useActiveTags,
    useActiveTransactions,
    useStatuses,
    useTransactionActions,
    useVaultAction,
} from "@/lib/crdt/context";
import type { InsertTransactionInput } from "@/lib/crdt/mutations";
import { filterTransactions } from "@/lib/crdt/queries";
import type { Account, Person, Status, Tag, Transaction } from "@/lib/crdt/schema";
import { getNextTagColor } from "@/lib/domain";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";

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

    // CRDT state - transactions are pre-sorted by the hierarchical structure
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

    // Transaction mutations from hierarchical structure
    const {
        insertTransaction,
        updateTransaction,
        moveTransaction,
        deleteTransaction,
        unnestDuplicate,
    } = useTransactionActions();

    // Legacy vault actions for non-transaction mutations
    const addTag = useVaultAction((state, tag: { id: string; name: string; color: string }) => {
        state.tags[tag.id] = {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            parentTagId: "",
            isTransfer: false,
        } as unknown as (typeof state.tags)[string];
    });

    // Filter state
    const [filters, setFilters] = useState<TransactionFiltersState>(createEmptyFilters());

    // Pagination state
    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

    // Selection state - simple Set instead of custom hook
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const selectedCount = selectedIds.size;

    // Add transaction state
    const [isAddingTransaction, setIsAddingTransaction] = useState(false);

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

    // Filter transactions using the query helper
    // Data is already sorted by the hierarchical structure
    const filteredTransactions = useMemo(() => {
        return filterTransactions(transactions, {
            dateRange: {
                start: filters.dateRange.start
                    ? Temporal.PlainDate.from(filters.dateRange.start)
                    : undefined,
                end: filters.dateRange.end
                    ? Temporal.PlainDate.from(filters.dateRange.end)
                    : undefined,
            },
            tagIds: filters.tagIds.length > 0 ? filters.tagIds : undefined,
            personIds: filters.personIds.length > 0 ? filters.personIds : undefined,
            accountIds: filters.accountIds.length > 0 ? filters.accountIds : undefined,
            statusIds: filters.statusIds.length > 0 ? filters.statusIds : undefined,
            search: filters.search || undefined,
            showDuplicatesOnly: filters.showDuplicatesOnly,
            excludeDeleted: true,
            // Data is pre-sorted, but filterTransactions preserves order when sortBy is "date" and sortDirection is "desc"
            sortBy: "date",
            sortDirection: "desc",
        });
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
                // Check if this transaction has suspected duplicates (is a parent with nested dups)
                const hasDuplicates = tx.suspectedDuplicates && tx.suspectedDuplicates.length > 0;
                return {
                    id: tx.id,
                    date: tx.date.toString(),
                    description: tx.description || "",
                    notes: tx.notes || "",
                    amount: tx.amount as number,
                    account: typeof acc === "object" ? acc.name : "Unknown",
                    accountId: tx.accountId,
                    currency: typeof acc === "object" ? acc.currency : undefined,
                    status: typeof stat === "object" ? stat.name : "Unknown",
                    statusId: tx.statusId,
                    tags: (tx.tagIds ?? []).map((id) => {
                        const tag = tags[id];
                        return {
                            id,
                            name: typeof tag === "object" ? tag.name : "Unknown",
                            color: typeof tag === "object" ? tag.color : undefined,
                        };
                    }),
                    balance: 0, // Will be calculated separately
                    // For now, mark as having duplicates if it has nested suspected duplicates
                    possibleDuplicateOf: hasDuplicates ? "has-duplicates" : undefined,
                    // Include the nested duplicates for rendering
                    suspectedDuplicates: tx.suspectedDuplicates,
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
                    currency: acc.currency,
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

    // Handle add transaction - uses insertTransaction mutation
    const handleAddTransaction = useCallback(
        (data: NewTransactionData) => {
            const now = Temporal.Now.instant();
            insertTransaction({
                transaction: {
                    id: generateId(),
                    date: Temporal.PlainDate.from(data.date),
                    description: data.description,
                    notes: data.notes ?? "",
                    amount: asMinorUnits(data.amount),
                    accountId: data.accountId,
                    tagIds: data.tagIds ?? [],
                    statusId: data.statusId ?? defaultStatusId,
                    allocations: {},
                    importId: "",
                    creationInstant: now,
                    importRowIndex: 0, // Manual transactions get index 0
                } as InsertTransactionInput["transaction"],
            });
        },
        [insertTransaction, defaultStatusId]
    );

    // Handle bulk delete - uses deleteTransaction mutation
    const handleBulkDelete = useCallback(() => {
        // We need transaction locations for the new delete mutation
        // For now, find each transaction and delete it
        for (const id of selectedIds) {
            const tx = transactions.find((t) => t.id === id);
            if (tx) {
                deleteTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id,
                    },
                });
            }
        }
        clearSelection();
    }, [selectedIds, transactions, deleteTransaction, clearSelection]);

    // Handle bulk set tags
    const handleBulkSetTags = useCallback(
        (tagIds: string[]) => {
            for (const id of selectedIds) {
                const tx = transactions.find((t) => t.id === id);
                if (tx) {
                    updateTransaction({
                        location: {
                            accountId: tx.accountId,
                            date: tx.date,
                            transactionId: tx.id,
                        },
                        updates: { tagIds },
                    });
                }
            }
        },
        [selectedIds, transactions, updateTransaction]
    );

    // Handle bulk set status
    const handleBulkSetStatus = useCallback(
        (statusId: string) => {
            for (const id of selectedIds) {
                const tx = transactions.find((t) => t.id === id);
                if (tx) {
                    updateTransaction({
                        location: {
                            accountId: tx.accountId,
                            date: tx.date,
                            transactionId: tx.id,
                        },
                        updates: { statusId },
                    });
                }
            }
        },
        [selectedIds, transactions, updateTransaction]
    );

    // Handle bulk set account - uses moveTransaction for account changes
    const handleBulkSetAccount = useCallback(
        (accountId: string) => {
            for (const id of selectedIds) {
                const tx = transactions.find((t) => t.id === id);
                if (tx && tx.accountId !== accountId) {
                    // Account change requires move since it's a different tree
                    moveTransaction({
                        location: {
                            accountId: tx.accountId,
                            date: tx.date,
                            transactionId: tx.id,
                        },
                        newDate: tx.date,
                        newAccountId: accountId,
                    });
                }
            }
        },
        [selectedIds, transactions, moveTransaction]
    );

    // Handle bulk set notes
    const handleBulkSetNotes = useCallback(
        (notes: string) => {
            for (const id of selectedIds) {
                const tx = transactions.find((t) => t.id === id);
                if (tx) {
                    updateTransaction({
                        location: {
                            accountId: tx.accountId,
                            date: tx.date,
                            transactionId: tx.id,
                        },
                        updates: { notes },
                    });
                }
            }
        },
        [selectedIds, transactions, updateTransaction]
    );

    // Handle bulk set amount
    const handleBulkSetAmount = useCallback(
        (amount: number) => {
            for (const id of selectedIds) {
                const tx = transactions.find((t) => t.id === id);
                if (tx) {
                    updateTransaction({
                        location: {
                            accountId: tx.accountId,
                            date: tx.date,
                            transactionId: tx.id,
                        },
                        updates: { amount: asMinorUnits(amount) },
                    });
                }
            }
        },
        [selectedIds, transactions, updateTransaction]
    );

    // Handle creating a new tag
    const handleCreateTag = useCallback(
        async (name: string): Promise<{ id: string; name: string; color?: string }> => {
            const id = generateId();
            const usedColors = Object.values(tags)
                .filter((t): t is Tag & { $cid: string } => typeof t === "object")
                .map((t) => t.color);
            const color = getNextTagColor(usedColors);
            addTag({ id, name, color });
            return { id, name, color };
        },
        [addTag, tags]
    );

    // Handle single transaction delete
    const handleSingleDelete = useCallback(
        (id: string) => {
            const tx = transactions.find((t) => t.id === id);
            if (tx) {
                deleteTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id,
                    },
                });
            }
            // Clear selection if the deleted transaction was selected
            if (selectedIds.has(id)) {
                setSelectedIds((prev) => {
                    const newSelection = new Set(prev);
                    newSelection.delete(id);
                    return newSelection;
                });
            }
        },
        [transactions, deleteTransaction, selectedIds]
    );

    // Handle resolve duplicate (unnest from parent)
    const handleResolveDuplicate = useCallback(
        (id: string) => {
            // Find the parent transaction that contains this duplicate
            for (const tx of transactions) {
                const dupIndex = tx.suspectedDuplicates?.findIndex((d) => d.id === id);
                if (dupIndex !== undefined && dupIndex >= 0) {
                    unnestDuplicate({
                        parentLocation: {
                            accountId: tx.accountId,
                            date: tx.date,
                            transactionId: tx.id,
                        },
                        duplicateId: id,
                    });
                    return;
                }
            }
        },
        [transactions, unnestDuplicate]
    );

    // Handle inline edit update (from TransactionTable)
    const handleTransactionUpdate = useCallback(
        (id: string, updates: Partial<TransactionRowData>) => {
            // Find the transaction to get its location
            const tx = transactions.find((t) => t.id === id);
            if (!tx) return;

            // Check if date or account changed - requires move
            // Convert string date from TransactionRowData to PlainDate for comparison
            const newPlainDate = updates.date ? Temporal.PlainDate.from(updates.date) : undefined;
            const newAccountId = updates.accountId;
            const dateChanged =
                newPlainDate && Temporal.PlainDate.compare(newPlainDate, tx.date) !== 0;
            const accountChanged = newAccountId && newAccountId !== tx.accountId;

            if (dateChanged || accountChanged) {
                // Use moveTransaction for date/account changes
                moveTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id,
                    },
                    newDate: newPlainDate ?? tx.date,
                    newAccountId: accountChanged ? newAccountId : undefined,
                });
                // Remove date and accountId from updates since moveTransaction handles them
                delete updates.date;
                delete updates.accountId;
            }

            // Map remaining TransactionRowData fields to Transaction fields
            const transactionUpdates: Partial<Transaction> = {};
            if ("description" in updates && updates.description !== undefined) {
                transactionUpdates.description = updates.description;
            }
            if ("notes" in updates && updates.notes !== undefined) {
                transactionUpdates.notes = updates.notes;
            }
            if ("amount" in updates && updates.amount !== undefined) {
                transactionUpdates.amount = asMinorUnits(updates.amount);
            }
            if ("statusId" in updates && updates.statusId !== undefined) {
                transactionUpdates.statusId = updates.statusId;
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

            // Only call updateTransaction if we have updates
            if (Object.keys(transactionUpdates).length > 0) {
                // Use the new location if it changed
                const location = {
                    accountId: accountChanged ? newAccountId! : tx.accountId,
                    date: dateChanged ? newPlainDate! : tx.date,
                    transactionId: tx.id,
                };
                updateTransaction({
                    location,
                    updates: transactionUpdates,
                });
            }
        },
        [transactions, updateTransaction, moveTransaction]
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
                    color: t.color,
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-6">
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
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
                {/* Toolbar with Add button and counts */}
                <TransactionTableToolbar
                    isAddingTransaction={isAddingTransaction}
                    onAddClick={() => setIsAddingTransaction(true)}
                    selectedCount={selectedCount}
                    totalCount={filteredTransactions.length}
                    isFiltered={hasActiveFilters(filters)}
                />

                {/* Table */}
                <TransactionTable
                    transactions={tableData}
                    presenceByTransactionId={presenceByTransactionId}
                    selectedIds={selectedIds}
                    availableAccounts={accountOptions}
                    availableStatuses={statusOptionsForInlineEdit}
                    availableTags={tagOptionsForInlineEdit}
                    onCreateTag={handleCreateTag}
                    onSelectionChange={setSelectedIds}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    onTransactionDelete={handleSingleDelete}
                    onResolveDuplicate={handleResolveDuplicate}
                    onTransactionUpdate={handleTransactionUpdate}
                    isAddingTransaction={isAddingTransaction}
                    onAddTransaction={handleAddTransaction}
                    onCancelAddTransaction={() => setIsAddingTransaction(false)}
                    defaultAccountId={accountOptions[0]?.id}
                    defaultStatusId={defaultStatusId}
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
                    onSetNotes={handleBulkSetNotes}
                    onSetAmount={handleBulkSetAmount}
                    availableTags={tagOptions}
                    availableStatuses={statusOptions}
                    availableAccounts={accountOptionsForFilter}
                />
            )}
        </div>
    );
}
