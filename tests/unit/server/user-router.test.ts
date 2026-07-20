import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyRequest: vi.fn(),
    createSupabaseClient: vi.fn(),
    rpc: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    single: vi.fn()
}));

vi.mock("@/lib/crypto/signing", () => ({
    isSignedTRPCOperationList: () => true,
    verifyRequest: mocks.verifyRequest
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseClient: mocks.createSupabaseClient
}));

import { userRouter } from "@/server/routers/user";
import { userGetOrCreateInput, userRegisterInput } from "@/server/schemas/user";
import type { TRPCContext } from "@/server/trpc";

const verifiedHash = "a".repeat(64);
const otherHash = "b".repeat(64);

function createContext(authenticated: boolean): TRPCContext {
    return {
        pubkeyHash: null,
        publicKey: authenticated ? "verified-public-key" : null,
        headers: authenticated
            ? {
                  "x-pubkey": "verified-public-key",
                  "x-timestamp": "1740000000000",
                  "x-nonce": "verified-nonce",
                  "x-signature": "verified-signature"
              }
            : {},
        req: {
            method: "POST",
            path: "/api/trpc",
            body: [{ path: "user.register", input: {} }]
        }
    };
}

beforeEach(() => {
    vi.clearAllMocks();

    const query = {
        select: mocks.select,
        eq: mocks.eq,
        maybeSingle: mocks.maybeSingle,
        insert: mocks.insert,
        single: mocks.single
    };

    mocks.createSupabaseClient.mockResolvedValue({
        rpc: mocks.rpc,
        from: mocks.from
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.insert.mockReturnValue(query);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.single.mockResolvedValue({
        data: { updated_at: "2026-07-20T00:00:00.000Z" },
        error: null
    });
    mocks.verifyRequest.mockResolvedValue({
        verified: true,
        pubkeyHash: verifiedHash,
        nonce: "verified-nonce",
        requestTimestampMs: 1740000000000
    });
});

describe("user router verified identity boundary", () => {
    it("exposes only registration and normalized membership procedures", () => {
        expect(Object.keys(userRouter._def.procedures).sort()).toEqual([
            "getOrCreate",
            "myVaults",
            "register"
        ]);
    });

    it("rejects anonymous registration before service-role access", async () => {
        await expect(
            userRouter.createCaller(createContext(false)).register({})
        ).rejects.toMatchObject({
            code: "UNAUTHORIZED"
        });
        expect(mocks.createSupabaseClient).not.toHaveBeenCalled();
    });

    it("registers only the identity derived by verified middleware", async () => {
        await expect(userRouter.createCaller(createContext(true)).register({})).resolves.toEqual({
            success: true,
            isNew: true
        });

        expect(mocks.eq).toHaveBeenCalledWith("pubkey_hash", verifiedHash);
        expect(mocks.insert).toHaveBeenCalledWith({ pubkey_hash: verifiedHash });
    });

    it("rejects an authenticated attempt to claim a different hash", async () => {
        const claimedInput = { pubkeyHash: otherHash };

        expect(userRegisterInput.safeParse(claimedInput).success).toBe(false);
        expect(userGetOrCreateInput.safeParse(claimedInput).success).toBe(false);
        expect(mocks.from).not.toHaveBeenCalled();
    });

    it("gets existing registration metadata only for the verified identity", async () => {
        mocks.maybeSingle.mockResolvedValue({
            data: { updated_at: "2026-07-20T00:00:00.000Z" },
            error: null
        });

        await expect(userRouter.createCaller(createContext(true)).getOrCreate({})).resolves.toEqual(
            {
                isNew: false,
                updatedAt: "2026-07-20T00:00:00.000Z"
            }
        );
        expect(mocks.eq).toHaveBeenCalledWith("pubkey_hash", verifiedHash);
        expect(mocks.eq).not.toHaveBeenCalledWith("pubkey_hash", otherHash);
    });

    it("creates a missing identity without a generic state payload", async () => {
        await expect(userRouter.createCaller(createContext(true)).getOrCreate({})).resolves.toEqual(
            {
                isNew: true,
                updatedAt: "2026-07-20T00:00:00.000Z"
            }
        );

        expect(mocks.insert).toHaveBeenCalledWith({ pubkey_hash: verifiedHash });
        expect(mocks.select).toHaveBeenCalledWith("updated_at");
    });
});
