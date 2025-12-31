/**
 * OFX Parser
 *
 * Parses OFX (Open Financial Exchange) and QFX (Quicken) files
 * which are common bank export formats.
 *
 * Uses @f-o-t/ofx library for robust parsing of both OFX 1.x (SGML)
 * and OFX 2.x (XML) formats.
 */

import {
	type BalanceInfo,
	getAccountInfo,
	getBalance,
	getTransactions,
	type OFXTransaction as LibOFXTransaction,
	type OFXBankAccount,
	type OFXCreditCardAccount,
	type OFXDocument,
	parse,
} from "@f-o-t/ofx";
import { Temporal } from "temporal-polyfill";

// ============================================================================
// Transaction Types
// ============================================================================

/** Valid OFX transaction types */
export type OFXTransactionType =
	| "CREDIT"
	| "DEBIT"
	| "INT"
	| "DIV"
	| "FEE"
	| "SRVCHG"
	| "DEP"
	| "ATM"
	| "POS"
	| "XFER"
	| "CHECK"
	| "PAYMENT"
	| "CASH"
	| "DIRECTDEP"
	| "DIRECTDEBIT"
	| "REPEATPMT"
	| "HOLD"
	| "OTHER";

/** Valid OFX account types */
export type OFXAccountType =
	| "CHECKING"
	| "SAVINGS"
	| "MONEYMRKT"
	| "CREDITLINE"
	| "CD"
	| "CREDITCARD";

// ============================================================================
// Parsed Data Types
// ============================================================================

/** Parsed OFX transaction */
export interface ParsedOFXTransaction {
	/** Transaction ID (FITID) - generated if not present */
	readonly fitId: string;
	/** Transaction type */
	readonly type: OFXTransactionType;
	/** Date posted */
	readonly datePosted: Temporal.PlainDate;
	/** Transaction amount (negative for debits) */
	readonly amount: number;
	/** Payee/merchant name */
	readonly name: string;
	/** Memo/description */
	readonly memo: string;
	/** Check number if applicable */
	readonly checkNumber?: string;
	/** Reference number if available */
	readonly refNumber?: string;
}

/** Parsed OFX account info */
export interface ParsedOFXAccount {
	/** Account ID */
	readonly accountId: string;
	/** Account type */
	readonly accountType: OFXAccountType;
	/** Bank ID (routing number) - only for bank accounts */
	readonly bankId?: string;
	/** Branch ID - only for bank accounts */
	readonly branchId?: string;
}

/** Parsed balance information */
export interface ParsedOFXBalance {
	/** Ledger balance amount */
	readonly ledgerBalance?: {
		readonly amount: number;
		readonly asOfDate: string;
	};
	/** Available balance amount */
	readonly availableBalance?: {
		readonly amount: number;
		readonly asOfDate: string;
	};
}

/** Statement for a single account */
export interface ParsedOFXStatement {
	/** Account information */
	readonly account: ParsedOFXAccount;
	/** Currency code (e.g., "USD") */
	readonly currency: string;
	/** Statement date range */
	readonly dateRange: {
		readonly start: string;
		readonly end: string;
	} | null;
	/** Transactions in this statement */
	readonly transactions: readonly ParsedOFXTransaction[];
	/** Balance information */
	readonly balance: ParsedOFXBalance;
}

/** Successfully parsed OFX data */
export interface ParsedOFXData {
	/** All statements (one per account) */
	readonly statements: readonly ParsedOFXStatement[];
	/** Server date from signon response */
	readonly serverDate?: string;
	/** Financial institution info */
	readonly financialInstitution?: {
		readonly org?: string;
		readonly fid?: string;
	};
}

/** OFX parse error */
export interface OFXParseError {
	/** Error message */
	readonly message: string;
	/** Detailed error information */
	readonly details: readonly string[];
}

/** Result type for OFX parsing */
export type OFXParseResult =
	| { readonly ok: true; readonly data: ParsedOFXData }
	| { readonly ok: false; readonly error: OFXParseError };

// ============================================================================
// Helper Functions
// ============================================================================

/** Convert a Date object to Temporal.PlainDate */
function toPlainDate(date: Date): Temporal.PlainDate {
	// Extract local date parts to avoid UTC shift issues
	return Temporal.PlainDate.from({
		year: date.getFullYear(),
		month: date.getMonth() + 1,
		day: date.getDate(),
	});
}

/** Format a Date object to ISO date string (YYYY-MM-DD) - for metadata strings */
function formatDateToISO(date: Date): string {
	const pd = toPlainDate(date);
	return pd.toString();
}

/** Generate a unique ID for transactions without FITID */
function generateFitId(): string {
	return `gen-${Temporal.Now.instant().epochMilliseconds}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Convert library transaction to our format */
function convertTransaction(trn: LibOFXTransaction): ParsedOFXTransaction {
	return {
		fitId: trn.FITID ?? generateFitId(),
		type: trn.TRNTYPE,
		datePosted: toPlainDate(trn.DTPOSTED.toDate()),
		amount: trn.TRNAMT,
		name: trn.NAME ?? "",
		memo: trn.MEMO ?? "",
		checkNumber: trn.CHECKNUM,
		refNumber: trn.REFNUM,
	};
}

/** Convert library account to our format */
function convertAccount(account: OFXBankAccount | OFXCreditCardAccount): ParsedOFXAccount {
	if ("BANKID" in account) {
		return {
			accountId: account.ACCTID,
			accountType: account.ACCTTYPE,
			bankId: account.BANKID,
			branchId: account.BRANCHID,
		};
	}
	return {
		accountId: account.ACCTID,
		accountType: "CREDITCARD",
	};
}

/** Convert library balance info to our format */
function convertBalance(balanceInfo: BalanceInfo | undefined): ParsedOFXBalance {
	if (!balanceInfo) return {};

	return {
		ledgerBalance: balanceInfo.ledger
			? {
					amount: balanceInfo.ledger.BALAMT,
					asOfDate: formatDateToISO(balanceInfo.ledger.DTASOF.toDate()),
				}
			: undefined,
		availableBalance: balanceInfo.available
			? {
					amount: balanceInfo.available.BALAMT,
					asOfDate: formatDateToISO(balanceInfo.available.DTASOF.toDate()),
				}
			: undefined,
	};
}

/** Normalize STMTTRNRS which can be a single object or array */
function normalizeToArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

/** Extract statements from parsed OFX document */
function extractStatements(doc: OFXDocument): ParsedOFXStatement[] {
	const statements: ParsedOFXStatement[] = [];
	const accounts = getAccountInfo(doc);
	const balances = getBalance(doc);
	const allTransactions = getTransactions(doc);

	// Process bank statements (could be single or array)
	const bankStmtTrnrs = normalizeToArray(doc.OFX.BANKMSGSRSV1?.STMTTRNRS);
	for (const trnrs of bankStmtTrnrs) {
		const bankStmt = trnrs.STMTRS;
		if (!bankStmt) continue;

		const account = accounts.find(
			(a) => "BANKID" in a && a.ACCTID === bankStmt.BANKACCTFROM.ACCTID
		);
		const balance = balances.find(
			(b) => b.ledger?.BALAMT !== undefined || b.available?.BALAMT !== undefined
		);

		const tranList = bankStmt.BANKTRANLIST;
		const stmtTransactions = tranList?.STMTTRN ?? [];

		statements.push({
			account: account ? convertAccount(account) : convertAccount(bankStmt.BANKACCTFROM),
			currency: bankStmt.CURDEF ?? "USD",
			dateRange: tranList
				? {
						start: formatDateToISO(tranList.DTSTART.toDate()),
						end: formatDateToISO(tranList.DTEND.toDate()),
					}
				: null,
			transactions: stmtTransactions.map(convertTransaction),
			balance: convertBalance(balance),
		});
	}

	// Process credit card statements (could be single or array)
	const ccStmtTrnrs = normalizeToArray(doc.OFX.CREDITCARDMSGSRSV1?.CCSTMTTRNRS);
	for (const trnrs of ccStmtTrnrs) {
		const ccStmt = trnrs.CCSTMTRS;
		if (!ccStmt || !ccStmt.CCACCTFROM) continue;

		const ccAcctFrom = ccStmt.CCACCTFROM;
		const account = accounts.find((a) => !("BANKID" in a) && a.ACCTID === ccAcctFrom.ACCTID);
		const balance = balances.find(
			(b) => b.ledger?.BALAMT !== undefined || b.available?.BALAMT !== undefined
		);

		const tranList = ccStmt.BANKTRANLIST;
		const stmtTransactions = tranList?.STMTTRN ?? [];

		statements.push({
			account: account ? convertAccount(account) : convertAccount(ccAcctFrom),
			currency: ccStmt.CURDEF ?? "USD",
			dateRange: tranList
				? {
						start: formatDateToISO(tranList.DTSTART.toDate()),
						end: formatDateToISO(tranList.DTEND.toDate()),
					}
				: null,
			transactions: stmtTransactions.map(convertTransaction),
			balance: convertBalance(balance),
		});
	}

	// If we have transactions but no statements extracted, create a generic one
	if (statements.length === 0 && allTransactions.length > 0) {
		const account = accounts[0];
		const balance = balances[0];

		statements.push({
			account: account
				? convertAccount(account)
				: { accountId: "unknown", accountType: "CHECKING" },
			currency: "USD",
			dateRange: null,
			transactions: allTransactions.map(convertTransaction),
			balance: convertBalance(balance),
		});
	}

	return statements;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse an OFX/QFX file content.
 *
 * @param content - Raw OFX/QFX content
 * @returns Result with parsed data or error
 *
 * @example
 * ```ts
 * const result = parseOFX(ofxContent);
 * if (result.ok) {
 *   for (const statement of result.data.statements) {
 *     console.log(`Account: ${statement.account.accountId}`);
 *     console.log(`Transactions: ${statement.transactions.length}`);
 *   }
 * } else {
 *   console.error(`Parse error: ${result.error.message}`);
 * }
 * ```
 */
export function parseOFX(content: string): OFXParseResult {
	const libResult = parse(content);

	if (!libResult.success) {
		const zodError = libResult.error;
		const details = zodError.issues?.map((e) => `${e.path.join(".")}: ${e.message}`) ?? [];

		return {
			ok: false,
			error: {
				message: "Failed to parse OFX content",
				details: details.length > 0 ? details : [zodError.message ?? "Unknown parse error"],
			},
		};
	}

	const doc = libResult.data;
	const statements = extractStatements(doc);

	if (statements.length === 0) {
		return {
			ok: false,
			error: {
				message: "No account statements found in OFX content",
				details: ["The OFX file was parsed but contained no bank or credit card statements"],
			},
		};
	}

	// Extract signon info
	const sonrs = doc.OFX.SIGNONMSGSRSV1?.SONRS;

	return {
		ok: true,
		data: {
			statements,
			serverDate: sonrs?.DTSERVER ? formatDateToISO(sonrs.DTSERVER.toDate()) : undefined,
			financialInstitution: sonrs?.FI
				? {
						org: sonrs.FI.ORG,
						fid: sonrs.FI.FID,
					}
				: undefined,
		},
	};
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
