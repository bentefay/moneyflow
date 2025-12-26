"use client";

/**
 * Column Mapping Step
 *
 * Step in import wizard for mapping CSV columns to transaction fields.
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Target field options for column mapping.
 */
export const TARGET_FIELDS = [
  { id: "date", label: "Date", required: true },
  { id: "amount", label: "Amount", required: true },
  { id: "description", label: "Description", required: false },
  { id: "merchant", label: "Merchant", required: false },
  { id: "account", label: "Account", required: false },
  { id: "category", label: "Category", required: false },
  { id: "memo", label: "Memo", required: false },
  { id: "checkNumber", label: "Check Number", required: false },
  { id: "balance", label: "Balance", required: false },
  { id: "ignore", label: "(Ignore)", required: false },
] as const;

export type TargetFieldId = (typeof TARGET_FIELDS)[number]["id"];

/**
 * Column mapping entry.
 */
export interface ColumnMapping {
  /** Source column header/index */
  sourceColumn: string;
  /** Target field ID */
  targetField: TargetFieldId | "";
  /** Sample values from the column */
  samples: string[];
}

export interface ColumnMappingStepProps {
  /** Column headers from the CSV */
  headers: string[];
  /** Sample data rows for preview */
  sampleRows: string[][];
  /** Current column mappings */
  mappings: ColumnMapping[];
  /** Callback when mappings change */
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Column mapping step component.
 */
export function ColumnMappingStep({
  headers,
  sampleRows,
  mappings,
  onMappingsChange,
  className,
}: ColumnMappingStepProps) {
  // Compute which target fields are already mapped
  const usedTargetFields = useMemo(() => {
    return new Set(
      mappings
        .map((m) => m.targetField)
        .filter((f) => f && f !== "ignore")
    );
  }, [mappings]);

  // Check if required fields are mapped
  const missingRequired = useMemo(() => {
    return TARGET_FIELDS.filter(
      (f) => f.required && !usedTargetFields.has(f.id)
    ).map((f) => f.label);
  }, [usedTargetFields]);

  const handleMappingChange = (index: number, targetField: TargetFieldId | "") => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      targetField,
    };
    onMappingsChange(newMappings);
  };

  // Auto-detect mappings based on header names
  const autoDetect = () => {
    const newMappings = headers.map((header, idx): ColumnMapping => {
      const headerLower = header.toLowerCase();
      let targetField: TargetFieldId | "" = "";

      // Match common header names to target fields
      if (headerLower.includes("date") || headerLower === "posted") {
        targetField = "date";
      } else if (
        headerLower.includes("amount") ||
        headerLower.includes("debit") ||
        headerLower.includes("credit")
      ) {
        targetField = "amount";
      } else if (
        headerLower.includes("description") ||
        headerLower.includes("desc") ||
        headerLower.includes("name")
      ) {
        targetField = "description";
      } else if (headerLower.includes("merchant") || headerLower.includes("payee")) {
        targetField = "merchant";
      } else if (headerLower.includes("account")) {
        targetField = "account";
      } else if (
        headerLower.includes("category") ||
        headerLower.includes("type")
      ) {
        targetField = "category";
      } else if (headerLower.includes("memo") || headerLower.includes("note")) {
        targetField = "memo";
      } else if (headerLower.includes("check")) {
        targetField = "checkNumber";
      } else if (headerLower.includes("balance")) {
        targetField = "balance";
      }

      return {
        sourceColumn: header,
        targetField,
        samples: sampleRows.map((row) => row[idx] || "").slice(0, 3),
      };
    });

    // Remove duplicate mappings (keep first)
    const usedFields = new Set<string>();
    for (const mapping of newMappings) {
      if (mapping.targetField && mapping.targetField !== "ignore") {
        if (usedFields.has(mapping.targetField)) {
          mapping.targetField = "";
        } else {
          usedFields.add(mapping.targetField);
        }
      }
    }

    onMappingsChange(newMappings);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Map Columns</h3>
          <p className="text-muted-foreground text-sm">
            Match your file columns to transaction fields
          </p>
        </div>
        <button
          type="button"
          onClick={autoDetect}
          className="hover:bg-accent rounded px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Auto-detect
        </button>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 dark:bg-yellow-950/20">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Required fields not mapped: {missingRequired.join(", ")}
          </p>
        </div>
      )}

      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">Your Column</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Sample Data</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Maps To</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mappings.map((mapping, idx) => (
              <tr key={idx} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm">{mapping.sourceColumn}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    {mapping.samples.slice(0, 2).map((sample, sampleIdx) => (
                      <div
                        key={sampleIdx}
                        className="text-muted-foreground truncate text-xs"
                        title={sample}
                      >
                        {sample || <span className="italic">empty</span>}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={mapping.targetField}
                    onChange={(e) =>
                      handleMappingChange(idx, e.target.value as TargetFieldId | "")
                    }
                    className={cn(
                      "w-full rounded border bg-transparent px-2 py-1.5 text-sm",
                      !mapping.targetField && "text-muted-foreground"
                    )}
                  >
                    <option value="">-- Select --</option>
                    {TARGET_FIELDS.map((field) => {
                      const isUsed = usedTargetFields.has(field.id) && mapping.targetField !== field.id;
                      return (
                        <option
                          key={field.id}
                          value={field.id}
                          disabled={isUsed && field.id !== "ignore"}
                        >
                          {field.label}
                          {field.required ? " *" : ""}
                          {isUsed ? " (in use)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground text-xs">
        * Required fields
      </p>
    </div>
  );
}

/**
 * Initialize column mappings from CSV headers.
 */
export function initializeColumnMappings(
  headers: string[],
  sampleRows: string[][]
): ColumnMapping[] {
  return headers.map((header, idx) => ({
    sourceColumn: header,
    targetField: "",
    samples: sampleRows.map((row) => row[idx] || "").slice(0, 3),
  }));
}

/**
 * Validate that required fields are mapped.
 */
export function validateColumnMappings(mappings: ColumnMapping[]): {
  valid: boolean;
  missingFields: string[];
} {
  const mappedFields = new Set(mappings.map((m) => m.targetField));
  const missingFields = TARGET_FIELDS.filter(
    (f) => f.required && !mappedFields.has(f.id)
  ).map((f) => f.label);

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
