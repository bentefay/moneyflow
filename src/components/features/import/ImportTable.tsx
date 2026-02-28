"use client";

/**
 * ImportTable
 *
 * Merged table showing raw file data and parsed preview side by side.
 * Updates in real-time as settings change.
 *
 * Layout:
 * - Row number | Raw columns (highlighted when mapped) | Divider | Preview columns (Status, Date, Description, Amount)
 * - Single scroll container for unified scrolling
 */

import { AlertCircle, CheckCircle2, Clock, Copy, Eye, EyeOff } from "lucide-react";
import { useMemo } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getMinorUnitMultiplier } from "@/lib/domain/currency";
import type { ImportSummaryStats, PreviewTransaction } from "@/lib/import/types";
import { cn } from "@/lib/utils";
import { formatTransactionDate } from "@/lib/utils/date-format";

// ============================================================================
// Types
// ============================================================================

export interface ImportTableProps {
    /** Raw CSV/OFX rows (including headers if present) */
    rawRows: string[][];
    /** Column headers for raw data */
    rawHeaders: string[];
    /** Parsed preview transactions */
    previewTransactions: PreviewTransaction[];
    /** Summary statistics */
    stats: ImportSummaryStats;
    /** Whether raw data has headers row */
    hasHeaders: boolean;
    /** Column mapping for highlighting mapped columns */
    columnMappings: Record<string, number>;
    /** Currency code for amount formatting */
    currency?: string;
    /** Whether to show filtered (old) transactions */
    showFiltered?: boolean;
    /** Callback to toggle filtered visibility */
    onToggleFiltered?: () => void;
    /** Maximum rows to display (for performance) */
    maxDisplayRows?: number;
    /** Additional CSS classes */
    className?: string;
}

/** Status badge variants */
type RowStatus = "valid" | "invalid" | "duplicate" | "filtered";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get row status based on preview transaction state.
 */
function getRowStatus(tx: PreviewTransaction): RowStatus {
    return tx.status;
}

/**
 * Get status icon and color for a row.
 */
function getStatusDisplay(status: RowStatus): {
    icon: typeof CheckCircle2;
    color: string;
    label: string;
} {
    switch (status) {
        case "valid":
            return {
                icon: CheckCircle2,
                color: "text-green-600 dark:text-green-400",
                label: "Valid",
            };
        case "invalid":
            return {
                icon: AlertCircle,
                color: "text-destructive",
                label: "Error",
            };
        case "duplicate":
            return {
                icon: Copy,
                color: "text-amber-600 dark:text-amber-400",
                label: "Duplicate",
            };
        case "filtered":
            return {
                icon: Clock,
                color: "text-muted-foreground",
                label: "Old",
            };
    }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ImportTable component - merged raw + preview table.
 */
export function ImportTable({
    rawRows,
    rawHeaders,
    previewTransactions,
    stats,
    hasHeaders,
    columnMappings,
    currency = "USD",
    showFiltered = true,
    onToggleFiltered,
    maxDisplayRows = 100,
    className,
}: ImportTableProps) {
    // Build set of mapped column indices for highlighting
    const mappedIndices = useMemo(() => new Set(Object.values(columnMappings)), [columnMappings]);

    // Get decimal places for the currency (for amount formatting)
    const multiplier = getMinorUnitMultiplier(currency);
    const decimalPlaces = Math.log10(multiplier);

    // Skip header row if present for raw data
    const dataRows = hasHeaders ? rawRows.slice(1) : rawRows;

    // Filter preview transactions based on showFiltered
    const displayData = useMemo(() => {
        const result: Array<{
            rowIndex: number;
            rawRow: string[];
            preview: PreviewTransaction | null;
        }> = [];

        for (let i = 0; i < Math.min(dataRows.length, maxDisplayRows); i++) {
            // Preview rowIndex is the original index in rawRows
            // If hasHeaders, preview rowIndex starts at 1 (after header row)
            // So we need to offset: dataRows[i] corresponds to rawRows[i + 1] when hasHeaders
            const originalRowIndex = hasHeaders ? i + 1 : i;
            const preview = previewTransactions.find((tx) => tx.rowIndex === originalRowIndex);
            // Skip filtered transactions if showFiltered is false
            if (!showFiltered && preview?.status === "filtered") {
                continue;
            }
            result.push({
                rowIndex: i,
                rawRow: dataRows[i],
                preview: preview ?? null,
            });
        }

        return result;
    }, [dataRows, previewTransactions, showFiltered, maxDisplayRows, hasHeaders]);

    const truncated = rawRows.length > maxDisplayRows;

    // Calculate number of columns for each section
    const rawColCount = rawHeaders.length;
    const previewColCount = 4; // Status, Date, Description, Amount

    return (
        <div className={cn("flex flex-col", className)}>
            {/* Filtered toggle */}
            {stats.filteredCount > 0 && onToggleFiltered && (
                <div className="text-muted-foreground mb-2 flex items-center justify-end gap-2 text-xs">
                    <button
                        type="button"
                        onClick={onToggleFiltered}
                        className="hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        {showFiltered ? (
                            <>
                                <Eye className="h-3.5 w-3.5" />
                                Showing {stats.filteredCount} old transactions
                            </>
                        ) : (
                            <>
                                <EyeOff className="h-3.5 w-3.5" />
                                Hiding {stats.filteredCount} old transactions
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Merged table container */}
            <div
                className={cn(
                    "bg-card overflow-auto rounded-lg border",
                    "max-h-[500px] min-h-[300px]"
                )}
            >
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                        {/* Section header row */}
                        <tr className="border-b">
                            <th className="bg-slate-100" />
                            <th
                                colSpan={rawColCount}
                                className="text-muted-foreground bg-slate-100 px-2 py-1 text-center text-xs font-semibold tracking-wider uppercase"
                            >
                                Raw
                            </th>
                            <th className="bg-border w-px" />
                            <th
                                colSpan={previewColCount}
                                className="text-muted-foreground bg-slate-50 px-2 py-1 text-center text-xs font-semibold tracking-wider uppercase"
                            >
                                Preview
                            </th>
                        </tr>
                        {/* Column headers row */}
                        <tr>
                            {/* Row number */}
                            <th className="text-muted-foreground w-10 border-r bg-slate-100 px-2 py-1.5 text-left text-xs font-medium">
                                #
                            </th>
                            {/* Raw data headers */}
                            {rawHeaders.map((header, idx) => (
                                <th
                                    key={`raw-${idx}`}
                                    className={cn(
                                        "px-2 py-1.5 text-left text-xs font-medium whitespace-nowrap",
                                        mappedIndices.has(idx)
                                            ? "text-foreground bg-primary/10"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {header}
                                </th>
                            ))}
                            {/* Divider column */}
                            <th className="bg-border w-px" />
                            {/* Preview headers */}
                            <th className="text-muted-foreground w-10 bg-slate-50 px-2 py-1.5 text-left text-xs font-medium">
                                Status
                            </th>
                            <th className="text-muted-foreground bg-slate-50 px-2 py-1.5 text-left text-xs font-medium">
                                Date
                            </th>
                            <th className="text-muted-foreground bg-slate-50 px-2 py-1.5 text-left text-xs font-medium">
                                Description
                            </th>
                            <th className="text-muted-foreground bg-slate-50 px-2 py-1.5 text-right text-xs font-medium">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-border/50 divide-y">
                        {displayData.map(({ rowIndex, rawRow, preview }) => {
                            const status = preview ? getRowStatus(preview) : null;
                            const statusDisplay = status ? getStatusDisplay(status) : null;
                            const isExcluded = status === "filtered" || status === "duplicate";

                            return (
                                <tr
                                    key={rowIndex}
                                    className={cn(
                                        "transition-colors",
                                        isExcluded ? "bg-muted/20 opacity-50" : "hover:bg-muted/30"
                                    )}
                                >
                                    {/* Row number */}
                                    <td className="text-muted-foreground border-r px-2 py-1 text-xs tabular-nums">
                                        {rowIndex + 1}
                                    </td>
                                    {/* Raw data cells */}
                                    {rawRow.map((cell, cellIdx) => (
                                        <td
                                            key={`raw-${cellIdx}`}
                                            className={cn(
                                                "max-w-[150px] truncate px-2 py-1",
                                                mappedIndices.has(cellIdx) && "bg-primary/5"
                                            )}
                                            title={cell}
                                        >
                                            <span className="font-mono text-xs whitespace-pre-wrap">
                                                {cell || "—"}
                                            </span>
                                        </td>
                                    ))}
                                    {/* Divider */}
                                    <td className="bg-border w-px" />
                                    {/* Preview cells */}
                                    <td className="bg-muted/10 px-2 py-1">
                                        {statusDisplay ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "flex items-center",
                                                                statusDisplay.color
                                                            )}
                                                        >
                                                            <statusDisplay.icon className="h-4 w-4" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="right"
                                                        className="max-w-xs"
                                                    >
                                                        <p className="font-medium">
                                                            {statusDisplay.label}
                                                        </p>
                                                        {preview?.validationErrors &&
                                                            preview.validationErrors.length > 0 && (
                                                                <ul className="text-destructive mt-1 text-xs">
                                                                    {preview.validationErrors.map(
                                                                        (
                                                                            err: string,
                                                                            i: number
                                                                        ) => (
                                                                            <li key={i}>• {err}</li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            )}
                                                        {preview?.status === "duplicate" &&
                                                            preview.duplicateOf && (
                                                                <p className="mt-1 text-xs">
                                                                    Matches existing transaction
                                                                </p>
                                                            )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="bg-muted/10 px-2 py-1 whitespace-nowrap tabular-nums">
                                        {preview?.date ? (
                                            formatTransactionDate(preview.date)
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td
                                        className="bg-muted/10 max-w-[200px] truncate px-2 py-1 whitespace-pre-wrap"
                                        title={preview?.description}
                                    >
                                        {preview?.description || (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td
                                        className={cn(
                                            "bg-muted/10 px-2 py-1 text-right whitespace-nowrap tabular-nums",
                                            preview?.amount !== null &&
                                                preview?.amount !== undefined &&
                                                preview.amount < 0
                                                ? "text-destructive"
                                                : "text-green-600 dark:text-green-400"
                                        )}
                                    >
                                        {preview?.amount !== null &&
                                        preview?.amount !== undefined ? (
                                            <span>
                                                {preview.amount < 0 ? "−" : "+"}
                                                {Math.abs(preview.amount / multiplier).toFixed(
                                                    decimalPlaces
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Truncation notice */}
            {truncated && (
                <div className="text-muted-foreground mt-2 text-center text-xs">
                    Showing first {maxDisplayRows} of {rawRows.length} rows
                </div>
            )}
        </div>
    );
}
