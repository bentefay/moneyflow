/**
 * Loro Mirror Schema for Vault Document
 *
 * Defines the complete schema for a Vault CRDT document using loro-mirror.
 * This schema enables type-safe, reactive state management with automatic
 * CRDT sync to Loro's internal representation.
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
 */
export const accountSchema = schema.LoroMap({
  id: schema.String({ required: true }),
  name: schema.String({ required: true }),
  accountNumber: schema.String(),
  currency: schema.String({ defaultValue: "USD" }),
  accountType: schema.String({ defaultValue: "checking" }), // checking, savings, credit, cash, loan
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
  amount: schema.Number({ required: true }), // Positive = income, negative = expense
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
 * Vault preferences schema - vault-scoped settings synced across members
 */
export const vaultPreferencesSchema = schema.LoroMap({
  automationCreationPreference: schema.String({ defaultValue: "manual" }), // "createAutomatically" | "manual"
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
  preferences: vaultPreferencesSchema,
});

// ============================================
// TYPE EXPORTS
// ============================================

import type { InferType, InferInputType } from "loro-mirror";

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
