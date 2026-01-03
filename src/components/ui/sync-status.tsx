/**
 * SyncStatus Component
 *
 * Shows the current synchronization status with visual indicators:
 * - idle: Green circle with cloud icon, "Saved"
 * - saving: Yellow circle with upload icon + pulse, "Saving..."
 * - syncing: Blue circle with refresh icon + pulse, "Syncing..."
 * - error: Red circle with cloud-off icon, "Sync error"
 *
 * Supports two modes:
 * - Default: Small dot with optional text label
 * - Icon mode: Larger colored circle with icon inside (for collapsed sidebar)
 *
 * Also handles beforeunload warning for unsaved changes.
 */

import { Cloud, CloudOff, CloudUpload, type LucideIcon, RefreshCw } from "lucide-react";
import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SyncState } from "@/lib/sync";
import { cn } from "@/lib/utils";

export interface SyncStatusProps {
	/** Current sync state */
	state: SyncState;
	/** Whether there are unsaved local changes */
	hasUnsavedChanges?: boolean;
	/** Additional CSS classes */
	className?: string;
	/** Show text label alongside indicator */
	showLabel?: boolean;
	/** Use icon mode (larger circle with icon inside) */
	iconMode?: boolean;
}

interface StateConfig {
	label: string;
	dotColor: string;
	bgColor: string;
	textColor: string;
	showSpinner: boolean;
	icon: LucideIcon;
}

const stateConfig: Record<SyncState, StateConfig> = {
	idle: {
		label: "Saved",
		dotColor: "bg-green-500",
		bgColor: "bg-green-100 dark:bg-green-900/30",
		textColor: "text-green-600 dark:text-green-400",
		showSpinner: false,
		icon: Cloud,
	},
	saving: {
		label: "Saving...",
		dotColor: "bg-yellow-500",
		bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
		textColor: "text-yellow-600 dark:text-yellow-400",
		showSpinner: true,
		icon: CloudUpload,
	},
	syncing: {
		label: "Syncing...",
		dotColor: "bg-blue-500",
		bgColor: "bg-blue-100 dark:bg-blue-900/30",
		textColor: "text-blue-600 dark:text-blue-400",
		showSpinner: true,
		icon: RefreshCw,
	},
	error: {
		label: "Sync error",
		dotColor: "bg-red-500",
		bgColor: "bg-red-100 dark:bg-red-900/30",
		textColor: "text-red-600 dark:text-red-400",
		showSpinner: false,
		icon: CloudOff,
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
	iconMode = false,
}: SyncStatusProps) {
	const config = stateConfig[state];

	// Override state if we have unsaved changes but state is idle
	// (this happens when IndexedDB write succeeded but server sync hasn't run yet)
	const displayState = hasUnsavedChanges && state === "idle" ? stateConfig.saving : config;

	// Icon mode: larger circle with icon inside
	if (iconMode) {
		const Icon = displayState.icon;
		const iconElement = (
			<div
				className={cn(
					"relative flex h-8 w-8 items-center justify-center rounded-full",
					displayState.bgColor
				)}
				role="status"
				aria-label={displayState.label}
			>
				{/* Pulsing ring for active states */}
				{displayState.showSpinner && (
					<span
						className={cn(
							"absolute inset-0 animate-ping rounded-full opacity-50",
							displayState.bgColor
						)}
					/>
				)}
				<Icon
					className={cn(
						"relative h-4 w-4",
						displayState.textColor,
						displayState.showSpinner && "animate-pulse"
					)}
				/>
			</div>
		);

		// With label: show icon + text inline (no tooltip needed)
		if (showLabel) {
			return (
				<div className={cn("flex items-center gap-2 text-sm", className)}>
					{iconElement}
					<span className="select-none text-muted-foreground">{displayState.label}</span>
				</div>
			);
		}

		// Without label: wrap in tooltip
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<div className={className}>{iconElement}</div>
				</TooltipTrigger>
				<TooltipContent side="right">{displayState.label}</TooltipContent>
			</Tooltip>
		);
	}

	// Default mode: small dot with optional label
	return (
		<div
			className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}
			role="status"
			aria-live="polite"
		>
			{/* Status dot with optional spinner */}
			<div className="relative flex items-center justify-center">
				{/* Pulsing ring for active states */}
				{displayState.showSpinner && (
					<span
						className={cn(
							"absolute h-3 w-3 animate-ping rounded-full opacity-75",
							displayState.dotColor
						)}
					/>
				)}
				{/* Solid dot */}
				<span className={cn("relative h-2 w-2 rounded-full", displayState.dotColor)} />
			</div>

			{/* Text label */}
			{showLabel && <span className="select-none">{displayState.label}</span>}
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
