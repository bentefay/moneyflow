"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import type { TransactionId } from "@/components/features/transactions/table-model/ids";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { RESTING_CELL_CHROME, TRANSACTION_GRID_EDITOR_INLINE_CHROME } from "./cell-chrome";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
    type TransactionGridEditorCommitResult,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle,
    useTransactionGridEditorPortalRef,
    useTransactionGridNativeBlurCommit
} from "./editor-lifecycle";

export interface DescriptionAliasOption {
    id: string;
    name: string;
}

export interface ImportedDescriptionProvenance {
    readonly ariaDescription: string;
    readonly tooltip: string;
}

export interface DescriptionAliasDisplayProps {
    readonly className?: string;
    readonly descriptionAliasId?: string;
    readonly originalDescription?: string;
    readonly value: string;
    readonly "data-testid"?: string;
}

export function importedDescriptionProvenance(
    value: string,
    descriptionAliasId?: string,
    originalDescription?: string
): ImportedDescriptionProvenance | null {
    if (
        descriptionAliasId == null ||
        originalDescription == null ||
        originalDescription === value
    ) {
        return null;
    }
    return {
        ariaDescription: `Original imported description: ${originalDescription}`,
        tooltip: originalDescription
    };
}

export interface DescriptionAliasEditOrigin {
    readonly element: HTMLInputElement;
    readonly container: HTMLDivElement;
    readonly gridcell: HTMLDivElement | null;
    readonly selectionStart: number;
    readonly selectionEnd: number;
}

export interface InlineEditableDescriptionAliasProps {
    /** Display value: alias name or original description. */
    value: string;
    /** Current description alias ID, when assigned. */
    descriptionAliasId?: string;
    /** Immutable imported description used only for provenance. */
    originalDescription?: string;
    /** Available final real aliases for autocomplete. */
    availableAliases: DescriptionAliasOption[];
    /** Commit edited text on Enter or blur and report the actual mutation outcome. */
    onCommitText: (
        text: string,
        origin: DescriptionAliasEditOrigin
    ) => TransactionGridEditorCommitResult;
    /** Select an existing final real alias and report the actual mutation outcome. */
    onSelectAlias: (
        aliasId: string,
        origin: DescriptionAliasEditOrigin
    ) => TransactionGridEditorCommitResult;
    /** Notify the container when the field gains (`true`) or loses (`false`) edit focus. */
    onEditingChange?: (editing: boolean) => void;
    /** Reports the controller-owned autocomplete independently from edit focus. */
    onPopupOpenChange?: (popup: "listbox", open: boolean) => void;
    /** Stable row owner stamped on the portaled autocomplete. */
    ownerRowId?: TransactionId;
    /** Registers the stable input element with the workspace focus coordinator. */
    onInputElementChange?: (element: HTMLInputElement | null) => void | (() => void);
    className?: string;
    inputClassName?: string;
    placeholder?: string;
    disabled?: boolean;
    "data-testid"?: string;
}

function captureEditOrigin(
    element: HTMLInputElement,
    container: HTMLDivElement
): DescriptionAliasEditOrigin {
    const closestGridcell = container.closest('[role="gridcell"]');
    const gridcell = closestGridcell instanceof HTMLDivElement ? closestGridcell : null;
    return {
        element,
        container,
        gridcell,
        selectionStart: element.selectionStart ?? element.value.length,
        selectionEnd: element.selectionEnd ?? element.value.length
    };
}

/** Restore the live editor when it survived the modal, otherwise return focus to its outer cell. */
export function restoreDescriptionAliasEditOrigin(origin: DescriptionAliasEditOrigin): void {
    const replacement = origin.gridcell?.querySelector<HTMLInputElement>(
        'input[aria-label="Transaction description"]'
    );
    const element = origin.element.isConnected ? origin.element : replacement;
    if (element?.isConnected) {
        const restoreSelection = (): void => {
            if (element.isConnected && element.ownerDocument.activeElement === element) {
                element.setSelectionRange(origin.selectionStart, origin.selectionEnd);
            }
        };
        element.focus({ preventScroll: true });
        restoreSelection();
        queueMicrotask(restoreSelection);
        return;
    }
    if (origin.gridcell?.isConnected) origin.gridcell.focus({ preventScroll: true });
}

function ImportedDescriptionTooltip({
    children,
    originalDescription
}: {
    readonly children: ReactElement;
    readonly originalDescription?: string;
}) {
    const [open, setOpen] = useState(false);
    const hasProvenance = originalDescription != null;
    return (
        <Tooltip
            open={hasProvenance && open}
            onOpenChange={(nextOpen) => {
                if (hasProvenance) setOpen(nextOpen);
            }}
        >
            <TooltipTrigger
                asChild
                onBlur={() => setOpen(false)}
                onPointerLeave={() => setOpen(false)}
            >
                {children}
            </TooltipTrigger>
            {hasProvenance ? <TooltipContent>{originalDescription}</TooltipContent> : null}
        </Tooltip>
    );
}

/** Resting alias presentation with the same imported provenance as the editor. */
export function DescriptionAliasDisplay({
    className,
    descriptionAliasId,
    originalDescription,
    value,
    "data-testid": testId
}: DescriptionAliasDisplayProps) {
    const provenance = importedDescriptionProvenance(
        value,
        descriptionAliasId,
        originalDescription
    );
    const content = (
        <span
            aria-description={provenance?.ariaDescription}
            className={cn("min-w-0 flex-1 truncate text-sm font-medium", className)}
            data-testid={testId}
        >
            {value}
        </span>
    );
    return provenance == null ? (
        content
    ) : (
        <ImportedDescriptionTooltip originalDescription={provenance.tooltip}>
            {content}
        </ImportedDescriptionTooltip>
    );
}

/** Always-visible description input with a lazily mounted, no-default-selection autocomplete. */
export function InlineEditableDescriptionAlias({
    value,
    descriptionAliasId,
    originalDescription,
    availableAliases,
    onCommitText,
    onSelectAlias,
    onEditingChange,
    onPopupOpenChange,
    ownerRowId,
    onInputElementChange,
    className,
    inputClassName,
    placeholder = "",
    disabled = false,
    "data-testid": testId
}: InlineEditableDescriptionAliasProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [hasEdited, setHasEdited] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isAutocompleteDismissed, setIsAutocompleteDismissed] = useState(false);
    const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const popupOwnershipOpen = useRef(false);
    const submittedRef = useRef(false);
    const submittedResultRef = useRef<TransactionGridEditorCommitResult>(
        TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED
    );
    const externalExitValidationResult = useRef<TransactionGridEditorCommitResult | null>(null);
    const submittedCanonicalRef = useRef<{
        readonly descriptionAliasId?: string;
        readonly value: string;
    } | null>(null);
    const listboxId = useId();
    const publishNativeBlurCommit = useTransactionGridNativeBlurCommit();
    const registerEditorPortal = useTransactionGridEditorPortalRef<HTMLDivElement>();
    const registerInput = useCallback(
        (element: HTMLInputElement | null) => {
            if (element == null) {
                inputRef.current = null;
                onInputElementChange?.(null);
                return;
            }
            inputRef.current = element;
            const unregister = onInputElementChange?.(element);
            return () => {
                if (inputRef.current === element) inputRef.current = null;
                unregister?.();
            };
        },
        [onInputElementChange]
    );

    const displayedValue = isFocused ? localValue : value;
    const filteredAliases = useMemo(() => {
        if (!isFocused || !hasEdited || isAutocompleteDismissed) return [];
        const query = displayedValue.trim().toLocaleLowerCase();
        return query
            ? availableAliases.filter((alias) => alias.name.toLocaleLowerCase().includes(query))
            : [];
    }, [availableAliases, displayedValue, hasEdited, isAutocompleteDismissed, isFocused]);
    const isAutocompleteOpen =
        !hasSubmitted &&
        isFocused &&
        hasEdited &&
        !isAutocompleteDismissed &&
        filteredAliases.length > 0;
    const closePopupOwnership = useCallback(() => {
        if (!popupOwnershipOpen.current) return;
        popupOwnershipOpen.current = false;
        onPopupOpenChange?.("listbox", false);
    }, [onPopupOpenChange]);

    useLayoutEffect(() => {
        if (!isAutocompleteOpen) return;
        popupOwnershipOpen.current = true;
        onPopupOpenChange?.("listbox", true);
        return closePopupOwnership;
    }, [closePopupOwnership, isAutocompleteOpen, onPopupOpenChange]);

    useEffect(() => {
        if (!isAutocompleteOpen) return;
        const updatePosition = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 200)
            });
        };
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isAutocompleteOpen]);

    const commitOnce = useCallback((): TransactionGridEditorCommitResult => {
        const input = inputRef.current;
        const container = containerRef.current;
        if (!input || !container) return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
        if (submittedRef.current) return submittedResultRef.current;
        submittedRef.current = true;
        submittedCanonicalRef.current = { descriptionAliasId, value };
        const result =
            localValue === value
                ? TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED
                : onCommitText(localValue, captureEditOrigin(input, container));
        submittedResultRef.current = result;
        if (!result.ok) {
            submittedRef.current = false;
            return result;
        }
        setHasSubmitted(true);
        return result;
    }, [descriptionAliasId, localValue, onCommitText, value]);

    const cancelEdit = useCallback(() => {
        submittedRef.current = true;
        setHasSubmitted(true);
        submittedResultRef.current = TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
        setLocalValue(value);
        setHasEdited(false);
        setActiveOptionIndex(null);
        setIsAutocompleteDismissed(true);
    }, [value]);
    const editorLifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            automation: {
                draftText: localValue,
                field: "descriptionAlias",
                originalText: value
            },
            beginExternalExitValidation: () => {
                externalExitValidationResult.current = null;
            },
            cancel: cancelEdit,
            commit: commitOnce,
            externalExitValidation: "blur",
            readExternalExitValidation: () => externalExitValidationResult.current
        }),
        [cancelEdit, commitOnce, localValue, value]
    );
    useTransactionGridEditorLifecycle(editorLifecycle);

    const selectAlias = useCallback(
        (option: DescriptionAliasOption) => {
            const input = inputRef.current;
            const container = containerRef.current;
            if (!input || !container || submittedRef.current) return;
            submittedRef.current = true;
            setHasSubmitted(true);
            submittedCanonicalRef.current = { descriptionAliasId, value };
            setLocalValue(option.name);
            setHasEdited(false);
            setActiveOptionIndex(null);
            setIsAutocompleteDismissed(true);
            submittedResultRef.current = onSelectAlias(
                option.id,
                captureEditOrigin(input, container)
            );
            queueMicrotask(() => {
                if (input.isConnected && input.ownerDocument.activeElement === input) input.blur();
            });
        },
        [descriptionAliasId, onSelectAlias, value]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (isAutocompleteOpen && event.key === "ArrowDown") {
                event.preventDefault();
                event.stopPropagation();
                setActiveOptionIndex((current) =>
                    current == null ? 0 : (current + 1) % filteredAliases.length
                );
                return;
            }
            if (isAutocompleteOpen && event.key === "ArrowUp") {
                event.preventDefault();
                event.stopPropagation();
                setActiveOptionIndex((current) =>
                    current == null
                        ? filteredAliases.length - 1
                        : (current - 1 + filteredAliases.length) % filteredAliases.length
                );
                return;
            }
            if (isAutocompleteOpen && event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setActiveOptionIndex(null);
                setIsAutocompleteDismissed(true);
                return;
            }
            if (isAutocompleteOpen && event.key === "Enter" && activeOptionIndex != null) {
                event.preventDefault();
                event.stopPropagation();
                const option = filteredAliases[activeOptionIndex];
                if (option) selectAlias(option);
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                commitOnce();
                inputRef.current?.blur();
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                setLocalValue(value);
                submittedRef.current = true;
                setHasSubmitted(true);
                submittedResultRef.current = TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
                inputRef.current?.blur();
            }
        },
        [activeOptionIndex, commitOnce, filteredAliases, isAutocompleteOpen, selectAlias, value]
    );

    const inputElement = (
        <Input
            ref={registerInput}
            type="text"
            aria-label="Transaction description"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={isAutocompleteOpen}
            aria-controls={isAutocompleteOpen ? listboxId : undefined}
            aria-activedescendant={
                activeOptionIndex == null ? undefined : `${listboxId}-option-${activeOptionIndex}`
            }
            value={displayedValue}
            onChange={(event) => {
                setLocalValue(event.target.value);
                setHasEdited(true);
                setActiveOptionIndex(null);
                setIsAutocompleteDismissed(false);
                submittedRef.current = false;
                setHasSubmitted(false);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
                const submittedCanonical = submittedCanonicalRef.current;
                const returningFromSubmission = submittedRef.current;
                const returningFromRejectedSubmission = !submittedResultRef.current.ok;
                submittedRef.current = false;
                setHasSubmitted(false);
                submittedResultRef.current = TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
                submittedCanonicalRef.current = null;
                const canonicalChangedSinceSubmission =
                    submittedCanonical != null &&
                    (submittedCanonical.value !== value ||
                        submittedCanonical.descriptionAliasId !== descriptionAliasId);
                if (
                    (!returningFromSubmission && !returningFromRejectedSubmission) ||
                    canonicalChangedSinceSubmission
                ) {
                    setLocalValue(value);
                }
                setIsFocused(true);
                setHasEdited(false);
                setActiveOptionIndex(null);
                setIsAutocompleteDismissed(false);
                onEditingChange?.(true);
            }}
            onBlur={(event) => {
                setIsFocused(false);
                setHasEdited(false);
                setActiveOptionIndex(null);
                const result = commitOnce();
                externalExitValidationResult.current = result;
                const controllerHandledBlur =
                    publishNativeBlurCommit?.(result, event.relatedTarget) ?? false;
                if (isAutocompleteOpen) closePopupOwnership();
                if (result.ok) {
                    onEditingChange?.(false);
                    return;
                }
                if (!controllerHandledBlur) {
                    queueMicrotask(() => inputRef.current?.focus({ preventScroll: true }));
                }
            }}
            onClick={(event) => event.stopPropagation()}
            disabled={disabled}
            data-testid={testId}
            className={cn(
                "h-7 text-sm",
                RESTING_CELL_CHROME,
                TRANSACTION_GRID_EDITOR_INLINE_CHROME,
                disabled && "cursor-not-allowed opacity-50",
                inputClassName,
                className
            )}
            placeholder={placeholder}
        />
    );

    const provenance = importedDescriptionProvenance(
        value,
        descriptionAliasId,
        originalDescription
    );

    return (
        <div ref={containerRef} className="min-w-0">
            <ImportedDescriptionTooltip originalDescription={provenance?.tooltip}>
                {inputElement}
            </ImportedDescriptionTooltip>

            {isAutocompleteOpen &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={registerEditorPortal}
                        id={listboxId}
                        role="listbox"
                        aria-label="Description aliases"
                        data-testid="description-alias-options"
                        data-owned-by-row={ownerRowId}
                        data-owned-by-field="description"
                        className="bg-popover text-popover-foreground fixed z-[9999] max-h-[300px] overflow-y-auto rounded-md border p-1 shadow-lg"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width
                        }}
                    >
                        {filteredAliases.map((alias, index) => (
                            <button
                                key={alias.id}
                                id={`${listboxId}-option-${index}`}
                                type="button"
                                role="option"
                                aria-selected={activeOptionIndex === index}
                                tabIndex={-1}
                                className={cn(
                                    "relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none",
                                    activeOptionIndex === index &&
                                        "bg-accent text-accent-foreground"
                                )}
                                onPointerDown={(event) => event.preventDefault()}
                                onClick={() => selectAlias(alias)}
                            >
                                {alias.name}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}
