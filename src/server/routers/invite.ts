/**
 * Invite Router
 *
 * Handles vault invitation creation and acceptance.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TRPCError } from "@trpc/server";

export const inviteRouter = router({
  /**
   * Create an invite for a vault.
   *
   * Only vault owner can create invites.
   */
  create: protectedProcedure
    .input(
      z.object({
        vaultId: z.string().uuid(),
        role: z.enum(["admin", "member"]).default("member"),
        expiresInHours: z.number().min(1).max(168).default(48), // Max 1 week
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
          message: "Only the owner can create invites",
        });
      }

      // Generate secure invite code
      const inviteCode = generateInviteCode();
      const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString();

      // Create invite
      const { data: invite, error: insertError } = await supabase
        .from("vault_invites")
        .insert({
          vault_id: input.vaultId,
          code: inviteCode,
          role: input.role,
          created_by: ctx.pubkeyHash,
          expires_at: expiresAt,
        })
        .select("id, code, expires_at")
        .single();

      if (insertError) {
        throw new Error(`Failed to create invite: ${insertError.message}`);
      }

      return {
        inviteId: invite.id,
        code: invite.code,
        expiresAt: invite.expires_at,
      };
    }),

  /**
   * Get invite details by code.
   *
   * Public endpoint (no auth required in terms of vault membership).
   */
  getByCode: protectedProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    const supabase = await createSupabaseServer();

    const { data: invite, error } = await supabase
      .from("vault_invites")
      .select(
        `
          id,
          vault_id,
          role,
          expires_at,
          used_at,
          vaults:vault_id (
            name_encrypted
          )
        `
      )
      .eq("code", input.code)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }
      throw new Error(`Failed to get invite: ${error.message}`);
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite has expired",
      });
    }

    // Check if already used
    if (invite.used_at) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite has already been used",
      });
    }

    return {
      inviteId: invite.id,
      vaultId: invite.vault_id,
      role: invite.role,
      expiresAt: invite.expires_at,
      vaultNameEncrypted: invite.vaults?.name_encrypted,
    };
  }),

  /**
   * Accept an invite to join a vault.
   */
  accept: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        encryptedVaultKey: z.string(), // Vault key wrapped for user's pubkey
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Get and validate invite
      const { data: invite, error: inviteError } = await supabase
        .from("vault_invites")
        .select("id, vault_id, role, expires_at, used_at")
        .eq("code", input.code)
        .single();

      if (inviteError || !invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      if (invite.used_at) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has already been used",
        });
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from("vault_memberships")
        .select("vault_id")
        .eq("vault_id", invite.vault_id)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (existingMembership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already a member of this vault",
        });
      }

      // Add membership
      const { error: memberError } = await supabase.from("vault_memberships").insert({
        vault_id: invite.vault_id,
        pubkey_hash: ctx.pubkeyHash,
        role: invite.role,
        encrypted_vault_key: input.encryptedVaultKey,
      });

      if (memberError) {
        throw new Error(`Failed to join vault: ${memberError.message}`);
      }

      // Mark invite as used
      await supabase
        .from("vault_invites")
        .update({
          used_at: new Date().toISOString(),
          used_by: ctx.pubkeyHash,
        })
        .eq("id", invite.id);

      return {
        vaultId: invite.vault_id,
        role: invite.role,
      };
    }),

  /**
   * List invites for a vault.
   *
   * Only vault owner can see invites.
   */
  list: protectedProcedure
    .input(z.object({ vaultId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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
          message: "Only the owner can view invites",
        });
      }

      const { data: invites, error: listError } = await supabase
        .from("vault_invites")
        .select("id, code, role, expires_at, used_at, created_at")
        .eq("vault_id", input.vaultId)
        .order("created_at", { ascending: false });

      if (listError) {
        throw new Error(`Failed to list invites: ${listError.message}`);
      }

      return invites.map((invite) => ({
        ...invite,
        isExpired: new Date(invite.expires_at) < new Date(),
        isUsed: !!invite.used_at,
      }));
    }),

  /**
   * Revoke an invite.
   *
   * Only vault owner can revoke invites.
   */
  revoke: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Get invite and verify ownership
      const { data: invite, error: inviteError } = await supabase
        .from("vault_invites")
        .select("vault_id, used_at")
        .eq("id", input.inviteId)
        .single();

      if (inviteError || !invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      if (invite.used_at) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot revoke a used invite",
        });
      }

      const { data: vault, error: vaultError } = await supabase
        .from("vaults")
        .select("owner_pubkey_hash")
        .eq("id", invite.vault_id)
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

/**
 * Generate a secure invite code.
 *
 * Uses crypto.randomUUID for uniqueness and takes first segment.
 * Results in 8-char hex codes like "a1b2c3d4".
 */
function generateInviteCode(): string {
  // Use crypto API for secure random generation
  const uuid = crypto.randomUUID();
  return uuid.split("-").slice(0, 2).join("");
}
