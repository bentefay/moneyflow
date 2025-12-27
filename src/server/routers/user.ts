/**
 * User Router
 *
 * Handles user identity registration and data management.
 *
 * Authentication Model:
 * - Key-only auth via Ed25519 signatures
 * - pubkey_hash is the user's permanent identity
 * - No email, no passwords, no sessions
 *
 * Data Model:
 * - encrypted_data blob contains vault references and settings
 * - All encryption/decryption happens client-side
 * - Server never sees plaintext user data
 */

import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import {
  userExistsInput,
  userRegisterInput,
  userGetOrCreateInput,
  upsertUserDataInput,
} from "../schemas/user";
import { createSupabaseClient } from "@/lib/supabase/server";
import { Temporal } from "temporal-polyfill";

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Determine if an error is a connection/infrastructure issue.
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("fetch failed") ||
      message.includes("econnrefused") ||
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection")
    );
  }
  return false;
}

/**
 * Handle database errors by logging details and throwing sanitized errors.
 * This prevents leaking internal implementation details to clients.
 */
function handleDatabaseError(error: unknown, operation: string): never {
  // Log full error details server-side
  console.error(`[${operation}] Database error:`, error);

  // Determine error category and throw sanitized error
  if (isConnectionError(error)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unable to connect to database",
      // Attach cause for server-side logging but it won't be sent to client
      cause: error,
    });
  }

  // Generic database error
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Database operation failed",
    cause: error,
  });
}

// ============================================================================
// Router
// ============================================================================

export const userRouter = router({
  /**
   * Check if a user exists by pubkey_hash.
   *
   * Used before full unlock to determine:
   * - New user → show seed phrase confirmation flow
   * - Existing user → direct unlock
   *
   * Public procedure - no signature required (checking before user has identity loaded).
   */
  exists: publicProcedure.input(userExistsInput).query(async ({ input }) => {
    let supabase;
    try {
      supabase = await createSupabaseClient();
    } catch (error) {
      handleDatabaseError(error, "user.exists:connect");
    }

    const { data, error } = await supabase
      .from("user_data")
      .select("pubkey_hash")
      .eq("pubkey_hash", input.pubkeyHash)
      .maybeSingle();

    if (error) {
      handleDatabaseError(error, "user.exists:query");
    }

    return { exists: !!data };
  }),

  /**
   * Register a new user.
   *
   * Creates a user_data record with the pubkey_hash.
   * Returns whether this was a new registration or existing user.
   *
   * Public procedure - called during initial identity creation before
   * the client has a signature (signing requires the full keypair).
   *
   * Note: This is idempotent - calling with same pubkey_hash is safe.
   */
  register: publicProcedure.input(userRegisterInput).mutation(async ({ input }) => {
    let supabase;
    try {
      supabase = await createSupabaseClient();
    } catch (error) {
      handleDatabaseError(error, "user.register:connect");
    }

    // Check if user already exists
    const { data: existing, error: selectError } = await supabase
      .from("user_data")
      .select("pubkey_hash")
      .eq("pubkey_hash", input.pubkeyHash)
      .maybeSingle();

    if (selectError) {
      handleDatabaseError(selectError, "user.register:check");
    }

    if (existing) {
      return { success: true, isNew: false };
    }

    // Create new user
    const { error } = await supabase.from("user_data").insert({
      pubkey_hash: input.pubkeyHash,
      encrypted_data: input.encryptedData ?? "",
      updated_at: Temporal.Now.instant().toString(),
    });

    if (error) {
      // Handle race condition (another request created user)
      if (error.code === "23505") {
        return { success: true, isNew: false };
      }

      handleDatabaseError(error, "user.register:insert");
    }

    return { success: true, isNew: true };
  }),

  /**
   * Get or create user - idempotent registration.
   *
   * Returns existing user data or creates new user and returns empty data.
   * This is the preferred method for unlock flow:
   * 1. User enters seed phrase
   * 2. Client derives keypair and pubkey_hash
   * 3. Client calls getOrCreate
   * 4. If isNew, show welcome/setup
   * 5. If existing, load encrypted data
   *
   * Public procedure - same reason as register.
   */
  getOrCreate: publicProcedure.input(userGetOrCreateInput).mutation(async ({ input }) => {
    let supabase;
    try {
      supabase = await createSupabaseClient();
    } catch (error) {
      handleDatabaseError(error, "user.getOrCreate:connect");
    }

    // Try to get existing user
    const { data: existing, error: selectError } = await supabase
      .from("user_data")
      .select("encrypted_data, updated_at")
      .eq("pubkey_hash", input.pubkeyHash)
      .maybeSingle();

    if (selectError) {
      handleDatabaseError(selectError, "user.getOrCreate:select");
    }

    if (existing) {
      return {
        isNew: false,
        encryptedData: existing.encrypted_data,
        updatedAt: existing.updated_at,
      };
    }

    // Create new user
    const now = Temporal.Now.instant().toString();
    const { data: newUser, error: insertError } = await supabase
      .from("user_data")
      .insert({
        pubkey_hash: input.pubkeyHash,
        encrypted_data: "",
        updated_at: now,
      })
      .select("encrypted_data, updated_at")
      .single();

    if (insertError) {
      // Handle race condition - another request created user
      if (insertError.code === "23505") {
        const { data: raceUser, error: raceError } = await supabase
          .from("user_data")
          .select("encrypted_data, updated_at")
          .eq("pubkey_hash", input.pubkeyHash)
          .single();

        if (raceError || !raceUser) {
          handleDatabaseError(
            raceError ?? new Error("User not found after race"),
            "user.getOrCreate:race"
          );
        }

        return {
          isNew: false,
          encryptedData: raceUser.encrypted_data,
          updatedAt: raceUser.updated_at,
        };
      }

      handleDatabaseError(insertError, "user.getOrCreate:insert");
    }

    return {
      isNew: true,
      encryptedData: newUser.encrypted_data,
      updatedAt: newUser.updated_at,
    };
  }),

  /**
   * Get user's encrypted data.
   *
   * Returns the encrypted blob containing vault references and settings.
   * Requires valid signature (authenticated procedure).
   */
  getData: protectedProcedure.query(async ({ ctx }) => {
    let supabase;
    try {
      supabase = await createSupabaseClient();
    } catch (error) {
      handleDatabaseError(error, "user.getData:connect");
    }

    const { data, error } = await supabase
      .from("user_data")
      .select("encrypted_data, updated_at")
      .eq("pubkey_hash", ctx.pubkeyHash)
      .maybeSingle();

    if (error) {
      handleDatabaseError(error, "user.getData:query");
    }

    if (!data) {
      return { data: null };
    }

    return {
      data: {
        encryptedData: data.encrypted_data,
        updatedAt: data.updated_at,
      },
    };
  }),

  /**
   * Update user's encrypted data.
   *
   * Replaces the entire encrypted blob.
   * Client is responsible for merge logic before calling.
   * Requires valid signature.
   */
  upsertData: protectedProcedure.input(upsertUserDataInput).mutation(async ({ ctx, input }) => {
    let supabase;
    try {
      supabase = await createSupabaseClient();
    } catch (error) {
      handleDatabaseError(error, "user.upsertData:connect");
    }

    const { error } = await supabase.from("user_data").upsert(
      {
        pubkey_hash: ctx.pubkeyHash,
        encrypted_data: input.encryptedData,
        updated_at: Temporal.Now.instant().toString(),
      },
      { onConflict: "pubkey_hash" }
    );

    if (error) {
      handleDatabaseError(error, "user.upsertData:upsert");
    }

    return { success: true };
  }),

  /**
   * Get current user's vaults.
   *
   * Returns all vaults the authenticated user is a member of,
   * including their role and encrypted vault key.
   */
  myVaults: protectedProcedure.query(async ({ ctx }) => {
    let supabase;
    try {
      supabase = await createSupabaseClient();
    } catch (error) {
      handleDatabaseError(error, "user.myVaults:connect");
    }

    const { data, error } = await supabase
      .from("vault_memberships")
      .select(
        `
        vault_id,
        role,
        encrypted_vault_key,
        vaults:vault_id (
          id,
          created_at
        )
      `
      )
      .eq("pubkey_hash", ctx.pubkeyHash);

    if (error) {
      handleDatabaseError(error, "user.myVaults:query");
    }

    return data ?? [];
  }),
});
