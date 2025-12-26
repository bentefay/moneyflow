/**
 * Import Processor
 *
 * Core logic for processing imported transactions.
 * Handles parsing, validation, and duplicate detection.
 */

import { parseCSV, parseNumber, parseDate, type CSVParseOptions } from "./csv";
import { parseOFX, isOFXFormat, type OFXTransaction } from "./ofx";
import type { ColumnMapping, TargetFieldId } from "@/components/features/import/ColumnMappingStep";
import type { ImportFormatting } from "@/components/features/import/FormattingStep";
import { detectDuplicates, type DuplicateMatch } from "./duplicates";

/**
 * Processed transaction ready for import.
 */
export interface ProcessedTransaction {
  /** Unique ID for this transaction */
  id: string;
  /** Transaction date (ISO string) */
  date: string;
  /** Amount (positive = income, negative = expense) */
  amount: number;
  /** Merchant name */
  merchant: string;
  /** Description/memo */
  description: string;
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
  date: string;
  amount: number;
  description: string;
}

/**
 * Process a CSV file for import.
 *
 * @param content - Raw CSV content
 * @param mappings - Column mappings
 * @param formatting - Formatting options
 * @param existingTransactions - Existing transactions for duplicate detection
 * @returns Processing result
 */
export function processCSVImport(
  content: string,
  mappings: ColumnMapping[],
  formatting: ImportFormatting,
  existingTransactions: ExistingTransaction[] = []
): ProcessImportResult {
  // Parse CSV
  const csvOptions: CSVParseOptions = {
    hasHeaders: true,
    thousandSeparator: formatting.thousandSeparator,
    decimalSeparator: formatting.decimalSeparator,
    dateFormat: formatting.dateFormat,
  };
  const parseResult = parseCSV(content, csvOptions);

  // Build column index map
  const columnMap = new Map<TargetFieldId, number>();
  mappings.forEach((mapping, idx) => {
    if (mapping.targetField && mapping.targetField !== "ignore") {
      columnMap.set(mapping.targetField, idx);
    }
  });

  // Process each row
  const transactions: ProcessedTransaction[] = [];
  const errors: ProcessImportResult["errors"] = [];

  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i];
    const rowErrors: string[] = [];

    // Extract date
    const dateIdx = columnMap.get("date");
    let date: string | null = null;
    if (dateIdx !== undefined && row[dateIdx]) {
      date = parseDate(row[dateIdx], formatting.dateFormat);
      if (!date) {
        rowErrors.push(`Invalid date: ${row[dateIdx]}`);
      }
    } else {
      rowErrors.push("Missing date");
    }

    // Extract amount
    const amountIdx = columnMap.get("amount");
    let amount: number | null = null;
    if (amountIdx !== undefined && row[amountIdx]) {
      amount = parseNumber(
        row[amountIdx],
        formatting.thousandSeparator,
        formatting.decimalSeparator
      );
      if (isNaN(amount)) {
        rowErrors.push(`Invalid amount: ${row[amountIdx]}`);
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
      rowErrors.push("Missing amount");
    }

    // Extract optional fields
    const merchantIdx = columnMap.get("merchant");
    const descriptionIdx = columnMap.get("description");
    const memoIdx = columnMap.get("memo");
    const checkNumberIdx = columnMap.get("checkNumber");
    const categoryIdx = columnMap.get("category");

    const merchant = merchantIdx !== undefined ? (row[merchantIdx] || "") : "";
    const description = descriptionIdx !== undefined ? (row[descriptionIdx] || "") : "";
    const memo = memoIdx !== undefined ? (row[memoIdx] || "") : "";
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
      id: `import-${Date.now()}-${i}`,
      date,
      amount,
      merchant: merchant || description,
      description: memo || description,
      checkNumber,
      categoryHint,
      isDuplicate: false,
    });
  }

  // Detect duplicates
  const duplicateMatches = detectDuplicates(transactions, existingTransactions);

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

/**
 * Process an OFX file for import.
 *
 * @param content - Raw OFX content
 * @param existingTransactions - Existing transactions for duplicate detection
 * @returns Processing result
 */
export function processOFXImport(
  content: string,
  existingTransactions: ExistingTransaction[] = []
): ProcessImportResult {
  const parseResult = parseOFX(content);

  // Convert OFX transactions to our format
  const transactions: ProcessedTransaction[] = parseResult.transactions.map(
    (tx, i): ProcessedTransaction => ({
      id: tx.id || `import-${Date.now()}-${i}`,
      date: tx.date,
      amount: tx.amount,
      merchant: tx.name,
      description: tx.memo,
      checkNumber: tx.checkNumber,
      isDuplicate: false,
    })
  );

  // Detect duplicates
  const duplicateMatches = detectDuplicates(transactions, existingTransactions);

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
    errors: [], // OFX parsing handles errors internally
    stats: {
      totalRows: transactions.length,
      validRows: transactions.length,
      errorRows: 0,
      duplicateCount,
    },
  };
}

/**
 * Process a file for import (auto-detect format).
 *
 * @param content - Raw file content
 * @param mappings - Column mappings (for CSV)
 * @param formatting - Formatting options (for CSV)
 * @param existingTransactions - Existing transactions for duplicate detection
 * @returns Processing result
 */
export function processImport(
  content: string,
  mappings: ColumnMapping[],
  formatting: ImportFormatting,
  existingTransactions: ExistingTransaction[] = []
): ProcessImportResult {
  if (isOFXFormat(content)) {
    return processOFXImport(content, existingTransactions);
  }
  return processCSVImport(content, mappings, formatting, existingTransactions);
}
