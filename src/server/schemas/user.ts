/**
 * User Zod Schemas
 *
 * Input/output schemas for user-related tRPC procedures.
 * These schemas are used for:
 * - Runtime validation of API inputs
 * - TypeScript type inference
 * - Client-side form validation (shared schemas)
 */

import { z } from "zod";

// ============================================================================
// Base Schemas (reusable primitives)
// ============================================================================

/**
 * 64-character hex string representing BLAKE2b hash of Ed25519 public key
 */
export const pubkeyHashSchema = z
  .string()
  .length(64)
  .regex(/^[a-f0-9]+$/i, "Must be a valid hex string");

/**
 * Base64-encoded encrypted data blob
 */
export const encryptedDataSchema = z
  .string()
  .min(1, "Encrypted data cannot be empty")
  .refine(
    (val) => {
      try {
        atob(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be valid base64" }
  );

// ============================================================================
// User Existence Check (Public - before auth)
// ============================================================================

export const userExistsInput = z.object({
  pubkeyHash: pubkeyHashSchema,
});

export type UserExistsInput = z.infer<typeof userExistsInput>;

export const userExistsOutput = z.object({
  exists: z.boolean(),
});

export type UserExistsOutput = z.infer<typeof userExistsOutput>;

// ============================================================================
// User Registration (Public - creates user record)
// ============================================================================

/**
 * Register a new user.
 *
 * Called after generating a seed phrase and deriving keypair.
 * The pubkey_hash becomes the user's immutable identity.
 */
export const userRegisterInput = z.object({
  /**
   * BLAKE2b hash of Ed25519 public key (hex, 64 chars).
   * This is the user's permanent identity.
   */
  pubkeyHash: pubkeyHashSchema,

  /**
   * Optional encrypted data to store immediately.
   * Usually empty on first registration; populated later.
   */
  encryptedData: encryptedDataSchema.optional(),
});

export type UserRegisterInput = z.infer<typeof userRegisterInput>;

export const userRegisterOutput = z.object({
  success: z.boolean(),
  isNew: z.boolean().describe("True if a new user was created, false if already existed"),
});

export type UserRegisterOutput = z.infer<typeof userRegisterOutput>;

// ============================================================================
// Get or Create User (Idempotent registration)
// ============================================================================

/**
 * Get existing user or create new one.
 *
 * Idempotent operation - safe to call multiple times.
 * Returns user data if exists, creates and returns if not.
 */
export const userGetOrCreateInput = z.object({
  pubkeyHash: pubkeyHashSchema,
});

export type UserGetOrCreateInput = z.infer<typeof userGetOrCreateInput>;

export const userGetOrCreateOutput = z.object({
  isNew: z.boolean(),
  encryptedData: encryptedDataSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserGetOrCreateOutput = z.infer<typeof userGetOrCreateOutput>;

// ============================================================================
// Get User Data (Authenticated)
// ============================================================================

/**
 * No input required - uses pubkeyHash from authenticated context.
 */
export const getUserDataInput = z.object({});

export type GetUserDataInput = z.infer<typeof getUserDataInput>;

export const getUserDataOutput = z.object({
  data: z
    .object({
      encryptedData: encryptedDataSchema.nullable(),
      updatedAt: z.string().datetime(),
    })
    .nullable(),
});

export type GetUserDataOutput = z.infer<typeof getUserDataOutput>;

// ============================================================================
// Upsert User Data (Authenticated)
// ============================================================================

/**
 * Create or update user's encrypted data.
 *
 * The encryptedData blob contains:
 * - Vault references (vault IDs + wrapped keys)
 * - User settings/preferences
 * - Any other user-specific data
 *
 * All decryption happens client-side.
 */
export const upsertUserDataInput = z.object({
  encryptedData: encryptedDataSchema,
});

export type UpsertUserDataInput = z.infer<typeof upsertUserDataInput>;

export const upsertUserDataOutput = z.object({
  success: z.boolean(),
});

export type UpsertUserDataOutput = z.infer<typeof upsertUserDataOutput>;
