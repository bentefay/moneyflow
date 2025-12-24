/**
 * User Router
 *
 * Handles user identity registration and settings.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { createSupabaseServer } from "@/lib/supabase/server";

export const userRouter = router({
  /**
   * Register or update user identity.
   *
   * Called after first login to associate pubkey_hash with device fingerprint.
   * This is a public procedure because the user doesn't have auth yet.
   */
  register: publicProcedure
    .input(
      z.object({
        pubkeyHash: z.string().length(64),
        encryptedKeyPair: z.string(), // Base64 encrypted with device key
        deviceFingerprint: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = await createSupabaseServer();

      const { error } = await supabase.from("user_data").upsert(
        {
          pubkey_hash: input.pubkeyHash,
          encrypted_keypair: input.encryptedKeyPair,
          device_fingerprint: input.deviceFingerprint,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "pubkey_hash",
        }
      );

      if (error) {
        throw new Error(`Failed to register user: ${error.message}`);
      }

      return { success: true };
    }),

  /**
   * Get user data by device fingerprint.
   *
   * Used during login to retrieve encrypted keypair.
   */
  getByDevice: publicProcedure
    .input(
      z.object({
        deviceFingerprint: z.string(),
      })
    )
    .query(async ({ input }) => {
      const supabase = await createSupabaseServer();

      const { data, error } = await supabase
        .from("user_data")
        .select("pubkey_hash, encrypted_keypair")
        .eq("device_fingerprint", input.deviceFingerprint)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Not found
          return null;
        }
        throw new Error(`Failed to get user data: ${error.message}`);
      }

      return data;
    }),

  /**
   * Get current user's vaults.
   *
   * Returns all vaults the authenticated user is a member of.
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
          name_encrypted,
          created_at
        )
      `
      )
      .eq("pubkey_hash", ctx.pubkeyHash);

    if (error) {
      throw new Error(`Failed to get vaults: ${error.message}`);
    }

    return data;
  }),
});
