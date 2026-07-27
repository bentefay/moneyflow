/**
 * Loro ephemeral presence manager (HS-003).
 *
 * Owns one Loro `EphemeralStore` per vault session and pumps it over the P05-authorized realtime
 * channel. Replaces the earlier Supabase-Presence-only manager that merely *named* itself
 * ephemeral: presence state is now a real Loro CRDT with timestamp-LWW merge and automatic expiry,
 * and it lives entirely outside the vault `LoroDoc`.
 *
 * Guarantees this class is responsible for:
 *
 * - **Never durable.** The store is a standalone `EphemeralStore`. Nothing here touches the vault
 *   document, the undo manager, IndexedDB or the server op log, so presence cannot enter history.
 * - **Always encrypted.** Local updates are sealed with the vault-derived presence key before they
 *   reach the socket; inbound payloads are authenticated before they reach the store.
 * - **Per-tab identity.** The session id is minted per manager instance, so duplicate tabs of one
 *   identity are distinct peers.
 * - **Bounded traffic.** A refresh timer republishes unchanged state well inside the expiry window
 *   instead of a per-keystroke heartbeat.
 */

import { EphemeralStore } from "loro-crdt";

import { createVaultRealtimeSync, type VaultRealtimeSync } from "@/lib/supabase/realtime";

import {
    applyPresenceUpdate,
    buildTransactionPresence,
    createPresenceEntry,
    IDLE_PRESENCE_STATE,
    isSamePresenceState,
    openPresenceEnvelope,
    PRESENCE_REFRESH_MS,
    PRESENCE_TIMEOUT_MS,
    type PresenceSession,
    type PresenceState,
    readOnlineIdentities,
    readPresenceSessions,
    sealPresenceUpdate,
    type TransactionPresence
} from "./presence-protocol";

/** Snapshot handed to the UI on every presence change. */
export interface PresenceSnapshot {
    readonly sessions: readonly PresenceSession[];
    readonly onlineIdentities: readonly string[];
    readonly byTransactionId: Readonly<Record<string, TransactionPresence>>;
}

export type OnPresenceSnapshot = (snapshot: PresenceSnapshot) => void;

export interface PresenceManagerOptions {
    readonly vaultId: string;
    readonly pubkeyHash: string;
    /** 32-byte vault-derived presence key from `derivePresenceKey`. */
    readonly presenceKey: Uint8Array;
    /** Injected for tests; defaults to the P05 realtime transport. */
    readonly createTransport?: (vaultId: string) => VaultRealtimeSync;
}

const EMPTY_SNAPSHOT: PresenceSnapshot = {
    sessions: [],
    onlineIdentities: [],
    byTransactionId: {}
};

/**
 * A vault presence session backed by a Loro `EphemeralStore`.
 *
 * One instance per browser tab. Not reused across vaults — the presence key is vault-scoped, so a
 * vault switch disposes this manager and constructs another.
 */
export class EphemeralPresenceManager {
    private readonly store = new EphemeralStore(PRESENCE_TIMEOUT_MS);
    /**
     * Staging store used to prove an inbound update only writes its own session key. Kept for the
     * manager's lifetime because construction is not free and it is always emptied after use.
     */
    private readonly scratch = new EphemeralStore(PRESENCE_TIMEOUT_MS);
    private readonly sessionId = crypto.randomUUID();

    private transport: VaultRealtimeSync | null = null;
    private onSnapshot: OnPresenceSnapshot | null = null;
    private unsubscribeStore: (() => void) | null = null;
    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private state: PresenceState = IDLE_PRESENCE_STATE;
    private disposed = false;
    /** Guards against overlapping publishes reordering on a slow socket. */
    private publishChain: Promise<void> = Promise.resolve();
    /** Serializes inbound merges so a stale prune cannot undo a newer apply. */
    private ingestChain: Promise<void> = Promise.resolve();
    /** Sessions that left the channel but whose store entry has not yet expired. */
    private absentSessions: ReadonlySet<string> = new Set();

    constructor(private readonly options: PresenceManagerOptions) {}

    /** This tab's session identifier. Distinct per tab even when the identity is shared. */
    get id(): string {
        return this.sessionId;
    }

    get subscribed(): boolean {
        return this.transport != null;
    }

    /**
     * Connects to the vault presence channel and begins publishing.
     *
     * Presence is best-effort: a failure here leaves the app fully usable without indicators, so
     * callers may let the rejection surface without degrading editing.
     */
    async connect(onSnapshot: OnPresenceSnapshot): Promise<void> {
        if (this.disposed || this.transport) return;

        this.onSnapshot = onSnapshot;
        const createTransport = this.options.createTransport ?? defaultTransport;
        const transport = createTransport(this.options.vaultId);
        this.transport = transport;

        this.unsubscribeStore = this.store.subscribe(() => this.emit());

        try {
            await transport.subscribe({
                onPresence: (entries) => {
                    if (this.transport !== transport) return;
                    void this.ingest(entries);
                },
                // A reconnect gives us a fresh channel with no tracked state, so republish
                // immediately rather than waiting out the refresh interval.
                onReconnect: () => this.publish()
            });
        } catch (error) {
            if (this.transport === transport) this.transport = null;
            this.unsubscribeStore?.();
            this.unsubscribeStore = null;
            await transport.unsubscribe();
            throw error;
        }

        if (this.transport !== transport) {
            await transport.unsubscribe();
            return;
        }

        this.refreshTimer = setInterval(() => void this.publish(), PRESENCE_REFRESH_MS);
        await this.publish();
    }

    /**
     * Declares what this session is focused on. A no-op when the state is unchanged, so table
     * re-renders and repeated focus events cannot generate socket traffic.
     */
    async setState(state: PresenceState): Promise<void> {
        if (this.disposed || isSamePresenceState(this.state, state)) return;
        this.state = state;
        await this.publish();
    }

    /** Clears row focus while staying connected — used on blur, route change and unmount. */
    async clearFocus(): Promise<void> {
        await this.setState(IDLE_PRESENCE_STATE);
    }

    /**
     * Synchronously retracts this session from the channel.
     *
     * For page teardown (`pagehide`), where nothing async is guaranteed to complete. Peers see the
     * departure at once; the credential revocation in {@link disconnect} is left to whatever time
     * the browser allows, and the server-side grant expires on its own regardless.
     */
    retract(): void {
        this.transport?.retractPresence();
    }

    /**
     * Disconnects and tears down. Untracking removes this session from every peer's channel state
     * immediately, so a deliberate leave shows up at once rather than after the expiry window.
     */
    async disconnect(): Promise<void> {
        this.disposed = true;
        const transport = this.transport;
        this.transport = null;
        this.onSnapshot = null;

        if (this.refreshTimer != null) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.unsubscribeStore?.();
        this.unsubscribeStore = null;

        await transport?.unsubscribe();
        this.store.destroy();
        this.scratch.destroy();
    }

    /** Writes local state into the store and publishes the resulting encrypted update. */
    private publish(): Promise<void> {
        const send = async () => {
            const transport = this.transport;
            if (this.disposed || !transport) return;

            this.store.set(
                this.sessionId,
                createPresenceEntry(this.sessionId, this.options.pubkeyHash, this.state)
            );
            const envelope = await sealPresenceUpdate(
                this.store.encode(this.sessionId),
                { vaultId: this.options.vaultId, sessionId: this.sessionId },
                this.options.presenceKey
            );
            if (this.transport !== transport) return;
            await transport.updatePresence(envelope);
        };

        this.publishChain = this.publishChain.then(send, send);
        return this.publishChain;
    }

    /**
     * Authenticates and merges inbound payloads, then emits a fresh snapshot.
     *
     * Serialized behind {@link ingestChain}: decryption is async, so two overlapping channel events
     * could otherwise interleave and let the earlier one's prune pass delete a session the later one
     * had just re-added. Loro's LWW cannot resolve that for us because a prune and a same-
     * millisecond republish carry the same timestamp.
     */
    private ingest(entries: readonly { readonly payload?: unknown }[]): Promise<void> {
        const merge = () => this.mergeEntries(entries);
        this.ingestChain = this.ingestChain.then(merge, merge);
        return this.ingestChain;
    }

    private async mergeEntries(entries: readonly { readonly payload?: unknown }[]): Promise<void> {
        if (this.disposed) return;
        const live = new Set<string>();
        let changed = false;

        for (const entry of entries) {
            const opened = await openPresenceEnvelope(
                entry.payload,
                { vaultId: this.options.vaultId, sessionId: this.sessionId },
                this.options.presenceKey
            );
            if (!opened.ok) continue;
            live.add(opened.sessionId);
            if (applyPresenceUpdate(this.store, this.scratch, opened.sessionId, opened.update)) {
                changed = true;
            }
        }

        // A session that left the channel is gone now, not in 30s — but we record that as a filter
        // rather than deleting the key. `EphemeralStore.delete` writes a local tombstone with the
        // current timestamp, and Loro's LWW then suppresses the peer's *next* update whenever the
        // two share a millisecond, silently hiding a session that has rejoined. Filtering keeps
        // departure instant while leaving the CRDT free to re-add. Loro expiry remains the backstop
        // for sessions that vanish without a clean leave (crash, network drop).
        const departed = this.store
            .keys()
            .filter((key) => key !== this.sessionId && !live.has(key));
        if (departed.length > 0 || this.absentSessions.size > 0) {
            const nextAbsent = new Set(departed);
            if (!isSameKeySet(nextAbsent, this.absentSessions)) changed = true;
            this.absentSessions = nextAbsent;
        }

        if (changed) this.emit();
    }

    private emit(): void {
        if (this.disposed) return;
        const sessions = readPresenceSessions(this.store, this.sessionId).filter(
            (session) => !this.absentSessions.has(session.sessionId)
        );
        this.onSnapshot?.({
            sessions,
            onlineIdentities: readOnlineIdentities(sessions),
            byTransactionId: buildTransactionPresence(sessions)
        });
    }
}

function isSameKeySet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    return left.size === right.size && [...left].every((key) => right.has(key));
}

function defaultTransport(vaultId: string): VaultRealtimeSync {
    return createVaultRealtimeSync(vaultId, "presence");
}

export function createEphemeralPresenceManager(
    options: PresenceManagerOptions
): EphemeralPresenceManager {
    return new EphemeralPresenceManager(options);
}

export { EMPTY_SNAPSHOT as EMPTY_PRESENCE_SNAPSHOT };
