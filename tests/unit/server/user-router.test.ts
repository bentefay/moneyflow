import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyRequest: vi.fn(),
    createSupabaseClient: vi.fn(),
    rpc: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn()
}));

vi.mock("@/lib/crypto/signing", () => ({
    isSignedTRPCOperationList: () => true,
    verifyRequest: mocks.verifyRequest
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseClient: mocks.createSupabaseClient
}));

import { userRouter } from "@/server/routers/user";
import { userExistsInput, userRegisterInput } from "@/server/schemas/user";
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
        insert: mocks.insert
    };

    mocks.createSupabaseClient.mockResolvedValue({
        rpc: mocks.rpc,
        from: mocks.from
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.verifyRequest.mockResolvedValue({
        verified: true,
        pubkeyHash: verifiedHash,
        nonce: "verified-nonce",
        requestTimestampMs: 1740000000000
    });
});

describe("user router verified identity boundary", () => {
    it("rejects anonymous claimed-hash existence checks before service-role access", async () => {
        await expect(
            userRouter.createCaller(createContext(false)).exists({})
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
        expect(mocks.insert).toHaveBeenCalledWith(
            expect.objectContaining({ pubkey_hash: verifiedHash })
        );
    });

    it("rejects an authenticated attempt to claim a different hash", async () => {
        const claimedInput = { pubkeyHash: otherHash };

        expect(userExistsInput.safeParse(claimedInput).success).toBe(false);
        expect(userRegisterInput.safeParse(claimedInput).success).toBe(false);
        expect(mocks.from).not.toHaveBeenCalled();
    });

    it("fetches an existing encrypted blob only for the verified identity", async () => {
        mocks.maybeSingle.mockResolvedValue({
            data: { encrypted_data: "ZW5jcnlwdGVk", updated_at: "2026-07-20T00:00:00.000Z" },
            error: null
        });

        await expect(userRouter.createCaller(createContext(true)).getOrCreate({})).resolves.toEqual(
            {
                isNew: false,
                encryptedData: "ZW5jcnlwdGVk",
                updatedAt: "2026-07-20T00:00:00.000Z"
            }
        );
        expect(mocks.eq).toHaveBeenCalledWith("pubkey_hash", verifiedHash);
        expect(mocks.eq).not.toHaveBeenCalledWith("pubkey_hash", otherHash);
    });
});
