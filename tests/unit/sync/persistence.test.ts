/**
 * Tests for IndexedDB Persistence Layer
 *
 * Tests local storage operations for vault ops and snapshots.
 * Uses fake-indexeddb for browser-like IndexedDB in Node.js.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import {
	appendOp,
	clearOps,
	clearSyncMeta,
	clearVaultData,
	closeDB,
	countOpsSinceSnapshot,
	deleteDB,
	deleteLocalSnapshot,
	getAllOps,
	getDB,
	getOpsSince,
	getSyncMeta,
	getUnpushedOps,
	hasUnpushedOps,
	loadLocalSnapshot,
	markOpsPushed,
	saveLocalSnapshot,
	setSyncMeta,
} from "@/lib/sync/persistence";

// Reset database between tests
beforeEach(async () => {
	await deleteDB();
});

afterEach(async () => {
	await closeDB();
});

// ============================================
// Database Tests
// ============================================

describe("getDB", () => {
	it("creates database with correct stores", async () => {
		const db = await getDB();

		expect(db.objectStoreNames).toContain("ops");
		expect(db.objectStoreNames).toContain("snapshots");
		expect(db.objectStoreNames).toContain("sync_meta");
	});

	it("returns same instance on subsequent calls", async () => {
		const db1 = await getDB();
		const db2 = await getDB();

		expect(db1).toBe(db2);
	});
});

// ============================================
// Op Operations Tests
// ============================================

describe("appendOp", () => {
	it("stores op with auto-generated fields", async () => {
		const vaultId = "vault-123";

		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: '{"peer1": 1}',
			encrypted_data: "base64encodeddata",
		});

		const ops = await getAllOps(vaultId);
		expect(ops).toHaveLength(1);
		expect(ops[0]).toMatchObject({
			id: "op-1",
			vault_id: vaultId,
			version_vector: '{"peer1": 1}',
			encrypted_data: "base64encodeddata",
			pushed: 0, // 0 = false
		});
		expect(ops[0].created_at).toBeGreaterThan(0);
	});

	it("respects explicit pushed flag", async () => {
		await appendOp({
			id: "op-1",
			vault_id: "vault-123",
			version_vector: "{}",
			encrypted_data: "data",
			pushed: true,
		});

		const ops = await getAllOps("vault-123");
		expect(ops[0].pushed).toBe(1); // 1 = true
	});
});

describe("getUnpushedOps", () => {
	it("returns only unpushed ops", async () => {
		const vaultId = "vault-123";

		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data1",
			pushed: false,
		});

		await appendOp({
			id: "op-2",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data2",
			pushed: true,
		});

		await appendOp({
			id: "op-3",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data3",
			pushed: false,
		});

		const unpushed = await getUnpushedOps(vaultId);
		expect(unpushed).toHaveLength(2);
		expect(unpushed.map((o) => o.id)).toEqual(["op-1", "op-3"]);
	});

	it("returns empty array for different vault", async () => {
		await appendOp({
			id: "op-1",
			vault_id: "vault-123",
			version_vector: "{}",
			encrypted_data: "data",
		});

		const unpushed = await getUnpushedOps("vault-456");
		expect(unpushed).toHaveLength(0);
	});
});

describe("hasUnpushedOps", () => {
	it("returns true when unpushed ops exist", async () => {
		await appendOp({
			id: "op-1",
			vault_id: "vault-123",
			version_vector: "{}",
			encrypted_data: "data",
		});

		expect(await hasUnpushedOps("vault-123")).toBe(true);
	});

	it("returns false when all ops are pushed", async () => {
		await appendOp({
			id: "op-1",
			vault_id: "vault-123",
			version_vector: "{}",
			encrypted_data: "data",
			pushed: true,
		});

		expect(await hasUnpushedOps("vault-123")).toBe(false);
	});

	it("returns false for empty vault", async () => {
		expect(await hasUnpushedOps("vault-123")).toBe(false);
	});
});

describe("markOpsPushed", () => {
	it("marks specified ops as pushed", async () => {
		const vaultId = "vault-123";

		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data1",
		});

		await appendOp({
			id: "op-2",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data2",
		});

		await markOpsPushed(["op-1"]);

		const ops = await getAllOps(vaultId);
		const op1 = ops.find((o) => o.id === "op-1");
		const op2 = ops.find((o) => o.id === "op-2");

		expect(op1?.pushed).toBe(1); // 1 = true
		expect(op2?.pushed).toBe(0); // 0 = false
	});

	it("handles non-existent op IDs gracefully", async () => {
		await appendOp({
			id: "op-1",
			vault_id: "vault-123",
			version_vector: "{}",
			encrypted_data: "data",
		});

		// Should not throw
		await markOpsPushed(["op-1", "non-existent"]);

		const ops = await getAllOps("vault-123");
		expect(ops[0].pushed).toBe(1); // 1 = true
	});
});

describe("getOpsSince", () => {
	it("returns ops created after timestamp", async () => {
		const vaultId = "vault-123";

		// Create ops with controlled timestamps
		const now = Date.now();
		vi.setSystemTime(now - 1000);

		await appendOp({
			id: "op-old",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "old",
		});

		vi.setSystemTime(now);

		await appendOp({
			id: "op-new",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "new",
		});

		vi.useRealTimers();

		const ops = await getOpsSince(vaultId, now - 500);
		expect(ops).toHaveLength(1);
		expect(ops[0].id).toBe("op-new");
	});
});

describe("countOpsSinceSnapshot", () => {
	it("counts all ops when no snapshot exists", async () => {
		const vaultId = "vault-123";

		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "12345678",
		});

		await appendOp({
			id: "op-2",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "123456789012",
		});

		const result = await countOpsSinceSnapshot(vaultId);
		expect(result.count).toBe(2);
		expect(result.bytes).toBe(20); // 8 + 12
	});

	it("counts ops after snapshot timestamp", async () => {
		const vaultId = "vault-123";

		// Save snapshot first
		await saveLocalSnapshot({
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "snapshot",
		});

		// Wait a bit then add ops
		await new Promise((resolve) => setTimeout(resolve, 10));

		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "after-snapshot",
		});

		const result = await countOpsSinceSnapshot(vaultId);
		expect(result.count).toBe(1);
	});
});

describe("clearOps", () => {
	it("removes all ops for vault", async () => {
		const vaultId = "vault-123";

		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data",
		});

		await appendOp({
			id: "op-2",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data",
		});

		await clearOps(vaultId);

		const ops = await getAllOps(vaultId);
		expect(ops).toHaveLength(0);
	});

	it("does not affect other vaults", async () => {
		await appendOp({
			id: "op-1",
			vault_id: "vault-123",
			version_vector: "{}",
			encrypted_data: "data",
		});

		await appendOp({
			id: "op-2",
			vault_id: "vault-456",
			version_vector: "{}",
			encrypted_data: "data",
		});

		await clearOps("vault-123");

		const ops123 = await getAllOps("vault-123");
		const ops456 = await getAllOps("vault-456");

		expect(ops123).toHaveLength(0);
		expect(ops456).toHaveLength(1);
	});
});

// ============================================
// Snapshot Operations Tests
// ============================================

describe("saveLocalSnapshot", () => {
	it("saves snapshot with auto timestamp", async () => {
		const vaultId = "vault-123";

		await saveLocalSnapshot({
			vault_id: vaultId,
			version_vector: '{"peer1": 5}',
			encrypted_data: "encrypted-snapshot",
		});

		const snapshot = await loadLocalSnapshot(vaultId);
		expect(snapshot).toMatchObject({
			vault_id: vaultId,
			version_vector: '{"peer1": 5}',
			encrypted_data: "encrypted-snapshot",
		});
		expect(snapshot?.updated_at).toBeGreaterThan(0);
	});

	it("overwrites existing snapshot", async () => {
		const vaultId = "vault-123";

		await saveLocalSnapshot({
			vault_id: vaultId,
			version_vector: '{"peer1": 1}',
			encrypted_data: "old",
		});

		await saveLocalSnapshot({
			vault_id: vaultId,
			version_vector: '{"peer1": 5}',
			encrypted_data: "new",
		});

		const snapshot = await loadLocalSnapshot(vaultId);
		expect(snapshot?.version_vector).toBe('{"peer1": 5}');
		expect(snapshot?.encrypted_data).toBe("new");
	});
});

describe("loadLocalSnapshot", () => {
	it("returns undefined for non-existent vault", async () => {
		const snapshot = await loadLocalSnapshot("non-existent");
		expect(snapshot).toBeUndefined();
	});
});

describe("deleteLocalSnapshot", () => {
	it("removes snapshot", async () => {
		const vaultId = "vault-123";

		await saveLocalSnapshot({
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data",
		});

		await deleteLocalSnapshot(vaultId);

		const snapshot = await loadLocalSnapshot(vaultId);
		expect(snapshot).toBeUndefined();
	});
});

// ============================================
// Sync Metadata Tests
// ============================================

describe("setSyncMeta / getSyncMeta", () => {
	it("stores and retrieves string value", async () => {
		await setSyncMeta("vault-123", "lastSyncCursor", "abc123");

		const value = await getSyncMeta("vault-123", "lastSyncCursor");
		expect(value).toBe("abc123");
	});

	it("stores and retrieves number value", async () => {
		await setSyncMeta("vault-123", "lastSyncTimestamp", 1234567890);

		const value = await getSyncMeta("vault-123", "lastSyncTimestamp");
		expect(value).toBe(1234567890);
	});

	it("stores and retrieves boolean value", async () => {
		await setSyncMeta("vault-123", "initialSyncComplete", true);

		const value = await getSyncMeta("vault-123", "initialSyncComplete");
		expect(value).toBe(true);
	});

	it("returns undefined for non-existent key", async () => {
		const value = await getSyncMeta("vault-123", "nonExistent");
		expect(value).toBeUndefined();
	});

	it("isolates metadata between vaults", async () => {
		await setSyncMeta("vault-123", "key", "value1");
		await setSyncMeta("vault-456", "key", "value2");

		expect(await getSyncMeta("vault-123", "key")).toBe("value1");
		expect(await getSyncMeta("vault-456", "key")).toBe("value2");
	});
});

describe("clearSyncMeta", () => {
	it("removes all metadata for vault", async () => {
		await setSyncMeta("vault-123", "key1", "value1");
		await setSyncMeta("vault-123", "key2", "value2");
		await setSyncMeta("vault-456", "key1", "other");

		await clearSyncMeta("vault-123");

		expect(await getSyncMeta("vault-123", "key1")).toBeUndefined();
		expect(await getSyncMeta("vault-123", "key2")).toBeUndefined();
		expect(await getSyncMeta("vault-456", "key1")).toBe("other");
	});
});

// ============================================
// Vault Cleanup Tests
// ============================================

describe("clearVaultData", () => {
	it("removes all data for vault", async () => {
		const vaultId = "vault-123";

		// Set up data
		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data",
		});

		await saveLocalSnapshot({
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "snapshot",
		});

		await setSyncMeta(vaultId, "key", "value");

		// Clear all
		await clearVaultData(vaultId);

		// Verify all cleared
		expect(await getAllOps(vaultId)).toHaveLength(0);
		expect(await loadLocalSnapshot(vaultId)).toBeUndefined();
		expect(await getSyncMeta(vaultId, "key")).toBeUndefined();
	});
});
