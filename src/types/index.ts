/**
 * Base TypeScript types and Zod schemas for MoneyFlow.
 *
 * This file contains shared types that are used across the application.
 * Domain-specific types live closer to their usage (e.g., CRDT schema, API schemas).
 */

import { Temporal } from "temporal-polyfill";
import { z } from "zod";

// ============================================
// Branded Temporal Types
// ============================================
// These branded types provide compile-time safety for date/time strings
// stored in the CRDT (loro-mirror only supports string/number/boolean primitives).
// Use the conversion functions to safely create and consume these values.

/**
 * Branded ISO date string (YYYY-MM-DD).
 * Represents a calendar date without time, stored as string for CRDT compatibility.
 * Convert to Temporal.PlainDate for date arithmetic.
 */
export type ISODateString = string & { readonly __brand: "ISODateString" };

/**
 * Branded ISO instant string (full ISO-8601 timestamp).
 * Represents an exact moment in time, stored as string for CRDT compatibility.
 * Convert to Temporal.Instant for time arithmetic.
 */
export type ISOInstantString = string & { readonly __brand: "ISOInstantString" };

/** Zod schema for ISO date string validation */
export const ISODateStringSchema = z.iso.date().transform((s) => s as ISODateString);

/** Zod schema for ISO instant string validation */
export const ISOInstantStringSchema = z.iso.datetime().transform((s) => s as ISOInstantString);

// ============================================
// Temporal Conversion Functions
// ============================================

/**
 * Convert a Temporal.PlainDate to an ISODateString for storage.
 */
export function toISODateString(date: Temporal.PlainDate): ISODateString {
	return date.toString() as ISODateString;
}

/**
 * Convert an ISODateString to a Temporal.PlainDate for computation.
 */
export function fromISODateString(s: ISODateString): Temporal.PlainDate {
	return Temporal.PlainDate.from(s);
}

/**
 * Convert a Temporal.Instant to an ISOInstantString for storage.
 */
export function toISOInstantString(instant: Temporal.Instant): ISOInstantString {
	return instant.toString() as ISOInstantString;
}

/**
 * Convert an ISOInstantString to a Temporal.Instant for computation.
 */
export function fromISOInstantString(s: ISOInstantString): Temporal.Instant {
	return Temporal.Instant.from(s);
}

/**
 * Get the current instant as an ISOInstantString.
 */
export function nowISOInstantString(): ISOInstantString {
	return Temporal.Now.instant().toString() as ISOInstantString;
}

/**
 * Get today's date as an ISODateString.
 */
export function todayISODateString(): ISODateString {
	return Temporal.Now.plainDateISO().toString() as ISODateString;
}

// ============================================
// Legacy Types (deprecated, use branded types)
// ============================================

/** @deprecated Use ISODateString instead */
export const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** @deprecated Use ISODateString instead */
export type ISODate = z.infer<typeof ISODateSchema>;

// ============================================
// Core Primitives
// ============================================

/** UUID v4 string */
export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

/** Unix timestamp in milliseconds */
export const TimestampSchema = z.number().int().positive();
export type Timestamp = z.infer<typeof TimestampSchema>;

/** ISO 4217 currency code (3 letters) */
export const CurrencyCodeSchema = z.string().length(3).toUpperCase();
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/** Monetary amount (integer cents to avoid floating point issues) */
export const MoneyAmountSchema = z.number().int();
export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;

/** Percentage (0-100, can be negative for reversals) */
export const PercentageSchema = z.number();
export type Percentage = z.infer<typeof PercentageSchema>;

// ============================================
// Identity Types
// ============================================

/** Base64-encoded public key */
export const PublicKeySchema = z.string().min(1);
export type PublicKey = z.infer<typeof PublicKeySchema>;

/** BLAKE2b hash of public key (server-side identity) */
export const PubkeyHashSchema = z.string().min(1);
export type PubkeyHash = z.infer<typeof PubkeyHashSchema>;

/** Base64-encoded Ed25519 signature */
export const SignatureSchema = z.string().min(1);
export type Signature = z.infer<typeof SignatureSchema>;

// ============================================
// Account Types
// ============================================

export const AccountTypeSchema = z.enum(["checking", "savings", "credit", "cash", "loan"]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

// ============================================
// Status Behavior Types
// ============================================

export const StatusBehaviorSchema = z.enum(["treatAsPaid"]).nullable();
export type StatusBehavior = z.infer<typeof StatusBehaviorSchema>;

// ============================================
// Automation Types
// ============================================

export const AutomationOperatorSchema = z.enum(["contains", "regex"]);
export type AutomationOperator = z.infer<typeof AutomationOperatorSchema>;

export const AutomationColumnSchema = z.enum(["description", "notes", "amount", "accountId"]);
export type AutomationColumn = z.infer<typeof AutomationColumnSchema>;

export const AutomationActionTypeSchema = z.enum(["setTags", "setAllocation", "setStatus"]);
export type AutomationActionType = z.infer<typeof AutomationActionTypeSchema>;

// ============================================
// User Preference Types
// ============================================

export const AutomationCreationPreferenceSchema = z.enum(["createAutomatically", "manual"]);
export type AutomationCreationPreference = z.infer<typeof AutomationCreationPreferenceSchema>;

// ============================================
// Vault Role Types
// ============================================

export const VaultRoleSchema = z.enum(["owner", "member"]);
export type VaultRole = z.infer<typeof VaultRoleSchema>;

// ============================================
// Theme Types
// ============================================

export const ThemeSchema = z.enum(["light", "dark", "system"]);
export type Theme = z.infer<typeof ThemeSchema>;

// ============================================
// Global Settings Types (User-level preferences)
// ============================================

/**
 * User's global settings stored in encrypted user_data.
 * These are NOT vault-specific - they apply across all vaults.
 */
export const GlobalSettingsSchema = z.object({
	/** Currently active vault ID (null if none selected) */
	activeVaultId: z.string().uuid().nullable(),
	/** UI theme preference */
	theme: ThemeSchema,
	/** Default currency for imports when not specified by account or file (ISO 4217) */
	defaultCurrency: CurrencyCodeSchema.default("USD"),
});
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;

/**
 * Reference to a vault stored in user's encrypted data.
 */
export const VaultReferenceSchema = z.object({
	/** Vault UUID */
	id: z.string().uuid(),
	/** Vault encryption key wrapped with user's X25519 public key */
	wrappedKey: z.string().min(1),
	/** Cached vault name for UI (convenience, may be stale) */
	name: z.string().optional(),
});
export type VaultReference = z.infer<typeof VaultReferenceSchema>;

/**
 * Decrypted contents of user_data.encrypted_data
 */
export const UserDataSchema = z.object({
	/** User's vault memberships with wrapped keys */
	vaults: z.array(VaultReferenceSchema),
	/** Global (user-level) settings */
	globalSettings: GlobalSettingsSchema,
});
export type UserData = z.infer<typeof UserDataSchema>;

// ============================================
// Result Types (for error handling)
// ============================================

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
	return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
	return { success: false, error };
}
