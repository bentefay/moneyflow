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

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    getCurrency,
    getMinorUnitMultiplier,
    toMinorUnitsForCurrency
} from "@/lib/domain/currency";
import { cn } from "@/lib/utils";

export interface InlineEditableAmountProps {
    /** Current value in minor units (e.g., cents) - integer */
    value: number;
    /** Immutable value before the first imported-row edit */
    originalValue?: number;
    /** Currency code for conversion (default: USD) */
    currency?: string;
    /** Callback when value is saved (returns minor units as integer) */
    onSave: (newValue: number) => void;
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

/**
 * Parse a currency string to number (major units).
 */
function parseCurrency(str: string): number {
    // Remove currency symbols, commas, and whitespace
    const cleaned = str.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

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
    className,
    inputClassName,
    disabled = false,
    "data-testid": testId
}: InlineEditableAmountProps) {
    // Convert minor units to display string
    const displayValue = useMemo(() => formatForDisplay(value, currency), [value, currency]);

    const [localValue, setLocalValue] = useState(displayValue);
    const [isFocused, setIsFocused] = useState(false);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const [tooltipTranslation, setTooltipTranslation] = useState<TooltipTranslation>(
        INITIAL_TOOLTIP_TRANSLATION
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const tooltipContentRef = useRef<HTMLDivElement>(null);
    const isRevertingRef = useRef(false);

    // Sync local value when prop changes (only if not focused)
    if (displayValue !== localValue && !isFocused) {
        setLocalValue(displayValue);
    }

    const handleSave = useCallback(() => {
        const parsedMajorUnits = parseCurrency(localValue);
        const newMinorUnits = toMinorUnitsForCurrency(parsedMajorUnits, currency);
        if (newMinorUnits !== value) {
            onSave(newMinorUnits);
        }
    }, [localValue, value, currency, onSave]);

    const handleRevert = useCallback(() => {
        setLocalValue(displayValue);
    }, [displayValue]);

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
    }, []);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // Don't save on blur if we're reverting (Escape was pressed)
        if (isRevertingRef.current) {
            isRevertingRef.current = false;
            return;
        }
        handleSave();
    }, [handleSave]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row selection
    }, []);

    const handleTooltipOpenChange = useCallback((open: boolean) => {
        if (open) setTooltipTranslation(INITIAL_TOOLTIP_TRANSLATION);
        setIsTooltipOpen(open);
    }, []);

    const keepTooltipInsideViewport = useCallback(() => {
        const content = tooltipContentRef.current;
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
        setTooltipTranslation((current) => ({
            x: current.x + horizontalDelta / horizontalScale,
            y: current.y + verticalDelta / verticalScale
        }));
    }, []);

    useLayoutEffect(() => {
        if (!isTooltipOpen) return;

        const frame = { id: 0 };
        const monitorTooltipPosition = () => {
            keepTooltipInsideViewport();
            frame.id = requestAnimationFrame(monitorTooltipPosition);
        };
        frame.id = requestAnimationFrame(monitorTooltipPosition);
        const content = tooltipContentRef.current;
        const resizeObserver =
            content == null ? undefined : new ResizeObserver(keepTooltipInsideViewport);
        if (content) resizeObserver?.observe(content);
        document.addEventListener("scroll", keepTooltipInsideViewport, true);
        window.addEventListener("resize", keepTooltipInsideViewport);
        window.visualViewport?.addEventListener("resize", keepTooltipInsideViewport);
        window.visualViewport?.addEventListener("scroll", keepTooltipInsideViewport);

        return () => {
            cancelAnimationFrame(frame.id);
            resizeObserver?.disconnect();
            document.removeEventListener("scroll", keepTooltipInsideViewport, true);
            window.removeEventListener("resize", keepTooltipInsideViewport);
            window.visualViewport?.removeEventListener("resize", keepTooltipInsideViewport);
            window.visualViewport?.removeEventListener("scroll", keepTooltipInsideViewport);
        };
    }, [isTooltipOpen, keepTooltipInsideViewport]);

    // Determine color based on current input value
    const parsed = parseCurrency(localValue);
    const colorClass =
        parsed < 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400";

    const originalAmountDescription =
        originalValue == null
            ? undefined
            : `Original imported amount: ${formatOriginalAmount(originalValue, currency)}`;
    const input = (
        <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
            disabled={disabled}
            data-testid={testId}
            aria-label={`Transaction amount in ${currency}`}
            aria-description={originalAmountDescription}
            className={cn(
                "h-7 border-transparent bg-transparent text-right text-sm font-medium tabular-nums shadow-none",
                colorClass,
                "hover:bg-accent/30",
                "focus:border-input focus:bg-background",
                disabled && "cursor-not-allowed opacity-50",
                inputClassName,
                className
            )}
            placeholder="0.00"
        />
    );
    if (!originalAmountDescription) return input;

    return (
        <Tooltip open={isTooltipOpen} onOpenChange={handleTooltipOpenChange}>
            <TooltipTrigger asChild>{input}</TooltipTrigger>
            <TooltipContent
                ref={tooltipContentRef}
                align="start"
                alignOffset={-70}
                collisionPadding={TOOLTIP_VIEWPORT_PADDING}
                className="max-w-[calc(50vw-1rem)] whitespace-normal sm:max-w-xs"
                data-testid="original-amount-tooltip"
                style={{
                    translate: `${tooltipTranslation.x}px ${tooltipTranslation.y}px`
                }}
            >
                {originalAmountDescription}
            </TooltipContent>
        </Tooltip>
    );
}
