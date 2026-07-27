/**
 * HS-003 presence integration tests.
 *
 * Drives {@link EphemeralPresenceManager} against a fake P05 transport that mimics the real
 * channel's semantics: `track()` replaces one session's tracked payload and every subscriber is
 * re-notified with the full channel state. This exercises the encrypt -> publish -> authenticate ->
 * merge path end to end while keeping the assertions deterministic.
 *
 * All key material is synthetic. No seed phrase, vault key or derived identity secret appears here.
 */

import { beforeAll, describe, expect, it } from "vitest";

import { initCrypto } from "@/lib/crypto/keypair";
import { derivePresenceKey } from "@/lib/crypto/presence-key";
import { EphemeralPresenceManager, type PresenceSnapshot } from "@/lib/sync/presence";
import { PRESENCE_PROTOCOL_VERSION } from "@/lib/sync/presence-protocol";

type PresenceEntry = { userId: string; joinedAt: string; lastSeen: string; payload?: unknown };
type PresenceListener = (entries: PresenceEntry[]) => void;

/**
 * A vault presence channel shared by every session subscribed to the same vault id. Sessions on
 * other vault ids get a different channel, exactly as the topic-scoped P05 grant enforces.
 */
class FakeChannel {
    private readonly tracked = new Map<string, PresenceEntry>();
    private readonly listeners = new Map<object, PresenceListener>();

    join(token: object, listener: PresenceListener): void {
        this.listeners.set(token, listener);
        listener([...this.tracked.values()]);
    }

    leave(token: object): void {
        this.listeners.delete(token);
        this.tracked.delete(keyOf(token));
        this.notify();
    }

    track(token: object, payload: unknown): void {
        const now = new Date().toISOString();
        this.tracked.set(keyOf(token), {
            userId: keyOf(token),
            joinedAt: now,
            lastSeen: now,
            payload
        });
        this.notify();
    }

    /** Injects a payload no honest session would send, to prove receivers filter it. */
    inject(userId: string, payload: unknown): void {
        const now = new Date().toISOString();
        this.tracked.set(userId, { userId, joinedAt: now, lastSeen: now, payload });
        this.notify();
    }

    /** Every payload currently on the wire, for confidentiality assertions. */
    payloads(): unknown[] {
        return [...this.tracked.values()].map((entry) => entry.payload);
    }

    private notify(): void {
        const entries = [...this.tracked.values()];
        for (const listener of this.listeners.values()) listener(entries);
    }
}

const tokenKeys = new WeakMap<object, string>();
let tokenCounter = 0;

function keyOf(token: object): string {
    const existing = tokenKeys.get(token);
    if (existing != null) return existing;
    const minted = `conn-${++tokenCounter}`;
    tokenKeys.set(token, minted);
    return minted;
}

const channels = new Map<string, FakeChannel>();

function channelFor(vaultId: string): FakeChannel {
    const existing = channels.get(vaultId);
    if (existing) return existing;
    const created = new FakeChannel();
    channels.set(vaultId, created);
    return created;
}

/** Minimal stand-in for `VaultRealtimeSync` with the surface the manager uses. */
class FakeTransport {
    private readonly token = {};
    private channel: FakeChannel | null = null;
    private onPresence: PresenceListener | undefined;
    private onReconnect: (() => void | Promise<void>) | undefined;

    constructor(private readonly vaultId: string) {}

    async subscribe(options: {
        onPresence?: PresenceListener;
        onReconnect?: () => void | Promise<void>;
    }): Promise<void> {
        this.channel = channelFor(this.vaultId);
        this.onPresence = options.onPresence;
        this.onReconnect = options.onReconnect;
        if (this.onPresence) this.channel.join(this.token, this.onPresence);
    }

    async updatePresence(payload?: unknown): Promise<void> {
        this.channel?.track(this.token, payload);
    }

    retractPresence(): void {
        this.channel?.leave(this.token);
    }

    async unsubscribe(): Promise<void> {
        this.channel?.leave(this.token);
        this.channel = null;
    }

    /**
     * Simulates a socket drop and re-establish. The tracked payload is lost, exactly as it is on a
     * real Realtime rejoin, so only a manager that republishes on `onReconnect` stays visible.
     */
    async dropAndRejoin(): Promise<void> {
        this.channel?.leave(this.token);
        this.channel = channelFor(this.vaultId);
        if (this.onPresence) this.channel.join(this.token, this.onPresence);
        await this.onReconnect?.();
    }

    get subscribed(): boolean {
        return this.channel != null;
    }
}

const VAULT_A = "vault-a";
const VAULT_B = "vault-b";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

/** Synthetic vault keys — fixed byte patterns, not derived from any real seed. */
const KEY_A = derivePresenceKey(new Uint8Array(32).fill(1));
const KEY_B = derivePresenceKey(new Uint8Array(32).fill(2));

interface Session {
    readonly manager: EphemeralPresenceManager;
    readonly transport: FakeTransport;
    latest: PresenceSnapshot;
}

async function connect(options: {
    vaultId: string;
    pubkeyHash: string;
    presenceKey: Uint8Array;
}): Promise<Session> {
    let transport: FakeTransport | null = null;
    const manager = new EphemeralPresenceManager({
        ...options,
        createTransport: (vaultId) => {
            const created = new FakeTransport(vaultId);
            transport = created;
            // The manager only needs this structural surface; the real class adds credential
            // lifecycle that has its own coverage in the P05 suites.
            return created as unknown as never;
        }
    });

    const session: Session = {
        manager,
        get transport() {
            if (transport == null) throw new Error("transport not created");
            return transport;
        },
        latest: { sessions: [], onlineIdentities: [], byTransactionId: {} }
    };

    await manager.connect((snapshot) => {
        session.latest = snapshot;
    });
    return session;
}

/** Lets queued publish/ingest promises settle before asserting. */
async function settle(): Promise<void> {
    for (let index = 0; index < 12; index++) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 5));
    for (let index = 0; index < 12; index++) await Promise.resolve();
}

beforeAll(async () => {
    await initCrypto();
});

describe("encrypted authorized broadcast", () => {
    it("delivers focus between two members of one vault", async () => {
        channels.clear();
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        await settle();

        await alice.manager.setState({ transactionId: "tx-1", field: "amount", editing: true });
        await settle();

        expect(bob.latest.byTransactionId).toEqual({
            "tx-1": { focusedBy: [HASH_A], editingBy: [HASH_A], fields: ["amount"] }
        });
        expect(bob.latest.onlineIdentities).toEqual([HASH_A]);
        // Alice does not see her own session reflected back.
        expect(alice.latest.byTransactionId).toEqual({});

        await alice.manager.disconnect();
        await bob.manager.disconnect();
    });

    it("puts no plaintext focus metadata on the wire", async () => {
        channels.clear();
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        await settle();
        await alice.manager.setState({ transactionId: "tx-secret", field: "notes", editing: true });
        await settle();

        const wire = JSON.stringify(channelFor(VAULT_A).payloads());
        expect(wire).not.toContain("tx-secret");
        expect(wire).not.toContain("notes");
        expect(wire).not.toContain(HASH_A);
        // The presence key itself must never be serialized alongside the payload.
        expect(wire).not.toContain(Buffer.from(KEY_A).toString("base64"));
        expect(wire).toContain(`"v":${PRESENCE_PROTOCOL_VERSION}`);

        await alice.manager.disconnect();
    });

    it("keeps duplicate tabs of one identity independent", async () => {
        channels.clear();
        const tabOne = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        const tabTwo = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        const observer = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_B,
            presenceKey: KEY_A
        });
        await settle();

        expect(tabOne.manager.id).not.toBe(tabTwo.manager.id);

        await tabOne.manager.setState({ transactionId: "tx-1", editing: false });
        await tabTwo.manager.setState({ transactionId: "tx-2", field: "date", editing: true });
        await settle();

        // Two sessions, two rows, one identity.
        expect(observer.latest.sessions).toHaveLength(2);
        expect(observer.latest.onlineIdentities).toEqual([HASH_A]);
        expect(Object.keys(observer.latest.byTransactionId).sort()).toEqual(["tx-1", "tx-2"]);
        expect(observer.latest.byTransactionId["tx-2"].editingBy).toEqual([HASH_A]);

        // Each tab sees the other as a peer rather than as itself.
        expect(tabOne.latest.byTransactionId["tx-2"]).toBeDefined();
        expect(tabOne.latest.byTransactionId["tx-1"]).toBeUndefined();

        await tabOne.manager.disconnect();
        await tabTwo.manager.disconnect();
        await observer.manager.disconnect();
    });

    it("retracts focus on blur without leaving the channel", async () => {
        channels.clear();
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        await settle();

        await alice.manager.setState({ transactionId: "tx-1", editing: true });
        await settle();
        expect(bob.latest.byTransactionId["tx-1"]).toBeDefined();

        await alice.manager.clearFocus();
        await settle();

        expect(bob.latest.byTransactionId).toEqual({});
        expect(bob.latest.onlineIdentities).toEqual([HASH_A]);

        await alice.manager.disconnect();
        await bob.manager.disconnect();
    });

    it("retracts synchronously for page teardown", async () => {
        // `pagehide` cannot await a full disconnect, so `retract()` alone must clear peers.
        channels.clear();
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        await settle();

        await alice.manager.setState({ transactionId: "tx-1", editing: false });
        await settle();
        expect(bob.latest.sessions).toHaveLength(1);

        alice.manager.retract();
        await settle();

        expect(bob.latest.sessions).toEqual([]);
        expect(bob.latest.byTransactionId).toEqual({});

        await alice.manager.disconnect();
        await bob.manager.disconnect();
    });

    it("removes a session promptly when it disconnects", async () => {
        channels.clear();
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        await settle();

        await alice.manager.setState({ transactionId: "tx-1", editing: false });
        await settle();
        expect(bob.latest.sessions).toHaveLength(1);

        await alice.manager.disconnect();
        await settle();

        // Not waiting out the 30s Loro expiry: a clean leave is observed immediately.
        expect(bob.latest.sessions).toEqual([]);
        expect(bob.latest.byTransactionId).toEqual({});

        await bob.manager.disconnect();
    });
});

describe("reconnect recovery", () => {
    it("republishes state after a socket drop so peers still see it", async () => {
        channels.clear();
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        await settle();

        const focused = { transactionId: "tx-9", field: "tags", editing: true };
        await alice.manager.setState(focused);
        await settle();
        expect(bob.latest.byTransactionId["tx-9"]).toBeDefined();

        // A rejoin loses the tracked payload; without republication Alice would vanish.
        await alice.transport.dropAndRejoin();
        await settle();

        expect(bob.latest.byTransactionId).toEqual({
            "tx-9": { focusedBy: [HASH_A], editingBy: [HASH_A], fields: ["tags"] }
        });
        expect(bob.latest.sessions).toEqual([
            { sessionId: alice.manager.id, pubkeyHash: HASH_A, state: focused }
        ]);

        await alice.manager.disconnect();
        await bob.manager.disconnect();
    });

    it("shows a peer again after an immediate leave/rejoin", async () => {
        // Regression: pruning a departed session with `EphemeralStore.delete` writes a local
        // tombstone whose timestamp can tie with the peer's next update, which then loses LWW and
        // the rejoined session stays invisible. Departure must be a filter, not a delete.
        channels.clear();
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        await settle();
        await alice.manager.setState({ transactionId: "tx-1", editing: false });
        await settle();

        // Leave and rejoin within the same millisecond window, with no expiry in between.
        await alice.transport.dropAndRejoin();
        await settle();

        expect(bob.latest.sessions).toHaveLength(1);
        expect(bob.latest.byTransactionId["tx-1"]).toBeDefined();

        await alice.manager.disconnect();
        await bob.manager.disconnect();
    });

    it("re-establishes visibility after a peer rejoins", async () => {
        channels.clear();
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        await settle();
        await alice.manager.setState({ transactionId: "tx-1", editing: false });
        await settle();
        expect(bob.latest.sessions).toHaveLength(1);

        await alice.manager.disconnect();
        await settle();
        expect(bob.latest.sessions).toEqual([]);

        const aliceAgain = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        await settle();
        await aliceAgain.manager.setState({ transactionId: "tx-2", editing: true });
        await settle();

        expect(bob.latest.byTransactionId).toEqual({
            "tx-2": { focusedBy: [HASH_A], editingBy: [HASH_A], fields: [] }
        });

        await aliceAgain.manager.disconnect();
        await bob.manager.disconnect();
    });
});

describe("vault and session isolation", () => {
    it("ignores a payload authored for another vault", async () => {
        channels.clear();
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        await settle();

        // A session on vault B publishes; its envelope is replayed verbatim onto vault A's channel.
        const foreign = await connect({
            vaultId: VAULT_B,
            pubkeyHash: HASH_A,
            presenceKey: KEY_B
        });
        await foreign.manager.setState({ transactionId: "tx-other-vault", editing: true });
        await settle();

        const [foreignPayload] = channelFor(VAULT_B).payloads();
        channelFor(VAULT_A).inject("smuggled", foreignPayload);
        await settle();

        expect(bob.latest.sessions).toEqual([]);
        expect(bob.latest.byTransactionId).toEqual({});

        await foreign.manager.disconnect();
        await bob.manager.disconnect();
    });

    it("ignores a payload encrypted under a different vault key", async () => {
        channels.clear();
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        await settle();

        // Same vault label, wrong key: only the AEAD tag can catch this.
        const impostor = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_B
        });
        await impostor.manager.setState({ transactionId: "tx-forged", editing: true });
        await settle();

        expect(bob.latest.sessions).toEqual([]);

        await impostor.manager.disconnect();
        await bob.manager.disconnect();
    });

    it("ignores malformed and replayed channel payloads", async () => {
        channels.clear();
        const bob = await connect({ vaultId: VAULT_A, pubkeyHash: HASH_B, presenceKey: KEY_A });
        const alice = await connect({
            vaultId: VAULT_A,
            pubkeyHash: HASH_A,
            presenceKey: KEY_A
        });
        await settle();
        await alice.manager.setState({ transactionId: "tx-1", editing: false });
        await settle();

        const [, alicePayload] = channelFor(VAULT_A).payloads();
        const channel = channelFor(VAULT_A);
        for (const junk of [
            null,
            undefined,
            "not-an-envelope",
            { v: 99, vaultId: VAULT_A, sessionId: "x", nonce: "AA", ciphertext: "AA" },
            { ...(alicePayload as object), ciphertext: "AAAA" }
        ]) {
            channel.inject(`junk-${String(junk)}`, junk);
        }
        // Replaying Alice's own valid envelope under a different connection must not clone her.
        channel.inject("replayer", alicePayload);
        await settle();

        expect(bob.latest.sessions).toHaveLength(1);
        expect(bob.latest.byTransactionId).toEqual({
            "tx-1": { focusedBy: [HASH_A], editingBy: [], fields: [] }
        });

        await alice.manager.disconnect();
        await bob.manager.disconnect();
    });
});
