/**
 * CSV Parser
 *
 * Parses CSV files using papaparse library.
 * Provides utilities for number and date parsing with configurable formats.
 */

import { isValid, parse } from "date-fns";
import Papa from "papaparse";
import { Temporal } from "temporal-polyfill";

/**
 * CSV parsing options.
 */
export interface CSVParseOptions {
    /** Column separator (default: ",") */
    separator?: string;
    /** Whether the first row is headers (default: true) */
    hasHeaders?: boolean;
    /** Thousands separator to remove from numbers (default: ",") */
    thousandSeparator?: string;
    /** Decimal separator (default: ".") */
    decimalSeparator?: string;
    /** Date format string for parsing (default: "yyyy-MM-dd") */
    dateFormat?: string;
    /** Quote character (default: '"') */
    quoteChar?: string;
    /** Maximum rows to parse (for preview) */
    maxRows?: number;
}

/**
 * Parsed CSV result.
 */
export interface CSVParseResult {
    /** Column headers (or generated if none) */
    headers: string[];
    /** Data rows */
    rows: string[][];
    /** Total number of rows parsed */
    rowCount: number;
    /** Whether parsing was truncated due to maxRows */
    truncated: boolean;
    /** Any warnings during parsing */
    warnings: string[];
}

/**
 * Default parsing options.
 */
const DEFAULT_OPTIONS: Required<CSVParseOptions> = {
    separator: ",",
    hasHeaders: true,
    thousandSeparator: ",",
    decimalSeparator: ".",
    dateFormat: "yyyy-MM-dd",
    quoteChar: '"',
    maxRows: Infinity
};

/**
 * Parse a CSV string into structured data.
 *
 * @param content - Raw CSV content
 * @param options - Parsing options
 * @returns Parsed CSV result
 *
 * @example
 * ```ts
 * const result = parseCSV("name,amount\nCoffee,5.00\nGas,45.00");
 * // result.headers = ["name", "amount"]
 * // result.rows = [["Coffee", "5.00"], ["Gas", "45.00"]]
 * ```
 */
export function parseCSV(content: string, options: CSVParseOptions = {}): CSVParseResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const warnings: string[] = [];

    if (!content || content.trim() === "") {
        return {
            headers: [],
            rows: [],
            rowCount: 0,
            truncated: false,
            warnings: ["Empty CSV file"]
        };
    }

    // Parse with papaparse
    const result = Papa.parse<string[]>(content, {
        delimiter: opts.separator,
        quoteChar: opts.quoteChar,
        header: false, // We handle headers ourselves for more control
        skipEmptyLines: true,
        preview: opts.maxRows !== Infinity ? opts.maxRows + (opts.hasHeaders ? 1 : 0) : 0
    });

    // Collect errors as warnings
    for (const error of result.errors) {
        warnings.push(`Row ${error.row}: ${error.message}`);
    }

    const allRows = result.data;
    const truncated = result.meta.truncated ?? false;

    if (allRows.length === 0) {
        return {
            headers: [],
            rows: [],
            rowCount: 0,
            truncated: false,
            warnings
        };
    }

    // Extract headers
    let headers: string[];
    let dataRows: string[][];
    let headerColumnCount: number;

    if (opts.hasHeaders) {
        const headerRow = allRows[0];
        headerColumnCount = headerRow.length;
        headers = headerRow.map((h, i) => {
            const trimmed = h?.trim() ?? "";
            return trimmed === "" ? `Column ${i + 1}` : trimmed;
        });
        dataRows = allRows.slice(1);
    } else {
        // Generate column names
        headerColumnCount = allRows[0]?.length ?? 0;
        headers = Array.from({ length: headerColumnCount }, (_, i) => `Column ${i + 1}`);
        dataRows = allRows;
    }

    // Validate row lengths and trim values
    const rows: string[][] = [];
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (row.length !== headerColumnCount) {
            warnings.push(`Row ${i + 1} has ${row.length} columns, expected ${headerColumnCount}`);
        }
        // Trim all values
        rows.push(row.map((v) => v?.trim() ?? ""));
    }

    return {
        headers,
        rows,
        rowCount: rows.length,
        truncated,
        warnings
    };
}

/**
 * Parse a number string, handling different formats.
 *
 * @param value - The number string to parse
 * @param thousandSeparator - The thousands separator to remove
 * @param decimalSeparator - The decimal separator to use
 * @returns Parsed number or NaN if invalid
 */
export function parseNumber(
    value: string,
    thousandSeparator = ",",
    decimalSeparator = "."
): number {
    if (!value || value.trim() === "") return NaN;

    let cleaned = value.trim();

    // Remove currency symbols and whitespace
    cleaned = cleaned.replace(/[$€£¥₹]/g, "").replace(/\s/g, "");

    // Handle parentheses as negative (accounting format)
    const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
    if (isNegative) {
        cleaned = cleaned.slice(1, -1);
    }

    // Handle minus sign
    const hasMinusPrefix = cleaned.startsWith("-");
    if (hasMinusPrefix) {
        cleaned = cleaned.slice(1);
    }

    // Validate the magnitude BEFORE stripping separators. parseFloat is
    // lenient - it reads a leading numeric prefix and discards the rest, so
    // "12abc" becomes 12 and "1.2.3" becomes 1.2. Validating after stripping
    // is not enough either: when the separators are misconfigured (EU "45,99"
    // read with a "," thousands separator) removing the separator produces the
    // well-formed "4599", silently overstating the amount 100x. Checking the
    // grouping first rejects that, because "99" is not a group of three.
    if (!isWellFormedMagnitude(cleaned, thousandSeparator, decimalSeparator)) return NaN;

    // Remove thousands separator
    if (thousandSeparator) {
        cleaned = cleaned.split(thousandSeparator).join("");
    }

    // Convert decimal separator to period
    if (decimalSeparator !== ".") {
        cleaned = cleaned.replace(decimalSeparator, ".");
    }

    const num = parseFloat(cleaned);
    return isNegative || hasMinusPrefix ? -num : num;
}

/** Escape a literal string for safe use inside a regular expression. */
function escapeForRegex(literal: string): string {
    return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check that an unsigned number string is well formed for the given separators.
 *
 * Accepts an optionally grouped integer part with an optional fractional part
 * (`1,234.56`, `1234.56`, `.5`) and nothing else - no exponents, no stray
 * characters, no repeated decimal separator, and no partial thousands group.
 */
function isWellFormedMagnitude(
    value: string,
    thousandSeparator: string,
    decimalSeparator: string
): boolean {
    const decimal = escapeForRegex(decimalSeparator);
    const integer = thousandSeparator
        ? `\\d{1,3}(?:${escapeForRegex(thousandSeparator)}\\d{3})+|\\d+`
        : `\\d+`;
    const fraction = `${decimal}\\d+`;
    return new RegExp(`^(?:(?:${integer})(?:${fraction})?|${fraction})$`).test(value);
}

/**
 * Fixed reference date for format patterns that omit a component.
 * Deterministic so parsing never depends on when it runs.
 */
const DATE_PARSE_REFERENCE = new Date(2000, 0, 1);

/**
 * Parse a date string according to a format.
 *
 * Delegates to date-fns rather than compiling the format string to a regex
 * ourselves: a hand-rolled compiler mis-handles tokens that are substrings of
 * other tokens (e.g. "dd-MMM-yyyy" would read the month twice and never match)
 * and cannot express month names at all.
 *
 * @param value - The date string to parse
 * @param format - The date format (e.g., "yyyy-MM-dd", "MM/dd/yyyy", "dd-MMM-yyyy")
 * @returns Temporal.PlainDate or null if invalid
 */
export function parseDate(value: string, format = "yyyy-MM-dd"): Temporal.PlainDate | null {
    if (!value || value.trim() === "") return null;

    // date-fns throws on malformed format strings; a bad format is a failed
    // parse, not a crash, since formats come from user configuration.
    const parsed = ((): Date | null => {
        try {
            return parse(value.trim(), format, DATE_PARSE_REFERENCE);
        } catch {
            return null;
        }
    })();

    if (!parsed || !isValid(parsed)) return null;

    // date-fns builds a Date in local time, so local accessors read back the
    // same civil date it constructed.
    return Temporal.PlainDate.from({
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate()
    });
}

/**
 * Detect the likely separator used in a CSV file.
 *
 * @param content - Raw CSV content (first few lines)
 * @returns Detected separator
 */
export function detectSeparator(content: string): string {
    const firstLine = content.split("\n")[0] || "";

    const separators = [",", ";", "\t", "|"];
    const counts = separators.map((sep) => ({
        sep,
        count: (firstLine.match(new RegExp(`\\${sep}`, "g")) || []).length
    }));

    const best = counts.reduce((a, b) => (b.count > a.count ? b : a));
    return best.count > 0 ? best.sep : ",";
}

/**
 * Detect if the CSV has headers by checking if the first row looks different.
 *
 * @param content - Raw CSV content
 * @param separator - Column separator
 * @returns True if first row appears to be headers
 */
export function detectHeaders(content: string, separator = ","): boolean {
    const result = Papa.parse<string[]>(content, {
        delimiter: separator,
        header: false,
        preview: 2
    });

    const lines = result.data;
    if (lines.length < 2) return true;

    const firstRow = lines[0];
    const secondRow = lines[1];

    // Check if first row has different characteristics than second
    // Headers are usually text-only, data rows often have numbers
    const firstHasNumbers = firstRow.some((f) => /\d+\.?\d*/.test(f));
    const secondHasNumbers = secondRow.some((f) => /\d+\.?\d*/.test(f));

    if (!firstHasNumbers && secondHasNumbers) return true;

    // Check if first row has common header keywords
    const headerKeywords = [
        "date",
        "amount",
        "description",
        "merchant",
        "name",
        "balance",
        "account"
    ];
    const firstHasKeywords = firstRow.some((f) =>
        headerKeywords.some((k) => f.toLowerCase().includes(k))
    );

    return firstHasKeywords;
}
