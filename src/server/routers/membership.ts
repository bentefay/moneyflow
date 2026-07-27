/**
 * Membership Router
 *
 * Handles vault membership management including listing members,
 * removing members, and re-keying after member removal.
 *
 * Re-keying Flow (when removing a member):
 * 1. Owner calls membership.remove → server removes member, returns remaining members
 * 2. Client generates new vault key
 * 3. Client re-encrypts CRDT snapshot with new key
 * 4. Client wraps new key for each remaining member using their enc_public_key
 * 5. Client calls membership.rekey with new wrapped keys
 * 6. Server updates encrypted_vault_key for all remaining members
 */

import { TRPCError } from "@trpc/server";

import { createSupabaseClient } from "@/lib/supabase/server";

import {
    membershipListInput,
    membershipRekeyInput,
    membershipRemoveInput
} from "../schemas/membership";
import { vaultRoleSchema } from "../schemas/vault";
import { protectedProcedure, router } from "../trpc";

export const membershipRouter = router({
    /**
     * List all members of a vault.
     *
     * Accessible to all vault members.
     * Returns enc_public_key for each member (needed for re-keying).
     */
    list: protectedProcedure.input(membershipListInput).query(async ({ ctx, input }) => {
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

        // Get all members with enc_public_key for re-keying
        const { data: members, error: membersError } = await supabase
            .from("vault_memberships")
            .select("pubkey_hash, role, enc_public_key, created_at")
            .eq("vault_id", input.vaultId);

        if (membersError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to list vault members"
            });
        }

        // Narrow the persisted role at the DB boundary rather than casting.
        return {
            members: (members ?? []).flatMap((m) => {
                const role = vaultRoleSchema.safeParse(m.role);
                return role.success
                    ? [
                          {
                              pubkeyHash: m.pubkey_hash,
                              role: role.data,
                              encPublicKey: m.enc_public_key,
                              createdAt: m.created_at
                          }
                      ]
                    : [];
            })
        };
    }),

    /**
     * Remove a member from a vault.
     *
     * Only vault owner can remove members.
     * Returns remaining members with their enc_public_key for re-keying.
     *
     * IMPORTANT: After calling this, the client MUST re-key the vault
     * to prevent the removed member from accessing future data.
     */
    remove: protectedProcedure.input(membershipRemoveInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

        // Verify caller is owner
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

        if (callerMembership.role !== "owner") {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Only the owner can remove members"
            });
        }

        // Cannot remove yourself (use vault.leave or vault.delete instead)
        if (input.pubkeyHash === ctx.pubkeyHash) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Cannot remove yourself. Use leave or delete instead."
            });
        }

        // Verify target is a member
        const { data: targetMember, error: targetError } = await supabase
            .from("vault_memberships")
            .select("role")
            .eq("vault_id", input.vaultId)
            .eq("pubkey_hash", input.pubkeyHash)
            .single();

        if (targetError || !targetMember) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Member not found"
            });
        }

        // Remove the member
        const { error: deleteError } = await supabase
            .from("vault_memberships")
            .delete()
            .eq("vault_id", input.vaultId)
            .eq("pubkey_hash", input.pubkeyHash);

        if (deleteError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to remove vault member"
            });
        }

        // Return remaining members for re-keying
        const { data: remainingMembers, error: remainingError } = await supabase
            .from("vault_memberships")
            .select("pubkey_hash, enc_public_key")
            .eq("vault_id", input.vaultId);

        if (remainingError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to list remaining vault members"
            });
        }

        return {
            success: true,
            // Only members with enc_public_key can receive new keys. flatMap narrows the nullable
            // column in one step, which `.filter(...)` alone cannot do.
            remainingMembers: (remainingMembers ?? []).flatMap((m) =>
                m.enc_public_key == null || m.enc_public_key.length === 0
                    ? []
                    : [{ pubkeyHash: m.pubkey_hash, encPublicKey: m.enc_public_key }]
            )
        };
    }),

    /**
     * Update vault keys after re-keying.
     *
     * Called after removing a member to update encrypted_vault_key
     * for all remaining members.
     *
     * Only vault owner can re-key.
     */
    rekey: protectedProcedure.input(membershipRekeyInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

        // Verify caller is owner
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

        if (callerMembership.role !== "owner") {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Only the owner can re-key the vault"
            });
        }

        const { data: updated, error: updateError } = await supabase.rpc("rekey_vault_members", {
            p_vault_id: input.vaultId,
            p_owner_pubkey_hash: ctx.pubkeyHash,
            p_member_keys: input.memberKeys.map((memberKey) => ({
                pubkey_hash: memberKey.pubkeyHash,
                encrypted_vault_key: memberKey.encryptedVaultKey
            }))
        });

        if (updateError || updated !== true) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Vault member keys must cover every current member exactly once"
            });
        }

        return { success: true };
    })
});
