"use client";

/**
 * Inline Editable Description Alias
 *
 * Hybrid text input / autocomplete cell for description aliases.
 * At rest: looks like InlineEditableText.
 * On focus: shows Command dropdown with matching aliases.
 * Tooltip shows original imported description when alias is set.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface DescriptionAliasOption {
    id: string;
    name: string;
}

export interface InlineEditableDescriptionAliasProps {
    /** Display value: alias name or original description */
    value: string;
    /** Current description alias ID (if set) */
    descriptionAliasId?: string;
    /** Original imported description text (for tooltip) */
    originalDescription?: string;
    /** Available aliases for autocomplete */
    availableAliases: DescriptionAliasOption[];
    /** Callback when user commits text (Enter/blur) */
    onCommitText: (text: string) => void;
    /** Callback when user selects an existing alias from dropdown */
    onSelectAlias: (aliasId: string) => void;
    /** Additional class names */
    className?: string;
    /** Input class names */
    inputClassName?: string;
    /** Placeholder when empty */
    placeholder?: string;
    /** Whether editing is disabled */
    disabled?: boolean;
    /** Test ID */
    "data-testid"?: string;
}

/**
 * Hybrid text input / autocomplete for description aliases.
 *
 * - Always shows text input (transparent, blends with cell)
 * - On focus: shows dropdown with matching aliases
 * - Enter/blur: commits text (triggers alias creation/rename/modal flow in parent)
 * - Select from dropdown: applies existing alias
 * - Tooltip shows original description when alias is set
 */
export function InlineEditableDescriptionAlias({
    value,
    descriptionAliasId,
    originalDescription,
    availableAliases,
    onCommitText,
    onSelectAlias,
    className,
    inputClassName,
    placeholder = "",
    disabled = false,
    "data-testid": testId
}: InlineEditableDescriptionAliasProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isRevertingRef = useRef(false);
    const isSelectingRef = useRef(false);

    // Sync local value when prop changes (only if not focused)
    if (value !== localValue && !isFocused) {
        setLocalValue(value);
    }

    // Calculate dropdown position when focused
    useEffect(() => {
        if (isFocused && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 200)
            });
        }
    }, [isFocused]);

    // Handle click outside to close dropdown
    useEffect(() => {
        if (!isFocused) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
                return;
            }
            // Don't close - blur handler will take care of it
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isFocused]);

    const handleCommit = useCallback(() => {
        if (isSelectingRef.current) {
            isSelectingRef.current = false;
            return;
        }
        if (localValue !== value) {
            onCommitText(localValue);
        }
    }, [localValue, value, onCommitText]);

    const handleRevert = useCallback(() => {
        setLocalValue(value);
    }, [value]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleCommit();
                inputRef.current?.blur();
            } else if (e.key === "Escape") {
                e.preventDefault();
                isRevertingRef.current = true;
                handleRevert();
                inputRef.current?.blur();
            }
        },
        [handleCommit, handleRevert]
    );

    const handleFocus = useCallback(() => {
        setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        if (isRevertingRef.current) {
            isRevertingRef.current = false;
            return;
        }
        if (isSelectingRef.current) {
            isSelectingRef.current = false;
            return;
        }
        handleCommit();
    }, [handleCommit]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const handleSelectAlias = useCallback(
        (aliasId: string) => {
            isSelectingRef.current = true;
            onSelectAlias(aliasId);
            setIsFocused(false);
            inputRef.current?.blur();
        },
        [onSelectAlias]
    );

    // Filter aliases based on typed text
    const filteredAliases = localValue.trim()
        ? availableAliases.filter((a) => a.name.toLowerCase().includes(localValue.toLowerCase()))
        : [];

    const showDropdown = isFocused && filteredAliases.length > 0;

    // Show tooltip for original description when alias is set and not focused
    const showTooltip = !isFocused && !!descriptionAliasId && !!originalDescription;

    const inputElement = (
        <Input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
            disabled={disabled}
            data-testid={testId}
            className={cn(
                "h-7 border-transparent bg-transparent text-sm shadow-none",
                "hover:bg-accent/30",
                "focus:border-input focus:bg-background",
                disabled && "cursor-not-allowed opacity-50",
                inputClassName,
                className
            )}
            placeholder={placeholder}
        />
    );

    return (
        <div ref={containerRef}>
            {showTooltip ? (
                <Tooltip>
                    <TooltipTrigger asChild>{inputElement}</TooltipTrigger>
                    <TooltipContent>{originalDescription}</TooltipContent>
                </Tooltip>
            ) : (
                inputElement
            )}

            {/* Dropdown - rendered in portal with fixed positioning */}
            {showDropdown &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="bg-popover fixed z-[9999] rounded-md border shadow-lg"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width
                        }}
                    >
                        <Command shouldFilter={false}>
                            <CommandList>
                                <CommandGroup>
                                    {filteredAliases.map((alias) => (
                                        <CommandItem
                                            key={alias.id}
                                            value={alias.name}
                                            onSelect={() => handleSelectAlias(alias.id)}
                                        >
                                            {alias.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </div>,
                    document.body
                )}
        </div>
    );
}
