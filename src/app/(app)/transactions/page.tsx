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
import {
    historicalAllocationPersonIds,
    materializeAllocationRecord,
    type RetainedHistoricalAllocationPeople,
    retainHistoricalAllocationPersonIds
} from "@/components/features/transactions/allocation-columns";
import type { DescriptionAliasEditOrigin } from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import { transactionRowOrderFromCursor } from "@/components/features/transactions/cursor-row-order";
import {
    allocationValueChanged,
    formatAmountForRuleLabel,
    tagSetChanged
} from "@/components/features/transactions/field-rule-proposal-state";
import {
    computeFieldRuleRobotState,
    type RobotCurrentValue
} from "@/components/features/transactions/field-rule-robot-state";
import {
    advanceTransactionRowWindowStart,
    TRANSACTION_ROW_WINDOW_ROWS,
    type TransactionRowWindow,
    type TransactionVisibleRange,
    withPinnedTransactionRow
} from "@/components/features/transactions/row-window";
import {
    asTransactionId,
    isTransactionRowSelected,
    type MatchingTransactionRows,
    NO_TRANSACTION_ROWS_SELECTED,
    selectedTransactionRowCount,
    selectOnlyTransactionRow,
    type TransactionId,
    type TransactionRowSelection
} from "@/components/features/transactions/table-model";
import {
    pendingFocusDescriptionId,
    retireFocusDescription,
    retireScroll,
    revealCreatedTransaction,
    revealExistingTransaction,
    type TransactionRevealIntent
} from "@/components/features/transactions/transaction-reveal-intent";
import { TransactionRuleProposal } from "@/components/features/transactions/TransactionRuleProposal";
import { TransactionRuleRobot } from "@/components/features/transactions/TransactionRuleRobot";
import { useVaultPresenceContext as useVaultPresence } from "@/components/providers/vault-presence-provider";
import { useToast } from "@/components/ui/toast";
/** Threshold for showing warning when selecting all */
const LARGE_SELECTION_THRESHOLD = 500;

import { Temporal } from "temporal-polyfill";

import {
    useActiveAccounts,
    useActiveFieldRules,
    useActivePeople,
    useActiveTags,
    useDescriptionAliases,
    useDescriptionAliasActions,
    usePeople,
    useStatuses,
    useTransactionActions,
    useTransactionIndex,
    useVaultAction
} from "@/lib/crdt/context";
import type { DescriptionAliasTarget } from "@/lib/crdt/description-aliases";
import { resolveMemberDisplayName, resolvePersonDisplayName } from "@/lib/crdt/person";
import type { Account, Person, Status, Tag, Transaction } from "@/lib/crdt/schema";
import {
    createTransactionCursor,
    type TransactionCursor,
    type TransactionFilter
} from "@/lib/crdt/transaction-cursor";
import { getNextTagColor } from "@/lib/domain";
import { type RuleField, type RuleMatchSubject } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

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
 * The rows that have entered the matching set since the previous cursor.
 *
 * Lazy on purpose. `reconcileRowSelection` iterates this only under an `all-matching` baseline —
 * the one case where a newly-matching row would otherwise inherit the baseline and become selected
 * without the user asking. Under the ordinary `no-rows` baseline the generator is never started, so
 * a filter change or a peer's edit costs only a re-check of the exceptions.
 *
 * When it *is* iterated the cost is the size of the new matching set, because "which rows are new"
 * has no cheaper answer against a cursor that holds no list. That is the price of holding a
 * select-all across a change to the matching set, paid at the moment of the change and never at
 * rest — where the previous implementation paid it on every vault change regardless.
 */
function newlyMatchingTransactionIds(
    previous: TransactionCursor,
    next: TransactionCursor
): Iterable<TransactionId> {
    return {
        *[Symbol.iterator]() {
            for (const transaction of next.values()) {
                if (!previous.includes(transaction.id)) yield asTransactionId(transaction.id);
            }
        }
    };
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

    // CRDT state. The grid's source is the document-scoped transaction index rather than a flattened
    // array: one walk of the hierarchy per document change, from which a cursor answers counts,
    // windows and positions without a matching list ever existing.
    const transactionIndex = useTransactionIndex();
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

    // Where the bounded window of rows the grid holds starts, in the matching order. The grid reports
    // what its viewport is showing and this follows in whole blocks — see `row-window.ts`. It is not
    // a page count: the virtualizer's own count is the whole matching set, so every position is
    // addressable whatever this happens to be.
    const [rowWindowStart, setRowWindowStart] = useState(0);
    // The row holding the caret, so it can be kept in the window however far the grid is scrolled
    // away from it. `TransactionTable` pins the same row into the virtual range; this is the half of
    // that pin only the cursor's owner can supply, and it must stay fresh rather than be remembered,
    // because the focused row is the one being edited.
    const [focusedTransactionId, setFocusedTransactionId] = useState<string | null>(null);
    const [revealIntent, setRevealIntent] = useState<TransactionRevealIntent | null>(null);
    const transactionTableContainerRef = useRef<HTMLDivElement>(null);

    // Selection over the whole matching result set, held as a baseline plus exceptions so that
    // "every matching transaction" is a constant-size value rather than a list of every id. Owned
    // here and handed to the grid's table instance as controlled state, because the bulk-edit
    // toolbar and the deep-link reveal both act on it from outside the grid.
    const [rowSelection, setRowSelection] = useState<TransactionRowSelection>(
        NO_TRANSACTION_ROWS_SELECTED
    );

    const lastManualCreationInstantRef = useRef<Temporal.Instant | null>(null);

    const handleAcceptedImportFile = useCallback(
        (file: File) => {
            stageImportFile(file);
            router.push("/imports/new");
        },
        [router, stageImportFile]
    );

    // Clear selection helper
    const clearSelection = useCallback(() => setRowSelection(NO_TRANSACTION_ROWS_SELECTED), []);

    // Row-level presence from the shared Loro ephemeral session (HS-003). Publishing focus is a
    // side effect of navigating the table, never of rendering it, so presence cannot loop.
    const { snapshot: presenceSnapshot, setPresenceState, clearPresenceFocus } = useVaultPresence();
    const presenceByTransactionId = presenceSnapshot.byTransactionId;

    // Row presence names members, never their pubkeyHash (UR-003).
    const resolveMemberName = useCallback(
        (pubkeyHash: string) => resolveMemberDisplayName(allPeople, pubkeyHash),
        [allPeople]
    );

    // Focus inside a cell counts as editing; focus on the row chrome is merely viewing. The manager
    // drops no-op updates, so landing on the same cell twice costs nothing.
    const handleTransactionFieldFocus = useCallback(
        (transactionId: string, field: string | undefined) => {
            setPresenceState(
                field == null
                    ? { transactionId, editing: false }
                    : { transactionId, field, editing: true }
            );
        },
        [setPresenceState]
    );

    // Leaving the page must retract focus; otherwise a peer sees a stale indicator until expiry.
    useEffect(() => clearPresenceFocus, [clearPresenceFocus]);

    // The filter dimensions, as the cursor's own value. Separate from the cursor below so a render
    // that changes neither the filters nor the document rebuilds neither.
    const cursorFilter = useMemo(
        (): TransactionFilter => ({
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
            // Search must find rows by the description the table actually renders, which for an
            // aliased row is the alias name resolved through the same one-hop symlink lookup.
            resolveDescriptionAliasName: (aliasId) => aliasLookup.resolve(aliasId)?.name,
            showDuplicatesOnly: filters.showDuplicatesOnly,
            excludeDeleted: true
        }),
        [aliasLookup, filters]
    );

    // Every transaction matching the active filters, in the order the table presents them — as a
    // random-access view rather than an array. This is what selection is a property of: select-all
    // and shift-click ranges act on it, not on the paginated window below, so a row that is neither
    // rendered nor paged in is still covered. `cursor.count` costs a census of the days that
    // contribute rows, never a pass over the rows themselves.
    const cursor = useMemo(
        () => createTransactionCursor(transactionIndex, cursorFilter),
        [cursorFilter, transactionIndex]
    );

    // Changing the filters — or the document — re-derives the set the header acts on and reports: a
    // row that has left the result set drops out, and a row that has only just entered it stays
    // unselected, because the user never selected it and a relaxed filter must not select rows on
    // their behalf. Applying it needs the table, which lives in the grid, so the change travels down
    // as a value and the reconciled selection comes back through `onRowSelectionChange`.
    //
    // Adjusting `reconciledCursor` during render is React's documented pattern and is what keeps
    // this off the per-toggle path: it costs anything only when the cursor itself is rebuilt.
    //
    // The trigger is the cursor's identity, which is deliberately COARSER than "the matching set
    // changed": the cursor is rebuilt whenever the filters or the document change, and a document
    // change usually leaves the matching set identical. There is no cheap exact signal — comparing
    // `cursor.count` would miss a row leaving as another arrives — so this errs towards reconciling.
    // The cost of the coarseness is that a vault change drops a cell selection the user was still
    // building, which is fail-closed: the grid never copies data the user did not select. What it
    // notably does NOT do is fire on paging: `displayCount` is not a dependency of the cursor, so
    // scrolling more rows into view leaves both selections alone.
    const [reconciledCursor, setReconciledCursor] = useState(cursor);
    const matchingRowsChange = useMemo(
        (): MatchingTransactionRows | null =>
            reconciledCursor === cursor
                ? null
                : {
                      includes: (transactionId) => cursor.includes(transactionId),
                      newlyMatchingRowIds: newlyMatchingTransactionIds(reconciledCursor, cursor)
                  },
        [cursor, reconciledCursor]
    );
    const handleMatchingSetReconciled = useCallback(() => setReconciledCursor(cursor), [cursor]);

    // "View transaction" from the People page carries one stable source ID. It is a one-shot
    // navigation intent, not a standing selection override: the row is paged in, selected and
    // revealed exactly once, and the param is then dropped from the URL. Every later render — and
    // therefore every bulk action — derives selection from `rowSelection` alone, so the landed row
    // can be deselected like any other row. Matching is on the stable ID, never a row index, so the
    // target survives filtering, pagination and reordering.
    //
    // The seed runs during render rather than in an effect so the row is already selected on its
    // first paint (no flicker), which is React's documented adjust-state-while-rendering pattern.
    // `landedSourceId` makes it idempotent, and the vault loads asynchronously, so an intent whose
    // target has not arrived yet stays pending instead of being dropped against an empty vault.
    // Membership is a map lookup; paging the row in is the reveal effect's job.
    const [landedSourceId, setLandedSourceId] = useState<string | null>(null);
    // Memoised for the React Compiler's sake, not for the cost: a call on an opaque object in the
    // raw render body sits next to the state adjustments below, and the compiler cannot prove such a
    // call pure — so it stops treating this component's `useState` setters as stable and skips
    // optimising the whole component. Containing the call in a memo keeps the render body pure.
    // The array method this replaced needed no such wrapper because the compiler knows `findIndex`.
    const requestedTransactionIsMatching = useMemo(
        () => requestedTransactionId != null && cursor.includes(requestedTransactionId),
        [cursor, requestedTransactionId]
    );
    const hasRequestedTransaction =
        requestedTransactionIsMatching && requestedTransactionId !== landedSourceId;
    if (requestedTransactionId == null) {
        // The param is gone, so the intent is spent and the same source can be revisited later.
        if (landedSourceId != null) setLandedSourceId(null);
    } else if (hasRequestedTransaction) {
        setLandedSourceId(requestedTransactionId);
        setRowSelection(selectOnlyTransactionRow(asTransactionId(requestedTransactionId)));
        setRevealIntent(revealExistingTransaction(requestedTransactionId));
    }

    // Where the focused row sits in the matching order, or `-1` when nothing is focused. A binary
    // search to that row's own date, and memoised for the React Compiler's sake as well as the
    // cost's: an opaque call in the raw render body, next to the state adjustments above, is what
    // makes the compiler skip this whole component.
    const focusedRowIndex = useMemo(
        () => (focusedTransactionId == null ? -1 : cursor.indexOf(focusedTransactionId)),
        [cursor, focusedTransactionId]
    );

    // The focused row's position, but only while it lies *outside* the block. Inside it — which is
    // where focus is in every ordinary state — the block already holds the row, and making the window
    // depend on which row has the caret would re-slice the cursor and rebuild the row model on every
    // arrow key. Plain arithmetic, so this stays out of the memo's dependencies as a scalar.
    const pinnedRowIndex =
        focusedRowIndex >= rowWindowStart &&
        focusedRowIndex < rowWindowStart + TRANSACTION_ROW_WINDOW_ROWS
            ? -1
            : focusedRowIndex;

    // The rows the grid holds: a bounded block of the matching order around what is visible, plus the
    // focused row when scrolling has carried it out of that block. Distinct from `cursor.count`, which
    // is what the virtualizer counts and what selection is a property of — conflating the two either
    // hands the row model every matching row or breaks select-all.
    const windowTransactions = useMemo((): TransactionRowWindow<Transaction> => {
        const blockRows = cursor.slice(rowWindowStart, TRANSACTION_ROW_WINDOW_ROWS);
        const block = {
            indexes: blockRows.map((unused, offset) => rowWindowStart + offset),
            rows: blockRows
        };
        return withPinnedTransactionRow(
            block,
            pinnedRowIndex,
            (rowIndex) => cursor.slice(rowIndex, 1)[0]
        );
    }, [cursor, pinnedRowIndex, rowWindowStart]);

    // Constant time, whatever the size of the result set: the count is a subtraction against the
    // baseline, never a scan of the matching rows.
    const selectedCount = selectedTransactionRowCount(rowSelection, cursor.count);

    // The grid reports what its viewport shows; the window follows in whole blocks, so all but a few
    // of these answer "no change" and re-render nothing.
    const handleVisibleRowRangeChange = useCallback(
        (range: TransactionVisibleRange) => {
            setRowWindowStart((current) =>
                advanceTransactionRowWindowStart(current, range, cursor.count)
            );
        },
        [cursor.count]
    );

    // Scrolling retires only the scroll step. A pending focus step outlives it, because the grid keeps
    // the target row mounted across the scroll and reports back once the caret has landed. Functional,
    // because the row's focus retirement can land in the same flush as this one: a value computed from
    // a captured `revealIntent` would be stale by the time React applied it and would resurrect the
    // focus step, re-asserting an intent that has already landed.
    const handleScrollToRowIndexApplied = useCallback(() => {
        setRevealIntent((currentIntent) =>
            currentIntent == null ? null : retireScroll(currentIntent)
        );
    }, []);

    // Focus is tracked here as well as in the grid, for a different purpose: the grid pins the row
    // into the virtual range, and this keeps it in the window so there is a row to pin.
    const handleTransactionFocus = useCallback(
        (transactionId: string) => setFocusedTransactionId(transactionId),
        []
    );
    const handleTransactionBlur = useCallback(() => {
        setFocusedTransactionId(null);
        clearPresenceFocus();
    }, [clearPresenceFocus]);

    // Positions within the matching order, for shift-click ranges and single-target keystrokes.
    // Index-backed rather than list-backed: `indexOf` is a binary search to the row's own date, and
    // `slice` yields lazily in blocks, so a range spans rows the grid does not hold without ever
    // copying the matching set. A full-span selection still ends with one exception per selected
    // row — that is the selection representation, not this — see `cursor-row-order.ts`.
    const rowOrder = useMemo(() => transactionRowOrderFromCursor(cursor), [cursor]);

    // Every selected transaction, rendered or not. Deliberately a callback and not a memo:
    // enumerating is the one selection operation whose cost is the size of the result set, and a
    // bulk action is the only moment that cost is unavoidable — acting on N rows costs N regardless,
    // while rendering, toggling and the header's own state must never pay it. Walking the cursor
    // keeps the rows in the table's own order.
    const collectSelectedTransactions = useCallback((): readonly Transaction[] => {
        const selected: Transaction[] = [];
        for (const transaction of cursor) {
            if (isTransactionRowSelected(rowSelection, asTransactionId(transaction.id))) {
                selected.push(transaction);
            }
        }
        return selected;
    }, [cursor, rowSelection]);

    /** One transaction by its stable id, or `undefined` when it is absent or soft-deleted. */
    const findTransaction = useCallback(
        (transactionId: string): Transaction | undefined => {
            const transaction = transactionIndex.canonicalById.get(transactionId);
            return transaction != null && transaction.deletedAt == null ? transaction : undefined;
        },
        [transactionIndex]
    );

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

    // Where a row waiting to be revealed sits in the matching order, or `-1` while it has no place
    // there — the document may not hold it yet, or the filters may exclude it. Asking the cursor is a
    // binary search to that row's own date, and it is asked only while an intent is pending.
    // Memoised for the same reason as `requestedTransactionIsMatching` above: this opaque call
    // precedes a state adjustment in the render body.
    const revealRowIndex = useMemo(
        () =>
            revealIntent != null && revealIntent.scrollPending
                ? cursor.indexOf(revealIntent.transactionId)
                : -1,
        [cursor, revealIntent]
    );

    // Bringing the target's block into the window happens during render rather than in an effect,
    // because it is a function of the intent and the cursor rather than of the DOM — React's
    // documented adjust-state-while-rendering pattern, as with `landedSourceId` above. It terminates:
    // once the window covers the target the same start comes back and the branch stops firing. The
    // arithmetic is contained in a memo for the compiler's sake, not the cost's, exactly as
    // `revealRowIndex` above is — an opaque call beside a render-phase state adjustment is what makes
    // the compiler skip this whole component.
    const revealWindowStart = useMemo(
        () =>
            revealRowIndex < 0
                ? rowWindowStart
                : advanceTransactionRowWindowStart(
                      rowWindowStart,
                      { startIndex: revealRowIndex, endIndex: revealRowIndex },
                      cursor.count
                  ),
        [cursor.count, revealRowIndex, rowWindowStart]
    );
    if (revealWindowStart !== rowWindowStart) {
        setRowWindowStart(revealWindowStart);
    }

    // The pending reveal *is* the scroll request; it needs no state of its own, and holding one would
    // mean an effect whose whole body was a `setState` mirroring a value already in hand.
    //
    // The scroll itself is the virtualizer's `scrollToIndex`, which knows every row's measured
    // height. This used to derive a `scrollTop` from `scrollHeight / loadedRows`, an averaged row
    // height that is wrong by construction whenever a notes row is expanded — and it first had to
    // page the target in, which a full count makes unnecessary.
    const scrollToRowIndex = revealRowIndex < 0 ? null : revealRowIndex;

    const focusDescriptionTransactionId = pendingFocusDescriptionId(revealIntent);
    const handleFocusDescriptionApplied = useCallback(() => {
        setRevealIntent((currentIntent) =>
            currentIntent == null ? null : retireFocusDescription(currentIntent)
        );
    }, []);

    // Convert to row data format. The absolute positions travel with the rows: they are what the
    // grid and the virtualizer address rows by, and the window is contiguous only up to the pin.
    const rowWindow = useMemo(
        (): TransactionRowWindow<TransactionRowData> => ({
            indexes: windowTransactions.indexes,
            rows: windowTransactions.rows.map((tx) => {
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
            })
        }),
        [windowTransactions, accounts, statuses, tags, aliasLookup]
    );

    const activeFieldRules = useActiveFieldRules();

    // Per-row inputs for the inline rule robots. The match subject faithfully mirrors the engine's
    // own projection (raw imported description, account, amount, importId => isManual) so the robots'
    // drift detection agrees with what applying the rule would actually do. Description rules exclude
    // manual rows via the matcher; tags/allocation rules include them (frozen `:294-295`). The three
    // per-field current values let each robot compare "implied" against "current". The alias is
    // resolved through symlinks to a final real alias id, matching the id a rule implies.
    const accountName = useCallback(
        (accountId: string): string => {
            const account = accounts[accountId];
            return typeof account === "object" ? account.name : "this account";
        },
        [accounts]
    );

    const accountCurrency = useCallback(
        (accountId: string): string => {
            const account = accounts[accountId];
            return typeof account === "object" && account.currency != null
                ? account.currency
                : "USD";
        },
        [accounts]
    );

    const robotContextById = useMemo(() => {
        const byId = new Map<
            string,
            {
                readonly subject: RuleMatchSubject;
                readonly currentAliasId: string | null;
                readonly currentTagIds: readonly string[];
                readonly currentAllocations: Readonly<Record<string, number>>;
                readonly referenceDate: Temporal.PlainDate;
                /** This row's amount, formatted for the frozen "only if $x" restriction label. */
                readonly amountLabel: string;
                /** This row's account name, for the "only this account" restriction label. */
                readonly accountLabel: string;
            }
        >();
        for (const tx of windowTransactions.rows) {
            const resolvedAlias =
                tx.descriptionAliasId != null
                    ? (aliasLookup.resolve(tx.descriptionAliasId) ?? null)
                    : null;
            const resolvedAliasId = resolvedAlias?.id ?? null;
            // Mirror the engine's projection (`descriptionTextForMatching`): imported rows key on the
            // raw imported text; manual rows have no raw text and key on their resolved alias name so
            // tag/allocation robots surface. A manual row with no alias matches nothing.
            const descriptionText =
                tx.importId != null
                    ? tx.description != null && tx.description.length > 0
                        ? tx.description
                        : null
                    : resolvedAlias != null && resolvedAlias.name.length > 0
                      ? resolvedAlias.name
                      : null;
            const currentAllocations: Record<string, number> = {};
            for (const [personId, value] of Object.entries(
                materializeAllocationRecord(tx.allocations)
            )) {
                if (typeof value === "number") currentAllocations[personId] = value;
            }
            byId.set(tx.id, {
                subject: {
                    descriptionText,
                    accountId: tx.accountId,
                    amount: tx.amount,
                    isManual: tx.importId == null
                },
                currentAliasId: resolvedAliasId,
                currentTagIds: tx.tagIds ?? [],
                currentAllocations,
                referenceDate: tx.date,
                amountLabel: formatAmountForRuleLabel(tx.amount, accountCurrency(tx.accountId)),
                accountLabel: accountName(tx.accountId)
            });
        }
        return byId;
    }, [accountCurrency, accountName, aliasLookup, windowTransactions]);

    const [autoOpenRobotTxId, setAutoOpenRobotTxId] = useState<string | null>(null);

    /**
     * The one field the user has just changed, if any (UR-009).
     *
     * The frozen text asks for the creation controls to appear when a field IS CHANGED, not for
     * every row that happens to lack a rule — so this is a single pending edit, cleared once the
     * user applies or dismisses it. Holding exactly one means a table of any size shows at most one
     * proposal, and no row carries the surface at rest.
     */
    const [pendingRuleEdit, setPendingRuleEdit] = useState<{
        readonly transactionId: string;
        readonly field: RuleField;
    } | null>(null);

    const notePendingRuleEdit = useCallback((transactionId: string, field: RuleField) => {
        setPendingRuleEdit({ transactionId, field });
    }, []);

    const clearPendingRuleEdit = useCallback(() => setPendingRuleEdit(null), []);

    const renderDescriptionRobot = useCallback(
        (transactionId: string, context: { readonly isEditing: boolean }): React.ReactNode => {
            const entry = robotContextById.get(transactionId);
            if (entry == null) return null;

            // Every field's current value; the description robot hides while its cell is edited,
            // tags/allocation robots stay put. Each robot is mounted only when a rule of that field
            // actually matches, so unmatched rows carry no extra hooks (bounded at scale).
            const currents: ReadonlyArray<{
                readonly current: RobotCurrentValue;
                readonly isEditing: boolean;
                readonly autoOpenable: boolean;
            }> = [
                {
                    current: { field: "descriptionAlias", currentAliasId: entry.currentAliasId },
                    isEditing: context.isEditing,
                    autoOpenable: true
                },
                {
                    current: { field: "tags", currentTagIds: entry.currentTagIds },
                    isEditing: false,
                    autoOpenable: false
                },
                {
                    current: { field: "allocation", currentAllocations: entry.currentAllocations },
                    isEditing: false,
                    autoOpenable: false
                }
            ];

            return (
                <>
                    {currents.map(({ current, isEditing, autoOpenable }) => {
                        if (
                            computeFieldRuleRobotState(activeFieldRules, entry.subject, current)
                                .kind === "none"
                        ) {
                            return null;
                        }
                        return (
                            <TransactionRuleRobot
                                autoOpen={autoOpenable && autoOpenRobotTxId === transactionId}
                                current={current}
                                isEditing={isEditing}
                                key={current.field}
                                onAutoOpenHandled={() => setAutoOpenRobotTxId(null)}
                                referenceDate={entry.referenceDate}
                                subject={entry.subject}
                                transactionId={transactionId}
                            />
                        );
                    })}
                </>
            );
        },
        [activeFieldRules, autoOpenRobotTxId, robotContextById]
    );

    /**
     * Wrap a rule-backed cell in the creation/update controls when THAT cell is the one the user
     * just changed (UR-009, frozen `:249-256` and `:287-289`).
     *
     * Every other cell renders untouched, so the controls appear next to the edit and nowhere else.
     * The `subject` and per-field current values are the same projections the robot uses, so both
     * surfaces agree on what "already matches a rule" means.
     */
    const renderRuleProposal = useCallback(
        (
            transactionId: string,
            field: RuleField,
            context: { readonly isEditing: boolean },
            cell: React.ReactNode,
            anchorClassName: string | undefined,
            style: React.CSSProperties | undefined
        ): React.ReactNode => {
            const entry = robotContextById.get(transactionId);
            if (entry == null) {
                return (
                    <div className={anchorClassName} style={style}>
                        {cell}
                    </div>
                );
            }

            const current: RobotCurrentValue =
                field === "descriptionAlias"
                    ? { field: "descriptionAlias", currentAliasId: entry.currentAliasId }
                    : field === "tags"
                      ? { field: "tags", currentTagIds: entry.currentTagIds }
                      : { field: "allocation", currentAllocations: entry.currentAllocations };

            // ONE element type at this position, whether or not this cell is the pending edit.
            //
            // React reconciles by element type per position, so returning a bare `div` in one state
            // and a `TransactionRuleProposal` in the other would unmount and remount the entire
            // subtree — including the cell being edited — every time `pendingRuleEdit` flips. That
            // is exactly what closed the tag dropdown mid-edit in revision 01: the flip happens on
            // the dropdown's own `onSave`, while it is still open. Passing `isPending` instead of
            // branching keeps the element type stable, so the cell is never remounted and the
            // dropdown, caret and selection all survive.
            return (
                <TransactionRuleProposal
                    accountLabel={entry.accountLabel}
                    amountLabel={entry.amountLabel}
                    anchorClassName={anchorClassName}
                    anchorStyle={style}
                    current={current}
                    isEditing={context.isEditing}
                    isPending={
                        pendingRuleEdit != null &&
                        pendingRuleEdit.transactionId === transactionId &&
                        pendingRuleEdit.field === field
                    }
                    onDismiss={clearPendingRuleEdit}
                    referenceDate={entry.referenceDate}
                    rowId={transactionId}
                    subject={entry.subject}
                >
                    {cell}
                </TransactionRuleProposal>
            );
        },
        [clearPendingRuleEdit, pendingRuleEdit, robotContextById]
    );

    const activeAllocationPeople = useMemo(
        () =>
            Object.values(people)
                .filter((person): person is Person & { $cid: string } => typeof person === "object")
                .map((person) => ({ id: person.id, name: resolvePersonDisplayName(person) })),
        [people]
    );
    const activeAllocationPersonIds = useMemo(
        () => new Set(activeAllocationPeople.map((person) => person.id)),
        [activeAllocationPeople]
    );

    // A deleted person who still holds an allocation earns a column, and which rows reveal that is
    // now a function of where the grid is scrolled. Accumulating the ids seen under the current
    // filters keeps such a column from vanishing when its row scrolls out of the window — the growing
    // page this replaces was monotone in the same way, and reset the same way when the filters
    // changed. Adjusted during render rather than in an effect, as with the reveal above; the
    // discovery is contained in a memo so the render body holds no opaque call.
    const discoveredHistoricalPersonIds = useMemo(
        () => historicalAllocationPersonIds(windowTransactions.rows, activeAllocationPersonIds),
        [activeAllocationPersonIds, windowTransactions]
    );
    const [retainedHistoricalPeople, setRetainedHistoricalPeople] = useState<
        RetainedHistoricalAllocationPeople<TransactionFilter>
    >(() => ({ filterKey: cursorFilter, personIds: discoveredHistoricalPersonIds }));
    const nextRetainedHistoricalPeople = retainHistoricalAllocationPersonIds(
        retainedHistoricalPeople,
        cursorFilter,
        discoveredHistoricalPersonIds
    );
    if (nextRetainedHistoricalPeople !== retainedHistoricalPeople) {
        setRetainedHistoricalPeople(nextRetainedHistoricalPeople);
    }

    const allocationColumnModel = useMemo(
        () =>
            buildAllocationColumnModel({
                activePeople: activeAllocationPeople,
                allPeople: Object.values(allPeople)
                    .filter(
                        (person): person is Person & { $cid: string } => typeof person === "object"
                    )
                    .map((person) => ({
                        deletedAt: person.deletedAt,
                        id: person.id,
                        name: resolvePersonDisplayName(person)
                    })),
                transactions: windowTransactions.rows,
                retainedHistoricalPersonIds: nextRetainedHistoricalPeople.personIds
            }),
        [activeAllocationPeople, allPeople, nextRetainedHistoricalPeople, windowTransactions]
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
        // Where the row lands in the canonical order is the cursor's answer to give, once the
        // document holds it — so the reveal intent below carries the paging as well as the scroll,
        // rather than this gesture predicting a position against a list of every transaction.
        //
        // Selection means "target for bulk operations", and an empty new row is an edit target, not
        // a bulk-operation target. So creating a row leaves any in-progress multi-row selection
        // exactly as the user left it, and identifies the new row by putting the caret in it.
        setRevealIntent(revealCreatedTransaction(transactionId));
        insertTransaction({
            transaction
        });
    }, [accountOptions, defaultStatusId, insertTransaction]);

    // Handle bulk delete - uses deleteTransaction mutation
    const handleBulkDelete = useCallback(() => {
        for (const tx of collectSelectedTransactions()) {
            deleteTransaction({
                location: {
                    accountId: tx.accountId,
                    date: tx.date,
                    transactionId: tx.id
                }
            });
        }
        clearSelection();
    }, [collectSelectedTransactions, deleteTransaction, clearSelection]);

    // Handle bulk set tags
    const handleBulkSetTags = useCallback(
        (tagIds: string[]) => {
            for (const tx of collectSelectedTransactions()) {
                updateTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id
                    },
                    updates: { tagIds }
                });
            }
        },
        [collectSelectedTransactions, updateTransaction]
    );

    // Handle bulk set status
    const handleBulkSetStatus = useCallback(
        (statusId: string) => {
            for (const tx of collectSelectedTransactions()) {
                updateTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id
                    },
                    updates: { statusId }
                });
            }
        },
        [collectSelectedTransactions, updateTransaction]
    );

    // Handle bulk set account - uses moveTransaction for account changes
    const handleBulkSetAccount = useCallback(
        (accountId: string) => {
            for (const tx of collectSelectedTransactions()) {
                if (tx.accountId === accountId) continue;
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
        },
        [collectSelectedTransactions, moveTransaction]
    );

    // Handle bulk set notes
    const handleBulkSetNotes = useCallback(
        (notes: string) => {
            for (const tx of collectSelectedTransactions()) {
                updateTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id
                    },
                    updates: { notes }
                });
            }
        },
        [collectSelectedTransactions, updateTransaction]
    );

    // Handle bulk set amount
    const handleBulkSetAmount = useCallback(
        (amount: number) => {
            for (const tx of collectSelectedTransactions()) {
                updateTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id
                    },
                    updates: { amount: asMinorUnits(amount) }
                });
            }
        },
        [collectSelectedTransactions, updateTransaction]
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
            const tx = findTransaction(txId);
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
                    // And, per frozen `:249-252`, offer to CREATE a rule when the row's description
                    // text matches none yet. The proposal decides which of the two applies.
                    notePendingRuleEdit(txId, "descriptionAlias");
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
                    notePendingRuleEdit(txId, "descriptionAlias");
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
            aliasLookup,
            assignDescriptionAlias,
            findTransaction,
            assignDescriptionAliasByExactName,
            changeOneDescriptionAlias,
            notePendingRuleEdit,
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
        const tx = findTransaction(transactionId);
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
        changeOneDescriptionAlias,
        closeAliasModal,
        findTransaction,
        removeOneDescriptionAlias
    ]);

    // Modal: "all" handler
    const handleAliasAll = useCallback(() => {
        const { transactionId, mode, target } = aliasModalState;
        const tx = findTransaction(transactionId);
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
        aliasLookup,
        changeAllDescriptionAliases,
        closeAliasModal,
        findTransaction,
        removeAllDescriptionAliases
    ]);

    // Handle single transaction delete
    const handleSingleDelete = useCallback(
        (id: string) => {
            const tx = findTransaction(id);
            if (tx) {
                deleteTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id
                    }
                });
            }
            // Nothing to do to the selection here: the deleted row leaves the matching set, so the
            // reconciliation above drops it under either baseline. Clearing it a second time by id
            // would be a weaker duplicate of that one mechanism.
        },
        [deleteTransaction, findTransaction]
    );

    // Handle resolve duplicate (unnest from parent)
    const handleResolveDuplicate = useCallback(
        (id: string) => {
            // Find the parent transaction that contains this duplicate. Canonical copies only, so a
            // losing copy of a concurrently moved row cannot be unnested from.
            for (const tx of transactionIndex.canonicalById.values()) {
                if (tx.deletedAt != null) continue;
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
        [transactionIndex, unnestDuplicate]
    );

    // Handle inline edit update (from TransactionTable)
    const handleTransactionUpdate = useCallback(
        (id: string, updates: Partial<TransactionRowData>) => {
            // Find the transaction to get its location
            const tx = findTransaction(id);
            if (!tx) return;

            // Check if date or account changed - requires move
            // Convert string date from TransactionRowData to PlainDate for comparison
            const newPlainDate = updates.date ? Temporal.PlainDate.from(updates.date) : undefined;
            const newAccountId = updates.accountId;
            // Carry the moved *values*, not booleans about them, so the destination location below
            // narrows without assertions.
            const movedDate =
                newPlainDate && Temporal.PlainDate.compare(newPlainDate, tx.date) !== 0
                    ? newPlainDate
                    : undefined;
            const movedAccountId =
                newAccountId && newAccountId !== tx.accountId ? newAccountId : undefined;

            if (movedDate || movedAccountId) {
                // Use moveTransaction for date/account changes
                moveTransaction({
                    location: {
                        accountId: tx.accountId,
                        date: tx.date,
                        transactionId: tx.id
                    },
                    newDate: newPlainDate ?? tx.date,
                    newAccountId: movedAccountId
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
                // A tag change is exactly the gesture the frozen text offers a rule for. Note it
                // only when the set really changed, so re-committing an identical set is not
                // treated as an edit.
                if (tagSetChanged(tagIds, tx.tagIds ?? [])) {
                    notePendingRuleEdit(tx.id, "tags");
                }
            }

            // Only call updateTransaction if we have updates
            if (Object.keys(transactionUpdates).length > 0) {
                // Use the new location if it changed
                const location = {
                    accountId: movedAccountId ?? tx.accountId,
                    date: movedDate ?? tx.date,
                    transactionId: tx.id
                };
                updateTransaction({
                    location,
                    updates: transactionUpdates
                });
            }
        },
        [findTransaction, updateTransaction, moveTransaction, notePendingRuleEdit]
    );

    const handleTransactionAllocationUpdate = useCallback(
        (id: string, personId: string, value: number) => {
            const transaction = findTransaction(id);
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
            // Frozen `:292-293`: an allocation rule covers the WHOLE percentage set, so changing any
            // one person's column proposes a rule for the row's complete set.
            const previous = materializeAllocationRecord(transaction.allocations)[personId];
            if (allocationValueChanged(previous, value)) {
                notePendingRuleEdit(transaction.id, "allocation");
            }
        },
        [findTransaction, notePendingRuleEdit, setTransactionAllocation]
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
                    totalCount={cursor.count}
                    isFiltered={hasActiveFilters(filters)}
                />

                {/* Table */}
                <TransactionTable
                    rowWindow={rowWindow}
                    matchingRowCount={cursor.count}
                    onVisibleRowRangeChange={handleVisibleRowRangeChange}
                    scrollToRowIndex={scrollToRowIndex}
                    onScrollToRowIndexApplied={handleScrollToRowIndexApplied}
                    rowOrder={rowOrder}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    matchingRowsChange={matchingRowsChange}
                    onMatchingSetReconciled={handleMatchingSetReconciled}
                    allocationColumns={allocationColumnModel.columns}
                    presenceByTransactionId={presenceByTransactionId}
                    resolveMemberName={resolveMemberName}
                    onTransactionFieldFocus={handleTransactionFieldFocus}
                    onTransactionFocus={handleTransactionFocus}
                    onTransactionBlur={handleTransactionBlur}
                    availableAccounts={accountOptions}
                    availableStatuses={statusOptionsForInlineEdit}
                    availableTags={tagOptionsForInlineEdit}
                    onCreateTag={handleCreateTag}
                    availableAliases={availableAliasOptions}
                    onDescriptionCommitText={handleDescriptionCommitText}
                    onDescriptionSelectAlias={handleDescriptionSelectAlias}
                    focusDescriptionTransactionId={focusDescriptionTransactionId}
                    onFocusDescriptionApplied={handleFocusDescriptionApplied}
                    onTransactionDelete={handleSingleDelete}
                    onResolveDuplicate={handleResolveDuplicate}
                    onTransactionUpdate={handleTransactionUpdate}
                    onTransactionAllocationUpdate={handleTransactionAllocationUpdate}
                    renderDescriptionRobot={renderDescriptionRobot}
                    renderRuleProposal={renderRuleProposal}
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
