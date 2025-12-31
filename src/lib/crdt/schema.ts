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
	accountType: schema.String({ defaultValue: "checking" }), // checking, savings, credit, cash, loan
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
 * Transaction schema - financial transactions
 */
export const transactionSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	date: schema.String({ required: true }), // ISO date string
	merchant: schema.String({ defaultValue: "" }),
	description: schema.String({ defaultValue: "" }),
	amount: schema.Number({ required: true }), // MoneyMinorUnits: integer cents (positive = income, negative = expense)
	accountId: schema.String({ required: true }),
	tagIds: schema.LoroList(schema.String(), (id) => id), // Tag IDs as LoroList for concurrent adds
	statusId: schema.String({ required: true }),
	importId: schema.String(), // Optional reference to import batch
	allocations: schema.LoroMapRecord(schema.Number()), // personId -> percentage
	duplicateOf: schema.String(), // ID of suspected original (set on import)
	deletedAt: schema.Number(),
});

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
 * Import template schema - reusable CSV column mappings
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
	}),
	deletedAt: schema.Number(),
});

/**
 * Automation condition schema
 */
export const automationConditionSchema = schema.LoroMap({
	id: schema.String({ required: true }),
	column: schema.String({ required: true }), // "merchant" | "description" | "amount" | "accountId"
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
	order: schema.Number({ defaultValue: 0 }), // Execution priority
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
	name: schema.String({ defaultValue: "My Vault" }),
	/** Automation creation preference */
	automationCreationPreference: schema.String({ defaultValue: "manual" }), // "createAutomatically" | "manual"
	/** Default currency for new accounts and imports (ISO 4217 code) */
	defaultCurrency: schema.String({ defaultValue: "USD" }),
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
	transactions: schema.LoroMapRecord(transactionSchema),
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

/** Individual entity types */
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
