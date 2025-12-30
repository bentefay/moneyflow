"use client";

/**
 * BehaviorSelector Component
 *
 * Dropdown selector for status behaviors.
 * Currently supports "treatAsPaid" which marks transactions as paid for settlement calculations.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BehaviorSelectorProps {
  /** Current behavior value */
  value: string;
  /** Callback when behavior changes */
  onChange: (value: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/** Available status behaviors */
export const STATUS_BEHAVIORS = [
  { value: "", label: "None" },
  { value: "treatAsPaid", label: "Treat as Paid" },
] as const;

/**
 * Behavior selector component for status configuration.
 *
 * "Treat as Paid" behavior includes the transaction in settlement
 * calculations, marking the expense as settled between parties.
 */
export function BehaviorSelector({ value, onChange, className }: BehaviorSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} data-testid="behavior-selector">
        <SelectValue placeholder="Select behavior" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_BEHAVIORS.map((behavior) => (
          <SelectItem
            key={behavior.value || "none"}
            value={behavior.value || "none"}
            data-testid={`behavior-option-${behavior.value || "none"}`}
          >
            {behavior.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
