"use client";

/**
 * MappingTab
 *
 * Tab content for mapping CSV columns to transaction fields.
 * Shows available columns with sample values and dropdown to assign target field.
 */

import { AlertCircle, CheckCircle2, Wand2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { detectColumnMappingsFromValues } from "@/lib/import/detection";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

/** Target fields that can be mapped to */
export const TARGET_FIELDS = [
    { id: "date", label: "Date", required: true },
    { id: "amount", label: "Amount", required: true },
    { id: "description", label: "Description", required: false },
    { id: "merchant", label: "Merchant", required: false },
    { id: "memo", label: "Memo", required: false },
    { id: "checkNumber", label: "Check Number", required: false },
    { id: "balance", label: "Balance", required: false },
    { id: "__ignore__", label: "(Ignore)", required: false }
] as const;

export type TargetFieldId = (typeof TARGET_FIELDS)[number]["id"];

export interface MappingTabProps {
    /** Column headers from the raw file */
    availableHeaders: string[];
    /**
     * Every data row, with any header row already removed.
     *
     * The whole set rather than a sample: auto-detection reads the full column
     * to tell a day-first date column from a month-first one, and a sample of
     * the opening rows can be uniformly ambiguous while the column is not.
     */
    dataRows: string[][];
    /**
     * Whether `availableHeaders` are the file's own names rather than
     * synthesised "Column N" placeholders.
     *
     * Auto-detection consults header names to break ties its values cannot, so
     * it must be able to tell a real header from a placeholder.
     */
    hasRealHeaders: boolean;
    /** Current column mappings (columnIndex as string -> field name) */
    columnMappings: Record<string, string>;
    /** Callback when mappings change */
    onMappingsChange: (mappings: Record<string, string>) => void;
    /** Additional CSS classes */
    className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MappingTab component.
 */
export function MappingTab({
    availableHeaders,
    dataRows,
    hasRealHeaders,
    columnMappings,
    onMappingsChange,
    className
}: MappingTabProps) {
    // Track which target fields are already used
    const usedFields = useMemo(
        () => new Set(Object.values(columnMappings).filter((f) => f !== "__ignore__")),
        [columnMappings]
    );

    // Check for missing required fields
    const missingRequired = useMemo(
        () => TARGET_FIELDS.filter((f) => f.required && !usedFields.has(f.id)).map((f) => f.label),
        [usedFields]
    );

    // Handle mapping change for a column
    const handleMappingChange = useCallback(
        (columnIndex: number, fieldId: string) => {
            const key = columnIndex.toString();
            const newMappings = { ...columnMappings };

            if (fieldId === "__none__") {
                delete newMappings[key];
            } else {
                newMappings[key] = fieldId;
            }

            onMappingsChange(newMappings);
        },
        [columnMappings, onMappingsChange]
    );

    // Auto-detect all mappings.
    //
    // Runs the SAME detection the file load runs, on the same rows and with the
    // same header evidence, so the two cannot answer differently. Matching on
    // header names alone here - as this once did - made the button disagree
    // with the load: on a headerless file the names are synthesised, so a click
    // returned nothing and WIPED the mappings detection had already got right.
    const handleAutoDetect = useCallback(() => {
        onMappingsChange(
            detectColumnMappingsFromValues(dataRows, hasRealHeaders ? availableHeaders : [])
        );
    }, [dataRows, hasRealHeaders, availableHeaders, onMappingsChange]);

    // Get sample values for a column, for the preview line under its name.
    const getSampleValues = useCallback(
        (columnIndex: number): string[] => {
            return dataRows
                .slice(0, 3)
                .map((row) => row[columnIndex] ?? "")
                .filter((v) => v.trim());
        },
        [dataRows]
    );

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Label>Column Mappings</Label>
                    <p className="text-muted-foreground text-sm">
                        Map file columns to transaction fields
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAutoDetect}>
                    <Wand2 className="mr-1.5 h-4 w-4" />
                    Auto-detect
                </Button>
            </div>

            {/* Missing required fields warning */}
            {missingRequired.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        Required fields not mapped:{" "}
                        <span className="font-medium">{missingRequired.join(", ")}</span>
                    </span>
                </div>
            )}

            {/* All required fields mapped */}
            {missingRequired.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>All required fields mapped</span>
                </div>
            )}

            {/* Column list */}
            <div className="bg-card space-y-3 rounded-lg border p-3">
                {availableHeaders.map((header, idx) => {
                    const key = idx.toString();
                    const currentMapping = columnMappings[key] ?? "__none__";
                    const samples = getSampleValues(idx);

                    return (
                        <div
                            key={idx}
                            className="flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium" title={header}>
                                        {header}
                                    </div>
                                    {samples.length > 0 && (
                                        <div
                                            className="text-muted-foreground truncate text-xs"
                                            title={samples.join(" | ")}
                                        >
                                            {samples.slice(0, 2).join(" | ")}
                                            {samples.length > 2 && "..."}
                                        </div>
                                    )}
                                </div>
                                <Select
                                    value={currentMapping}
                                    onValueChange={(v) => handleMappingChange(idx, v)}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Not mapped" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Not mapped</SelectItem>
                                        {TARGET_FIELDS.map((field) => {
                                            const isUsed =
                                                usedFields.has(field.id) &&
                                                currentMapping !== field.id;
                                            return (
                                                <SelectItem
                                                    key={field.id}
                                                    value={field.id}
                                                    disabled={isUsed && field.id !== "__ignore__"}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span>{field.label}</span>
                                                        {field.required && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="px-1 py-0 text-[10px]"
                                                            >
                                                                Required
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
