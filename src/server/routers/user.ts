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
import { createSupabaseServer } from "@/lib/supabase/server";

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
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("user_data")
      .select("pubkey_hash")
      .eq("pubkey_hash", input.pubkeyHash)
      .maybeSingle();

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Database error: ${error.message}`,
      });
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
    const supabase = await createSupabaseServer();

    // Check if user already exists
    const { data: existing } = await supabase
      .from("user_data")
      .select("pubkey_hash")
      .eq("pubkey_hash", input.pubkeyHash)
      .maybeSingle();

    if (existing) {
      return { success: true, isNew: false };
    }

    // Create new user
    const { error } = await supabase.from("user_data").insert({
      pubkey_hash: input.pubkeyHash,
      encrypted_data: input.encryptedData ?? "",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      // Handle race condition (another request created user)
      if (error.code === "23505") {
        return { success: true, isNew: false };
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to register: ${error.message}`,
      });
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
    const supabase = await createSupabaseServer();

    // Try to get existing user
    const { data: existing, error: selectError } = await supabase
      .from("user_data")
      .select("encrypted_data, updated_at")
      .eq("pubkey_hash", input.pubkeyHash)
      .maybeSingle();

    if (selectError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Database error: ${selectError.message}`,
      });
    }

    if (existing) {
      return {
        isNew: false,
        encryptedData: existing.encrypted_data,
        updatedAt: existing.updated_at,
      };
    }

    // Create new user
    const now = new Date().toISOString();
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
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to resolve race condition",
          });
        }

        return {
          isNew: false,
          encryptedData: raceUser.encrypted_data,
          updatedAt: raceUser.updated_at,
        };
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to create user: ${insertError.message}`,
      });
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
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("user_data")
      .select("encrypted_data, updated_at")
      .eq("pubkey_hash", ctx.pubkeyHash)
      .maybeSingle();

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Database error: ${error.message}`,
      });
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
    const supabase = await createSupabaseServer();

    const { error } = await supabase.from("user_data").upsert(
      {
        pubkey_hash: ctx.pubkeyHash,
        encrypted_data: input.encryptedData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pubkey_hash" }
    );

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to update: ${error.message}`,
      });
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
    const supabase = await createSupabaseServer();

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
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get vaults: ${error.message}`,
      });
    }

    return data ?? [];
  }),
});
