/**
 * Vault Router
 *
 * Handles vault CRUD operations and membership management.
 *
 * Zero-Knowledge Design:
 * - Vaults table only has id and created_at (no user-identifiable data)
 * - Ownership is tracked via 'owner' role in vault_memberships
 * - Vault names and other metadata are stored encrypted in CRDT snapshots/updates
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TRPCError } from "@trpc/server";
import {
  vaultCreateInput,
  vaultGetInput,
  vaultMembersInput,
  vaultDeleteInput,
  vaultLeaveInput,
} from "../schemas/vault";

export const vaultRouter = router({
  /**
   * List all vaults the user is a member of.
   *
   * Returns vault IDs and encrypted vault keys for decryption.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createSupabaseServer();

    // Get all vault memberships for this user
    const { data: memberships, error: memberError } = await supabase
      .from("vault_memberships")
      .select(
        `
        role,
        encrypted_vault_key,
        created_at,
        vaults:vault_id (
          id,
          created_at
        )
      `
      )
      .eq("pubkey_hash", ctx.pubkeyHash);

    if (memberError) {
      throw new Error(`Failed to list vaults: ${memberError.message}`);
    }

    // Transform to output format
    const vaults = (memberships ?? [])
      .map((m) => {
        const vault = m.vaults as { id: string; created_at: string } | null;
        return {
          id: vault?.id ?? "",
          role: m.role as "owner" | "member",
          encryptedVaultKey: m.encrypted_vault_key,
          createdAt: vault?.created_at ?? m.created_at,
        };
      })
      .filter((v) => v.id); // Filter out any with missing vault

    return { vaults };
  }),

  /**
   * Create a new vault.
   *
   * The creator automatically becomes the owner with the vault key.
   */
  create: protectedProcedure.input(vaultCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = await createSupabaseServer();

    // Create vault (just id and created_at - zero knowledge)
    const { data: vault, error: vaultError } = await supabase
      .from("vaults")
      .insert({})
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
   * Returns the encrypted vault key for this user (to decrypt CRDT data).
   */
  get: protectedProcedure.input(vaultGetInput).query(async ({ ctx, input }) => {
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
  members: protectedProcedure.input(vaultMembersInput).query(async ({ ctx, input }) => {
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
      .select("pubkey_hash, role, created_at")
      .eq("vault_id", input.vaultId);

    if (membersError) {
      throw new Error(`Failed to get members: ${membersError.message}`);
    }

    return members;
  }),

  /**
   * Delete a vault.
   *
   * Only accessible to vault owner. Cascades to memberships, snapshots, updates.
   */
  delete: protectedProcedure.input(vaultDeleteInput).mutation(async ({ ctx, input }) => {
    const supabase = await createSupabaseServer();

    // Verify ownership via membership role
    const { data: membership, error: memberError } = await supabase
      .from("vault_memberships")
      .select("role")
      .eq("vault_id", input.vaultId)
      .eq("pubkey_hash", ctx.pubkeyHash)
      .single();

    if (memberError || !membership) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Vault not found or access denied",
      });
    }

    if (membership.role !== "owner") {
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
  leave: protectedProcedure.input(vaultLeaveInput).mutation(async ({ ctx, input }) => {
    const supabase = await createSupabaseServer();

    // Check user's role
    const { data: membership, error: memberError } = await supabase
      .from("vault_memberships")
      .select("role")
      .eq("vault_id", input.vaultId)
      .eq("pubkey_hash", ctx.pubkeyHash)
      .single();

    if (memberError || !membership) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Vault not found or you are not a member",
      });
    }

    if (membership.role === "owner") {
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
