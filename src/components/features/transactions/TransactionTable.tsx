"use client";

/**
 * Transaction Table
 *
 * Container component for the transaction list with infinite scroll.
 * Uses virtualization for performance with large datasets.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  TransactionRow,
  type TransactionRowData,
  type TransactionRowPresence,
} from "./TransactionRow";

export interface TransactionTableProps {
  /** Array of transactions to display */
  transactions: TransactionRowData[];
  /** Presence data keyed by transaction ID */
  presenceByTransactionId?: Record<string, TransactionRowPresence>;
  /** Current user's pubkey hash */
  currentUserId?: string;
  /** Currently selected transaction IDs */
  selectedIds?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (ids: Set<string>) => void;
  /** Callback when a transaction is clicked */
  onTransactionClick?: (id: string) => void;
  /** Callback when a transaction field is focused for editing */
  onTransactionFocus?: (id: string) => void;
  /** Callback when transaction is updated */
  onTransactionUpdate?: (id: string, updates: Partial<TransactionRowData>) => void;
  /** Callback when more transactions should be loaded */
  onLoadMore?: () => void;
  /** Whether more transactions are available */
  hasMore?: boolean;
  /** Whether currently loading more */
  isLoading?: boolean;
  /** Callback when a transaction should be deleted */
  onTransactionDelete?: (id: string) => void;
  /** Callback when a duplicate is resolved (kept) */
  onResolveDuplicate?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Table header with column labels.
 */
function TransactionTableHeader() {
  return (
    <div className="bg-muted/50 sticky top-0 z-10 flex items-center gap-4 border-b px-4 py-2 text-sm font-medium">
      <div className="w-8 shrink-0" /> {/* Checkbox column */}
      <div className="w-24 shrink-0">Date</div>
      <div className="min-w-0 flex-1">Description</div>
      <div className="w-32 shrink-0">Tags</div>
      <div className="w-24 shrink-0">Status</div>
      <div className="w-28 shrink-0 text-right">Amount</div>
      <div className="w-28 shrink-0 text-right">Balance</div>
    </div>
  );
}

/**
 * Loading indicator for infinite scroll.
 */
function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      <span className="text-muted-foreground ml-2 text-sm">Loading more transactions...</span>
    </div>
  );
}

/**
 * Empty state when no transactions exist.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground text-4xl">📊</div>
      <h3 className="mt-4 text-lg font-semibold">No transactions yet</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Import transactions or add them manually to get started.
      </p>
    </div>
  );
}

/**
 * Transaction Table component with virtualization and infinite scroll.
 */
export function TransactionTable({
  transactions,
  presenceByTransactionId = {},
  currentUserId,
  selectedIds = new Set(),
  onSelectionChange,
  onTransactionClick,
  onTransactionFocus,
  // onTransactionUpdate - reserved for future inline editing
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onTransactionDelete,
  onResolveDuplicate,
  className,
}: TransactionTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Keyboard shortcuts for duplicate resolution and deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if we have a focused/selected transaction
      const targetId = focusedId || (selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);
      if (!targetId) return;

      // Don't handle if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const transaction = transactions.find((t) => t.id === targetId);
      if (!transaction) return;

      switch (event.key.toLowerCase()) {
        case "k":
          // K = Keep (resolve duplicate)
          if (transaction.possibleDuplicateOf && onResolveDuplicate) {
            event.preventDefault();
            onResolveDuplicate(targetId);
          }
          break;
        case "d":
          // D = Delete (only if not shift/ctrl/cmd pressed for other shortcuts)
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && onTransactionDelete) {
            event.preventDefault();
            onTransactionDelete(targetId);
          }
          break;
        case "delete":
        case "backspace":
          // Delete/Backspace = Delete transaction
          if (onTransactionDelete) {
            event.preventDefault();
            onTransactionDelete(targetId);
          }
          break;
        case "arrowdown":
          // Navigate to next transaction
          event.preventDefault();
          const currentIdx = transactions.findIndex((t) => t.id === targetId);
          if (currentIdx < transactions.length - 1) {
            const nextId = transactions[currentIdx + 1].id;
            setFocusedId(nextId);
            if (!event.shiftKey) {
              onSelectionChange?.(new Set([nextId]));
            }
          }
          break;
        case "arrowup":
          // Navigate to previous transaction
          event.preventDefault();
          const currIdx = transactions.findIndex((t) => t.id === targetId);
          if (currIdx > 0) {
            const prevId = transactions[currIdx - 1].id;
            setFocusedId(prevId);
            if (!event.shiftKey) {
              onSelectionChange?.(new Set([prevId]));
            }
          }
          break;
        case "escape":
          // Clear selection
          event.preventDefault();
          setFocusedId(null);
          onSelectionChange?.(new Set());
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    focusedId,
    selectedIds,
    transactions,
    onResolveDuplicate,
    onTransactionDelete,
    onSelectionChange,
  ]);

  // Handle single row click
  const handleRowClick = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (onTransactionClick) {
        onTransactionClick(id);
      }

      if (!onSelectionChange) return;

      if (event.shiftKey && lastSelectedId) {
        // Shift-click: select range
        const startIdx = transactions.findIndex((t) => t.id === lastSelectedId);
        const endIdx = transactions.findIndex((t) => t.id === id);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          const rangeIds = transactions.slice(from, to + 1).map((t) => t.id);
          const newSelected = new Set(selectedIds);
          rangeIds.forEach((rangeId) => newSelected.add(rangeId));
          onSelectionChange(newSelected);
        }
      } else if (event.metaKey || event.ctrlKey) {
        // Cmd/Ctrl-click: toggle selection
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        onSelectionChange(newSelected);
        setLastSelectedId(id);
      } else {
        // Regular click: select only this one
        onSelectionChange(new Set([id]));
        setLastSelectedId(id);
      }
    },
    [transactions, selectedIds, lastSelectedId, onSelectionChange, onTransactionClick]
  );

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Load more when within 200px of the bottom
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoading]);

  // Memoize the transaction rows
  const transactionRows = useMemo(() => {
    return transactions.map((transaction) => (
      <TransactionRow
        key={transaction.id}
        transaction={transaction}
        presence={presenceByTransactionId[transaction.id]}
        currentUserId={currentUserId}
        isSelected={selectedIds.has(transaction.id)}
        onClick={(e?: React.MouseEvent) => handleRowClick(transaction.id, e as React.MouseEvent)}
        onFocus={() => {
          setFocusedId(transaction.id);
          onTransactionFocus?.(transaction.id);
        }}
        onDelete={onTransactionDelete ? () => onTransactionDelete(transaction.id) : undefined}
        onResolveDuplicate={
          onResolveDuplicate ? () => onResolveDuplicate(transaction.id) : undefined
        }
      />
    ));
  }, [
    transactions,
    presenceByTransactionId,
    currentUserId,
    selectedIds,
    handleRowClick,
    onTransactionFocus,
    onTransactionDelete,
    onResolveDuplicate,
  ]);

  if (transactions.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("flex h-full flex-col overflow-auto", className)}
      role="grid"
      aria-label="Transactions"
      data-testid="transaction-table"
    >
      <TransactionTableHeader />
      <div className="flex-1" role="rowgroup">
        {transactionRows}
        {isLoading && <LoadingIndicator />}
        {!isLoading && hasMore && (
          <div className="text-muted-foreground py-4 text-center text-sm">Scroll to load more</div>
        )}
      </div>
    </div>
  );
}
