/**
 * IndexedDB Persistence Layer
 *
 * Local cache for vault ops and snapshots. Mirrors server structure
 * with additional `pushed` flag to track sync status.
 *
 * Design decisions:
 * - Immediate writes on local changes (crash safety)
 * - Track `pushed` flag to know what needs syncing
 * - Server is source of truth; this is a cache
 */

import { type DBSchema, type IDBPDatabase, openDB } from "idb";

// ============================================
// Types
// ============================================

export interface LocalOp {
	/** Unique ID (UUID) */
	id: string;
	/** Vault this op belongs to */
	vault_id: string;
	/** Loro version vector as JSON string (plaintext for filtering) */
	version_vector: string;
	/** XChaCha20-Poly1305 encrypted op bytes (base64) */
	encrypted_data: string;
	/** Has this op been pushed to server? (0 = false, 1 = true for IndexedDB indexing) */
	pushed: 0 | 1;
	/** Local timestamp when op was created */
	created_at: number;
}

export interface LocalSnapshot {
	/** Vault this snapshot belongs to (also primary key) */
	vault_id: string;
	/** Loro version vector as JSON string */
	version_vector: string;
	/** XChaCha20-Poly1305 encrypted snapshot bytes (base64) */
	encrypted_data: string;
	/** When this snapshot was last updated */
	updated_at: number;
}

export interface SyncMeta {
	/** Key identifier */
	key: string;
	/** Vault ID */
	vault_id: string;
	/** Value (varies by key) */
	value: string | number | boolean;
}

// ============================================
// Database Schema
// ============================================

interface VaultDBSchema extends DBSchema {
	ops: {
		key: string; // op id
		value: LocalOp;
		indexes: {
			"by-vault": string;
			"by-vault-pushed": [string, number]; // [vault_id, pushed ? 1 : 0]
			"by-vault-created": [string, number]; // [vault_id, created_at]
		};
	};
	snapshots: {
		key: string; // vault_id
		value: LocalSnapshot;
	};
	sync_meta: {
		key: string; // compound key: vault_id:key
		value: SyncMeta;
	};
}

// ============================================
// Database Instance
// ============================================

const DB_NAME = "moneyflow-vault";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<VaultDBSchema> | null = null;

/**
 * Get or create the IndexedDB instance
 */
export async function getDB(): Promise<IDBPDatabase<VaultDBSchema>> {
	if (dbInstance) {
		return dbInstance;
	}

	dbInstance = await openDB<VaultDBSchema>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// Ops store
			if (!db.objectStoreNames.contains("ops")) {
				const opsStore = db.createObjectStore("ops", { keyPath: "id" });
				opsStore.createIndex("by-vault", "vault_id");
				opsStore.createIndex("by-vault-pushed", ["vault_id", "pushed"]);
				opsStore.createIndex("by-vault-created", ["vault_id", "created_at"]);
			}

			// Snapshots store (one per vault)
			if (!db.objectStoreNames.contains("snapshots")) {
				db.createObjectStore("snapshots", { keyPath: "vault_id" });
			}

			// Sync metadata store
			if (!db.objectStoreNames.contains("sync_meta")) {
				db.createObjectStore("sync_meta", { keyPath: "key" });
			}
		},
	});

	return dbInstance;
}

/**
 * Close database connection (useful for testing)
 */
export async function closeDB(): Promise<void> {
	if (dbInstance) {
		dbInstance.close();
		dbInstance = null;
	}
}

/**
 * Delete the entire database (useful for testing/reset)
 */
export async function deleteDB(): Promise<void> {
	await closeDB();
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DB_NAME);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// ============================================
// Op Operations
// ============================================

/**
 * Append a new op to IndexedDB (immediate write for crash safety)
 */
export async function appendOp(
	op: Omit<LocalOp, "pushed" | "created_at"> & { pushed?: boolean }
): Promise<void> {
	const db = await getDB();
	const fullOp: LocalOp = {
		...op,
		pushed: op.pushed ? 1 : 0,
		created_at: Date.now(),
	};
	await db.put("ops", fullOp);
}

/**
 * Get all unpushed ops for a vault
 */
export async function getUnpushedOps(vaultId: string): Promise<LocalOp[]> {
	const db = await getDB();
	// Query by compound index [vault_id, pushed=false]
	return db.getAllFromIndex("ops", "by-vault-pushed", [vaultId, 0]);
}

/**
 * Check if vault has any unpushed ops
 */
export async function hasUnpushedOps(vaultId: string): Promise<boolean> {
	const db = await getDB();
	const count = await db.countFromIndex("ops", "by-vault-pushed", [vaultId, 0]);
	return count > 0;
}

/**
 * Mark ops as pushed (after successful server sync)
 */
export async function markOpsPushed(opIds: string[]): Promise<void> {
	const db = await getDB();
	const tx = db.transaction("ops", "readwrite");

	await Promise.all(
		opIds.map(async (id) => {
			const op = await tx.store.get(id);
			if (op && op.pushed === 0) {
				op.pushed = 1;
				await tx.store.put(op);
			}
		})
	);

	await tx.done;
}

/**
 * Get all ops for a vault (for debugging/testing)
 */
export async function getAllOps(vaultId: string): Promise<LocalOp[]> {
	const db = await getDB();
	return db.getAllFromIndex("ops", "by-vault", vaultId);
}

/**
 * Get ops created after a certain timestamp
 */
export async function getOpsSince(vaultId: string, sinceTimestamp: number): Promise<LocalOp[]> {
	const db = await getDB();
	const range = IDBKeyRange.bound([vaultId, sinceTimestamp], [vaultId, Infinity]);
	return db.getAllFromIndex("ops", "by-vault-created", range);
}

/**
 * Count ops since last snapshot (for threshold checks)
 */
export async function countOpsSinceSnapshot(vaultId: string): Promise<{
	count: number;
	bytes: number;
}> {
	const db = await getDB();
	const snapshot = await db.get("snapshots", vaultId);
	const sinceTimestamp = snapshot?.updated_at ?? 0;

	const ops = await getOpsSince(vaultId, sinceTimestamp);

	return {
		count: ops.length,
		bytes: ops.reduce((sum, op) => sum + op.encrypted_data.length, 0),
	};
}

/**
 * Delete all ops for a vault (used when replacing with fresh snapshot)
 */
export async function clearOps(vaultId: string): Promise<void> {
	const db = await getDB();
	const tx = db.transaction("ops", "readwrite");
	const index = tx.store.index("by-vault");

	let cursor = await index.openCursor(vaultId);
	while (cursor) {
		await cursor.delete();
		cursor = await cursor.continue();
	}

	await tx.done;
}

// ============================================
// Snapshot Operations
// ============================================

/**
 * Save or update local snapshot for a vault
 */
export async function saveLocalSnapshot(
	snapshot: Omit<LocalSnapshot, "updated_at">
): Promise<void> {
	const db = await getDB();
	const fullSnapshot: LocalSnapshot = {
		...snapshot,
		updated_at: Date.now(),
	};
	await db.put("snapshots", fullSnapshot);
}

/**
 * Load local snapshot for a vault
 */
export async function loadLocalSnapshot(vaultId: string): Promise<LocalSnapshot | undefined> {
	const db = await getDB();
	return db.get("snapshots", vaultId);
}

/**
 * Delete local snapshot for a vault
 */
export async function deleteLocalSnapshot(vaultId: string): Promise<void> {
	const db = await getDB();
	await db.delete("snapshots", vaultId);
}

// ============================================
// Sync Metadata Operations
// ============================================

/**
 * Set sync metadata value
 */
export async function setSyncMeta(
	vaultId: string,
	key: string,
	value: string | number | boolean
): Promise<void> {
	const db = await getDB();
	await db.put("sync_meta", {
		key: `${vaultId}:${key}`,
		vault_id: vaultId,
		value,
	});
}

/**
 * Get sync metadata value
 */
export async function getSyncMeta(
	vaultId: string,
	key: string
): Promise<string | number | boolean | undefined> {
	const db = await getDB();
	const meta = await db.get("sync_meta", `${vaultId}:${key}`);
	return meta?.value;
}

/**
 * Delete sync metadata for a vault
 */
export async function clearSyncMeta(vaultId: string): Promise<void> {
	const db = await getDB();
	const tx = db.transaction("sync_meta", "readwrite");

	let cursor = await tx.store.openCursor();
	while (cursor) {
		if (cursor.value.vault_id === vaultId) {
			await cursor.delete();
		}
		cursor = await cursor.continue();
	}

	await tx.done;
}

// ============================================
// Vault Cleanup
// ============================================

/**
 * Clear all local data for a vault
 */
export async function clearVaultData(vaultId: string): Promise<void> {
	await Promise.all([clearOps(vaultId), deleteLocalSnapshot(vaultId), clearSyncMeta(vaultId)]);
}
