/**
 * Sync Zod Schemas
 *
 * Input/output schemas for CRDT sync-related tRPC procedures.
 * These schemas are used for:
 * - Runtime validation of API inputs
 * - TypeScript type inference
 * - Client-side form validation (shared schemas)
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
 * HLC (Hybrid Logical Clock) timestamp string
 * Format: "<wall_time>:<counter>:<node_id>"
 */
export const hlcTimestampSchema = z.string().min(1, "HLC timestamp required");

/**
 * Snapshot version number (positive integer)
 */
export const versionSchema = z.number().int().nonnegative();

// ============================================================================
// Get Snapshot
// ============================================================================

export const getSnapshotInput = z.object({
  vaultId: vaultIdSchema,
});

export type GetSnapshotInput = z.infer<typeof getSnapshotInput>;

export const snapshotSchema = z.object({
  id: z.string().uuid(),
  version: versionSchema,
  hlcTimestamp: hlcTimestampSchema,
  encryptedData: encryptedDataSchema,
  createdAt: z.string(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

export const getSnapshotOutput = snapshotSchema.nullable();

export type GetSnapshotOutput = z.infer<typeof getSnapshotOutput>;

// ============================================================================
// Save Snapshot
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
// Get Updates
// ============================================================================

export const getUpdatesInput = z.object({
  vaultId: vaultIdSchema,
  sinceSnapshotVersion: versionSchema.optional(),
  limit: z.number().min(1).max(1000).default(100),
});

export type GetUpdatesInput = z.infer<typeof getUpdatesInput>;

export const updateSchema = z.object({
  id: z.string().uuid(),
  encryptedData: encryptedDataSchema,
  baseSnapshotVersion: versionSchema,
  hlcTimestamp: hlcTimestampSchema,
  authorPubkeyHash: z.string(),
  createdAt: z.string(),
});

export type Update = z.infer<typeof updateSchema>;

export const getUpdatesOutput = z.array(updateSchema);

export type GetUpdatesOutput = z.infer<typeof getUpdatesOutput>;

// ============================================================================
// Push Update
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
// Sync Status
// ============================================================================

export const syncStatusInput = z.object({
  vaultId: vaultIdSchema,
});

export type SyncStatusInput = z.infer<typeof syncStatusInput>;

export const syncStatusOutput = z.object({
  hasSnapshot: z.boolean(),
  latestSnapshotId: z.string().uuid().nullable(),
  latestSnapshotVersion: versionSchema.nullable(),
  latestSnapshotHlc: hlcTimestampSchema.nullable(),
  latestSnapshotAt: z.string().nullable(),
  pendingUpdateCount: z.number().int().nonnegative(),
});

export type SyncStatusOutput = z.infer<typeof syncStatusOutput>;
