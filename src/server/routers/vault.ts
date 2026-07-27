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

import { TRPCError } from "@trpc/server";

import { createSupabaseClient } from "@/lib/supabase/server";

import {
    membershipVaultSchema,
    vaultCreateInput,
    vaultDeleteInput,
    vaultGetInput,
    vaultLeaveInput,
    vaultMembersInput,
    vaultRoleSchema
} from "../schemas/vault";
import { protectedProcedure, router } from "../trpc";

export const vaultRouter = router({
    /**
     * List all vaults the user is a member of.
     *
     * Returns vault IDs and encrypted vault keys for decryption.
     */
    list: protectedProcedure.query(async ({ ctx }) => {
        const supabase = await createSupabaseClient();

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
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to list vaults"
            });
        }

        // Transform to output format, narrowing the persisted role at the DB boundary rather
        // than casting. A membership with an unrecognized role or missing vault is dropped.
        const vaults = (memberships ?? []).flatMap((m) => {
            const vault = membershipVaultSchema.safeParse(m.vaults);
            const role = vaultRoleSchema.safeParse(m.role);
            if (!vault.success || !role.success || !vault.data) return [];

            return [
                {
                    id: vault.data.id,
                    role: role.data,
                    encryptedVaultKey: m.encrypted_vault_key,
                    createdAt: vault.data.created_at ?? m.created_at
                }
            ];
        });

        return { vaults };
    }),

    /**
     * Create a new vault.
     *
     * The creator automatically becomes the owner with the vault key.
     */
    create: protectedProcedure.input(vaultCreateInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

        const { data: vaultId, error: vaultError } = await supabase.rpc("create_vault_for_owner", {
            p_owner_pubkey_hash: ctx.pubkeyHash,
            p_encrypted_vault_key: input.encryptedVaultKey,
            p_enc_public_key: input.encPublicKey
        });

        if (vaultError || !vaultId) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to create vault"
            });
        }

        return { vaultId };
    }),

    /**
     * Get vault details.
     *
     * Only accessible to vault members.
     * Returns the encrypted vault key for this user (to decrypt CRDT data).
     */
    get: protectedProcedure.input(vaultGetInput).query(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        return {
            vault: membership.vaults,
            role: membership.role,
            encryptedVaultKey: membership.encrypted_vault_key
        };
    }),

    /**
     * Get all members of a vault.
     *
     * Only accessible to vault members.
     */
    members: protectedProcedure.input(vaultMembersInput).query(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        // Get all members
        const { data: members, error: membersError } = await supabase
            .from("vault_memberships")
            .select("pubkey_hash, role, created_at")
            .eq("vault_id", input.vaultId);

        if (membersError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to list vault members"
            });
        }

        return members;
    }),

    /**
     * Delete a vault.
     *
     * Only accessible to vault owner. Cascades to memberships, snapshots, updates.
     */
    delete: protectedProcedure.input(vaultDeleteInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        if (membership.role !== "owner") {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Only the owner can delete the vault"
            });
        }

        const { data: deleted, error: deleteError } = await supabase.rpc("soft_delete_vault", {
            p_vault_id: input.vaultId,
            p_owner_pubkey_hash: ctx.pubkeyHash
        });

        if (deleteError || deleted !== true) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Vault not found or access denied"
            });
        }

        return { success: true };
    }),

    /**
     * Leave a vault.
     *
     * Members can leave, but owners must transfer ownership first.
     */
    leave: protectedProcedure.input(vaultLeaveInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or you are not a member"
            });
        }

        if (membership.role === "owner") {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Owner cannot leave vault. Transfer ownership or delete the vault."
            });
        }

        const { error: deleteError } = await supabase
            .from("vault_memberships")
            .delete()
            .eq("vault_id", input.vaultId)
            .eq("pubkey_hash", ctx.pubkeyHash);

        if (deleteError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to leave vault"
            });
        }

        return { success: true };
    })
});
