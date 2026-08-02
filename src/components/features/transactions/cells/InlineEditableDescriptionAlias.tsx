"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { RESTING_CELL_CHROME } from "./cell-chrome";

export interface DescriptionAliasOption {
    id: string;
    name: string;
}

export interface DescriptionAliasEditOrigin {
    readonly element: HTMLInputElement;
    readonly container: HTMLDivElement;
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
    /** Commit edited text on Enter or blur. */
    onCommitText: (text: string, origin: DescriptionAliasEditOrigin) => void;
    /** Select an existing final real alias. */
    onSelectAlias: (aliasId: string, origin: DescriptionAliasEditOrigin) => void;
    /** Notify the container when the field gains (`true`) or loses (`false`) edit focus. */
    onEditingChange?: (editing: boolean) => void;
    /** One-shot request from the container to take keyboard focus as soon as this input mounts. */
    focusRequested?: boolean;
    /** Reports that a {@link focusRequested} request landed, so the container can clear it. */
    onFocusRequestApplied?: () => void;
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
    return {
        element,
        container,
        selectionStart: element.selectionStart ?? element.value.length,
        selectionEnd: element.selectionEnd ?? element.value.length
    };
}

function ImportedDescriptionTooltip({
    children,
    originalDescription
}: {
    readonly children: ReactElement;
    readonly originalDescription: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger
                asChild
                onBlur={() => setOpen(false)}
                onPointerLeave={() => setOpen(false)}
            >
                {children}
            </TooltipTrigger>
            <TooltipContent>{originalDescription}</TooltipContent>
        </Tooltip>
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
    focusRequested = false,
    onFocusRequestApplied,
    className,
    inputClassName,
    placeholder = "",
    disabled = false,
    "data-testid": testId
}: InlineEditableDescriptionAliasProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [hasEdited, setHasEdited] = useState(false);
    const [isAutocompleteDismissed, setIsAutocompleteDismissed] = useState(false);
    const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const submittedRef = useRef(false);
    const listboxId = useId();

    const displayedValue = isFocused ? localValue : value;
    const filteredAliases = useMemo(() => {
        if (!isFocused || !hasEdited || isAutocompleteDismissed) return [];
        const query = displayedValue.trim().toLocaleLowerCase();
        return query
            ? availableAliases.filter((alias) => alias.name.toLocaleLowerCase().includes(query))
            : [];
    }, [availableAliases, displayedValue, hasEdited, isAutocompleteDismissed, isFocused]);
    const isAutocompleteOpen =
        isFocused && hasEdited && !isAutocompleteDismissed && filteredAliases.length > 0;

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

    // A container may ask this input to take focus the moment it mounts, which is how a newly
    // created row becomes typeable without being selected. The effect only runs once the input is
    // actually in the DOM, so a virtualized row that has not mounted yet simply does not focus, and
    // the request is reported as applied so the container can retire it rather than re-asserting it.
    useEffect(() => {
        const input = inputRef.current;
        if (!focusRequested || !input) return;
        input.focus();
        onFocusRequestApplied?.();
    }, [focusRequested, onFocusRequestApplied]);

    const commitOnce = useCallback(() => {
        const input = inputRef.current;
        const container = containerRef.current;
        if (!input || !container || submittedRef.current) return;
        submittedRef.current = true;
        if (localValue !== value) onCommitText(localValue, captureEditOrigin(input, container));
    }, [localValue, onCommitText, value]);

    const selectAlias = useCallback(
        (option: DescriptionAliasOption) => {
            const input = inputRef.current;
            const container = containerRef.current;
            if (!input || !container || submittedRef.current) return;
            submittedRef.current = true;
            setLocalValue(option.name);
            setHasEdited(false);
            setActiveOptionIndex(null);
            setIsAutocompleteDismissed(true);
            onSelectAlias(option.id, captureEditOrigin(input, container));
            input.blur();
        },
        [onSelectAlias]
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
                inputRef.current?.blur();
            }
        },
        [activeOptionIndex, commitOnce, filteredAliases, isAutocompleteOpen, selectAlias, value]
    );

    const inputElement = (
        <Input
            ref={inputRef}
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
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
                submittedRef.current = false;
                setLocalValue(value);
                setIsFocused(true);
                setHasEdited(false);
                setActiveOptionIndex(null);
                setIsAutocompleteDismissed(false);
                onEditingChange?.(true);
            }}
            onBlur={() => {
                setIsFocused(false);
                setHasEdited(false);
                setActiveOptionIndex(null);
                commitOnce();
                onEditingChange?.(false);
            }}
            onClick={(event) => event.stopPropagation()}
            disabled={disabled}
            data-testid={testId}
            className={cn(
                "h-7 text-sm",
                RESTING_CELL_CHROME,
                "hover:bg-accent/30",
                "focus:border-input focus:bg-background focus-visible:ring-2",
                disabled && "cursor-not-allowed opacity-50",
                inputClassName,
                className
            )}
            placeholder={placeholder}
        />
    );

    const showTooltip =
        !!descriptionAliasId && !!originalDescription && originalDescription !== value;

    return (
        <div ref={containerRef} className="min-w-0">
            {showTooltip ? (
                <ImportedDescriptionTooltip originalDescription={originalDescription}>
                    {inputElement}
                </ImportedDescriptionTooltip>
            ) : (
                inputElement
            )}

            {isAutocompleteOpen &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        id={listboxId}
                        role="listbox"
                        aria-label="Description aliases"
                        data-testid="description-alias-options"
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
