import { useCallback, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export interface CheckboxCellProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Callback when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Whether shift key was pressed (for range selection) */
  onShiftClick?: (event: React.MouseEvent) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Whether this is a "select all" checkbox (shows indeterminate state) */
  indeterminate?: boolean;
  /** Accessible label for the checkbox */
  ariaLabel: string;
  /** Additional class names */
  className?: string;
}

/**
 * Checkbox cell for transaction selection.
 *
 * Supports:
 * - Standard click to toggle
 * - Shift+click for range selection (via onShiftClick callback)
 * - Indeterminate state for "select all" header
 * - Keyboard accessibility (Space to toggle)
 */
export function CheckboxCell({
  checked,
  onChange,
  onShiftClick,
  disabled = false,
  indeterminate = false,
  ariaLabel,
  className,
}: CheckboxCellProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      if (event.shiftKey && onShiftClick) {
        event.preventDefault();
        onShiftClick(event);
      } else {
        onChange(!checked);
      }
    },
    [checked, disabled, onChange, onShiftClick],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onChange(!checked);
      }
    },
    [checked, disabled, onChange],
  );

  return (
    <div
      className={cn(
        "flex items-center justify-center w-full h-full",
        className,
      )}
      role="gridcell"
    >
      <Checkbox
        checked={indeterminate ? "indeterminate" : checked}
        onCheckedChange={(value) => {
          if (!disabled && typeof value === "boolean") {
            onChange(value);
          }
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(disabled && "opacity-50 cursor-not-allowed")}
      />
    </div>
  );
}
