"use client";

/**
 * Inline Editable Status
 *
 * Spreadsheet-style always-editable status dropdown.
 * Uses shadcn Select for consistent styling.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";

import type { TransactionId } from "@/components/features/transactions/table-model";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { RESTING_CELL_CHROME, TRANSACTION_GRID_EDITOR_INLINE_CHROME } from "./cell-chrome";
import {
    finishTransactionGridPopupEditing,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle,
    useTransactionGridEditorPopupCancellation,
    useTransactionGridEditorPortalRef,
    useTransactionGridStartOpen
} from "./editor-lifecycle";

export interface StatusOption {
    id: string;
    name: string;
    behavior?: "treatAsPaid" | null;
}

export interface InlineEditableStatusProps {
    /** Current status ID */
    value: string | undefined;
    /** Current status name for display (unused in spreadsheet mode) */
    statusName?: string;
    /** All available statuses for selection */
    availableStatuses: readonly StatusOption[];
    /** Callback when value is saved */
    onSave: (newStatusId: string) => void;
    /** Whether the picker opens immediately when its editor branch mounts. */
    startOpen?: boolean;
    /** Reports whether the status picker is actively open. */
    onEditingChange?: (editing: boolean) => void;
    /** Reports the controller-owned listbox independently from edit focus. */
    onPopupOpenChange?: (popup: "listbox", open: boolean) => void;
    /** Stable transaction row owning the portaled picker. */
    ownerRowId?: TransactionId;
    /** Additional class names for the container */
    className?: string;
    /** Whether editing is disabled */
    disabled?: boolean;
    /** Test ID for testing */
    "data-testid"?: string;
}

/**
 * Spreadsheet-style always-editable status dropdown.
 *
 * - Click to open dropdown
 * - Change selection to save immediately
 * - Tab to move to next cell
 */
export function InlineEditableStatus({
    value,
    availableStatuses,
    onSave,
    startOpen = false,
    onEditingChange,
    onPopupOpenChange,
    ownerRowId,
    className,
    disabled = false,
    "data-testid": testId
}: InlineEditableStatusProps) {
    const [open, setOpen] = useTransactionGridStartOpen(startOpen);
    const registerEditorPortal = useTransactionGridEditorPortalRef<HTMLDivElement>();
    const cancelGridPopupEditing = useTransactionGridEditorPopupCancellation();
    const selectionFinished = useRef(false);
    const typeaheadActive = useRef(false);
    const typeaheadResetTimer = useRef<number | null>(null);
    const clearTypeahead = useCallback(() => {
        if (typeaheadResetTimer.current != null) {
            window.clearTimeout(typeaheadResetTimer.current);
            typeaheadResetTimer.current = null;
        }
        typeaheadActive.current = false;
    }, []);
    const recordTypeaheadKey = useCallback(() => {
        if (typeaheadResetTimer.current != null) {
            window.clearTimeout(typeaheadResetTimer.current);
        }
        typeaheadActive.current = true;
        typeaheadResetTimer.current = window.setTimeout(clearTypeahead, 1000);
    }, [clearTypeahead]);
    const cancelPicker = useCallback(() => setOpen(false), [setOpen]);
    const editorLifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            cancel: cancelPicker,
            commit: () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
            externalExitValidation: "controller"
        }),
        [cancelPicker]
    );
    useTransactionGridEditorLifecycle(editorLifecycle);

    useEffect(() => {
        if (!open) return;
        selectionFinished.current = false;
        clearTypeahead();
        onEditingChange?.(true);
        onPopupOpenChange?.("listbox", true);
        return () => {
            clearTypeahead();
            onPopupOpenChange?.("listbox", false);
        };
    }, [clearTypeahead, onEditingChange, onPopupOpenChange, open]);

    const finishSelection = useCallback(() => {
        if (selectionFinished.current) return;
        selectionFinished.current = true;
        setOpen(false);
        finishTransactionGridPopupEditing("listbox", onPopupOpenChange, onEditingChange);
    }, [onEditingChange, onPopupOpenChange, setOpen]);

    const handleValueChange = useCallback(
        (newValue: string) => {
            if (!newValue) return;
            if (newValue !== value) onSave(newValue);
            finishSelection();
        },
        [finishSelection, onSave, value]
    );

    const handleSelectedItemKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            const wasTypingAhead = typeaheadActive.current;
            const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
            if (!isModifierKey && event.key.length === 1) recordTypeaheadKey();
            if (
                event.currentTarget.dataset.state === "checked" &&
                (event.key === "Enter" || (event.key === " " && !wasTypingAhead))
            ) {
                finishSelection();
            }
        },
        [finishSelection, recordTypeaheadKey]
    );

    const handleSelectedItemClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (event.currentTarget.dataset.state === "checked") finishSelection();
        },
        [finishSelection]
    );

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row selection
    }, []);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            setOpen(nextOpen);
        },
        [setOpen]
    );

    // Prevent arrow keys from opening the dropdown when closed,
    // but let the event bubble for grid navigation
    const handleTriggerKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!open && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                // Prevent Radix from opening the dropdown
                e.preventDefault();
                // Don't stopPropagation - let it bubble for grid navigation
            }
        },
        [open]
    );

    return (
        <div onClick={handleClick} className={cn("w-full", className)}>
            <Select
                value={value ?? ""}
                onValueChange={handleValueChange}
                disabled={disabled}
                open={open}
                onOpenChange={handleOpenChange}
            >
                <SelectTrigger
                    data-legacy-edit-activation
                    data-testid={testId}
                    size="sm"
                    onKeyDown={handleTriggerKeyDown}
                    className={cn(
                        "h-7 w-full",
                        RESTING_CELL_CHROME,
                        TRANSACTION_GRID_EDITOR_INLINE_CHROME,
                        disabled && "cursor-not-allowed opacity-50"
                    )}
                >
                    <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent
                    ref={registerEditorPortal}
                    align="start"
                    onEscapeKeyDown={(event) => {
                        if (cancelGridPopupEditing?.()) event.preventDefault();
                        event.stopPropagation();
                    }}
                    data-owned-by-row={ownerRowId}
                    data-owned-by-field="status"
                >
                    {availableStatuses.map((s) => (
                        <SelectItem
                            key={s.id}
                            value={s.id}
                            onClick={handleSelectedItemClick}
                            onKeyDown={handleSelectedItemKeyDown}
                        >
                            {s.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
