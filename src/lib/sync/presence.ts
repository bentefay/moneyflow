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

import { createVaultRealtimeSync } from "@/lib/supabase/realtime";

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

interface PresenceTransport {
    subscribe(options: {
        onPresence: (entries: readonly { readonly payload?: unknown }[]) => void;
        onReconnect: () => void | Promise<void>;
    }): Promise<void>;
    updatePresence(payload?: unknown): Promise<void>;
    retractPresence(): void;
    unsubscribe(): Promise<void>;
    readonly subscribed: boolean;
}

export interface PresenceManagerOptions {
    readonly vaultId: string;
    readonly pubkeyHash: string;
    /** 32-byte vault-derived presence key from `derivePresenceKey`. */
    readonly presenceKey: Uint8Array;
    /** Injected for tests; defaults to the P05 realtime transport. */
    readonly createTransport?: (vaultId: string) => PresenceTransport;
    /** Injected for tests; production uses {@link PRESENCE_PUBLISH_INTERVAL_MS}. */
    readonly publishIntervalMs?: number;
}

const EMPTY_SNAPSHOT: PresenceSnapshot = {
    sessions: [],
    onlineIdentities: [],
    byTransactionId: {}
};

/** Leaves one event of headroom under Supabase Realtime's five-events-per-30-seconds limit. */
export const PRESENCE_PUBLISH_INTERVAL_MS = 8000;

interface PublishWaiter {
    readonly epoch: number;
    readonly version: number;
    readonly resolve: () => void;
    readonly reject: (reason?: unknown) => void;
}

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

    private transport: PresenceTransport | null = null;
    private onSnapshot: OnPresenceSnapshot | null = null;
    private unsubscribeStore: (() => void) | null = null;
    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private state: PresenceState = IDLE_PRESENCE_STATE;
    private disposed = false;
    /** Guards against overlapping publishes reordering on a slow socket. */
    private publishChain: Promise<void> = Promise.resolve();
    private publishEpoch = 0;
    private publishVersion = 0;
    private publishWaiters: readonly PublishWaiter[] = [];
    private publishWorkerEpoch: number | null = null;
    private publishDelayTimer: ReturnType<typeof setTimeout> | null = null;
    private resolvePublishDelay: (() => void) | null = null;
    private lastPublishStartedAt: number | null = null;
    private readonly publishIntervalMs: number;
    /** Serializes inbound merges so a stale prune cannot undo a newer apply. */
    private ingestChain: Promise<void> = Promise.resolve();
    /** Sessions that left the channel but whose store entry has not yet expired. */
    private absentSessions: ReadonlySet<string> = new Set();

    constructor(private readonly options: PresenceManagerOptions) {
        this.publishIntervalMs = options.publishIntervalMs ?? PRESENCE_PUBLISH_INTERVAL_MS;
    }

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
                // A reconnect gives us a fresh channel with no tracked state. Start a new publishing
                // epoch immediately: an unresolved send on the departed channel must not serialize or
                // satisfy the replacement channel's first publication.
                onReconnect: () => {
                    if (this.transport !== transport || this.disposed) return;
                    this.restartPublishingAfterReconnect();
                }
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

        this.refreshTimer = setInterval(() => void this.schedulePublish(), PRESENCE_REFRESH_MS);
        await this.schedulePublish();
    }

    /**
     * Declares what this session is focused on. A no-op when the state is unchanged, so table
     * re-renders and repeated focus events cannot generate socket traffic.
     */
    async setState(state: PresenceState): Promise<void> {
        if (this.disposed || isSamePresenceState(this.state, state)) return;
        this.state = state;
        await this.schedulePublish();
    }

    /** Clears row focus while staying connected — used on blur, route change and unmount. */
    async clearFocus(): Promise<void> {
        await this.setState(IDLE_PRESENCE_STATE);
    }

    /**
     * Synchronously retracts this session from the channel.
     *
     * For page teardown, where nothing async is guaranteed to complete. Peers see the departure at
     * once; the credential revocation in {@link disconnect} is left to whatever time the browser
     * allows, and the server-side grant expires on its own regardless.
     *
     * Marking the manager disposed *before* untracking is what makes this stick: the refresh timer
     * and any publish still queued behind {@link publishChain} would otherwise call `track()` again
     * straight after the untrack, and the peer would see leave-then-join instead of a departure.
     */
    retract(): void {
        this.disposed = true;
        if (this.refreshTimer != null) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.cancelScheduledPublish();
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
        this.cancelScheduledPublish();
        this.unsubscribeStore?.();
        this.unsubscribeStore = null;

        await transport?.unsubscribe();
        this.store.destroy();
        this.scratch.destroy();
    }

    /**
     * Coalesces rapid focus transitions into the newest state while keeping every caller awaitable.
     * Supabase closes a Presence channel that exceeds its client rate limit; a trailing publication
     * preserves the final field without replaying every transient focus state.
     */
    private schedulePublish(): Promise<void> {
        if (this.disposed || !this.transport?.subscribed) return Promise.resolve();

        const epoch = this.publishEpoch;
        const version = ++this.publishVersion;
        const completion = new Promise<void>((resolve, reject) => {
            this.publishWaiters = [...this.publishWaiters, { epoch, version, resolve, reject }];
        });
        this.startPublishWorker();
        return completion;
    }

    private startPublishWorker(): void {
        const epoch = this.publishEpoch;
        if (this.publishWorkerEpoch === epoch) return;
        this.publishWorkerEpoch = epoch;

        const run = async () => {
            try {
                await this.publishLatestStates(epoch);
            } finally {
                if (this.publishWorkerEpoch === epoch) {
                    this.publishWorkerEpoch = null;
                    if (
                        !this.disposed &&
                        this.hasPublishWaiters(epoch) &&
                        this.transport?.subscribed
                    ) {
                        this.startPublishWorker();
                    }
                }
            }
        };
        this.publishChain = this.publishChain.then(run, run);
    }

    private hasPublishWaiters(epoch: number): boolean {
        return this.publishWaiters.some((waiter) => waiter.epoch === epoch);
    }

    private async publishLatestStates(epoch: number): Promise<void> {
        while (
            !this.disposed &&
            this.publishEpoch === epoch &&
            this.transport?.subscribed &&
            this.hasPublishWaiters(epoch)
        ) {
            await this.waitForPublishInterval();
            if (this.disposed || this.publishEpoch !== epoch || !this.transport?.subscribed) {
                return;
            }

            const transport = this.transport;
            const state = this.state;
            this.store.set(
                this.sessionId,
                createPresenceEntry(this.sessionId, this.options.pubkeyHash, state)
            );
            const envelope = await sealPresenceUpdate(
                this.store.encode(this.sessionId),
                { vaultId: this.options.vaultId, sessionId: this.sessionId },
                this.options.presenceKey
            );
            if (
                this.disposed ||
                this.publishEpoch !== epoch ||
                this.transport !== transport ||
                !transport.subscribed ||
                !isSamePresenceState(this.state, state)
            ) {
                continue;
            }

            const version = this.publishVersion;
            this.lastPublishStartedAt = Date.now();
            try {
                await transport.updatePresence(envelope);
                this.resolvePublishWaiters(epoch, version);
            } catch (error) {
                this.rejectPublishWaiters(epoch, version, error);
            }
        }
    }

    private async waitForPublishInterval(): Promise<void> {
        const elapsed =
            this.lastPublishStartedAt == null
                ? this.publishIntervalMs
                : Date.now() - this.lastPublishStartedAt;
        const delay = Math.max(0, this.publishIntervalMs - elapsed);
        if (delay === 0) return;

        await new Promise<void>((resolve) => {
            const finish = () => {
                if (this.publishDelayTimer != null) clearTimeout(this.publishDelayTimer);
                this.publishDelayTimer = null;
                this.resolvePublishDelay = null;
                resolve();
            };
            this.resolvePublishDelay = finish;
            this.publishDelayTimer = setTimeout(finish, delay);
        });
    }

    private restartPublishingAfterReconnect(): void {
        const epoch = this.publishEpoch + 1;
        this.publishEpoch = epoch;
        this.publishWaiters = this.publishWaiters.map((waiter) => ({ ...waiter, epoch }));
        this.resolvePublishDelay?.();
        this.lastPublishStartedAt = null;
        this.publishChain = Promise.resolve();
        this.publishWorkerEpoch = null;
        void this.schedulePublish().catch(() => undefined);
    }

    private resolvePublishWaiters(epoch: number, version: number): void {
        const completed = this.publishWaiters.filter(
            (waiter) => waiter.epoch === epoch && waiter.version <= version
        );
        this.publishWaiters = this.publishWaiters.filter(
            (waiter) => waiter.epoch !== epoch || waiter.version > version
        );
        for (const waiter of completed) waiter.resolve();
    }

    private rejectPublishWaiters(epoch: number, version: number, error: unknown): void {
        const failed = this.publishWaiters.filter(
            (waiter) => waiter.epoch === epoch && waiter.version <= version
        );
        this.publishWaiters = this.publishWaiters.filter(
            (waiter) => waiter.epoch !== epoch || waiter.version > version
        );
        for (const waiter of failed) waiter.reject(error);
    }

    private cancelScheduledPublish(): void {
        this.resolvePublishDelay?.();
        const cancelled = this.publishWaiters;
        this.publishWaiters = [];
        for (const waiter of cancelled) waiter.resolve();
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

function defaultTransport(vaultId: string): PresenceTransport {
    return createVaultRealtimeSync(vaultId, "presence");
}

export function createEphemeralPresenceManager(
    options: PresenceManagerOptions
): EphemeralPresenceManager {
    return new EphemeralPresenceManager(options);
}

export { EMPTY_SNAPSHOT as EMPTY_PRESENCE_SNAPSHOT };
