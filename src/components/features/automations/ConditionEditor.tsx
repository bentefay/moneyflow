"use client";

/**
 * ConditionEditor Component
 *
 * Editor for creating/editing automation conditions.
 * Supports matching by merchant, description, amount, or account.
 */

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface ConditionData {
  id: string;
  column: string;
  operator: string;
  value: string;
  caseSensitive?: boolean;
}

export interface ConditionEditorProps {
  /** Condition data */
  condition: ConditionData;
  /** Callback when condition changes */
  onChange: (condition: ConditionData) => void;
  /** Callback when condition is removed */
  onRemove: () => void;
  /** Whether the condition can be removed (at least one required) */
  canRemove?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/** Available columns for conditions */
export const CONDITION_COLUMNS = [
  { value: "merchant", label: "Merchant" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "accountId", label: "Account" },
] as const;

/** Available operators for conditions */
export const CONDITION_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "regex", label: "Matches Regex" },
  { value: "equals", label: "Equals" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
] as const;

/**
 * Single automation condition editor.
 */
export function ConditionEditor({
  condition,
  onChange,
  onRemove,
  canRemove = true,
  className,
}: ConditionEditorProps) {
  const handleColumnChange = useCallback(
    (column: string) => {
      onChange({ ...condition, column });
    },
    [condition, onChange]
  );

  const handleOperatorChange = useCallback(
    (operator: string) => {
      onChange({ ...condition, operator });
    },
    [condition, onChange]
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...condition, value: e.target.value });
    },
    [condition, onChange]
  );

  const handleCaseSensitiveChange = useCallback(
    (checked: boolean) => {
      onChange({ ...condition, caseSensitive: checked });
    },
    [condition, onChange]
  );

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {/* Column selector */}
      <Select value={condition.column} onValueChange={handleColumnChange}>
        <SelectTrigger className="w-32" data-testid="condition-column">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_COLUMNS.map((col) => (
            <SelectItem key={col.value} value={col.value}>
              {col.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select value={condition.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-36" data-testid="condition-operator">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      <Input
        value={condition.value}
        onChange={handleValueChange}
        placeholder={condition.operator === "regex" ? "Regular expression" : "Value"}
        className="flex-1"
        data-testid="condition-value"
      />

      {/* Case sensitive toggle */}
      <div className="flex items-center gap-1.5">
        <Checkbox
          id={`case-${condition.id}`}
          checked={condition.caseSensitive ?? false}
          onCheckedChange={handleCaseSensitiveChange}
          data-testid="condition-case-sensitive"
        />
        <Label
          htmlFor={`case-${condition.id}`}
          className="text-muted-foreground text-xs whitespace-nowrap"
        >
          Case
        </Label>
      </div>

      {/* Remove button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-9 w-9 shrink-0"
          data-testid="remove-condition"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
