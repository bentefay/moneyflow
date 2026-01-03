/**
 * Import Processor
 *
 * Core logic for processing imported transactions.
 * Handles parsing, validation, and duplicate detection.
 *
 * All amounts are converted to MoneyMinorUnits (integer minor units) during processing.
 * The conversion is currency-aware: USD uses cents (×100), JPY stays as-is (×1), etc.
 *
 * Currency resolution order:
 * 1. Embedded in file (OFX CURDEF)
 * 2. Account's configured currency (passed to processor)
 * 3. User's default currency (passed to processor)
 * 4. Fallback to USD
 */

import { Temporal } from "temporal-polyfill";
import type { ColumnMapping, TargetFieldId } from "@/components/features/import/ColumnMappingStep";
import type { ImportFormatting } from "@/components/features/import/FormattingStep";
import { asMinorUnits, type MoneyMinorUnits, toMinorUnitsForCurrency } from "@/lib/domain/currency";
import { type ISODateString, toISODateString } from "@/types";
import { type CSVParseOptions, parseCSV, parseDate, parseNumber } from "./csv";
import { detectDuplicates } from "./duplicates";
import { isOFXFormat, parseOFX } from "./ofx";

/**
 * Processed transaction ready for import.
 */
export interface ProcessedTransaction {
	/** Unique ID for this transaction */
	id: string;
	/** Transaction date (branded ISO string for CRDT storage) */
	date: ISODateString;
	/** Amount in minor units/cents (positive = income, negative = expense) */
	amount: MoneyMinorUnits;
	/** Imported description text from bank file (OFX NAME, CSV description/merchant column) */
	description: string;
	/** Notes/memo */
	notes: string;
	/** Check number if available */
	checkNumber?: string;
	/** Category/tag hint from import */
	categoryHint?: string;
	/** Whether this is a suspected duplicate */
	isDuplicate: boolean;
	/** ID of the suspected original transaction */
	duplicateOfId?: string;
	/** Confidence score of duplicate match (0-1) */
	duplicateConfidence?: number;
}

/**
 * Import processing result.
 */
export interface ProcessImportResult {
	/** Successfully processed transactions */
	transactions: ProcessedTransaction[];
	/** Rows that failed to parse */
	errors: {
		rowIndex: number;
		row: string[];
		errors: string[];
	}[];
	/** Statistics */
	stats: {
		totalRows: number;
		validRows: number;
		errorRows: number;
		duplicateCount: number;
	};
}

/**
 * Existing transaction for duplicate detection.
 */
export interface ExistingTransaction {
	id: string;
	date: ISODateString;
	/** Amount in minor units (cents) */
	amount: MoneyMinorUnits;
	description: string;
}

/**
 * Process a CSV file for import.
 *
 * @param content - Raw CSV content
 * @param mappings - Column mappings
 * @param formatting - Formatting options
 * @param existingTransactions - Existing transactions for duplicate detection
 * @param currencyCode - ISO 4217 currency code (default: "USD")
 * @returns Processing result
 */
export function processCSVImport(
	content: string,
	mappings: ColumnMapping[],
	formatting: ImportFormatting,
	existingTransactions: ExistingTransaction[] = [],
	currencyCode: string = "USD"
): ProcessImportResult {
	// Parse CSV
	const csvOptions: CSVParseOptions = {
		hasHeaders: true,
		thousandSeparator: formatting.thousandSeparator,
		decimalSeparator: formatting.decimalSeparator,
		dateFormat: formatting.dateFormat,
	};
	const parseResult = parseCSV(content, csvOptions);

	// Build column index map - look up source column name in CSV headers
	const columnMap = new Map<TargetFieldId, number>();
	for (const mapping of mappings) {
		if (mapping.targetField && mapping.targetField !== "ignore") {
			const columnIndex = parseResult.headers.indexOf(mapping.sourceColumn);
			if (columnIndex !== -1) {
				columnMap.set(mapping.targetField, columnIndex);
			}
		}
	}

	// Process each row
	const transactions: ProcessedTransaction[] = [];
	const errors: ProcessImportResult["errors"] = [];

	for (let i = 0; i < parseResult.rows.length; i++) {
		const row = parseResult.rows[i];
		const rowErrors: string[] = [];

		// Extract date
		const dateIdx = columnMap.get("date");
		let date: ISODateString | null = null;
		if (dateIdx !== undefined && row[dateIdx]) {
			const parsedDate = parseDate(row[dateIdx], formatting.dateFormat);
			if (!parsedDate) {
				rowErrors.push(`Invalid date: ${row[dateIdx]}`);
			} else {
				date = toISODateString(parsedDate);
			}
		} else {
			rowErrors.push("Missing date");
		}

		// Extract amount - convert to MoneyMinorUnits (currency-aware)
		const amountIdx = columnMap.get("amount");
		let amount: MoneyMinorUnits | null = null;
		if (amountIdx !== undefined && row[amountIdx]) {
			let parsedAmount = parseNumber(
				row[amountIdx],
				formatting.thousandSeparator,
				formatting.decimalSeparator
			);
			if (isNaN(parsedAmount)) {
				rowErrors.push(`Invalid amount: ${row[amountIdx]}`);
			} else {
				// Negate if requested
				if (formatting.negateAmounts) {
					parsedAmount = -parsedAmount;
				}
				// Convert to minor units using currency's decimal places
				// If amountInCents is true, the value is already in minor units
				if (formatting.amountInCents) {
					amount = asMinorUnits(Math.round(parsedAmount));
				} else {
					amount = toMinorUnitsForCurrency(parsedAmount, currencyCode);
				}
			}
		} else {
			rowErrors.push("Missing amount");
		}

		// Extract optional fields
		const merchantIdx = columnMap.get("merchant");
		const descriptionIdx = columnMap.get("description");
		const memoIdx = columnMap.get("memo");
		const checkNumberIdx = columnMap.get("checkNumber");
		const categoryIdx = columnMap.get("category");

		const merchantCol = merchantIdx !== undefined ? row[merchantIdx] || "" : "";
		const descriptionCol = descriptionIdx !== undefined ? row[descriptionIdx] || "" : "";
		const memo = memoIdx !== undefined ? row[memoIdx] || "" : "";
		const checkNumber = checkNumberIdx !== undefined ? row[checkNumberIdx] : undefined;
		const categoryHint = categoryIdx !== undefined ? row[categoryIdx] : undefined;

		// If there are errors, add to errors list
		if (rowErrors.length > 0 || !date || amount === null) {
			errors.push({
				rowIndex: i,
				row,
				errors: rowErrors,
			});
			continue;
		}

		// Create transaction
		transactions.push({
			id: `import-${Temporal.Now.instant().epochMilliseconds}-${i}`,
			date,
			amount,
			description: merchantCol || descriptionCol,
			notes: memo || descriptionCol,
			checkNumber,
			categoryHint,
			isDuplicate: false,
		});
	}

	// Detect duplicates - map ProcessedTransaction to DuplicateCheckTransaction format
	const transactionsForDuplicateCheck = transactions.map((t) => ({
		id: t.id,
		date: t.date,
		amount: t.amount,
		description: t.description || t.notes, // Use description/notes for duplicate comparison
	}));
	const duplicateMatches = detectDuplicates(transactionsForDuplicateCheck, existingTransactions);

	// Mark duplicates
	for (const match of duplicateMatches) {
		const tx = transactions.find((t) => t.id === match.newTransactionId);
		if (tx) {
			tx.isDuplicate = true;
			tx.duplicateOfId = match.existingTransactionId;
			tx.duplicateConfidence = match.confidence;
		}
	}

	const duplicateCount = transactions.filter((t) => t.isDuplicate).length;

	return {
		transactions,
		errors,
		stats: {
			totalRows: parseResult.rows.length,
			validRows: transactions.length,
			errorRows: errors.length,
			duplicateCount,
		},
	};
}

/** Result type for OFX import processing */
export type ProcessOFXImportResult =
	| { readonly ok: true; readonly data: ProcessImportResult; readonly currency: string }
	| { readonly ok: false; readonly error: string };

/**
 * Options for OFX import processing.
 */
export interface ProcessOFXImportOptions {
	/** Existing transactions for duplicate detection */
	existingTransactions?: ExistingTransaction[];
	/** Currency to use if not specified in OFX (default: "USD") */
	fallbackCurrency?: string;
	/**
	 * Expected currency for the target account.
	 * If provided and OFX declares a different currency, import will fail.
	 * This prevents importing USD transactions into a EUR account.
	 */
	expectedCurrency?: string;
}

/**
 * Process an OFX file for import.
 *
 * @param content - Raw OFX content
 * @param options - Import options including duplicate detection and currency validation
 * @returns Processing result (Result type) with detected currency
 */
export function processOFXImport(
	content: string,
	options: ProcessOFXImportOptions = {}
): ProcessOFXImportResult {
	const { existingTransactions = [], fallbackCurrency = "USD", expectedCurrency } = options;

	const parseResult = parseOFX(content);

	// Handle parse errors
	if (!parseResult.ok) {
		const errorDetails =
			parseResult.error.details.length > 0 ? `: ${parseResult.error.details.join(", ")}` : "";
		return {
			ok: false,
			error: `${parseResult.error.message}${errorDetails}`,
		};
	}

	// Use the currency from the first statement, or fallback
	const detectedCurrency = parseResult.data.statements[0]?.currency || fallbackCurrency;

	// Validate currency matches expected account currency
	if (expectedCurrency && detectedCurrency.toUpperCase() !== expectedCurrency.toUpperCase()) {
		return {
			ok: false,
			error: `Currency mismatch: OFX file contains ${detectedCurrency} transactions, but the target account uses ${expectedCurrency}. Import to an account with matching currency.`,
		};
	}

	// Flatten transactions from all statements
	const allTransactions: ProcessedTransaction[] = [];
	let transactionIndex = 0;

	for (const statement of parseResult.data.statements) {
		// Use statement's currency (OFX files can have multiple accounts with different currencies)
		const statementCurrency = statement.currency || fallbackCurrency;

		// Check each statement's currency matches (multi-statement OFX files)
		if (expectedCurrency && statementCurrency.toUpperCase() !== expectedCurrency.toUpperCase()) {
			return {
				ok: false,
				error: `Currency mismatch: OFX statement contains ${statementCurrency} transactions, but the target account uses ${expectedCurrency}. Import to an account with matching currency.`,
			};
		}

		for (const tx of statement.transactions) {
			// Convert OFX amount (major units) to MoneyMinorUnits using currency's decimal places
			const amountInMinorUnits = toMinorUnitsForCurrency(tx.amount, statementCurrency);
			allTransactions.push({
				id: tx.fitId || `import-${Temporal.Now.instant().epochMilliseconds}-${transactionIndex}`,
				date: toISODateString(tx.datePosted),
				amount: amountInMinorUnits,
				description: tx.name,
				notes: tx.memo,
				checkNumber: tx.checkNumber,
				isDuplicate: false,
			});
			transactionIndex++;
		}
	}

	// Detect duplicates - map ProcessedTransaction to DuplicateCheckTransaction format
	const transactionsForDuplicateCheck = allTransactions.map((t) => ({
		id: t.id,
		date: t.date,
		amount: t.amount,
		description: t.description || t.notes || "", // Use description/notes for duplicate comparison
	}));
	const duplicateMatches = detectDuplicates(transactionsForDuplicateCheck, existingTransactions);

	// Mark duplicates
	for (const match of duplicateMatches) {
		const tx = allTransactions.find((t) => t.id === match.newTransactionId);
		if (tx) {
			tx.isDuplicate = true;
			tx.duplicateOfId = match.existingTransactionId;
			tx.duplicateConfidence = match.confidence;
		}
	}

	const duplicateCount = allTransactions.filter((t) => t.isDuplicate).length;

	return {
		ok: true,
		data: {
			transactions: allTransactions,
			errors: [],
			stats: {
				totalRows: allTransactions.length,
				validRows: allTransactions.length,
				errorRows: 0,
				duplicateCount,
			},
		},
		currency: detectedCurrency,
	};
}

/** Result type for import processing */
export type ProcessImportResultType =
	| { readonly ok: true; readonly data: ProcessImportResult; readonly currency?: string }
	| { readonly ok: false; readonly error: string };

/**
 * Process a file for import (auto-detect format).
 *
 * @param content - Raw file content
 * @param mappings - Column mappings (for CSV)
 * @param formatting - Formatting options (for CSV)
 * @param existingTransactions - Existing transactions for duplicate detection
 * @param currencyCode - ISO 4217 currency code for CSV imports (default: "USD")
 * @param expectedCurrency - For OFX: expected currency of target account (validates against OFX CURDEF)
 * @returns Processing result (Result type) with currency for OFX imports
 */
export function processImport(
	content: string,
	mappings: ColumnMapping[],
	formatting: ImportFormatting,
	existingTransactions: ExistingTransaction[] = [],
	currencyCode: string = "USD",
	expectedCurrency?: string
): ProcessImportResultType {
	if (isOFXFormat(content)) {
		// OFX files contain their own currency - pass fallback in case not specified
		return processOFXImport(content, {
			existingTransactions,
			fallbackCurrency: currencyCode,
			expectedCurrency,
		});
	}
	return {
		ok: true,
		data: processCSVImport(content, mappings, formatting, existingTransactions, currencyCode),
	};
}
