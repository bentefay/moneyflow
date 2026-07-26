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

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DescriptionAliasChangeModal } from "@/components/features/description-aliases/DescriptionAliasChangeModal";
import {
    planDescriptionAliasCommit,
    type DescriptionAliasTargetIntent
} from "@/components/features/description-aliases/descriptionAliasInteraction";
import { useDescriptionAliasLookup } from "@/components/features/description-aliases/useDescriptionAliasLookup";
import { ImportDropTarget, useImportFileTransfer } from "@/components/features/import";
import {
    BulkEditToolbar,
    buildAllocationColumnModel,
    createEmptyFilters,
    hasActiveFilters,
    TransactionFilters,
    type TransactionFiltersState,
    type TransactionRowData,
    TransactionTable,
    TransactionTableToolbar
} from "@/components/features/transactions";
import type { DescriptionAliasEditOrigin } from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import { TransactionRuleRobot } from "@/components/features/transactions/TransactionRuleRobot";
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
    usePeople,
    useStatuses,
    useTransactionActions,
    useVaultAction
} from "@/lib/crdt/context";
import type { DescriptionAliasTarget } from "@/lib/crdt/description-aliases";
import { resolvePersonDisplayName } from "@/lib/crdt/person";
import { compareTransactionOrder, filterTransactions } from "@/lib/crdt/queries";
import type { Account, Person, Status, Tag, Transaction } from "@/lib/crdt/schema";
import { getNextTagColor } from "@/lib/domain";
import { type RuleMatchSubject } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

// Number of transactions to load per page
const PAGE_SIZE = 50;

/**
 * Search param carrying a stable source-transaction ID, used by the People page "View transaction"
 * action. It is always the stable ID, never a row index, so the target survives filtering,
 * pagination and reordering.
 */
export const SOURCE_TRANSACTION_PARAM = "transaction";

/** Generate unique ID */
function generateId(): string {
    return crypto.randomUUID();
}

function materializeAliasTarget(target: DescriptionAliasTargetIntent): DescriptionAliasTarget {
    return target.kind === "existing"
        ? target
        : { kind: "new", aliasId: generateId(), name: target.name };
}

/**
 * Transactions page route.
 *
 * `useSearchParams` requires a Suspense boundary during prerendering, so the interactive page is
 * mounted underneath one.
 */
export default function TransactionsPage() {
    return (
        <Suspense fallback={null}>
            <TransactionsPageContent />
        </Suspense>
    );
}

/**
 * Transactions page component.
 */
function TransactionsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedTransactionId = searchParams.get(SOURCE_TRANSACTION_PARAM);
    const { stageImportFile } = useImportFileTransfer();

    // Toast notifications
    const { toast } = useToast();

    // CRDT state - transactions are pre-sorted by the hierarchical structure
    const transactions = useActiveTransactions();
    const accounts = useActiveAccounts();
    const tags = useActiveTags();
    const aliases = useDescriptionAliases();
    const aliasLookup = useDescriptionAliasLookup(aliases);
    const statuses = useStatuses();
    const people = useActivePeople();
    const allPeople = usePeople();

    // Transaction mutations from hierarchical structure
    const {
        insertTransaction,
        updateTransaction,
        setTransactionAllocation,
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
    const {
        assignDescriptionAlias,
        assignDescriptionAliasByExactName,
        changeAllDescriptionAliases,
        changeOneDescriptionAlias,
        removeAllDescriptionAliases,
        removeOneDescriptionAlias,
        renameDescriptionAlias
    } = useDescriptionAliasActions();

    // Available real aliases for autocomplete
    const availableAliasOptions = useMemo(
        () =>
            aliasLookup.activeRealAliases.map((a) => ({
                id: a.id,
                name: a.name
            })),
        [aliasLookup]
    );

    // Filter state
    const [filters, setFilters] = useState<TransactionFiltersState>(createEmptyFilters());

    // Pagination state
    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
    const [transactionIdToReveal, setTransactionIdToReveal] = useState<string | null>(null);
    const transactionTableContainerRef = useRef<HTMLDivElement>(null);

    // Selection state - simple Set instead of custom hook
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const lastManualCreationInstantRef = useRef<Temporal.Instant | null>(null);

    const handleAcceptedImportFile = useCallback(
        (file: File) => {
            stageImportFile(file);
            router.push("/imports/new");
        },
        [router, stageImportFile]
    );

    // Clear selection helper
    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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

    // "View transaction" from the People page carries one stable source ID. It is a one-shot
    // navigation intent, not a standing selection override: the row is paged in, selected and
    // revealed exactly once, and the param is then dropped from the URL. Every later render — and
    // therefore every bulk action — derives selection from `selectedIds` alone, so the landed row
    // can be deselected like any other row. Matching is on the stable ID, never a row index, so the
    // target survives filtering, pagination and reordering.
    //
    // The seed runs during render rather than in an effect so the row is already selected on its
    // first paint (no flicker), which is React's documented adjust-state-while-rendering pattern.
    // `landedSourceId` makes it idempotent, and the vault loads asynchronously, so an intent whose
    // target has not arrived yet stays pending instead of being dropped against an empty list.
    const [landedSourceId, setLandedSourceId] = useState<string | null>(null);
    const pendingSourceIndex =
        requestedTransactionId == null || requestedTransactionId === landedSourceId
            ? -1
            : filteredTransactions.findIndex(
                  (transaction) => transaction.id === requestedTransactionId
              );
    if (requestedTransactionId == null) {
        // The param is gone, so the intent is spent and the same source can be revisited later.
        if (landedSourceId != null) setLandedSourceId(null);
    } else if (pendingSourceIndex >= 0) {
        setLandedSourceId(requestedTransactionId);
        // Extend the page just far enough to include the requested source.
        const requiredDisplayCount = Math.ceil((pendingSourceIndex + 1) / PAGE_SIZE) * PAGE_SIZE;
        setDisplayCount((currentDisplayCount) =>
            Math.max(currentDisplayCount, requiredDisplayCount)
        );
        setSelectedIds(new Set([requestedTransactionId]));
        setTransactionIdToReveal(requestedTransactionId);
    }

    // Paginate
    const displayedTransactions = useMemo(
        () => filteredTransactions.slice(0, displayCount),
        [filteredTransactions, displayCount]
    );
    const displayedTransactionIds = useMemo(
        () => new Set(displayedTransactions.map((transaction) => transaction.id)),
        [displayedTransactions]
    );
    const selectedTransactionIds = useMemo(
        () => new Set([...selectedIds].filter((id) => displayedTransactionIds.has(id))),
        [displayedTransactionIds, selectedIds]
    );
    const selectedCount = selectedTransactionIds.size;
    const hasMore = displayCount < filteredTransactions.length;

    // Selection-driven actions must never target a transaction outside the displayed page.
    useEffect(() => {
        if (selectedCount > LARGE_SELECTION_THRESHOLD) {
            toast({
                message: `Selected ${selectedCount} transactions. Large selections may be slow.`,
                type: "warning"
            });
        }
    }, [selectedCount, toast]);

    // Consuming the intent is what clears the param, so the deep link cannot re-assert itself on a
    // later render. Navigation is a side effect, so it lives here rather than in the render body.
    useEffect(() => {
        if (requestedTransactionId == null || requestedTransactionId !== landedSourceId) return;
        router.replace("/transactions", { scroll: false });
    }, [landedSourceId, requestedTransactionId, router]);

    useEffect(() => {
        if (transactionIdToReveal == null) return;

        const transactionIndex = displayedTransactions.findIndex(
            (transaction) => transaction.id === transactionIdToReveal
        );
        if (transactionIndex < 0) return;

        const grid = transactionTableContainerRef.current?.querySelector<HTMLElement>(
            '[role="grid"][aria-label="Transactions"]'
        );
        const scrollContainer = grid?.parentElement;
        if (!grid || !scrollContainer || displayedTransactions.length === 0) return;

        const estimatedRowHeight = grid.scrollHeight / displayedTransactions.length;
        const precedingVisibleRowIndex = Math.max(0, transactionIndex - 1);
        scrollContainer.scrollTop = grid.offsetTop + precedingVisibleRowIndex * estimatedRowHeight;
        setTransactionIdToReveal(null);
    }, [displayedTransactions, transactionIdToReveal]);

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
                    ? aliasLookup.resolve(tx.descriptionAliasId)
                    : undefined;
                return {
                    id: tx.id,
                    date: tx.date.toString(),
                    description: tx.description || "",
                    notes: tx.notes || "",
                    amount: tx.amount as number,
                    originalAmount: tx.originalAmount as number | undefined,
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
                    originalDescription: tx.description || undefined,
                    allocations: tx.allocations,
                    accountOwnerships:
                        typeof acc === "object" && acc.ownerships ? acc.ownerships : {}
                };
            }),
        [displayedTransactions, accounts, statuses, tags, aliasLookup]
    );

    // Per-row inputs for the inline description-rule robot. The match subject faithfully mirrors the
    // engine's own projection (raw imported description, account, amount, importId => isManual) so
    // the robot's drift detection agrees with what applying the rule would actually do. The current
    // alias is resolved through symlinks to a final real alias id, matching the id a rule implies.
    const robotContextById = useMemo(() => {
        const byId = new Map<
            string,
            {
                readonly subject: RuleMatchSubject;
                readonly currentAliasId: string | null;
                readonly referenceDate: Temporal.PlainDate;
            }
        >();
        for (const tx of displayedTransactions) {
            const rawDescription =
                tx.description != null && tx.description.length > 0 ? tx.description : null;
            const resolvedAliasId = tx.descriptionAliasId
                ? (aliasLookup.resolve(tx.descriptionAliasId)?.id ?? null)
                : null;
            byId.set(tx.id, {
                subject: {
                    descriptionText: rawDescription,
                    accountId: tx.accountId,
                    amount: tx.amount,
                    isManual: tx.importId == null
                },
                currentAliasId: resolvedAliasId,
                referenceDate: tx.date
            });
        }
        return byId;
    }, [displayedTransactions, aliasLookup]);

    const [autoOpenRobotTxId, setAutoOpenRobotTxId] = useState<string | null>(null);

    const renderDescriptionRobot = useCallback(
        (transactionId: string, context: { readonly isEditing: boolean }): React.ReactNode => {
            const entry = robotContextById.get(transactionId);
            if (entry == null) return null;
            return (
                <TransactionRuleRobot
                    autoOpen={autoOpenRobotTxId === transactionId}
                    currentAliasId={entry.currentAliasId}
                    isEditing={context.isEditing}
                    onAutoOpenHandled={() => setAutoOpenRobotTxId(null)}
                    referenceDate={entry.referenceDate}
                    subject={entry.subject}
                    transactionId={transactionId}
                />
            );
        },
        [autoOpenRobotTxId, robotContextById]
    );

    const allocationColumnModel = useMemo(
        () =>
            buildAllocationColumnModel({
                activePeople: Object.values(people)
                    .filter(
                        (person): person is Person & { $cid: string } => typeof person === "object"
                    )
                    .map((person) => ({ id: person.id, name: resolvePersonDisplayName(person) })),
                allPeople: Object.values(allPeople)
                    .filter(
                        (person): person is Person & { $cid: string } => typeof person === "object"
                    )
                    .map((person) => ({
                        deletedAt: person.deletedAt,
                        id: person.id,
                        name: resolvePersonDisplayName(person)
                    })),
                transactions: displayedTransactions
            }),
        [allPeople, displayedTransactions, people]
    );

    // Account options for transaction rows
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

    const handleAddTransaction = useCallback(() => {
        const accountId = accountOptions[0]?.id;
        if (!accountId || !defaultStatusId) return;

        setFilters(createEmptyFilters());

        const now = Temporal.Now.instant();
        const previousCreationInstant = lastManualCreationInstantRef.current;
        const creationInstant =
            previousCreationInstant == null ||
            Temporal.Instant.compare(now, previousCreationInstant) > 0
                ? now
                : previousCreationInstant.add({ nanoseconds: 1 });
        lastManualCreationInstantRef.current = creationInstant;

        const transactionId = generateId();
        const transaction = {
            id: transactionId,
            date: Temporal.Now.plainDateISO(),
            description: "",
            descriptionAliasId: undefined,
            notes: "",
            amount: asMinorUnits(0),
            originalAmount: undefined,
            accountId,
            tagIds: [],
            statusId: defaultStatusId,
            importId: undefined,
            allocations: {},
            creationInstant,
            importRowIndex: undefined,
            deletedAt: undefined
        };
        const insertionIndex = transactions.findIndex(
            (existingTransaction) => compareTransactionOrder(transaction, existingTransaction) < 0
        );
        const canonicalIndex = insertionIndex < 0 ? transactions.length : insertionIndex;
        const requiredDisplayCount = Math.ceil((canonicalIndex + 1) / PAGE_SIZE) * PAGE_SIZE;
        // Retain the canonical prefix while making the created row part of the displayed page.
        setDisplayCount((currentDisplayCount) =>
            Math.max(currentDisplayCount, requiredDisplayCount)
        );
        setTransactionIdToReveal(transactionId);
        insertTransaction({
            transaction
        });
        setSelectedIds(new Set([transactionId]));
    }, [accountOptions, defaultStatusId, insertTransaction, transactions]);

    // Handle bulk delete - uses deleteTransaction mutation
    const handleBulkDelete = useCallback(() => {
        // We need transaction locations for the new delete mutation
        // For now, find each transaction and delete it
        for (const id of selectedTransactionIds) {
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
    }, [selectedTransactionIds, transactions, deleteTransaction, clearSelection]);

    // Handle bulk set tags
    const handleBulkSetTags = useCallback(
        (tagIds: string[]) => {
            for (const id of selectedTransactionIds) {
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
        [selectedTransactionIds, transactions, updateTransaction]
    );

    // Handle bulk set status
    const handleBulkSetStatus = useCallback(
        (statusId: string) => {
            for (const id of selectedTransactionIds) {
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
        [selectedTransactionIds, transactions, updateTransaction]
    );

    // Handle bulk set account - uses moveTransaction for account changes
    const handleBulkSetAccount = useCallback(
        (accountId: string) => {
            for (const id of selectedTransactionIds) {
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
        [selectedTransactionIds, transactions, moveTransaction]
    );

    // Handle bulk set notes
    const handleBulkSetNotes = useCallback(
        (notes: string) => {
            for (const id of selectedTransactionIds) {
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
        [selectedTransactionIds, transactions, updateTransaction]
    );

    // Handle bulk set amount
    const handleBulkSetAmount = useCallback(
        (amount: number) => {
            for (const id of selectedTransactionIds) {
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
        [selectedTransactionIds, transactions, updateTransaction]
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
        target?: DescriptionAliasTargetIntent;
    }>({ open: false, mode: "change", transactionId: "" });
    const aliasModalOriginRef = useRef<DescriptionAliasEditOrigin | null>(null);

    const closeAliasModal = useCallback(() => {
        setAliasModalState({ open: false, mode: "change", transactionId: "" });
    }, []);

    const restoreAliasModalFocus = useCallback(() => {
        const origin = aliasModalOriginRef.current;
        aliasModalOriginRef.current = null;
        if (!origin) return;
        const element = origin.element.isConnected
            ? origin.element
            : origin.container.querySelector<HTMLInputElement>(
                  'input[aria-label="Transaction description"]'
              );
        if (!element) return;
        element.focus({ preventScroll: true });
        element.setSelectionRange(origin.selectionStart, origin.selectionEnd);
    }, []);

    // Handle description commit text (user typed and pressed Enter/blurred)
    const handleDescriptionCommitText = useCallback(
        (txId: string, text: string, origin: DescriptionAliasEditOrigin) => {
            const tx = transactions.find((t) => t.id === txId);
            if (!tx) return;

            const location = { accountId: tx.accountId, date: tx.date, transactionId: tx.id };
            const intent = planDescriptionAliasCommit({
                lookup: aliasLookup,
                currentAliasId: tx.descriptionAliasId,
                text
            });
            switch (intent.kind) {
                case "none":
                    return;
                case "assign":
                    if (intent.target.kind === "existing") {
                        assignDescriptionAlias({ location, aliasId: intent.target.aliasId });
                    } else {
                        assignDescriptionAliasByExactName({
                            location,
                            newAliasId: generateId(),
                            name: intent.target.name
                        });
                    }
                    // A newly assigned alias may now differ from a matching rule; let the robot
                    // open so the user can update the rule (P17C alias-edit -> update rule).
                    setAutoOpenRobotTxId(txId);
                    return;
                case "rename-one":
                    renameDescriptionAlias({ aliasId: intent.aliasId, name: intent.name });
                    return;
                case "change-one":
                    if (!tx.descriptionAliasId) return;
                    changeOneDescriptionAlias({
                        location,
                        expectedAliasId: tx.descriptionAliasId,
                        target: materializeAliasTarget(intent.target)
                    });
                    setAutoOpenRobotTxId(txId);
                    return;
                case "remove-one":
                    if (!tx.descriptionAliasId) return;
                    removeOneDescriptionAlias({
                        location,
                        expectedAliasId: tx.descriptionAliasId
                    });
                    return;
                case "confirm-change":
                    aliasModalOriginRef.current = origin;
                    setAliasModalState({
                        open: true,
                        mode: "change",
                        transactionId: txId,
                        target: intent.target
                    });
                    return;
                case "confirm-remove":
                    aliasModalOriginRef.current = origin;
                    setAliasModalState({ open: true, mode: "remove", transactionId: txId });
            }
        },
        [
            transactions,
            aliasLookup,
            assignDescriptionAlias,
            assignDescriptionAliasByExactName,
            changeOneDescriptionAlias,
            removeOneDescriptionAlias,
            renameDescriptionAlias
        ]
    );

    // Handle selecting an existing alias from dropdown
    const handleDescriptionSelectAlias = useCallback(
        (txId: string, aliasId: string, origin: DescriptionAliasEditOrigin) => {
            const alias = availableAliasOptions.find((option) => option.id === aliasId);
            if (alias) handleDescriptionCommitText(txId, alias.name, origin);
        },
        [availableAliasOptions, handleDescriptionCommitText]
    );

    // Modal: "just this one" handler
    const handleAliasJustThis = useCallback(() => {
        const { transactionId, mode, target } = aliasModalState;
        const tx = transactions.find((t) => t.id === transactionId);
        if (!tx) {
            closeAliasModal();
            return;
        }
        const currentAliasId = tx.descriptionAliasId;
        if (!currentAliasId) {
            closeAliasModal();
            return;
        }
        const location = { accountId: tx.accountId, date: tx.date, transactionId: tx.id };
        if (mode === "remove") {
            removeOneDescriptionAlias({ location, expectedAliasId: currentAliasId });
        } else if (target) {
            changeOneDescriptionAlias({
                location,
                expectedAliasId: currentAliasId,
                target: materializeAliasTarget(target)
            });
        }
        closeAliasModal();
    }, [
        aliasModalState,
        transactions,
        changeOneDescriptionAlias,
        closeAliasModal,
        removeOneDescriptionAlias
    ]);

    // Modal: "all" handler
    const handleAliasAll = useCallback(() => {
        const { transactionId, mode, target } = aliasModalState;
        const tx = transactions.find((t) => t.id === transactionId);
        if (!tx) {
            closeAliasModal();
            return;
        }
        const currentAliasId = tx.descriptionAliasId;
        if (!currentAliasId) {
            closeAliasModal();
            return;
        }
        if (mode === "remove") {
            removeAllDescriptionAliases(currentAliasId);
        } else if (target) {
            const realCurrentId = aliasLookup.resolve(currentAliasId)?.id ?? currentAliasId;
            changeAllDescriptionAliases({
                sourceAliasId: realCurrentId,
                target: materializeAliasTarget(target)
            });
        }
        closeAliasModal();
    }, [
        aliasModalState,
        transactions,
        aliasLookup,
        changeAllDescriptionAliases,
        closeAliasModal,
        removeAllDescriptionAliases
    ]);

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
            if (selectedTransactionIds.has(id)) {
                setSelectedIds((prev) => {
                    const newSelection = new Set(prev);
                    newSelection.delete(id);
                    return newSelection;
                });
            }
        },
        [transactions, deleteTransaction, selectedTransactionIds]
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

    const handleTransactionAllocationUpdate = useCallback(
        (id: string, personId: string, value: number) => {
            const transaction = transactions.find((candidate) => candidate.id === id);
            if (!transaction) return;

            setTransactionAllocation({
                location: {
                    accountId: transaction.accountId,
                    date: transaction.date,
                    transactionId: transaction.id
                },
                personId,
                value
            });
        },
        [setTransactionAllocation, transactions]
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
                    label: resolvePersonDisplayName(p)
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
            <ImportDropTarget
                ariaLabel="Transactions table file drop target"
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border"
                containerRef={transactionTableContainerRef}
                onFileAccepted={handleAcceptedImportFile}
                testId="transaction-import-drop-target"
            >
                {/* Toolbar with Add button and counts */}
                <TransactionTableToolbar
                    onAddClick={handleAddTransaction}
                    selectedCount={selectedCount}
                    totalCount={filteredTransactions.length}
                    isFiltered={hasActiveFilters(filters)}
                />

                {/* Table */}
                <TransactionTable
                    transactions={tableData}
                    allocationColumns={allocationColumnModel.columns}
                    gridTemplateColumns={allocationColumnModel.gridTemplateColumns}
                    presenceByTransactionId={presenceByTransactionId}
                    selectedIds={selectedTransactionIds}
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
                    onTransactionAllocationUpdate={handleTransactionAllocationUpdate}
                    renderDescriptionRobot={renderDescriptionRobot}
                />
            </ImportDropTarget>

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
                onClose={closeAliasModal}
                mode={aliasModalState.mode}
                onJustThis={handleAliasJustThis}
                onAll={handleAliasAll}
                onRestoreFocus={restoreAliasModalFocus}
            />
        </div>
    );
}
