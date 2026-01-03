"use client";

/**
 * ImportTable
 *
 * Side-by-side split table showing raw file data on the left and
 * parsed preview on the right. Updates in real-time as settings change.
 *
 * Layout:
 * - Desktop: Two tables side-by-side with vertical divider
 * - Mobile: Stacked vertically (raw above, preview below)
 */

import { AlertCircle, CheckCircle2, Clock, Copy, Eye, EyeOff } from "lucide-react";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ImportSummaryStats, PreviewTransaction } from "@/lib/import/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ImportTableProps {
	/** Raw CSV/OFX rows (including headers if present) */
	rawRows: string[][];
	/** Column headers for raw data */
	rawHeaders: string[];
	/** Parsed preview transactions */
	previewTransactions: PreviewTransaction[];
	/** Summary statistics */
	stats: ImportSummaryStats;
	/** Whether raw data has headers row */
	hasHeaders: boolean;
	/** Column mapping for highlighting mapped columns */
	columnMappings: Record<string, number>;
	/** Whether to show filtered (old) transactions */
	showFiltered?: boolean;
	/** Callback to toggle filtered visibility */
	onToggleFiltered?: () => void;
	/** Maximum rows to display (for performance) */
	maxDisplayRows?: number;
	/** Additional CSS classes */
	className?: string;
}

/** Status badge variants */
type RowStatus = "valid" | "invalid" | "duplicate" | "filtered";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get row status based on preview transaction state.
 */
function getRowStatus(tx: PreviewTransaction): RowStatus {
	return tx.status;
}

/**
 * Get status icon and color for a row.
 */
function getStatusDisplay(status: RowStatus): {
	icon: typeof CheckCircle2;
	color: string;
	label: string;
} {
	switch (status) {
		case "valid":
			return {
				icon: CheckCircle2,
				color: "text-green-600 dark:text-green-400",
				label: "Valid",
			};
		case "invalid":
			return {
				icon: AlertCircle,
				color: "text-destructive",
				label: "Error",
			};
		case "duplicate":
			return {
				icon: Copy,
				color: "text-amber-600 dark:text-amber-400",
				label: "Duplicate",
			};
		case "filtered":
			return {
				icon: Clock,
				color: "text-muted-foreground",
				label: "Old",
			};
	}
}

// ============================================================================
// Sub-Components
// ============================================================================

interface RawTableProps {
	rows: string[][];
	headers: string[];
	hasHeaders: boolean;
	columnMappings: Record<string, number>;
	maxRows: number;
}

/**
 * Raw data table (left side).
 */
function RawTable({ rows, headers, hasHeaders, columnMappings, maxRows }: RawTableProps) {
	// Build set of mapped column indices for highlighting
	const mappedIndices = useMemo(() => new Set(Object.values(columnMappings)), [columnMappings]);

	// Skip header row if present
	const dataRows = hasHeaders ? rows.slice(1) : rows;
	const displayRows = dataRows.slice(0, maxRows);

	return (
		<div className="flex-1 min-w-0 overflow-auto">
			<div className="text-xs font-medium text-muted-foreground mb-2 px-2">Raw File Data</div>
			<table className="w-full text-sm">
				<thead className="bg-muted/50 sticky top-0">
					<tr>
						<th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-10">
							#
						</th>
						{headers.map((header, idx) => (
							<th
								key={idx}
								className={cn(
									"px-2 py-1.5 text-left text-xs font-medium whitespace-nowrap",
									mappedIndices.has(idx) ? "text-foreground bg-primary/10" : "text-muted-foreground"
								)}
							>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border/50">
					{displayRows.map((row, rowIdx) => (
						<tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
							<td className="px-2 py-1 text-xs text-muted-foreground tabular-nums">{rowIdx + 1}</td>
							{row.map((cell, cellIdx) => (
								<td
									key={cellIdx}
									className={cn(
										"px-2 py-1 truncate max-w-[200px]",
										mappedIndices.has(cellIdx) && "bg-primary/5"
									)}
									title={cell}
								>
									<span className="font-mono text-xs">{cell || "—"}</span>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface PreviewTableProps {
	transactions: PreviewTransaction[];
	showFiltered: boolean;
	maxRows: number;
}

/**
 * Preview table (right side).
 */
function PreviewTable({ transactions, showFiltered, maxRows }: PreviewTableProps) {
	const displayTx = useMemo(() => {
		const filtered = showFiltered
			? transactions
			: transactions.filter((tx) => tx.status !== "filtered");
		return filtered.slice(0, maxRows);
	}, [transactions, showFiltered, maxRows]);

	return (
		<div className="flex-1 min-w-0 overflow-auto">
			<div className="text-xs font-medium text-muted-foreground mb-2 px-2">Import Preview</div>
			<table className="w-full text-sm">
				<thead className="bg-muted/50 sticky top-0">
					<tr>
						<th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-10">
							Status
						</th>
						<th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
							Date
						</th>
						<th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
							Description
						</th>
						<th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground">
							Amount
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border/50">
					{displayTx.map((tx) => {
						const status = getRowStatus(tx);
						const { icon: StatusIcon, color, label } = getStatusDisplay(status);
						const isExcluded = status === "filtered" || status === "duplicate";

						return (
							<tr
								key={tx.rowIndex}
								className={cn(
									"transition-colors",
									isExcluded ? "opacity-50 bg-muted/20" : "hover:bg-muted/30"
								)}
							>
								<td className="px-2 py-1">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className={cn("flex items-center", color)}>
													<StatusIcon className="h-4 w-4" />
												</div>
											</TooltipTrigger>
											<TooltipContent side="right" className="max-w-xs">
												<p className="font-medium">{label}</p>
												{tx.validationErrors.length > 0 && (
													<ul className="text-xs mt-1 text-destructive">
														{tx.validationErrors.map((err: string, i: number) => (
															<li key={i}>• {err}</li>
														))}
													</ul>
												)}
												{tx.status === "duplicate" && tx.duplicateOf && (
													<p className="text-xs mt-1">Matches existing transaction</p>
												)}
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</td>
								<td className="px-2 py-1 whitespace-nowrap tabular-nums">
									{tx.date || <span className="text-muted-foreground">—</span>}
								</td>
								<td className="px-2 py-1 truncate max-w-[250px]" title={tx.description}>
									{tx.description || <span className="text-muted-foreground">—</span>}
								</td>
								<td
									className={cn(
										"px-2 py-1 text-right tabular-nums whitespace-nowrap",
										tx.amount !== null && tx.amount < 0
											? "text-destructive"
											: "text-green-600 dark:text-green-400"
									)}
								>
									{tx.amount !== null ? (
										<span>
											{tx.amount < 0 ? "−" : "+"}
											{Math.abs(tx.amount / 100).toFixed(2)}
										</span>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ImportTable component.
 */
export function ImportTable({
	rawRows,
	rawHeaders,
	previewTransactions,
	stats,
	hasHeaders,
	columnMappings,
	showFiltered = true,
	onToggleFiltered,
	maxDisplayRows = 100,
	className,
}: ImportTableProps) {
	const truncated = rawRows.length > maxDisplayRows;

	return (
		<div className={cn("flex flex-col", className)}>
			{/* Filtered toggle */}
			{stats.filteredCount > 0 && onToggleFiltered && (
				<div className="flex items-center justify-end gap-2 mb-2 text-xs text-muted-foreground">
					<button
						type="button"
						onClick={onToggleFiltered}
						className="flex items-center gap-1 hover:text-foreground transition-colors"
					>
						{showFiltered ? (
							<>
								<Eye className="h-3.5 w-3.5" />
								Showing {stats.filteredCount} old transactions
							</>
						) : (
							<>
								<EyeOff className="h-3.5 w-3.5" />
								Hiding {stats.filteredCount} old transactions
							</>
						)}
					</button>
				</div>
			)}

			{/* Split table container */}
			<div
				className={cn(
					"flex border rounded-lg overflow-hidden bg-card",
					// Stack on mobile, side-by-side on desktop
					"flex-col lg:flex-row"
				)}
			>
				{/* Raw data (left) */}
				<RawTable
					rows={rawRows}
					headers={rawHeaders}
					hasHeaders={hasHeaders}
					columnMappings={columnMappings}
					maxRows={maxDisplayRows}
				/>

				{/* Vertical divider (desktop only) */}
				<div className="hidden lg:block w-px bg-border" />

				{/* Horizontal divider (mobile only) */}
				<div className="lg:hidden h-px bg-border" />

				{/* Preview (right) */}
				<PreviewTable
					transactions={previewTransactions}
					showFiltered={showFiltered}
					maxRows={maxDisplayRows}
				/>
			</div>

			{/* Truncation notice */}
			{truncated && (
				<div className="mt-2 text-xs text-muted-foreground text-center">
					Showing first {maxDisplayRows} of {rawRows.length} rows
				</div>
			)}
		</div>
	);
}
