"use client";

/**
 * DuplicatesTab
 *
 * Tab content for configuring duplicate detection and old transaction filtering.
 * Combines:
 * - Date matching mode (exact vs within X days)
 * - Description matching mode (exact vs similar with threshold)
 * - Old transaction filter (three modes + cutoff type/value)
 */

import { CalendarRange, Clock, Copy, FileText } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Transaction } from "@/lib/crdt/schema";
import { getFilterModeDescription } from "@/lib/import/filter";
import type {
	CutoffType,
	DuplicateDetectionSettings,
	FilterConfig,
	OldTransactionMode,
} from "@/lib/import/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface DuplicatesTabProps {
	/** Current duplicate detection settings */
	duplicateDetection: DuplicateDetectionSettings;
	/** Callback when duplicate detection settings change */
	onDuplicateDetectionChange: (updates: Partial<DuplicateDetectionSettings>) => void;
	/** Current old transaction filter settings */
	oldTransactionFilter: FilterConfig;
	/** Callback when filter settings change */
	onFilterChange: (updates: Partial<FilterConfig>) => void;
	/** Existing transactions for calculating default cutoff date */
	existingTransactions: Transaction[];
	/** Statistics for display */
	duplicateCount?: number;
	filteredCount?: number;
	/** Additional CSS classes */
	className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the newest transaction date for a specific account.
 */
function findNewestDateForAccount(
	transactions: Transaction[],
	accountId: string | null
): string | null {
	const filtered = transactions.filter(
		(tx) => !tx.deletedAt && (accountId === null || tx.accountId === accountId)
	);
	if (filtered.length === 0) return null;

	return filtered.reduce((newest, tx) => {
		return tx.date > newest ? tx.date : newest;
	}, filtered[0].date);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DuplicatesTab component.
 */
export function DuplicatesTab({
	duplicateDetection,
	onDuplicateDetectionChange,
	oldTransactionFilter,
	onFilterChange,
	existingTransactions,
	duplicateCount = 0,
	filteredCount = 0,
	className,
}: DuplicatesTabProps) {
	// Calculate default cutoff date (newest existing transaction)
	const defaultCutoffDate = useMemo(() => {
		const newest = findNewestDateForAccount(existingTransactions, null);
		return newest ?? new Date().toISOString().split("T")[0];
	}, [existingTransactions]);

	// Handlers for duplicate detection
	const handleDateModeChange = useCallback(
		(value: string) => {
			onDuplicateDetectionChange({
				dateMatchMode: value as "exact" | "within",
			});
		},
		[onDuplicateDetectionChange]
	);

	const handleDateDaysChange = useCallback(
		(value: number[]) => {
			onDuplicateDetectionChange({
				maxDateDiffDays: value[0],
			});
		},
		[onDuplicateDetectionChange]
	);

	const handleDescModeChange = useCallback(
		(value: string) => {
			onDuplicateDetectionChange({
				descriptionMatchMode: value as "exact" | "similar",
			});
		},
		[onDuplicateDetectionChange]
	);

	const handleSimilarityChange = useCallback(
		(value: number[]) => {
			onDuplicateDetectionChange({
				minDescriptionSimilarity: value[0] / 100,
			});
		},
		[onDuplicateDetectionChange]
	);

	// Handlers for old transaction filter
	const handleFilterModeChange = useCallback(
		(mode: string) => {
			onFilterChange({ mode: mode as OldTransactionMode });
		},
		[onFilterChange]
	);

	const handleCutoffTypeChange = useCallback(
		(type: string) => {
			const newType = type as CutoffType;
			const updates: Partial<FilterConfig> = { cutoffType: newType };
			// Set default cutoff date when switching to date mode
			if (newType === "date" && !oldTransactionFilter.cutoffDate) {
				updates.cutoffDate = defaultCutoffDate;
			}
			onFilterChange(updates);
		},
		[onFilterChange, oldTransactionFilter.cutoffDate, defaultCutoffDate]
	);

	const handleCutoffDaysChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = parseInt(e.target.value, 10);
			if (!isNaN(value) && value >= 0) {
				onFilterChange({ cutoffDays: value });
			}
		},
		[onFilterChange]
	);

	const handleCutoffDateChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onFilterChange({ cutoffDate: e.target.value || null });
		},
		[onFilterChange]
	);

	return (
		<div className={cn("space-y-6", className)}>
			{/* Duplicate Detection Section */}
			<div className="space-y-4">
				<div className="flex items-center gap-2">
					<Copy className="h-4 w-4 text-muted-foreground" />
					<Label className="text-base font-medium">Duplicate Detection</Label>
					{duplicateCount > 0 && (
						<span className="text-sm text-amber-600 dark:text-amber-400">
							{duplicateCount} found
						</span>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					Configure how duplicates are identified when importing
				</p>

				{/* Date Matching */}
				<div className="rounded-lg border p-4 space-y-3">
					<div className="flex items-center gap-2">
						<CalendarRange className="h-4 w-4 text-muted-foreground" />
						<Label>Date Matching</Label>
					</div>

					<RadioGroup value={duplicateDetection.dateMatchMode} onValueChange={handleDateModeChange}>
						<label
							htmlFor="date-exact"
							className="flex items-center space-x-3 cursor-pointer rounded-md hover:bg-muted/30 transition-colors"
						>
							<RadioGroupItem value="exact" id="date-exact" />
							<span className="text-sm">Exact date match only</span>
						</label>
						<label
							htmlFor="date-within"
							className="flex items-center space-x-3 cursor-pointer rounded-md hover:bg-muted/30 transition-colors"
						>
							<RadioGroupItem value="within" id="date-within" />
							<span className="text-sm">Allow dates within range</span>
						</label>
					</RadioGroup>

					{duplicateDetection.dateMatchMode === "within" && (
						<div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Allow dates within:</span>
								<span className="font-medium">{duplicateDetection.maxDateDiffDays} days</span>
							</div>
							<Slider
								value={[duplicateDetection.maxDateDiffDays]}
								onValueChange={handleDateDaysChange}
								min={1}
								max={14}
								step={1}
								className="w-full"
							/>
						</div>
					)}
				</div>

				{/* Description Matching */}
				<div className="rounded-lg border p-4 space-y-3">
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4 text-muted-foreground" />
						<Label>Description Matching</Label>
					</div>

					<RadioGroup
						value={duplicateDetection.descriptionMatchMode}
						onValueChange={handleDescModeChange}
					>
						<label
							htmlFor="desc-exact"
							className="flex items-center space-x-3 cursor-pointer rounded-md hover:bg-muted/30 transition-colors"
						>
							<RadioGroupItem value="exact" id="desc-exact" />
							<span className="text-sm">Exact description match only</span>
						</label>
						<label
							htmlFor="desc-similar"
							className="flex items-center space-x-3 cursor-pointer rounded-md hover:bg-muted/30 transition-colors"
						>
							<RadioGroupItem value="similar" id="desc-similar" />
							<span className="text-sm">Allow similar descriptions</span>
						</label>
					</RadioGroup>

					{duplicateDetection.descriptionMatchMode === "similar" && (
						<div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Minimum similarity:</span>
								<span className="font-medium">
									{Math.round(duplicateDetection.minDescriptionSimilarity * 100)}%
								</span>
							</div>
							<Slider
								value={[Math.round(duplicateDetection.minDescriptionSimilarity * 100)]}
								onValueChange={handleSimilarityChange}
								min={50}
								max={100}
								step={5}
								className="w-full"
							/>
							<p className="text-xs text-muted-foreground">
								Lower values match more loosely (catch more variations)
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Divider */}
			<div className="border-t" />

			{/* Old Transaction Filter Section */}
			<div className="space-y-4">
				<div className="flex items-center gap-2">
					<Clock className="h-4 w-4 text-muted-foreground" />
					<Label className="text-base font-medium">How to Handle Old Transactions</Label>
					{filteredCount > 0 && (
						<span className="text-sm text-muted-foreground">{filteredCount} affected</span>
					)}
				</div>

				{/* Cutoff type selector */}
				<div className="rounded-lg border p-4 space-y-3">
					<Label>Define &ldquo;old&rdquo; as:</Label>
					<Select value={oldTransactionFilter.cutoffType} onValueChange={handleCutoffTypeChange}>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="date">Transactions older than a specific date</SelectItem>
							<SelectItem value="days">Transactions older than last import</SelectItem>
						</SelectContent>
					</Select>

					{/* Cutoff value input */}
					{oldTransactionFilter.cutoffType === "days" ? (
						<div className="flex items-center gap-3">
							<Input
								type="number"
								min={0}
								max={365}
								value={oldTransactionFilter.cutoffDays}
								onChange={handleCutoffDaysChange}
								className="w-24"
							/>
							<span className="text-sm text-muted-foreground">
								days before newest existing transaction
							</span>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<Input
								type="date"
								value={oldTransactionFilter.cutoffDate ?? defaultCutoffDate}
								onChange={handleCutoffDateChange}
								className="w-44"
							/>
							<span className="text-sm text-muted-foreground">cutoff date</span>
						</div>
					)}
				</div>

				{/* Filter mode radio group */}
				<RadioGroup
					value={oldTransactionFilter.mode}
					onValueChange={handleFilterModeChange}
					className="space-y-2"
				>
					<label
						htmlFor="filter-none"
						className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
					>
						<RadioGroupItem value="do-not-ignore" id="filter-none" className="mt-0.5" />
						<div className="space-y-1">
							<span className="font-medium">Import all transactions</span>
							<p className="text-xs text-muted-foreground">
								{getFilterModeDescription("do-not-ignore")}
							</p>
						</div>
					</label>

					<label
						htmlFor="filter-dupes"
						className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
					>
						<RadioGroupItem value="ignore-duplicates" id="filter-dupes" className="mt-0.5" />
						<div className="space-y-1">
							<span className="font-medium">Skip old duplicates</span>
							<p className="text-xs text-muted-foreground">
								{getFilterModeDescription("ignore-duplicates")}
							</p>
						</div>
					</label>

					<label
						htmlFor="filter-all"
						className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
					>
						<RadioGroupItem value="ignore-all" id="filter-all" className="mt-0.5" />
						<div className="space-y-1">
							<span className="font-medium">Skip all old transactions</span>
							<p className="text-xs text-muted-foreground">
								{getFilterModeDescription("ignore-all")}
							</p>
						</div>
					</label>
				</RadioGroup>
			</div>
		</div>
	);
}
