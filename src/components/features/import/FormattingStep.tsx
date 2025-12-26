"use client";

/**
 * Formatting Step
 *
 * Step in import wizard for configuring number and date formats.
 */

import { cn } from "@/lib/utils";

/**
 * Import formatting options.
 */
export interface ImportFormatting {
  /** Thousands separator (e.g., "," or ".") */
  thousandSeparator: string;
  /** Decimal separator (e.g., "." or ",") */
  decimalSeparator: string;
  /** Date format string */
  dateFormat: string;
  /** Whether amounts are in cents (divide by 100) */
  amountInCents: boolean;
  /** Whether to negate amounts (switch debit/credit) */
  negateAmounts: boolean;
}

/**
 * Common date format options.
 */
export const DATE_FORMAT_OPTIONS = [
  { value: "yyyy-MM-dd", label: "2024-01-15 (ISO)" },
  { value: "MM/dd/yyyy", label: "01/15/2024 (US)" },
  { value: "dd/MM/yyyy", label: "15/01/2024 (EU)" },
  { value: "M/d/yyyy", label: "1/15/2024 (US short)" },
  { value: "d/M/yyyy", label: "15/1/2024 (EU short)" },
  { value: "MM-dd-yyyy", label: "01-15-2024" },
  { value: "dd-MM-yyyy", label: "15-01-2024" },
  { value: "yyyy/MM/dd", label: "2024/01/15" },
];

/**
 * Default formatting options.
 */
export const DEFAULT_FORMATTING: ImportFormatting = {
  thousandSeparator: ",",
  decimalSeparator: ".",
  dateFormat: "yyyy-MM-dd",
  amountInCents: false,
  negateAmounts: false,
};

export interface FormattingStepProps {
  /** Current formatting options */
  formatting: ImportFormatting;
  /** Callback when formatting changes */
  onFormattingChange: (formatting: ImportFormatting) => void;
  /** Sample date strings for format detection */
  sampleDates?: string[];
  /** Sample amount strings for format detection */
  sampleAmounts?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formatting step component.
 */
export function FormattingStep({
  formatting,
  onFormattingChange,
  sampleDates = [],
  sampleAmounts = [],
  className,
}: FormattingStepProps) {
  const handleChange = <K extends keyof ImportFormatting>(key: K, value: ImportFormatting[K]) => {
    onFormattingChange({
      ...formatting,
      [key]: value,
    });
  };

  // Auto-detect formatting based on samples
  const autoDetect = () => {
    const detected = { ...formatting };

    // Detect date format from samples
    if (sampleDates.length > 0) {
      const sample = sampleDates[0];

      if (/^\d{4}-\d{2}-\d{2}/.test(sample)) {
        detected.dateFormat = "yyyy-MM-dd";
      } else if (/^\d{2}\/\d{2}\/\d{4}/.test(sample)) {
        // Ambiguous - check if first part > 12 to determine US vs EU
        const firstPart = parseInt(sample.split("/")[0], 10);
        detected.dateFormat = firstPart > 12 ? "dd/MM/yyyy" : "MM/dd/yyyy";
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(sample)) {
        const firstPart = parseInt(sample.split("/")[0], 10);
        detected.dateFormat = firstPart > 12 ? "d/M/yyyy" : "M/d/yyyy";
      }
    }

    // Detect number format from samples
    if (sampleAmounts.length > 0) {
      const sample = sampleAmounts[0].replace(/[^0-9.,]/g, "");

      // Check for European format (1.234,56)
      if (/\d+\.\d{3}/.test(sample) && sample.includes(",")) {
        detected.thousandSeparator = ".";
        detected.decimalSeparator = ",";
      }
      // US format (1,234.56)
      else if (/\d+,\d{3}/.test(sample) && sample.includes(".")) {
        detected.thousandSeparator = ",";
        detected.decimalSeparator = ".";
      }
    }

    onFormattingChange(detected);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Format Options</h3>
          <p className="text-muted-foreground text-sm">Configure how to parse dates and numbers</p>
        </div>
        <button
          type="button"
          onClick={autoDetect}
          className="hover:bg-accent rounded px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Auto-detect
        </button>
      </div>

      {/* Date Format */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date Format</label>
        <select
          value={formatting.dateFormat}
          onChange={(e) => handleChange("dateFormat", e.target.value)}
          className="w-full rounded border bg-transparent px-3 py-2 text-sm"
        >
          {DATE_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {sampleDates.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Sample: {sampleDates.slice(0, 3).join(", ")}
          </p>
        )}
      </div>

      {/* Number Format */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Thousands Separator</label>
          <select
            value={formatting.thousandSeparator}
            onChange={(e) => handleChange("thousandSeparator", e.target.value)}
            className="w-full rounded border bg-transparent px-3 py-2 text-sm"
          >
            <option value=",">Comma (1,234.56)</option>
            <option value=".">Period (1.234,56)</option>
            <option value=" ">Space (1 234.56)</option>
            <option value="">None (1234.56)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Decimal Separator</label>
          <select
            value={formatting.decimalSeparator}
            onChange={(e) => handleChange("decimalSeparator", e.target.value)}
            className="w-full rounded border bg-transparent px-3 py-2 text-sm"
          >
            <option value=".">Period (.)</option>
            <option value=",">Comma (,)</option>
          </select>
        </div>
      </div>

      {sampleAmounts.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Sample amounts: {sampleAmounts.slice(0, 3).join(", ")}
        </p>
      )}

      {/* Amount Options */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Amount Options</label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={formatting.amountInCents}
            onChange={(e) => handleChange("amountInCents", e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <span className="text-sm">Amounts are in cents (divide by 100)</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={formatting.negateAmounts}
            onChange={(e) => handleChange("negateAmounts", e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <span className="text-sm">Negate amounts (switch income/expense)</span>
        </label>
      </div>

      {/* Preview */}
      <div className="rounded-lg border p-4">
        <h4 className="mb-2 text-sm font-medium">Preview</h4>
        <div className="text-muted-foreground grid gap-2 text-sm">
          <div className="flex justify-between">
            <span>Date format:</span>
            <span className="font-mono">{formatting.dateFormat}</span>
          </div>
          <div className="flex justify-between">
            <span>Number format:</span>
            <span className="font-mono">
              1{formatting.thousandSeparator}234{formatting.decimalSeparator}56
            </span>
          </div>
          {formatting.amountInCents && (
            <div className="flex justify-between">
              <span>Amount conversion:</span>
              <span>÷ 100</span>
            </div>
          )}
          {formatting.negateAmounts && (
            <div className="flex justify-between">
              <span>Amount sign:</span>
              <span>Negated</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
