/**
 * Sync Manager
 *
 * Coordinates sending and receiving encrypted CRDT updates.
 * Uses the new persistence architecture (Phase 6a):
 *
 * - IndexedDB: Immediate writes on every change, ops tracked with `pushed` flag
 * - Server sync: Throttled (2s via lodash-es), batch push of unpushed ops
 * - Snapshots: Client creates when threshold exceeded (500 ops or 5MB)
 *
 * Flow:
 * 1. subscribeLocalUpdates fires after each loro-mirror commit
 * 2. Op encrypted & saved to IndexedDB immediately
 * 3. Throttled server sync pushes all unpushed ops
 * 4. On visibilitychange/beforeunload, flush pending sync
 */

import { throttle } from "lodash-es";
import type { LoroDoc, VersionVector } from "loro-crdt";
import {
	createEncryptedShallowSnapshot,
	decryptUpdate,
	loadEncryptedSnapshot,
} from "@/lib/crdt/snapshot";
import { getVersionEncoded } from "@/lib/crdt/sync";
import { createVaultRealtimeSync, type VaultRealtimeSync } from "@/lib/supabase/realtime";
import {
	appendOp,
	countOpsSinceSnapshot,
	getUnpushedOps,
	hasUnpushedOps,
	loadLocalSnapshot,
	markOpsPushed,
	saveLocalSnapshot,
} from "./persistence";

/** Ops count threshold for creating snapshot */
const SNAPSHOT_OP_THRESHOLD = 500;
/** Bytes threshold for creating snapshot (5MB) */
const SNAPSHOT_BYTE_THRESHOLD = 5 * 1024 * 1024;
/** Server sync throttle interval (ms) */
const SERVER_SYNC_THROTTLE_MS = 2000;

/**
 * Options for creating a sync manager.
 */
export interface SyncManagerOptions {
	/** The vault ID to sync */
	vaultId: string;
	/** The user's pubkey hash */
	pubkeyHash: string;
	/** The vault encryption key */
	vaultKey: Uint8Array;
	/** The Loro document to sync */
	doc: LoroDoc;
	/** tRPC client for server communication */
	trpc?: {
		sync: {
			getSnapshot: {
				query: (input: { vaultId: string }) => Promise<{
					encryptedData: string;
					versionVector: string;
					version?: number;
				} | null>;
			};
			getUpdates: {
				query: (input: { vaultId: string; versionVector: string; hasUnpushed: boolean }) => Promise<
					| {
							type: "ops";
							ops: Array<{ id: string; encryptedData: string; versionVector: string }>;
					  }
					| { type: "use_snapshot"; snapshotVersionVector: string }
				>;
			};
			pushOps: {
				mutate: (input: {
					vaultId: string;
					ops: Array<{ id: string; encryptedData: string; versionVector: string }>;
				}) => Promise<{ insertedIds: string[] }>;
			};
			pushSnapshot: {
				mutate: (input: {
					vaultId: string;
					encryptedData: string;
					versionVector: string;
				}) => Promise<{ success: boolean }>;
			};
			// Legacy methods (deprecated)
			saveSnapshot?: {
				mutate: (input: {
					vaultId: string;
					encryptedData: string;
					versionVector: string;
					version: number;
				}) => Promise<void>;
			};
			pushUpdate?: {
				mutate: (input: {
					vaultId: string;
					encryptedData: string;
					baseSnapshotVersion: number;
					hlcTimestamp: string;
					versionVector: string;
				}) => Promise<void>;
			};
		};
	};
	/** Called when remote updates are applied */
	onRemoteUpdate?: () => void;
	/** Called when sync state changes */
	onSyncStateChange?: (state: SyncState) => void;
	/** Called on sync error */
	onError?: (error: Error) => void;
}

/**
 * Sync state.
 */
export type SyncState = "idle" | "syncing" | "saving" | "error";

/**
 * Manages synchronization of a Loro document with the server.
 */
export class SyncManager {
	private vaultId: string;
	private pubkeyHash: string;
	private vaultKey: Uint8Array;
	private doc: LoroDoc;
	private trpc: SyncManagerOptions["trpc"];
	private realtime: VaultRealtimeSync | null = null;
	private onRemoteUpdate: (() => void) | undefined;
	private onSyncStateChange: ((state: SyncState) => void) | undefined;
	private onError: ((error: Error) => void) | undefined;
	private lastSyncedVersion: VersionVector | null = null;
	private snapshotVersion = 0;
	private isSyncing = false;
	private isInitialized = false;
	private autoSyncEnabled = true;
	private unsubscribeLocalUpdates: (() => void) | null = null;
	private throttledServerSync: ReturnType<typeof throttle> | null = null;
	private visibilityHandler: (() => void) | null = null;
	private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

	constructor(options: SyncManagerOptions) {
		this.vaultId = options.vaultId;
		this.pubkeyHash = options.pubkeyHash;
		this.vaultKey = options.vaultKey;
		this.doc = options.doc;
		this.trpc = options.trpc;
		this.onRemoteUpdate = options.onRemoteUpdate;
		this.onSyncStateChange = options.onSyncStateChange;
		this.onError = options.onError;

		// Create throttled server sync
		this.throttledServerSync = throttle(() => this.pushToServer(), SERVER_SYNC_THROTTLE_MS, {
			leading: false,
			trailing: true,
		});
	}

	/**
	 * Initialize the sync manager.
	 * Loads initial state from IndexedDB/server and subscribes to updates.
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		this.setSyncState("syncing");

		try {
			// Load initial state (IndexedDB first, then server)
			await this.loadInitialState();

			// Subscribe to realtime updates
			this.realtime = createVaultRealtimeSync(this.vaultId, this.pubkeyHash);
			this.realtime.subscribe({
				onUpdate: async (update) => {
					// Skip our own updates
					if (update.authorPubkeyHash === this.pubkeyHash) {
						return;
					}

					// Apply the update
					await this.applyRemoteUpdate(update.encryptedData);
				},
			});

			// Set up document change listener for auto-sync
			this.setupAutoSync();

			// Set up visibility and beforeunload handlers
			this.setupBrowserHandlers();

			this.isInitialized = true;
			this.setSyncState("idle");
		} catch (error) {
			this.setSyncState("error");
			this.onError?.(error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	/**
	 * Set up automatic sync on document changes.
	 * Uses subscribeLocalUpdates which fires after each loro-mirror commit.
	 */
	private setupAutoSync(): void {
		// Subscribe to local updates from the document
		this.unsubscribeLocalUpdates = this.doc.subscribeLocalUpdates(async (update: Uint8Array) => {
			if (!this.autoSyncEnabled) return;

			try {
				// 1. Encrypt the update immediately
				const encryptedData = await this.encryptUpdate(update);
				const versionVector = this.getVersionVectorString();
				const opId = crypto.randomUUID();

				// 2. Save to IndexedDB immediately (with pushed=false)
				await appendOp({
					id: opId,
					vault_id: this.vaultId,
					encrypted_data: encryptedData,
					version_vector: versionVector,
					pushed: false,
				});

				// 3. Update UI to show "saving" state
				this.setSyncState("saving");

				// 4. Schedule throttled server sync
				this.throttledServerSync?.();
			} catch (error) {
				console.error("Failed to save local update:", error);
				this.onError?.(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	/**
	 * Set up browser handlers for visibility change and beforeunload.
	 */
	private setupBrowserHandlers(): void {
		if (typeof window === "undefined") return;

		// Flush on visibility change (user switches tabs)
		this.visibilityHandler = () => {
			if (document.visibilityState === "hidden") {
				this.throttledServerSync?.flush();
			}
		};
		document.addEventListener("visibilitychange", this.visibilityHandler);

		// Warn on beforeunload if there are unpushed changes
		this.beforeUnloadHandler = async (e: BeforeUnloadEvent) => {
			const hasUnpushed = await hasUnpushedOps(this.vaultId);
			if (hasUnpushed) {
				// Attempt to flush
				this.throttledServerSync?.flush();
				// Show browser warning
				e.preventDefault();
				e.returnValue = "You have unsaved changes.";
			}
		};
		window.addEventListener("beforeunload", this.beforeUnloadHandler);
	}

	/**
	 * Encrypt a CRDT update using the vault key.
	 */
	private async encryptUpdate(update: Uint8Array): Promise<string> {
		const { encryptForStorage } = await import("@/lib/crypto/encryption");
		const encrypted = await encryptForStorage(update, this.vaultKey);
		return btoa(String.fromCharCode(...encrypted));
	}

	/**
	 * Get the current version vector as a base64 string.
	 */
	private getVersionVectorString(): string {
		const versionBytes = getVersionEncoded(this.doc);
		return btoa(String.fromCharCode(...versionBytes));
	}

	/**
	 * Load initial state from IndexedDB and/or server.
	 */
	private async loadInitialState(): Promise<void> {
		// Try to load from IndexedDB first
		const localSnapshot = await loadLocalSnapshot(this.vaultId);
		const localUnpushed = await getUnpushedOps(this.vaultId);
		const hasLocal = localSnapshot !== null || localUnpushed.length > 0;

		if (localSnapshot) {
			// Load local snapshot
			await this.applySnapshot(localSnapshot.encrypted_data);
			console.log("SyncManager: Loaded snapshot from IndexedDB");
		}

		// Apply any locally cached unpushed ops
		// These are ops created locally but not yet pushed to server
		if (localUnpushed.length > 0) {
			// Sort by created_at to apply in order
			const sortedOps = [...localUnpushed].sort((a, b) => a.created_at - b.created_at);
			this.autoSyncEnabled = false;
			try {
				for (const op of sortedOps) {
					const decryptedUpdate = await decryptUpdate(
						{ encryptedData: op.encrypted_data },
						this.vaultKey
					);
					this.doc.import(decryptedUpdate);
				}
				console.log(`SyncManager: Applied ${sortedOps.length} unpushed ops from IndexedDB`);
			} finally {
				this.autoSyncEnabled = true;
			}
		}

		if (!this.trpc) {
			console.log("SyncManager: No tRPC client, using local state only");
			return;
		}

		try {
			// Check if we have unpushed ops
			const hasUnpushed = await hasUnpushedOps(this.vaultId);
			const versionVector = this.getVersionVectorString();

			// Get updates from server
			const response = await this.trpc.sync.getUpdates.query({
				vaultId: this.vaultId,
				versionVector,
				hasUnpushed,
			});

			if (response.type === "use_snapshot") {
				// Server says to use snapshot (too many ops)
				const snapshot = await this.trpc.sync.getSnapshot.query({ vaultId: this.vaultId });
				if (snapshot) {
					await this.applySnapshot(snapshot.encryptedData);
					// Save to local IndexedDB
					await saveLocalSnapshot({
						vault_id: this.vaultId,
						encrypted_data: snapshot.encryptedData,
						version_vector: snapshot.versionVector,
					});
					console.log("SyncManager: Loaded snapshot from server");
				}
			} else if (response.type === "ops") {
				// Apply ops from server
				for (const op of response.ops) {
					await this.applyRemoteUpdate(op.encryptedData);
				}
				console.log(`SyncManager: Applied ${response.ops.length} ops from server`);
			}

			// Push any unpushed local ops to server
			if (hasUnpushed) {
				await this.pushToServer();
			}

			// Update last synced version
			this.lastSyncedVersion = this.doc.version();

			console.log("SyncManager: Initial state loaded successfully");
		} catch (error) {
			console.error("Failed to load initial state from server:", error);
			// Continue with local state if available
			if (!hasLocal) {
				throw error;
			}
		}
	}

	/**
	 * Apply an encrypted snapshot to the document.
	 */
	private async applySnapshot(encryptedData: string): Promise<void> {
		this.autoSyncEnabled = false;
		try {
			const decryptedDoc = await loadEncryptedSnapshot(
				{
					encryptedData,
					metadata: { version: 0, versionVector: "", createdAt: 0 },
				},
				this.vaultKey
			);
			const snapshotBytes = decryptedDoc.export({ mode: "snapshot" });
			this.doc.import(snapshotBytes);
		} finally {
			this.autoSyncEnabled = true;
		}
	}

	/**
	 * Apply a remote update to the local document.
	 */
	private async applyRemoteUpdate(encryptedData: string): Promise<void> {
		try {
			// Temporarily disable auto-sync to prevent echo
			this.autoSyncEnabled = false;

			// Decrypt the update
			const decryptedUpdate = await decryptUpdate({ encryptedData }, this.vaultKey);

			// Import the update into the document
			this.doc.import(decryptedUpdate);

			// Re-enable auto-sync
			this.autoSyncEnabled = true;

			this.onRemoteUpdate?.();
		} catch (error) {
			this.autoSyncEnabled = true;
			console.error("Failed to apply remote update:", error);
			this.onError?.(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Push unpushed ops to server.
	 */
	private async pushToServer(): Promise<void> {
		if (this.isSyncing || !this.trpc) {
			return;
		}

		this.isSyncing = true;
		this.setSyncState("syncing");

		try {
			// Get unpushed ops from IndexedDB
			const unpushedOps = await getUnpushedOps(this.vaultId);

			if (unpushedOps.length === 0) {
				this.setSyncState("idle");
				return;
			}

			// Push to server
			const result = await this.trpc.sync.pushOps.mutate({
				vaultId: this.vaultId,
				ops: unpushedOps.map((op) => ({
					id: op.id,
					encryptedData: op.encrypted_data,
					versionVector: op.version_vector,
				})),
			});

			// Mark as pushed in IndexedDB
			if (result.insertedIds.length > 0) {
				await markOpsPushed(result.insertedIds);
			}

			// Check if we should create a snapshot
			await this.maybeCreateSnapshot();

			// Update last synced version
			this.lastSyncedVersion = this.doc.version();

			this.setSyncState("idle");
		} catch (error) {
			this.setSyncState("error");
			this.onError?.(error instanceof Error ? error : new Error(String(error)));
			// Don't throw - let throttled sync retry
			console.error("Failed to push to server:", error);
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Check if we should create a snapshot and do so if thresholds exceeded.
	 */
	private async maybeCreateSnapshot(): Promise<void> {
		if (!this.trpc) return;

		const { count, bytes } = await countOpsSinceSnapshot(this.vaultId);

		if (count >= SNAPSHOT_OP_THRESHOLD || bytes >= SNAPSHOT_BYTE_THRESHOLD) {
			await this.createAndPushSnapshot();
		}
	}

	/**
	 * Create a snapshot and push to server.
	 */
	private async createAndPushSnapshot(): Promise<void> {
		if (!this.trpc) return;

		try {
			this.snapshotVersion++;
			// Use shallow snapshot - smaller, contains only current state
			const encryptedSnapshot = await createEncryptedShallowSnapshot(
				this.doc,
				this.vaultKey,
				this.snapshotVersion
			);

			const versionVector = this.getVersionVectorString();

			// Push to server
			await this.trpc.sync.pushSnapshot.mutate({
				vaultId: this.vaultId,
				encryptedData: encryptedSnapshot.encryptedData,
				versionVector,
			});

			// Save locally
			await saveLocalSnapshot({
				vault_id: this.vaultId,
				encrypted_data: encryptedSnapshot.encryptedData,
				version_vector: versionVector,
			});

			console.log("SyncManager: Snapshot created and pushed");
		} catch (error) {
			this.snapshotVersion--; // Rollback
			console.error("Failed to create snapshot:", error);
			// Don't throw - snapshots are optimization, not critical
		}
	}

	/**
	 * Push local changes to the server (legacy method for compatibility).
	 * @deprecated Use the automatic sync instead
	 */
	async pushChanges(): Promise<void> {
		await this.pushToServer();
	}

	/**
	 * Save a full snapshot to the server (legacy method for compatibility).
	 * @deprecated Snapshots are now created automatically when thresholds are exceeded
	 */
	async saveSnapshot(): Promise<void> {
		await this.createAndPushSnapshot();
	}

	/**
	 * Force a full sync with the server.
	 * Useful for recovering from sync issues.
	 */
	async forceSync(): Promise<void> {
		this.lastSyncedVersion = null;
		await this.pushToServer();
	}

	/**
	 * Check if there are unpushed changes.
	 */
	async hasUnsavedChanges(): Promise<boolean> {
		return hasUnpushedOps(this.vaultId);
	}

	/**
	 * Disconnect and cleanup.
	 */
	async disconnect(): Promise<void> {
		// Cancel throttled sync
		this.throttledServerSync?.cancel();
		this.throttledServerSync = null;

		// Unsubscribe from local updates
		this.unsubscribeLocalUpdates?.();
		this.unsubscribeLocalUpdates = null;

		// Remove browser handlers
		if (typeof window !== "undefined") {
			if (this.visibilityHandler) {
				document.removeEventListener("visibilitychange", this.visibilityHandler);
				this.visibilityHandler = null;
			}
			if (this.beforeUnloadHandler) {
				window.removeEventListener("beforeunload", this.beforeUnloadHandler);
				this.beforeUnloadHandler = null;
			}
		}

		// Disconnect realtime
		await this.realtime?.unsubscribe();
		this.realtime = null;

		this.isInitialized = false;
		this.autoSyncEnabled = false;
	}

	/**
	 * Set sync state and notify listeners.
	 */
	private setSyncState(state: SyncState): void {
		this.onSyncStateChange?.(state);
	}

	/**
	 * Get whether the manager is initialized.
	 */
	get initialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * Get whether currently syncing.
	 */
	get syncing(): boolean {
		return this.isSyncing;
	}

	/**
	 * Get current sync state.
	 */
	get state(): SyncState {
		if (this.isSyncing) return "syncing";
		return "idle";
	}
}

// Reserved for future HLC-based ordering
// function generateHlcTimestamp(): string {
// 	const now = Temporal.Now.instant();
// 	const counter = Math.floor(Math.random() * 10000);
// 	return `${now.toString()}-${counter.toString().padStart(4, "0")}`;
// }

/**
 * Create a sync manager for a vault.
 */
export function createSyncManager(options: SyncManagerOptions): SyncManager {
	return new SyncManager(options);
}
