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
