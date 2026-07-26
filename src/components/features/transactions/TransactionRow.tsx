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
import { deriveEffectiveAllocations } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { hashToColor } from "@/lib/utils/color";

import { type AllocationColumn, materializeAllocationRecord } from "./allocation-columns";
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

export interface TransactionRowPresence {
    /** User ID who is focused on this row */
    focusedBy?: string;
    /** User ID who is editing this row */
    editingBy?: string;
    /** Field being edited */
    editingField?: string;
}

export interface TransactionRowProps {
    /** Persisted transaction data */
    transaction: TransactionRowData;
    /** Presence info for this row */
    presence?: TransactionRowPresence;
    /** Current user's pubkey hash */
    currentUserId?: string;
    /** Whether this row is selected */
    isSelected?: boolean;
    /** Whether the notes row is expanded */
    isExpanded?: boolean;
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
 * Transaction row component with presence highlighting.
 */
export function TransactionRow({
    transaction,
    presence,
    currentUserId,
    isSelected = false,
    isExpanded = false,
    availableAccounts = [],
    availableStatuses = [],
    availableTags = [],
    onCreateTag,
    availableAliases = [],
    onDescriptionCommitText,
    onDescriptionSelectAlias,
    onClick,
    onFocus,
    onResolveDuplicate,
    onDelete,
    onFieldUpdate,
    renderDescriptionRobot,
    allocationColumns = [],
    gridTemplateColumns = TRANSACTION_GRID_TEMPLATE,
    onAllocationUpdate,
    onCheckboxChange,
    onCheckboxShiftClick,
    onToggleExpand,
    className
}: TransactionRowProps) {
    const notesRef = useRef<HTMLTextAreaElement>(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);

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

    const focusedByOther = presence?.focusedBy && presence.focusedBy !== currentUserId;
    const editingByOther = presence?.editingBy && presence.editingBy !== currentUserId;
    const presenceUserId = presence?.editingBy || presence?.focusedBy;
    const borderColor = presenceUserId ? hashToColor(presenceUserId) : undefined;

    const isDuplicate = !!effectiveData.possibleDuplicateOf;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showDeleteConfirm) {
            onDelete?.();
            setShowDeleteConfirm(false);
        } else {
            setShowDeleteConfirm(true);
            // Auto-hide after 3 seconds
            setTimeout(() => setShowDeleteConfirm(false), 3000);
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

    return (
        <div className="flex flex-col">
            {/* Main row */}
            <div
                onClick={() => onClick?.()}
                onFocus={onFocus}
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
                {/* Presence indicator - colored left border */}
                {(focusedByOther || editingByOther) && (
                    <div
                        className={cn(
                            "absolute top-0 bottom-0 left-0 w-1",
                            editingByOther && "animate-pulse"
                        )}
                        style={{ backgroundColor: borderColor }}
                        title={
                            editingByOther
                                ? `Being edited by ${presence?.editingBy}`
                                : `Viewed by ${presence?.focusedBy}`
                        }
                    />
                )}

                {/* Checkbox for selection */}
                <div
                    data-cell="checkbox"
                    data-testid="row-checkbox"
                    onClick={handleCheckboxClick}
                    className="flex h-full w-full cursor-pointer items-center justify-center"
                >
                    <CheckboxCell
                        checked={isSelected}
                        onChange={() => handleCheckboxChange()}
                        onShiftClick={handleShiftClick}
                        ariaLabel={`Select transaction ${effectiveData.description}`}
                    />
                </div>

                {/* Date */}
                <div data-cell="date">
                    <InlineEditableDate
                        value={effectiveData.date}
                        onSave={(value) => onFieldUpdate?.("date", value)}
                        data-testid="date-editable"
                    />
                </div>

                {/* Description */}
                <div data-cell="description" className="flex min-w-0 items-center gap-1">
                    <div className="min-w-0 flex-1">
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
                            className="truncate font-medium"
                            inputClassName="font-medium"
                            placeholder="No description"
                            data-testid="description-editable"
                        />
                    </div>
                    {renderDescriptionRobot?.({ isEditing: isEditingDescription })}
                </div>

                {/* Account */}
                <div data-cell="account" className="min-w-0">
                    <AccountCombobox
                        value={effectiveData.accountId ?? ""}
                        onChange={(accountId) => onFieldUpdate?.("accountId", accountId)}
                        accounts={availableAccounts}
                        placeholder="Add account..."
                        className="text-muted-foreground hover:bg-accent/30 focus:border-primary focus:bg-background focus:ring-primary h-7 border-transparent bg-transparent px-1 shadow-none focus:ring-1"
                    />
                </div>

                {/* Tags */}
                <div data-cell="tags">
                    <InlineEditableTags
                        value={effectiveData.tags?.map((t) => t.id) ?? []}
                        tags={effectiveData.tags ?? []}
                        availableTags={availableTags}
                        onSave={(tagIds) => onFieldUpdate?.("tags", tagIds)}
                        onCreateTag={onCreateTag}
                        data-testid="tags-editable"
                    />
                </div>

                {/* Status */}
                <div data-cell="status">
                    <InlineEditableStatus
                        value={effectiveData.statusId}
                        statusName={effectiveData.status}
                        availableStatuses={availableStatuses}
                        onSave={(statusId) => onFieldUpdate?.("statusId", statusId)}
                        data-testid="status-editable"
                    />
                </div>

                {allocationColumns.map((column) => {
                    const explicitValue = allocations[column.personId];
                    return (
                        <div key={column.personId} data-cell={column.field} className="min-w-0">
                            <PersonAllocationCell
                                personId={column.personId}
                                personLabel={column.label}
                                explicitValue={explicitValue}
                                allocations={allocations}
                                accountOwnerships={accountOwnerships}
                                effectiveDerivation={effectiveDerivation}
                                onCommit={onAllocationUpdate}
                            />
                        </div>
                    );
                })}

                {/* Amount */}
                <div data-cell="amount" className="text-right">
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
                        <div data-cell="expand">
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
                        <div data-cell="delete">
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

                {/* Presence avatar - shows when someone is focused/editing */}
                {presenceUserId && presenceUserId !== currentUserId && (
                    <div className="absolute top-1/2 -right-2 -translate-y-1/2">
                        <PresenceAvatar
                            userId={presenceUserId}
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
                    <div style={{ gridColumn: "2 / -1" }} data-cell="notes">
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
