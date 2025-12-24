/**
 * Base TypeScript types and Zod schemas for MoneyFlow.
 *
 * This file contains shared types that are used across the application.
 * Domain-specific types live closer to their usage (e.g., CRDT schema, API schemas).
 */

import { z } from "zod";

// ============================================
// Core Primitives
// ============================================

/** UUID v4 string */
export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

/** ISO date string (YYYY-MM-DD) */
export const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type ISODate = z.infer<typeof ISODateSchema>;

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

export const AutomationColumnSchema = z.enum(["merchant", "description", "amount", "accountId"]);
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
// Result Types (for error handling)
// ============================================

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
