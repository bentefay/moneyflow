"use client";

/**
 * Import State Hook
 *
 * Centralized state management for import sessions.
 * Handles file parsing, configuration, preview computation, and validation.
 *
 * This hook manages the ephemeral import session state that exists only during
 * the import process. Configuration is not persisted until a template is saved.
 */

import { useCallback, useMemo, useState } from "react";
import { autoDetectColumnMappings } from "@/components/features/import/ColumnMappingStep";
import type { Account, ImportTemplate, Transaction } from "@/lib/crdt/schema";
import type { MoneyMinorUnits } from "@/lib/domain/currency";
import { toMinorUnitsForCurrency } from "@/lib/domain/currency";
import { detectHeaders, detectSeparator, parseDate, parseNumber } from "@/lib/import/csv";
import type { DuplicateCheckTransaction, DuplicateMatch } from "@/lib/import/duplicates";
import { DEFAULT_DUPLICATE_CONFIG, detectDuplicates } from "@/lib/import/duplicates";
import { filterOldTransactions } from "@/lib/import/filter";
import { isOFXFormat, parseOFX } from "@/lib/import/ofx";
import {
	DEFAULT_IMPORT_CONFIG,
	type DuplicateCheckResult,
	type ImportConfig,
	type ImportFileType,
	type ImportSession,
	type ImportSummaryStats,
	type PreviewTransaction,
	type ValidationError,
} from "@/lib/import/types";
import type { ISODateString } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface UseImportStateOptions {
	/** Existing transactions in the vault for duplicate detection */
	existingTransactions: Transaction[];
	/** Available accounts for selection */
	accounts: Account[];
	/** Available import templates */
	templates: ImportTemplate[];
	/** Default currency code for amount parsing */
	defaultCurrency: string;
}

export interface UseImportStateReturn {
	// State
	session: ImportSession | null;
	isLoading: boolean;
	error: Error | null;

	// Actions
	loadFile: (file: File) => Promise<void>;
	setConfig: (updates: Partial<ImportConfig>) => void;
	selectAccount: (accountId: string) => void;
	selectTemplate: (templateId: string | null) => void;
	reset: () => void;

	// Computed
	previewTransactions: PreviewTransaction[];
	summaryStats: ImportSummaryStats;
	canImport: boolean;
	validationErrors: ValidationError[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique session ID.
 */
function generateSessionId(): string {
	return `import-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detect file type from content.
 */
function detectFileType(content: string): ImportFileType {
	return isOFXFormat(content) ? "ofx" : "csv";
}

/**
 * Parse raw CSV content into rows.
 */
function parseRawRows(content: string): { rows: string[][]; headers: string[]; separator: string } {
	const separator = detectSeparator(content);
	const lines = content.split(/\r?\n/).filter((line) => line.trim());
	const rows = lines.map((line) => line.split(separator));
	const hasHeaders = detectHeaders(content, separator);
	const headers = hasHeaders ? rows[0] : rows[0].map((_, i) => `Column ${i + 1}`);
	return { rows, headers, separator };
}

/**
 * Normalize whitespace in a string (collapse multiple spaces to single).
 */
function normalizeWhitespace(str: string): string {
	return str.replace(/\s+/g, " ").trim();
}

/**
 * Convert existing transactions to duplicate check format.
 */
function toDuplicateCheckFormat(transactions: Transaction[]): DuplicateCheckTransaction[] {
	return transactions
		.filter((tx) => !tx.deletedAt)
		.map((tx) => ({
			id: tx.id,
			date: tx.date as ISODateString,
			amount: tx.amount as MoneyMinorUnits,
			description: tx.description ?? "",
		}));
}

/**
 * Find the newest date from existing transactions.
 */
function findNewestDate(transactions: Transaction[]): string | null {
	const activeTxs = transactions.filter((tx) => !tx.deletedAt);
	if (activeTxs.length === 0) return null;

	return activeTxs.reduce((newest, tx) => {
		return tx.date > newest ? tx.date : newest;
	}, activeTxs[0].date);
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useImportState(options: UseImportStateOptions): UseImportStateReturn {
	const { existingTransactions, accounts, templates, defaultCurrency } = options;

	// Core state
	const [session, setSession] = useState<ImportSession | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Computed values from existing data
	const existingForDuplicates = useMemo(
		() => toDuplicateCheckFormat(existingTransactions),
		[existingTransactions]
	);
	const newestExistingDate = useMemo(
		() => findNewestDate(existingTransactions),
		[existingTransactions]
	);

	// ========================================================================
	// Actions
	// ========================================================================

	/**
	 * Load and parse a file.
	 */
	const loadFile = useCallback(
		async (file: File) => {
			setIsLoading(true);
			setError(null);

			try {
				const content = await file.text();
				const fileType = detectFileType(content);
				const fileId = generateSessionId();

				// Parse raw data
				let rawRows: string[][] = [];
				let headers: string[] = [];
				let detectedAccountNumber: string | null = null;

				if (fileType === "ofx") {
					const ofxResult = parseOFX(content);
					if (!ofxResult.ok) {
						throw new Error(ofxResult.error?.message ?? "Failed to parse OFX file");
					}
					// Convert OFX transactions to rows
					const ofxData = ofxResult.data;
					detectedAccountNumber = ofxData.statements[0]?.account.accountId ?? null;

					// Create headers and rows from OFX data
					headers = ["Date", "Description", "Amount"];
					rawRows = [headers];
					for (const stmt of ofxData.statements) {
						for (const tx of stmt.transactions) {
							rawRows.push([
								tx.datePosted.toString(),
								tx.name || tx.memo || "",
								tx.amount.toString(),
							]);
						}
					}
				} else {
					const parsed = parseRawRows(content);
					rawRows = parsed.rows;
					headers = parsed.headers;
				}

				// Find most recently used template
				const sortedTemplates = [...templates]
					.filter((t) => !t.deletedAt && t.lastUsedAt)
					.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
				const recentTemplate = sortedTemplates[0] ?? null;

				// Initialize config from template or defaults
				const config: ImportConfig = recentTemplate
					? {
							formatting: {
								hasHeaders: recentTemplate.formatting.hasHeaders ?? true,
								thousandSeparator: recentTemplate.formatting.thousandSeparator ?? ",",
								decimalSeparator: recentTemplate.formatting.decimalSeparator ?? ".",
								dateFormat: recentTemplate.formatting.dateFormat ?? "yyyy-MM-dd",
								collapseWhitespace: recentTemplate.formatting.collapseWhitespace ?? false,
							},
							duplicateDetection: {
								dateMatchMode:
									(recentTemplate.duplicateDetection?.dateMatchMode as "exact" | "within") ??
									"within",
								maxDateDiffDays: recentTemplate.duplicateDetection?.maxDateDiffDays ?? 3,
								descriptionMatchMode:
									(recentTemplate.duplicateDetection?.descriptionMatchMode as
										| "exact"
										| "similar") ?? "similar",
								minDescriptionSimilarity:
									recentTemplate.duplicateDetection?.minDescriptionSimilarity ?? 0.6,
							},
							oldTransactionFilter: {
								mode:
									(recentTemplate.oldTransactionFilter?.mode as
										| "ignore-all"
										| "ignore-duplicates"
										| "do-not-ignore") ?? "ignore-duplicates",
								cutoffType:
									(recentTemplate.oldTransactionFilter?.cutoffType as "days" | "date") ?? "days",
								cutoffDays: recentTemplate.oldTransactionFilter?.cutoffDays ?? 10,
								cutoffDate: (recentTemplate.oldTransactionFilter?.cutoffDate as string) ?? null,
							},
							columnMappings: { ...recentTemplate.columnMappings },
						}
					: { ...DEFAULT_IMPORT_CONFIG };

				// For OFX files, always use fixed column mappings since structure is known
				// OFX headers are ["Date", "Description", "Amount"] (indices 0, 1, 2)
				if (fileType === "ofx") {
					config.columnMappings = {
						"0": "date",
						"1": "description",
						"2": "amount",
					};
				} else if (!recentTemplate) {
					// For CSV files without a template, auto-detect columns from headers
					config.columnMappings = autoDetectColumnMappings(headers);
				}

				// Determine account selection and action for OFX files
				let selectedAccountId: string | null = null;
				let accountAction: ImportSession["accountAction"] = null;
				const activeAccounts = accounts.filter((a) => !a.deletedAt);

				if (fileType === "ofx") {
					if (detectedAccountNumber) {
						// Case 1: OFX has ACCTID - try to match
						const matchingAccount = activeAccounts.find(
							(a) => a.accountNumber === detectedAccountNumber
						);

						if (matchingAccount) {
							// Exact match found
							selectedAccountId = matchingAccount.id;
							accountAction = { type: "matched" };
						} else {
							// No match - check if any account has no accountNumber
							const accountWithoutId = activeAccounts.find((a) => !a.accountNumber);

							if (accountWithoutId) {
								// Will apply ID to this account
								selectedAccountId = accountWithoutId.id;
								accountAction = {
									type: "apply-id",
									accountId: accountWithoutId.id,
									accountNumber: detectedAccountNumber,
								};
							} else {
								// All accounts have IDs, need to create new
								// Generate unique name "Account N"
								const existingNames = new Set(activeAccounts.map((a) => a.name.toLowerCase()));
								let n = 1;
								while (existingNames.has(`account ${n}`)) {
									n++;
								}
								accountAction = {
									type: "create-new",
									accountName: `Account ${n}`,
									accountNumber: detectedAccountNumber,
								};
								// No account selected - will create on import
								selectedAccountId = null;
							}
						}
					} else {
						// Case 2: No ACCTID in OFX - default to first account
						if (activeAccounts.length > 0) {
							selectedAccountId = activeAccounts[0].id;
							accountAction = { type: "default-selected" };
						}
					}
				} else {
					// CSV files - no auto-selection
					selectedAccountId = null;
					accountAction = null;
				}

				// Create session
				const newSession: ImportSession = {
					fileId,
					fileName: file.name,
					fileType,
					rawContent: content,
					rawRows,
					headers,
					templateId: recentTemplate?.id ?? null,
					config,
					selectedAccountId,
					detectedAccountNumber,
					accountAction,
					previewTransactions: [],
					duplicateResults: [],
					filteredOut: [],
					validationErrors: [],
					canImport: false,
				};

				setSession(newSession);
			} catch (err) {
				setError(err instanceof Error ? err : new Error("Failed to load file"));
			} finally {
				setIsLoading(false);
			}
		},
		[templates, accounts]
	);

	/**
	 * Update configuration.
	 */
	const setConfig = useCallback((updates: Partial<ImportConfig>) => {
		setSession((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				config: {
					...prev.config,
					...updates,
					formatting: {
						...prev.config.formatting,
						...updates.formatting,
					},
					duplicateDetection: {
						...prev.config.duplicateDetection,
						...updates.duplicateDetection,
					},
					oldTransactionFilter: {
						...prev.config.oldTransactionFilter,
						...updates.oldTransactionFilter,
					},
				},
			};
		});
	}, []);

	/**
	 * Select an account.
	 * When user manually selects, recalculate the account action.
	 */
	const selectAccount = useCallback(
		(accountId: string) => {
			setSession((prev) => {
				if (!prev) return prev;

				// Recalculate account action based on new selection
				let newAccountAction: ImportSession["accountAction"] = null;

				if (prev.fileType === "ofx" && prev.detectedAccountNumber) {
					const selectedAccount = accounts.find((a) => a.id === accountId && !a.deletedAt);

					if (selectedAccount) {
						if (selectedAccount.accountNumber === prev.detectedAccountNumber) {
							// User selected the matching account
							newAccountAction = { type: "matched" };
						} else if (!selectedAccount.accountNumber) {
							// User selected an account without ID - will apply
							newAccountAction = {
								type: "apply-id",
								accountId: selectedAccount.id,
								accountNumber: prev.detectedAccountNumber,
							};
						} else {
							// User selected an account with a different ID
							// This is an explicit override - treat as matched (no action)
							newAccountAction = { type: "matched" };
						}
					}
				} else if (prev.fileType === "ofx" && !prev.detectedAccountNumber) {
					// No ACCTID in file - any selection is just a default
					newAccountAction = { type: "default-selected" };
				}

				return { ...prev, selectedAccountId: accountId, accountAction: newAccountAction };
			});
		},
		[accounts]
	);

	/**
	 * Select a template and apply its settings.
	 */
	const selectTemplate = useCallback(
		(templateId: string | null) => {
			setSession((prev) => {
				if (!prev) return prev;

				if (!templateId) {
					// Reset to defaults
					return {
						...prev,
						templateId: null,
						config: { ...DEFAULT_IMPORT_CONFIG },
					};
				}

				const template = templates.find((t) => t.id === templateId);
				if (!template) return prev;

				return {
					...prev,
					templateId,
					config: {
						formatting: {
							hasHeaders: template.formatting.hasHeaders ?? true,
							thousandSeparator: template.formatting.thousandSeparator ?? ",",
							decimalSeparator: template.formatting.decimalSeparator ?? ".",
							dateFormat: template.formatting.dateFormat ?? "yyyy-MM-dd",
							collapseWhitespace: template.formatting.collapseWhitespace ?? false,
						},
						duplicateDetection: {
							dateMatchMode:
								(template.duplicateDetection?.dateMatchMode as "exact" | "within") ?? "within",
							maxDateDiffDays: template.duplicateDetection?.maxDateDiffDays ?? 3,
							descriptionMatchMode:
								(template.duplicateDetection?.descriptionMatchMode as "exact" | "similar") ??
								"similar",
							minDescriptionSimilarity:
								template.duplicateDetection?.minDescriptionSimilarity ?? 0.6,
						},
						oldTransactionFilter: {
							mode:
								(template.oldTransactionFilter?.mode as
									| "ignore-all"
									| "ignore-duplicates"
									| "do-not-ignore") ?? "ignore-duplicates",
							cutoffType: (template.oldTransactionFilter?.cutoffType as "days" | "date") ?? "days",
							cutoffDays: template.oldTransactionFilter?.cutoffDays ?? 10,
							cutoffDate: (template.oldTransactionFilter?.cutoffDate as string) ?? null,
						},
						columnMappings: { ...template.columnMappings },
					},
				};
			});
		},
		[templates]
	);

	/**
	 * Reset the import session.
	 */
	const reset = useCallback(() => {
		setSession(null);
		setError(null);
	}, []);

	// ========================================================================
	// Computed Preview
	// ========================================================================

	/**
	 * Compute preview transactions from raw data and config.
	 * This is memoized and recomputes when session or config changes.
	 */
	const computedPreview = useMemo(() => {
		if (!session) {
			return {
				previewTransactions: [] as PreviewTransaction[],
				duplicateResults: [] as DuplicateCheckResult[],
				filteredOut: [] as PreviewTransaction[],
				validationErrors: [] as ValidationError[],
				canImport: false,
			};
		}

		const { rawRows, headers, config, selectedAccountId, fileType } = session;
		const { formatting, duplicateDetection, oldTransactionFilter, columnMappings } = config;

		// Skip header row if present
		const dataRows = formatting.hasHeaders ? rawRows.slice(1) : rawRows;

		// Build column index map
		// columnMappings keys are column indices as strings (e.g., "0", "1", "2")
		// values are target field names (e.g., "date", "description", "amount")
		const columnMap = new Map<string, number>();
		for (const [sourceColIdx, targetField] of Object.entries(columnMappings)) {
			if (targetField && targetField !== "ignore") {
				const idx = Number.parseInt(sourceColIdx, 10);
				if (!Number.isNaN(idx) && idx >= 0 && idx < headers.length) {
					columnMap.set(targetField, idx);
				}
			}
		}

		// Parse each row into preview transactions
		const previews: PreviewTransaction[] = [];
		const errors: ValidationError[] = [];

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			const rowIndex = formatting.hasHeaders ? i + 1 : i;
			const rowErrors: string[] = [];

			// Parse date
			const dateIdx = columnMap.get("date");
			let date = "";
			if (dateIdx !== undefined && row[dateIdx]) {
				const parsed = parseDate(row[dateIdx], formatting.dateFormat);
				if (parsed) {
					date = parsed.toString();
				} else {
					rowErrors.push(`Invalid date: ${row[dateIdx]}`);
				}
			} else if (fileType === "csv") {
				rowErrors.push("Missing date");
			}

			// Parse amount
			const amountIdx = columnMap.get("amount");
			let amount: MoneyMinorUnits = 0 as MoneyMinorUnits;
			if (amountIdx !== undefined && row[amountIdx]) {
				const parsed = parseNumber(
					row[amountIdx],
					formatting.thousandSeparator,
					formatting.decimalSeparator
				);
				if (parsed !== null) {
					amount = toMinorUnitsForCurrency(parsed, defaultCurrency);
				} else {
					rowErrors.push(`Invalid amount: ${row[amountIdx]}`);
				}
			} else if (fileType === "csv") {
				rowErrors.push("Missing amount");
			}

			// Parse description
			const descIdx = columnMap.get("description");
			let description = descIdx !== undefined && row[descIdx] ? row[descIdx] : "";
			if (formatting.collapseWhitespace) {
				description = normalizeWhitespace(description);
			}

			previews.push({
				rowIndex,
				date,
				description,
				amount,
				status: rowErrors.length > 0 ? "invalid" : "valid",
				duplicateOf: null,
				duplicateConfidence: 0,
				validationErrors: rowErrors,
			});

			// Collect validation errors
			for (const err of rowErrors) {
				errors.push({ rowIndex, field: null, message: err });
			}
		}

		// Run duplicate detection (only for valid previews)
		const validPreviews = previews.filter((p) => p.status === "valid");
		const duplicateCheckTxs: DuplicateCheckTransaction[] = validPreviews.map((p) => ({
			id: `preview-${p.rowIndex}`,
			date: p.date as ISODateString,
			amount: p.amount,
			description: p.description,
		}));

		const duplicateConfig = {
			...DEFAULT_DUPLICATE_CONFIG,
			dateMatchMode: duplicateDetection.dateMatchMode,
			maxDateDiffDays: duplicateDetection.maxDateDiffDays,
			descriptionMatchMode: duplicateDetection.descriptionMatchMode,
			minDescriptionSimilarity: duplicateDetection.minDescriptionSimilarity,
		};

		const matches = detectDuplicates(duplicateCheckTxs, existingForDuplicates, duplicateConfig);

		// Build duplicate results
		const duplicateResults: DuplicateCheckResult[] = [];
		const matchMap = new Map<string, DuplicateMatch>();
		for (const match of matches) {
			matchMap.set(match.newTransactionId, match);
		}

		for (const p of validPreviews) {
			const match = matchMap.get(`preview-${p.rowIndex}`);
			if (match) {
				p.duplicateOf = match.existingTransactionId;
				p.duplicateConfidence = match.confidence;
				p.status = "duplicate";

				duplicateResults.push({
					rowIndex: p.rowIndex,
					isDuplicate: true,
					matchedTransactionId: match.existingTransactionId,
					confidence: match.confidence,
					matchDetails: {
						dateScore: match.matchDetails.dateMatch ? 1 : 0,
						descriptionScore: match.matchDetails.descriptionSimilarity,
						amountMatches: match.matchDetails.amountMatch,
					},
				});
			}
		}

		// Run old transaction filter
		type FilterableTx = PreviewTransaction & { isDuplicate: boolean };
		const filterablePreviews: FilterableTx[] = previews.map((p) => ({
			...p,
			isDuplicate: p.status === "duplicate",
		}));

		const filterResult = filterOldTransactions(
			filterablePreviews,
			newestExistingDate,
			oldTransactionFilter
		);

		// Mark filtered transactions
		const excludedRowIndices = new Set(filterResult.excluded.map((t) => t.rowIndex));
		for (const p of previews) {
			if (excludedRowIndices.has(p.rowIndex) && p.status !== "invalid") {
				p.status = "filtered";
			}
		}

		// Validation: account required for CSV (OFX auto-selects or requires manual selection too)
		if (!selectedAccountId && fileType === "csv") {
			errors.push({
				rowIndex: -1,
				field: "account",
				message: "Please select an account for CSV import",
			});
		} else if (!selectedAccountId && fileType === "ofx") {
			errors.push({ rowIndex: -1, field: "account", message: "Please select an account" });
		}

		// Can import if no global errors and at least one valid transaction
		const hasValidTransactions = previews.some(
			(p) => p.status === "valid" || p.status === "duplicate"
		);
		const hasGlobalErrors = errors.some((e) => e.rowIndex === -1);
		const canImport = hasValidTransactions && !hasGlobalErrors;

		return {
			previewTransactions: previews,
			duplicateResults,
			filteredOut: filterResult.excluded as PreviewTransaction[],
			validationErrors: errors,
			canImport,
		};
	}, [session, existingForDuplicates, newestExistingDate, defaultCurrency]);

	// ========================================================================
	// Summary Stats
	// ========================================================================

	const summaryStats = useMemo<ImportSummaryStats>(() => {
		const { previewTransactions } = computedPreview;
		return {
			totalRows: previewTransactions.length,
			validCount: previewTransactions.filter((p) => p.status === "valid").length,
			errorCount: previewTransactions.filter((p) => p.status === "invalid").length,
			duplicateCount: previewTransactions.filter((p) => p.status === "duplicate").length,
			filteredCount: previewTransactions.filter((p) => p.status === "filtered").length,
		};
	}, [computedPreview]);

	// ========================================================================
	// Return
	// ========================================================================

	return {
		session,
		isLoading,
		error,
		loadFile,
		setConfig,
		selectAccount,
		selectTemplate,
		reset,
		previewTransactions: computedPreview.previewTransactions,
		summaryStats,
		canImport: computedPreview.canImport,
		validationErrors: computedPreview.validationErrors,
	};
}
