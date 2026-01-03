"use client";

/**
 * FormattingTab
 *
 * Tab content for configuring parsing format settings:
 * - Has headers checkbox
 * - Date format selection
 * - Number format (thousand/decimal separators)
 * - Whitespace normalization
 */

import { Wand2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FormattingSettings } from "@/lib/import/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface FormattingTabProps {
	/** Current formatting settings */
	formatting: FormattingSettings;
	/** Callback when formatting changes */
	onFormattingChange: (updates: Partial<FormattingSettings>) => void;
	/** Sample date values for auto-detection */
	sampleDates?: string[];
	/** Sample amount values for auto-detection */
	sampleAmounts?: string[];
	/** Additional CSS classes */
	className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Common date format options.
 */
const DATE_FORMAT_OPTIONS = [
	{ value: "yyyy-MM-dd", label: "2024-01-15 (ISO)" },
	{ value: "MM/dd/yyyy", label: "01/15/2024 (US)" },
	{ value: "dd/MM/yyyy", label: "15/01/2024 (EU)" },
	{ value: "M/d/yyyy", label: "1/15/2024 (US short)" },
	{ value: "d/M/yyyy", label: "15/1/2024 (EU short)" },
	{ value: "MM-dd-yyyy", label: "01-15-2024" },
	{ value: "dd-MM-yyyy", label: "15-01-2024" },
	{ value: "yyyy/MM/dd", label: "2024/01/15" },
	{ value: "dd.MM.yyyy", label: "15.01.2024" },
];

/**
 * Number format presets (thousand separator / decimal separator).
 */
const NUMBER_FORMAT_OPTIONS = [
	{ thousand: ",", decimal: ".", label: "1,234.56 (US/UK)" },
	{ thousand: ".", decimal: ",", label: "1.234,56 (EU)" },
	{ thousand: " ", decimal: ",", label: "1 234,56 (FR)" },
	{ thousand: "'", decimal: ".", label: "1'234.56 (CH)" },
	{ thousand: "", decimal: ".", label: "1234.56 (no separator)" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Auto-detect date format from sample values.
 */
function detectDateFormat(samples: string[]): string | null {
	if (samples.length === 0) return null;

	const sample = samples[0].trim();

	// ISO format
	if (/^\d{4}-\d{2}-\d{2}/.test(sample)) {
		return "yyyy-MM-dd";
	}

	// Slash-separated with 4-digit year at end
	if (/^\d{2}\/\d{2}\/\d{4}/.test(sample)) {
		const firstPart = parseInt(sample.split("/")[0], 10);
		return firstPart > 12 ? "dd/MM/yyyy" : "MM/dd/yyyy";
	}

	// Slash-separated short
	if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(sample)) {
		const firstPart = parseInt(sample.split("/")[0], 10);
		return firstPart > 12 ? "d/M/yyyy" : "M/d/yyyy";
	}

	// Dot-separated (EU)
	if (/^\d{2}\.\d{2}\.\d{4}/.test(sample)) {
		return "dd.MM.yyyy";
	}

	// Dash-separated with year at end
	if (/^\d{2}-\d{2}-\d{4}/.test(sample)) {
		const firstPart = parseInt(sample.split("-")[0], 10);
		return firstPart > 12 ? "dd-MM-yyyy" : "MM-dd-yyyy";
	}

	return null;
}

/**
 * Auto-detect number format from sample values.
 */
function detectNumberFormat(samples: string[]): { thousand: string; decimal: string } | null {
	if (samples.length === 0) return null;

	const sample = samples[0].trim();

	// Remove currency symbols and whitespace
	const cleaned = sample.replace(/[$€£¥]|\s/g, "");

	// Look for patterns
	// 1,234.56 -> US
	if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(cleaned)) {
		return { thousand: ",", decimal: "." };
	}

	// 1.234,56 -> EU
	if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
		return { thousand: ".", decimal: "," };
	}

	// 1 234,56 -> FR
	if (/^\d{1,3}( \d{3})*,\d{2}$/.test(cleaned)) {
		return { thousand: " ", decimal: "," };
	}

	// No separator: 1234.56
	if (/^\d+\.\d{2}$/.test(cleaned)) {
		return { thousand: "", decimal: "." };
	}

	return null;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FormattingTab component.
 */
export function FormattingTab({
	formatting,
	onFormattingChange,
	sampleDates = [],
	sampleAmounts = [],
	className,
}: FormattingTabProps) {
	// Get current number format label
	const currentNumberFormat = NUMBER_FORMAT_OPTIONS.find(
		(opt) =>
			opt.thousand === formatting.thousandSeparator && opt.decimal === formatting.decimalSeparator
	);

	// Handle auto-detection
	const handleAutoDetect = useCallback(() => {
		const updates: Partial<FormattingSettings> = {};

		const detectedDate = detectDateFormat(sampleDates);
		if (detectedDate) {
			updates.dateFormat = detectedDate;
		}

		const detectedNumber = detectNumberFormat(sampleAmounts);
		if (detectedNumber) {
			updates.thousandSeparator = detectedNumber.thousand;
			updates.decimalSeparator = detectedNumber.decimal;
		}

		if (Object.keys(updates).length > 0) {
			onFormattingChange(updates);
		}
	}, [sampleDates, sampleAmounts, onFormattingChange]);

	// Handle number format selection
	const handleNumberFormatChange = useCallback(
		(value: string) => {
			const [thousand, decimal] = value.split("|");
			onFormattingChange({
				thousandSeparator: thousand,
				decimalSeparator: decimal,
			});
		},
		[onFormattingChange]
	);

	return (
		<div className={cn("space-y-6", className)}>
			{/* Header with auto-detect */}
			<div className="flex items-center justify-between">
				<div>
					<Label>Format Settings</Label>
					<p className="text-sm text-muted-foreground">
						Configure how dates and numbers are parsed
					</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={handleAutoDetect}>
					<Wand2 className="h-4 w-4 mr-1.5" />
					Auto-detect
				</Button>
			</div>

			{/* Has headers */}
			<div className="flex items-center space-x-3">
				<Checkbox
					id="has-headers"
					checked={formatting.hasHeaders}
					onCheckedChange={(checked) => onFormattingChange({ hasHeaders: checked === true })}
				/>
				<div className="space-y-0.5">
					<Label htmlFor="has-headers" className="cursor-pointer">
						First row is headers
					</Label>
					<p className="text-xs text-muted-foreground">
						Skip the first row when importing transactions
					</p>
				</div>
			</div>

			{/* Date format */}
			<div className="space-y-2">
				<Label htmlFor="date-format">Date Format</Label>
				<Select
					value={formatting.dateFormat}
					onValueChange={(v) => onFormattingChange({ dateFormat: v })}
				>
					<SelectTrigger id="date-format">
						<SelectValue placeholder="Select date format" />
					</SelectTrigger>
					<SelectContent>
						{DATE_FORMAT_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{sampleDates.length > 0 && (
					<p className="text-xs text-muted-foreground">
						Sample: <code className="bg-muted px-1 rounded">{sampleDates[0]}</code>
					</p>
				)}
			</div>

			{/* Number format */}
			<div className="space-y-2">
				<Label htmlFor="number-format">Number Format</Label>
				<Select
					value={`${formatting.thousandSeparator}|${formatting.decimalSeparator}`}
					onValueChange={handleNumberFormatChange}
				>
					<SelectTrigger id="number-format">
						<SelectValue placeholder="Select number format">
							{currentNumberFormat?.label ?? "Custom"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{NUMBER_FORMAT_OPTIONS.map((opt) => (
							<SelectItem key={opt.label} value={`${opt.thousand}|${opt.decimal}`}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{sampleAmounts.length > 0 && (
					<p className="text-xs text-muted-foreground">
						Sample: <code className="bg-muted px-1 rounded">{sampleAmounts[0]}</code>
					</p>
				)}
			</div>

			{/* Whitespace normalization */}
			<div className="flex items-center space-x-3">
				<Checkbox
					id="collapse-whitespace"
					checked={formatting.collapseWhitespace}
					onCheckedChange={(checked) =>
						onFormattingChange({ collapseWhitespace: checked === true })
					}
				/>
				<div className="space-y-0.5">
					<Label htmlFor="collapse-whitespace" className="cursor-pointer">
						Normalize whitespace
					</Label>
					<p className="text-xs text-muted-foreground">
						Collapse multiple spaces to single space in descriptions
					</p>
				</div>
			</div>
		</div>
	);
}
