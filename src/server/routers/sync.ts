/**
 * Sync Router
 *
 * Handles CRDT synchronization with the new vault persistence architecture.
 *
 * New architecture (Phase 6a):
 * - vault_ops: ALL ops stored forever (server source of truth)
 * - vault_snapshots: latest shallow snapshot per vault (fast cold start)
 * - Server decides whether to return ops or tell client to use snapshot
 * - Client creates snapshots (server can't decrypt)
 *
 * Schema:
 * - vault_ops: id, vault_id, version_vector, encrypted_data, author_pubkey_hash, created_at
 * - vault_snapshots: id, vault_id, version_vector, encrypted_data, updated_at (unique per vault)
 *
 * NOTE: Until database migration is run and types regenerated, some queries use
 * explicit type assertions. Run `pnpm supabase gen types` after migration.
 */

import { TRPCError } from "@trpc/server";

import { createSupabaseClient } from "@/lib/supabase/server";

import {
    getSnapshotInput,
    getUpdatesInput,
    pushOpsInput,
    pushSnapshotInput,
    pushUpdateInput,
    saveSnapshotInput,
    syncStatusInput
} from "../schemas/sync";
import { protectedProcedure, router } from "../trpc";

/** Max ops to return before telling client to use snapshot */
const SERVER_OP_COUNT_THRESHOLD = 500;

/** Max bytes of ops to return before telling client to use snapshot */
const SERVER_BYTE_THRESHOLD = 5 * 1024 * 1024; // 5MB

export const syncRouter = router({
    /**
     * Get the latest snapshot for a vault.
     *
     * Returns the full encrypted CRDT state with version vector.
     */
    getSnapshot: protectedProcedure.input(getSnapshotInput).query(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        // Get snapshot (use existing columns that are known to exist)
        const { data: snapshotRaw, error: snapshotError } = await supabase
            .from("vault_snapshots")
            .select(
                "id, version, hlc_timestamp, encrypted_data, created_at, version_vector, updated_at"
            )
            .eq("vault_id", input.vaultId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (snapshotError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to load synchronization snapshot"
            });
        }

        if (!snapshotRaw) {
            return null;
        }

        return {
            id: snapshotRaw.id,
            versionVector: snapshotRaw.version_vector,
            encryptedData: snapshotRaw.encrypted_data,
            updatedAt: snapshotRaw.updated_at,
            // Legacy fields for backward compatibility
            version: snapshotRaw.version,
            hlcTimestamp: snapshotRaw.hlc_timestamp,
            createdAt: snapshotRaw.created_at
        };
    }),

    /**
     * Get updates since client's version vector.
     *
     * Server decides: return ops OR tell client to use snapshot.
     *
     * Decision logic:
     * 1. If hasUnpushed=true, MUST return ops (client needs to merge)
     * 2. If ops count > threshold OR ops bytes > threshold, return use_snapshot
     * 3. Otherwise, return ops
     */
    getUpdates: protectedProcedure.input(getUpdatesInput).query(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        const { data: ops, error: opsError } = await supabase
            .from("vault_ops")
            .select("id, encrypted_data, version_vector, author_pubkey_hash, created_at")
            .eq("vault_id", input.vaultId)
            .order("created_at", { ascending: true });

        if (opsError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to load synchronization data"
            });
        }

        // Calculate total bytes
        const totalBytes = ops.reduce((sum, op) => sum + (op.encrypted_data?.length ?? 0), 0);

        // Decision: if client has unpushed changes, MUST return ops
        if (input.hasUnpushed) {
            return {
                type: "ops" as const,
                ops: ops.map((op) => ({
                    id: op.id,
                    encryptedData: op.encrypted_data,
                    versionVector: op.version_vector,
                    authorPubkeyHash: op.author_pubkey_hash,
                    createdAt: op.created_at
                }))
            };
        }

        // Get snapshot version vector for comparison
        const { data: snapshotRaw } = await supabase
            .from("vault_snapshots")
            .select("id, encrypted_data, version_vector, updated_at")
            .eq("vault_id", input.vaultId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

        // Decision: if client has empty version vector (fresh state), use snapshot if available
        // This handles the case where a vault was just created with initial snapshot but no ops yet
        const clientVersionVector = input.versionVector ?? "";
        const isClientFresh = clientVersionVector === "" || clientVersionVector === "AA=="; // empty base64

        if (isClientFresh && snapshotRaw?.encrypted_data) {
            return {
                type: "use_snapshot" as const,
                snapshotVersionVector: snapshotRaw.version_vector
            };
        }

        // Decision: if too many ops or too many bytes, tell client to use snapshot
        if (ops.length > SERVER_OP_COUNT_THRESHOLD || totalBytes > SERVER_BYTE_THRESHOLD) {
            if (snapshotRaw?.version_vector) {
                return {
                    type: "use_snapshot" as const,
                    snapshotVersionVector: snapshotRaw.version_vector
                };
            }
            // No snapshot yet, must return ops
        }

        // Return ops
        return {
            type: "ops" as const,
            ops: ops.map((op) => ({
                id: op.id,
                encryptedData: op.encrypted_data,
                versionVector: op.version_vector,
                authorPubkeyHash: op.author_pubkey_hash,
                createdAt: op.created_at
            }))
        };
    }),

    /**
     * Push multiple ops to server (batch insert).
     *
     * Ops are stored forever as source of truth.
     * Uses upsert with ON CONFLICT DO NOTHING for idempotency.
     */
    pushOps: protectedProcedure.input(pushOpsInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        if (input.ops.length === 0) {
            return { insertedIds: [] };
        }

        const { data: inserted, error: insertError } = await supabase.rpc("append_vault_ops", {
            p_vault_id: input.vaultId,
            p_author_pubkey_hash: ctx.pubkeyHash,
            p_ops: input.ops.map((op) => ({
                id: op.id,
                encrypted_data: op.encryptedData,
                version_vector: op.versionVector
            }))
        });

        if (insertError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to save synchronization operations"
            });
        }

        return {
            insertedIds: inserted ?? []
        };
    }),

    /**
     * Push a new snapshot (client creates when threshold exceeded).
     *
     * Uses UPSERT since there's only one snapshot per vault.
     */
    pushSnapshot: protectedProcedure.input(pushSnapshotInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        const now = new Date().toISOString();
        const { error: upsertError } = await supabase.from("vault_snapshots").upsert(
            {
                vault_id: input.vaultId,
                encrypted_data: input.encryptedData,
                version_vector: input.versionVector,
                updated_at: now,
                version: 1,
                hlc_timestamp: now
            },
            { onConflict: "vault_id" }
        );

        if (upsertError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to save synchronization snapshot"
            });
        }

        return { success: true };
    }),

    /**
     * Get current sync status for a vault.
     *
     * Returns info about snapshot, ops count, and bytes for UI display.
     */
    getSyncStatus: protectedProcedure.input(syncStatusInput).query(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        // Get snapshot info
        const { data: snapshotRaw } = await supabase
            .from("vault_snapshots")
            .select("id, version, hlc_timestamp, created_at, version_vector, updated_at")
            .eq("vault_id", input.vaultId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

        const snapshot = snapshotRaw;

        const { data: ops, error: opsError } = await supabase
            .from("vault_ops")
            .select("encrypted_data")
            .eq("vault_id", input.vaultId);

        if (opsError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to load synchronization status"
            });
        }

        const opsSinceSnapshot = (ops ?? []).length;
        const bytesSinceSnapshot = (ops ?? []).reduce(
            (sum, op) => sum + op.encrypted_data.length,
            0
        );

        return {
            hasSnapshot: !!snapshot,
            snapshotVersionVector: snapshot?.version_vector ?? null,
            snapshotUpdatedAt: snapshot?.updated_at ?? snapshot?.created_at ?? null,
            opsSinceSnapshot,
            bytesSinceSnapshot,
            // Legacy fields
            latestSnapshotId: snapshot?.id ?? null,
            latestSnapshotVersion: snapshot?.version ?? null,
            latestSnapshotHlc: snapshot?.hlc_timestamp ?? null,
            latestSnapshotAt: snapshot?.created_at ?? null,
            pendingUpdateCount: opsSinceSnapshot
        };
    }),

    // =========================================================================
    // DEPRECATED PROCEDURES - kept for backward compatibility
    // =========================================================================

    /**
     * @deprecated Use pushSnapshot for new code
     * Save a new snapshot (legacy version-based)
     */
    saveSnapshot: protectedProcedure.input(saveSnapshotInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        const now = new Date().toISOString();
        const { data: snapshot, error: insertError } = await supabase
            .from("vault_snapshots")
            .upsert(
                {
                    vault_id: input.vaultId,
                    encrypted_data: input.encryptedData,
                    version: input.version,
                    hlc_timestamp: input.hlcTimestamp,
                    version_vector: input.versionVector,
                    updated_at: now
                },
                { onConflict: "vault_id" }
            )
            .select("id")
            .single();

        if (insertError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to save synchronization snapshot"
            });
        }

        return { snapshotId: snapshot.id };
    }),

    /**
     * @deprecated Use pushOps for new code
     * Push single update (legacy version-based)
     */
    pushUpdate: protectedProcedure.input(pushUpdateInput).mutation(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
            });
        }

        const updateId = crypto.randomUUID();
        const { error: insertError } = await supabase.rpc("append_vault_ops", {
            p_vault_id: input.vaultId,
            p_author_pubkey_hash: ctx.pubkeyHash,
            p_ops: [
                {
                    id: updateId,
                    encrypted_data: input.encryptedData,
                    version_vector: input.hlcTimestamp
                }
            ]
        });

        if (insertError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to save synchronization operation"
            });
        }

        return { updateId };
    }),

    /**
     * @deprecated Use getSyncStatus for new code
     * Legacy status endpoint
     */
    status: protectedProcedure.input(syncStatusInput).query(async ({ ctx, input }) => {
        const supabase = await createSupabaseClient();

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
                message: "Vault not found or access denied"
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

        const { count: updateCount, error: countError } = await supabase
            .from("vault_ops")
            .select("*", { count: "exact", head: true })
            .eq("vault_id", input.vaultId);

        if (countError) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to load synchronization status"
            });
        }

        return {
            hasSnapshot: !!snapshot,
            latestSnapshotId: snapshot?.id ?? null,
            latestSnapshotVersion: snapshot?.version ?? null,
            latestSnapshotHlc: snapshot?.hlc_timestamp ?? null,
            latestSnapshotAt: snapshot?.created_at ?? null,
            pendingUpdateCount: updateCount ?? 0
        };
    })
});
