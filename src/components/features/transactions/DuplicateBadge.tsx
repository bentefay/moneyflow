"use client";

/**
 * Duplicate Badge
 *
 * Indicator badge for potential duplicate transactions.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface DuplicateBadgeProps {
	/** Confidence score (0-1) */
	confidence?: number;
	/** ID of the suspected original transaction */
	duplicateOfId?: string;
	/** Description of the original transaction (for tooltip) */
	originalDescription?: string;
	/** Date of the original transaction */
	originalDate?: string;
	/** Amount of the original transaction */
	originalAmount?: number;
	/** Callback when clicking to resolve */
	onResolve?: (action: "keep" | "delete") => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Duplicate badge component.
 */
export function DuplicateBadge({
	confidence = 0.7,
	// Reserved for future navigation to original transaction
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	duplicateOfId,
	originalDescription,
	originalDate,
	originalAmount,
	onResolve,
	className,
}: DuplicateBadgeProps) {
	const [showTooltip, setShowTooltip] = useState(false);

	const confidencePercent = Math.round(confidence * 100);
	const confidenceLabel =
		confidencePercent >= 90 ? "High" : confidencePercent >= 70 ? "Medium" : "Low";

	return (
		<div className={cn("relative inline-flex", className)}>
			<button
				type="button"
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				onClick={() => setShowTooltip(!showTooltip)}
				className={cn(
					"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
					"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
					"hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
					"transition-colors"
				)}
			>
				<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
					/>
				</svg>
				<span>Dup?</span>
			</button>

			{/* Tooltip */}
			{showTooltip && (
				<div
					className={cn(
						"absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2",
						"w-64 rounded-lg border bg-popover p-3 shadow-lg",
						"fade-in-0 zoom-in-95 animate-in"
					)}
				>
					<div className="text-sm">
						<p className="font-medium">Potential Duplicate</p>
						<p className="mt-1 text-muted-foreground text-xs">
							{confidenceLabel} confidence ({confidencePercent}%)
						</p>

						{(originalDescription || originalDate || originalAmount !== undefined) && (
							<div className="mt-2 space-y-1 border-t pt-2">
								<p className="font-medium text-xs">Original transaction:</p>
								{originalDate && (
									<p className="text-muted-foreground text-xs">Date: {originalDate}</p>
								)}
								{originalDescription && (
									<p className="truncate text-muted-foreground text-xs">{originalDescription}</p>
								)}
								{originalAmount !== undefined && (
									<p className="text-muted-foreground text-xs">
										Amount:{" "}
										{originalAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</p>
								)}
							</div>
						)}

						{onResolve && (
							<div className="mt-3 flex gap-2 border-t pt-2">
								<button
									type="button"
									onClick={() => {
										onResolve("keep");
										setShowTooltip(false);
									}}
									className="flex-1 rounded bg-green-100 px-2 py-1 font-medium text-green-700 text-xs hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
								>
									Keep Both
								</button>
								<button
									type="button"
									onClick={() => {
										onResolve("delete");
										setShowTooltip(false);
									}}
									className="flex-1 rounded bg-red-100 px-2 py-1 font-medium text-red-700 text-xs hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
								>
									Delete This
								</button>
							</div>
						)}
					</div>

					{/* Arrow */}
					<div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-r border-b bg-popover" />
				</div>
			)}
		</div>
	);
}

/**
 * Compact duplicate indicator (just the icon).
 */
export function DuplicateIndicator({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex h-5 w-5 items-center justify-center rounded-full",
				"bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
				className
			)}
			title="Potential duplicate"
		>
			<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
				/>
			</svg>
		</span>
	);
}
