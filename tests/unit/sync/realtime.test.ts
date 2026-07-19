import { beforeEach, describe, expect, it, vi } from "vitest";

import { createVaultRealtimeSync } from "@/lib/supabase/realtime";

const mocks = vi.hoisted(() => ({
    channel: vi.fn()
}));

vi.mock("@/lib/supabase/client", () => ({
    createSupabaseClientForBrowser: () => ({
        channel: mocks.channel
    })
}));

function createChannel() {
    const channel = {
        on: vi.fn(),
        presenceState: vi.fn(() => ({})),
        subscribe: vi.fn(),
        track: vi.fn(),
        unsubscribe: vi.fn()
    };

    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    channel.track.mockResolvedValue("ok");
    channel.unsubscribe.mockResolvedValue("ok");

    return channel;
}

describe("VaultRealtimeSync", () => {
    beforeEach(() => {
        mocks.channel.mockReset();
        mocks.channel.mockImplementation(() => createChannel());
    });

    it("uses separate Supabase topics for data sync and presence", () => {
        createVaultRealtimeSync("vault-1", "user-1").subscribe({ onUpdate: vi.fn() });
        createVaultRealtimeSync("vault-1", "user-1", "presence").subscribe({
            onPresence: vi.fn()
        });

        expect(mocks.channel.mock.calls.map(([topic]) => topic)).toEqual([
            "vault:vault-1:sync",
            "vault:vault-1:presence"
        ]);
    });

    it("registers only the callbacks requested by each subscriber", () => {
        const syncChannel = createChannel();
        const presenceChannel = createChannel();
        mocks.channel.mockReturnValueOnce(syncChannel).mockReturnValueOnce(presenceChannel);

        createVaultRealtimeSync("vault-1", "user-1").subscribe({ onUpdate: vi.fn() });
        createVaultRealtimeSync("vault-1", "user-1", "presence").subscribe({
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
});
