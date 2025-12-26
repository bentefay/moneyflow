/**
 * ErrorAlert Component
 *
 * Displays user-friendly error messages with optional technical details.
 * Includes a collapsible section for detailed error information.
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ErrorAlertProps {
  /** User-friendly error title */
  title?: string;

  /** User-friendly error message */
  message: string;

  /** Technical error details (shown in collapsible section) */
  details?: string;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ErrorAlert({
  title = "Something went wrong",
  message,
  details,
  className,
}: ErrorAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn("w-full rounded-lg border border-red-500/30 bg-red-500/10", className)}
      role="alert"
    >
      {/* Main error message */}
      <div className="flex items-start gap-3 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div className="flex-1 space-y-1">
          <p className="font-medium text-red-600 dark:text-red-400">{title}</p>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">{message}</p>
        </div>
      </div>

      {/* Collapsible technical details */}
      {details && (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between border-t border-red-500/20 px-4 py-2 text-xs text-red-500/70 transition-colors hover:bg-red-500/5 hover:text-red-500"
            aria-expanded={isExpanded}
            aria-controls="error-details"
          >
            <span>Technical details</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {isExpanded && (
            <div id="error-details" className="border-t border-red-500/20 bg-red-500/5 p-4">
              <pre className="overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap text-red-600/70 dark:text-red-400/70">
                {details}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
