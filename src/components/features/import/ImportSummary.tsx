"use client";

/**
 * ImportSummary
 *
 * Displays summary statistics for the import preview:
 * - Total rows in file
 * - Valid transactions (will be imported)
 * - Rows with errors
 * - Duplicate transactions
 * - Filtered (old) transactions
 */

import { AlertCircle, CheckCircle2, Clock, Copy, FileText } from "lucide-react";
import type { ImportSummaryStats } from "@/lib/import/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ImportSummaryProps {
	/** Import statistics */
	stats: ImportSummaryStats;
	/** Whether import can proceed (has valid transactions) */
	canImport: boolean;
	/** Additional CSS classes */
	className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatCardProps {
	label: string;
	value: number;
	icon: typeof CheckCircle2;
	iconColor: string;
	bgColor?: string;
	detail?: string;
}

function StatCard({ label, value, icon: Icon, iconColor, bgColor, detail }: StatCardProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
				bgColor || "bg-card"
			)}
		>
			<div className={cn("rounded-full p-2 bg-muted/50", iconColor)}>
				<Icon className="h-4 w-4" />
			</div>
			<div className="flex flex-col">
				<span className="text-2xl font-semibold tabular-nums">{value}</span>
				<span className="text-xs text-muted-foreground">{label}</span>
				{detail && <span className="text-xs text-muted-foreground/70 mt-0.5">{detail}</span>}
			</div>
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ImportSummary component.
 */
export function ImportSummary({ stats, canImport, className }: ImportSummaryProps) {
	const { totalRows, validCount, errorCount, duplicateCount, filteredCount } = stats;

	// Calculate what will actually be imported
	const willImportCount = validCount - duplicateCount - filteredCount;

	return (
		<div className={cn("space-y-4", className)}>
			{/* Primary stats */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
				<StatCard
					label="Total Rows"
					value={totalRows}
					icon={FileText}
					iconColor="text-foreground"
				/>
				<StatCard
					label="Valid"
					value={validCount}
					icon={CheckCircle2}
					iconColor="text-green-600 dark:text-green-400"
				/>
				<StatCard
					label="Errors"
					value={errorCount}
					icon={AlertCircle}
					iconColor="text-destructive"
					bgColor={errorCount > 0 ? "bg-destructive/5 border-destructive/20" : undefined}
				/>
				<StatCard
					label="Duplicates"
					value={duplicateCount}
					icon={Copy}
					iconColor="text-amber-600 dark:text-amber-400"
					detail={duplicateCount > 0 ? "Will skip" : undefined}
				/>
				<StatCard
					label="Old"
					value={filteredCount}
					icon={Clock}
					iconColor="text-muted-foreground"
					detail={filteredCount > 0 ? "Outside date range" : undefined}
				/>
			</div>

			{/* Import summary message */}
			<div
				className={cn(
					"rounded-lg border px-4 py-3",
					canImport
						? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
						: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
				)}
			>
				{canImport ? (
					<p className="text-sm text-green-800 dark:text-green-200">
						<span className="font-medium">{willImportCount}</span> transaction
						{willImportCount !== 1 ? "s" : ""} will be imported
						{duplicateCount > 0 && (
							<span className="text-green-700 dark:text-green-300">
								{" "}
								({duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""} skipped)
							</span>
						)}
						{filteredCount > 0 && (
							<span className="text-green-700 dark:text-green-300">
								{" "}
								({filteredCount} old transaction{filteredCount !== 1 ? "s" : ""} filtered)
							</span>
						)}
					</p>
				) : (
					<p className="text-sm text-amber-800 dark:text-amber-200">
						{errorCount === totalRows ? (
							<>
								No valid transactions found. Please check your column mappings and formatting
								settings.
							</>
						) : (
							<>
								{errorCount > 0 && (
									<>
										<span className="font-medium">{errorCount}</span> row
										{errorCount !== 1 ? "s have" : " has"} errors.{" "}
									</>
								)}
								{willImportCount === 0 && validCount > 0 && (
									<>All valid transactions are either duplicates or filtered by date.</>
								)}
							</>
						)}
					</p>
				)}
			</div>
		</div>
	);
}
