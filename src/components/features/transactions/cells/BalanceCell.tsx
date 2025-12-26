"use client";

/**
 * Balance Cell
 *
 * Displays the running balance for a transaction.
 * This is a read-only computed field.
 */

import { cn } from "@/lib/utils";

export interface BalanceCellProps {
  /** The running balance at this transaction */
  balance: number;
  /** Currency code (default: USD) */
  currency?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format balance as currency.
 */
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Balance cell component (read-only).
 */
export function BalanceCell({
  balance,
  currency = "USD",
  className,
}: BalanceCellProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground w-28 shrink-0 text-right text-sm tabular-nums",
        balance < 0 && "text-red-500 dark:text-red-400",
        className
      )}
    >
      {formatCurrency(balance, currency)}
    </div>
  );
}
