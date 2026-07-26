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

import { DEFAULT_DUPLICATE_DETECTION_SETTINGS, DEFAULT_FILTER_SETTINGS } from "@/lib/import/types";

import {
    DEFAULT_ACCOUNT_TYPE,
    DEFAULT_AUTOMATION_CREATION_PREFERENCE,
    DEFAULT_AUTOMATION_ORDER,
    DEFAULT_CURRENCY,
    DEFAULT_VAULT_NAME
} from "./defaults";
import { richSchema } from "./rich-schema";

// ============================================
// ENTITY SCHEMAS
// ============================================

/**
 * Person schema - household members who can be allocated expenses
 */
export const personSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    // Optional: auto-created member people (HS-012) start unnamed. Use
    // resolvePersonDisplayName() for display rather than reading name directly.
    name: schema.String({ required: false }),
    linkedUserId: schema.String({ required: false }), // Optional: links to a user's pubkeyHash
    deletedAt: richSchema.Instant({ required: false }) // Soft delete timestamp
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
    accountNumber: schema.String({ required: false }),
    /** ISO 4217 currency code (e.g., "USD", "EUR", "JPY"). Optional - falls back to vault default if undefined. */
    currency: richSchema.CurrencyCode({ required: false }),
    accountType: richSchema.StringEnum(["checking", "savings", "credit", "cash", "loan"], {
        defaultValue: DEFAULT_ACCOUNT_TYPE
    }),
    /** Balance in minor units for this account's currency (e.g., cents for USD, yen for JPY) */
    balance: richSchema.MoneyMinorUnits({ defaultValue: 0 }),
    ownerships: schema.LoroMapRecord(richSchema.Percentage({})), // personId -> ownership percentage
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Tag schema - hierarchical categorization for transactions
 */
export const tagSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    name: schema.String({ required: true }),
    color: schema.String({ required: false }), // Hex color (e.g., "#3b82f6"), auto-assigned on creation
    parentTagId: schema.String({ required: false }), // Optional parent for hierarchy
    isTransfer: schema.Boolean({ defaultValue: false }), // Transfer tags exclude from "expenses"
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Description alias schema - curated names replacing raw imported transaction descriptions
 *
 * Aliases form a symlink graph: a "real" alias has no targetAliasId, while a
 * "symlink" alias points to a real alias via targetAliasId. Symlinks are one-hop
 * only — a symlink never points to another symlink.
 *
 * - transactionIds: transactions currently pointing at this alias
 * - symlinkIds: other aliases that are symlinks to this alias (backlinks)
 */
export const descriptionAliasSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    kind: richSchema.StringEnum(["real", "symlink"], {
        defaultValue: "real",
        required: false
    }),
    // `name` is retained in the wire schema as recovery metadata. The domain boundary exposes it
    // only for `kind: "real"`, so a symlink cannot behave as both states.
    name: schema.String({ required: true }),
    targetAliasId: schema.String({ required: false }), // symlink pointer
    symlinkIds: schema.LoroMapRecord(schema.Boolean({ defaultValue: true })), // backlinks
    transactionIds: schema.LoroMapRecord(schema.Boolean({ defaultValue: true })), // txs pointing here
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Status schema - custom transaction statuses
 */
export const statusSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    name: schema.String({ required: true }),
    behavior: richSchema.StringEnum(["treatAsPaid"], { required: false }),
    isDefault: schema.Boolean({ defaultValue: false }),
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Nested duplicate transaction schema
 *
 * Duplicates are stored inside the parent transaction's suspectedDuplicates list.
 * Limited to one level - duplicates cannot have their own duplicates.
 */
export const nestedDuplicateSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    date: richSchema.PlainDate({ required: true }),
    description: schema.String({ defaultValue: "" }),
    descriptionAliasId: schema.String({ required: false }),
    notes: schema.String({ defaultValue: "" }),
    amount: richSchema.MoneyMinorUnits({ required: true }),
    originalAmount: richSchema.MoneyMinorUnits({ required: false }),
    accountId: schema.String({ required: true }),
    tagIds: schema.LoroList(schema.String(), (id) => id),
    statusId: schema.String({ required: true }),
    importId: schema.String({ required: false }),
    allocations: schema.LoroMapRecord(richSchema.Percentage({})),
    creationInstant: richSchema.Instant({ required: true }),
    importRowIndex: schema.Number({ required: false }),
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Transaction schema - financial transactions
 *
 * Ordering within a day bucket: creationInstant desc, importRowIndex asc
 * - Manual transactions have null importRowIndex and sort after imports with same creationInstant
 */
export const transactionSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    date: richSchema.PlainDate({ required: true }), // Calendar date
    description: schema.String({ defaultValue: "" }), // Imported text from bank file (OFX NAME, CSV description)
    descriptionAliasId: schema.String({ required: false }), // Optional reference to a description alias
    notes: schema.String({ defaultValue: "" }), // User's notes/memo
    amount: richSchema.MoneyMinorUnits({ required: true }), // Integer cents (positive = income, negative = expense)
    originalAmount: richSchema.MoneyMinorUnits({ required: false }), // Immutable amount before the first imported-row edit
    accountId: schema.String({ required: true }),
    tagIds: schema.LoroList(schema.String(), (id) => id), // Tag IDs as LoroList for concurrent adds
    statusId: schema.String({ required: true }),
    importId: schema.String({ required: false }), // Optional reference to import batch
    allocations: schema.LoroMapRecord(richSchema.Percentage({})), // personId -> percentage
    creationInstant: richSchema.Instant({ required: true }), // When transaction entered system
    importRowIndex: schema.Number({ required: false }), // Row position in source file (null for manual transactions)
    suspectedDuplicates: schema.LoroList(nestedDuplicateSchema, (d) => d.id), // Nested duplicates (one level only)
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Day bucket schema - transactions for a single day within a month
 *
 * Transactions are sorted by creationInstant desc, then importRowIndex asc.
 */
export const dayBucketSchema = schema.LoroMap({
    day: schema.Number({ required: true }), // 1-31
    transactions: schema.LoroList(transactionSchema, (t) => t.id)
});

/**
 * Month bucket schema - day buckets for a single month within a year
 *
 * Days are sorted descending (newest first).
 */
export const monthBucketSchema = schema.LoroMap({
    month: schema.Number({ required: true }), // 1-12
    days: schema.LoroList(dayBucketSchema, (d) => String(d.day))
});

/**
 * Year bucket schema - month buckets for a single year within an account
 *
 * Months are sorted descending (newest first).
 */
export const yearBucketSchema = schema.LoroMap({
    year: schema.Number({ required: true }), // e.g., 2024
    months: schema.LoroList(monthBucketSchema, (m) => String(m.month))
});

/**
 * Account transaction tree schema - all transactions for a single account
 *
 * Years are sorted descending (newest first).
 */
export const accountTransactionTreeSchema = schema.LoroMap({
    accountId: schema.String({ required: true }),
    years: schema.LoroList(yearBucketSchema, (y) => String(y.year))
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
    createdAt: richSchema.Instant({ required: true }),
    deletedAt: richSchema.Instant({ required: false })
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
        collapseWhitespace: schema.Boolean({ defaultValue: false })
    }),
    duplicateDetection: schema.LoroMap({
        dateMatchMode: richSchema.StringEnum(["exact", "within"], {
            defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.dateMatchMode
        }),
        maxDateDiffDays: schema.Number({
            defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.maxDateDiffDays
        }),
        descriptionMatchMode: richSchema.StringEnum(["exact", "similar"], {
            defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.descriptionMatchMode
        }),
        minDescriptionSimilarity: schema.Number({
            defaultValue: DEFAULT_DUPLICATE_DETECTION_SETTINGS.minDescriptionSimilarity
        })
    }),
    oldTransactionFilter: schema.LoroMap({
        mode: richSchema.StringEnum(["ignore-all", "ignore-duplicates", "do-not-ignore"], {
            defaultValue: DEFAULT_FILTER_SETTINGS.mode
        }),
        cutoffType: richSchema.StringEnum(["days", "date"], {
            defaultValue: DEFAULT_FILTER_SETTINGS.cutoffType
        }),
        cutoffDays: schema.Number({ defaultValue: DEFAULT_FILTER_SETTINGS.cutoffDays }),
        cutoffDate: richSchema.PlainDate({ required: false }) // When cutoffType="date", undefined otherwise
    }),
    lastUsedAt: richSchema.Instant({ required: false }), // When this template was last used
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Automation condition schema
 */
export const automationConditionSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    column: richSchema.StringEnum(["description", "notes", "amount", "accountId"], {
        required: true
    }),
    operator: richSchema.StringEnum(["contains", "regex"], { required: true }),
    value: schema.String({ required: true }),
    caseSensitive: schema.Boolean({ defaultValue: false })
});

/**
 * Automation action schema
 */
export const automationActionSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    type: richSchema.StringEnum(["setTags", "setAllocation", "setStatus"], {
        required: true
    }),
    value: schema.Any() // Type depends on action type
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
    deletedAt: richSchema.Instant({ required: false })
});

/**
 * Automation application schema - tracks when an automation was applied to a transaction
 * Used for undo capability
 */
export const automationApplicationSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    transactionId: schema.String({ required: true }),
    automationId: schema.String({ required: true }),
    appliedAt: richSchema.Instant({ required: true }),
    /** Previous values before automation was applied (for undo) */
    previousValues: schema.LoroMap({
        tagIds: schema.LoroList(schema.String(), (id) => id),
        statusId: schema.String({ required: false }),
        allocations: schema.LoroMapRecord(richSchema.Percentage({}))
    })
});

/**
 * Field rule schema (HS-007 / P17A) - typed, field-specific exact-description automation rule.
 *
 * Serialisation for the domain model in `src/lib/domain/automation/rules.ts`. A rule targets one
 * field (descriptionAlias | tags | allocation) and matches an EXACT raw description, optionally
 * narrowed by account and/or exact amount. Action-specific fields are optional here; the domain
 * boundary (`decodeFieldRule`) validates that the ones required by `field` are present.
 *
 * `createdAtEpochMs` is stored as absolute epoch milliseconds (not a wall-clock string) so
 * precedence tie-breaking is free of locale/timezone ambiguity.
 */
export const fieldRuleSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    field: richSchema.StringEnum(["descriptionAlias", "tags", "allocation"], { required: true }),
    /** Exact raw imported description text this rule keys on. */
    descriptionText: schema.String({ required: true }),
    /** Optional account narrowing (absent = any account). */
    accountId: schema.String({ required: false }),
    /** Optional exact-amount narrowing in minor units (absent = any amount). */
    amount: richSchema.MoneyMinorUnits({ required: false }),
    /** descriptionAlias action: target alias id. */
    aliasId: schema.String({ required: false }),
    /** tags action: add (union) or set (replace). */
    tagMode: richSchema.StringEnum(["add", "set"], { required: false }),
    /** tags action: tag ids to apply. */
    tagIds: schema.LoroList(schema.String(), (id) => id),
    /** allocation action: explicit whole-person allocation set (validated at the boundary). */
    allocations: schema.LoroMapRecord(richSchema.Percentage({})),
    /** Absolute creation time (epoch ms) - drives recency tie-breaks. */
    createdAtEpochMs: schema.Number({ required: true }),
    /** Soft-delete time (epoch ms). Deleted rules are excluded from matching. */
    deletedAtEpochMs: schema.Number({ required: false })
});

/**
 * Per-user automation preferences (HS-007 / P17A) - keyed by user pubkeyHash.
 *
 * This is per-user UI state (last-used mode/constraint choices), NOT shared financial state, so it
 * lives in its own record keyed by the user rather than in `vaultPreferencesSchema`.
 */
export const userAutomationPreferenceSchema = schema.LoroMap({
    /** Owning user (pubkeyHash). Also the record key. */
    pubkeyHash: schema.String({ required: true }),
    /** Last field the user created a rule for. */
    lastRuleField: richSchema.StringEnum(["descriptionAlias", "tags", "allocation"], {
        required: false
    }),
    /** Last tag mode chosen (add | set). */
    lastTagMode: richSchema.StringEnum(["add", "set"], { required: false }),
    /** Whether the last rule narrowed by account. */
    lastUseAccountScope: schema.Boolean({ required: false }),
    /** Whether the last rule narrowed by exact amount. */
    lastUseAmountScope: schema.Boolean({ required: false }),
    /**
     * Last four-mode apply SELECT choice (HS-007 / P17D, frozen `:270`). Optional so absent (older
     * vaults or a user who never changed it) falls back to the session default with NO migration.
     */
    lastApplyMode: richSchema.StringEnum(["updatingAll", "updatingNew", "updateAll", "updateNew"], {
        required: false
    })
});

/**
 * Vault preferences schema - vault-scoped settings synced across members
 */
export const vaultPreferencesSchema = schema.LoroMap({
    /** Display name for the vault */
    name: schema.String({ defaultValue: DEFAULT_VAULT_NAME }),
    /** Automation creation preference */
    automationCreationPreference: richSchema.StringEnum(["createAutomatically", "manual"], {
        defaultValue: DEFAULT_AUTOMATION_CREATION_PREFERENCE
    }),
    /** Default currency for new accounts and imports (ISO 4217 code) */
    defaultCurrency: richSchema.CurrencyCode({ defaultValue: DEFAULT_CURRENCY }),
    /**
     * In-code CRDT migration version for the HS-007 (P17A) legacy-automation -> field-rule
     * migration. Absent/0 = not yet migrated; 1 = the migration has run. This marker makes the
     * migration run exactly once so re-hydration never re-derives (and never resurrects a
     * user-deleted) rule. The server never sees rule plaintext; this is purely in-code versioning.
     * Defaults to 0 (not yet migrated) on vaults that predate this field.
     */
    automationRulesMigrationVersion: schema.Number({ defaultValue: 0 })
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
    descriptionAliases: schema.LoroMapRecord(descriptionAliasSchema),
    statuses: schema.LoroMapRecord(statusSchema),
    transactions: transactionStoreSchema,
    imports: schema.LoroMapRecord(importSchema),
    importTemplates: schema.LoroMapRecord(importTemplateSchema),
    automations: schema.LoroMapRecord(automationSchema),
    automationApplications: schema.LoroMapRecord(automationApplicationSchema),
    // HS-007 / P17A: typed field-rule collection (shared vault state) and per-user automation
    // preferences (keyed by user pubkeyHash). Both are additive root keys; existing vaults hydrate
    // them as empty records with no data loss.
    fieldRules: schema.LoroMapRecord(fieldRuleSchema),
    userAutomationPreferences: schema.LoroMapRecord(userAutomationPreferenceSchema),
    preferences: vaultPreferencesSchema
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
/** Internal serialization type. Application consumers use the legal domain selector type. */
export type DescriptionAliasWire = InferType<typeof descriptionAliasSchema>;
export type Status = InferType<typeof statusSchema>;
export type Transaction = InferType<typeof transactionSchema>;
export type Import = InferType<typeof importSchema>;
export type ImportTemplate = InferType<typeof importTemplateSchema>;
export type Automation = InferType<typeof automationSchema>;
export type AutomationCondition = InferType<typeof automationConditionSchema>;
export type AutomationAction = InferType<typeof automationActionSchema>;
export type AutomationApplication = InferType<typeof automationApplicationSchema>;
/** Serialised (wire) shape of a field rule; domain model lives in automation/rules.ts. */
export type FieldRuleWire = InferType<typeof fieldRuleSchema>;
export type UserAutomationPreference = InferType<typeof userAutomationPreferenceSchema>;
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
/** Input (write) shape of a field rule, accepted by loro-mirror drafts. */
export type FieldRuleInput = InferInputType<typeof fieldRuleSchema>;
export type UserAutomationPreferenceInput = InferInputType<typeof userAutomationPreferenceSchema>;
export type NestedDuplicateInput = InferInputType<typeof nestedDuplicateSchema>;

/** Hierarchical transaction storage input types */
export type DayBucketInput = InferInputType<typeof dayBucketSchema>;
export type MonthBucketInput = InferInputType<typeof monthBucketSchema>;
export type YearBucketInput = InferInputType<typeof yearBucketSchema>;
export type AccountTransactionTreeInput = InferInputType<typeof accountTransactionTreeSchema>;
export type TransactionStoreInput = InferInputType<typeof transactionStoreSchema>;

/** A maintenance shadow is attached for bounded construction but is not yet application data. */
export const TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX = "__moneyflow_gc_shadow__:";

export interface TransactionMaintenanceShadowIdentity {
    readonly epoch: string;
    readonly publicId: string;
    readonly sourceCid: string;
}

export function getTransactionMaintenanceShadowIdentity(transaction: {
    readonly id: string;
}): TransactionMaintenanceShadowIdentity | undefined {
    if (!transaction.id.startsWith(TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX)) return undefined;
    const [epoch, sourceCid, publicId] = transaction.id
        .slice(TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX.length)
        .split("\u0000");
    return epoch && sourceCid && publicId ? { epoch, publicId, sourceCid } : undefined;
}

/** A maintenance shadow is attached for bounded construction but is not yet application data. */
export function isPublicTransaction(transaction: Transaction): boolean {
    return getTransactionMaintenanceShadowIdentity(transaction) == null;
}
