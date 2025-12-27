/**
 * Supabase Realtime Sync
 *
 * Real-time synchronization of CRDT updates using Supabase Realtime.
 * Subscribes to vault_updates for live collaboration.
 */

import { createSupabaseClientForBrowser } from "./client";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database } from "./types";

type VaultUpdateRow = Database["public"]["Tables"]["vault_updates"]["Row"];

/**
 * Callback for receiving new updates.
 */
export type OnUpdateCallback = (update: {
  id: string;
  encryptedData: string;
  baseSnapshotVersion: number;
  hlcTimestamp: string;
  authorPubkeyHash: string;
  createdAt: string;
}) => void;

/**
 * Callback for presence changes.
 */
export type OnPresenceCallback = (
  presence: {
    userId: string;
    joinedAt: string;
    lastSeen: string;
  }[]
) => void;

/**
 * Manages real-time sync for a vault.
 */
export class VaultRealtimeSync {
  private channel: RealtimeChannel | null = null;
  private vaultId: string;
  private pubkeyHash: string;
  private onUpdate: OnUpdateCallback | null = null;
  private onPresence: OnPresenceCallback | null = null;
  private isSubscribed = false;

  constructor(vaultId: string, pubkeyHash: string) {
    this.vaultId = vaultId;
    this.pubkeyHash = pubkeyHash;
  }

  /**
   * Subscribe to vault updates.
   */
  subscribe(options: { onUpdate?: OnUpdateCallback; onPresence?: OnPresenceCallback }): void {
    if (this.isSubscribed) {
      console.warn("Already subscribed to vault updates");
      return;
    }

    this.onUpdate = options.onUpdate ?? null;
    this.onPresence = options.onPresence ?? null;

    const supabase = createSupabaseClientForBrowser();

    // Create channel for this vault
    this.channel = supabase.channel(`vault:${this.vaultId}`, {
      config: {
        presence: {
          key: this.pubkeyHash,
        },
      },
    });

    // Subscribe to vault_updates inserts
    this.channel
      .on<VaultUpdateRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vault_updates",
          filter: `vault_id=eq.${this.vaultId}`,
        },
        (payload: RealtimePostgresChangesPayload<VaultUpdateRow>) => {
          if (payload.new && this.onUpdate && "id" in payload.new) {
            const row = payload.new as VaultUpdateRow;
            this.onUpdate({
              id: row.id,
              encryptedData: row.encrypted_data,
              baseSnapshotVersion: row.base_snapshot_version,
              hlcTimestamp: row.hlc_timestamp,
              authorPubkeyHash: row.author_pubkey_hash,
              createdAt: row.created_at ?? new Date().toISOString(),
            });
          }
        }
      )
      // Track presence
      .on("presence", { event: "sync" }, () => {
        if (this.channel && this.onPresence) {
          const state = this.channel.presenceState();
          const presenceList = Object.entries(state).map(([key, presences]) => {
            const latest = presences[presences.length - 1] as {
              joined_at?: string;
              last_seen?: string;
            };
            return {
              userId: key,
              joinedAt: latest.joined_at ?? new Date().toISOString(),
              lastSeen: latest.last_seen ?? new Date().toISOString(),
            };
          });
          this.onPresence(presenceList);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.isSubscribed = true;
          // Track this user's presence
          await this.channel?.track({
            joined_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
          });
        }
      });
  }

  /**
   * Update presence timestamp (call periodically).
   */
  async updatePresence(): Promise<void> {
    if (this.channel && this.isSubscribed) {
      await this.channel.track({
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });
    }
  }

  /**
   * Unsubscribe from vault updates.
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
      this.isSubscribed = false;
      this.onUpdate = null;
      this.onPresence = null;
    }
  }

  /**
   * Check if currently subscribed.
   */
  get subscribed(): boolean {
    return this.isSubscribed;
  }
}

/**
 * Create a realtime sync instance for a vault.
 */
export function createVaultRealtimeSync(vaultId: string, pubkeyHash: string): VaultRealtimeSync {
  return new VaultRealtimeSync(vaultId, pubkeyHash);
}
