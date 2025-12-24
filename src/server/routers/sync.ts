/**
 * Sync Router
 *
 * Handles CRDT synchronization - snapshots and incremental updates.
 * 
 * Schema uses:
 * - vault_snapshots: version (integer), hlc_timestamp (HLC for ordering)
 * - vault_updates: base_snapshot_version, hlc_timestamp, author_pubkey_hash
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

      // Get latest snapshot by version (highest version = latest)
      const { data: snapshot, error: snapshotError } = await supabase
        .from("vault_snapshots")
        .select("id, version, hlc_timestamp, encrypted_data, created_at")
        .eq("vault_id", input.vaultId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (snapshotError) {
        if (snapshotError.code === "PGRST116") {
          // No snapshot exists yet
          return null;
        }
        throw new Error(`Failed to get snapshot: ${snapshotError.message}`);
      }

      return {
        id: snapshot.id,
        version: snapshot.version,
        hlcTimestamp: snapshot.hlc_timestamp,
        encryptedData: snapshot.encrypted_data,
        createdAt: snapshot.created_at,
      };
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
        version: z.number().int().positive(), // Snapshot version number
        hlcTimestamp: z.string(), // HLC timestamp for ordering
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
          version: input.version,
          hlc_timestamp: input.hlcTimestamp,
        })
        .select("id")
        .single();

      if (insertError) {
        // Version conflict - snapshot with this version already exists
        if (insertError.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Snapshot version already exists",
          });
        }
        throw new Error(`Failed to save snapshot: ${insertError.message}`);
      }

      return { snapshotId: snapshot.id };
    }),

  /**
   * Get incremental updates since a snapshot version.
   *
   * Used for syncing changes between clients.
   */
  getUpdates: protectedProcedure
    .input(
      z.object({
        vaultId: z.string().uuid(),
        sinceSnapshotVersion: z.number().int().optional(), // Get updates since this snapshot
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

      // Build query - get updates ordered by HLC timestamp
      let query = supabase
        .from("vault_updates")
        .select("id, encrypted_data, base_snapshot_version, hlc_timestamp, author_pubkey_hash, created_at")
        .eq("vault_id", input.vaultId)
        .order("hlc_timestamp", { ascending: true })
        .limit(input.limit);

      // Filter by base snapshot version if provided
      if (input.sinceSnapshotVersion !== undefined) {
        query = query.gte("base_snapshot_version", input.sinceSnapshotVersion);
      }

      const { data: updates, error: updatesError } = await query;

      if (updatesError) {
        throw new Error(`Failed to get updates: ${updatesError.message}`);
      }

      return (updates ?? []).map((update) => ({
        id: update.id,
        encryptedData: update.encrypted_data,
        baseSnapshotVersion: update.base_snapshot_version,
        hlcTimestamp: update.hlc_timestamp,
        authorPubkeyHash: update.author_pubkey_hash,
        createdAt: update.created_at,
      }));
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
        baseSnapshotVersion: z.number().int(), // The snapshot this update is based on
        hlcTimestamp: z.string(), // HLC timestamp for ordering
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

      // Insert update
      const { data: update, error: insertError } = await supabase
        .from("vault_updates")
        .insert({
          vault_id: input.vaultId,
          encrypted_data: input.encryptedData,
          base_snapshot_version: input.baseSnapshotVersion,
          hlc_timestamp: input.hlcTimestamp,
          author_pubkey_hash: ctx.pubkeyHash,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Failed to push update: ${insertError.message}`);
      }

      return { updateId: update.id };
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
        .select("id, version, hlc_timestamp, created_at")
        .eq("vault_id", input.vaultId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      // Count updates since snapshot
      let updateCount = 0;
      if (snapshot) {
        const { count } = await supabase
          .from("vault_updates")
          .select("*", { count: "exact", head: true })
          .eq("vault_id", input.vaultId)
          .gte("base_snapshot_version", snapshot.version);
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
        latestSnapshotVersion: snapshot?.version ?? null,
        latestSnapshotHlc: snapshot?.hlc_timestamp ?? null,
        latestSnapshotAt: snapshot?.created_at ?? null,
        pendingUpdateCount: updateCount,
      };
    }),
});
