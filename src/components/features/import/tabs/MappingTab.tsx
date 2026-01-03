"use client";

/**
 * MappingTab
 *
 * Tab content for mapping CSV columns to transaction fields.
 * Shows available columns with sample values and dropdown to assign target field.
 */

import { AlertCircle, CheckCircle2, Wand2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

/** Target fields that can be mapped to */
export const TARGET_FIELDS = [
	{ id: "date", label: "Date", required: true },
	{ id: "amount", label: "Amount", required: true },
	{ id: "description", label: "Description", required: false },
	{ id: "merchant", label: "Merchant", required: false },
	{ id: "memo", label: "Memo", required: false },
	{ id: "checkNumber", label: "Check Number", required: false },
	{ id: "balance", label: "Balance", required: false },
	{ id: "__ignore__", label: "(Ignore)", required: false },
] as const;

export type TargetFieldId = (typeof TARGET_FIELDS)[number]["id"];

export interface MappingTabProps {
	/** Column headers from the raw file */
	availableHeaders: string[];
	/** Sample rows for preview (first 3-5 rows of data) */
	sampleRows: string[][];
	/** Current column mappings (columnIndex as string -> field name) */
	columnMappings: Record<string, string>;
	/** Callback when mappings change */
	onMappingsChange: (mappings: Record<string, string>) => void;
	/** Additional CSS classes */
	className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Auto-detect column mappings based on header names.
 */
function autoDetectMappings(headers: string[]): Record<string, string> {
	const mappings: Record<string, string> = {};

	headers.forEach((header, idx) => {
		const headerLower = header.toLowerCase().trim();
		const key = idx.toString();

		// Date patterns
		if (
			headerLower.includes("date") ||
			headerLower === "posted" ||
			headerLower === "post date" ||
			headerLower === "transaction date"
		) {
			if (!Object.values(mappings).includes("date")) {
				mappings[key] = "date";
			}
			return;
		}

		// Amount patterns
		if (
			headerLower.includes("amount") ||
			headerLower === "debit" ||
			headerLower === "credit" ||
			headerLower === "value"
		) {
			if (!Object.values(mappings).includes("amount")) {
				mappings[key] = "amount";
			}
			return;
		}

		// Description patterns
		if (
			headerLower.includes("description") ||
			headerLower.includes("desc") ||
			headerLower === "details" ||
			headerLower === "transaction"
		) {
			if (!Object.values(mappings).includes("description")) {
				mappings[key] = "description";
			}
			return;
		}

		// Merchant patterns
		if (
			headerLower.includes("merchant") ||
			headerLower.includes("payee") ||
			headerLower === "name"
		) {
			if (!Object.values(mappings).includes("merchant")) {
				mappings[key] = "merchant";
			}
			return;
		}

		// Memo patterns
		if (headerLower.includes("memo") || headerLower.includes("note")) {
			if (!Object.values(mappings).includes("memo")) {
				mappings[key] = "memo";
			}
			return;
		}

		// Check number patterns
		if (
			headerLower.includes("check") ||
			headerLower.includes("cheque") ||
			headerLower === "check no" ||
			headerLower === "check #"
		) {
			if (!Object.values(mappings).includes("checkNumber")) {
				mappings[key] = "checkNumber";
			}
			return;
		}

		// Balance patterns
		if (headerLower.includes("balance")) {
			if (!Object.values(mappings).includes("balance")) {
				mappings[key] = "balance";
			}
			return;
		}
	});

	return mappings;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MappingTab component.
 */
export function MappingTab({
	availableHeaders,
	sampleRows,
	columnMappings,
	onMappingsChange,
	className,
}: MappingTabProps) {
	// Track which target fields are already used
	const usedFields = useMemo(
		() => new Set(Object.values(columnMappings).filter((f) => f !== "__ignore__")),
		[columnMappings]
	);

	// Check for missing required fields
	const missingRequired = useMemo(
		() => TARGET_FIELDS.filter((f) => f.required && !usedFields.has(f.id)).map((f) => f.label),
		[usedFields]
	);

	// Handle mapping change for a column
	const handleMappingChange = useCallback(
		(columnIndex: number, fieldId: string) => {
			const key = columnIndex.toString();
			const newMappings = { ...columnMappings };

			if (fieldId === "__none__") {
				delete newMappings[key];
			} else {
				newMappings[key] = fieldId;
			}

			onMappingsChange(newMappings);
		},
		[columnMappings, onMappingsChange]
	);

	// Auto-detect all mappings
	const handleAutoDetect = useCallback(() => {
		const detected = autoDetectMappings(availableHeaders);
		onMappingsChange(detected);
	}, [availableHeaders, onMappingsChange]);

	// Get sample values for a column
	const getSampleValues = useCallback(
		(columnIndex: number): string[] => {
			return sampleRows
				.slice(0, 3)
				.map((row) => row[columnIndex] ?? "")
				.filter((v) => v.trim());
		},
		[sampleRows]
	);

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<Label>Column Mappings</Label>
					<p className="text-sm text-muted-foreground">Map file columns to transaction fields</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={handleAutoDetect}>
					<Wand2 className="h-4 w-4 mr-1.5" />
					Auto-detect
				</Button>
			</div>

			{/* Missing required fields warning */}
			{missingRequired.length > 0 && (
				<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<span>
						Required fields not mapped:{" "}
						<span className="font-medium">{missingRequired.join(", ")}</span>
					</span>
				</div>
			)}

			{/* All required fields mapped */}
			{missingRequired.length === 0 && (
				<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-3 py-2 text-sm text-green-800 dark:text-green-200">
					<CheckCircle2 className="h-4 w-4 shrink-0" />
					<span>All required fields mapped</span>
				</div>
			)}

			{/* Column list */}
			<div className="space-y-3 rounded-lg border bg-card p-3">
				{availableHeaders.map((header, idx) => {
					const key = idx.toString();
					const currentMapping = columnMappings[key] ?? "__none__";
					const samples = getSampleValues(idx);

					return (
						<div key={idx} className="flex flex-col gap-2 pb-3 border-b last:border-0 last:pb-0">
							<div className="flex items-center justify-between gap-4">
								<div className="flex-1 min-w-0">
									<div className="font-medium text-sm truncate" title={header}>
										{header}
									</div>
									{samples.length > 0 && (
										<div
											className="text-xs text-muted-foreground truncate"
											title={samples.join(" | ")}
										>
											{samples.slice(0, 2).join(" | ")}
											{samples.length > 2 && "..."}
										</div>
									)}
								</div>
								<Select value={currentMapping} onValueChange={(v) => handleMappingChange(idx, v)}>
									<SelectTrigger className="w-[140px]">
										<SelectValue placeholder="Not mapped" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__none__">Not mapped</SelectItem>
										{TARGET_FIELDS.map((field) => {
											const isUsed = usedFields.has(field.id) && currentMapping !== field.id;
											return (
												<SelectItem
													key={field.id}
													value={field.id}
													disabled={isUsed && field.id !== "__ignore__"}
												>
													<div className="flex items-center gap-2">
														<span>{field.label}</span>
														{field.required && (
															<Badge variant="secondary" className="text-[10px] px-1 py-0">
																Required
															</Badge>
														)}
													</div>
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
