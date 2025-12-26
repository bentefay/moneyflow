"use client";

/**
 * Person Allocation Cell
 *
 * Displays and allows editing of expense allocations per person.
 * Shows percentage input for each person.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface PersonData {
  id: string;
  name: string;
}

export interface AllocationData {
  personId: string;
  percentage: number;
}

export interface PersonAllocationCellProps {
  /** Current allocations */
  allocations: AllocationData[];
  /** All available people for allocation */
  availablePeople?: PersonData[];
  /** Whether the cell is in edit mode */
  isEditing?: boolean;
  /** Callback when allocations change */
  onChange?: (allocations: AllocationData[]) => void;
  /** Callback when editing starts */
  onEditStart?: () => void;
  /** Callback when editing ends */
  onEditEnd?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format allocation for display.
 */
function formatAllocation(allocation: AllocationData, people: PersonData[]): string {
  const person = people.find((p) => p.id === allocation.personId);
  const name = person?.name ?? "Unknown";
  return `${name}: ${allocation.percentage}%`;
}

/**
 * Person allocation cell component with inline editing.
 */
export function PersonAllocationCell({
  allocations,
  availablePeople = [],
  isEditing = false,
  onChange,
  onEditStart,
  onEditEnd,
  className,
}: PersonAllocationCellProps) {
  const [localAllocations, setLocalAllocations] = useState<AllocationData[]>(allocations);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local allocations with prop
  useEffect(() => {
    setLocalAllocations(allocations);
  }, [allocations]);

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
  }, [isEditing, localAllocations]);

  const handleDoubleClick = () => {
    onEditStart?.();
  };

  const handleSave = () => {
    // Validate allocations sum to 100%
    const total = localAllocations.reduce((sum, a) => sum + a.percentage, 0);
    if (total !== 100 && localAllocations.length > 0) {
      // Normalize allocations to sum to 100%
      const normalized = localAllocations.map((a) => ({
        ...a,
        percentage: Math.round((a.percentage / total) * 100),
      }));
      // Fix rounding errors
      const diff = 100 - normalized.reduce((sum, a) => sum + a.percentage, 0);
      if (diff !== 0 && normalized.length > 0) {
        normalized[0].percentage += diff;
      }
      setLocalAllocations(normalized);
      onChange?.(normalized);
    } else {
      onChange?.(localAllocations);
    }
    onEditEnd?.();
  };

  const handlePercentageChange = (personId: string, percentage: number) => {
    setLocalAllocations((prev) => {
      const existing = prev.find((a) => a.personId === personId);
      if (existing) {
        return prev.map((a) => (a.personId === personId ? { ...a, percentage } : a));
      } else {
        return [...prev, { personId, percentage }];
      }
    });
  };

  const handleRemovePerson = (personId: string) => {
    setLocalAllocations((prev) => prev.filter((a) => a.personId !== personId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setLocalAllocations(allocations);
      onEditEnd?.();
    }
  };

  if (isEditing) {
    const allocatedPersonIds = new Set(localAllocations.map((a) => a.personId));
    const unallocatedPeople = availablePeople.filter((p) => !allocatedPersonIds.has(p.id));

    return (
      <div ref={containerRef} className={cn("w-64", className)}>
        <div
          className="bg-background rounded-md border p-3 shadow-lg"
          onKeyDown={handleKeyDown}
        >
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide">Allocations</h4>

          {/* Current allocations */}
          <div className="space-y-2">
            {localAllocations.map((allocation) => {
              const person = availablePeople.find((p) => p.id === allocation.personId);
              return (
                <div key={allocation.personId} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{person?.name ?? "Unknown"}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={allocation.percentage}
                      onChange={(e) =>
                        handlePercentageChange(allocation.personId, parseInt(e.target.value) || 0)
                      }
                      className="w-14 rounded border px-2 py-1 text-right text-sm"
                    />
                    <span className="text-muted-foreground text-sm">%</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(allocation.personId)}
                      className="text-muted-foreground hover:text-foreground ml-1"
                      aria-label={`Remove ${person?.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total indicator */}
          {localAllocations.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total:</span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    localAllocations.reduce((sum, a) => sum + a.percentage, 0) !== 100 &&
                      "text-destructive"
                  )}
                >
                  {localAllocations.reduce((sum, a) => sum + a.percentage, 0)}%
                </span>
              </div>
            </div>
          )}

          {/* Add person */}
          {unallocatedPeople.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handlePercentageChange(e.target.value, 0);
                    e.target.value = "";
                  }
                }}
                className="w-full rounded border px-2 py-1 text-sm"
                defaultValue=""
              >
                <option value="">Add person...</option>
                {unallocatedPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Display mode
  if (allocations.length === 0) {
    return (
      <div
        onDoubleClick={handleDoubleClick}
        className={cn(
          "text-muted-foreground cursor-pointer text-sm italic",
          "hover:text-foreground transition-colors",
          className
        )}
      >
        Not allocated
      </div>
    );
  }

  // Show condensed view
  const primaryAllocation = allocations.reduce((max, a) => (a.percentage > max.percentage ? a : max));
  const otherCount = allocations.length - 1;

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        "cursor-pointer text-sm",
        "hover:opacity-80 transition-opacity",
        className
      )}
    >
      <span>{formatAllocation(primaryAllocation, availablePeople)}</span>
      {otherCount > 0 && (
        <span className="text-muted-foreground ml-1">+{otherCount}</span>
      )}
    </div>
  );
}
