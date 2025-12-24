"use client";

/**
 * Transaction Row
 *
 * Individual row in the transaction list with presence highlighting.
 * Shows colored border when another user is focused on or editing the row.
 */

import { cn } from "@/lib/utils";
import { hashToColor } from "@/lib/utils/color";
import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";

export interface TransactionRowData {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountName?: string;
  personName?: string;
  tagNames?: string[];
  statusName?: string;
}

export interface TransactionRowPresence {
  /** User ID who is focused on this row */
  focusedBy?: string;
  /** User ID who is editing this row */
  editingBy?: string;
  /** Field being edited */
  editingField?: string;
}

export interface TransactionRowProps {
  /** Transaction data */
  transaction: TransactionRowData;
  /** Presence info for this row */
  presence?: TransactionRowPresence;
  /** Current user's pubkey hash */
  currentUserId?: string;
  /** Whether this row is selected */
  isSelected?: boolean;
  /** Callback when row is clicked */
  onClick?: () => void;
  /** Callback when row is focused */
  onFocus?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format amount as currency.
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Transaction row component with presence highlighting.
 */
export function TransactionRow({
  transaction,
  presence,
  currentUserId,
  isSelected = false,
  onClick,
  onFocus,
  className,
}: TransactionRowProps) {
  // Determine presence state
  const focusedByOther = presence?.focusedBy && presence.focusedBy !== currentUserId;
  const editingByOther = presence?.editingBy && presence.editingBy !== currentUserId;
  const presenceUserId = presence?.editingBy || presence?.focusedBy;
  const borderColor = presenceUserId ? hashToColor(presenceUserId) : undefined;

  return (
    <div
      onClick={onClick}
      onFocus={onFocus}
      tabIndex={0}
      className={cn(
        "group relative flex items-center gap-4 border-b px-4 py-3",
        "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
        "cursor-pointer transition-colors",
        isSelected && "bg-accent",
        className
      )}
      role="row"
      aria-selected={isSelected}
    >
      {/* Presence indicator - colored left border */}
      {(focusedByOther || editingByOther) && (
        <div
          className={cn("absolute top-0 bottom-0 left-0 w-1", editingByOther && "animate-pulse")}
          style={{ backgroundColor: borderColor }}
          title={
            editingByOther
              ? `Being edited by ${presence?.editingBy}`
              : `Viewed by ${presence?.focusedBy}`
          }
        />
      )}

      {/* Date */}
      <div className="text-muted-foreground w-24 shrink-0 text-sm">{transaction.date}</div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{transaction.description}</div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {transaction.accountName && <span className="truncate">{transaction.accountName}</span>}
          {transaction.personName && (
            <>
              <span>•</span>
              <span className="truncate">{transaction.personName}</span>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      {transaction.tagNames && transaction.tagNames.length > 0 && (
        <div className="flex gap-1">
          {transaction.tagNames.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
          {transaction.tagNames.length > 2 && (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
              +{transaction.tagNames.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Status */}
      {transaction.statusName && (
        <div className="w-24 shrink-0">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {transaction.statusName}
          </span>
        </div>
      )}

      {/* Amount */}
      <div
        className={cn(
          "w-28 shrink-0 text-right font-medium tabular-nums",
          transaction.amount < 0
            ? "text-red-600 dark:text-red-400"
            : "text-green-600 dark:text-green-400"
        )}
      >
        {formatCurrency(transaction.amount)}
      </div>

      {/* Presence avatar - shows when someone is focused/editing */}
      {presenceUserId && presenceUserId !== currentUserId && (
        <div className="absolute top-1/2 -right-2 -translate-y-1/2">
          <PresenceAvatar userId={presenceUserId} isOnline={true} size="sm" showIndicator={false} />
        </div>
      )}
    </div>
  );
}
