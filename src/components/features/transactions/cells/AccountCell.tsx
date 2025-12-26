"use client";

/**
 * Account Cell
 *
 * Displays and allows editing of a transaction's account.
 * Shows dropdown for account selection.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface AccountData {
  id: string;
  name: string;
  accountType?: string;
}

export interface AccountCellProps {
  /** The selected account */
  account: AccountData | null;
  /** All available accounts for selection */
  availableAccounts?: AccountData[];
  /** Whether the cell is in edit mode */
  isEditing?: boolean;
  /** Callback when the account changes */
  onChange?: (accountId: string) => void;
  /** Callback when editing starts */
  onEditStart?: () => void;
  /** Callback when editing ends */
  onEditEnd?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Account cell component with dropdown editing.
 */
export function AccountCell({
  account,
  availableAccounts = [],
  isEditing = false,
  onChange,
  onEditStart,
  onEditEnd,
  className,
}: AccountCellProps) {
  const [selectedId, setSelectedId] = useState(account?.id ?? "");
  const selectRef = useRef<HTMLSelectElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selected ID with prop
  useEffect(() => {
    setSelectedId(account?.id ?? "");
  }, [account]);

  // Focus select when editing starts
  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  // Handle click outside to close
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, selectedId]);

  const handleDoubleClick = () => {
    onEditStart?.();
  };

  const handleSave = () => {
    if (selectedId !== account?.id) {
      onChange?.(selectedId);
    }
    onEditEnd?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedId(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setSelectedId(account?.id ?? "");
      onEditEnd?.();
    }
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className={cn("w-36", className)}>
        <select
          ref={selectRef}
          value={selectedId}
          onChange={handleChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded border px-2 py-1 text-sm",
            "focus:ring-primary focus:border-primary focus:outline-none focus:ring-2"
          )}
        >
          <option value="">Select account...</option>
          {availableAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        "text-muted-foreground w-32 shrink-0 cursor-pointer truncate text-sm",
        "hover:text-foreground transition-colors",
        className
      )}
    >
      {account?.name ?? <span className="italic">No account</span>}
    </div>
  );
}
