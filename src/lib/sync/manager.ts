/**
 * Sync Manager
 *
 * Coordinates sending and receiving encrypted CRDT updates.
 * Manages local state, remote sync, and conflict resolution.
 */

import { LoroDoc, VersionVector } from "loro-crdt";
import {
  createEncryptedUpdate,
  createEncryptedSnapshot,
  loadEncryptedSnapshot,
  decryptUpdate,
  type EncryptedUpdate,
  type EncryptedSnapshot,
} from "@/lib/crdt/snapshot";
import { exportSnapshot, exportUpdates, importUpdates, getVersionEncoded } from "@/lib/crdt/sync";
import { VaultRealtimeSync, createVaultRealtimeSync } from "@/lib/supabase/realtime";

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
        query: (input: {
          vaultId: string;
        }) => Promise<{ encryptedData: string; version: number } | null>;
      };
      saveSnapshot: {
        mutate: (input: {
          vaultId: string;
          encryptedData: string;
          versionVector: string;
          version: number;
        }) => Promise<void>;
      };
      getUpdates: {
        query: (input: {
          vaultId: string;
          afterVersion?: number;
          limit?: number;
        }) => Promise<{ id: string; encryptedData: string }[]>;
      };
      pushUpdate: {
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
export type SyncState = "idle" | "syncing" | "error";

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
  private pendingUpdates: EncryptedUpdate[] = [];
  private isSyncing = false;
  private isInitialized = false;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSyncEnabled = true;

  constructor(options: SyncManagerOptions) {
    this.vaultId = options.vaultId;
    this.pubkeyHash = options.pubkeyHash;
    this.vaultKey = options.vaultKey;
    this.doc = options.doc;
    this.trpc = options.trpc;
    this.onRemoteUpdate = options.onRemoteUpdate;
    this.onSyncStateChange = options.onSyncStateChange;
    this.onError = options.onError;
  }

  /**
   * Initialize the sync manager.
   * Loads initial state from server and subscribes to updates.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.setSyncState("syncing");

    try {
      // Load initial snapshot from server
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
   */
  private setupAutoSync(): void {
    // Subscribe to document changes
    this.doc.subscribe((event) => {
      if (!this.autoSyncEnabled) return;
      if (event.by === "import") return; // Don't sync imported changes (they came from remote)

      // Debounce sync to batch rapid changes
      if (this.syncDebounceTimer) {
        clearTimeout(this.syncDebounceTimer);
      }

      this.syncDebounceTimer = setTimeout(() => {
        this.pushChanges().catch((error) => {
          console.error("Auto-sync failed:", error);
          this.onError?.(error instanceof Error ? error : new Error(String(error)));
        });
      }, 500);
    });
  }

  /**
   * Load initial state from the server.
   */
  private async loadInitialState(): Promise<void> {
    if (!this.trpc) {
      console.log("SyncManager: No tRPC client, skipping initial load");
      return;
    }

    try {
      // Get the latest snapshot
      const snapshot = await this.trpc.sync.getSnapshot.query({ vaultId: this.vaultId });

      if (snapshot) {
        // Decrypt and load the snapshot
        const decryptedDoc = await loadEncryptedSnapshot(
          {
            encryptedData: snapshot.encryptedData,
            version: snapshot.version,
          },
          this.vaultKey
        );

        // Import the snapshot into our document
        const snapshotBytes = decryptedDoc.export({ mode: "snapshot" });
        this.doc.import(snapshotBytes);
        this.snapshotVersion = snapshot.version;

        // Get any updates after the snapshot
        const updates = await this.trpc.sync.getUpdates.query({
          vaultId: this.vaultId,
          afterVersion: snapshot.version,
        });

        // Apply each update
        for (const update of updates) {
          await this.applyRemoteUpdate(update.encryptedData);
        }
      }

      // Store current version as last synced
      this.lastSyncedVersion = this.doc.version();

      console.log("SyncManager: Initial state loaded successfully");
    } catch (error) {
      console.error("Failed to load initial state:", error);
      throw error;
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
      const decryptedUpdate = await decryptUpdate(
        { encryptedData, baseSnapshotVersion: this.snapshotVersion },
        this.vaultKey
      );

      // Import the update into the document
      importUpdates(this.doc, decryptedUpdate);

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
   * Push local changes to the server.
   */
  async pushChanges(): Promise<void> {
    if (this.isSyncing || !this.trpc) {
      return;
    }

    this.isSyncing = true;
    this.setSyncState("syncing");

    try {
      // Export updates since last sync
      const updates = this.lastSyncedVersion
        ? exportUpdates(this.doc, this.lastSyncedVersion)
        : exportSnapshot(this.doc);

      if (updates.byteLength === 0) {
        // No changes
        this.setSyncState("idle");
        return;
      }

      // Encrypt the update
      const encryptedUpdate = await createEncryptedUpdate(
        this.doc,
        this.vaultKey,
        this.snapshotVersion,
        this.lastSyncedVersion ?? undefined
      );

      // Get version vector
      const versionVector = btoa(String.fromCharCode(...getVersionEncoded(this.doc)));

      // Generate HLC timestamp
      const hlcTimestamp = generateHlcTimestamp();

      // Push to server
      await this.trpc.sync.pushUpdate.mutate({
        vaultId: this.vaultId,
        encryptedData: encryptedUpdate.encryptedData,
        baseSnapshotVersion: this.snapshotVersion,
        hlcTimestamp,
        versionVector,
      });

      // Update last synced version
      this.lastSyncedVersion = this.doc.version();

      this.setSyncState("idle");
    } catch (error) {
      this.setSyncState("error");
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Save a full snapshot to the server.
   * Used periodically to compact updates.
   */
  async saveSnapshot(): Promise<void> {
    if (!this.trpc) {
      console.log("SyncManager: No tRPC client, skipping snapshot save");
      return;
    }

    this.setSyncState("syncing");

    try {
      this.snapshotVersion++;
      const encryptedSnapshot = await createEncryptedSnapshot(
        this.doc,
        this.vaultKey,
        this.snapshotVersion
      );

      const versionVector = btoa(String.fromCharCode(...getVersionEncoded(this.doc)));

      // Push to server
      await this.trpc.sync.saveSnapshot.mutate({
        vaultId: this.vaultId,
        encryptedData: encryptedSnapshot.encryptedData,
        versionVector,
        version: this.snapshotVersion,
      });

      console.log("SyncManager: Snapshot saved successfully");
      this.setSyncState("idle");
    } catch (error) {
      this.snapshotVersion--; // Rollback version on error
      this.setSyncState("error");
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Force a full sync with the server.
   * Useful for recovering from sync issues.
   */
  async forceSync(): Promise<void> {
    this.lastSyncedVersion = null;
    await this.pushChanges();
  }

  /**
   * Disconnect and cleanup.
   */
  async disconnect(): Promise<void> {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }

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

/**
 * Generate a Hybrid Logical Clock timestamp.
 * Format: ISO timestamp with a counter suffix for ordering.
 */
function generateHlcTimestamp(): string {
  const now = Date.now();
  const counter = Math.floor(Math.random() * 10000);
  return `${new Date(now).toISOString()}-${counter.toString().padStart(4, "0")}`;
}

/**
 * Create a sync manager for a vault.
 */
export function createSyncManager(options: SyncManagerOptions): SyncManager {
  return new SyncManager(options);
}
