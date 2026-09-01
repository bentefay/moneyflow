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
import {
    Suspense,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    DescriptionAliasChangeModal,
    type DescriptionAliasModalDecision,
    type DescriptionAliasModalGridOwner
} from "@/components/features/description-aliases/DescriptionAliasChangeModal";
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
    TransactionGridWorkspace,
    TransactionInspector,
    type TransactionRowData,
    TransactionTable,
    TransactionTableToolbar,
    useTransactionGridWorkspace
} from "@/components/features/transactions";
import {
    historicalAllocationPersonIds,
    materializeAllocationRecord,
    type RetainedHistoricalAllocationPeople,
    retainHistoricalAllocationPersonIds
} from "@/components/features/transactions/allocation-columns";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
    type TransactionGridEditorCommitResult
} from "@/components/features/transactions/cells/editor-lifecycle";
import { restoreDescriptionAliasEditOrigin } from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import type { DescriptionAliasEditOrigin } from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import { transactionRowOrderFromCursor } from "@/components/features/transactions/cursor-row-order";
import { tagSetChanged } from "@/components/features/transactions/field-rule-proposal-state";
import type { RobotCurrentValue } from "@/components/features/transactions/field-rule-robot-state";
import {
    useTransactionGridController,
    useTransactionGridControllerSnapshot
} from "@/components/features/transactions/hooks";
import {
    advanceTransactionRowWindowStart,
    TRANSACTION_ROW_WINDOW_ROWS,
    type TransactionRowWindow,
    type TransactionVisibleRange,
    withPinnedTransactionRows
} from "@/components/features/transactions/row-window";
import {
    activeTransactionGridAddress,
    asTransactionId,
    isAllocationColumnId,
    isTransactionRowSelected,
    personIdOfAllocationColumn,
    transactionGridPresence,
    type MatchingTransactionRows,
    NO_TRANSACTION_ROWS_SELECTED,
    selectedTransactionRowCount,
    selectOnlyTransactionRow,
    transactionColumnIds,
    type TransactionId,
    type TransactionRowSelection
} from "@/components/features/transactions/table-model";
import {
    retireScroll,
    revealExistingTransaction,
    type TransactionRevealIntent
} from "@/components/features/transactions/transaction-reveal-intent";
import { useVaultPresenceContext as useVaultPresence } from "@/components/providers/vault-presence-provider";
import { useToast } from "@/components/ui/toast";
import { usePubkeyHash } from "@/hooks/use-identity";
/** Threshold for showing warning when selecting all */
const LARGE_SELECTION_THRESHOLD = 500;

import { Temporal } from "temporal-polyfill";

import { allocationPresenceField } from "@/lib/crdt/allocations";
import {
    useActiveAccounts,
    useActivePeople,
    useActiveTags,
    useDescriptionAliases,
    useDescriptionAliasActions,
    usePeople,
    useStatuses,
    useTransactionActions,
    useTransactionIndex,
    usePersistTransactionInspectorOpen,
    useUserTransactionInspectorOpen,
    useVaultAction
} from "@/lib/crdt/context";
import type { DescriptionAliasTarget } from "@/lib/crdt/description-aliases";
import {
    findTransactionsInStore,
    updateTransaction as updateTransactionInStore
} from "@/lib/crdt/mutations";
import { resolveMemberDisplayName, resolvePersonDisplayName } from "@/lib/crdt/person";
import type { Account, Person, Status, Tag, TagInput, Transaction } from "@/lib/crdt/schema";
import {
    createTransactionCursor,
    type TransactionCursor,
    type TransactionFilter
} from "@/lib/crdt/transaction-cursor";
import { getNextTagColor } from "@/lib/domain";
import { projectRuleMatchSubject } from "@/lib/domain/automation/rules";
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

function materializeCreatedTag(tag: {
    readonly id: string;
    readonly name: string;
    readonly color?: string;
}): TagInput {
    return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        parentTagId: "",
        isTransfer: false,
        deletedAt: undefined
    };
}

type DescriptionAliasModalRequest =
    | {
          readonly kind: "change";
          readonly transactionId: TransactionId;
          readonly expectedAliasId: string;
          readonly target: DescriptionAliasTargetIntent;
          readonly origin: DescriptionAliasEditOrigin;
      }
    | {
          readonly kind: "remove";
          readonly transactionId: TransactionId;
          readonly expectedAliasId: string;
          readonly origin: DescriptionAliasEditOrigin;
      };

type DescriptionAliasModalState =
    | { readonly phase: "closed" }
    | {
          readonly phase: "open" | "closing" | "stale";
          readonly request: DescriptionAliasModalRequest;
      };

export function authorizedAliasModalRequest<Request>(
    accepted: boolean,
    request: Request
): Request | null {
    return accepted ? request : null;
}

function descriptionAliasCommitResult(mutation: {
    readonly ok: boolean;
}): TransactionGridEditorCommitResult {
    return mutation.ok
        ? TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        : TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
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
            <TransactionGridWorkspace>
                <TransactionsPageContent />
            </TransactionGridWorkspace>
        </Suspense>
    );
}

/**
 * Transactions page component.
 */
function TransactionsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gridController = useTransactionGridWorkspace();
    const gridSnapshot = useTransactionGridControllerSnapshot(gridController);
    const pubkeyHash = usePubkeyHash();
    const preferredInspectorOpen = useUserTransactionInspectorOpen(pubkeyHash);
    const persistInspectorOpen = usePersistTransactionInspectorOpen();
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

    // Locally-created tags and the transaction assignment share one validated CRDT action.
    const commitTransactionTags = useVaultAction(
        (
            state,
            input: {
                readonly location: {
                    readonly accountId: string;
                    readonly date: Temporal.PlainDate;
                    readonly transactionId: string;
                };
                readonly tagIds: readonly string[];
                readonly createdTags: readonly {
                    readonly id: string;
                    readonly name: string;
                    readonly color?: string;
                }[];
            }
        ): TransactionGridEditorCommitResult => {
            const transactions = findTransactionsInStore(state.transactions, input.location);
            if (transactions.length === 0) return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
            if (
                transactions.every(
                    (transaction) => tagSetChanged(input.tagIds, transaction.tagIds ?? []) === false
                )
            ) {
                return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
            }

            const tagsDraft: Record<string, TagInput> = state.tags;
            for (const tag of input.createdTags) {
                tagsDraft[tag.id] = materializeCreatedTag(tag);
            }
            updateTransactionInStore(state.transactions, {
                location: input.location,
                updates: { tagIds: [...input.tagIds] }
            });
            return TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS;
        }
    );

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
    useLayoutEffect(() => {
        gridController.setHeldWindowState(rowWindowStart, setRowWindowStart);
    }, [gridController, rowWindowStart]);
    const [revealIntent, setRevealIntent] = useState<TransactionRevealIntent | null>(null);
    const transactionTableContainerRef = useRef<HTMLDivElement>(null);

    // The encrypted per-viewer preference initializes and remotely controls the controller's runtime
    // panel state. A layout effect prevents the default-open value from painting closed first.
    useLayoutEffect(() => {
        gridController.setInspectorPanelOpen(preferredInspectorOpen);
    }, [gridController, preferredInspectorOpen]);

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
    const {
        snapshot: presenceSnapshot,
        isConnected: isPresenceConnected,
        setPresenceState,
        clearPresenceFocus
    } = useVaultPresence();
    const presenceByTransactionId = presenceSnapshot.byTransactionId;

    // Row presence names members, never their pubkeyHash (UR-003).
    const resolveMemberName = useCallback(
        (pubkeyHash: string) => resolveMemberDisplayName(allPeople, pubkeyHash),
        [allPeople]
    );

    // Canonical grid presence comes from the same interaction state that owns selection and editing.
    // DOM focus alone cannot distinguish a selected wrapper from its live editor.
    useEffect(() => {
        if (!isPresenceConnected) return;
        const projectedPresence = transactionGridPresence(
            gridController.getInteractionState(),
            gridSnapshot.deferredPresence
        );
        if (projectedPresence.kind === "none") {
            clearPresenceFocus();
            return;
        }
        if (projectedPresence.kind === "viewing") {
            setPresenceState({
                editing: false,
                transactionId: projectedPresence.transactionId
            });
            return;
        }
        const field = isAllocationColumnId(projectedPresence.columnId)
            ? allocationPresenceField(personIdOfAllocationColumn(projectedPresence.columnId))
            : projectedPresence.columnId;
        setPresenceState({
            editing: true,
            field,
            transactionId: projectedPresence.transactionId
        });
    }, [
        clearPresenceFocus,
        gridController,
        gridSnapshot.activeTransactionId,
        gridSnapshot.deferredPresence,
        gridSnapshot.editor,
        gridSnapshot.interactionKind,
        isPresenceConnected,
        setPresenceState
    ]);

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
    // The cost of the coarseness is redundant row-selection reconciliation on value-only writes.
    // Cell selection is reconciled by the workspace only when stable row or column structure changes.
    // Paging changes neither cursor identity nor structure, so scrolling leaves both selections alone.
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

    // The workspace may hold both the active origin and a pending target. Their cursor positions are
    // resolved together so the bounded window can retain both without one pin invalidating the other.
    const pinnedRowIndexes = useMemo(
        () =>
            gridSnapshot.pins
                .map((pin) => cursor.indexOf(pin.transactionId))
                .filter((index) => index >= 0),
        [cursor, gridSnapshot.pins]
    );

    // The rows the grid holds: a bounded block of the matching order plus at most the active-origin
    // and pending-target rows. Distinct from `cursor.count`, which drives virtualization and selection.
    const windowTransactions = useMemo((): TransactionRowWindow<Transaction> => {
        const blockRows = cursor.slice(rowWindowStart, TRANSACTION_ROW_WINDOW_ROWS);
        const block = {
            indexes: blockRows.map((unused, offset) => rowWindowStart + offset),
            rows: blockRows
        };
        return withPinnedTransactionRows(
            block,
            pinnedRowIndexes,
            (rowIndex) => cursor.slice(rowIndex, 1)[0]
        );
    }, [cursor, pinnedRowIndexes, rowWindowStart]);

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

    const handleTransactionBlur = useCallback(() => {
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
    const isTransactionCanonicallyLive = useCallback(
        (transactionId: TransactionId): boolean => findTransaction(transactionId) != null,
        [findTransaction]
    );
    const persistInspectorPreference = useCallback(
        (open: boolean) => {
            if (pubkeyHash == null) return;
            persistInspectorOpen({ pubkeyHash, transactionInspectorOpen: open });
        },
        [persistInspectorOpen, pubkeyHash]
    );
    const handleInspectorOpenChange = useCallback(
        (open: boolean) => {
            if (!open) gridController.parkExternalFocus();
            gridController.setInspectorPanelOpen(open);
            if (open) queueMicrotask(() => gridController.revealInspector());
            persistInspectorPreference(open);
        },
        [gridController, persistInspectorPreference]
    );
    const handleInspectorOpenRequest = useCallback(() => {
        gridController.setInspectorPanelOpen(true);
        persistInspectorPreference(true);
    }, [gridController, persistInspectorPreference]);
    const handleInspectorInsideClose = useCallback(() => {
        persistInspectorPreference(false);
    }, [persistInspectorPreference]);

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

    const pendingReveal =
        gridSnapshot.pending?.state.phase === "reveal" ? gridSnapshot.pending.state : null;
    const pendingRevealRowIndex = useMemo(
        () => (pendingReveal == null ? -1 : cursor.indexOf(pendingReveal.target.transactionId)),
        [cursor, pendingReveal]
    );
    const requestedRevealRowIndex =
        pendingRevealRowIndex < 0 ? revealRowIndex : pendingRevealRowIndex;

    // Bringing the target's block into the window happens during render rather than in an effect,
    // because it is a function of stable cursor identity rather than of the DOM. The pending target
    // wins over a deep-link scroll until its exact command and generation have reached the viewport.
    const revealWindowStart = useMemo(
        () =>
            requestedRevealRowIndex < 0
                ? rowWindowStart
                : advanceTransactionRowWindowStart(
                      rowWindowStart,
                      {
                          startIndex: requestedRevealRowIndex,
                          endIndex: requestedRevealRowIndex
                      },
                      cursor.count
                  ),
        [cursor.count, requestedRevealRowIndex, rowWindowStart]
    );
    if (revealWindowStart !== rowWindowStart) {
        setRowWindowStart(revealWindowStart);
    }

    const scrollToRowIndex = requestedRevealRowIndex < 0 ? null : requestedRevealRowIndex;
    const handleScrollToRowIndexApplied = useCallback(() => {
        if (pendingReveal != null && pendingRevealRowIndex >= 0) {
            gridController.markRevealApplied({
                acceptedCommandId: pendingReveal.acceptedCommandId,
                projectionGeneration: pendingReveal.projectionGeneration
            });
            return;
        }
        setRevealIntent((currentIntent) =>
            currentIntent == null ? null : retireScroll(currentIntent)
        );
    }, [gridController, pendingReveal, pendingRevealRowIndex]);

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

    const automationContextFor = useCallback(
        (transaction: Transaction) => {
            const resolvedAlias =
                transaction.descriptionAliasId != null
                    ? (aliasLookup.resolve(transaction.descriptionAliasId) ?? null)
                    : null;
            const currentAllocations: Record<string, number> = {};
            for (const [personId, value] of Object.entries(
                materializeAllocationRecord(transaction.allocations)
            )) {
                if (typeof value === "number") currentAllocations[personId] = value;
            }
            const account = accounts[transaction.accountId];
            const subject = projectRuleMatchSubject({
                accountId: transaction.accountId,
                amount: transaction.amount,
                description: transaction.description,
                importId: transaction.importId,
                resolvedAliasName: resolvedAlias?.name ?? null
            });
            const currents: readonly RobotCurrentValue[] = [
                {
                    currentAliasId: resolvedAlias?.id ?? null,
                    field: "descriptionAlias"
                },
                {
                    currentTagIds: transaction.tagIds ?? [],
                    field: "tags"
                },
                {
                    currentAllocations,
                    field: "allocation"
                }
            ];
            return {
                accountLabel: typeof account === "object" ? account.name : "this account",
                currents,
                referenceDate: transaction.date,
                subject
            };
        },
        [accounts, aliasLookup]
    );
    const inspectorTransaction = useMemo(() => {
        const activeTransactionId = gridSnapshot.activeTransactionId;
        if (activeTransactionId == null) return null;
        const transaction = findTransaction(activeTransactionId);
        return transaction == null
            ? null
            : {
                  automation: automationContextFor(transaction),
                  description: transaction.description,
                  id: transaction.id,
                  notes: transaction.notes
              };
    }, [automationContextFor, findTransaction, gridSnapshot.activeTransactionId]);

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

    // The filter-scoped retained set is the column model's sole historical-membership input. A held
    // window may discover a deleted person once, but ordinary window movement and allocation value
    // edits then preserve the identical retained object and therefore the selectable column identity.
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
                transactions: [],
                retainedHistoricalPersonIds: nextRetainedHistoricalPeople.personIds
            }),
        [activeAllocationPeople, allPeople, nextRetainedHistoricalPeople.personIds]
    );
    const selectableColumnIds = useMemo(
        () => transactionColumnIds(allocationColumnModel.columns),
        [allocationColumnModel.columns]
    );
    useTransactionGridController({
        controller: gridController,
        cursor,
        isTransactionCanonicallyLive,
        selectableColumnIds
    });

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
        // The command is accepted before the CRDT insert. Its stable target survives the filter reset,
        // insertion and resulting structural generation change; row-checkbox selection remains an
        // independent bulk-operation state and is not touched.
        gridController.beginActivation({
            entry: "full",
            presence: "defer-add-until-editor-gesture",
            target: {
                columnId: "description",
                transactionId: asTransactionId(transactionId)
            }
        });
        setFilters(createEmptyFilters());
        insertTransaction({ transaction });
    }, [accountOptions, defaultStatusId, gridController, insertTransaction]);

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
            return { id, name, color };
        },
        [tags]
    );
    const handleTransactionTagsCommit = useCallback(
        (
            transactionId: TransactionId,
            tagIds: string[],
            createdTags: readonly {
                readonly id: string;
                readonly name: string;
                readonly color?: string;
            }[]
        ): TransactionGridEditorCommitResult => {
            const transaction = findTransaction(transactionId);
            if (transaction == null) return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
            if (!tagSetChanged(tagIds, transaction.tagIds ?? [])) {
                return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
            }
            return commitTransactionTags({
                location: {
                    accountId: transaction.accountId,
                    date: transaction.date,
                    transactionId: transaction.id
                },
                tagIds,
                createdTags
            });
        },
        [commitTransactionTags, findTransaction]
    );

    // Description alias state for modal
    const [aliasModalState, setAliasModalState] = useState<DescriptionAliasModalState>({
        phase: "closed"
    });
    const activeAliasModalRequest =
        aliasModalState.phase === "open" || aliasModalState.phase === "closing"
            ? aliasModalState.request
            : null;

    const openAliasModal = useCallback(
        (request: DescriptionAliasModalRequest): boolean => {
            const accepted = gridController.setEditorInteraction(
                { columnId: "description", transactionId: request.transactionId },
                "modal",
                true
            );
            const authorizedRequest = authorizedAliasModalRequest(accepted, request);
            if (authorizedRequest == null) return false;
            setAliasModalState({ phase: "open", request: authorizedRequest });
            return true;
        },
        [gridController]
    );

    const registerAliasModalPortal = useCallback(
        (element: HTMLDivElement | null) => {
            if (element == null || activeAliasModalRequest == null) return;
            return gridController.registerEditorPortal(
                {
                    columnId: "description",
                    transactionId: activeAliasModalRequest.transactionId
                },
                element
            );
        },
        [activeAliasModalRequest, gridController]
    );
    const aliasModalGridOwner = useMemo<DescriptionAliasModalGridOwner | undefined>(
        () =>
            activeAliasModalRequest == null
                ? undefined
                : {
                      portalRef: registerAliasModalPortal,
                      transactionId: activeAliasModalRequest.transactionId
                  },
        [activeAliasModalRequest, registerAliasModalPortal]
    );

    const closeAliasModal = useCallback(() => {
        if (aliasModalState.phase !== "open") return;
        const { request } = aliasModalState;
        const returnedToEditor = gridController.setEditorInteraction(
            { columnId: "description", transactionId: request.transactionId },
            "modal",
            false
        );
        setAliasModalState(returnedToEditor ? { phase: "closing", request } : { phase: "closed" });
    }, [aliasModalState, gridController]);

    const restoreAliasModalFocus = useCallback(() => {
        if (aliasModalState.phase !== "closing") return;
        restoreDescriptionAliasEditOrigin(aliasModalState.request.origin);
        setAliasModalState({ phase: "closed" });
    }, [aliasModalState]);

    const aliasModalRequestStillOwnsController = useMemo(() => {
        if (aliasModalState.phase !== "open") return true;
        const requestTransaction = findTransaction(aliasModalState.request.transactionId);
        if (
            gridSnapshot.interactionKind !== "interacting" ||
            gridSnapshot.activeTransactionId !== aliasModalState.request.transactionId ||
            requestTransaction?.descriptionAliasId !== aliasModalState.request.expectedAliasId
        ) {
            return false;
        }
        const interaction = gridController.getInteractionState();
        const activeAddress =
            interaction.kind === "interacting" && interaction.owner === "grid-editor"
                ? activeTransactionGridAddress(interaction.selection)
                : null;
        return (
            interaction.kind === "interacting" &&
            interaction.owner === "grid-editor" &&
            interaction.popup === "modal" &&
            activeAddress?.columnId === "description" &&
            activeAddress.transactionId === aliasModalState.request.transactionId
        );
    }, [
        aliasModalState,
        findTransaction,
        gridController,
        gridSnapshot.activeTransactionId,
        gridSnapshot.interactionKind
    ]);
    if (aliasModalState.phase === "open" && !aliasModalRequestStillOwnsController) {
        setAliasModalState({ phase: "stale", request: aliasModalState.request });
    }
    useLayoutEffect(() => {
        if (aliasModalState.phase !== "stale") return;
        gridController.setEditorInteraction(
            { columnId: "description", transactionId: aliasModalState.request.transactionId },
            "modal",
            false
        );
    }, [aliasModalState, gridController]);

    // Handle description commit text (user typed and pressed Enter/blurred)
    const handleDescriptionCommitText = useCallback(
        (
            txId: TransactionId,
            text: string,
            origin: DescriptionAliasEditOrigin
        ): TransactionGridEditorCommitResult => {
            const tx = findTransaction(txId);
            if (!tx) return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;

            const location = { accountId: tx.accountId, date: tx.date, transactionId: tx.id };
            const intent = planDescriptionAliasCommit({
                lookup: aliasLookup,
                currentAliasId: tx.descriptionAliasId,
                text
            });
            switch (intent.kind) {
                case "none":
                    return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
                case "assign":
                    return descriptionAliasCommitResult(
                        intent.target.kind === "existing"
                            ? assignDescriptionAlias({
                                  location,
                                  aliasId: intent.target.aliasId
                              })
                            : assignDescriptionAliasByExactName({
                                  location,
                                  newAliasId: generateId(),
                                  name: intent.target.name
                              })
                    );
                case "rename-one":
                    return descriptionAliasCommitResult(
                        renameDescriptionAlias({ aliasId: intent.aliasId, name: intent.name })
                    );
                case "change-one":
                    return tx.descriptionAliasId == null
                        ? TRANSACTION_GRID_EDITOR_COMMIT_FAILURE
                        : descriptionAliasCommitResult(
                              changeOneDescriptionAlias({
                                  location,
                                  expectedAliasId: tx.descriptionAliasId,
                                  target: materializeAliasTarget(intent.target)
                              })
                          );
                case "remove-one":
                    return tx.descriptionAliasId == null
                        ? TRANSACTION_GRID_EDITOR_COMMIT_FAILURE
                        : descriptionAliasCommitResult(
                              removeOneDescriptionAlias({
                                  location,
                                  expectedAliasId: tx.descriptionAliasId
                              })
                          );
                case "confirm-change":
                    if (tx.descriptionAliasId == null) {
                        return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
                    }
                    openAliasModal({
                        kind: "change",
                        transactionId: txId,
                        expectedAliasId: tx.descriptionAliasId,
                        target: intent.target,
                        origin
                    });
                    return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
                case "confirm-remove":
                    if (tx.descriptionAliasId == null) {
                        return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
                    }
                    openAliasModal({
                        kind: "remove",
                        transactionId: txId,
                        expectedAliasId: tx.descriptionAliasId,
                        origin
                    });
                    return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
            }
        },
        [
            aliasLookup,
            assignDescriptionAlias,
            findTransaction,
            assignDescriptionAliasByExactName,
            changeOneDescriptionAlias,
            removeOneDescriptionAlias,
            renameDescriptionAlias,
            openAliasModal
        ]
    );

    // Handle selecting an existing alias from dropdown
    const handleDescriptionSelectAlias = useCallback(
        (
            txId: TransactionId,
            aliasId: string,
            origin: DescriptionAliasEditOrigin
        ): TransactionGridEditorCommitResult => {
            const alias = availableAliasOptions.find((option) => option.id === aliasId);
            return alias == null
                ? TRANSACTION_GRID_EDITOR_COMMIT_FAILURE
                : handleDescriptionCommitText(txId, alias.name, origin);
        },
        [availableAliasOptions, handleDescriptionCommitText]
    );

    const handleAliasDecision = useCallback(
        (decision: DescriptionAliasModalDecision) => {
            if (aliasModalState.phase !== "open") return;
            const { request } = aliasModalState;
            const tx = findTransaction(request.transactionId);
            const currentAliasId = tx?.descriptionAliasId;
            if (
                tx == null ||
                currentAliasId == null ||
                currentAliasId !== request.expectedAliasId
            ) {
                closeAliasModal();
                return;
            }
            const location = { accountId: tx.accountId, date: tx.date, transactionId: tx.id };
            const mutation = (() => {
                if (request.kind === "remove") {
                    return decision === "one"
                        ? removeOneDescriptionAlias({
                              location,
                              expectedAliasId: currentAliasId
                          })
                        : removeAllDescriptionAliases(currentAliasId);
                }
                if (decision === "one") {
                    return changeOneDescriptionAlias({
                        location,
                        expectedAliasId: currentAliasId,
                        target: materializeAliasTarget(request.target)
                    });
                }
                const realCurrentId = aliasLookup.resolve(currentAliasId)?.id ?? currentAliasId;
                return changeAllDescriptionAliases({
                    sourceAliasId: realCurrentId,
                    target: materializeAliasTarget(request.target)
                });
            })();
            gridController.publishAutomationEditorCommit(
                { columnId: "description", transactionId: request.transactionId },
                descriptionAliasCommitResult(mutation)
            );
            closeAliasModal();
        },
        [
            aliasLookup,
            aliasModalState,
            changeAllDescriptionAliases,
            changeOneDescriptionAlias,
            closeAliasModal,
            findTransaction,
            gridController,
            removeAllDescriptionAliases,
            removeOneDescriptionAlias
        ]
    );

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
                if (tagSetChanged(tagIds, tx.tagIds ?? [])) transactionUpdates.tagIds = tagIds;
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
        [findTransaction, updateTransaction, moveTransaction]
    );
    const handleInspectorNotesChange = useCallback(
        (transactionId: TransactionId, notes: string) => {
            handleTransactionUpdate(transactionId, { notes });
        },
        [handleTransactionUpdate]
    );

    const handleTransactionAllocationUpdate = useCallback(
        (id: string, personId: string, value: number): TransactionGridEditorCommitResult => {
            const transaction = findTransaction(id);
            if (transaction == null) return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;

            const result = setTransactionAllocation({
                location: {
                    accountId: transaction.accountId,
                    date: transaction.date,
                    transactionId: transaction.id
                },
                personId,
                value
            });
            if (!result.ok) return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
            return result.value.changed
                ? TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
                : TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
        },
        [findTransaction, setTransactionAllocation]
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
        <div
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-6"
            data-testid="transactions-page-scroll-region"
        >
            {/* Filters */}
            <TransactionFilters
                filters={filters}
                onChange={setFilters}
                availableTags={tagOptions}
                availablePeople={peopleOptions}
                availableAccounts={accountOptionsForFilter}
                availableStatuses={statusOptions}
            />

            <div
                className={`grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 ${
                    gridSnapshot.inspectorPanelOpen
                        ? "min-h-[15rem] grid-rows-[minmax(8rem,1fr)_minmax(6rem,min(18rem,40%))] overflow-x-hidden overflow-y-auto xl:grid-cols-[minmax(0,1fr)_clamp(18rem,24vw,24rem)] xl:grid-rows-1 xl:overflow-hidden"
                        : "min-h-[28rem] grid-rows-[minmax(0,1fr)] overflow-hidden xl:grid-cols-1 xl:grid-rows-1"
                }`}
                data-testid="transaction-grid-shell"
            >
                {/* Transaction Table */}
                <ImportDropTarget
                    ariaLabel="Transactions table file drop target"
                    className={`flex min-w-0 flex-col overflow-hidden rounded-lg border xl:min-h-0 ${
                        gridSnapshot.inspectorPanelOpen ? "min-h-0" : "min-h-[28rem]"
                    }`}
                    containerRef={transactionTableContainerRef}
                    onFileAccepted={handleAcceptedImportFile}
                    testId="transaction-import-drop-target"
                >
                    {/* Toolbar with Add button and counts */}
                    <TransactionTableToolbar
                        onAddClick={handleAddTransaction}
                        inspectorOpen={gridSnapshot.inspectorPanelOpen}
                        onInspectorOpenChange={handleInspectorOpenChange}
                        automationPending={gridSnapshot.automation.proposal?.renderable === true}
                        selectedCount={selectedCount}
                        totalCount={cursor.count}
                        isFiltered={hasActiveFilters(filters)}
                    />

                    {/* Table */}
                    <TransactionTable
                        controller={gridController}
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
                        onInspectorOpenRequest={handleInspectorOpenRequest}
                        onTransactionBlur={handleTransactionBlur}
                        availableAccounts={accountOptions}
                        availableStatuses={statusOptionsForInlineEdit}
                        availableTags={tagOptionsForInlineEdit}
                        onCreateTag={handleCreateTag}
                        onTransactionTagsCommit={handleTransactionTagsCommit}
                        availableAliases={availableAliasOptions}
                        onDescriptionCommitText={handleDescriptionCommitText}
                        onDescriptionSelectAlias={handleDescriptionSelectAlias}
                        onTransactionDelete={handleSingleDelete}
                        onResolveDuplicate={handleResolveDuplicate}
                        onTransactionUpdate={handleTransactionUpdate}
                        onTransactionAllocationUpdate={handleTransactionAllocationUpdate}
                    />
                </ImportDropTarget>

                <TransactionInspector
                    controller={gridController}
                    open={gridSnapshot.inspectorPanelOpen}
                    transaction={inspectorTransaction}
                    onNotesChange={handleInspectorNotesChange}
                    onRequestClose={handleInspectorInsideClose}
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
                open={aliasModalState.phase === "open"}
                onClose={closeAliasModal}
                mode={activeAliasModalRequest?.kind ?? "change"}
                onDecision={handleAliasDecision}
                onRestoreFocus={restoreAliasModalFocus}
                gridOwner={aliasModalGridOwner}
            />
        </div>
    );
}
