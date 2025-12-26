"use client";

/**
 * Preview Step
 *
 * Step in import wizard showing parsed transactions before import.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Parsed transaction for preview.
 */
export interface PreviewTransaction {
  /** Row index in original file */
  rowIndex: number;
  /** Parsed date (ISO string) */
  date: string | null;
  /** Parsed amount */
  amount: number | null;
  /** Description/merchant */
  description: string;
  /** Any parsing errors for this row */
  errors: string[];
  /** Whether this might be a duplicate */
  isDuplicate?: boolean;
  /** Original row data */
  originalRow: string[];
}

export interface PreviewStepProps {
  /** Parsed transactions for preview */
  transactions: PreviewTransaction[];
  /** Total rows in file (may be more than preview) */
  totalRows: number;
  /** Number of rows with errors */
  errorCount: number;
  /** Number of potential duplicates */
  duplicateCount: number;
  /** Callback to toggle duplicate flag */
  onToggleDuplicate?: (rowIndex: number) => void;
  /** Maximum rows to display */
  maxDisplay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Preview step component.
 */
export function PreviewStep({
  transactions,
  totalRows,
  errorCount,
  duplicateCount,
  onToggleDuplicate,
  maxDisplay = 50,
  className,
}: PreviewStepProps) {
  const displayedTransactions = useMemo(
    () => transactions.slice(0, maxDisplay),
    [transactions, maxDisplay]
  );

  const hasMoreRows = transactions.length > maxDisplay;
  const validCount = totalRows - errorCount;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">Preview Import</h3>
        <p className="text-muted-foreground text-sm">Review transactions before importing</p>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 grid gap-4 rounded-lg p-4 sm:grid-cols-3">
        <div className="text-center">
          <div className="text-2xl font-bold">{totalRows}</div>
          <div className="text-muted-foreground text-sm">Total Rows</div>
        </div>
        <div className="text-center">
          <div className={cn("text-2xl font-bold", validCount > 0 && "text-green-600")}>
            {validCount}
          </div>
          <div className="text-muted-foreground text-sm">Valid Transactions</div>
        </div>
        <div className="text-center">
          <div className={cn("text-2xl font-bold", errorCount > 0 && "text-red-600")}>
            {errorCount}
          </div>
          <div className="text-muted-foreground text-sm">Rows with Errors</div>
        </div>
      </div>

      {duplicateCount > 0 && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 dark:bg-yellow-950/20">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            <strong>{duplicateCount}</strong> potential duplicate{duplicateCount !== 1 ? "s" : ""}{" "}
            detected. These will be imported but flagged for review.
          </p>
        </div>
      )}

      {errorCount > 0 && (
        <div className="rounded-lg border border-red-500/50 bg-red-50 p-3 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>{errorCount}</strong> row{errorCount !== 1 ? "s" : ""} will be skipped due to
            errors. Check the formatting settings if this is unexpected.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="max-h-[400px] overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 border-b">
            <tr>
              <th className="w-10 px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="w-20 px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayedTransactions.map((tx) => (
              <tr
                key={tx.rowIndex}
                className={cn(
                  "hover:bg-muted/30",
                  tx.errors.length > 0 && "bg-red-50 dark:bg-red-950/20",
                  tx.isDuplicate && "bg-yellow-50 dark:bg-yellow-950/20"
                )}
              >
                <td className="text-muted-foreground px-3 py-2">{tx.rowIndex + 1}</td>
                <td className="px-3 py-2">
                  {tx.date ? (
                    <span className="tabular-nums">{tx.date}</span>
                  ) : (
                    <span className="text-red-500">Invalid</span>
                  )}
                </td>
                <td className="max-w-[300px] truncate px-3 py-2" title={tx.description}>
                  {tx.description || <span className="text-muted-foreground italic">empty</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {tx.amount !== null ? (
                    <span className={tx.amount < 0 ? "text-red-600" : "text-green-600"}>
                      {tx.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-red-500">Invalid</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {tx.errors.length > 0 ? (
                    <span
                      className="inline-flex cursor-help items-center text-red-500"
                      title={tx.errors.join(", ")}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                  ) : tx.isDuplicate ? (
                    <button
                      type="button"
                      onClick={() => onToggleDuplicate?.(tx.rowIndex)}
                      className="inline-flex items-center text-yellow-600 hover:text-yellow-700"
                      title="Potential duplicate - click to toggle"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="inline-flex items-center text-green-500">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMoreRows && (
        <p className="text-muted-foreground text-center text-sm">
          Showing {maxDisplay} of {transactions.length} transactions
        </p>
      )}
    </div>
  );
}

/**
 * Format an amount for display.
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
