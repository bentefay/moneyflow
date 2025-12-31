import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type FocusEvent,
} from "react";
import { cn } from "@/lib/utils";

export interface EditableCellProps {
  /** Current value to display/edit */
  value: string;
  /** Whether the cell is currently focused */
  isFocused: boolean;
  /** Whether the cell is in edit mode */
  isEditing: boolean;
  /** Callback when edit is requested (click or Enter on focused cell) */
  onStartEdit: () => void;
  /** Callback when value is saved (Enter or Tab) */
  onSave: (newValue: string) => void;
  /** Callback when edit is cancelled (Escape) */
  onCancel: () => void;
  /** Callback when cell is clicked (to request focus) */
  onClick?: () => void;
  /** Cell alignment */
  align?: "left" | "center" | "right";
  /** Additional class names */
  className?: string;
  /** Placeholder text when value is empty */
  placeholder?: string;
  /** Whether the cell is disabled */
  disabled?: boolean;
  /** Type of input (text, number, date) */
  type?: "text" | "number" | "date";
  /** Validation function, returns error message or null */
  validate?: (value: string) => string | null;
}

/**
 * A cell component that supports inline editing.
 *
 * States:
 * - Default: Shows value as text
 * - Focused: Shows focus ring, not editable
 * - Editing: Shows input field, captures keyboard
 *
 * Keyboard:
 * - Enter/Tab while editing: Save and exit edit mode
 * - Escape while editing: Cancel and revert
 * - Typing while focused (not editing): Enters edit mode
 */
export function EditableCell({
  value,
  isFocused,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onClick,
  align = "left",
  className,
  placeholder = "",
  disabled = false,
  type = "text",
  validate,
}: EditableCellProps) {
  // Local edit state - only used while editing
  // Initialized from value when editing starts via key prop pattern
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    if (validate) {
      const validationError = validate(localValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    onSave(localValue);
  }, [localValue, onSave, validate]);

  const handleCancel = useCallback(() => {
    setLocalValue(value);
    setError(null);
    onCancel();
  }, [value, onCancel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Tab") {
        // Let Tab propagate for navigation, but save first
        handleSave();
      }
    },
    [handleSave, handleCancel],
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      // Don't save on blur if navigating within the table (Tab handles that)
      // Only save if focus leaves the table entirely
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!relatedTarget?.closest("[data-transaction-table]")) {
        handleSave();
      }
    },
    [handleSave],
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick?.();
    }
  }, [disabled, onClick]);

  // Reset local state when entering edit mode
  // This handler is called on double-click to start editing
  const handleEditStart = useCallback(() => {
    setLocalValue(value);
    setError(null);
    onStartEdit();
  }, [value, onStartEdit]);

  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  if (isEditing && !disabled) {
    return (
      <div className={cn("relative w-full", className)}>
        <input
          ref={inputRef}
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            "w-full px-2 py-1 text-sm border rounded",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            error && "border-destructive focus:ring-destructive",
            alignClass,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? "cell-error" : undefined}
        />
        {error && (
          <div
            id="cell-error"
            className="absolute top-full left-0 text-xs text-destructive mt-1"
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={() => {
        if (!disabled && !isEditing) {
          handleEditStart();
        }
      }}
      className={cn(
        "w-full px-2 py-1 text-sm cursor-default truncate",
        alignClass,
        isFocused && "ring-2 ring-primary ring-inset rounded",
        disabled && "opacity-50 cursor-not-allowed",
        !value && placeholder && "text-muted-foreground",
        className,
      )}
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-selected={isFocused}
    >
      {value || placeholder}
    </div>
  );
}
