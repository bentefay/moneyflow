/**
 * Vault-scoped Supabase Realtime transport.
 *
 * Credentials are minted through the signed tRPC boundary, held only in memory, and supplied to an
 * isolated client so one vault/purpose cannot authorize another socket. Realtime carries only
 * permanent encrypted vault operations; snapshots remain server-pulled cache material.
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";

import { createTRPCClient } from "@/lib/trpc/client";
import type { RealtimeCredential, RealtimePurpose } from "@/server/schemas/realtime";

import { createSupabaseClientForRealtime } from "./client";
import type { Database } from "./types";

type VaultOpRow = Database["public"]["Tables"]["vault_ops"]["Row"];
type RealtimeClient = ReturnType<typeof createSupabaseClientForRealtime>;

export type VaultRealtimePurpose = RealtimePurpose;

export interface RealtimeAuthorizationApi {
    authorize(input: {
        vaultId: string;
        purpose: RealtimePurpose;
        previousGrantId?: string;
    }): Promise<RealtimeCredential>;
    revoke(input: {
        vaultId: string;
        purpose: RealtimePurpose;
        grantId: string;
    }): Promise<{ revoked: boolean }>;
}

export type OnUpdateCallback = (update: {
    id: string;
    encryptedData: string;
    versionVector: string;
    authorPubkeyHash: string;
    createdAt: string;
}) => void | Promise<void>;

export type OnPresenceCallback = (
    presence: {
        userId: string;
        joinedAt: string;
        lastSeen: string;
    }[]
) => void;

function createAuthorizationApi(): RealtimeAuthorizationApi {
    const client = createTRPCClient();
    return {
        authorize: (input) => client.realtime.authorize.mutate(input),
        revoke: (input) => client.realtime.revoke.mutate(input)
    };
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVaultOpRow(value: unknown): value is VaultOpRow {
    return (
        isUnknownRecord(value) &&
        typeof value.id === "string" &&
        typeof value.vault_id === "string" &&
        typeof value.encrypted_data === "string" &&
        typeof value.version_vector === "string" &&
        typeof value.author_pubkey_hash === "string"
    );
}

function readPresenceTimestamp(value: unknown, key: "joined_at" | "last_seen"): string {
    if (!isUnknownRecord(value)) return Temporal.Now.instant().toString();
    const timestamp = value[key];
    return typeof timestamp === "string" ? timestamp : Temporal.Now.instant().toString();
}

/** Serializes short-lived token refresh and explicit revocation for one vault/purpose. */
export class RealtimeCredentialManager {
    private current: RealtimeCredential | null = null;
    private pending: Promise<RealtimeCredential> | null = null;
    private closed = false;

    constructor(
        private readonly vaultId: string,
        private readonly purpose: RealtimePurpose,
        private readonly api: RealtimeAuthorizationApi,
        private readonly now: () => number = Date.now
    ) {}

    async getAccessToken(): Promise<string> {
        if (this.closed) throw new Error("Realtime credential manager is closed");
        if (this.current && this.now() < Date.parse(this.current.refreshAt)) {
            return this.current.token;
        }
        if (!this.pending) {
            const previousGrantId = this.current?.grantId;
            const request = this.api
                .authorize({
                    vaultId: this.vaultId,
                    purpose: this.purpose,
                    ...(previousGrantId ? { previousGrantId } : {})
                })
                .then((credential) => {
                    if (
                        credential.vaultId !== this.vaultId ||
                        credential.purpose !== this.purpose ||
                        Date.parse(credential.expiresAt) <= this.now()
                    ) {
                        throw new Error("Realtime credential scope is invalid");
                    }
                    this.current = credential;
                    return credential;
                });
            const pending = request.finally(() => {
                if (this.pending === pending) this.pending = null;
            });
            this.pending = pending;
        }
        return (await this.pending).token;
    }

    async revoke(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        try {
            await this.pending;
        } catch {
            // A failed mint created no usable browser credential.
        }
        const active = this.current;
        this.current = null;
        this.pending = null;
        if (active) {
            await this.api.revoke({
                vaultId: this.vaultId,
                purpose: this.purpose,
                grantId: active.grantId
            });
        }
    }
}

export class VaultRealtimeSync {
    private channel: RealtimeChannel | null = null;
    private client: RealtimeClient | null = null;
    private credentialManager: RealtimeCredentialManager | null = null;
    private onUpdate: OnUpdateCallback | null = null;
    private onPresence: OnPresenceCallback | null = null;
    private isSubscribed = false;
    private generation = 0;
    private readonly presenceKey = crypto.randomUUID();

    constructor(
        private readonly vaultId: string,
        private readonly purpose: RealtimePurpose = "sync",
        private readonly authorizationApi: RealtimeAuthorizationApi = createAuthorizationApi()
    ) {}

    async subscribe(options: {
        onUpdate?: OnUpdateCallback;
        onPresence?: OnPresenceCallback;
        onReconnect?: () => void | Promise<void>;
    }): Promise<void> {
        if (this.client) return;

        const generation = ++this.generation;
        this.onUpdate = options.onUpdate ?? null;
        this.onPresence = options.onPresence ?? null;
        const credentials = new RealtimeCredentialManager(
            this.vaultId,
            this.purpose,
            this.authorizationApi
        );
        this.credentialManager = credentials;

        // Fail before opening a socket if signed membership authorization cannot mint a grant.
        await credentials.getAccessToken();
        if (generation !== this.generation) return;

        const client = createSupabaseClientForRealtime(() => credentials.getAccessToken());
        // SupabaseClient starts its constructor auth callback asynchronously. Await the same
        // callback explicitly so the first phx_join cannot race ahead with the anon API key.
        await client.realtime.setAuth();
        if (generation !== this.generation) {
            client.realtime.disconnect();
            return;
        }
        const topic = `vault:${this.vaultId}:${this.purpose}`;
        const channel = client.channel(topic, {
            config: {
                private: true,
                ...(this.purpose === "presence" ? { presence: { key: this.presenceKey } } : {})
            }
        });
        this.client = client;
        this.channel = channel;

        if (this.purpose === "sync" && this.onUpdate) {
            channel.on<VaultOpRow>(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "vault_ops",
                    filter: `vault_id=eq.${this.vaultId}`
                },
                (payload: RealtimePostgresChangesPayload<VaultOpRow>) => {
                    if (
                        generation !== this.generation ||
                        this.channel !== channel ||
                        !this.onUpdate ||
                        !isVaultOpRow(payload.new) ||
                        payload.new.vault_id !== this.vaultId
                    ) {
                        return;
                    }
                    void this.onUpdate({
                        id: payload.new.id,
                        encryptedData: payload.new.encrypted_data,
                        versionVector: payload.new.version_vector,
                        authorPubkeyHash: payload.new.author_pubkey_hash,
                        createdAt: payload.new.created_at ?? Temporal.Now.instant().toString()
                    });
                }
            );
        }

        if (this.purpose === "presence" && this.onPresence) {
            channel.on("presence", { event: "sync" }, () => {
                if (
                    generation !== this.generation ||
                    this.channel !== channel ||
                    !this.onPresence
                ) {
                    return;
                }
                const state = channel.presenceState();
                const presence = Object.entries(state).flatMap(([key, entries]) => {
                    const latest = entries.at(-1);
                    return latest
                        ? [
                              {
                                  userId: key,
                                  joinedAt: readPresenceTimestamp(latest, "joined_at"),
                                  lastSeen: readPresenceTimestamp(latest, "last_seen")
                              }
                          ]
                        : [];
                });
                this.onPresence(presence);
            });
        }

        await new Promise<void>((resolve, reject) => {
            let connectedOnce = false;
            channel.subscribe((status) => {
                if (generation !== this.generation || this.channel !== channel) return;
                if (status === "SUBSCRIBED") {
                    this.isSubscribed = true;
                    if (this.purpose === "presence") void this.updatePresence();
                    if (connectedOnce) void options.onReconnect?.();
                    connectedOnce = true;
                    resolve();
                    return;
                }
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    this.isSubscribed = false;
                    if (!connectedOnce) reject(new Error("Realtime connection failed"));
                    return;
                }
                if (status === "CLOSED") this.isSubscribed = false;
            });
        });
    }

    async updatePresence(): Promise<void> {
        if (!this.channel || !this.isSubscribed || this.purpose !== "presence") return;
        const now = Temporal.Now.instant().toString();
        await this.channel.track({ joined_at: now, last_seen: now });
    }

    async unsubscribe(): Promise<void> {
        ++this.generation;
        const channel = this.channel;
        const client = this.client;
        const credentials = this.credentialManager;

        this.channel = null;
        this.client = null;
        this.credentialManager = null;
        this.onUpdate = null;
        this.onPresence = null;
        this.isSubscribed = false;

        try {
            if (client && channel) await client.removeChannel(channel);
        } finally {
            client?.realtime.disconnect();
            await credentials?.revoke();
        }
    }

    get subscribed(): boolean {
        return this.isSubscribed;
    }
}

export function createVaultRealtimeSync(
    vaultId: string,
    purpose: RealtimePurpose = "sync",
    authorizationApi?: RealtimeAuthorizationApi
): VaultRealtimeSync {
    return new VaultRealtimeSync(vaultId, purpose, authorizationApi);
}
