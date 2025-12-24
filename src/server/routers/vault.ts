/**
 * Vault Router
 *
 * Handles vault CRUD operations and membership management.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TRPCError } from "@trpc/server";

export const vaultRouter = router({
  /**
   * Create a new vault.
   *
   * The creator automatically becomes the owner with the vault key.
   */
  create: protectedProcedure
    .input(
      z.object({
        nameEncrypted: z.string(), // Vault name encrypted with vault key
        encryptedVaultKey: z.string(), // Vault key wrapped for creator's pubkey
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Create vault
      const { data: vault, error: vaultError } = await supabase
        .from("vaults")
        .insert({
          owner_pubkey_hash: ctx.pubkeyHash,
          name_encrypted: input.nameEncrypted,
        })
        .select("id")
        .single();

      if (vaultError) {
        throw new Error(`Failed to create vault: ${vaultError.message}`);
      }

      // Add creator as owner member
      const { error: memberError } = await supabase.from("vault_memberships").insert({
        vault_id: vault.id,
        pubkey_hash: ctx.pubkeyHash,
        role: "owner",
        encrypted_vault_key: input.encryptedVaultKey,
      });

      if (memberError) {
        // Rollback vault creation
        await supabase.from("vaults").delete().eq("id", vault.id);
        throw new Error(`Failed to add membership: ${memberError.message}`);
      }

      return { vaultId: vault.id };
    }),

  /**
   * Get vault details.
   *
   * Only accessible to vault members.
   */
  get: protectedProcedure
    .input(z.object({ vaultId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Check membership and get vault
      const { data: membership, error: memberError } = await supabase
        .from("vault_memberships")
        .select(
          `
          role,
          encrypted_vault_key,
          vaults:vault_id (
            id,
            name_encrypted,
            owner_pubkey_hash,
            created_at
          )
        `
        )
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (memberError || !membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found or access denied",
        });
      }

      return {
        vault: membership.vaults,
        role: membership.role,
        encryptedVaultKey: membership.encrypted_vault_key,
      };
    }),

  /**
   * Get all members of a vault.
   *
   * Only accessible to vault members.
   */
  members: protectedProcedure
    .input(z.object({ vaultId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify caller is a member
      const { data: callerMembership, error: callerError } = await supabase
        .from("vault_memberships")
        .select("role")
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (callerError || !callerMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found or access denied",
        });
      }

      // Get all members
      const { data: members, error: membersError } = await supabase
        .from("vault_memberships")
        .select("pubkey_hash, role, joined_at")
        .eq("vault_id", input.vaultId);

      if (membersError) {
        throw new Error(`Failed to get members: ${membersError.message}`);
      }

      return members;
    }),

  /**
   * Update vault name.
   *
   * Only accessible to vault owner.
   */
  updateName: protectedProcedure
    .input(
      z.object({
        vaultId: z.string().uuid(),
        nameEncrypted: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify ownership
      const { data: vault, error: vaultError } = await supabase
        .from("vaults")
        .select("owner_pubkey_hash")
        .eq("id", input.vaultId)
        .single();

      if (vaultError || !vault) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found",
        });
      }

      if (vault.owner_pubkey_hash !== ctx.pubkeyHash) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can update the vault name",
        });
      }

      const { error: updateError } = await supabase
        .from("vaults")
        .update({ name_encrypted: input.nameEncrypted })
        .eq("id", input.vaultId);

      if (updateError) {
        throw new Error(`Failed to update vault: ${updateError.message}`);
      }

      return { success: true };
    }),

  /**
   * Delete a vault.
   *
   * Only accessible to vault owner. Cascades to memberships, snapshots, updates.
   */
  delete: protectedProcedure
    .input(z.object({ vaultId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify ownership
      const { data: vault, error: vaultError } = await supabase
        .from("vaults")
        .select("owner_pubkey_hash")
        .eq("id", input.vaultId)
        .single();

      if (vaultError || !vault) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found",
        });
      }

      if (vault.owner_pubkey_hash !== ctx.pubkeyHash) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can delete the vault",
        });
      }

      const { error: deleteError } = await supabase.from("vaults").delete().eq("id", input.vaultId);

      if (deleteError) {
        throw new Error(`Failed to delete vault: ${deleteError.message}`);
      }

      return { success: true };
    }),

  /**
   * Leave a vault.
   *
   * Members can leave, but owners must transfer ownership first.
   */
  leave: protectedProcedure
    .input(z.object({ vaultId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Check if user is owner
      const { data: vault, error: vaultError } = await supabase
        .from("vaults")
        .select("owner_pubkey_hash")
        .eq("id", input.vaultId)
        .single();

      if (vaultError || !vault) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found",
        });
      }

      if (vault.owner_pubkey_hash === ctx.pubkeyHash) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Owner cannot leave vault. Transfer ownership or delete the vault.",
        });
      }

      const { error: deleteError } = await supabase
        .from("vault_memberships")
        .delete()
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash);

      if (deleteError) {
        throw new Error(`Failed to leave vault: ${deleteError.message}`);
      }

      return { success: true };
    }),
});
