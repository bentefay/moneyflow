/**
 * User Zod Schemas
 *
 * Input/output schemas for verified user registration procedures.
 */

import { z } from "zod";

// ============================================================================
// Verified Self-Only Inputs
// ============================================================================

/**
 * Identity is never accepted from procedure input. Strict empty objects reject compatibility
 * callers that attempt to smuggle a claimed hash alongside a valid signature.
 */
/**
 * Register a new user.
 *
 * Called only after the client has installed the confirmed identity long enough to sign the
 * request. Signature middleware derives the immutable pubkey hash.
 */
export const userRegisterInput = z.object({}).strict();

export type UserRegisterInput = z.infer<typeof userRegisterInput>;

export const userRegisterOutput = z.object({
    success: z.boolean(),
    isNew: z.boolean().describe("True if a new user was created, false if already existed")
});

export type UserRegisterOutput = z.infer<typeof userRegisterOutput>;

// ============================================================================
// Get or Create User (Idempotent registration)
// ============================================================================

/**
 * Get existing user or create new one.
 *
 * Idempotent operation - safe to call multiple times.
 * Returns registration metadata if the row exists, and creates it otherwise.
 */
export const userGetOrCreateInput = z.object({}).strict();

export type UserGetOrCreateInput = z.infer<typeof userGetOrCreateInput>;

export const userGetOrCreateOutput = z.object({
    isNew: z.boolean(),
    updatedAt: z.string().datetime().nullable()
});

export type UserGetOrCreateOutput = z.infer<typeof userGetOrCreateOutput>;
