/**
 * SyncStatus Component
 *
 * Shows the current synchronization status with visual indicators:
 * - idle: Green dot, "Saved"
 * - saving: Yellow dot + spinner, "Saving..."
 * - syncing: Blue dot + spinner, "Syncing..."
 * - error: Red dot, "Sync error"
 *
 * Also handles beforeunload warning for unsaved changes.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { SyncState } from "@/lib/sync";

export interface SyncStatusProps {
  /** Current sync state */
  state: SyncState;
  /** Whether there are unsaved local changes */
  hasUnsavedChanges?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show text label alongside indicator */
  showLabel?: boolean;
}

const stateConfig: Record<
  SyncState,
  { label: string; dotColor: string; showSpinner: boolean }
> = {
  idle: {
    label: "Saved",
    dotColor: "bg-green-500",
    showSpinner: false,
  },
  saving: {
    label: "Saving...",
    dotColor: "bg-yellow-500",
    showSpinner: true,
  },
  syncing: {
    label: "Syncing...",
    dotColor: "bg-blue-500",
    showSpinner: true,
  },
  error: {
    label: "Sync error",
    dotColor: "bg-red-500",
    showSpinner: false,
  },
};

/**
 * Visual indicator for synchronization status.
 */
export function SyncStatus({
  state,
  hasUnsavedChanges = false,
  className,
  showLabel = true,
}: SyncStatusProps) {
  const config = stateConfig[state];

  // Override label if we have unsaved changes but state is idle
  // (this happens when IndexedDB write succeeded but server sync hasn't run yet)
  const displayState =
    hasUnsavedChanges && state === "idle"
      ? { ...stateConfig.saving, label: "Saving..." }
      : config;

  return (
    <div
      className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      {/* Status dot with optional spinner */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring for active states */}
        {displayState.showSpinner && (
          <span
            className={cn(
              "absolute h-3 w-3 rounded-full opacity-75 animate-ping",
              displayState.dotColor
            )}
          />
        )}
        {/* Solid dot */}
        <span
          className={cn(
            "relative h-2 w-2 rounded-full",
            displayState.dotColor
          )}
        />
      </div>

      {/* Text label */}
      {showLabel && (
        <span className="select-none">{displayState.label}</span>
      )}
    </div>
  );
}

/**
 * Hook to manage beforeunload warning for unsaved changes.
 * Returns a ref callback to track sync state.
 */
export function useBeforeUnloadWarning(hasUnsavedChanges: boolean) {
  React.useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);
}
