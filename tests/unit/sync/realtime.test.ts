import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    createVaultRealtimeSync,
    RealtimeCredentialManager,
    type RealtimeAuthorizationApi
} from "@/lib/supabase/realtime";

const mocks = vi.hoisted(() => {
    const channel = vi.fn();
    const removeChannel = vi.fn();
    const createClient = vi.fn();
    const authorize = vi.fn();
    const revoke = vi.fn();

    return {
        channel,
        removeChannel,
        createClient,
        authorize,
        revoke,
        client: {
            channel,
            getChannels: vi.fn(() => []),
            removeChannel,
            realtime: { disconnect: vi.fn(), setAuth: vi.fn(async () => undefined) }
        }
    };
});

vi.mock("@/lib/supabase/client", () => ({
    createSupabaseClientForRealtime: mocks.createClient
}));

vi.mock("@/lib/trpc/client", () => ({
    createTRPCClient: () => ({
        realtime: {
            authorize: { mutate: mocks.authorize },
            revoke: { mutate: mocks.revoke }
        }
    })
}));

function createChannel(topic = "realtime:test") {
    let subscribeCallback:
        | ((status: "SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR", error?: Error) => void)
        | undefined;
    const channel = {
        topic,
        on: vi.fn(() => channel),
        presenceState: vi.fn(() => ({})),
        subscribe: vi.fn(
            (
                callback: (status: "SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR", error?: Error) => void
            ) => {
                subscribeCallback = callback;
                callback("SUBSCRIBED");
                return channel;
            }
        ),
        track: vi.fn(async () => "ok"),
        unsubscribe: vi.fn(async () => "ok"),
        emitStatus: (status: "SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR") => {
            subscribeCallback?.(status);
        }
    };

    return channel;
}

function credential(
    grantId = "10000000-0000-4000-8000-000000000001",
    expiresAt = "2026-07-20T00:01:00.000Z",
    refreshAt = "2026-07-20T00:00:40.000Z"
) {
    return {
        token: `token-${grantId}`,
        grantId,
        expiresAt,
        refreshAt,
        vaultId: "20000000-0000-4000-8000-000000000001",
        purpose: "sync" as const
    };
}

describe("RealtimeCredentialManager", () => {
    it("single-flights refresh and rotates the prior opaque grant", async () => {
        const first = credential();
        const second = credential(
            "10000000-0000-4000-8000-000000000002",
            "2026-07-20T00:02:00.000Z",
            "2026-07-20T00:01:40.000Z"
        );
        const authorization = Promise.withResolvers<typeof second>();
        const api: RealtimeAuthorizationApi = {
            authorize: vi
                .fn()
                .mockResolvedValueOnce(first)
                .mockReturnValueOnce(authorization.promise),
            revoke: vi.fn().mockResolvedValue({ revoked: true })
        };
        let now = Date.parse("2026-07-20T00:00:00.000Z");
        const manager = new RealtimeCredentialManager(first.vaultId, "sync", api, () => now);

        await expect(manager.getAccessToken()).resolves.toBe(first.token);
        now = Date.parse(first.refreshAt);
        const refreshA = manager.getAccessToken();
        const refreshB = manager.getAccessToken();
        authorization.resolve(second);

        await expect(Promise.all([refreshA, refreshB])).resolves.toEqual([
            second.token,
            second.token
        ]);
        expect(api.authorize).toHaveBeenCalledTimes(2);
        expect(api.authorize).toHaveBeenLastCalledWith({
            vaultId: first.vaultId,
            purpose: "sync",
            previousGrantId: first.grantId
        });
    });

    it("revokes the active grant and refuses reuse after teardown", async () => {
        const active = credential();
        const api: RealtimeAuthorizationApi = {
            authorize: vi.fn().mockResolvedValue(active),
            revoke: vi.fn().mockResolvedValue({ revoked: true })
        };
        const manager = new RealtimeCredentialManager(active.vaultId, "sync", api, () =>
            Date.parse("2026-07-20T00:00:00.000Z")
        );

        await manager.getAccessToken();
        await manager.revoke();

        expect(api.revoke).toHaveBeenCalledWith({
            vaultId: active.vaultId,
            purpose: "sync",
            grantId: active.grantId
        });
        await expect(manager.getAccessToken()).rejects.toThrow("closed");
    });
});

describe("VaultRealtimeSync", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
        vi.clearAllMocks();
        mocks.createClient.mockReturnValue(mocks.client);
        mocks.channel.mockImplementation((topic: string) => createChannel(`realtime:${topic}`));
        mocks.removeChannel.mockResolvedValue("ok");
        mocks.authorize.mockResolvedValue(credential());
        mocks.revoke.mockResolvedValue({ revoked: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("authorizes a private exact-vault vault_ops subscription", async () => {
        const onUpdate = vi.fn();
        const realtime = createVaultRealtimeSync("20000000-0000-4000-8000-000000000001", "sync");
        await realtime.subscribe({ onUpdate });

        expect(mocks.authorize).toHaveBeenCalledWith({
            vaultId: "20000000-0000-4000-8000-000000000001",
            purpose: "sync"
        });
        expect(mocks.channel).toHaveBeenCalledWith(
            "vault:20000000-0000-4000-8000-000000000001:sync",
            { config: { private: true } }
        );
        const channel = mocks.channel.mock.results[0].value;
        expect(channel.on).toHaveBeenCalledExactlyOnceWith(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "vault_ops",
                filter: "vault_id=eq.20000000-0000-4000-8000-000000000001"
            },
            expect.any(Function)
        );
    });

    // The Realtime socket is an untrusted boundary. A frame that does not carry a complete
    // vault_ops row, or that names a different vault, must never reach the decrypt path.
    describe("vault_ops payload validation", () => {
        const vaultId = "20000000-0000-4000-8000-000000000001";

        function wellFormedRow() {
            return {
                id: "30000000-0000-4000-8000-000000000009",
                vault_id: vaultId,
                encrypted_data: "Y2lwaGVydGV4dA==",
                version_vector: "AA==",
                author_pubkey_hash: "b".repeat(64),
                created_at: "2026-07-20T00:00:00.000Z"
            };
        }

        async function emit(payloadNew: unknown) {
            const onUpdate = vi.fn();
            const realtime = createVaultRealtimeSync(vaultId, "sync");
            await realtime.subscribe({ onUpdate });
            const channel = mocks.channel.mock.results[0].value;
            const handler = channel.on.mock.calls[0][2];
            handler({ new: payloadNew });
            return onUpdate;
        }

        it("forwards a well-formed row for this vault", async () => {
            const onUpdate = await emit(wellFormedRow());

            expect(onUpdate).toHaveBeenCalledExactlyOnceWith({
                id: "30000000-0000-4000-8000-000000000009",
                encryptedData: "Y2lwaGVydGV4dA==",
                versionVector: "AA==",
                authorPubkeyHash: "b".repeat(64),
                createdAt: "2026-07-20T00:00:00.000Z"
            });
        });

        /** The well-formed row minus one required column. */
        function rowWithout(column: keyof ReturnType<typeof wellFormedRow>) {
            const row: Record<string, unknown> = { ...wellFormedRow() };
            delete row[column];
            return row;
        }

        const malformed: Array<[string, unknown]> = [
            ["an empty payload", {}],
            ["null", null],
            ["a JSON array", []],
            ["a bare string", "vault_ops"],
            ["a row missing encrypted_data", rowWithout("encrypted_data")],
            ["a row missing version_vector", rowWithout("version_vector")],
            ["a row missing author_pubkey_hash", rowWithout("author_pubkey_hash")],
            [
                "a row whose encrypted_data is not a string",
                { ...wellFormedRow(), encrypted_data: 42 }
            ],
            ["a row whose id is not a string", { ...wellFormedRow(), id: null }]
        ];

        it.each(malformed)("drops %s", async (_label, payloadNew) => {
            const onUpdate = await emit(payloadNew);
            expect(onUpdate).not.toHaveBeenCalled();
        });

        it("drops a structurally valid row belonging to a different vault", async () => {
            const onUpdate = await emit({
                ...wellFormedRow(),
                vault_id: "40000000-0000-4000-8000-000000000002"
            });

            expect(onUpdate).not.toHaveBeenCalled();
        });

        it("substitutes a timestamp when created_at is absent", async () => {
            const onUpdate = await emit(rowWithout("created_at"));

            expect(onUpdate).toHaveBeenCalledOnce();
            expect(onUpdate.mock.calls[0][0].createdAt).toEqual(expect.any(String));
        });
    });

    it("keeps presence private without exposing an identity as the channel key", async () => {
        const presenceCredential = {
            ...credential(),
            purpose: "presence" as const
        };
        mocks.authorize.mockResolvedValue(presenceCredential);

        await createVaultRealtimeSync(presenceCredential.vaultId, "presence").subscribe({
            onPresence: vi.fn()
        });

        expect(mocks.channel).toHaveBeenCalledWith(`vault:${presenceCredential.vaultId}:presence`, {
            config: {
                private: true,
                presence: { key: expect.any(String) }
            }
        });
        expect(JSON.stringify(mocks.channel.mock.calls)).not.toContain("pubkeyHash");
    });

    it("removes the channel, disconnects its isolated client and revokes its grant", async () => {
        const realtime = createVaultRealtimeSync("20000000-0000-4000-8000-000000000001", "sync");
        await realtime.subscribe({ onUpdate: vi.fn() });
        const channel = mocks.channel.mock.results[0].value;
        await realtime.unsubscribe();

        expect(mocks.removeChannel).toHaveBeenCalledExactlyOnceWith(channel);
        expect(mocks.client.realtime.disconnect).toHaveBeenCalledOnce();
        expect(mocks.revoke).toHaveBeenCalledWith({
            vaultId: "20000000-0000-4000-8000-000000000001",
            purpose: "sync",
            grantId: "10000000-0000-4000-8000-000000000001"
        });
        expect(realtime.subscribed).toBe(false);
    });
});
