/**
 * Loro Mirror Schema for Vault Document
 *
 * Defines the complete schema for a Vault CRDT document using loro-mirror.
 * This schema enables type-safe, reactive state management with automatic
 * CRDT sync to Loro's internal representation.
 *
 * ## Money Representation
 *
 * All monetary amounts are stored as integers in minor units (e.g., cents for USD).
 * This avoids floating-point precision issues. Use the currency module for conversion:
 *
 * ```ts
 * import { USD, toMinorUnits, fromMinorUnits } from "@/lib/domain/currency";
 *
 * // Store: $12.34 → 1234 cents
 * transaction.amount = toMinorUnits(USD(12.34));
 *
 * // Display: 1234 cents → "$12.34"
 * fromMinorUnits(transaction.amount, USD).format();
 * ```
 */

import { schema } from "loro-mirror";
import {
	type CutoffType,
	type DateMatchMode,
	DEFAULT_DUPLICATE_DETECTION_SETTINGS,
	DEFAULT_FILTER_SETTINGS,
	type DescriptionMatchMode,
	type OldTransactionMode,
} from "@/lib/import/types";
import {
	DEFAULT_ACCOUNT_TYPE,
	DEFAULT_AUTOMATION_CREATION_PREFERENCE,
	DEFAULT_AUTOMATION_ORDER,
	DEFAULT_CURRENCY,
	DEFAULT_VAULT_NAME,
} from "./defaults";

// ============================================
// ENTITY SCHEMAS
// ============================================

/**
 * Person schema - household members who can be allocated expenses
 */
export const personSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	name: schema.String({ required: true }),
	linkedUserId: schema.String(), // Optional: links to a user's pubkeyHash
	deletedAt: schema.Number(), // Soft delete timestamp
});

/**
 * Account schema - bank accounts, credit cards, cash accounts
 *
 * Each account has exactly one currency. Amounts (balance, transactions) are stored
 * in that currency's minor units (e.g., cents for USD, yen for JPY).
 */
export const accountSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	name: schema.String({ required: true }),
	accountNumber: schema.String(),
	/** ISO 4217 currency code (e.g., "USD", "EUR", "JPY"). Optional - falls back to vault default if undefined. */
	currency: schema.String(),
	accountType: schema.String({ defaultValue: DEFAULT_ACCOUNT_TYPE }), // checking, savings, credit, cash, loan
	/** Balance in minor units for this account's currency (e.g., cents for USD, yen for JPY) */
	balance: schema.Number({ defaultValue: 0 }),
	ownerships: schema.LoroMapRecord(schema.Number()), // personId -> ownership percentage
	deletedAt: schema.Number(),
});

/**
 * Tag schema - hierarchical categorization for transactions
 */
export const tagSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	name: schema.String({ required: true }),
	color: schema.String(), // Hex color (e.g., "#3b82f6"), auto-assigned on creation
	parentTagId: schema.String(), // Optional parent for hierarchy
	isTransfer: schema.Boolean({ defaultValue: false }), // Transfer tags exclude from "expenses"
	deletedAt: schema.Number(),
});

/**
 * Status schema - custom transaction statuses
 */
export const statusSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	name: schema.String({ required: true }),
	behavior: schema.String(), // "treatAsPaid" | null
	isDefault: schema.Boolean({ defaultValue: false }),
	deletedAt: schema.Number(),
});

/**
 * Nested duplicate transaction schema
 *
 * Duplicates are stored inside the parent transaction's suspectedDuplicates list.
 * Limited to one level - duplicates cannot have their own duplicates.
 */
export const nestedDuplicateSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	date: schema.String({ required: true }),
	description: schema.String({ defaultValue: "" }),
	notes: schema.String({ defaultValue: "" }),
	amount: schema.Number({ required: true }),
	accountId: schema.String({ required: true }),
	tagIds: schema.LoroList(schema.String(), (id) => id),
	statusId: schema.String({ required: true }),
	importId: schema.String(),
	allocations: schema.LoroMapRecord(schema.Number()),
	creationInstant: schema.Number({ required: true }),
	importRowIndex: schema.Number(),
	deletedAt: schema.Number(),
});

/**
 * Transaction schema - financial transactions
 *
 * Ordering within a day bucket: creationInstant desc, importRowIndex asc
 * - Manual transactions have null importRowIndex and sort after imports with same creationInstant
 */
export const transactionSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	date: schema.String({ required: true }), // ISO date string (YYYY-MM-DD)
	description: schema.String({ defaultValue: "" }), // Imported text from bank file (OFX NAME, CSV description)
	notes: schema.String({ defaultValue: "" }), // User's notes/memo
	amount: schema.Number({ required: true }), // MoneyMinorUnits: integer cents (positive = income, negative = expense)
	accountId: schema.String({ required: true }),
	tagIds: schema.LoroList(schema.String(), (id) => id), // Tag IDs as LoroList for concurrent adds
	statusId: schema.String({ required: true }),
	importId: schema.String(), // Optional reference to import batch
	allocations: schema.LoroMapRecord(schema.Number()), // personId -> percentage
	creationInstant: schema.Number({ required: true }), // Epoch ms when transaction entered system
	importRowIndex: schema.Number(), // Row position in source file (null for manual transactions)
	suspectedDuplicates: schema.LoroList(nestedDuplicateSchema, (d) => d.id), // Nested duplicates (one level only)
	deletedAt: schema.Number(),
});

/**
 * Day bucket schema - transactions for a single day within a month
 *
 * Transactions are sorted by creationInstant desc, then importRowIndex asc.
 */
export const dayBucketSchema = schema.LoroMap({
	day: schema.Number({ required: true }), // 1-31
	transactions: schema.LoroList(transactionSchema, (t) => t.id),
});

/**
 * Month bucket schema - day buckets for a single month within a year
 *
 * Days are sorted descending (newest first).
 */
export const monthBucketSchema = schema.LoroMap({
	month: schema.Number({ required: true }), // 1-12
	days: schema.LoroList(dayBucketSchema, (d) => String(d.day)),
});

/**
 * Year bucket schema - month buckets for a single year within an account
 *
 * Months are sorted descending (newest first).
 */
export const yearBucketSchema = schema.LoroMap({
	year: schema.Number({ required: true }), // e.g., 2024
	months: schema.LoroList(monthBucketSchema, (m) => String(m.month)),
});

/**
 * Account transaction tree schema - all transactions for a single account
 *
 * Years are sorted descending (newest first).
 */
export const accountTransactionTreeSchema = schema.LoroMap({
	accountId: schema.String({ required: true }),
	years: schema.LoroList(yearBucketSchema, (y) => String(y.year)),
});

/**
 * Transaction store schema - hierarchical storage for all transactions
 *
 * Structure: Account → Year → Month → Day → Transactions
 * This enables O(1) account filtering and fine-grained memoization.
 */
export const transactionStoreSchema = schema.LoroMapRecord(accountTransactionTreeSchema);

/**
 * Import schema - CSV/OFX import batch records
 */
export const importSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	filename: schema.String({ required: true }),
	transactionCount: schema.Number({ defaultValue: 0 }),
	createdAt: schema.Number({ required: true }),
	deletedAt: schema.Number(),
});

/**
 * Import template schema - reusable import settings and column mappings
 */
export const importTemplateSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	name: schema.String({ required: true }),
	columnMappings: schema.LoroMapRecord(schema.String()), // csvColumn -> entityField
	formatting: schema.LoroMap({
		hasHeaders: schema.Boolean({ defaultValue: true }),
		thousandSeparator: schema.String({ defaultValue: "," }),
		decimalSeparator: schema.String({ defaultValue: "." }),
		dateFormat: schema.String({ defaultValue: "yyyy-MM-dd" }),
		collapseWhitespace: schema.Boolean({ defaultValue: false }),
	}),
	duplicateDetection: schema.LoroMap({
		dateMatchMode: schema.String<DateMatchMode>({
			defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.dateMatchMode,
		}),
		maxDateDiffDays: schema.Number({
			defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.maxDateDiffDays,
		}),
		descriptionMatchMode: schema.String<DescriptionMatchMode>({
			defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.descriptionMatchMode,
		}),
		minDescriptionSimilarity: schema.Number({
			defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.minDescriptionSimilarity,
		}),
	}),
	oldTransactionFilter: schema.LoroMap({
		mode: schema.String<OldTransactionMode>({ defaultValue: DEFAULT_FILTER_SETTINGS.mode }),
		cutoffType: schema.String<CutoffType>({ defaultValue: DEFAULT_FILTER_SETTINGS.cutoffType }),
		cutoffDays: schema.Number({ defaultValue: DEFAULT_FILTER_SETTINGS.cutoffDays }),
		cutoffDate: schema.String(), // ISO date string when cutoffType="date", null otherwise
	}),
	lastUsedAt: schema.Number(), // Unix timestamp of last import using this template
	deletedAt: schema.Number(),
});

/**
 * Automation condition schema
 */
export const automationConditionSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	column: schema.String({ required: true }), // "description" | "notes" | "amount" | "accountId"
	operator: schema.String({ required: true }), // "contains" | "regex"
	value: schema.String({ required: true }),
	caseSensitive: schema.Boolean({ defaultValue: false }),
});

/**
 * Automation action schema
 */
export const automationActionSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	type: schema.String({ required: true }), // "setTags" | "setAllocation" | "setStatus"
	value: schema.Any(), // Type depends on action type
});

/**
 * Automation schema - auto-categorization rules
 */
export const automationSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	name: schema.String({ required: true }),
	conditions: schema.LoroList(automationConditionSchema, (c) => c.id),
	actions: schema.LoroList(automationActionSchema, (a) => a.id),
	order: schema.Number({ defaultValue: DEFAULT_AUTOMATION_ORDER }), // Execution priority
	excludedTransactionIds: schema.LoroList(schema.String(), (id) => id),
	deletedAt: schema.Number(),
});

/**
 * Automation application schema - tracks when an automation was applied to a transaction
 * Used for undo capability
 */
export const automationApplicationSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	transactionId: schema.String({ required: true }),
	automationId: schema.String({ required: true }),
	appliedAt: schema.Number({ required: true }), // Timestamp
	/** Previous values before automation was applied (for undo) */
	previousValues: schema.LoroMap({
		tagIds: schema.LoroList(schema.String(), (id) => id),
		statusId: schema.String(),
		allocations: schema.LoroMapRecord(schema.Number()),
	}),
});

/**
 * Vault preferences schema - vault-scoped settings synced across members
 */
export const vaultPreferencesSchema = schema.LoroMap({
	/** Display name for the vault */
	name: schema.String({ defaultValue: DEFAULT_VAULT_NAME }),
	/** Automation creation preference */
	automationCreationPreference: schema.String({
		defaultValue: DEFAULT_AUTOMATION_CREATION_PREFERENCE,
	}), // "createAutomatically" | "manual"
	/** Default currency for new accounts and imports (ISO 4217 code) */
	defaultCurrency: schema.String({ defaultValue: DEFAULT_CURRENCY }),
});

// ============================================
// ROOT VAULT SCHEMA
// ============================================

/**
 * Complete vault document schema
 *
 * This defines the entire structure of a vault's financial data.
 * All collections use LoroMapRecord for id -> entity mappings.
 */
export const vaultSchema = schema({
	people: schema.LoroMapRecord(personSchema),
	accounts: schema.LoroMapRecord(accountSchema),
	tags: schema.LoroMapRecord(tagSchema),
	statuses: schema.LoroMapRecord(statusSchema),
	transactions: transactionStoreSchema,
	imports: schema.LoroMapRecord(importSchema),
	importTemplates: schema.LoroMapRecord(importTemplateSchema),
	automations: schema.LoroMapRecord(automationSchema),
	automationApplications: schema.LoroMapRecord(automationApplicationSchema),
	preferences: vaultPreferencesSchema,
});

// ============================================
// TYPE EXPORTS
// ============================================

import type { InferInputType, InferType } from "loro-mirror";

/** Inferred type for reading vault state */
export type VaultState = InferType<typeof vaultSchema>;

/** Inferred type for writing vault state (input) */
export type VaultInput = InferInputType<typeof vaultSchema>;

/** Individual entity types
 *
 * Note: Transaction.amount and Account.balance are stored as integers in minor units
 * (e.g., cents for USD, yen for JPY). Use asMinorUnits() to cast when type safety is needed,
 * or use the currency conversion functions for display.
 */
export type Person = InferType<typeof personSchema>;
export type Account = InferType<typeof accountSchema>;
export type Tag = InferType<typeof tagSchema>;
export type Status = InferType<typeof statusSchema>;
export type Transaction = InferType<typeof transactionSchema>;
export type Import = InferType<typeof importSchema>;
export type ImportTemplate = InferType<typeof importTemplateSchema>;
export type Automation = InferType<typeof automationSchema>;
export type AutomationCondition = InferType<typeof automationConditionSchema>;
export type AutomationAction = InferType<typeof automationActionSchema>;
export type AutomationApplication = InferType<typeof automationApplicationSchema>;
export type VaultPreferences = InferType<typeof vaultPreferencesSchema>;

/** Hierarchical transaction storage types */
export type NestedDuplicate = InferType<typeof nestedDuplicateSchema>;
export type DayBucket = InferType<typeof dayBucketSchema>;
export type MonthBucket = InferType<typeof monthBucketSchema>;
export type YearBucket = InferType<typeof yearBucketSchema>;
export type AccountTransactionTree = InferType<typeof accountTransactionTreeSchema>;
export type TransactionStore = InferType<typeof transactionStoreSchema>;

/** Input types for mutations */
export type PersonInput = InferInputType<typeof personSchema>;
export type AccountInput = InferInputType<typeof accountSchema>;
export type TagInput = InferInputType<typeof tagSchema>;
export type StatusInput = InferInputType<typeof statusSchema>;
export type TransactionInput = InferInputType<typeof transactionSchema>;
export type ImportInput = InferInputType<typeof importSchema>;
export type ImportTemplateInput = InferInputType<typeof importTemplateSchema>;
export type AutomationInput = InferInputType<typeof automationSchema>;
export type AutomationApplicationInput = InferInputType<typeof automationApplicationSchema>;

/** Hierarchical transaction storage input types */
export type NestedDuplicateInput = InferInputType<typeof nestedDuplicateSchema>;
export type DayBucketInput = InferInputType<typeof dayBucketSchema>;
export type MonthBucketInput = InferInputType<typeof monthBucketSchema>;
export type YearBucketInput = InferInputType<typeof yearBucketSchema>;
export type AccountTransactionTreeInput = InferInputType<typeof accountTransactionTreeSchema>;
export type TransactionStoreInput = InferInputType<typeof transactionStoreSchema>;
