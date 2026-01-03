"use client";

/**
 * DuplicatesTab
 *
 * Tab content for configuring duplicate detection and old transaction filtering.
 * Combines:
 * - Date matching mode (exact vs within X days)
 * - Description matching mode (exact vs similar with threshold)
 * - Old transaction filter (three modes + cutoff days)
 */

import { CalendarRange, Clock, Copy, FileText } from "lucide-react";
import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { getFilterModeDescription } from "@/lib/import/filter";
import type {
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
	/** Statistics for display */
	duplicateCount?: number;
	filteredCount?: number;
	/** Additional CSS classes */
	className?: string;
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
	duplicateCount = 0,
	filteredCount = 0,
	className,
}: DuplicatesTabProps) {
	// Handlers for duplicate detection
	const handleDateModeChange = useCallback(
		(exactMatch: boolean) => {
			onDuplicateDetectionChange({
				dateMatchMode: exactMatch ? "exact" : "within",
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
		(exactMatch: boolean) => {
			onDuplicateDetectionChange({
				descriptionMatchMode: exactMatch ? "exact" : "similar",
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

	const handleCutoffDaysChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = parseInt(e.target.value, 10);
			if (!isNaN(value) && value >= 0) {
				onFilterChange({ cutoffDays: value });
			}
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

					<div className="flex items-center space-x-3">
						<Checkbox
							id="date-exact"
							checked={duplicateDetection.dateMatchMode === "exact"}
							onCheckedChange={(checked) => handleDateModeChange(checked === true)}
						/>
						<Label htmlFor="date-exact" className="cursor-pointer text-sm">
							Exact date match only
						</Label>
					</div>

					{duplicateDetection.dateMatchMode === "within" && (
						<div className="space-y-2 pl-6">
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

					<div className="flex items-center space-x-3">
						<Checkbox
							id="desc-exact"
							checked={duplicateDetection.descriptionMatchMode === "exact"}
							onCheckedChange={(checked) => handleDescModeChange(checked === true)}
						/>
						<Label htmlFor="desc-exact" className="cursor-pointer text-sm">
							Exact description match only
						</Label>
					</div>

					{duplicateDetection.descriptionMatchMode === "similar" && (
						<div className="space-y-2 pl-6">
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
					<Label className="text-base font-medium">Old Transaction Filter</Label>
					{filteredCount > 0 && (
						<span className="text-sm text-muted-foreground">{filteredCount} affected</span>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					Handle transactions older than a cutoff date
				</p>

				{/* Cutoff days input */}
				<div className="flex items-center gap-3">
					<Label htmlFor="cutoff-days" className="shrink-0">
						Cutoff:
					</Label>
					<div className="flex items-center gap-2">
						<Input
							id="cutoff-days"
							type="number"
							min={0}
							max={365}
							value={oldTransactionFilter.cutoffDays}
							onChange={handleCutoffDaysChange}
							className="w-20"
						/>
						<span className="text-sm text-muted-foreground">days ago</span>
					</div>
				</div>

				{/* Filter mode radio group */}
				<RadioGroup
					value={oldTransactionFilter.mode}
					onValueChange={handleFilterModeChange}
					className="space-y-3"
				>
					<div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
						<RadioGroupItem value="do-not-ignore" id="filter-none" className="mt-0.5" />
						<div className="space-y-1">
							<Label htmlFor="filter-none" className="cursor-pointer font-medium">
								Import all transactions
							</Label>
							<p className="text-xs text-muted-foreground">
								{getFilterModeDescription("do-not-ignore")}
							</p>
						</div>
					</div>

					<div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
						<RadioGroupItem value="ignore-duplicates" id="filter-dupes" className="mt-0.5" />
						<div className="space-y-1">
							<Label htmlFor="filter-dupes" className="cursor-pointer font-medium">
								Skip old duplicates
							</Label>
							<p className="text-xs text-muted-foreground">
								{getFilterModeDescription("ignore-duplicates")}
							</p>
						</div>
					</div>

					<div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
						<RadioGroupItem value="ignore-all" id="filter-all" className="mt-0.5" />
						<div className="space-y-1">
							<Label htmlFor="filter-all" className="cursor-pointer font-medium">
								Skip all old transactions
							</Label>
							<p className="text-xs text-muted-foreground">
								{getFilterModeDescription("ignore-all")}
							</p>
						</div>
					</div>
				</RadioGroup>
			</div>
		</div>
	);
}
