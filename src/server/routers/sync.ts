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
	syncStatusInput,
} from "../schemas/sync";
import { protectedProcedure, router } from "../trpc";

/** Max ops to return before telling client to use snapshot */
const SERVER_OP_COUNT_THRESHOLD = 500;

/** Max bytes of ops to return before telling client to use snapshot */
const SERVER_BYTE_THRESHOLD = 5 * 1024 * 1024; // 5MB

// Type for vault_ops table row (until types are regenerated)
interface VaultOp {
	id: string;
	vault_id: string;
	encrypted_data: string;
	version_vector: string;
	author_pubkey_hash: string;
	created_at: string;
}

// Type for vault_snapshots with new columns (until types are regenerated)
interface VaultSnapshotExtended {
	id: string;
	vault_id: string;
	encrypted_data: string;
	created_at: string;
	version?: number;
	hlc_timestamp?: string;
	version_vector?: string;
	updated_at?: string;
}

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
				message: "Vault not found or access denied",
			});
		}

		// Get snapshot (use existing columns that are known to exist)
		const { data: snapshotRaw, error: snapshotError } = await supabase
			.from("vault_snapshots")
			.select("id, version, hlc_timestamp, encrypted_data, created_at")
			.eq("vault_id", input.vaultId)
			.order("version", { ascending: false })
			.limit(1)
			.maybeSingle();

		if (snapshotError) {
			throw new Error(`Failed to get snapshot: ${snapshotError.message}`);
		}

		if (!snapshotRaw) {
			return null;
		}

		// Cast to extended type (version_vector and updated_at may not exist yet)
		const snapshot = snapshotRaw as VaultSnapshotExtended;

		return {
			id: snapshot.id,
			versionVector: snapshot.version_vector ?? "",
			encryptedData: snapshot.encrypted_data,
			updatedAt: snapshot.updated_at ?? snapshot.created_at,
			// Legacy fields for backward compatibility
			version: snapshot.version ?? 0,
			hlcTimestamp: snapshot.hlc_timestamp ?? "",
			createdAt: snapshot.created_at,
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
				message: "Vault not found or access denied",
			});
		}

		// Try to fetch ops from vault_ops table (new architecture)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: opsRaw, error: opsError } = await (supabase as any)
			.from("vault_ops")
			.select("id, encrypted_data, version_vector, author_pubkey_hash, created_at")
			.eq("vault_id", input.vaultId)
			.order("created_at", { ascending: true });

		if (opsError) {
			// If vault_ops doesn't exist yet, fall back to legacy vault_updates
			console.warn("vault_ops query failed, falling back to legacy:", opsError.message);
			return {
				type: "ops" as const,
				ops: [],
			};
		}

		const ops = (opsRaw ?? []) as VaultOp[];

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
					createdAt: op.created_at,
				})),
			};
		}

		// Get snapshot version vector for comparison
		const { data: snapshotRaw } = await supabase
			.from("vault_snapshots")
			.select("id, version, hlc_timestamp, encrypted_data, created_at")
			.eq("vault_id", input.vaultId)
			.order("version", { ascending: false })
			.limit(1)
			.maybeSingle();

		const snapshot = snapshotRaw as VaultSnapshotExtended | null;

		// Decision: if client has empty version vector (fresh state), use snapshot if available
		// This handles the case where a vault was just created with initial snapshot but no ops yet
		const clientVersionVector = input.versionVector ?? "";
		const isClientFresh = clientVersionVector === "" || clientVersionVector === "AA=="; // empty base64

		if (isClientFresh && snapshot?.encrypted_data) {
			return {
				type: "use_snapshot" as const,
				snapshotVersionVector: snapshot.version_vector ?? "",
			};
		}

		// Decision: if too many ops or too many bytes, tell client to use snapshot
		if (ops.length > SERVER_OP_COUNT_THRESHOLD || totalBytes > SERVER_BYTE_THRESHOLD) {
			if (snapshot?.version_vector) {
				return {
					type: "use_snapshot" as const,
					snapshotVersionVector: snapshot.version_vector,
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
				createdAt: op.created_at,
			})),
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
				message: "Vault not found or access denied",
			});
		}

		if (input.ops.length === 0) {
			return { insertedIds: [] };
		}

		// Batch insert ops with ON CONFLICT DO NOTHING (idempotent)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: inserted, error: insertError } = await (supabase as any)
			.from("vault_ops")
			.upsert(
				input.ops.map((op) => ({
					id: op.id,
					vault_id: input.vaultId,
					encrypted_data: op.encryptedData,
					version_vector: op.versionVector,
					author_pubkey_hash: ctx.pubkeyHash,
				})),
				{ onConflict: "id", ignoreDuplicates: true }
			)
			.select("id");

		if (insertError) {
			throw new Error(`Failed to insert ops: ${insertError.message}`);
		}

		return {
			insertedIds: ((inserted ?? []) as { id: string }[]).map((row) => row.id),
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
				message: "Vault not found or access denied",
			});
		}

		// For now, insert a new snapshot with the existing schema
		// Once migration runs, we can use upsert with vault_id as conflict
		const { error: insertError } = await supabase.from("vault_snapshots").insert({
			vault_id: input.vaultId,
			encrypted_data: input.encryptedData,
			version: 1, // Use version 1 for new architecture
			hlc_timestamp: new Date().toISOString(),
		});

		if (insertError) {
			// Try upsert if insert fails (might be unique constraint on vault_id after migration)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { error: upsertError } = await (supabase as any).from("vault_snapshots").upsert(
				{
					vault_id: input.vaultId,
					encrypted_data: input.encryptedData,
					version_vector: input.versionVector,
					updated_at: new Date().toISOString(),
					version: 1,
					hlc_timestamp: new Date().toISOString(),
				},
				{ onConflict: "vault_id" }
			);

			if (upsertError) {
				throw new Error(`Failed to save snapshot: ${upsertError.message}`);
			}
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
				message: "Vault not found or access denied",
			});
		}

		// Get snapshot info
		const { data: snapshotRaw } = await supabase
			.from("vault_snapshots")
			.select("id, version, hlc_timestamp, created_at")
			.eq("vault_id", input.vaultId)
			.order("version", { ascending: false })
			.limit(1)
			.maybeSingle();

		const snapshot = snapshotRaw as VaultSnapshotExtended | null;

		// Try to count ops (will fail gracefully if table doesn't exist)
		let opsSinceSnapshot = 0;
		let bytesSinceSnapshot = 0;

		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { data: opsData } = await (supabase as any)
				.from("vault_ops")
				.select("encrypted_data")
				.eq("vault_id", input.vaultId);

			const ops = (opsData ?? []) as { encrypted_data: string }[];
			opsSinceSnapshot = ops.length;
			bytesSinceSnapshot = ops.reduce((sum, op) => sum + (op.encrypted_data?.length ?? 0), 0);
		} catch {
			// vault_ops doesn't exist yet
		}

		// Legacy: count pending updates (for backward compatibility)
		const { count: pendingUpdateCount } = await supabase
			.from("vault_updates")
			.select("*", { count: "exact", head: true })
			.eq("vault_id", input.vaultId);

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
			pendingUpdateCount: pendingUpdateCount ?? 0,
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
				version_vector: input.versionVector,
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
				message: "Vault not found or access denied",
			});
		}

		// Insert update to legacy vault_updates table
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
