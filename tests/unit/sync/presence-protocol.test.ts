/**
 * HS-003 presence protocol unit + property tests.
 *
 * All key material here is synthetic: keys are fixed byte patterns or fast-check-generated arrays,
 * never a real vault key, seed phrase or derived identity secret.
 */

import fc from "fast-check";
import { EphemeralStore } from "loro-crdt";
import { beforeAll, describe, expect, it } from "vitest";

import { allocationPresenceField } from "@/lib/crdt/allocations";
import { initCrypto } from "@/lib/crypto/keypair";
import { derivePresenceKey } from "@/lib/crypto/presence-key";
import {
    applyPresenceUpdate,
    buildTransactionPresence,
    createPresenceEntry,
    IDLE_PRESENCE_STATE,
    isSamePresenceState,
    openPresenceEnvelope,
    PRESENCE_PROTOCOL_VERSION,
    PRESENCE_REFRESH_MS,
    PRESENCE_TIMEOUT_MS,
    presenceFieldSchema,
    type PresenceSession,
    type PresenceState,
    readOnlineIdentities,
    readPresenceSessions,
    sealPresenceUpdate
} from "@/lib/sync/presence-protocol";

/** Synthetic 32-byte test key. Not derived from any real seed. */
function testKey(fill: number): Uint8Array {
    return new Uint8Array(32).fill(fill);
}

const KEY = testKey(7);
const OTHER_KEY = testKey(9);
const VAULT = "vault-a";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function store(): EphemeralStore {
    return new EphemeralStore(PRESENCE_TIMEOUT_MS);
}

/** Produces a sealed envelope authored by `sessionId`, as a real peer would. */
async function publish(
    sessionId: string,
    pubkeyHash: string,
    state: PresenceState,
    options: { readonly vaultId?: string; readonly key?: Uint8Array } = {}
) {
    const source = store();
    source.set(sessionId, createPresenceEntry(sessionId, pubkeyHash, state));
    return sealPresenceUpdate(
        source.encode(sessionId),
        { vaultId: options.vaultId ?? VAULT, sessionId },
        options.key ?? KEY
    );
}

beforeAll(async () => {
    await initCrypto();
});

describe("presence key derivation", () => {
    it("is deterministic, 32 bytes and independent of the vault key", () => {
        const vaultKey = testKey(3);
        const derived = derivePresenceKey(vaultKey);

        expect(derived).toHaveLength(32);
        expect(derivePresenceKey(vaultKey)).toEqual(derived);
        expect(Array.from(derived)).not.toEqual(Array.from(vaultKey));
    });

    it("separates vaults", () => {
        expect(derivePresenceKey(testKey(3))).not.toEqual(derivePresenceKey(testKey(4)));
    });

    it("rejects a wrong-sized key", () => {
        expect(() => derivePresenceKey(new Uint8Array(16))).toThrow();
    });

    it("refreshes well inside the expiry window", () => {
        expect(PRESENCE_REFRESH_MS).toBeLessThan(PRESENCE_TIMEOUT_MS / 2);
    });
});

describe("presence field boundary", () => {
    it("maps arbitrary persisted person ids to stable bounded wire fields", () => {
        const sharedPrefix = "person-prefix-".repeat(20);
        const personIds = [
            "person.with.dots",
            "名字",
            " person id with spaces ",
            `${sharedPrefix}a`,
            `${sharedPrefix}b`
        ];
        const fields = personIds.map(allocationPresenceField);

        expect(new Set(fields).size).toBe(personIds.length);
        for (const [index, field] of fields.entries()) {
            const personId = personIds[index];
            if (personId == null) throw new Error("person id fixture is missing");
            expect(field).toHaveLength(77);
            expect(field).toMatch(/^allocation:h:[0-9a-f]{64}$/);
            expect(presenceFieldSchema.safeParse(field).success).toBe(true);
            expect(allocationPresenceField(personId)).toBe(field);
        }
    });

    it("rejects malformed raw allocation fields while preserving fixed fields", () => {
        for (const rawField of [
            "allocation:person.with.dots",
            "allocation:名字",
            "allocation: person id ",
            `allocation:${"p".repeat(78)}`
        ]) {
            expect(presenceFieldSchema.safeParse(rawField).success).toBe(false);
        }

        for (const fixedField of ["date", "description", "accountId", "status", "tags", "amount"]) {
            expect(presenceFieldSchema.safeParse(fixedField)).toMatchObject({
                success: true,
                data: fixedField
            });
        }
    });
});

describe("seal/open roundtrip", () => {
    it("recovers the exact update bytes", async () => {
        const source = store();
        source.set("s1", createPresenceEntry("s1", HASH_A, { transactionId: "tx", editing: true }));
        const update = source.encode("s1");

        const envelope = await sealPresenceUpdate(update, { vaultId: VAULT, sessionId: "s1" }, KEY);
        const opened = await openPresenceEnvelope(
            envelope,
            { vaultId: VAULT, sessionId: "s2" },
            KEY
        );

        expect(opened.ok).toBe(true);
        if (opened.ok) {
            expect(opened.sessionId).toBe("s1");
            expect(Array.from(opened.update)).toEqual(Array.from(update));
        }
    });

    it("never emits plaintext state in the envelope", async () => {
        const envelope = await publish("s1", HASH_A, {
            transactionId: "tx-secret",
            field: "amount",
            editing: true
        });

        const serialized = JSON.stringify(envelope);
        expect(serialized).not.toContain("tx-secret");
        expect(serialized).not.toContain("amount");
        expect(serialized).not.toContain(HASH_A);
    });

    it("uses a fresh nonce per publish", async () => {
        const first = await publish("s1", HASH_A, IDLE_PRESENCE_STATE);
        const second = await publish("s1", HASH_A, IDLE_PRESENCE_STATE);
        expect(first.nonce).not.toBe(second.nonce);
    });

    it("roundtrips arbitrary states", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    transactionId: fc.option(fc.string({ minLength: 1, maxLength: 60 }), {
                        nil: undefined
                    }),
                    field: fc.option(fc.constantFrom("date", "amount", "notes", "tags"), {
                        nil: undefined
                    }),
                    editing: fc.boolean()
                }),
                async (state) => {
                    const envelope = await publish("s1", HASH_A, state);
                    const opened = await openPresenceEnvelope(
                        envelope,
                        { vaultId: VAULT, sessionId: "s2" },
                        KEY
                    );
                    expect(opened.ok).toBe(true);
                    if (!opened.ok) return;

                    const target = store();
                    expect(applyPresenceUpdate(target, store(), "s1", opened.update)).toBe(true);
                    expect(readPresenceSessions(target, "s2")).toEqual([
                        { sessionId: "s1", pubkeyHash: HASH_A, state }
                    ]);
                }
            ),
            { numRuns: 40 }
        );
    });
});

describe("rejection of malformed, versioned and unauthorized payloads", () => {
    it("rejects a payload sealed under another vault's key", async () => {
        const envelope = await publish("s1", HASH_A, IDLE_PRESENCE_STATE, { key: OTHER_KEY });
        await expect(
            openPresenceEnvelope(envelope, { vaultId: VAULT, sessionId: "s2" }, KEY)
        ).resolves.toEqual({ ok: false, reason: "undecryptable" });
    });

    it("rejects a payload labelled for a different vault", async () => {
        const envelope = await publish("s1", HASH_A, IDLE_PRESENCE_STATE, { vaultId: "vault-b" });
        await expect(
            openPresenceEnvelope(envelope, { vaultId: VAULT, sessionId: "s2" }, KEY)
        ).resolves.toEqual({ ok: false, reason: "foreign-vault" });
    });

    it("rejects a relabelled vault id even when the key is correct", async () => {
        const envelope = await publish("s1", HASH_A, IDLE_PRESENCE_STATE, { vaultId: "vault-b" });
        // The receiver believes it is vault-b, so the vault check passes and only the AEAD
        // additional data can catch the substitution.
        const relabelled = { ...envelope, vaultId: "vault-b", sessionId: "s1" };
        await expect(
            openPresenceEnvelope(
                { ...relabelled, sessionId: "s9" },
                { vaultId: "vault-b", sessionId: "s2" },
                KEY
            )
        ).resolves.toEqual({ ok: false, reason: "undecryptable" });
    });

    it("ignores our own echo", async () => {
        const envelope = await publish("s1", HASH_A, IDLE_PRESENCE_STATE);
        await expect(
            openPresenceEnvelope(envelope, { vaultId: VAULT, sessionId: "s1" }, KEY)
        ).resolves.toEqual({ ok: false, reason: "own-session" });
    });

    it("rejects an unsupported protocol version", async () => {
        const envelope = await publish("s1", HASH_A, IDLE_PRESENCE_STATE);
        await expect(
            openPresenceEnvelope(
                { ...envelope, v: PRESENCE_PROTOCOL_VERSION + 1 },
                { vaultId: VAULT, sessionId: "s2" },
                KEY
            )
        ).resolves.toEqual({ ok: false, reason: "unsupported-version" });
    });

    it("rejects arbitrary non-envelope payloads without throwing", async () => {
        await fc.assert(
            fc.asyncProperty(fc.anything(), async (payload) => {
                const result = await openPresenceEnvelope(
                    payload,
                    { vaultId: VAULT, sessionId: "s2" },
                    KEY
                );
                expect(result.ok).toBe(false);
            }),
            { numRuns: 60 }
        );
    });

    it("rejects corrupted ciphertext", async () => {
        await fc.assert(
            fc.asyncProperty(fc.string({ minLength: 1, maxLength: 40 }), async (junk) => {
                const envelope = await publish("s1", HASH_A, IDLE_PRESENCE_STATE);
                const result = await openPresenceEnvelope(
                    { ...envelope, ciphertext: junk },
                    { vaultId: VAULT, sessionId: "s2" },
                    KEY
                );
                expect(result.ok).toBe(false);
            }),
            { numRuns: 40 }
        );
    });
});

describe("session key ownership", () => {
    it("refuses an update that writes a session key other than its own", () => {
        // A member with the presence key authors an entry under a victim's session key.
        const attacker = store();
        attacker.set(
            "victim",
            createPresenceEntry("victim", HASH_B, {
                transactionId: "tx-hijack",
                editing: true
            })
        );

        const target = store();
        expect(applyPresenceUpdate(target, store(), "attacker", attacker.encode("victim"))).toBe(
            false
        );
        expect(readPresenceSessions(target, "self")).toEqual([]);
    });

    it("refuses an entry whose body disagrees with its key", () => {
        const source = store();
        source.set("s1", createPresenceEntry("spoofed", HASH_A, IDLE_PRESENCE_STATE));

        const target = store();
        expect(applyPresenceUpdate(target, store(), "s1", source.encode("s1"))).toBe(false);
    });

    it("refuses a multi-key update", () => {
        const source = store();
        source.set("s1", createPresenceEntry("s1", HASH_A, IDLE_PRESENCE_STATE));
        source.set("s2", createPresenceEntry("s2", HASH_B, IDLE_PRESENCE_STATE));

        const target = store();
        expect(applyPresenceUpdate(target, store(), "s1", source.encodeAll())).toBe(false);
    });

    it("refuses truncated bytes without throwing and leaves no residue", () => {
        const scratch = store();
        const target = store();

        expect(applyPresenceUpdate(target, scratch, "s1", new Uint8Array([1, 2, 3]))).toBe(false);
        expect(scratch.keys()).toEqual([]);
        expect(target.keys()).toEqual([]);
    });

    it("leaves the scratch store empty after many rejected and accepted messages", async () => {
        const scratch = store();
        const target = store();

        for (let index = 0; index < 20; index++) {
            const sessionId = `s${index}`;
            const envelope = await publish(sessionId, HASH_A, {
                transactionId: "tx",
                editing: false
            });
            const opened = await openPresenceEnvelope(
                envelope,
                { vaultId: VAULT, sessionId: "self" },
                KEY
            );
            if (opened.ok) applyPresenceUpdate(target, scratch, sessionId, opened.update);
            applyPresenceUpdate(target, scratch, sessionId, new Uint8Array([9, 9, 9]));
        }

        expect(scratch.keys()).toEqual([]);
        expect(readPresenceSessions(target, "self")).toHaveLength(20);
    });
});

describe("replay handling", () => {
    it("keeps the newest state when an older frame is replayed", async () => {
        const source = store();
        source.set(
            "s1",
            createPresenceEntry("s1", HASH_A, { transactionId: "old", editing: false })
        );
        const stale = source.encode("s1");

        await new Promise((resolve) => setTimeout(resolve, 5));
        source.set(
            "s1",
            createPresenceEntry("s1", HASH_A, { transactionId: "new", editing: true })
        );
        const fresh = source.encode("s1");

        const target = store();
        applyPresenceUpdate(target, store(), "s1", fresh);
        applyPresenceUpdate(target, store(), "s1", stale);

        expect(readPresenceSessions(target, "self")).toEqual([
            { sessionId: "s1", pubkeyHash: HASH_A, state: { transactionId: "new", editing: true } }
        ]);
    });
});

describe("expiry and cleanup", () => {
    it("drops a session that stops refreshing", async () => {
        const shortLived = new EphemeralStore(120);
        const source = store();
        source.set(
            "s1",
            createPresenceEntry("s1", HASH_A, { transactionId: "tx", editing: false })
        );

        expect(applyPresenceUpdate(shortLived, store(), "s1", source.encode("s1"))).toBe(true);
        expect(readPresenceSessions(shortLived, "self")).toHaveLength(1);

        await new Promise((resolve) => setTimeout(resolve, 400));
        expect(readPresenceSessions(shortLived, "self")).toEqual([]);
    });

    it("keeps a session alive across refreshes", async () => {
        const shortLived = new EphemeralStore(150);
        const source = store();

        for (let index = 0; index < 4; index++) {
            source.set("s1", createPresenceEntry("s1", HASH_A, IDLE_PRESENCE_STATE));
            applyPresenceUpdate(shortLived, store(), "s1", source.encode("s1"));
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        expect(readPresenceSessions(shortLived, "self")).toHaveLength(1);
    });
});

describe("projection to the UI", () => {
    const sessions: readonly PresenceSession[] = [
        { sessionId: "a1", pubkeyHash: HASH_A, state: { transactionId: "tx1", editing: false } },
        {
            sessionId: "a2",
            pubkeyHash: HASH_A,
            state: { transactionId: "tx1", field: "amount", editing: true }
        },
        {
            sessionId: "b1",
            pubkeyHash: HASH_B,
            state: { transactionId: "tx2", field: "notes", editing: true }
        },
        { sessionId: "b2", pubkeyHash: HASH_B, state: IDLE_PRESENCE_STATE }
    ];

    it("groups sessions by transaction and deduplicates identities", () => {
        expect(buildTransactionPresence(sessions)).toEqual({
            tx1: {
                focusedBy: [HASH_A],
                editingBy: [HASH_A],
                editingByField: { amount: [HASH_A] }
            },
            tx2: {
                focusedBy: [HASH_B],
                editingBy: [HASH_B],
                editingByField: { notes: [HASH_B] }
            }
        });
    });

    it("preserves each editor's field attribution on the same transaction", () => {
        expect(
            buildTransactionPresence([
                {
                    sessionId: "a1",
                    pubkeyHash: HASH_A,
                    state: { transactionId: "tx1", field: "amount", editing: true }
                },
                {
                    sessionId: "b1",
                    pubkeyHash: HASH_B,
                    state: { transactionId: "tx1", field: "notes", editing: true }
                },
                {
                    sessionId: "a2",
                    pubkeyHash: HASH_A,
                    state: { transactionId: "tx1", field: "notes", editing: true }
                }
            ])
        ).toEqual({
            tx1: {
                focusedBy: [HASH_A, HASH_B],
                editingBy: [HASH_A, HASH_B],
                editingByField: {
                    amount: [HASH_A],
                    notes: [HASH_B, HASH_A]
                }
            }
        });
    });

    it("omits unfocused sessions from row presence but counts them as online", () => {
        expect(buildTransactionPresence([sessions[3]])).toEqual({});
        expect(readOnlineIdentities(sessions)).toEqual([HASH_A, HASH_B]);
    });

    it("excludes our own session when reading the store", () => {
        const target = store();
        target.set("self", createPresenceEntry("self", HASH_A, IDLE_PRESENCE_STATE));
        target.set("other", createPresenceEntry("other", HASH_B, IDLE_PRESENCE_STATE));

        expect(readPresenceSessions(target, "self").map((s) => s.sessionId)).toEqual(["other"]);
    });

    it("skips entries that fail validation instead of surfacing them", () => {
        const target = store();
        target.set("bad", { v: 1, nonsense: true });
        target.set("good", createPresenceEntry("good", HASH_A, IDLE_PRESENCE_STATE));

        expect(readPresenceSessions(target, "self").map((s) => s.sessionId)).toEqual(["good"]);
    });

    it("never reports a field without a transaction", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        sessionId: fc.string({ minLength: 1, maxLength: 12 }),
                        pubkeyHash: fc.constantFrom(HASH_A, HASH_B),
                        state: fc.record({
                            transactionId: fc.option(fc.constantFrom("tx1", "tx2"), {
                                nil: undefined
                            }),
                            field: fc.option(fc.constantFrom("date", "amount"), { nil: undefined }),
                            editing: fc.boolean()
                        })
                    }),
                    { maxLength: 12 }
                ),
                (generated) => {
                    const projected = buildTransactionPresence(generated);
                    for (const [transactionId, presence] of Object.entries(projected)) {
                        expect(["tx1", "tx2"]).toContain(transactionId);
                        expect(presence.editingBy.length).toBeLessThanOrEqual(
                            presence.focusedBy.length
                        );
                    }
                }
            ),
            { numRuns: 60 }
        );
    });
});

describe("state comparison", () => {
    it("treats identical states as equal so unchanged focus does not republish", () => {
        expect(
            isSamePresenceState(
                { transactionId: "tx", editing: true },
                {
                    transactionId: "tx",
                    editing: true
                }
            )
        ).toBe(true);
        expect(
            isSamePresenceState(IDLE_PRESENCE_STATE, { transactionId: "tx", editing: false })
        ).toBe(false);
        expect(
            isSamePresenceState(
                { transactionId: "tx", field: "date", editing: true },
                { transactionId: "tx", field: "amount", editing: true }
            )
        ).toBe(false);
    });
});
