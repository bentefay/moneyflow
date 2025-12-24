/**
 * Ephemeral Presence Manager
 *
 * Manages ephemeral presence data (cursors, selections, typing indicators)
 * that doesn't need persistence but requires real-time sync.
 */

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Presence data broadcasted by each user.
 */
export interface PresenceData {
  /** User's pubkey hash */
  userId: string;
  /** Display name (optional) */
  name?: string;
  /** Currently focused transaction ID */
  focusedTransactionId?: string;
  /** Currently editing field */
  editingField?: {
    transactionId: string;
    fieldName: string;
  };
  /** Cursor position (for future collaborative editing) */
  cursor?: {
    x: number;
    y: number;
  };
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Callback for presence state changes.
 */
export type OnPresenceStateChange = (users: PresenceData[]) => void;

/**
 * Manages ephemeral presence for a vault.
 */
export class EphemeralPresenceManager {
  private channel: RealtimeChannel | null = null;
  private vaultId: string;
  private userId: string;
  private localPresence: Omit<PresenceData, "userId" | "updatedAt"> = {};
  private onStateChange: OnPresenceStateChange | null = null;
  private isSubscribed = false;
  private broadcastThrottle: NodeJS.Timeout | null = null;
  private broadcastDelay = 100; // Throttle broadcasts to 100ms

  constructor(vaultId: string, userId: string) {
    this.vaultId = vaultId;
    this.userId = userId;
  }

  /**
   * Subscribe to presence updates.
   */
  subscribe(onStateChange: OnPresenceStateChange): void {
    if (this.isSubscribed) {
      console.warn("Already subscribed to presence");
      return;
    }

    this.onStateChange = onStateChange;
    const supabase = createSupabaseBrowser();

    // Create presence channel
    this.channel = supabase.channel(`presence:${this.vaultId}`, {
      config: {
        presence: {
          key: this.userId,
        },
      },
    });

    // Listen for presence sync events
    this.channel
      .on("presence", { event: "sync" }, () => {
        this.handlePresenceSync();
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("Presence join:", key, newPresences);
        this.handlePresenceSync();
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("Presence leave:", key, leftPresences);
        this.handlePresenceSync();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.isSubscribed = true;
          // Broadcast initial presence
          await this.broadcast();
        }
      });
  }

  /**
   * Handle presence state synchronization.
   */
  private handlePresenceSync(): void {
    if (!this.channel || !this.onStateChange) return;

    const state = this.channel.presenceState();
    const users: PresenceData[] = [];

    for (const [userId, presences] of Object.entries(state)) {
      // Get the most recent presence for this user
      const latest = presences[presences.length - 1] as Record<string, unknown>;
      users.push({
        userId,
        name: latest.name as string | undefined,
        focusedTransactionId: latest.focusedTransactionId as string | undefined,
        editingField: latest.editingField as PresenceData["editingField"],
        cursor: latest.cursor as PresenceData["cursor"],
        updatedAt: (latest.updatedAt as number) ?? Date.now(),
      });
    }

    this.onStateChange(users);
  }

  /**
   * Update local presence state.
   */
  updatePresence(data: Partial<Omit<PresenceData, "userId" | "updatedAt">>): void {
    this.localPresence = { ...this.localPresence, ...data };
    this.scheduleBroadcast();
  }

  /**
   * Set the currently focused transaction.
   */
  setFocusedTransaction(transactionId: string | undefined): void {
    this.updatePresence({ focusedTransactionId: transactionId });
  }

  /**
   * Set the currently editing field.
   */
  setEditingField(transactionId: string, fieldName: string): void {
    this.updatePresence({
      editingField: { transactionId, fieldName },
    });
  }

  /**
   * Clear the editing field.
   */
  clearEditingField(): void {
    this.updatePresence({ editingField: undefined });
  }

  /**
   * Update cursor position.
   */
  setCursor(x: number, y: number): void {
    this.updatePresence({ cursor: { x, y } });
  }

  /**
   * Schedule a throttled broadcast.
   */
  private scheduleBroadcast(): void {
    if (this.broadcastThrottle) {
      return; // Already scheduled
    }

    this.broadcastThrottle = setTimeout(() => {
      this.broadcast();
      this.broadcastThrottle = null;
    }, this.broadcastDelay);
  }

  /**
   * Broadcast current presence state.
   */
  private async broadcast(): Promise<void> {
    if (!this.channel || !this.isSubscribed) return;

    await this.channel.track({
      ...this.localPresence,
      updatedAt: Date.now(),
    });
  }

  /**
   * Unsubscribe from presence updates.
   */
  async unsubscribe(): Promise<void> {
    if (this.broadcastThrottle) {
      clearTimeout(this.broadcastThrottle);
      this.broadcastThrottle = null;
    }

    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.isSubscribed = false;
    this.onStateChange = null;
    this.localPresence = {};
  }

  /**
   * Check if currently subscribed.
   */
  get subscribed(): boolean {
    return this.isSubscribed;
  }
}

/**
 * Create an ephemeral presence manager for a vault.
 */
export function createEphemeralPresenceManager(
  vaultId: string,
  userId: string
): EphemeralPresenceManager {
  return new EphemeralPresenceManager(vaultId, userId);
}
