"use client";

/**
 * Transaction Row
 *
 * Individual row in the transaction list with presence highlighting.
 * Shows colored border when another user is focused on or editing the row.
 * Supports duplicate detection, resolution actions, deletion, and inline editing.
 */

import { Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import { AccountCombobox, AccountOption } from "@/components/features/accounts";
import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";
import { useDateLocale } from "@/components/providers/date-locale-provider";
import { Button } from "@/components/ui/button";
import { useTransientFlag } from "@/components/ui/use-transient-flag";
import { type MemberDisplayName, memberDisplayLabel } from "@/lib/crdt/person";
import { deriveEffectiveAllocations } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { hashToColor } from "@/lib/utils/color";
import { formatTransactionDate } from "@/lib/utils/date-format";

import { type AllocationColumn, materializeAllocationRecord } from "./allocation-columns";
import {
    INNER_CELL_FOCUS_CHROME,
    PARKED_ACTION_FOCUS_CHROME,
    RESTING_CELL_CHROME,
    TRANSACTION_GRID_EDITOR_INLINE_CHROME,
    TRANSACTION_GRIDCELL_CHROME
} from "./cells/cell-chrome";
import { CheckboxCell } from "./cells/CheckboxCell";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    type TransactionGridEditorCommitResult
} from "./cells/editor-lifecycle";
import {
    InlineEditableAmount,
    InlineEditableAmountDisplay,
    originalAmountDescription
} from "./cells/InlineEditableAmount";
import { InlineEditableDate } from "./cells/InlineEditableDate";
import {
    DescriptionAliasDisplay,
    type DescriptionAliasEditOrigin,
    importedDescriptionProvenance,
    InlineEditableDescriptionAlias,
    type DescriptionAliasOption
} from "./cells/InlineEditableDescriptionAlias";
import { InlineEditableStatus, type StatusOption } from "./cells/InlineEditableStatus";
import { InlineEditableTags, type TagOption } from "./cells/InlineEditableTags";
import { PersonAllocationCell, PersonAllocationDisplay } from "./cells/PersonAllocationCell";
import { TransactionGridCell } from "./cells/TransactionGridCell";
import { DuplicateBadge } from "./DuplicateBadge";
import type {
    TransactionGridControllerSnapshot,
    TransactionGridEditorProjection,
    TransactionGridWorkspaceController
} from "./hooks/useTransactionGridController";
import {
    asTransactionId,
    type TransactionColumnId,
    type TransactionId,
    type TransactionEditorPopupKind,
    type TransactionTableCell
} from "./table-model";
import { TRANSACTION_MAIN_ROW_HEIGHT_CLASS } from "./transaction-row-geometry";
import { TRANSACTION_GRID_TEMPLATE } from "./TransactionTable";

/** How long the two-click delete confirmation stays armed. */
const DELETE_CONFIRM_MS = 3000;

export interface TransactionRowData {
    id: string;
    date: string;
    /** Description text (imported from bank file or user-entered) */
    description: string;
    /** Notes/memo (shown in expandable row) */
    notes?: string;
    /** Amount in minor units (e.g., cents for USD) - stored as integer */
    amount: number;
    /** Immutable amount before the first edit of an imported transaction */
    originalAmount?: number;
    account?: string;
    accountId?: string;
    /** Currency code for the account (for amount display/editing) */
    currency?: string;
    status?: string;
    statusId?: string;
    tags?: Array<{ id: string; name: string; color?: string }>;
    balance?: number;
    /** ID of suspected duplicate transaction */
    possibleDuplicateOf?: string;
    /** Description alias ID (if set) */
    descriptionAliasId?: string;
    /** Resolved alias name (through symlinks) */
    descriptionAliasName?: string;
    /** Original imported description text (for tooltip) */
    originalDescription?: string;
    /** Raw stored explicit allocations, including malformed legacy values for repair. */
    allocations?: unknown;
    /** Raw ownership input from this transaction's account. */
    accountOwnerships?: unknown;
}

/**
 * Row presence projected from the vault's Loro ephemeral store (HS-003).
 *
 * Identities only — a presence payload never carries financial text, so nothing here can leak a
 * description or amount into the UI of a peer who is looking at a different row.
 */
export interface TransactionRowPresence {
    /** Identities with a session focused on this row. */
    readonly focusedBy: readonly string[];
    /** Identities actively editing a field in this row. */
    readonly editingBy: readonly string[];
    /** Identities actively editing each stable cell name, never the cell values. */
    readonly editingByField: Readonly<Record<string, readonly string[]>>;
}

interface IndexedTransactionGridCell {
    readonly cell: TransactionTableCell;
    readonly index: number;
}

/** Indexes one row's TanStack cells once so every rendered field lookup is constant-time. */
export function indexTransactionGridCells(
    cells: readonly TransactionTableCell[]
): ReadonlyMap<string, IndexedTransactionGridCell> {
    return new Map(
        cells.map((cell, index): readonly [string, IndexedTransactionGridCell] => [
            cell.column.id,
            { cell, index }
        ])
    );
}

export interface TransactionGridRowSurface {
    readonly cells: readonly TransactionTableCell[];
    readonly controller: TransactionGridWorkspaceController;
    readonly editor: TransactionGridEditorProjection | null;
    readonly interactionKind: TransactionGridControllerSnapshot["interactionKind"];
    readonly selectionVisibility: TransactionGridControllerSnapshot["selectionVisibility"];
    readonly initialTabStopColumnId: TransactionColumnId | null;
    readonly parkedTabStopColumnId: TransactionColumnId | null;
    readonly viewportRowDistance: number;
}

export interface TransactionRowProps {
    /** Persisted transaction data */
    transaction: TransactionRowData;
    /** Presence info for this row */
    presence?: TransactionRowPresence;
    /**
     * Resolves a member's pubkeyHash to their display name for the presence avatar and label
     * (UR-003). Kept as a function prop so the row stays presentational and the CRDT people lookup
     * lives in the page. Members are unnamed until resolved, never labelled with their hash.
     */
    resolveMemberName?: (pubkeyHash: string) => MemberDisplayName;
    /** Whether this row is selected */
    isSelected?: boolean;
    /** Absolute 1-based row position in the logical grid, including its header. */
    ariaRowIndex?: number;
    /**
     * The `data-cell` markers of this row's selected cells, when the row is inside a table that has
     * cell selection.
     *
     * Drives `aria-selected` on the cells that can take part in a range, which is how a grid's cell
     * selection is expressed to assistive technology — and, being an attribute rather than a paint,
     * it cannot disturb the cells' resting chrome (UR-005). Absent outside a table, in which case no
     * cell advertises a selection state it cannot have.
     */
    selectedCellMarkers?: ReadonlySet<string>;
    /** Shared TanStack/controller gridcell surface when rendered inside the transaction table. */
    gridCellSurface?: TransactionGridRowSurface;
    /** Suppresses presence publication while the workspace applies programmatic description focus. */
    suppressDescriptionFocusPresence?: boolean;
    /** Registers this row's description input with the workspace focus coordinator. */
    onDescriptionInputElementChange?: (
        transactionId: TransactionId,
        element: HTMLInputElement | null
    ) => void | (() => void);
    /** Registers the rendered row subtree for generation-correlated focus reconciliation. */
    onRowElementChange?: (transactionId: string, element: HTMLElement | null) => void;
    /** Available accounts for inline editing */
    availableAccounts?: AccountOption[];
    /** Available statuses for inline editing */
    availableStatuses?: StatusOption[];
    /** Available tags for inline editing */
    availableTags?: TagOption[];
    /** Materialize a new tag in the editor draft without mutating the vault. */
    onCreateTag?: (name: string) => Promise<TagOption>;
    /** Commit selected tag IDs and locally-created tag records in one mutation. */
    onTagsCommit?: (
        tagIds: string[],
        createdTags: readonly TagOption[]
    ) => TransactionGridEditorCommitResult;
    /** Available description aliases for autocomplete */
    availableAliases?: DescriptionAliasOption[];
    /** Callback when user commits description text (for alias creation/rename/modal) */
    onDescriptionCommitText?: (
        text: string,
        origin: DescriptionAliasEditOrigin
    ) => TransactionGridEditorCommitResult;
    /** Callback when user selects an existing alias from dropdown */
    onDescriptionSelectAlias?: (
        aliasId: string,
        origin: DescriptionAliasEditOrigin
    ) => TransactionGridEditorCommitResult;
    /** Callback when row is clicked (for navigation/focus, not selection) */
    onClick?: () => void;
    /** Callback when row is focused */
    onFocus?: () => void;
    /**
     * Callback when focus lands inside one of THIS row's cells, carrying the raw `data-cell` marker,
     * or `null` for the row's own chrome.
     *
     * Separate from {@link onFieldFocus} for two reasons the grid's cell selection depends on and
     * presence deliberately does not care about. Presence reports the checkbox as `undefined`, because
     * ticking a box is selecting rather than editing — but cell selection has to tell "the checkbox
     * cell, which takes no part in ranges" from "not in a cell at all". And this fires only for a
     * target inside the row's own DOM: a cell's portaled editor (the date calendar, the tags list, the
     * account combobox) lives in `document.body` while its focus events still bubble through the React
     * tree, and opening a cell's own editor is not leaving that cell.
     */
    onCellFocus?: (marker: string | null) => void;
    /** Reports legacy checkbox/actions focus without discarding an existing canonical cell range. */
    onActivationDescendantFocus?: () => void;
    /** Makes the persistent inspector visible before actions-cell keyboard focus enters it. */
    onInspectorOpenRequest?: () => void;
    /** Callback when resolving duplicate (keep = clear flag, delete = remove) */
    onResolveDuplicate?: (action: "keep" | "delete") => void;
    /** Callback when deleting the transaction */
    onDelete?: () => void;
    /** Callback when a field is updated via inline edit */
    onFieldUpdate?: (field: keyof TransactionRowData, value: unknown) => void;
    /** Ordered person-specific columns shared with the table header */
    allocationColumns?: readonly AllocationColumn[];
    /** Shared dynamic grid template */
    gridTemplateColumns?: string;
    /** Commit one person allocation through the central mutation boundary */
    onAllocationUpdate?: (personId: string, value: number) => TransactionGridEditorCommitResult;
    /** Callback when checkbox is toggled */
    onCheckboxChange?: () => void;
    /** Callback when shift-clicking checkbox for range selection */
    onCheckboxShiftClick?: () => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Transaction row component with presence highlighting.
 */
export function TransactionRow({
    transaction,
    presence,
    resolveMemberName,
    isSelected = false,
    ariaRowIndex,
    selectedCellMarkers,
    gridCellSurface,
    suppressDescriptionFocusPresence = false,
    onDescriptionInputElementChange,
    onRowElementChange,
    availableAccounts = [],
    availableStatuses = [],
    availableTags = [],
    onCreateTag,
    onTagsCommit,
    availableAliases = [],
    onDescriptionCommitText,
    onDescriptionSelectAlias,
    onClick,
    onFocus,
    onCellFocus,
    onActivationDescendantFocus,
    onInspectorOpenRequest,
    onResolveDuplicate,
    onDelete,
    onFieldUpdate,
    allocationColumns = [],
    gridTemplateColumns = TRANSACTION_GRID_TEMPLATE,
    onAllocationUpdate,
    onCheckboxChange,
    onCheckboxShiftClick,
    className
}: TransactionRowProps) {
    const dateLocale = useDateLocale();
    const transactionId = asTransactionId(transaction.id);
    const registerDescriptionInput = useCallback(
        (element: HTMLInputElement | null) =>
            onDescriptionInputElementChange?.(transactionId, element),
        [onDescriptionInputElementChange, transactionId]
    );
    const registerRowElement = useCallback(
        (element: HTMLElement | null) => onRowElementChange?.(transaction.id, element),
        [onRowElementChange, transaction.id]
    );

    const {
        isActive: showDeleteConfirm,
        activate: armDeleteConfirm,
        reset: clearDeleteConfirm
    } = useTransientFlag(DELETE_CONFIRM_MS);
    const indexedGridCells = useMemo(
        () => indexTransactionGridCells(gridCellSurface?.cells ?? []),
        [gridCellSurface?.cells]
    );

    const effectiveData = transaction;
    const displayedDate = effectiveData.date
        ? formatTransactionDate(effectiveData.date, undefined, dateLocale)
        : "Pick a date";
    const displayedDescription =
        effectiveData.descriptionAliasName ?? effectiveData.description ?? "No description";
    const descriptionProvenance = importedDescriptionProvenance(
        displayedDescription,
        effectiveData.descriptionAliasId,
        effectiveData.originalDescription
    );
    const amountProvenance = originalAmountDescription(
        effectiveData.originalAmount,
        effectiveData.currency ?? "USD"
    );
    const displayedAccount =
        availableAccounts.find((account) => account.id === effectiveData.accountId)?.name ??
        effectiveData.account ??
        "Add account...";
    const displayedStatus = effectiveData.status ?? "Select...";
    const gridController = gridCellSurface?.controller;
    const controllerPopupEditorOpen =
        gridCellSurface?.interactionKind === "editing" ||
        gridCellSurface?.interactionKind === "interacting";
    const finishControllerEditing = useCallback(
        (columnId: TransactionColumnId, editing: boolean) => {
            if (editing || gridController == null) return;
            gridController.finishEditing({
                columnId,
                transactionId: transactionId
            });
        },
        [gridController, transactionId]
    );
    const finishControllerEditingFor = useMemo(
        () => ({
            account: (editing: boolean) => finishControllerEditing("account", editing),
            amount: (editing: boolean) => finishControllerEditing("amount", editing),
            date: (editing: boolean) => finishControllerEditing("date", editing),
            description: (editing: boolean) => finishControllerEditing("description", editing),
            status: (editing: boolean) => finishControllerEditing("status", editing),
            tags: (editing: boolean) => finishControllerEditing("tags", editing)
        }),
        [finishControllerEditing]
    );
    const setControllerEditorInteraction = useCallback(
        (columnId: TransactionColumnId, popup: TransactionEditorPopupKind, open: boolean) => {
            if (gridController == null) return;
            gridController.setEditorInteraction(
                {
                    columnId,
                    transactionId: transactionId
                },
                popup,
                open
            );
        },
        [gridController, transactionId]
    );
    const handleDatePopupOpenChange = useCallback(
        (popup: "calendar", open: boolean) => setControllerEditorInteraction("date", popup, open),
        [setControllerEditorInteraction]
    );
    const handleDescriptionPopupOpenChange = useCallback(
        (popup: "listbox", open: boolean) =>
            setControllerEditorInteraction("description", popup, open),
        [setControllerEditorInteraction]
    );
    const handleAccountPopupOpenChange = useCallback(
        (popup: "combobox" | "modal", open: boolean) =>
            setControllerEditorInteraction("account", popup, open),
        [setControllerEditorInteraction]
    );
    const handleTagsPopupOpenChange = useCallback(
        (popup: "combobox", open: boolean) => setControllerEditorInteraction("tags", popup, open),
        [setControllerEditorInteraction]
    );
    const handleStatusPopupOpenChange = useCallback(
        (popup: "listbox", open: boolean) => setControllerEditorInteraction("status", popup, open),
        [setControllerEditorInteraction]
    );
    const allocations = useMemo(
        () => materializeAllocationRecord(effectiveData.allocations),
        [effectiveData.allocations]
    );
    const accountOwnerships = useMemo(
        () => materializeAllocationRecord(effectiveData.accountOwnerships),
        [effectiveData.accountOwnerships]
    );
    const effectiveDerivation = useMemo(
        () => deriveEffectiveAllocations(allocations, accountOwnerships),
        [accountOwnerships, allocations]
    );

    // Presence arrives already excluding this tab's own session, so no identity filtering happens
    // here: a second tab of the same identity is a genuine other session and must be shown, which
    // is the whole point of a per-tab session id.
    const focusedByOthers = presence?.focusedBy ?? [];
    const editingByOthers = presence?.editingBy ?? [];
    const presenceUserId = editingByOthers[0] ?? focusedByOthers[0];
    const borderColor = presenceUserId ? hashToColor(presenceUserId) : undefined;
    const presenceDisplayName = presenceUserId
        ? (resolveMemberName?.(presenceUserId) ?? { kind: "unnamed" })
        : undefined;
    const presenceLabel = presenceUserId
        ? `${editingByOthers.length > 0 ? "Editing" : "Viewing"}: ${(editingByOthers.length > 0
              ? editingByOthers
              : focusedByOthers
          )
              .map((pubkeyHash) =>
                  memberDisplayLabel(resolveMemberName?.(pubkeyHash) ?? { kind: "unnamed" })
              )
              .join(", ")}`
        : undefined;

    const isDuplicate = !!effectiveData.possibleDuplicateOf;
    const actionFocusChrome =
        gridCellSurface?.interactionKind === "parked"
            ? PARKED_ACTION_FOCUS_CHROME
            : INNER_CELL_FOCUS_CHROME;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showDeleteConfirm) {
            onDelete?.();
            clearDeleteConfirm();
        } else {
            armDeleteConfirm();
        }
    };

    // Handle checkbox click without propagating to row click
    const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    // Handle checkbox change (toggle) - CheckboxCell passes new value but we just notify toggle
    const handleCheckboxChange = useCallback(() => {
        onCheckboxChange?.();
    }, [onCheckboxChange]);

    // Handle shift-click on checkbox
    const handleShiftClick = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            onCheckboxShiftClick?.();
        },
        [onCheckboxShiftClick]
    );

    const publishPresenceFocus = useCallback(() => {
        onFocus?.();
    }, [onFocus]);

    const handleRowFocus = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            const target = event.target;
            if (!(target instanceof Element) || target.ownerDocument.activeElement !== target)
                return;
            const gridcell = target.closest<HTMLElement>('[role="gridcell"][data-cell]');
            const gridcellMarker = gridcell?.getAttribute("data-cell");
            const controller = gridCellSurface?.controller;
            const pending = controller?.getPendingRequest();
            if (
                controller != null &&
                pending?.state.phase === "focus" &&
                pending.state.target.transactionId === effectiveData.id &&
                pending.state.target.columnId === gridcellMarker
            ) {
                // `.focus()` dispatches this event synchronously. Defer presence until the controller
                // has verified connected activeElement ownership and atomically fulfilled the exact
                // command; a redirect or unmount abort restores the origin before this microtask.
                event.stopPropagation();
                queueMicrotask(() => {
                    if (
                        !target.isConnected ||
                        target.ownerDocument.activeElement !== target ||
                        controller.getPendingRequest() != null
                    ) {
                        return;
                    }
                    publishPresenceFocus();
                });
                return;
            }

            publishPresenceFocus();
            if (suppressDescriptionFocusPresence) return;
            const activeEditor = controller?.getSnapshot().editor;
            if (
                activeEditor?.address.transactionId === effectiveData.id &&
                activeEditor.address.columnId === gridcellMarker
            ) {
                return;
            }

            const cell = target.closest("[data-presence-field], [data-cell]");
            const marker =
                cell?.getAttribute("data-presence-field") ?? cell?.getAttribute("data-cell");
            // Portaled editors bubble their focus through the React tree from outside this row's DOM,
            // and are not focus leaving the row. Legacy activation descendants retain the slice-2B
            // focus pin until their dedicated activation-cell migration; focusing the gridcell
            // background itself uses the new selectable checkbox/actions identity.
            if (event.currentTarget.contains(target)) {
                const activationDescendant =
                    (gridcellMarker === "checkbox" || gridcellMarker === "actions") &&
                    target !== gridcell;
                const sharedGridcellSurface = target === gridcell;
                if (activationDescendant) onActivationDescendantFocus?.();
                else if (!sharedGridcellSurface) onCellFocus?.(gridcellMarker ?? marker ?? null);
            }
        },
        [
            effectiveData.id,
            gridCellSurface,
            onActivationDescendantFocus,
            onCellFocus,
            publishPresenceFocus,
            suppressDescriptionFocusPresence
        ]
    );

    const renderGridCell = (
        columnId: TransactionColumnId,
        display: React.ReactNode,
        options: {
            readonly adornment?: React.ReactNode;
            readonly ariaDescription?: string;
            readonly className?: string;
            readonly editor?: React.ReactNode;
            readonly key?: React.Key;
            readonly legacyInteractive?: boolean;
            readonly onActivate?: (activation: "checkbox" | "inspector") => void;
            readonly presenceField?: string;
        } = {}
    ): React.ReactNode => {
        const indexedCell = indexedGridCells.get(columnId);
        const cellIndex = indexedCell?.index ?? -1;
        const cell = indexedCell?.cell;
        const meta = cell?.column.columnDef.meta;
        const presenceField = options.presenceField ?? columnId;
        const fieldPresenceUserId = presence?.editingByField[presenceField]?.[0];
        const projectedEditor = gridCellSurface?.editor;
        const showEditor =
            projectedEditor?.address.transactionId === effectiveData.id &&
            projectedEditor.address.columnId === columnId;
        const address = {
            columnId,
            transactionId: transactionId
        };
        if (gridCellSurface == null || cell == null || meta == null) {
            return (
                <div
                    key={options.key}
                    aria-description={options.ariaDescription}
                    aria-selected={selectedCellMarkers?.has(columnId)}
                    data-cell={columnId}
                    className={cn(TRANSACTION_GRIDCELL_CHROME, options.className)}
                    role="gridcell"
                >
                    {display}
                    {options.adornment}
                </div>
            );
        }
        return (
            <TransactionGridCell
                key={options.key}
                address={address}
                ariaColumnIndex={cellIndex + 1}
                cell={cell}
                controller={gridCellSurface.controller}
                interaction={meta.interaction}
                interactionKind={gridCellSurface.interactionKind}
                selected={selectedCellMarkers?.has(columnId) ?? false}
                selectionVisibility={gridCellSurface.selectionVisibility}
                isInitialTabStop={gridCellSurface.initialTabStopColumnId === columnId}
                isParkedTabStop={gridCellSurface.parkedTabStopColumnId === columnId}
                viewportRowDistance={gridCellSurface.viewportRowDistance}
                display={display}
                adornment={options.adornment}
                ariaDescription={options.ariaDescription}
                editor={options.editor}
                editorEntry={showEditor ? projectedEditor.entry : undefined}
                editorInitialText={showEditor ? projectedEditor.initialText : undefined}
                showEditor={showEditor}
                legacyInteractive={options.legacyInteractive ?? false}
                onActivate={options.onActivate}
                presenceColor={
                    fieldPresenceUserId == null ? undefined : hashToColor(fieldPresenceUserId)
                }
                className={options.className}
            />
        );
    };

    return (
        <div ref={registerRowElement} className="flex flex-col" role="presentation">
            {/* Main row */}
            <div
                onClick={() => onClick?.()}
                onFocus={handleRowFocus}
                data-testid="transaction-row"
                data-transaction-id={effectiveData.id}
                className={cn(
                    "group border-border/60 relative grid items-stretch gap-0 border-l p-0",
                    TRANSACTION_MAIN_ROW_HEIGHT_CLASS,
                    "transition-colors",
                    isSelected && "bg-accent",
                    isSelected && "focused selected",
                    isDuplicate && "bg-yellow-50/50 dark:bg-yellow-950/20",
                    className
                )}
                style={{ gridTemplateColumns }}
                role="row"
                aria-rowindex={ariaRowIndex}
                aria-selected={isSelected}
            >
                {/* Presence indicator - colored left border. Purely decorative and never
                    interactive, so it cannot take focus or block editing. Editing is distinguished
                    by width rather than motion, and the pulse is dropped under reduced-motion. */}
                {presenceUserId && (
                    <div
                        aria-hidden="true"
                        data-testid="row-presence-indicator"
                        data-presence-editing={editingByOthers.length > 0 ? "true" : "false"}
                        data-presence-count={focusedByOthers.length}
                        className={cn(
                            "pointer-events-none absolute top-0 bottom-0 left-0",
                            editingByOthers.length > 0 ? "w-1.5 motion-safe:animate-pulse" : "w-1"
                        )}
                        style={{ backgroundColor: borderColor }}
                        title={presenceLabel}
                    />
                )}

                {/* Checkbox activation stays legacy until the dedicated activation-cell slice. */}
                {renderGridCell(
                    "checkbox",
                    <div
                        data-testid="row-checkbox"
                        onClick={handleCheckboxClick}
                        className="relative flex size-4 cursor-pointer items-center justify-center"
                        role="presentation"
                    >
                        <CheckboxCell
                            checked={isSelected}
                            onChange={() => handleCheckboxChange()}
                            onShiftClick={handleShiftClick}
                            ariaLabel={`Select transaction ${effectiveData.description}`}
                            rowGeometry="dataRow"
                            showFocusIndicator={gridCellSurface?.interactionKind === "parked"}
                        />
                    </div>,
                    {
                        className: "justify-center px-0",
                        legacyInteractive: true,
                        onActivate: (activation) => {
                            if (activation === "checkbox") handleCheckboxChange();
                        }
                    }
                )}

                {/* Date */}
                {renderGridCell(
                    "date",
                    <span
                        data-testid="date-display"
                        className="w-full min-w-0 truncate text-sm tabular-nums"
                    >
                        {displayedDate}
                    </span>,
                    {
                        editor: (
                            <InlineEditableDate
                                value={effectiveData.date}
                                onSave={(value) => onFieldUpdate?.("date", value)}
                                onEditingChange={finishControllerEditingFor.date}
                                onPopupOpenChange={handleDatePopupOpenChange}
                                ownerRowId={transactionId}
                                className="w-full min-w-0"
                                data-testid="date-editable"
                            />
                        )
                    }
                )}

                {/* Description */}
                {renderGridCell(
                    "description",
                    <div className="min-w-0 flex-1">
                        <DescriptionAliasDisplay
                            value={displayedDescription}
                            descriptionAliasId={effectiveData.descriptionAliasId}
                            originalDescription={effectiveData.originalDescription}
                            data-testid="description-display"
                        />
                    </div>,
                    {
                        ariaDescription: descriptionProvenance?.ariaDescription,
                        className: "flex min-w-0 items-center gap-1",
                        editor: (
                            <div className="min-w-0 flex-1">
                                <InlineEditableDescriptionAlias
                                    value={displayedDescription}
                                    descriptionAliasId={effectiveData.descriptionAliasId}
                                    originalDescription={effectiveData.originalDescription}
                                    availableAliases={availableAliases}
                                    onCommitText={(text, origin) =>
                                        onDescriptionCommitText?.(text, origin) ??
                                        TRANSACTION_GRID_EDITOR_COMMIT_FAILURE
                                    }
                                    onSelectAlias={(aliasId, origin) =>
                                        onDescriptionSelectAlias?.(aliasId, origin) ??
                                        TRANSACTION_GRID_EDITOR_COMMIT_FAILURE
                                    }
                                    onEditingChange={finishControllerEditingFor.description}
                                    onPopupOpenChange={handleDescriptionPopupOpenChange}
                                    ownerRowId={transactionId}
                                    onInputElementChange={registerDescriptionInput}
                                    className="truncate font-medium"
                                    inputClassName="font-medium"
                                    placeholder="No description"
                                    data-testid="description-editable"
                                />
                            </div>
                        )
                    }
                )}

                {/* Account */}
                {renderGridCell(
                    "account",
                    <span className="text-muted-foreground w-full min-w-0 truncate text-sm">
                        {displayedAccount}
                    </span>,
                    {
                        className: "min-w-0",
                        editor: (
                            <AccountCombobox
                                commitMode="deferred"
                                value={effectiveData.accountId ?? ""}
                                initialSearch={
                                    gridCellSurface?.editor?.address.transactionId ===
                                        effectiveData.id &&
                                    gridCellSurface.editor.address.columnId === "account"
                                        ? gridCellSurface.editor.initialText
                                        : undefined
                                }
                                onChange={(accountId) => onFieldUpdate?.("accountId", accountId)}
                                onEditingChange={finishControllerEditingFor.account}
                                onPopupOpenChange={handleAccountPopupOpenChange}
                                ownerTransactionId={transactionId}
                                startOpen={controllerPopupEditorOpen}
                                accounts={availableAccounts}
                                placeholder="Add account..."
                                className={cn(
                                    "text-muted-foreground h-7",
                                    RESTING_CELL_CHROME,
                                    TRANSACTION_GRID_EDITOR_INLINE_CHROME
                                )}
                            />
                        )
                    }
                )}

                {/* Tags */}
                {renderGridCell(
                    "tags",
                    <span className="w-full min-w-0 truncate text-sm">
                        {effectiveData.tags?.map((tag) => tag.name).join(", ") || "Add tags..."}
                    </span>,
                    {
                        editor: (
                            <InlineEditableTags
                                value={effectiveData.tags?.map((t) => t.id) ?? []}
                                tags={effectiveData.tags ?? []}
                                availableTags={availableTags}
                                onSave={(tagIds, createdTags) =>
                                    onTagsCommit?.(tagIds, createdTags) ??
                                    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE
                                }
                                onCreateTag={onCreateTag}
                                initialSearch={
                                    gridCellSurface?.editor?.address.transactionId ===
                                        effectiveData.id &&
                                    gridCellSurface.editor.address.columnId === "tags"
                                        ? gridCellSurface.editor.initialText
                                        : undefined
                                }
                                onEditingChange={finishControllerEditingFor.tags}
                                onPopupOpenChange={handleTagsPopupOpenChange}
                                ownerRowId={effectiveData.id}
                                startOpen={controllerPopupEditorOpen}
                                className="w-full min-w-0"
                                data-testid="tags-editable"
                            />
                        )
                    }
                )}

                {/* Status */}
                {renderGridCell(
                    "status",
                    <span className="text-muted-foreground w-full min-w-0 truncate text-sm">
                        {displayedStatus}
                    </span>,
                    {
                        editor: (
                            <InlineEditableStatus
                                value={effectiveData.statusId}
                                statusName={effectiveData.status}
                                availableStatuses={availableStatuses}
                                onSave={(statusId) => onFieldUpdate?.("statusId", statusId)}
                                startOpen={controllerPopupEditorOpen}
                                onEditingChange={finishControllerEditingFor.status}
                                onPopupOpenChange={handleStatusPopupOpenChange}
                                ownerRowId={transactionId}
                                data-testid="status-editable"
                            />
                        )
                    }
                )}

                {allocationColumns.length > 0 ? (
                    <div
                        className="grid h-full min-w-0 grid-cols-subgrid"
                        style={{ gridColumn: `span ${String(allocationColumns.length)}` }}
                    >
                        {allocationColumns.map((column) =>
                            renderGridCell(
                                column.field,
                                <PersonAllocationDisplay
                                    personId={column.personId}
                                    explicitValue={allocations[column.personId]}
                                    allocations={allocations}
                                    accountOwnerships={accountOwnerships}
                                    effectiveDerivation={effectiveDerivation}
                                    presenceField={column.presenceField}
                                />,
                                {
                                    className: "min-w-0",
                                    editor: (
                                        <PersonAllocationCell
                                            personId={column.personId}
                                            personLabel={column.label}
                                            presenceField={column.presenceField}
                                            explicitValue={allocations[column.personId]}
                                            allocations={allocations}
                                            accountOwnerships={accountOwnerships}
                                            effectiveDerivation={effectiveDerivation}
                                            startEditing
                                            onCommit={onAllocationUpdate}
                                            onEditingChange={(editing) =>
                                                finishControllerEditing(column.field, editing)
                                            }
                                        />
                                    ),
                                    key: column.personId,
                                    presenceField: column.presenceField
                                }
                            )
                        )}
                    </div>
                ) : null}

                {/* Amount */}
                {renderGridCell(
                    "amount",
                    <InlineEditableAmountDisplay
                        value={effectiveData.amount}
                        originalValue={effectiveData.originalAmount}
                        currency={effectiveData.currency}
                        data-testid="amount-display"
                    />,
                    {
                        ariaDescription: amountProvenance,
                        className: "justify-end text-right",
                        editor: (
                            <InlineEditableAmount
                                value={effectiveData.amount}
                                originalValue={effectiveData.originalAmount}
                                currency={effectiveData.currency}
                                onSave={(value) => onFieldUpdate?.("amount", value)}
                                onEditingChange={finishControllerEditingFor.amount}
                                data-testid="amount-editable"
                            />
                        )
                    }
                )}

                {/* Actions has a stable selectable cell identity; its legacy controls remain nested. */}
                {renderGridCell(
                    "actions",
                    <>
                        {isDuplicate && (
                            <DuplicateBadge
                                duplicateOfId={effectiveData.possibleDuplicateOf}
                                onResolve={onResolveDuplicate}
                            />
                        )}

                        {onDelete && (
                            <div data-legacy-action="delete" role="presentation">
                                <Button
                                    variant="ghost"
                                    size={showDeleteConfirm ? "sm" : "icon-sm"}
                                    onClick={handleDelete}
                                    data-testid="delete-button"
                                    className={cn(
                                        actionFocusChrome,
                                        showDeleteConfirm
                                            ? "h-8 w-12 min-w-12 bg-red-100 px-0 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                                            : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    )}
                                    title={
                                        showDeleteConfirm
                                            ? "Click again to confirm delete"
                                            : "Delete transaction"
                                    }
                                >
                                    {showDeleteConfirm ? (
                                        <span className="text-xs font-medium">Delete</span>
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </>,
                    {
                        className: cn(
                            "h-full justify-end",
                            showDeleteConfirm ? "gap-0.5 px-1" : "gap-1 px-2"
                        ),
                        legacyInteractive: true,
                        onActivate: (activation) => {
                            if (activation !== "inspector" || gridController == null) return;
                            onInspectorOpenRequest?.();
                            queueMicrotask(() => {
                                gridController.activateInspectorFromActionCell({
                                    columnId: "actions",
                                    transactionId
                                });
                            });
                        }
                    }
                )}

                {/* Presence avatar - shows who else is on this row. Non-interactive so keyboard
                    navigation across the table never stops on it. */}
                {presenceUserId && presenceDisplayName && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 -right-2 -translate-y-1/2"
                        title={presenceLabel}
                    >
                        <PresenceAvatar
                            userId={presenceUserId}
                            displayName={presenceDisplayName}
                            isOnline={true}
                            size="sm"
                            showIndicator={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
