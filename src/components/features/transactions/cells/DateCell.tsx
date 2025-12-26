"use client";

/**
 * Date Cell
 *
 * Displays and allows editing of a transaction date.
 * Shows date picker on edit mode.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface DateCellProps {
  /** The date value in ISO format (YYYY-MM-DD) */
  value: string;
  /** Whether the cell is in edit mode */
  isEditing?: boolean;
  /** Callback when the date changes */
  onChange?: (date: string) => void;
  /** Callback when editing starts */
  onEditStart?: () => void;
  /** Callback when editing ends */
  onEditEnd?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format a date string for display.
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Date cell component with inline editing.
 */
export function DateCell({
  value,
  isEditing = false,
  onChange,
  onEditStart,
  onEditEnd,
  className,
}: DateCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    onEditStart?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange?.(localValue);
    }
    onEditEnd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (localValue !== value) {
        onChange?.(localValue);
      }
      onEditEnd?.();
    } else if (e.key === "Escape") {
      setLocalValue(value);
      onEditEnd?.();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-32 rounded border px-2 py-1 text-sm",
          "focus:ring-primary focus:border-primary focus:ring-2 focus:outline-none",
          className
        )}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        "text-muted-foreground w-24 shrink-0 cursor-pointer text-sm",
        "hover:text-foreground transition-colors",
        className
      )}
    >
      {formatDate(value)}
    </div>
  );
}
