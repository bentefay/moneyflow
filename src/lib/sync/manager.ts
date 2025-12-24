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
  /** Called when remote updates are applied */
  onRemoteUpdate?: () => void;
  /** Called when sync state changes */
  onSyncStateChange?: (state: SyncState) => void;
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
  private realtime: VaultRealtimeSync | null = null;
  private onRemoteUpdate: (() => void) | undefined;
  private onSyncStateChange: ((state: SyncState) => void) | undefined;
  private lastSyncedVersion: VersionVector | null = null;
  private snapshotVersion = 0;
  private pendingUpdates: EncryptedUpdate[] = [];
  private isSyncing = false;
  private isInitialized = false;

  constructor(options: SyncManagerOptions) {
    this.vaultId = options.vaultId;
    this.pubkeyHash = options.pubkeyHash;
    this.vaultKey = options.vaultKey;
    this.doc = options.doc;
    this.onRemoteUpdate = options.onRemoteUpdate;
    this.onSyncStateChange = options.onSyncStateChange;
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
          if (update.createdBy === this.pubkeyHash) {
            return;
          }

          // Apply the update
          await this.applyRemoteUpdate(update.encryptedData);
        },
      });

      this.isInitialized = true;
      this.setSyncState("idle");
    } catch (error) {
      this.setSyncState("error");
      throw error;
    }
  }

  /**
   * Load initial state from the server.
   */
  private async loadInitialState(): Promise<void> {
    // This would use tRPC in a real implementation
    // For now, we'll load from the sync.getSnapshot endpoint
    // Note: This requires the tRPC client to be available
    console.log("SyncManager: Loading initial state...");
  }

  /**
   * Apply a remote update to the local document.
   */
  private async applyRemoteUpdate(encryptedData: string): Promise<void> {
    try {
      // Decrypt the update
      const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

      // The encrypted data includes nonce (24 bytes) + ciphertext
      // We need to decrypt and import
      // For now, this is a placeholder - actual decryption happens in snapshot.ts

      // Import the update into the document
      // importUpdates(this.doc, decryptedUpdate);

      this.onRemoteUpdate?.();
    } catch (error) {
      console.error("Failed to apply remote update:", error);
    }
  }

  /**
   * Push local changes to the server.
   */
  async pushChanges(): Promise<void> {
    if (this.isSyncing) {
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

      // Push to server
      // This would use tRPC: await trpc.sync.pushUpdate.mutate(...)
      console.log("SyncManager: Pushing changes...", {
        vaultId: this.vaultId,
        encryptedLength: encryptedUpdate.encryptedData.length,
      });

      // Update last synced version
      this.lastSyncedVersion = this.doc.version();

      this.setSyncState("idle");
    } catch (error) {
      this.setSyncState("error");
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
      // This would use tRPC: await trpc.sync.saveSnapshot.mutate(...)
      console.log("SyncManager: Saving snapshot...", {
        vaultId: this.vaultId,
        encryptedLength: encryptedSnapshot.encryptedData.length,
      });

      this.setSyncState("idle");
    } catch (error) {
      this.setSyncState("error");
      throw error;
    }
  }

  /**
   * Disconnect and cleanup.
   */
  async disconnect(): Promise<void> {
    await this.realtime?.unsubscribe();
    this.realtime = null;
    this.isInitialized = false;
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
}

/**
 * Create a sync manager for a vault.
 */
export function createSyncManager(options: SyncManagerOptions): SyncManager {
  return new SyncManager(options);
}
