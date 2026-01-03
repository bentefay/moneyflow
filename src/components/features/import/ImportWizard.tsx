"use client";

/**
 * Import Wizard
 *
 * Multi-step wizard for importing transactions from CSV/OFX files.
 */

import { useCallback, useMemo, useState } from "react";
import { detectHeaders, detectSeparator, parseCSV, parseDate, parseNumber } from "@/lib/import/csv";
import { isOFXFormat, type ParsedOFXTransaction, parseOFX } from "@/lib/import/ofx";
import { cn } from "@/lib/utils";
import {
	type ColumnMapping,
	ColumnMappingStep,
	initializeColumnMappings,
	validateColumnMappings,
} from "./ColumnMappingStep";
import { FileDropzone } from "./FileDropzone";
import { DEFAULT_FORMATTING, FormattingStep, type ImportFormatting } from "./FormattingStep";
import { PreviewStep, type PreviewTransaction } from "./PreviewStep";
import { applyTemplateToMappings, type ImportTemplate, TemplateSelector } from "./TemplateSelector";

/**
 * Import wizard steps.
 */
type WizardStep = "file" | "mapping" | "formatting" | "preview" | "complete";

/**
 * Result of a successful import.
 */
export interface ImportResult {
	/** Number of transactions imported */
	transactionCount: number;
	/** Number of duplicates detected */
	duplicateCount: number;
	/** Import ID for reference */
	importId: string;
	/** Original filename */
	filename: string;
}

export interface ImportWizardProps {
	/** Available templates for the user */
	templates: ImportTemplate[];
	/** Callback when import is complete */
	onImportComplete: (transactions: ParsedTransaction[], importId: string) => void;
	/** Callback to save a new template */
	onSaveTemplate?: (name: string, mappings: ColumnMapping[], formatting: ImportFormatting) => void;
	/** Callback to delete a template */
	onDeleteTemplate?: (templateId: string) => void;
	/** Existing transactions for duplicate detection */
	existingTransactions?: { date: string; amount: number; description: string }[];
	/** Additional CSS classes */
	className?: string;
}

/**
 * Parsed transaction ready for import.
 */
export interface ParsedTransaction {
	date: string;
	amount: number;
	description: string;
	memo: string;
	checkNumber?: string;
	isDuplicate: boolean;
	duplicateOfId?: string;
}

/**
 * Import wizard component.
 */
export function ImportWizard({
	templates,
	onImportComplete,
	onSaveTemplate,
	onDeleteTemplate,
	existingTransactions = [],
	className,
}: ImportWizardProps) {
	// Wizard state
	const [step, setStep] = useState<WizardStep>("file");
	const [error, setError] = useState<string | null>(null);

	// File state
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	// setFileContent used to update state, getter currently unused but kept for debugging
	const [, setFileContent] = useState<string>("");
	const [isOFX, setIsOFX] = useState(false);

	// CSV parsing state
	const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
	const [csvRows, setCsvRows] = useState<string[][]>([]);
	const [mappings, setMappings] = useState<ColumnMapping[]>([]);
	const [formatting, setFormatting] = useState<ImportFormatting>(DEFAULT_FORMATTING);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

	// OFX parsing state - setOfxTransactions used to update state, getter reserved for future use
	const [, setOfxTransactions] = useState<ParsedOFXTransaction[]>([]);

	// Preview state
	const [previewTransactions, setPreviewTransactions] = useState<PreviewTransaction[]>([]);

	// Check for duplicate - declared before use in generateOFXPreview
	const checkDuplicate = useCallback(
		(date: string, amount: number, description: string): boolean => {
			return existingTransactions.some(
				(existing) =>
					existing.date === date &&
					Math.abs(existing.amount - amount) < 0.01 &&
					(existing.description
						.toLowerCase()
						.includes(description.toLowerCase().substring(0, 10)) ||
						description.toLowerCase().includes(existing.description.toLowerCase().substring(0, 10)))
			);
		},
		[existingTransactions]
	);

	// Generate preview from OFX transactions - declared before use in handleFileSelect
	const generateOFXPreview = useCallback(
		(transactions: readonly ParsedOFXTransaction[]) => {
			const preview: PreviewTransaction[] = transactions.map((tx, idx) => {
				const dateStr = tx.datePosted.toString();
				return {
					rowIndex: idx,
					date: dateStr,
					amount: tx.amount,
					description: tx.name || tx.memo,
					errors: [],
					isDuplicate: checkDuplicate(dateStr, tx.amount, tx.name || tx.memo),
					originalRow: [dateStr, tx.name, tx.memo, String(tx.amount)],
				};
			});
			setPreviewTransactions(preview);
		},
		[checkDuplicate]
	);

	// Read file and determine format
	const handleFileSelect = useCallback(
		async (file: File) => {
			setSelectedFile(file);
			setError(null);

			try {
				const content = await file.text();
				setFileContent(content);

				// Check if OFX format
				if (isOFXFormat(content)) {
					setIsOFX(true);
					const result = parseOFX(content);

					// Handle parse errors
					if (!result.ok) {
						const details =
							result.error.details.length > 0 ? `: ${result.error.details.join(", ")}` : "";
						setError(`${result.error.message}${details}`);
						return;
					}

					// Flatten transactions from all statements
					const allTransactions = result.data.statements.flatMap((s) => [...s.transactions]);

					if (allTransactions.length === 0) {
						setError("No transactions found in the OFX file.");
						return;
					}

					setOfxTransactions(allTransactions);
					// Skip to preview for OFX (no mapping needed)
					generateOFXPreview(allTransactions);
					setStep("preview");
				} else {
					setIsOFX(false);
					// Parse as CSV
					const separator = detectSeparator(content);
					const hasHeaders = detectHeaders(content, separator);
					const result = parseCSV(content, {
						separator,
						hasHeaders,
						maxRows: 1000,
					});

					if (result.rows.length === 0) {
						setError("No data rows found in the CSV file.");
						return;
					}

					setCsvHeaders(result.headers);
					setCsvRows(result.rows);
					setMappings(initializeColumnMappings(result.headers, result.rows));
					setStep("mapping");
				}
			} catch (err) {
				setError("Failed to read file. Please try again.");
				console.error("File read error:", err);
			}
		},
		[generateOFXPreview]
	);

	// Generate preview from CSV
	const generateCSVPreview = useCallback(() => {
		const dateIdx = mappings.findIndex((m) => m.targetField === "date");
		const amountIdx = mappings.findIndex((m) => m.targetField === "amount");
		const descIdx = mappings.findIndex((m) => m.targetField === "description");
		const merchantIdx = mappings.findIndex((m) => m.targetField === "merchant"); // CSV column labeled "merchant"

		const preview: PreviewTransaction[] = csvRows.map((row, idx) => {
			const errors: string[] = [];

			// Parse date
			let date: string | null = null;
			if (dateIdx >= 0 && row[dateIdx]) {
				const parsedDate = parseDate(row[dateIdx], formatting.dateFormat);
				if (!parsedDate) {
					errors.push(`Invalid date: ${row[dateIdx]}`);
				} else {
					date = parsedDate.toString();
				}
			} else {
				errors.push("Missing date");
			}

			// Parse amount
			let amount: number | null = null;
			if (amountIdx >= 0 && row[amountIdx]) {
				amount = parseNumber(
					row[amountIdx],
					formatting.thousandSeparator,
					formatting.decimalSeparator
				);
				if (isNaN(amount)) {
					errors.push(`Invalid amount: ${row[amountIdx]}`);
					amount = null;
				} else {
					if (formatting.amountInCents) {
						amount = amount / 100;
					}
					if (formatting.negateAmounts) {
						amount = -amount;
					}
				}
			} else {
				errors.push("Missing amount");
			}

			// Get description
			const description =
				(merchantIdx >= 0 ? row[merchantIdx] : "") || (descIdx >= 0 ? row[descIdx] : "") || "";

			// Check for duplicate
			const isDuplicate =
				date && amount !== null && description ? checkDuplicate(date, amount, description) : false;

			return {
				rowIndex: idx,
				date,
				amount,
				description,
				errors,
				isDuplicate,
				originalRow: row,
			};
		});

		setPreviewTransactions(preview);
	}, [csvRows, mappings, formatting, checkDuplicate]);

	// Handle template selection
	const handleTemplateSelect = useCallback(
		(template: ImportTemplate | null) => {
			if (template) {
				setSelectedTemplateId(template.id);
				setMappings(applyTemplateToMappings(template, csvHeaders, csvRows));
				setFormatting(template.formatting);
			} else {
				setSelectedTemplateId(undefined);
			}
		},
		[csvHeaders, csvRows]
	);

	// Handle save template
	const handleSaveTemplate = useCallback(
		(name: string) => {
			onSaveTemplate?.(name, mappings, formatting);
		},
		[mappings, formatting, onSaveTemplate]
	);

	// Navigate steps
	const handleNext = useCallback(() => {
		if (step === "mapping") {
			const validation = validateColumnMappings(mappings);
			if (!validation.valid) {
				setError(`Please map required fields: ${validation.missingFields.join(", ")}`);
				return;
			}
			setError(null);
			setStep("formatting");
		} else if (step === "formatting") {
			generateCSVPreview();
			setStep("preview");
		} else if (step === "preview") {
			// Perform import
			const validTransactions = previewTransactions
				.filter((tx) => tx.errors.length === 0 && tx.date && tx.amount !== null)
				.map(
					(tx): ParsedTransaction => ({
						date: tx.date!,
						amount: tx.amount!,
						description: tx.description,
						memo: "",
						isDuplicate: tx.isDuplicate ?? false,
					})
				);

			const importId = `import-${Date.now()}`;
			onImportComplete(validTransactions, importId);
			setStep("complete");
		}
	}, [step, mappings, generateCSVPreview, previewTransactions, onImportComplete]);

	const handleBack = useCallback(() => {
		if (step === "mapping") {
			setStep("file");
			setSelectedFile(null);
		} else if (step === "formatting") {
			setStep("mapping");
		} else if (step === "preview") {
			if (isOFX) {
				setStep("file");
				setSelectedFile(null);
			} else {
				setStep("formatting");
			}
		}
	}, [step, isOFX]);

	// Calculate stats
	const stats = useMemo(() => {
		const total = previewTransactions.length;
		const errors = previewTransactions.filter((tx) => tx.errors.length > 0).length;
		const duplicates = previewTransactions.filter((tx) => tx.isDuplicate).length;
		return { total, errors, duplicates };
	}, [previewTransactions]);

	// Render step content
	const renderStepContent = () => {
		switch (step) {
			case "file":
				return (
					<FileDropzone
						onFileSelect={handleFileSelect}
						onError={setError}
						selectedFile={selectedFile}
					/>
				);

			case "mapping":
				return (
					<div className="space-y-4">
						<TemplateSelector
							templates={templates}
							selectedTemplateId={selectedTemplateId}
							onSelect={handleTemplateSelect}
							onSave={handleSaveTemplate}
							onDelete={onDeleteTemplate}
						/>
						<ColumnMappingStep
							headers={csvHeaders}
							sampleRows={csvRows}
							mappings={mappings}
							onMappingsChange={setMappings}
						/>
					</div>
				);

			case "formatting":
				return (
					<FormattingStep
						formatting={formatting}
						onFormattingChange={setFormatting}
						sampleDates={csvRows.slice(0, 3).map((row) => {
							const dateIdx = mappings.findIndex((m) => m.targetField === "date");
							return dateIdx >= 0 ? row[dateIdx] : "";
						})}
						sampleAmounts={csvRows.slice(0, 3).map((row) => {
							const amountIdx = mappings.findIndex((m) => m.targetField === "amount");
							return amountIdx >= 0 ? row[amountIdx] : "";
						})}
					/>
				);

			case "preview":
				return (
					<PreviewStep
						transactions={previewTransactions}
						totalRows={stats.total}
						errorCount={stats.errors}
						duplicateCount={stats.duplicates}
					/>
				);

			case "complete":
				return (
					<div className="py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
							<svg
								className="h-8 w-8 text-green-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<h3 className="font-semibold text-lg">Import Complete!</h3>
						<p className="mt-1 text-muted-foreground">
							Successfully imported {stats.total - stats.errors} transaction
							{stats.total - stats.errors !== 1 ? "s" : ""}.
						</p>
						{stats.duplicates > 0 && (
							<p className="mt-2 text-sm text-yellow-600">
								{stats.duplicates} potential duplicate{stats.duplicates !== 1 ? "s" : ""} flagged
								for review.
							</p>
						)}
					</div>
				);
		}
	};

	// Step indicators
	const steps: { key: WizardStep; label: string }[] = isOFX
		? [
				{ key: "file", label: "Select File" },
				{ key: "preview", label: "Preview" },
				{ key: "complete", label: "Done" },
			]
		: [
				{ key: "file", label: "Select File" },
				{ key: "mapping", label: "Map Columns" },
				{ key: "formatting", label: "Format" },
				{ key: "preview", label: "Preview" },
				{ key: "complete", label: "Done" },
			];

	const currentStepIndex = steps.findIndex((s) => s.key === step);

	return (
		<div className={cn("flex flex-col", className)}>
			{/* Step Indicator */}
			<div className="mb-6 flex items-center justify-center gap-2">
				{steps.map((s, idx) => (
					<div key={s.key} className="flex items-center gap-2">
						<div
							className={cn(
								"flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm transition-colors",
								idx < currentStepIndex
									? "bg-primary text-primary-foreground"
									: idx === currentStepIndex
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground"
							)}
						>
							{idx < currentStepIndex ? (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							) : (
								idx + 1
							)}
						</div>
						<span
							className={cn(
								"hidden text-sm sm:block",
								idx === currentStepIndex ? "font-medium" : "text-muted-foreground"
							)}
						>
							{s.label}
						</span>
						{idx < steps.length - 1 && <div className="h-px w-8 bg-muted" />}
					</div>
				))}
			</div>

			{/* Error Message */}
			{error && (
				<div className="mb-4 rounded-lg border border-red-500/50 bg-red-50 p-3 dark:bg-red-950/20">
					<p className="text-red-700 text-sm dark:text-red-400">{error}</p>
				</div>
			)}

			{/* Step Content */}
			<div className="flex-1">{renderStepContent()}</div>

			{/* Navigation */}
			{step !== "complete" && (
				<div className="mt-6 flex justify-between">
					<button
						type="button"
						onClick={handleBack}
						disabled={step === "file"}
						className={cn(
							"rounded px-4 py-2 font-medium text-sm transition-colors",
							step === "file" ? "invisible" : "hover:bg-accent"
						)}
					>
						Back
					</button>
					<button
						type="button"
						onClick={handleNext}
						disabled={step === "file" && !selectedFile}
						className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
					>
						{step === "preview" ? "Import" : "Next"}
					</button>
				</div>
			)}
		</div>
	);
}
