"use client";

/**
 * OwnershipEditor Component
 *
 * Editor for account ownership percentages. Allows adding/removing owners
 * and adjusting percentages. Validates that percentages sum to 100%.
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActivePeople } from "@/lib/crdt/context";
import {
  validateOwnerships,
  sumOwnerships,
  normalizeOwnerships,
  addOwner,
  removeOwner,
} from "@/lib/domain/ownership";
import type { Person } from "@/lib/crdt/schema";

export interface OwnershipEditorProps {
  /** Current ownerships map (personId -> percentage) */
  ownerships: Record<string, number>;
  /** Callback when ownerships change */
  onChange: (ownerships: Record<string, number>) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Editor for account ownership percentages.
 *
 * Displays each owner with their percentage and allows:
 * - Editing percentages (auto-adjusts others proportionally)
 * - Removing owners (redistributes to remaining)
 * - Adding new owners from available people
 */
export function OwnershipEditor({
  ownerships,
  onChange,
  disabled = false,
  className,
}: OwnershipEditorProps) {
  const allPeople = useActivePeople();
  const [isAddingOwner, setIsAddingOwner] = useState(false);

  // Validation result
  const validation = useMemo(() => validateOwnerships(ownerships), [ownerships]);

  // People who are not yet owners
  const availablePeople = useMemo(() => {
    return Object.values(allPeople).filter(
      (p): p is Person => typeof p === "object" && !(p.id in ownerships)
    );
  }, [allPeople, ownerships]);

  // Get person name by ID
  const getPersonName = useCallback(
    (personId: string): string => {
      const person = allPeople[personId];
      if (typeof person === "object" && person.name) {
        return person.name;
      }
      return personId.slice(0, 8);
    },
    [allPeople]
  );

  // Handle percentage change for an owner
  const handlePercentageChange = useCallback(
    (personId: string, value: string) => {
      const numValue = parseFloat(value) || 0;
      const entries = Object.entries(ownerships);

      if (entries.length <= 1) {
        // Single owner always gets 100%
        onChange({ [personId]: 100 });
        return;
      }

      // Clamp to valid range
      const clampedPct = Math.max(0, Math.min(100, numValue));

      // Get sum of other owners
      const othersSum = entries
        .filter(([pid]) => pid !== personId)
        .reduce((sum, [, pct]) => sum + pct, 0);

      const result: Record<string, number> = {};

      // Scale other owners to fill the remainder
      const remainder = 100 - clampedPct;
      const scaleFactor = othersSum > 0 ? remainder / othersSum : 0;

      for (const [pid, pct] of entries) {
        if (pid === personId) {
          result[pid] = clampedPct;
        } else {
          result[pid] = pct * scaleFactor;
        }
      }

      onChange(result);
    },
    [ownerships, onChange]
  );

  // Handle removing an owner
  const handleRemoveOwner = useCallback(
    (personId: string) => {
      const newOwnerships = removeOwner(ownerships, personId);
      onChange(newOwnerships);
    },
    [ownerships, onChange]
  );

  // Handle adding a new owner
  const handleAddOwner = useCallback(
    (personId: string) => {
      const ownerCount = Object.keys(ownerships).length + 1;
      const equalShare = 100 / ownerCount;
      const newOwnerships = addOwner(ownerships, personId, equalShare);
      onChange(newOwnerships);
      setIsAddingOwner(false);
    },
    [ownerships, onChange]
  );

  // Handle normalizing to 100%
  const handleNormalize = useCallback(() => {
    onChange(normalizeOwnerships(ownerships));
  }, [ownerships, onChange]);

  const ownerEntries = Object.entries(ownerships);
  const sum = sumOwnerships(ownerships);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Owner rows */}
      {ownerEntries.map(([personId, percentage]) => (
        <div key={personId} className="flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-sm">{getPersonName(personId)}</div>

          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={percentage.toFixed(2)}
              onChange={(e) => handlePercentageChange(personId, e.target.value)}
              disabled={disabled}
              className="w-20 text-right tabular-nums"
              aria-label={`Ownership percentage for ${getPersonName(personId)}`}
            />
            <span className="text-muted-foreground text-sm">%</span>
          </div>

          {ownerEntries.length > 1 && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveOwner(personId)}
              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
              aria-label={`Remove ${getPersonName(personId)} as owner`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      ))}

      {/* Add owner section */}
      {!disabled && availablePeople.length > 0 && (
        <div className="pt-2">
          {isAddingOwner ? (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Select a person to add:</div>
              <div className="flex flex-wrap gap-2">
                {availablePeople.map((person) => (
                  <Button
                    key={person.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddOwner(person.id)}
                    className="h-7"
                  >
                    {person.name}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingOwner(false)}
                  className="h-7"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingOwner(true)}
              className="text-muted-foreground"
            >
              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add owner
            </Button>
          )}
        </div>
      )}

      {/* Validation status */}
      <div className="flex items-center justify-between pt-2 text-sm">
        <div
          className={cn(
            "font-medium",
            validation.valid
              ? "text-green-600 dark:text-green-400"
              : "text-amber-600 dark:text-amber-400"
          )}
        >
          Total: {sum.toFixed(2)}%
        </div>

        {!validation.valid && sum !== 100 && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNormalize}
            className="h-7 text-xs"
          >
            Normalize to 100%
          </Button>
        )}
      </div>

      {/* Error message */}
      {!validation.valid && <div className="text-destructive text-sm">{validation.error}</div>}
    </div>
  );
}
