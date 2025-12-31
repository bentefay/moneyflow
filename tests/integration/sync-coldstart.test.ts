/**
 * Integration Tests: Cold Start Sync Flow
 *
 * Tests the complete cold start flow:
 * 1. Load local snapshot → app immediately usable
 * 2. Background sync: get updates from server
 * 3. Apply remote ops or download fresh snapshot
 * 4. Push any local unpushed ops
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { LoroDoc } from "loro-crdt";
import {
	appendOp,
	clearVaultData,
	closeDB,
	// deleteDB - reserved for full reset scenarios
	getUnpushedOps,
	hasUnpushedOps,
	loadLocalSnapshot,
	markOpsPushed,
	saveLocalSnapshot,
} from "@/lib/sync/persistence";

// Reset database between tests
// Note: We use unique vault IDs per test to avoid database deletion issues
// with fake-indexeddb
let testCounter = 0;
function uniqueVaultId(prefix: string): string {
	return `${prefix}-${++testCounter}-${Date.now()}`;
}

beforeEach(async () => {
	vi.clearAllMocks();
});

afterEach(async () => {
	await closeDB();
});

// ============================================
// Test Helpers
// ============================================

function createTestDoc(): LoroDoc {
	return new LoroDoc();
}

function createEncryptedData(data: string): string {
	// In real implementation, this would be encrypted
	// For tests, we use base64 encoding
	return btoa(data);
}

function decryptData(encrypted: string): string {
	return atob(encrypted);
}

function getVersionVector(doc: LoroDoc): string {
	const version = doc.version();
	return JSON.stringify(version.toJSON());
}

// ============================================
// Cold Start Flow Tests
// ============================================

describe("Cold Start Flow", () => {
	describe("Local Snapshot Loading", () => {
		it("loads local snapshot if present", async () => {
			const vaultId = "vault-123";

			// Create a local snapshot
			const doc = createTestDoc();
			const map = doc.getMap("test");
			map.set("key", "value");
			doc.commit();

			const snapshot = doc.export({ mode: "snapshot" });
			const encryptedSnapshot = createEncryptedData(
				String.fromCharCode(...new Uint8Array(snapshot))
			);

			await saveLocalSnapshot({
				vault_id: vaultId,
				encrypted_data: encryptedSnapshot,
				version_vector: getVersionVector(doc),
			});

			// Load the snapshot
			const loaded = await loadLocalSnapshot(vaultId);

			expect(loaded).not.toBeNull();
			expect(loaded!.vault_id).toBe(vaultId);
			expect(loaded!.encrypted_data).toBe(encryptedSnapshot);
		});

		it("returns undefined when no local snapshot exists", async () => {
			const loaded = await loadLocalSnapshot("nonexistent-vault");
			expect(loaded).toBeUndefined();
		});

		it("provides immediate usability with local data", async () => {
			const vaultId = "vault-immediate";

			// Create and save a snapshot with data
			const doc = createTestDoc();
			const map = doc.getMap("transactions");
			map.set("txn-1", JSON.stringify({ amount: 100, description: "Test" }));
			doc.commit();

			const snapshot = doc.export({ mode: "snapshot" });
			const encryptedSnapshot = createEncryptedData(
				String.fromCharCode(...new Uint8Array(snapshot))
			);

			await saveLocalSnapshot({
				vault_id: vaultId,
				encrypted_data: encryptedSnapshot,
				version_vector: getVersionVector(doc),
			});

			// Simulate cold start: load snapshot
			const startTime = Date.now();
			const localSnapshot = await loadLocalSnapshot(vaultId);
			const loadTime = Date.now() - startTime;

			// Should load quickly (< 100ms for local IndexedDB)
			expect(loadTime).toBeLessThan(100);
			expect(localSnapshot).not.toBeNull();

			// Create new doc and import snapshot
			const newDoc = createTestDoc();
			const decryptedData = decryptData(localSnapshot!.encrypted_data);
			const bytes = new Uint8Array(decryptedData.split("").map((c) => c.charCodeAt(0)));
			newDoc.import(bytes);

			// Data should be immediately accessible
			const newMap = newDoc.getMap("transactions");
			expect(newMap.get("txn-1")).toBe(JSON.stringify({ amount: 100, description: "Test" }));
		});
	});

	describe("Unpushed Ops Detection", () => {
		it("detects unpushed ops correctly", async () => {
			const vaultId = "vault-unpushed";

			// No ops initially
			expect(await hasUnpushedOps(vaultId)).toBe(false);

			// Add an unpushed op
			await appendOp({
				id: "op-1",
				vault_id: vaultId,
				version_vector: "{}",
				encrypted_data: "data1",
				pushed: false,
			});

			expect(await hasUnpushedOps(vaultId)).toBe(true);

			// Mark as pushed
			await markOpsPushed(["op-1"]);

			expect(await hasUnpushedOps(vaultId)).toBe(false);
		});

		it("isolates unpushed ops by vault", async () => {
			// Add op to vault A
			await appendOp({
				id: "op-a",
				vault_id: "vault-a",
				version_vector: "{}",
				encrypted_data: "data-a",
				pushed: false,
			});

			// Add pushed op to vault B
			await appendOp({
				id: "op-b",
				vault_id: "vault-b",
				version_vector: "{}",
				encrypted_data: "data-b",
				pushed: true,
			});

			expect(await hasUnpushedOps("vault-a")).toBe(true);
			expect(await hasUnpushedOps("vault-b")).toBe(false);
		});
	});

	describe("Background Sync Scenarios", () => {
		it("retrieves all unpushed ops for server push", async () => {
			const vaultId = "vault-sync";

			// Add multiple ops
			await appendOp({
				id: "op-1",
				vault_id: vaultId,
				version_vector: '{"peer1": 1}',
				encrypted_data: "data1",
				pushed: false,
			});

			await appendOp({
				id: "op-2",
				vault_id: vaultId,
				version_vector: '{"peer1": 2}',
				encrypted_data: "data2",
				pushed: false,
			});

			await appendOp({
				id: "op-3",
				vault_id: vaultId,
				version_vector: '{"peer1": 3}',
				encrypted_data: "data3",
				pushed: true, // Already pushed
			});

			const unpushed = await getUnpushedOps(vaultId);

			expect(unpushed).toHaveLength(2);
			expect(unpushed.map((op) => op.id).sort()).toEqual(["op-1", "op-2"]);
		});

		it("marks ops as pushed after successful sync", async () => {
			const vaultId = "vault-mark";

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
				pushed: false,
			});

			// Simulate successful server push for op-1 only
			await markOpsPushed(["op-1"]);

			const unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(1);
			expect(unpushed[0].id).toBe("op-2");
		});
	});

	describe("Snapshot Update Flow", () => {
		it("updates local snapshot after receiving server snapshot", async () => {
			const vaultId = "vault-update";

			// Start with an old local snapshot
			await saveLocalSnapshot({
				vault_id: vaultId,
				encrypted_data: createEncryptedData("old-data"),
				version_vector: '{"peer1": 1}',
			});

			// Simulate receiving a newer snapshot from server
			const newSnapshotData = createEncryptedData("new-data");
			await saveLocalSnapshot({
				vault_id: vaultId,
				encrypted_data: newSnapshotData,
				version_vector: '{"peer1": 10}',
			});

			const loaded = await loadLocalSnapshot(vaultId);
			expect(loaded!.encrypted_data).toBe(newSnapshotData);
			expect(loaded!.version_vector).toBe('{"peer1": 10}');
		});
	});

	describe("Vault Data Cleanup", () => {
		it("clears all vault data correctly", async () => {
			const vaultId = "vault-clear";

			// Add snapshot and ops
			await saveLocalSnapshot({
				vault_id: vaultId,
				encrypted_data: "snapshot-data",
				version_vector: "{}",
			});

			await appendOp({
				id: "op-1",
				vault_id: vaultId,
				version_vector: "{}",
				encrypted_data: "op-data",
				pushed: false,
			});

			// Verify data exists
			expect(await loadLocalSnapshot(vaultId)).not.toBeNull();
			expect(await hasUnpushedOps(vaultId)).toBe(true);

			// Clear vault data
			await clearVaultData(vaultId);

			// Verify cleared
			expect(await loadLocalSnapshot(vaultId)).toBeUndefined();
			expect(await hasUnpushedOps(vaultId)).toBe(false);
		});

		it("does not affect other vaults when clearing", async () => {
			// Add data to two vaults
			await saveLocalSnapshot({
				vault_id: "vault-a",
				encrypted_data: "snapshot-a",
				version_vector: "{}",
			});

			await saveLocalSnapshot({
				vault_id: "vault-b",
				encrypted_data: "snapshot-b",
				version_vector: "{}",
			});

			// Clear only vault-a
			await clearVaultData("vault-a");

			// vault-a should be cleared
			expect(await loadLocalSnapshot("vault-a")).toBeUndefined();

			// vault-b should still have data
			expect(await loadLocalSnapshot("vault-b")).not.toBeNull();
		});
	});
});

// ============================================
// Version Vector Tests
// ============================================

describe("Version Vector Handling", () => {
	it("preserves version vector through save/load cycle", async () => {
		const vaultId = "vault-version";
		const versionVector = '{"peer1": 5, "peer2": 3}';

		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: "data",
			version_vector: versionVector,
		});

		const loaded = await loadLocalSnapshot(vaultId);
		expect(loaded!.version_vector).toBe(versionVector);
	});

	it("stores version vector with ops", async () => {
		const vaultId = "vault-op-version";
		const versionVector = '{"peer1": 10}';

		await appendOp({
			id: "op-1",
			vault_id: vaultId,
			version_vector: versionVector,
			encrypted_data: "data",
			pushed: false,
		});

		const ops = await getUnpushedOps(vaultId);
		expect(ops[0].version_vector).toBe(versionVector);
	});
});

// ============================================
// Concurrency Tests
// ============================================

describe("Concurrent Operations", () => {
	it("handles concurrent op writes", async () => {
		const vaultId = uniqueVaultId("vault-concurrent");

		// Write multiple ops concurrently
		await Promise.all([
			appendOp({
				id: `${vaultId}-op-1`,
				vault_id: vaultId,
				version_vector: "{}",
				encrypted_data: "data1",
			}),
			appendOp({
				id: `${vaultId}-op-2`,
				vault_id: vaultId,
				version_vector: "{}",
				encrypted_data: "data2",
			}),
			appendOp({
				id: `${vaultId}-op-3`,
				vault_id: vaultId,
				version_vector: "{}",
				encrypted_data: "data3",
			}),
		]);

		const ops = await getUnpushedOps(vaultId);
		expect(ops).toHaveLength(3);
	});

	it("handles sequential snapshot updates", async () => {
		const vaultId = uniqueVaultId("vault-snapshot-sequential");

		// Save snapshots sequentially to avoid race conditions
		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: "data-1",
			version_vector: '{"v": 1}',
		});

		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: "data-2",
			version_vector: '{"v": 2}',
		});

		// Last write should win
		const snapshot = await loadLocalSnapshot(vaultId);
		expect(snapshot).toBeDefined();
		expect(snapshot!.encrypted_data).toBe("data-2");
	});
});

// ============================================
// Error Recovery Tests
// ============================================

describe("Error Recovery", () => {
	it("recovers gracefully when local snapshot is missing", async () => {
		const vaultId = uniqueVaultId("vault-missing");

		// Try to load non-existent snapshot
		const snapshot = await loadLocalSnapshot(vaultId);
		expect(snapshot).toBeUndefined();

		// Should be able to save new snapshot
		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: "fresh-data",
			version_vector: "{}",
		});

		const loaded = await loadLocalSnapshot(vaultId);
		expect(loaded!.encrypted_data).toBe("fresh-data");
	});

	it("handles partial op push gracefully", async () => {
		const vaultId = uniqueVaultId("vault-partial");

		// Add multiple ops
		await appendOp({
			id: `${vaultId}-op-1`,
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data1",
			pushed: false,
		});

		await appendOp({
			id: `${vaultId}-op-2`,
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data2",
			pushed: false,
		});

		await appendOp({
			id: `${vaultId}-op-3`,
			vault_id: vaultId,
			version_vector: "{}",
			encrypted_data: "data3",
			pushed: false,
		});

		// Simulate partial push (only first two succeeded)
		await markOpsPushed([`${vaultId}-op-1`, `${vaultId}-op-2`]);

		// op-3 should still be unpushed
		const unpushed = await getUnpushedOps(vaultId);
		expect(unpushed).toHaveLength(1);
		expect(unpushed[0].id).toBe(`${vaultId}-op-3`);
	});
});
