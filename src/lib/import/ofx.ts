/**
 * OFX Parser
 *
 * Parses OFX (Open Financial Exchange) and QFX (Quicken) files
 * which are common bank export formats.
 */

/**
 * Parsed OFX transaction.
 */
export interface OFXTransaction {
  /** Transaction ID (FITID) */
  id: string;
  /** Transaction type (DEBIT, CREDIT, etc.) */
  type: string;
  /** Date posted (ISO string) */
  date: string;
  /** Transaction amount */
  amount: number;
  /** Payee/merchant name */
  name: string;
  /** Memo/description */
  memo: string;
  /** Check number if applicable */
  checkNumber?: string;
}

/**
 * Parsed OFX account info.
 */
export interface OFXAccountInfo {
  /** Account ID */
  accountId: string;
  /** Account type (CHECKING, SAVINGS, CREDITCARD, etc.) */
  accountType: string;
  /** Bank ID (routing number) */
  bankId?: string;
  /** Currency code */
  currency: string;
}

/**
 * OFX parse result.
 */
export interface OFXParseResult {
  /** Account information */
  account: OFXAccountInfo | null;
  /** Parsed transactions */
  transactions: OFXTransaction[];
  /** Statement date range */
  dateRange: {
    start: string | null;
    end: string | null;
  };
  /** Current balance if available */
  balance?: number;
  /** Any warnings during parsing */
  warnings: string[];
}

/**
 * Parse an OFX/QFX file content.
 *
 * @param content - Raw OFX/QFX content
 * @returns Parsed result
 *
 * @example
 * ```ts
 * const result = parseOFX(ofxContent);
 * // result.transactions = [{ id: "123", date: "2024-01-15", amount: -45.00, name: "Coffee Shop" }]
 * ```
 */
export function parseOFX(content: string): OFXParseResult {
  const warnings: string[] = [];
  const transactions: OFXTransaction[] = [];

  // Normalize content - OFX can have various formats
  const normalized = normalizeOFX(content);

  // Extract account info
  const account = extractAccountInfo(normalized, warnings);

  // Extract transactions
  const stmttrns = extractAllBetween(normalized, "<STMTTRN>", "</STMTTRN>");

  for (const trn of stmttrns) {
    const transaction = parseTransaction(trn, warnings);
    if (transaction) {
      transactions.push(transaction);
    }
  }

  // Extract date range
  const dateRange = extractDateRange(normalized);

  // Extract balance
  const balance = extractBalance(normalized);

  return {
    account,
    transactions,
    dateRange,
    balance,
    warnings,
  };
}

/**
 * Normalize OFX content by removing SGML headers and cleaning up format.
 */
function normalizeOFX(content: string): string {
  // Remove SGML headers (everything before <?OFX or <OFX)
  let normalized = content;

  const xmlStart = content.indexOf("<?xml");
  const ofxStart = content.indexOf("<OFX");

  if (xmlStart >= 0 || ofxStart >= 0) {
    const start = Math.min(
      xmlStart >= 0 ? xmlStart : Infinity,
      ofxStart >= 0 ? ofxStart : Infinity
    );
    normalized = content.substring(start);
  }

  // Convert SGML-style tags to have proper closing tags
  // OFX 1.x uses SGML without closing tags for simple elements
  normalized = normalized.replace(/<(\w+)>([^<]*?)(?=<(?!\/))/g, "<$1>$2</$1>");

  return normalized;
}

/**
 * Extract content between tags (non-greedy).
 */
function extractBetween(content: string, startTag: string, endTag: string): string | null {
  const startIdx = content.indexOf(startTag);
  if (startIdx === -1) return null;

  const endIdx = content.indexOf(endTag, startIdx);
  if (endIdx === -1) return null;

  return content.substring(startIdx + startTag.length, endIdx).trim();
}

/**
 * Extract all occurrences between tags.
 */
function extractAllBetween(content: string, startTag: string, endTag: string): string[] {
  const results: string[] = [];
  let searchStart = 0;

  while (true) {
    const startIdx = content.indexOf(startTag, searchStart);
    if (startIdx === -1) break;

    const endIdx = content.indexOf(endTag, startIdx);
    if (endIdx === -1) break;

    results.push(content.substring(startIdx + startTag.length, endIdx));
    searchStart = endIdx + endTag.length;
  }

  return results;
}

/**
 * Extract a simple value from an OFX tag.
 */
function extractValue(content: string, tag: string): string | null {
  // Try XML-style first: <TAG>value</TAG>
  const xmlRegex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const xmlMatch = content.match(xmlRegex);
  if (xmlMatch) return xmlMatch[1].trim();

  // Try SGML-style: <TAG>value
  const sgmlRegex = new RegExp(`<${tag}>([^<\\n]*)`, "i");
  const sgmlMatch = content.match(sgmlRegex);
  if (sgmlMatch) return sgmlMatch[1].trim();

  return null;
}

/**
 * Extract account info from OFX content.
 */
function extractAccountInfo(content: string, warnings: string[]): OFXAccountInfo | null {
  const bankAcct = extractBetween(content, "<BANKACCTFROM>", "</BANKACCTFROM>");
  const ccAcct = extractBetween(content, "<CCACCTFROM>", "</CCACCTFROM>");

  const acctBlock = bankAcct || ccAcct;
  if (!acctBlock) {
    warnings.push("No account information found");
    return null;
  }

  const accountId = extractValue(acctBlock, "ACCTID") || extractValue(acctBlock, "ACCTKEY") || "";
  const accountType = extractValue(acctBlock, "ACCTTYPE") || (ccAcct ? "CREDITCARD" : "CHECKING");
  const bankId = extractValue(acctBlock, "BANKID") || undefined;

  // Get currency from statement
  const currency = extractValue(content, "CURDEF") || "USD";

  return {
    accountId,
    accountType,
    bankId,
    currency,
  };
}

/**
 * Parse a single transaction block.
 */
function parseTransaction(content: string, warnings: string[]): OFXTransaction | null {
  const type = extractValue(content, "TRNTYPE") || "OTHER";
  const datePosted = extractValue(content, "DTPOSTED");
  const amountStr = extractValue(content, "TRNAMT");
  const fitid = extractValue(content, "FITID") || `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const name = extractValue(content, "NAME") || extractValue(content, "PAYEE") || "";
  const memo = extractValue(content, "MEMO") || "";
  const checkNum = extractValue(content, "CHECKNUM") || undefined;

  if (!datePosted) {
    warnings.push("Transaction missing date");
    return null;
  }

  if (!amountStr) {
    warnings.push("Transaction missing amount");
    return null;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount)) {
    warnings.push(`Invalid amount: ${amountStr}`);
    return null;
  }

  return {
    id: fitid,
    type,
    date: parseOFXDate(datePosted),
    amount,
    name,
    memo,
    checkNumber: checkNum,
  };
}

/**
 * Parse OFX date format (YYYYMMDDHHMMSS or YYYYMMDD).
 */
function parseOFXDate(dateStr: string): string {
  // Remove timezone info if present
  const cleaned = dateStr.replace(/\[.*\]$/, "").trim();

  // Extract date parts
  const year = cleaned.substring(0, 4);
  const month = cleaned.substring(4, 6);
  const day = cleaned.substring(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Extract statement date range.
 */
function extractDateRange(content: string): { start: string | null; end: string | null } {
  const start = extractValue(content, "DTSTART");
  const end = extractValue(content, "DTEND");

  return {
    start: start ? parseOFXDate(start) : null,
    end: end ? parseOFXDate(end) : null,
  };
}

/**
 * Extract current balance from statement.
 */
function extractBalance(content: string): number | undefined {
  const balAmt = extractValue(content, "BALAMT");
  if (!balAmt) return undefined;

  const balance = parseFloat(balAmt);
  return isNaN(balance) ? undefined : balance;
}

/**
 * Check if content appears to be OFX format.
 *
 * @param content - File content
 * @returns True if appears to be OFX/QFX
 */
export function isOFXFormat(content: string): boolean {
  return (
    content.includes("OFXHEADER") ||
    content.includes("<OFX>") ||
    content.includes("<OFX ") ||
    content.includes("<?OFX")
  );
}
