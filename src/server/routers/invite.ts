/**
 * Invite Router
 *
 * Handles vault invitation creation and acceptance using zero-knowledge design.
 *
 * How invites work:
 * 1. Owner creates invite with ephemeral pubkey (derived from invite secret)
 * 2. Invite secret is shared via URL fragment (never sent to server)
 * 3. Recipient derives pubkey from secret and looks up invite
 * 4. Recipient uses invite secret to unwrap vault key and joins vault
 * 5. Recipient's enc_public_key is stored for future vault re-keying
 */

import { router, protectedProcedure, publicProcedure } from "../trpc";
import { createSupabaseClient } from "@/lib/supabase/server";
import { TRPCError } from "@trpc/server";
import type { VaultRole } from "@/lib/supabase/types";
import { Temporal } from "temporal-polyfill";
import {
  inviteCreateInput,
  inviteGetByPubkeyInput,
  inviteAcceptInput,
  inviteListInput,
  inviteRevokeInput,
} from "../schemas/invite";

export const inviteRouter = router({
  /**
   * Create an invite for a vault.
   *
   * Only vault owner can create invites.
   * Client generates ephemeral keypair from invite secret and provides:
   * - invitePubkey: public key for looking up the invite
   * - encryptedVaultKey: vault key wrapped with invite pubkey
   */
  create: protectedProcedure.input(inviteCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = await createSupabaseClient();

    // Verify user is vault owner via membership
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
        message: "Only the owner can create invites",
      });
    }

    const expiresAt = Temporal.Now.instant().add({ hours: input.expiresInHours }).toString();

    // Create invite with ephemeral pubkey
    const { data: invite, error: insertError } = await supabase
      .from("vault_invites")
      .insert({
        vault_id: input.vaultId,
        invite_pubkey: input.invitePubkey,
        encrypted_vault_key: input.encryptedVaultKey,
        role: input.role as VaultRole,
        created_by: ctx.pubkeyHash,
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (insertError) {
      // Duplicate pubkey means duplicate invite secret (very unlikely)
      if (insertError.code === "23505") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invite already exists (regenerate secret)",
        });
      }
      throw new Error(`Failed to create invite: ${insertError.message}`);
    }

    return {
      inviteId: invite.id,
      expiresAt: invite.expires_at,
    };
  }),

  /**
   * Get invite details by pubkey.
   *
   * Client derives pubkey from invite secret and looks up the invite.
   * Returns encrypted vault key that can be unwrapped with invite secret.
   */
  getByPubkey: publicProcedure.input(inviteGetByPubkeyInput).query(async ({ input }) => {
    const supabase = await createSupabaseClient();

    const { data: invite, error } = await supabase
      .from("vault_invites")
      .select("id, vault_id, encrypted_vault_key, role, expires_at")
      .eq("invite_pubkey", input.invitePubkey)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite",
        });
      }
      throw new Error(`Failed to get invite: ${error.message}`);
    }

    // Check if expired
    if (
      Temporal.Instant.compare(Temporal.Instant.from(invite.expires_at), Temporal.Now.instant()) < 0
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite has expired",
      });
    }

    return {
      inviteId: invite.id,
      vaultId: invite.vault_id,
      encryptedVaultKey: invite.encrypted_vault_key,
      role: invite.role,
      expiresAt: invite.expires_at,
    };
  }),

  /**
   * Accept an invite to join a vault.
   *
   * Client unwraps vault key using invite secret and re-wraps for their pubkey.
   * Also provides their enc_public_key for future vault re-keying operations.
   */
  accept: protectedProcedure.input(inviteAcceptInput).mutation(async ({ ctx, input }) => {
    const supabase = await createSupabaseClient();

    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from("vault_invites")
      .select("id, vault_id, role, expires_at")
      .eq("invite_pubkey", input.invitePubkey)
      .single();

    if (inviteError || !invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid invite",
      });
    }

    if (
      Temporal.Instant.compare(Temporal.Instant.from(invite.expires_at), Temporal.Now.instant()) < 0
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite has expired",
      });
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from("vault_memberships")
      .select("id")
      .eq("vault_id", invite.vault_id)
      .eq("pubkey_hash", ctx.pubkeyHash)
      .single();

    if (existingMembership) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are already a member of this vault",
      });
    }

    // Add membership with vault key wrapped for user's pubkey and their enc_public_key
    const { error: memberError } = await supabase.from("vault_memberships").insert({
      vault_id: invite.vault_id,
      pubkey_hash: ctx.pubkeyHash,
      role: invite.role,
      encrypted_vault_key: input.encryptedVaultKey,
      enc_public_key: input.encPublicKey,
    });

    if (memberError) {
      throw new Error(`Failed to join vault: ${memberError.message}`);
    }

    // Delete the invite (single use)
    await supabase.from("vault_invites").delete().eq("id", invite.id);

    return {
      vaultId: invite.vault_id,
      role: invite.role,
    };
  }),

  /**
   * List active invites for a vault.
   *
   * Only vault owner can see invites.
   */
  list: protectedProcedure.input(inviteListInput).query(async ({ ctx, input }) => {
    const supabase = await createSupabaseClient();

    // Verify ownership via membership
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
        message: "Only the owner can view invites",
      });
    }

    const { data: invites, error: listError } = await supabase
      .from("vault_invites")
      .select("id, role, expires_at, created_at")
      .eq("vault_id", input.vaultId)
      .order("created_at", { ascending: false });

    if (listError) {
      throw new Error(`Failed to list invites: ${listError.message}`);
    }

    return (invites ?? []).map((invite) => ({
      id: invite.id,
      role: invite.role,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
      isExpired:
        Temporal.Instant.compare(Temporal.Instant.from(invite.expires_at), Temporal.Now.instant()) <
        0,
    }));
  }),

  /**
   * Revoke an invite.
   *
   * Only vault owner can revoke invites.
   */
  revoke: protectedProcedure.input(inviteRevokeInput).mutation(async ({ ctx, input }) => {
    const supabase = await createSupabaseClient();

    // Get invite to find vault
    const { data: invite, error: inviteError } = await supabase
      .from("vault_invites")
      .select("vault_id")
      .eq("id", input.inviteId)
      .single();

    if (inviteError || !invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite not found",
      });
    }

    // Verify ownership
    const { data: membership, error: memberError } = await supabase
      .from("vault_memberships")
      .select("role")
      .eq("vault_id", invite.vault_id)
      .eq("pubkey_hash", ctx.pubkeyHash)
      .single();

    if (memberError || !membership || membership.role !== "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the owner can revoke invites",
      });
    }

    const { error: deleteError } = await supabase
      .from("vault_invites")
      .delete()
      .eq("id", input.inviteId);

    if (deleteError) {
      throw new Error(`Failed to revoke invite: ${deleteError.message}`);
    }

    return { success: true };
  }),
});
