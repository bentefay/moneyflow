/**
 * CSV Parser
 *
 * Parses CSV files with configurable separators and formats.
 * Handles common edge cases like quoted fields, escaped quotes, etc.
 */

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
  maxRows: Infinity,
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

  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split into lines (handling quoted newlines)
  const lines = splitLines(normalized, opts.quoteChar);

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      warnings: ["Empty CSV file"],
    };
  }

  // Parse each line into fields
  const allRows: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const fields = parseLine(line, opts.separator, opts.quoteChar);
    allRows.push(fields);
  }

  if (allRows.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      warnings: ["No data rows found"],
    };
  }

  // Extract headers
  let headers: string[];
  let dataRows: string[][];

  if (opts.hasHeaders) {
    headers = allRows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
    dataRows = allRows.slice(1);
  } else {
    headers = allRows[0].map((_, i) => `Column ${i + 1}`);
    dataRows = allRows;
  }

  // Check for consistent column counts
  const expectedColumns = headers.length;
  dataRows.forEach((row, idx) => {
    if (row.length !== expectedColumns) {
      warnings.push(
        `Row ${idx + 1} has ${row.length} columns, expected ${expectedColumns}`
      );
    }
  });

  // Apply maxRows limit
  const truncated = dataRows.length > opts.maxRows;
  const rows = dataRows.slice(0, opts.maxRows);

  return {
    headers,
    rows,
    rowCount: rows.length,
    truncated,
    warnings,
  };
}

/**
 * Split content into lines, respecting quoted fields that may contain newlines.
 */
function splitLines(content: string, quoteChar: string): string[] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === quoteChar) {
      // Check for escaped quote
      if (i + 1 < content.length && content[i + 1] === quoteChar) {
        currentLine += char + quoteChar;
        i++;
        continue;
      }
      inQuotes = !inQuotes;
    }

    if (char === "\n" && !inQuotes) {
      lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Parse a single CSV line into fields.
 */
function parseLine(line: string, separator: string, quoteChar: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === quoteChar) {
      // Check for escaped quote
      if (i + 1 < line.length && line[i + 1] === quoteChar) {
        currentField += quoteChar;
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === separator && !inQuotes) {
      fields.push(currentField.trim());
      currentField = "";
    } else {
      currentField += char;
    }
  }

  fields.push(currentField.trim());
  return fields;
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

/**
 * Date format tokens for parsing.
 */
const DATE_FORMAT_REGEX: Record<string, string> = {
  yyyy: "(\\d{4})",
  yy: "(\\d{2})",
  MM: "(\\d{2})",
  M: "(\\d{1,2})",
  dd: "(\\d{2})",
  d: "(\\d{1,2})",
};

/**
 * Parse a date string according to a format.
 *
 * @param value - The date string to parse
 * @param format - The date format (e.g., "yyyy-MM-dd", "MM/dd/yyyy")
 * @returns ISO date string (yyyy-MM-dd) or null if invalid
 */
export function parseDate(value: string, format = "yyyy-MM-dd"): string | null {
  if (!value || value.trim() === "") return null;

  const cleaned = value.trim();

  // Build regex from format
  let regexStr = format;
  const tokens: string[] = [];

  for (const [token, regex] of Object.entries(DATE_FORMAT_REGEX)) {
    if (regexStr.includes(token)) {
      regexStr = regexStr.replace(token, regex);
      tokens.push(token);
    }
  }

  // Escape special regex characters
  regexStr = regexStr.replace(/[/.\-\\]/g, "\\$&");

  const regex = new RegExp(`^${regexStr}$`);
  const match = cleaned.match(regex);

  if (!match) return null;

  // Extract values based on token positions
  const values: Record<string, number> = {};
  tokens.forEach((token, i) => {
    const val = parseInt(match[i + 1], 10);

    if (token.startsWith("y")) {
      values.year = token === "yy" ? (val < 50 ? 2000 + val : 1900 + val) : val;
    } else if (token.startsWith("M")) {
      values.month = val;
    } else if (token.startsWith("d")) {
      values.day = val;
    }
  });

  // Validate values
  if (
    !values.year ||
    !values.month ||
    !values.day ||
    values.month < 1 ||
    values.month > 12 ||
    values.day < 1 ||
    values.day > 31
  ) {
    return null;
  }

  // Return ISO format
  return `${values.year}-${String(values.month).padStart(2, "0")}-${String(values.day).padStart(2, "0")}`;
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
    count: (firstLine.match(new RegExp(`\\${sep}`, "g")) || []).length,
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
  const lines = content.split("\n").slice(0, 5).filter((l) => l.trim());
  if (lines.length < 2) return true;

  const firstRow = parseLine(lines[0], separator, '"');
  const secondRow = parseLine(lines[1], separator, '"');

  // Check if first row has different characteristics than second
  // Headers are usually text-only, data rows often have numbers
  const firstHasNumbers = firstRow.some((f) => /\d+\.?\d*/.test(f));
  const secondHasNumbers = secondRow.some((f) => /\d+\.?\d*/.test(f));

  if (!firstHasNumbers && secondHasNumbers) return true;

  // Check if first row has common header keywords
  const headerKeywords = ["date", "amount", "description", "merchant", "name", "balance", "account"];
  const firstHasKeywords = firstRow.some((f) =>
    headerKeywords.some((k) => f.toLowerCase().includes(k))
  );

  return firstHasKeywords;
}
