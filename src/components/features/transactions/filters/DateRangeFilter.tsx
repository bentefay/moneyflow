"use client";

/**
 * Date Range Filter
 *
 * Date range selector with preset options like "Last 14 days", "MTD", etc.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface DateRange {
  start: string | null; // ISO date string
  end: string | null;
}

export interface DateRangePreset {
  label: string;
  getValue: () => DateRange;
}

export interface DateRangeFilterProps {
  /** Current date range value */
  value: DateRange;
  /** Callback when date range changes */
  onChange: (range: DateRange) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get date string in YYYY-MM-DD format
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get preset date ranges.
 */
function getPresets(): DateRangePreset[] {
  const today = new Date();
  
  return [
    {
      label: "Last 14 days",
      getValue: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 14);
        return { start: formatDate(start), end: formatDate(today) };
      },
    },
    {
      label: "Last 30 days",
      getValue: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return { start: formatDate(start), end: formatDate(today) };
      },
    },
    {
      label: "Last 90 days",
      getValue: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 90);
        return { start: formatDate(start), end: formatDate(today) };
      },
    },
    {
      label: "Month to date",
      getValue: () => {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: formatDate(start), end: formatDate(today) };
      },
    },
    {
      label: "Last month",
      getValue: () => {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: formatDate(start), end: formatDate(end) };
      },
    },
    {
      label: "Year to date",
      getValue: () => {
        const start = new Date(today.getFullYear(), 0, 1);
        return { start: formatDate(start), end: formatDate(today) };
      },
    },
    {
      label: "Last year",
      getValue: () => {
        const start = new Date(today.getFullYear() - 1, 0, 1);
        const end = new Date(today.getFullYear() - 1, 11, 31);
        return { start: formatDate(start), end: formatDate(end) };
      },
    },
    {
      label: "All time",
      getValue: () => ({ start: null, end: null }),
    },
  ];
}

/**
 * Date range filter component.
 */
export function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start ?? "");
  const [customEnd, setCustomEnd] = useState(value.end ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  const presets = getPresets();

  // Find current preset label
  const currentPresetLabel = presets.find((p) => {
    const preset = p.getValue();
    return preset.start === value.start && preset.end === value.end;
  })?.label;

  // Format display text
  const displayText = currentPresetLabel ?? 
    (value.start && value.end 
      ? `${value.start} - ${value.end}` 
      : value.start || value.end || "All time");

  // Sync custom inputs with value
  useEffect(() => {
    setCustomStart(value.start ?? "");
    setCustomEnd(value.end ?? "");
  }, [value]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handlePresetClick = (preset: DateRangePreset) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    onChange({
      start: customStart || null,
      end: customEnd || null,
    });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
          "hover:bg-accent focus:ring-primary focus:outline-none focus:ring-2",
          isOpen && "ring-primary ring-2"
        )}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{displayText}</span>
        <svg
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-72 rounded-lg border shadow-lg">
          {/* Presets */}
          <div className="border-b p-2">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Quick Select</div>
            <div className="grid grid-cols-2 gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-sm",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                    currentPresetLabel === preset.label && "bg-accent font-medium"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom range */}
          <div className="p-2">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Custom Range</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-muted-foreground mb-1 block text-xs">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-muted-foreground mb-1 block text-xs">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyCustom}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 w-full rounded px-3 py-1.5 text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
