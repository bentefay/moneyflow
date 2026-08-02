"use client";

/**
 * Transaction Row
 *
 * Individual row in the transaction list with presence highlighting.
 * Shows colored border when another user is focused on or editing the row.
 * Supports duplicate detection, resolution actions, deletion, and inline editing.
 */

import { ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AccountCombobox, AccountOption } from "@/components/features/accounts";
import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTransientFlag } from "@/components/ui/use-transient-flag";
import { type MemberDisplayName, memberDisplayLabel } from "@/lib/crdt/person";
import { deriveEffectiveAllocations } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { hashToColor } from "@/lib/utils/color";

import { type AllocationColumn, materializeAllocationRecord } from "./allocation-columns";
import { RESTING_CELL_CHROME } from "./cells/cell-chrome";
import { CheckboxCell } from "./cells/CheckboxCell";
import { InlineEditableAmount } from "./cells/InlineEditableAmount";
import { InlineEditableDate } from "./cells/InlineEditableDate";
import {
    type DescriptionAliasEditOrigin,
    InlineEditableDescriptionAlias,
    type DescriptionAliasOption
} from "./cells/InlineEditableDescriptionAlias";
import { InlineEditableStatus, type StatusOption } from "./cells/InlineEditableStatus";
import { InlineEditableTags, type TagOption } from "./cells/InlineEditableTags";
import { PersonAllocationCell } from "./cells/PersonAllocationCell";
import { DuplicateBadge } from "./DuplicateBadge";
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
    /** Stable cell names being edited, never their values. */
    readonly fields: readonly string[];
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
    /** Whether the notes row is expanded */
    isExpanded?: boolean;
    /** One-shot request to focus this row's description input as soon as the row mounts. */
    focusDescriptionRequested?: boolean;
    /** Reports that a {@link focusDescriptionRequested} request landed. */
    onFocusDescriptionApplied?: () => void;
    /** Available accounts for inline editing */
    availableAccounts?: AccountOption[];
    /** Available statuses for inline editing */
    availableStatuses?: StatusOption[];
    /** Available tags for inline editing */
    availableTags?: TagOption[];
    /** Callback when a new tag should be created */
    onCreateTag?: (name: string) => Promise<TagOption>;
    /** Available description aliases for autocomplete */
    availableAliases?: DescriptionAliasOption[];
    /** Callback when user commits description text (for alias creation/rename/modal) */
    onDescriptionCommitText?: (text: string, origin: DescriptionAliasEditOrigin) => void;
    /** Callback when user selects an existing alias from dropdown */
    onDescriptionSelectAlias?: (aliasId: string, origin: DescriptionAliasEditOrigin) => void;
    /** Callback when row is clicked (for navigation/focus, not selection) */
    onClick?: () => void;
    /** Callback when row is focused */
    onFocus?: () => void;
    /**
     * Callback when focus lands inside a specific cell, identified by its stable `data-cell` name.
     * Drives field-level presence; the cell's *value* is never reported.
     */
    onFieldFocus?: (field: string | undefined) => void;
    /** Callback when resolving duplicate (keep = clear flag, delete = remove) */
    onResolveDuplicate?: (action: "keep" | "delete") => void;
    /** Callback when deleting the transaction */
    onDelete?: () => void;
    /** Callback when a field is updated via inline edit */
    onFieldUpdate?: (field: keyof TransactionRowData, value: unknown) => void;
    /**
     * Render the inline description-rule robot for this row. Receives whether the description field
     * is actively being edited so the affordance can hide itself. Kept as a render prop so the row
     * stays presentational and the CRDT wiring lives in the page.
     */
    renderDescriptionRobot?: (context: { readonly isEditing: boolean }) => React.ReactNode;
    /**
     * Wrap a rule-backed cell so a just-made change to it can offer to become an automation rule
     * (UR-009). Kept as a render prop for the same reason as the robot: the row stays presentational
     * and every CRDT seam lives in the page. When absent, the cell renders unchanged.
     */
    renderRuleProposal?: (
        field: "descriptionAlias" | "tags" | "allocation",
        context: { readonly isEditing: boolean },
        cell: React.ReactNode,
        anchorClassName: string | undefined,
        style: React.CSSProperties | undefined
    ) => React.ReactNode;
    /** Ordered person-specific columns shared with the table header */
    allocationColumns?: readonly AllocationColumn[];
    /** Shared dynamic grid template */
    gridTemplateColumns?: string;
    /** Commit one person allocation through the central mutation boundary */
    onAllocationUpdate?: (personId: string, value: number) => void;
    /** Callback when checkbox is toggled */
    onCheckboxChange?: () => void;
    /** Callback when shift-clicking checkbox for range selection */
    onCheckboxShiftClick?: () => void;
    /** Callback when expand/collapse is toggled */
    onToggleExpand?: () => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Wrap a rule-backed cell in its proposal surface, or render it untouched when the page supplies no
 * proposal renderer (every non-transactions surface, and tests that mount the row directly).
 *
 * `anchorClassName` carries the layout the wrapper must take over from the cell it replaces, and
 * `style` any inline geometry that layout needs, so wrapping is size-neutral.
 *
 * Which of the two branches below is taken depends only on whether the caller supplies a renderer,
 * which is fixed for the lifetime of a surface — so this branch never flips at runtime and cannot
 * itself cause a remount. Keeping the edited cell mounted while a proposal appears is the RENDERER's
 * responsibility, discharged in `page.tsx` by mounting one stable element type regardless of whether
 * the cell is the pending edit.
 */
function renderRuleProposalOrCell(
    render: TransactionRowProps["renderRuleProposal"],
    field: "descriptionAlias" | "tags" | "allocation",
    context: { readonly isEditing: boolean },
    anchorClassName: string | undefined,
    cell: React.ReactNode,
    style?: React.CSSProperties
): React.ReactNode {
    if (render == null) {
        return (
            <div className={anchorClassName} style={style}>
                {cell}
            </div>
        );
    }
    return render(field, context, cell, anchorClassName, style);
}

/**
 * Transaction row component with presence highlighting.
 */
export function TransactionRow({
    transaction,
    presence,
    resolveMemberName,
    isSelected = false,
    isExpanded = false,
    focusDescriptionRequested = false,
    onFocusDescriptionApplied,
    availableAccounts = [],
    availableStatuses = [],
    availableTags = [],
    onCreateTag,
    availableAliases = [],
    onDescriptionCommitText,
    onDescriptionSelectAlias,
    onClick,
    onFocus,
    onFieldFocus,
    onResolveDuplicate,
    onDelete,
    onFieldUpdate,
    renderDescriptionRobot,
    renderRuleProposal,
    allocationColumns = [],
    gridTemplateColumns = TRANSACTION_GRID_TEMPLATE,
    onAllocationUpdate,
    onCheckboxChange,
    onCheckboxShiftClick,
    onToggleExpand,
    className
}: TransactionRowProps) {
    const notesRef = useRef<HTMLTextAreaElement>(null);

    const {
        isActive: showDeleteConfirm,
        activate: armDeleteConfirm,
        reset: clearDeleteConfirm
    } = useTransientFlag(DELETE_CONFIRM_MS);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [isEditingAllocation, setIsEditingAllocation] = useState(false);

    const effectiveData = transaction;
    const effectiveExpanded = isExpanded;
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

    // Auto-focus notes textarea when expanded
    useEffect(() => {
        if (effectiveExpanded && notesRef.current) {
            notesRef.current.focus();
        }
    }, [effectiveExpanded]);

    /**
     * Reports row and field focus from a single delegated listener. Reading the enclosing
     * `data-cell` / `data-presence-field` marker keeps every cell free of presence wiring, so a new
     * column reports focus correctly without touching this component.
     *
     * Presence answers "is a person working on this row", so it must describe a person rather than
     * a render. Placing the caret in a newly created row is the app moving focus on the user's
     * behalf, before they have touched anything, so that one focus reports nothing at all — exactly
     * as creating a row did before it moved focus. Reporting it as merely viewing would be just as
     * untrue, and would additionally leave this session's published state already naming the row,
     * so the user's first real focus would dedupe away and never reach peers. The request is
     * consumed on the commit that applies it, so every genuine gesture reports normally, including
     * a click straight back into the same input.
     */
    const handleRowFocus = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            onFocus?.();
            if (focusDescriptionRequested) return;

            const cell = event.target.closest("[data-presence-field], [data-cell]");
            const marker =
                cell?.getAttribute("data-presence-field") ?? cell?.getAttribute("data-cell");
            // The checkbox is selection, not editing, so it reports the row without a field.
            onFieldFocus?.(marker == null || marker === "checkbox" ? undefined : marker);
        },
        [focusDescriptionRequested, onFieldFocus, onFocus]
    );

    return (
        <div className="flex flex-col" role="presentation">
            {/* Main row */}
            <div
                onClick={() => onClick?.()}
                onFocus={handleRowFocus}
                tabIndex={0}
                data-testid="transaction-row"
                data-transaction-id={effectiveData.id}
                className={cn(
                    "group relative grid items-center gap-4 px-4 py-3",
                    !effectiveExpanded && "border-b",
                    "hover:bg-accent/50 focus:bg-accent/50",
                    "focus:outline-none",
                    "transition-colors",
                    isSelected && "bg-accent",
                    isSelected && "focused selected",
                    isDuplicate && "bg-yellow-50/50 dark:bg-yellow-950/20",
                    className
                )}
                style={{ gridTemplateColumns }}
                role="row"
                aria-selected={isSelected}
                aria-expanded={onToggleExpand ? isExpanded : undefined}
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

                {/* Checkbox for selection */}
                <div
                    data-cell="checkbox"
                    data-testid="row-checkbox"
                    onClick={handleCheckboxClick}
                    className="flex h-full w-full cursor-pointer items-center justify-center"
                    role="gridcell"
                >
                    <CheckboxCell
                        checked={isSelected}
                        onChange={() => handleCheckboxChange()}
                        onShiftClick={handleShiftClick}
                        ariaLabel={`Select transaction ${effectiveData.description}`}
                    />
                </div>

                {/* Date */}
                <div data-cell="date" role="gridcell">
                    <InlineEditableDate
                        value={effectiveData.date}
                        onSave={(value) => onFieldUpdate?.("date", value)}
                        data-testid="date-editable"
                    />
                </div>

                {/* Description */}
                <div
                    data-cell="description"
                    className="flex min-w-0 items-center gap-1"
                    role="gridcell"
                >
                    {renderRuleProposalOrCell(
                        renderRuleProposal,
                        "descriptionAlias",
                        { isEditing: isEditingDescription },
                        "min-w-0 flex-1",
                        <InlineEditableDescriptionAlias
                            value={effectiveData.descriptionAliasName ?? effectiveData.description}
                            descriptionAliasId={effectiveData.descriptionAliasId}
                            originalDescription={effectiveData.originalDescription}
                            availableAliases={availableAliases}
                            onCommitText={(text, origin) => {
                                onDescriptionCommitText?.(text, origin);
                            }}
                            onSelectAlias={(aliasId, origin) => {
                                onDescriptionSelectAlias?.(aliasId, origin);
                            }}
                            onEditingChange={setIsEditingDescription}
                            focusRequested={focusDescriptionRequested}
                            onFocusRequestApplied={onFocusDescriptionApplied}
                            className="truncate font-medium"
                            inputClassName="font-medium"
                            placeholder="No description"
                            data-testid="description-editable"
                        />
                    )}
                    {renderDescriptionRobot?.({ isEditing: isEditingDescription })}
                </div>

                {/* Account */}
                <div data-cell="account" className="min-w-0" role="gridcell">
                    <AccountCombobox
                        value={effectiveData.accountId ?? ""}
                        onChange={(accountId) => onFieldUpdate?.("accountId", accountId)}
                        accounts={availableAccounts}
                        placeholder="Add account..."
                        className={cn(
                            "text-muted-foreground hover:bg-accent/30 focus:border-primary focus:bg-background focus:ring-primary h-7 px-1 focus:ring-1",
                            RESTING_CELL_CHROME
                        )}
                    />
                </div>

                {/* Tags */}
                <div data-cell="tags" role="gridcell">
                    {renderRuleProposalOrCell(
                        renderRuleProposal,
                        "tags",
                        { isEditing: isEditingTags },
                        undefined,
                        <InlineEditableTags
                            value={effectiveData.tags?.map((t) => t.id) ?? []}
                            tags={effectiveData.tags ?? []}
                            availableTags={availableTags}
                            onSave={(tagIds) => onFieldUpdate?.("tags", tagIds)}
                            onCreateTag={onCreateTag}
                            onEditingChange={setIsEditingTags}
                            data-testid="tags-editable"
                        />
                    )}
                </div>

                {/* Status */}
                <div data-cell="status" role="gridcell">
                    <InlineEditableStatus
                        value={effectiveData.statusId}
                        statusName={effectiveData.status}
                        availableStatuses={availableStatuses}
                        onSave={(statusId) => onFieldUpdate?.("statusId", statusId)}
                        data-testid="status-editable"
                    />
                </div>

                {/* Frozen `:292-293`: a person-percentage rule covers the WHOLE set of percentage
                    columns, and "it should span all the columns". So the proposal wraps the entire
                    run of allocation cells as one anchored group rather than appearing per column,
                    and each cell keeps its own grid position inside that span. */}
                {allocationColumns.length > 0
                    ? renderRuleProposalOrCell(
                          renderRuleProposal,
                          "allocation",
                          { isEditing: isEditingAllocation },
                          "grid grid-cols-subgrid",
                          <>
                              {allocationColumns.map((column) => (
                                  <div
                                      key={column.personId}
                                      data-cell={column.field}
                                      className="min-w-0"
                                      role="gridcell"
                                  >
                                      <PersonAllocationCell
                                          personId={column.personId}
                                          personLabel={column.label}
                                          explicitValue={allocations[column.personId]}
                                          allocations={allocations}
                                          accountOwnerships={accountOwnerships}
                                          effectiveDerivation={effectiveDerivation}
                                          onCommit={onAllocationUpdate}
                                          onEditingChange={setIsEditingAllocation}
                                      />
                                  </div>
                              ))}
                          </>,
                          { gridColumn: `span ${String(allocationColumns.length)}` }
                      )
                    : null}

                {/* Amount */}
                <div data-cell="amount" className="text-right" role="gridcell">
                    <InlineEditableAmount
                        value={effectiveData.amount}
                        originalValue={effectiveData.originalAmount}
                        currency={effectiveData.currency}
                        onSave={(value) => onFieldUpdate?.("amount", value)}
                        data-testid="amount-editable"
                    />
                </div>

                {/* Actions column */}
                <div className="flex items-center justify-end gap-1">
                    {/* Duplicate indicator */}
                    {isDuplicate && (
                        <DuplicateBadge
                            duplicateOfId={effectiveData.possibleDuplicateOf}
                            onResolve={onResolveDuplicate}
                        />
                    )}

                    {/* Expand/Notes toggle button */}
                    {onToggleExpand && (
                        <div data-cell="expand" role="presentation">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand();
                                }}
                                data-testid="expand-notes-button"
                                className={cn(
                                    effectiveExpanded || effectiveData.notes
                                        ? "text-primary hover:bg-primary/10"
                                        : "text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
                                )}
                                title={
                                    effectiveExpanded
                                        ? "Collapse notes"
                                        : effectiveData.notes
                                          ? "Edit notes"
                                          : "Add notes"
                                }
                            >
                                {effectiveExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : effectiveData.notes ? (
                                    <Pencil className="h-4 w-4" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Delete button */}
                    {onDelete && (
                        <div data-cell="delete" role="presentation">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleDelete}
                                data-testid="delete-button"
                                className={cn(
                                    showDeleteConfirm
                                        ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                                        : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100"
                                )}
                                title={
                                    showDeleteConfirm
                                        ? "Click again to confirm delete"
                                        : "Delete transaction"
                                }
                            >
                                {showDeleteConfirm ? (
                                    <span className="px-1 text-xs font-medium">Confirm?</span>
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    )}
                </div>

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

            {/* Expanded notes row */}
            {effectiveExpanded && (
                <div
                    className="bg-muted/30 grid items-center gap-4 border-b px-4 py-2"
                    style={{ gridTemplateColumns }}
                    data-testid="notes-row"
                    role="row"
                >
                    <div />
                    <div style={{ gridColumn: "2 / -1" }} data-cell="notes" role="gridcell">
                        <Textarea
                            ref={notesRef}
                            value={effectiveData.notes || ""}
                            onChange={(e) => onFieldUpdate?.("notes", e.target.value)}
                            onBlur={(e) => onFieldUpdate?.("notes", e.target.value)}
                            rows={1}
                            className="text-muted-foreground hover:bg-accent/30 focus:border-input focus:bg-background min-h-0 resize-none border-transparent bg-transparent py-1 text-sm shadow-none"
                            placeholder="Add notes or a memo..."
                            data-testid="notes-editable"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
