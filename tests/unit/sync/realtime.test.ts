import { beforeEach, describe, expect, it, vi } from "vitest";

import { createVaultRealtimeSync } from "@/lib/supabase/realtime";

const mocks = vi.hoisted(() => {
    const channel = vi.fn();
    const getChannels = vi.fn();
    const removeChannel = vi.fn();

    return {
        channel,
        getChannels,
        removeChannel,
        client: { channel, getChannels, removeChannel }
    };
});

vi.mock("@/lib/supabase/client", () => ({
    createSupabaseClientForBrowser: () => mocks.client
}));

function createChannel(topic = "realtime:test") {
    let isSubscribed = false;
    const channel = {
        topic,
        on: vi.fn(() => {
            if (isSubscribed) {
                throw new Error("cannot add callbacks after subscribe");
            }
            return channel;
        }),
        presenceState: vi.fn(() => ({})),
        subscribe: vi.fn(() => {
            isSubscribed = true;
            return channel;
        }),
        track: vi.fn(),
        unsubscribe: vi.fn()
    };

    channel.track.mockResolvedValue("ok");
    channel.unsubscribe.mockResolvedValue("ok");

    return channel;
}

describe("VaultRealtimeSync", () => {
    beforeEach(() => {
        mocks.channel.mockReset();
        mocks.channel.mockImplementation(() => createChannel());
        mocks.getChannels.mockReset();
        mocks.getChannels.mockReturnValue([]);
        mocks.removeChannel.mockReset();
        mocks.removeChannel.mockResolvedValue("ok");
    });

    it("uses separate Supabase topics for data sync and presence", async () => {
        await createVaultRealtimeSync("vault-1", "user-1").subscribe({ onUpdate: vi.fn() });
        await createVaultRealtimeSync("vault-1", "user-1", "presence").subscribe({
            onPresence: vi.fn()
        });

        expect(mocks.channel.mock.calls.map(([topic]) => topic)).toEqual([
            "vault:vault-1:sync",
            "vault:vault-1:presence"
        ]);
    });

    it("registers only the callbacks requested by each subscriber", async () => {
        const syncChannel = createChannel();
        const presenceChannel = createChannel();
        mocks.channel.mockReturnValueOnce(syncChannel).mockReturnValueOnce(presenceChannel);

        await createVaultRealtimeSync("vault-1", "user-1").subscribe({ onUpdate: vi.fn() });
        await createVaultRealtimeSync("vault-1", "user-1", "presence").subscribe({
            onPresence: vi.fn()
        });

        expect(syncChannel.on).toHaveBeenCalledTimes(1);
        expect(syncChannel.on).toHaveBeenCalledWith(
            "postgres_changes",
            expect.objectContaining({ table: "vault_updates", filter: "vault_id=eq.vault-1" }),
            expect.any(Function)
        );
        expect(presenceChannel.on).toHaveBeenCalledTimes(1);
        expect(presenceChannel.on).toHaveBeenCalledWith(
            "presence",
            { event: "sync" },
            expect.any(Function)
        );
    });

    it("removes the channel through its owning Supabase client", async () => {
        const channel = createChannel("realtime:vault:vault-1:sync");
        mocks.channel.mockReturnValue(channel);

        const realtime = createVaultRealtimeSync("vault-1", "user-1");
        await realtime.subscribe({ onUpdate: vi.fn() });
        await realtime.unsubscribe();

        expect(mocks.removeChannel).toHaveBeenCalledExactlyOnceWith(channel);
        expect(channel.unsubscribe).not.toHaveBeenCalled();
        expect(realtime.subscribed).toBe(false);
    });

    it("finishes an in-flight teardown before remounting the same topic", async () => {
        const channels: ReturnType<typeof createChannel>[] = [];
        const removal = Promise.withResolvers<void>();

        mocks.getChannels.mockImplementation(() => channels);
        mocks.channel.mockImplementation((topic: string) => {
            const realtimeTopic = `realtime:${topic}`;
            const existing = channels.find((channel) => channel.topic === realtimeTopic);
            if (existing) return existing;

            const channel = createChannel(realtimeTopic);
            channels.push(channel);
            return channel;
        });
        mocks.removeChannel.mockImplementation(async (channel) => {
            await removal.promise;
            const channelIndex = channels.indexOf(channel);
            if (channelIndex >= 0) channels.splice(channelIndex, 1);
            return "ok";
        });

        const first = createVaultRealtimeSync("vault-1", "user-1");
        await first.subscribe({ onUpdate: vi.fn() });

        const teardown = first.unsubscribe();
        const second = createVaultRealtimeSync("vault-1", "user-1");
        const remount = second.subscribe({ onUpdate: vi.fn() });

        await vi.waitFor(() => {
            expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
        });
        expect(mocks.channel).toHaveBeenCalledTimes(1);

        removal.resolve();
        await teardown;
        await remount;

        expect(mocks.channel).toHaveBeenCalledTimes(2);
        expect(second.subscribed).toBe(false);
    });
});
