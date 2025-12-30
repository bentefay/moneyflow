"use client";

/**
 * AutomationDropdown
 *
 * Dropdown for selecting automation creation preference.
 * Allows users to choose between "Create automatically" and "Manual" modes
 * for how new automations are created from transactions.
 */

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, Hand } from "lucide-react";

export type AutomationPreference = "createAutomatically" | "manual";

export interface AutomationDropdownProps {
  /** Current automation preference */
  value: AutomationPreference;
  /** Callback when preference changes */
  onChange: (value: AutomationPreference) => void;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AutomationDropdown - allows selecting automation creation preference.
 *
 * - "Create automatically": When a transaction is edited (tags, status, etc.),
 *   offer to create an automation rule based on the pattern.
 * - "Manual": User must explicitly create automations from the Automations page.
 */
export function AutomationDropdown({
  value,
  onChange,
  disabled = false,
  className,
}: AutomationDropdownProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AutomationPreference)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[200px]", className)}>
        <SelectValue placeholder="Select preference" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="createAutomatically">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            <span>Create automatically</span>
          </div>
        </SelectItem>
        <SelectItem value="manual">
          <div className="flex items-center gap-2">
            <Hand className="h-4 w-4" />
            <span>Manual</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export interface AutomationPreferenceCardProps {
  /** Current automation preference */
  value: AutomationPreference;
  /** Callback when preference changes */
  onChange: (value: AutomationPreference) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AutomationPreferenceCard - a more detailed UI for selecting automation preference.
 * Useful in settings pages or onboarding.
 */
export function AutomationPreferenceCard({
  value,
  onChange,
  className,
}: AutomationPreferenceCardProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Automation Creation</h3>
        <p className="text-muted-foreground text-sm">
          Choose how you want to create automation rules.
        </p>
      </div>

      <div className="grid gap-3">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
            value === "createAutomatically" ? "border-primary bg-primary/5" : "hover:bg-accent/50"
          )}
        >
          <input
            type="radio"
            name="automationPreference"
            value="createAutomatically"
            checked={value === "createAutomatically"}
            onChange={() => onChange("createAutomatically")}
            className="mt-1"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <Wand2 className="h-4 w-4" />
              Create automatically
            </div>
            <p className="text-muted-foreground text-sm">
              When you edit a transaction&apos;s tags, status, or allocations, you&apos;ll be
              offered to create an automation rule that applies the same changes to similar
              transactions.
            </p>
          </div>
        </label>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
            value === "manual" ? "border-primary bg-primary/5" : "hover:bg-accent/50"
          )}
        >
          <input
            type="radio"
            name="automationPreference"
            value="manual"
            checked={value === "manual"}
            onChange={() => onChange("manual")}
            className="mt-1"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <Hand className="h-4 w-4" />
              Manual
            </div>
            <p className="text-muted-foreground text-sm">
              Create automations manually from the Automations page. Edits to transactions
              won&apos;t prompt you to create rules.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
