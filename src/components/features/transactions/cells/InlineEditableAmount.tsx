"use client";

/**
 * Inline Editable Amount
 *
 * Spreadsheet-style always-editable amount cell.
 * Shows red for expenses (negative) and green for income (positive).
 *
 * Amounts are stored as integers in minor units (e.g., cents for USD, yen for JPY)
 * but displayed and edited in major units (e.g., dollars). Conversion happens internally
 * using the currency's decimal_digits to determine the multiplier.
 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    getCurrency,
    getMinorUnitMultiplier,
    toMinorUnitsForCurrency
} from "@/lib/domain/currency";
import { cn } from "@/lib/utils";

import { parseCurrency, validateCurrencyDraft } from "./amount-draft";
import { RESTING_CELL_CHROME, TRANSACTION_GRID_EDITOR_INLINE_CHROME } from "./cell-chrome";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
    type TransactionGridEditorCommitResult,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle
} from "./editor-lifecycle";

export interface InlineEditableAmountDisplayProps {
    readonly className?: string;
    readonly currency?: string;
    readonly originalValue?: number;
    readonly value: number;
    readonly "data-testid"?: string;
}

export interface InlineEditableAmountProps {
    /** Current value in minor units (e.g., cents) - integer */
    value: number;
    /** Immutable value before the first imported-row edit */
    originalValue?: number;
    /** Currency code for conversion (default: USD) */
    currency?: string;
    /** Callback when value is saved (returns minor units as integer) */
    onSave: (newValue: number) => void;
    /** Reports actual input focus to the authoritative grid controller. */
    onEditingChange?: (editing: boolean) => void;
    /** Additional class names for the container */
    className?: string;
    /** Additional class names for the input */
    inputClassName?: string;
    /** Whether editing is disabled */
    disabled?: boolean;
    /** Test ID for testing */
    "data-testid"?: string;
}

interface TooltipTranslation {
    readonly x: number;
    readonly y: number;
}

const INITIAL_TOOLTIP_TRANSLATION: TooltipTranslation = { x: 0, y: 0 };
const TOOLTIP_VIEWPORT_PADDING = 8;

export { parseCurrency } from "./amount-draft";

/**
 * Format minor units as a display string.
 */
function formatForDisplay(minorUnits: number, currencyCode: string): string {
    const multiplier = getMinorUnitMultiplier(currencyCode);
    const majorUnits = minorUnits / multiplier;
    // Get decimal places from multiplier (100 = 2, 1000 = 3, 1 = 0)
    const decimalPlaces = Math.log10(multiplier);
    return majorUnits.toFixed(decimalPlaces);
}

/** Format imported provenance with the account currency's exact minor-unit precision. */
export function formatOriginalAmount(minorUnits: number, currencyCode: string): string {
    const currency = getCurrency(currencyCode) ?? getCurrency("USD");
    if (!currency) return `${currencyCode} ${minorUnits}`;
    const majorUnits = minorUnits / 10 ** currency.decimal_digits;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.code,
        currencyDisplay: "code",
        minimumFractionDigits: currency.decimal_digits,
        maximumFractionDigits: currency.decimal_digits
    }).format(majorUnits);
}

export function originalAmountDescription(
    originalValue: number | undefined,
    currencyCode: string
): string | undefined {
    return originalValue == null
        ? undefined
        : `Original imported amount: ${formatOriginalAmount(originalValue, currencyCode)}`;
}

export function amountColorClass(value: number | null): string {
    return value == null || value < 0
        ? "text-red-600 dark:text-red-400"
        : "text-green-700 dark:text-green-400";
}

function ImportedAmountTooltip({
    children,
    description
}: {
    readonly children: ReactElement;
    readonly description: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [translation, setTranslation] = useState<TooltipTranslation>(INITIAL_TOOLTIP_TRANSLATION);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleOpenChange = useCallback((open: boolean) => {
        if (open) setTranslation(INITIAL_TOOLTIP_TRANSLATION);
        setIsOpen(open);
    }, []);

    const keepInsideViewport = useCallback(() => {
        const content = contentRef.current;
        if (!content) return;

        const contentBox = content.getBoundingClientRect();
        const arrowBox = content.querySelector("svg")?.getBoundingClientRect();
        const left = Math.min(contentBox.left, arrowBox?.left ?? contentBox.left);
        const top = Math.min(contentBox.top, arrowBox?.top ?? contentBox.top);
        const right = Math.max(contentBox.right, arrowBox?.right ?? contentBox.right);
        const bottom = Math.max(contentBox.bottom, arrowBox?.bottom ?? contentBox.bottom);
        const viewport = window.visualViewport;
        const viewportLeft = (viewport?.offsetLeft ?? 0) + TOOLTIP_VIEWPORT_PADDING;
        const viewportTop = (viewport?.offsetTop ?? 0) + TOOLTIP_VIEWPORT_PADDING;
        const viewportRight =
            (viewport == null ? window.innerWidth : viewport.offsetLeft + viewport.width) -
            TOOLTIP_VIEWPORT_PADDING;
        const viewportBottom =
            (viewport == null ? window.innerHeight : viewport.offsetTop + viewport.height) -
            TOOLTIP_VIEWPORT_PADDING;
        const horizontalDelta =
            left < viewportLeft
                ? viewportLeft - left
                : right > viewportRight
                  ? viewportRight - right
                  : 0;
        const verticalDelta =
            top < viewportTop
                ? viewportTop - top
                : bottom > viewportBottom
                  ? viewportBottom - bottom
                  : 0;
        if (Math.abs(horizontalDelta) < 0.5 && Math.abs(verticalDelta) < 0.5) return;

        const horizontalScale =
            content.offsetWidth > 0 ? contentBox.width / content.offsetWidth : 1;
        const verticalScale =
            content.offsetHeight > 0 ? contentBox.height / content.offsetHeight : horizontalScale;
        setTranslation((current) => ({
            x: current.x + horizontalDelta / horizontalScale,
            y: current.y + verticalDelta / verticalScale
        }));
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;

        const frame = { id: 0 };
        const monitorPosition = () => {
            keepInsideViewport();
            frame.id = requestAnimationFrame(monitorPosition);
        };
        frame.id = requestAnimationFrame(monitorPosition);
        const content = contentRef.current;
        const resizeObserver = content == null ? undefined : new ResizeObserver(keepInsideViewport);
        if (content) resizeObserver?.observe(content);
        document.addEventListener("scroll", keepInsideViewport, true);
        window.addEventListener("resize", keepInsideViewport);
        window.visualViewport?.addEventListener("resize", keepInsideViewport);
        window.visualViewport?.addEventListener("scroll", keepInsideViewport);

        return () => {
            cancelAnimationFrame(frame.id);
            resizeObserver?.disconnect();
            document.removeEventListener("scroll", keepInsideViewport, true);
            window.removeEventListener("resize", keepInsideViewport);
            window.visualViewport?.removeEventListener("resize", keepInsideViewport);
            window.visualViewport?.removeEventListener("scroll", keepInsideViewport);
        };
    }, [isOpen, keepInsideViewport]);

    return (
        <Tooltip open={isOpen} onOpenChange={handleOpenChange}>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                ref={contentRef}
                align="start"
                alignOffset={-70}
                collisionPadding={TOOLTIP_VIEWPORT_PADDING}
                className="max-w-[calc(50vw-1rem)] whitespace-normal sm:max-w-xs"
                data-testid="original-amount-tooltip"
                style={{ translate: `${translation.x}px ${translation.y}px` }}
            >
                {description}
            </TooltipContent>
        </Tooltip>
    );
}

/** Resting amount presentation with sign colour and imported provenance. */
export function InlineEditableAmountDisplay({
    className,
    currency = "USD",
    originalValue,
    value,
    "data-testid": testId
}: InlineEditableAmountDisplayProps) {
    const description = originalAmountDescription(originalValue, currency);
    const content = (
        <span
            aria-description={description}
            className={cn(
                "w-full min-w-0 truncate text-right text-sm font-medium tabular-nums",
                amountColorClass(value),
                className
            )}
            data-testid={testId}
        >
            {formatForDisplay(value, currency)}
        </span>
    );
    return description == null ? (
        content
    ) : (
        <ImportedAmountTooltip description={description}>{content}</ImportedAmountTooltip>
    );
}

/**
 * Spreadsheet-style always-editable amount cell.
 *
 * - Click to focus and edit
 * - Enter to save
 * - Escape to revert
 * - Tab to save and move to next cell
 * - Blur to save
 */
export function InlineEditableAmount({
    value,
    originalValue,
    currency = "USD",
    onSave,
    onEditingChange,
    className,
    inputClassName,
    disabled = false,
    "data-testid": testId
}: InlineEditableAmountProps) {
    // Convert minor units to display string
    const displayValue = useMemo(() => formatForDisplay(value, currency), [value, currency]);

    const [localValue, setLocalValue] = useState(displayValue);
    const [isFocused, setIsFocused] = useState(false);
    const [inputError, setInputError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isRevertingRef = useRef(false);
    const externalExitValidationResult = useRef<TransactionGridEditorCommitResult | null>(null);

    // Sync local value when prop changes (only if not focused)
    if (displayValue !== localValue && !isFocused) {
        setLocalValue(displayValue);
    }

    const handleSave = useCallback(() => {
        const parsedMajorUnits = validateCurrencyDraft(localValue);
        if (!parsedMajorUnits.ok) {
            setInputError(true);
            return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
        }
        const newMinorUnits = toMinorUnitsForCurrency(parsedMajorUnits.value, currency);
        if (newMinorUnits === value) {
            setInputError(false);
            return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
        }
        onSave(newMinorUnits);
        setInputError(false);
        return TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS;
    }, [currency, localValue, onSave, value]);

    const handleRevert = useCallback(() => {
        setLocalValue(displayValue);
        setInputError(false);
    }, [displayValue]);
    const editorLifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            beginExternalExitValidation: () => {
                externalExitValidationResult.current = null;
            },
            cancel: handleRevert,
            commit: handleSave,
            externalExitValidation: "blur",
            readExternalExitValidation: () => externalExitValidationResult.current
        }),
        [handleRevert, handleSave]
    );
    useTransactionGridEditorLifecycle(editorLifecycle);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
            } else if (e.key === "Escape") {
                e.preventDefault();
                isRevertingRef.current = true;
                handleRevert();
                inputRef.current?.blur();
            }
        },
        [handleSave, handleRevert]
    );

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        onEditingChange?.(true);
    }, [onEditingChange]);

    const handleBlur = useCallback(() => {
        // Don't save on blur if we're reverting (Escape was pressed)
        if (isRevertingRef.current) {
            isRevertingRef.current = false;
            setIsFocused(false);
            onEditingChange?.(false);
            return;
        }
        const committed = handleSave();
        externalExitValidationResult.current = committed;
        if (!committed.ok) {
            queueMicrotask(() => inputRef.current?.focus({ preventScroll: true }));
            return;
        }
        setIsFocused(false);
        onEditingChange?.(false);
    }, [handleSave, onEditingChange]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row selection
    }, []);

    const parsed = parseCurrency(localValue);
    const colorClass = amountColorClass(parsed.ok ? parsed.value : null);
    const originalDescription = originalAmountDescription(originalValue, currency);
    const input = (
        <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={(e) => {
                setLocalValue(e.target.value);
                if (inputError) setInputError(false);
            }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
            disabled={disabled}
            data-testid={testId}
            aria-label={`Transaction amount in ${currency}`}
            aria-description={originalDescription}
            aria-invalid={inputError ? "true" : undefined}
            className={cn(
                "h-7 text-right text-sm font-medium tabular-nums",
                RESTING_CELL_CHROME,
                TRANSACTION_GRID_EDITOR_INLINE_CHROME,
                colorClass,
                disabled && "cursor-not-allowed opacity-50",
                inputClassName,
                className
            )}
            placeholder="0.00"
        />
    );
    return originalDescription == null ? (
        input
    ) : (
        <ImportedAmountTooltip description={originalDescription}>{input}</ImportedAmountTooltip>
    );
}
