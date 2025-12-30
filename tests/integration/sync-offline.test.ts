/**
 * Integration Tests: Offline/Online Sync Flow
 *
 * Tests sync behavior when transitioning between online and offline states:
 * 1. Offline mode: Changes saved locally, queued for sync
 * 2. Coming online: Push queued changes, receive updates
 * 3. Conflict resolution with CRDT merge
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import {
	appendOp,
	closeDB,
	countOpsSinceSnapshot,
	getAllOps,
	getUnpushedOps,
	hasUnpushedOps,
	loadLocalSnapshot,
	markOpsPushed,
	saveLocalSnapshot,
} from "@/lib/sync/persistence";

// Use unique vault IDs per test to avoid database conflicts
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

// Reserved for tests that need a fresh Loro document
// function createTestDoc(): LoroDoc {
// 	return new LoroDoc();
// }

function createEncryptedData(data: string): string {
	return btoa(data);
}

// ============================================
// Offline Operation Tests
// ============================================

describe("Offline Operations", () => {
	describe("Local Change Accumulation", () => {
		it("accumulates changes while offline", async () => {
			const vaultId = uniqueVaultId("vault-offline");

			// Simulate making changes while offline (no server connection)
			// All changes should be stored as unpushed ops
			for (let i = 1; i <= 5; i++) {
				await appendOp({
					id: `${vaultId}-op-${i}`,
					vault_id: vaultId,
					version_vector: JSON.stringify({ peer1: i }),
					encrypted_data: createEncryptedData(`change-${i}`),
					pushed: false,
				});
			}

			const unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(5);
			expect(await hasUnpushedOps(vaultId)).toBe(true);
		});

		it("preserves order of offline changes", async () => {
			const vaultId = uniqueVaultId("vault-order");

			// Add ops in specific order
			for (let i = 1; i <= 3; i++) {
				await appendOp({
					id: `${vaultId}-op-${i}`,
					vault_id: vaultId,
					version_vector: JSON.stringify({ peer1: i }),
					encrypted_data: createEncryptedData(`change-${i}`),
					pushed: false,
				});
				// Small delay to ensure different timestamps
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			const unpushed = await getUnpushedOps(vaultId);
			// Should be in chronological order
			expect(unpushed.map((op) => op.id)).toEqual([
				`${vaultId}-op-1`,
				`${vaultId}-op-2`,
				`${vaultId}-op-3`,
			]);
		});

		it("handles large number of offline changes", async () => {
			const vaultId = uniqueVaultId("vault-large");
			const changeCount = 100;

			// Simulate many changes while offline
			for (let i = 1; i <= changeCount; i++) {
				await appendOp({
					id: `${vaultId}-op-${i}`,
					vault_id: vaultId,
					version_vector: JSON.stringify({ peer1: i }),
					encrypted_data: createEncryptedData(`change-${i}`),
					pushed: false,
				});
			}

			const unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(changeCount);
		});
	});

	describe("Offline State Persistence", () => {
		it("preserves local state across session restarts", async () => {
			const vaultId = uniqueVaultId("vault-persist");

			// Save snapshot and ops
			await saveLocalSnapshot({
				vault_id: vaultId,
				encrypted_data: createEncryptedData("snapshot-data"),
				version_vector: '{"peer1": 5}',
			});

			await appendOp({
				id: `${vaultId}-op-1`,
				vault_id: vaultId,
				version_vector: '{"peer1": 6}',
				encrypted_data: createEncryptedData("new-change"),
				pushed: false,
			});

			// Simulate session restart (close and reopen DB)
			await closeDB();

			// Verify data persisted
			const snapshot = await loadLocalSnapshot(vaultId);
			expect(snapshot).toBeDefined();
			expect(snapshot!.version_vector).toBe('{"peer1": 5}');

			const unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(1);
		});
	});
});

// ============================================
// Coming Online Tests
// ============================================

describe("Coming Online", () => {
	describe("Push Queued Changes", () => {
		it("marks ops as pushed after successful server sync", async () => {
			const vaultId = uniqueVaultId("vault-push");

			// Accumulate offline changes
			const opIds: string[] = [];
			for (let i = 1; i <= 3; i++) {
				const opId = `${vaultId}-op-${i}`;
				opIds.push(opId);
				await appendOp({
					id: opId,
					vault_id: vaultId,
					version_vector: JSON.stringify({ peer1: i }),
					encrypted_data: createEncryptedData(`change-${i}`),
					pushed: false,
				});
			}

			// Verify unpushed
			expect(await hasUnpushedOps(vaultId)).toBe(true);

			// Simulate successful server push
			await markOpsPushed(opIds);

			// Verify all marked as pushed
			expect(await hasUnpushedOps(vaultId)).toBe(false);
		});

		it("handles partial sync failure", async () => {
			const vaultId = uniqueVaultId("vault-partial-fail");

			// Accumulate offline changes
			const opIds: string[] = [];
			for (let i = 1; i <= 5; i++) {
				const opId = `${vaultId}-op-${i}`;
				opIds.push(opId);
				await appendOp({
					id: opId,
					vault_id: vaultId,
					version_vector: JSON.stringify({ peer1: i }),
					encrypted_data: createEncryptedData(`change-${i}`),
					pushed: false,
				});
			}

			// Simulate partial success (first 3 pushed, last 2 failed)
			await markOpsPushed(opIds.slice(0, 3));

			const unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(2);
			expect(unpushed.map((op) => op.id)).toEqual([`${vaultId}-op-4`, `${vaultId}-op-5`]);
		});

		it("retries failed ops on next sync", async () => {
			const vaultId = uniqueVaultId("vault-retry");

			await appendOp({
				id: `${vaultId}-op-1`,
				vault_id: vaultId,
				version_vector: "{}",
				encrypted_data: createEncryptedData("change-1"),
				pushed: false,
			});

			// First sync attempt fails (op stays unpushed)
			// No markOpsPushed called

			// Verify op is still available for retry
			let unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(1);

			// Second sync attempt succeeds
			await markOpsPushed([`${vaultId}-op-1`]);

			unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(0);
		});
	});

	describe("Receiving Remote Updates", () => {
		it("stores remote ops after receiving from server", async () => {
			const vaultId = uniqueVaultId("vault-remote");

			// Simulate receiving remote ops from server
			// These would be marked as pushed since they came from server
			for (let i = 1; i <= 3; i++) {
				await appendOp({
					id: `${vaultId}-remote-op-${i}`,
					vault_id: vaultId,
					version_vector: JSON.stringify({ peer2: i }),
					encrypted_data: createEncryptedData(`remote-change-${i}`),
					pushed: true, // Remote ops are already "pushed" from our perspective
				});
			}

			// Should have no unpushed ops
			expect(await hasUnpushedOps(vaultId)).toBe(false);

			// But should have 3 ops total
			const allOps = await getAllOps(vaultId);
			expect(allOps).toHaveLength(3);
		});

		it("merges local and remote ops correctly", async () => {
			const vaultId = uniqueVaultId("vault-merge");

			// Local unpushed op
			await appendOp({
				id: `${vaultId}-local-op`,
				vault_id: vaultId,
				version_vector: '{"peer1": 1}',
				encrypted_data: createEncryptedData("local-change"),
				pushed: false,
			});

			// Remote op from server
			await appendOp({
				id: `${vaultId}-remote-op`,
				vault_id: vaultId,
				version_vector: '{"peer2": 1}',
				encrypted_data: createEncryptedData("remote-change"),
				pushed: true,
			});

			const allOps = await getAllOps(vaultId);
			expect(allOps).toHaveLength(2);

			const unpushed = await getUnpushedOps(vaultId);
			expect(unpushed).toHaveLength(1);
			expect(unpushed[0].id).toBe(`${vaultId}-local-op`);
		});
	});
});

// ============================================
// Snapshot Threshold Tests
// ============================================

describe("Snapshot Management", () => {
	it("counts ops since last snapshot", async () => {
		const vaultId = uniqueVaultId("vault-count");

		// Save snapshot first
		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: createEncryptedData("snapshot"),
			version_vector: "{}",
		});

		// Wait a bit to ensure ops come after snapshot
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Add ops after snapshot
		for (let i = 1; i <= 5; i++) {
			await appendOp({
				id: `${vaultId}-op-${i}`,
				vault_id: vaultId,
				version_vector: JSON.stringify({ peer1: i }),
				encrypted_data: createEncryptedData(`data-${i}`),
				pushed: true,
			});
		}

		const { count, bytes } = await countOpsSinceSnapshot(vaultId);
		expect(count).toBe(5);
		expect(bytes).toBeGreaterThan(0);
	});

	it("updates snapshot after threshold exceeded", async () => {
		const vaultId = uniqueVaultId("vault-threshold");

		// Initial snapshot
		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: createEncryptedData("old-snapshot"),
			version_vector: '{"peer1": 0}',
		});

		// Simulate threshold exceeded, new snapshot created
		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: createEncryptedData("new-snapshot"),
			version_vector: '{"peer1": 500}',
		});

		const snapshot = await loadLocalSnapshot(vaultId);
		expect(snapshot!.encrypted_data).toBe(createEncryptedData("new-snapshot"));
		expect(snapshot!.version_vector).toBe('{"peer1": 500}');
	});
});

// ============================================
// Network State Simulation Tests
// ============================================

describe("Network State Transitions", () => {
	it("simulates offline -> online workflow", async () => {
		const vaultId = uniqueVaultId("vault-workflow");

		// Phase 1: Offline - Start with a snapshot
		await saveLocalSnapshot({
			vault_id: vaultId,
			encrypted_data: createEncryptedData("initial-snapshot"),
			version_vector: '{"peer1": 5}',
		});

		// Phase 2: Make offline changes
		const offlineOpIds: string[] = [];
		for (let i = 1; i <= 3; i++) {
			const opId = `${vaultId}-offline-${i}`;
			offlineOpIds.push(opId);
			await appendOp({
				id: opId,
				vault_id: vaultId,
				version_vector: JSON.stringify({ peer1: 5 + i }),
				encrypted_data: createEncryptedData(`offline-change-${i}`),
				pushed: false,
			});
		}

		// Verify offline state
		expect(await hasUnpushedOps(vaultId)).toBe(true);
		expect((await getUnpushedOps(vaultId)).length).toBe(3);

		// Phase 3: Come online - receive remote updates
		for (let i = 1; i <= 2; i++) {
			await appendOp({
				id: `${vaultId}-remote-${i}`,
				vault_id: vaultId,
				version_vector: JSON.stringify({ peer2: i }),
				encrypted_data: createEncryptedData(`remote-change-${i}`),
				pushed: true,
			});
		}

		// Phase 4: Push local changes
		await markOpsPushed(offlineOpIds);

		// Phase 5: Verify final state
		expect(await hasUnpushedOps(vaultId)).toBe(false);
		const allOps = await getAllOps(vaultId);
		expect(allOps).toHaveLength(5); // 3 local + 2 remote
	});

	it("simulates intermittent connectivity", async () => {
		const vaultId = uniqueVaultId("vault-intermittent");

		// First online period - push succeeds
		await appendOp({
			id: `${vaultId}-op-1`,
			vault_id: vaultId,
			version_vector: '{"peer1": 1}',
			encrypted_data: createEncryptedData("change-1"),
			pushed: false,
		});
		await markOpsPushed([`${vaultId}-op-1`]);

		// Offline period - changes accumulate
		await appendOp({
			id: `${vaultId}-op-2`,
			vault_id: vaultId,
			version_vector: '{"peer1": 2}',
			encrypted_data: createEncryptedData("change-2"),
			pushed: false,
		});
		await appendOp({
			id: `${vaultId}-op-3`,
			vault_id: vaultId,
			version_vector: '{"peer1": 3}',
			encrypted_data: createEncryptedData("change-3"),
			pushed: false,
		});

		expect(await hasUnpushedOps(vaultId)).toBe(true);

		// Back online - push succeeds
		await markOpsPushed([`${vaultId}-op-2`, `${vaultId}-op-3`]);

		expect(await hasUnpushedOps(vaultId)).toBe(false);

		const allOps = await getAllOps(vaultId);
		expect(allOps).toHaveLength(3);
		// All should now be pushed
		expect(allOps.every((op) => op.pushed === 1)).toBe(true);
	});
});

// ============================================
// Multi-Peer Sync Tests
// ============================================

describe("Multi-Peer Sync", () => {
	it("handles ops from multiple peers", async () => {
		const vaultId = uniqueVaultId("vault-multi-peer");

		// Ops from peer1
		await appendOp({
			id: `${vaultId}-peer1-op`,
			vault_id: vaultId,
			version_vector: '{"peer1": 1}',
			encrypted_data: createEncryptedData("peer1-change"),
			pushed: false,
		});

		// Ops from peer2 (received from server)
		await appendOp({
			id: `${vaultId}-peer2-op`,
			vault_id: vaultId,
			version_vector: '{"peer2": 1}',
			encrypted_data: createEncryptedData("peer2-change"),
			pushed: true,
		});

		// Ops from peer3 (received from server)
		await appendOp({
			id: `${vaultId}-peer3-op`,
			vault_id: vaultId,
			version_vector: '{"peer3": 1}',
			encrypted_data: createEncryptedData("peer3-change"),
			pushed: true,
		});

		const allOps = await getAllOps(vaultId);
		expect(allOps).toHaveLength(3);

		// Only peer1 op should be unpushed (it's our local op)
		const unpushed = await getUnpushedOps(vaultId);
		expect(unpushed).toHaveLength(1);
		expect(unpushed[0].id).toBe(`${vaultId}-peer1-op`);
	});

	it("preserves version vectors for conflict resolution", async () => {
		const vaultId = uniqueVaultId("vault-vectors");

		const ops = [
			{ id: `${vaultId}-op-1`, vv: { peer1: 1, peer2: 0 } },
			{ id: `${vaultId}-op-2`, vv: { peer1: 1, peer2: 1 } },
			{ id: `${vaultId}-op-3`, vv: { peer1: 2, peer2: 1 } },
		];

		for (const op of ops) {
			await appendOp({
				id: op.id,
				vault_id: vaultId,
				version_vector: JSON.stringify(op.vv),
				encrypted_data: createEncryptedData("data"),
				pushed: true,
			});
		}

		const allOps = await getAllOps(vaultId);
		expect(allOps).toHaveLength(3);

		// Verify version vectors preserved correctly
		expect(JSON.parse(allOps[0].version_vector)).toEqual({ peer1: 1, peer2: 0 });
		expect(JSON.parse(allOps[1].version_vector)).toEqual({ peer1: 1, peer2: 1 });
		expect(JSON.parse(allOps[2].version_vector)).toEqual({ peer1: 2, peer2: 1 });
	});
});
