/**
 * Sync Zod Schemas
 *
 * Input/output schemas for CRDT sync-related tRPC procedures.
 *
 * New architecture:
 * - vault_ops: stores ALL ops forever (server source of truth)
 * - vault_snapshots: latest shallow snapshot per vault (fast cold start)
 * - Version vectors used instead of integer versions
 */

import { z } from "zod";

// ============================================================================
// Base Schemas (reusable primitives)
// ============================================================================

/**
 * UUID v4 format for vault IDs
 */
export const vaultIdSchema = z.string().uuid("Must be a valid UUID");

/**
 * Base64-encoded encrypted data blob
 */
export const encryptedDataSchema = z
  .string()
  .min(1, "Encrypted data cannot be empty")
  .refine(
    (val) => {
      try {
        atob(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be valid base64" }
  );

/**
 * Version vector as JSON string
 * Loro's version vector serialized to JSON for server-side filtering
 */
export const versionVectorSchema = z.string().min(1, "Version vector required");

/**
 * HLC (Hybrid Logical Clock) timestamp string - DEPRECATED
 * Kept for backward compatibility during migration
 * Format: "<wall_time>:<counter>:<node_id>"
 */
export const hlcTimestampSchema = z.string().min(1, "HLC timestamp required");

/**
 * Snapshot version number (positive integer) - DEPRECATED
 * Kept for backward compatibility during migration
 */
export const versionSchema = z.number().int().nonnegative();

// ============================================================================
// Get Snapshot (Updated for new architecture)
// ============================================================================

export const getSnapshotInput = z.object({
  vaultId: vaultIdSchema,
});

export type GetSnapshotInput = z.infer<typeof getSnapshotInput>;

export const snapshotSchema = z.object({
  id: z.string().uuid(),
  versionVector: versionVectorSchema,
  encryptedData: encryptedDataSchema,
  updatedAt: z.string(),
  // Legacy fields for backward compatibility
  version: versionSchema.optional(),
  hlcTimestamp: hlcTimestampSchema.optional(),
  createdAt: z.string().optional(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

export const getSnapshotOutput = snapshotSchema.nullable();

export type GetSnapshotOutput = z.infer<typeof getSnapshotOutput>;

// ============================================================================
// Push Snapshot (Client creates and uploads when threshold exceeded)
// ============================================================================

export const pushSnapshotInput = z.object({
  vaultId: vaultIdSchema,
  encryptedData: encryptedDataSchema,
  versionVector: versionVectorSchema,
});

export type PushSnapshotInput = z.infer<typeof pushSnapshotInput>;

export const pushSnapshotOutput = z.object({
  success: z.boolean(),
});

export type PushSnapshotOutput = z.infer<typeof pushSnapshotOutput>;

// ============================================================================
// Save Snapshot (DEPRECATED - use pushSnapshot)
// ============================================================================

export const saveSnapshotInput = z.object({
  vaultId: vaultIdSchema,
  encryptedData: encryptedDataSchema,
  version: z.number().int().positive(),
  hlcTimestamp: hlcTimestampSchema,
});

export type SaveSnapshotInput = z.infer<typeof saveSnapshotInput>;

export const saveSnapshotOutput = z.object({
  snapshotId: z.string().uuid(),
});

export type SaveSnapshotOutput = z.infer<typeof saveSnapshotOutput>;

// ============================================================================
// Get Updates (Updated: server decides ops vs snapshot)
// ============================================================================

export const getUpdatesInput = z.object({
  vaultId: vaultIdSchema,
  /** Client's current version vector (JSON string) */
  versionVector: versionVectorSchema,
  /** Whether client has unpushed local changes */
  hasUnpushed: z.boolean(),
});

export type GetUpdatesInput = z.infer<typeof getUpdatesInput>;

/** Response when server returns ops */
export const opsResponseSchema = z.object({
  type: z.literal("ops"),
  ops: z.array(
    z.object({
      id: z.string().uuid(),
      encryptedData: encryptedDataSchema,
      versionVector: versionVectorSchema,
      authorPubkeyHash: z.string(),
      createdAt: z.string(),
    })
  ),
});

/** Response when server tells client to use snapshot instead */
export const useSnapshotResponseSchema = z.object({
  type: z.literal("use_snapshot"),
  snapshotVersionVector: versionVectorSchema,
});

export const getUpdatesOutput = z.discriminatedUnion("type", [
  opsResponseSchema,
  useSnapshotResponseSchema,
]);

export type GetUpdatesOutput = z.infer<typeof getUpdatesOutput>;

// ============================================================================
// Push Ops (Batch insert ops to server)
// ============================================================================

export const pushOpsInput = z.object({
  vaultId: vaultIdSchema,
  ops: z.array(
    z.object({
      id: z.string().uuid(),
      encryptedData: encryptedDataSchema,
      versionVector: versionVectorSchema,
    })
  ),
});

export type PushOpsInput = z.infer<typeof pushOpsInput>;

export const pushOpsOutput = z.object({
  /** IDs of ops successfully inserted */
  insertedIds: z.array(z.string().uuid()),
});

export type PushOpsOutput = z.infer<typeof pushOpsOutput>;

// ============================================================================
// Push Update (DEPRECATED - use pushOps for batch insert)
// ============================================================================

export const pushUpdateInput = z.object({
  vaultId: vaultIdSchema,
  encryptedData: encryptedDataSchema,
  baseSnapshotVersion: versionSchema,
  hlcTimestamp: hlcTimestampSchema,
});

export type PushUpdateInput = z.infer<typeof pushUpdateInput>;

export const pushUpdateOutput = z.object({
  updateId: z.string().uuid(),
});

export type PushUpdateOutput = z.infer<typeof pushUpdateOutput>;

// ============================================================================
// Sync Status (Updated for new architecture)
// ============================================================================

export const syncStatusInput = z.object({
  vaultId: vaultIdSchema,
});

export type SyncStatusInput = z.infer<typeof syncStatusInput>;

export const syncStatusOutput = z.object({
  hasSnapshot: z.boolean(),
  snapshotVersionVector: versionVectorSchema.nullable(),
  snapshotUpdatedAt: z.string().nullable(),
  /** Number of ops since last snapshot */
  opsSinceSnapshot: z.number().int().nonnegative(),
  /** Total bytes of ops since last snapshot */
  bytesSinceSnapshot: z.number().int().nonnegative(),
  // Legacy fields
  latestSnapshotId: z.string().uuid().nullable(),
  latestSnapshotVersion: versionSchema.nullable(),
  latestSnapshotHlc: hlcTimestampSchema.nullable(),
  latestSnapshotAt: z.string().nullable(),
  pendingUpdateCount: z.number().int().nonnegative(),
});

export type SyncStatusOutput = z.infer<typeof syncStatusOutput>;
