/**
 * Sync Router
 *
 * Handles CRDT synchronization - snapshots and incremental updates.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TRPCError } from "@trpc/server";

export const syncRouter = router({
  /**
   * Get the latest snapshot for a vault.
   *
   * Returns the full encrypted CRDT state.
   */
  getSnapshot: protectedProcedure
    .input(z.object({ vaultId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify membership
      const { data: membership, error: memberError } = await supabase
        .from("vault_memberships")
        .select("vault_id")
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (memberError || !membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found or access denied",
        });
      }

      // Get latest snapshot
      const { data: snapshot, error: snapshotError } = await supabase
        .from("vault_snapshots")
        .select("id, encrypted_data, version_vector, created_at")
        .eq("vault_id", input.vaultId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (snapshotError) {
        if (snapshotError.code === "PGRST116") {
          // No snapshot exists yet
          return null;
        }
        throw new Error(`Failed to get snapshot: ${snapshotError.message}`);
      }

      return snapshot;
    }),

  /**
   * Save a new snapshot for a vault.
   *
   * Called periodically to compact incremental updates.
   */
  saveSnapshot: protectedProcedure
    .input(
      z.object({
        vaultId: z.string().uuid(),
        encryptedData: z.string(), // Base64 encrypted CRDT export
        versionVector: z.string(), // Base64 encoded version vector
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify membership
      const { data: membership, error: memberError } = await supabase
        .from("vault_memberships")
        .select("vault_id")
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (memberError || !membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found or access denied",
        });
      }

      // Insert snapshot
      const { data: snapshot, error: insertError } = await supabase
        .from("vault_snapshots")
        .insert({
          vault_id: input.vaultId,
          encrypted_data: input.encryptedData,
          version_vector: input.versionVector,
          created_by: ctx.pubkeyHash,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Failed to save snapshot: ${insertError.message}`);
      }

      return { snapshotId: snapshot.id };
    }),

  /**
   * Get incremental updates since a version.
   *
   * Used for syncing changes between clients.
   */
  getUpdates: protectedProcedure
    .input(
      z.object({
        vaultId: z.string().uuid(),
        sinceVersion: z.string().optional(), // Base64 version vector
        limit: z.number().min(1).max(1000).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify membership
      const { data: membership, error: memberError } = await supabase
        .from("vault_memberships")
        .select("vault_id")
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (memberError || !membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found or access denied",
        });
      }

      // Build query - get updates ordered by sequence
      let query = supabase
        .from("vault_updates")
        .select("id, encrypted_data, version_vector, seq, created_at, created_by")
        .eq("vault_id", input.vaultId)
        .order("seq", { ascending: true })
        .limit(input.limit);

      // If we have a version, get updates after it
      // Note: This is a simplified approach. In production, you'd compare
      // version vectors properly to only get truly new updates.
      if (input.sinceVersion) {
        // For now, we use sequence numbers which are monotonic
        // A more sophisticated approach would decode and compare version vectors
      }

      const { data: updates, error: updatesError } = await query;

      if (updatesError) {
        throw new Error(`Failed to get updates: ${updatesError.message}`);
      }

      return updates;
    }),

  /**
   * Push an incremental update to a vault.
   *
   * Called when a client makes local changes.
   */
  pushUpdate: protectedProcedure
    .input(
      z.object({
        vaultId: z.string().uuid(),
        encryptedData: z.string(), // Base64 encrypted CRDT update
        versionVector: z.string(), // Base64 encoded version vector
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify membership
      const { data: membership, error: memberError } = await supabase
        .from("vault_memberships")
        .select("vault_id")
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (memberError || !membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found or access denied",
        });
      }

      // Insert update (seq is auto-generated)
      const { data: update, error: insertError } = await supabase
        .from("vault_updates")
        .insert({
          vault_id: input.vaultId,
          encrypted_data: input.encryptedData,
          version_vector: input.versionVector,
          created_by: ctx.pubkeyHash,
        })
        .select("id, seq")
        .single();

      if (insertError) {
        throw new Error(`Failed to push update: ${insertError.message}`);
      }

      return { updateId: update.id, seq: update.seq };
    }),

  /**
   * Get current sync status for a vault.
   *
   * Returns info about latest snapshot and update count.
   */
  status: protectedProcedure
    .input(z.object({ vaultId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = await createSupabaseServer();

      // Verify membership
      const { data: membership, error: memberError } = await supabase
        .from("vault_memberships")
        .select("vault_id")
        .eq("vault_id", input.vaultId)
        .eq("pubkey_hash", ctx.pubkeyHash)
        .single();

      if (memberError || !membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vault not found or access denied",
        });
      }

      // Get latest snapshot info
      const { data: snapshot } = await supabase
        .from("vault_snapshots")
        .select("id, version_vector, created_at")
        .eq("vault_id", input.vaultId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Count updates since snapshot
      let updateCount = 0;
      if (snapshot) {
        const { count } = await supabase
          .from("vault_updates")
          .select("*", { count: "exact", head: true })
          .eq("vault_id", input.vaultId)
          .gt("created_at", snapshot.created_at);
        updateCount = count ?? 0;
      } else {
        const { count } = await supabase
          .from("vault_updates")
          .select("*", { count: "exact", head: true })
          .eq("vault_id", input.vaultId);
        updateCount = count ?? 0;
      }

      return {
        hasSnapshot: !!snapshot,
        latestSnapshotId: snapshot?.id ?? null,
        latestSnapshotVersion: snapshot?.version_vector ?? null,
        latestSnapshotAt: snapshot?.created_at ?? null,
        pendingUpdateCount: updateCount,
      };
    }),
});
