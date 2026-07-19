/**
 * Supabase Realtime Sync
 *
 * Real-time synchronization of CRDT updates using Supabase Realtime.
 * Subscribes to vault_updates for live collaboration.
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";

import { createSupabaseClientForBrowser } from "./client";
import type { Database } from "./types";

type VaultUpdateRow = Database["public"]["Views"]["vault_updates"]["Row"];

export type VaultRealtimePurpose = "sync" | "presence";

type BrowserSupabaseClient = ReturnType<typeof createSupabaseClientForBrowser>;

const channelOperationQueues = new WeakMap<BrowserSupabaseClient, Map<string, Promise<void>>>();

function enqueueChannelOperation(
    client: BrowserSupabaseClient,
    topic: string,
    operation: () => Promise<void>
): Promise<void> {
    let clientQueue = channelOperationQueues.get(client);
    if (!clientQueue) {
        clientQueue = new Map();
        channelOperationQueues.set(client, clientQueue);
    }

    const previousOperation = clientQueue.get(topic) ?? Promise.resolve();
    const currentOperation = previousOperation.catch(() => undefined).then(operation);
    clientQueue.set(topic, currentOperation);

    return currentOperation.finally(() => {
        if (clientQueue.get(topic) === currentOperation) {
            clientQueue.delete(topic);
        }
    });
}

async function removeChannelsForTopic(client: BrowserSupabaseClient, topic: string): Promise<void> {
    const realtimeTopic = `realtime:${topic}`;
    const retainedChannels = client
        .getChannels()
        .filter((channel) => channel.topic === realtimeTopic);

    for (const retainedChannel of retainedChannels) {
        await client.removeChannel(retainedChannel);
    }
}

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
    private client: BrowserSupabaseClient | null = null;
    private topic: string | null = null;
    private vaultId: string;
    private pubkeyHash: string;
    private purpose: VaultRealtimePurpose;
    private onUpdate: OnUpdateCallback | null = null;
    private onPresence: OnPresenceCallback | null = null;
    private isSubscribed = false;

    constructor(vaultId: string, pubkeyHash: string, purpose: VaultRealtimePurpose = "sync") {
        this.vaultId = vaultId;
        this.pubkeyHash = pubkeyHash;
        this.purpose = purpose;
    }

    /**
     * Subscribe to vault updates.
     */
    async subscribe(options: {
        onUpdate?: OnUpdateCallback;
        onPresence?: OnPresenceCallback;
    }): Promise<void> {
        if (this.client) {
            console.warn("Already subscribed to vault updates");
            return;
        }

        this.onUpdate = options.onUpdate ?? null;
        this.onPresence = options.onPresence ?? null;

        const client = createSupabaseClientForBrowser();
        const topic = `vault:${this.vaultId}:${this.purpose}`;
        this.client = client;
        this.topic = topic;

        await enqueueChannelOperation(client, topic, async () => {
            // Supabase 2.110 reuses channels by topic. A React cleanup can still be waiting for
            // the server's leave acknowledgement when the same vault remounts, so finish removing
            // any retained channel before registering callbacks on a fresh instance.
            await removeChannelsForTopic(client, topic);

            if (this.client !== client || this.topic !== topic) {
                return;
            }

            const channel = client.channel(topic, {
                config: {
                    presence: {
                        key: this.pubkeyHash
                    }
                }
            });
            this.channel = channel;

            if (this.onUpdate) {
                channel.on<VaultUpdateRow>(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "vault_updates",
                        filter: `vault_id=eq.${this.vaultId}`
                    },
                    (payload: RealtimePostgresChangesPayload<VaultUpdateRow>) => {
                        if (payload.new && this.onUpdate && "id" in payload.new) {
                            const row = payload.new as VaultUpdateRow;
                            if (
                                row.id == null ||
                                row.encrypted_data == null ||
                                row.base_snapshot_version == null ||
                                row.hlc_timestamp == null ||
                                row.author_pubkey_hash == null
                            ) {
                                return;
                            }
                            this.onUpdate({
                                id: row.id,
                                encryptedData: row.encrypted_data,
                                baseSnapshotVersion: row.base_snapshot_version,
                                hlcTimestamp: row.hlc_timestamp,
                                authorPubkeyHash: row.author_pubkey_hash,
                                createdAt: row.created_at ?? Temporal.Now.instant().toString()
                            });
                        }
                    }
                );
            }

            if (this.onPresence) {
                channel.on("presence", { event: "sync" }, () => {
                    if (this.channel !== channel || !this.onPresence) return;

                    const state = channel.presenceState();
                    const presenceList = Object.entries(state).map(([key, presences]) => {
                        const latest = presences[presences.length - 1] as {
                            joined_at?: string;
                            last_seen?: string;
                        };
                        return {
                            userId: key,
                            joinedAt: latest.joined_at ?? Temporal.Now.instant().toString(),
                            lastSeen: latest.last_seen ?? Temporal.Now.instant().toString()
                        };
                    });
                    this.onPresence(presenceList);
                });
            }

            channel.subscribe(async (status) => {
                if (status !== "SUBSCRIBED" || this.channel !== channel) return;

                this.isSubscribed = true;
                await channel.track({
                    joined_at: Temporal.Now.instant().toString(),
                    last_seen: Temporal.Now.instant().toString()
                });
            });
        });
    }

    /**
     * Update presence timestamp (call periodically).
     */
    async updatePresence(): Promise<void> {
        if (this.channel && this.isSubscribed) {
            await this.channel.track({
                joined_at: Temporal.Now.instant().toString(),
                last_seen: Temporal.Now.instant().toString()
            });
        }
    }

    /**
     * Unsubscribe from vault updates.
     */
    async unsubscribe(): Promise<void> {
        const channel = this.channel;
        const client = this.client;
        const topic = this.topic;

        this.channel = null;
        this.client = null;
        this.topic = null;
        this.isSubscribed = false;
        this.onUpdate = null;
        this.onPresence = null;

        if (!client || !topic) return;

        await enqueueChannelOperation(client, topic, async () => {
            if (channel) {
                await client.removeChannel(channel);
                return;
            }

            await removeChannelsForTopic(client, topic);
        });
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
export function createVaultRealtimeSync(
    vaultId: string,
    pubkeyHash: string,
    purpose: VaultRealtimePurpose = "sync"
): VaultRealtimeSync {
    return new VaultRealtimeSync(vaultId, pubkeyHash, purpose);
}
