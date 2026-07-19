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

import { DescriptionAliasChangeModal } from "@/components/features/description-aliases/DescriptionAliasChangeModal";
import {
    BulkEditToolbar,
    createEmptyFilters,
    hasActiveFilters,
    type NewTransactionData,
    TransactionFilters,
    type TransactionFiltersState,
    type TransactionRowData,
    TransactionTable,
    TransactionTableToolbar
} from "@/components/features/transactions";
import { useToast } from "@/components/ui/toast";
/** Threshold for showing warning when selecting all */
const LARGE_SELECTION_THRESHOLD = 500;

import { Temporal } from "temporal-polyfill";

import {
    useActiveAccounts,
    useActivePeople,
    useActiveTags,
    useActiveTransactions,
    useDescriptionAliases,
    useDescriptionAliasActions,
    useStatuses,
    useTransactionActions,
    useVaultAction
} from "@/lib/crdt/context";
import type { InsertTransactionInput } from "@/lib/crdt/mutations";
import { filterTransactions } from "@/lib/crdt/queries";
import type { Account, Person, Status, Tag, Transaction } from "@/lib/crdt/schema";
import { getNextTagColor } from "@/lib/domain";
import { asMinorUnits } from "@/lib/domain/currency";
import {
    getActiveRealAliases,
    getAliasTotalTransactionCount,
    makeSymlinkMutations,
    resolveAlias
} from "@/lib/domain/description-aliases";

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
    const aliases = useDescriptionAliases();
    const statuses = useStatuses();
    const people = useActivePeople();

    // Transaction mutations from hierarchical structure
    const {
        insertTransaction,
        updateTransaction,
        moveTransaction,
        deleteTransaction,
        unnestDuplicate
    } = useTransactionActions();

    // Legacy vault actions for non-transaction mutations
    const addTag = useVaultAction((state, tag: { id: string; name: string; color: string }) => {
        state.tags[tag.id] = {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            parentTagId: "",
            isTransfer: false
        } as unknown as (typeof state.tags)[string];
    });

    // Description alias mutations
    const { addAlias, updateAlias, deleteAlias } = useDescriptionAliasActions();

    // Available real aliases for autocomplete
    const availableAliasOptions = useMemo(
        () =>
            getActiveRealAliases(aliases).map((a) => ({
                id: a.id,
                name: a.name
            })),
        [aliases]
    );

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
                type: "warning"
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
                    : undefined
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
            sortDirection: "desc"
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
                // Resolve description alias through symlinks
                const resolvedAlias = tx.descriptionAliasId
                    ? resolveAlias(tx.descriptionAliasId, aliases)
                    : undefined;
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
                            color: typeof tag === "object" ? tag.color : undefined
                        };
                    }),
                    balance: 0, // Will be calculated separately
                    // For now, mark as having duplicates if it has nested suspected duplicates
                    possibleDuplicateOf: hasDuplicates ? "has-duplicates" : undefined,
                    // Include the nested duplicates for rendering
                    suspectedDuplicates: tx.suspectedDuplicates,
                    // Description alias fields
                    descriptionAliasId: tx.descriptionAliasId,
                    descriptionAliasName: resolvedAlias?.name,
                    originalDescription: tx.description || undefined
                };
            }),
        [displayedTransactions, accounts, statuses, tags, aliases]
    );

    // Account options for AddTransactionRow
    const accountOptions = useMemo(
        () =>
            Object.values(accounts)
                .filter((acc): acc is Account & { $cid: string } => typeof acc === "object")
                .map((acc) => ({
                    id: acc.id,
                    name: acc.name,
                    currency: acc.currency
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
                    importRowIndex: 0 // Manual transactions get index 0
                } as InsertTransactionInput["transaction"]
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
                        transactionId: tx.id
                    }
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
                            transactionId: tx.id
                        },
                        updates: { tagIds }
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
                            transactionId: tx.id
                        },
                        updates: { statusId }
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
                            transactionId: tx.id
                        },
                        newDate: tx.date,
                        newAccountId: accountId
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
                            transactionId: tx.id
                        },
                        updates: { notes }
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
                            transactionId: tx.id
                        },
                        updates: { amount: asMinorUnits(amount) }
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

    // Description alias state for modal
    const [aliasModalState, setAliasModalState] = useState<{
        open: boolean;
        mode: "change" | "remove";
        transactionId: string;
        newText?: string;
        newAliasId?: string;
    }>({ open: false, mode: "change", transactionId: "" });

    // Handle description commit text (user typed and pressed Enter/blurred)
    const handleDescriptionCommitText = useCallback(
        (txId: string, text: string) => {
            const tx = transactions.find((t) => t.id === txId);
            if (!tx) return;

            const trimmedText = text.trim();
            if (!trimmedText) return;

            const currentAliasId = tx.descriptionAliasId;

            if (!currentAliasId) {
                // No current alias - create new alias and apply
                const aliasId = generateId();
                addAlias({
                    id: aliasId,
                    name: trimmedText,
                    targetAliasId: undefined,
                    symlinkIds: {},
                    transactionIds: { [txId]: true },
                    deletedAt: undefined
                });
                updateTransaction({
                    location: { accountId: tx.accountId, date: tx.date, transactionId: tx.id },
                    updates: { descriptionAliasId: aliasId }
                });
                return;
            }

            // Has current alias - check transaction count
            const totalCount = getAliasTotalTransactionCount(currentAliasId, aliases);
            if (totalCount <= 1) {
                // Only 1 transaction - rename the alias directly
                const resolved = resolveAlias(currentAliasId, aliases);
                if (resolved) {
                    updateAlias({ id: resolved.id, updates: { name: trimmedText } });
                }
            } else {
                // Multiple transactions - show modal
                setAliasModalState({
                    open: true,
                    mode: "change",
                    transactionId: txId,
                    newText: trimmedText
                });
            }
        },
        [transactions, aliases, addAlias, updateAlias, updateTransaction]
    );

    // Handle selecting an existing alias from dropdown
    const handleDescriptionSelectAlias = useCallback(
        (txId: string, aliasId: string) => {
            const tx = transactions.find((t) => t.id === txId);
            if (!tx) return;

            const currentAliasId = tx.descriptionAliasId;

            if (!currentAliasId) {
                // No current alias - apply directly
                updateTransaction({
                    location: { accountId: tx.accountId, date: tx.date, transactionId: tx.id },
                    updates: { descriptionAliasId: aliasId }
                });
                // Add to alias's transactionIds
                const alias = aliases[aliasId];
                if (typeof alias === "object") {
                    updateAlias({
                        id: aliasId,
                        updates: { transactionIds: { ...alias.transactionIds, [txId]: true } }
                    });
                }
                return;
            }

            // Has current alias - check count
            const totalCount = getAliasTotalTransactionCount(currentAliasId, aliases);
            if (totalCount <= 1) {
                // Single tx - change directly
                // Remove from old alias
                const oldAlias = aliases[currentAliasId];
                if (typeof oldAlias === "object") {
                    const newTxIds = { ...oldAlias.transactionIds };
                    delete newTxIds[txId];
                    updateAlias({ id: currentAliasId, updates: { transactionIds: newTxIds } });
                }
                // Add to new alias
                const newAlias = aliases[aliasId];
                if (typeof newAlias === "object") {
                    updateAlias({
                        id: aliasId,
                        updates: { transactionIds: { ...newAlias.transactionIds, [txId]: true } }
                    });
                }
                updateTransaction({
                    location: { accountId: tx.accountId, date: tx.date, transactionId: tx.id },
                    updates: { descriptionAliasId: aliasId }
                });
            } else {
                // Multiple - show modal
                setAliasModalState({
                    open: true,
                    mode: "change",
                    transactionId: txId,
                    newAliasId: aliasId
                });
            }
        },
        [transactions, aliases, updateAlias, updateTransaction]
    );

    // Modal: "just this one" handler
    const handleAliasJustThis = useCallback(() => {
        const { transactionId, newText, newAliasId } = aliasModalState;
        const tx = transactions.find((t) => t.id === transactionId);
        if (!tx) return;

        const currentAliasId = tx.descriptionAliasId;

        // Remove tx from old alias's transactionIds
        if (currentAliasId) {
            const oldAlias = aliases[currentAliasId];
            if (typeof oldAlias === "object") {
                const newTxIds = { ...oldAlias.transactionIds };
                delete newTxIds[transactionId];
                updateAlias({ id: currentAliasId, updates: { transactionIds: newTxIds } });
            }
        }

        if (newText) {
            // Create new alias for this transaction
            const aliasId = generateId();
            addAlias({
                id: aliasId,
                name: newText,
                targetAliasId: undefined,
                symlinkIds: {},
                transactionIds: { [transactionId]: true },
                deletedAt: undefined
            });
            updateTransaction({
                location: { accountId: tx.accountId, date: tx.date, transactionId: tx.id },
                updates: { descriptionAliasId: aliasId }
            });
        } else if (newAliasId) {
            // Apply the selected alias
            const alias = aliases[newAliasId];
            if (typeof alias === "object") {
                updateAlias({
                    id: newAliasId,
                    updates: { transactionIds: { ...alias.transactionIds, [transactionId]: true } }
                });
            }
            updateTransaction({
                location: { accountId: tx.accountId, date: tx.date, transactionId: tx.id },
                updates: { descriptionAliasId: newAliasId }
            });
        }

        setAliasModalState({ open: false, mode: "change", transactionId: "" });
    }, [aliasModalState, transactions, aliases, addAlias, updateAlias, updateTransaction]);

    // Modal: "all" handler
    const handleAliasAll = useCallback(() => {
        const { transactionId, newText, newAliasId } = aliasModalState;
        const tx = transactions.find((t) => t.id === transactionId);
        if (!tx) return;

        const currentAliasId = tx.descriptionAliasId;
        if (!currentAliasId) return;

        if (newText) {
            // Rename the existing alias (affects all transactions)
            const resolved = resolveAlias(currentAliasId, aliases);
            if (resolved) {
                updateAlias({ id: resolved.id, updates: { name: newText } });
            }
        } else if (newAliasId) {
            // Resolve to the real alias (in case currentAliasId is a symlink)
            const resolvedCurrent = resolveAlias(currentAliasId, aliases);
            const realCurrentId = resolvedCurrent?.id ?? currentAliasId;

            // Make old alias a symlink to new alias using makeSymlinkMutations
            const mutations = makeSymlinkMutations(realCurrentId, newAliasId, aliases);

            // Repoint existing symlinks
            for (const { symlinkId, newTargetId } of mutations.repointerSymlinks) {
                updateAlias({ id: symlinkId, updates: { targetAliasId: newTargetId } });
            }

            // Add all symlinks to target
            const targetAlias = aliases[newAliasId];
            if (typeof targetAlias === "object") {
                const newSymlinkIds = { ...targetAlias.symlinkIds };
                for (const id of mutations.addSymlinksToTarget) {
                    newSymlinkIds[id] = true;
                }
                updateAlias({ id: newAliasId, updates: { symlinkIds: newSymlinkIds } });
            }

            // Source becomes symlink
            const { sourceId, targetId } = mutations.sourceBecomesSymlink;
            updateAlias({
                id: sourceId,
                updates: { targetAliasId: targetId, symlinkIds: {} }
            });
        }

        setAliasModalState({ open: false, mode: "change", transactionId: "" });
    }, [aliasModalState, transactions, aliases, updateAlias]);

    // Handle single transaction delete
    const handleSingleDelete = useCallback(
        (id: string) => {
            const tx = transactions.find((t) => t.id === id);
            if (tx) {
                deleteTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id
                    }
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
                            transactionId: tx.id
                        },
                        duplicateId: id
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
                        transactionId: tx.id
                    },
                    newDate: newPlainDate ?? tx.date,
                    newAccountId: accountChanged ? newAccountId : undefined
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
                    transactionId: tx.id
                };
                updateTransaction({
                    location,
                    updates: transactionUpdates
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
                    label: t.name
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
                    color: t.color
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
                    label: s.name
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
                    behavior: s.behavior as "treatAsPaid" | null | undefined
                })),
        [statuses]
    );

    // Account options for filter/bulk edit (with label for FilterOption)
    const accountOptionsForFilter = useMemo(
        () =>
            accountOptions.map((acc) => ({
                id: acc.id,
                label: acc.name
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
                    label: p.name
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
                    availableAliases={availableAliasOptions}
                    onDescriptionCommitText={handleDescriptionCommitText}
                    onDescriptionSelectAlias={handleDescriptionSelectAlias}
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

            {/* Description Alias Change Modal */}
            <DescriptionAliasChangeModal
                open={aliasModalState.open}
                onClose={() =>
                    setAliasModalState({ open: false, mode: "change", transactionId: "" })
                }
                mode={aliasModalState.mode}
                onJustThis={handleAliasJustThis}
                onAll={handleAliasAll}
            />
        </div>
    );
}
