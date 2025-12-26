"use client";

/**
 * Transaction Row
 *
 * Individual row in the transaction list with presence highlighting.
 * Shows colored border when another user is focused on or editing the row.
 * Supports duplicate detection, resolution actions, and deletion.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { hashToColor } from "@/lib/utils/color";
import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";
import { DuplicateBadge } from "./DuplicateBadge";

export interface TransactionRowData {
  id: string;
  date: string;
  description: string;
  amount: number;
  account?: string;
  accountId?: string;
  status?: string;
  statusId?: string;
  tags?: Array<{ id: string; name: string }>;
  balance?: number;
  /** ID of suspected duplicate transaction */
  possibleDuplicateOf?: string;
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
  onClick?: (event?: React.MouseEvent) => void;
  /** Callback when row is focused */
  onFocus?: () => void;
  /** Callback when resolving duplicate (keep = clear flag, delete = remove) */
  onResolveDuplicate?: (action: "keep" | "delete") => void;
  /** Callback when deleting the transaction */
  onDelete?: () => void;
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
  onResolveDuplicate,
  onDelete,
  className,
}: TransactionRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Determine presence state
  const focusedByOther = presence?.focusedBy && presence.focusedBy !== currentUserId;
  const editingByOther = presence?.editingBy && presence.editingBy !== currentUserId;
  const presenceUserId = presence?.editingBy || presence?.focusedBy;
  const borderColor = presenceUserId ? hashToColor(presenceUserId) : undefined;

  // Whether this is a potential duplicate
  const isDuplicate = !!transaction.possibleDuplicateOf;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete?.();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div
      onClick={(e) => onClick?.(e)}
      onFocus={onFocus}
      tabIndex={0}
      className={cn(
        "group relative flex items-center gap-4 border-b px-4 py-3",
        "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
        "cursor-pointer transition-colors",
        isSelected && "bg-accent",
        isDuplicate && "bg-yellow-50/50 dark:bg-yellow-950/20",
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

      {/* Duplicate indicator */}
      {isDuplicate && (
        <div className="shrink-0">
          <DuplicateBadge
            duplicateOfId={transaction.possibleDuplicateOf}
            onResolve={onResolveDuplicate}
          />
        </div>
      )}

      {/* Date */}
      <div className="text-muted-foreground w-24 shrink-0 text-sm">{transaction.date}</div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{transaction.description}</div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {transaction.account && <span className="truncate">{transaction.account}</span>}
        </div>
      </div>

      {/* Tags */}
      {transaction.tags && transaction.tags.length > 0 && (
        <div className="flex gap-1">
          {transaction.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
            >
              {tag.name}
            </span>
          ))}
          {transaction.tags.length > 2 && (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
              +{transaction.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Status */}
      {transaction.status && (
        <div className="w-24 shrink-0">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {transaction.status}
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

      {/* Delete button */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            "shrink-0 rounded p-1.5 transition-colors",
            showDeleteConfirm
              ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          )}
          title={showDeleteConfirm ? "Click again to confirm delete" : "Delete transaction"}
        >
          {showDeleteConfirm ? (
            <span className="text-xs font-medium px-1">Confirm?</span>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      )}

      {/* Presence avatar - shows when someone is focused/editing */}
      {presenceUserId && presenceUserId !== currentUserId && (
        <div className="absolute top-1/2 -right-2 -translate-y-1/2">
          <PresenceAvatar userId={presenceUserId} isOnline={true} size="sm" showIndicator={false} />
        </div>
      )}
    </div>
  );
}
