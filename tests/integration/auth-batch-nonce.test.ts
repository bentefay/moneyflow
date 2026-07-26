/**
 * Batched authenticated requests share a single one-use nonce. The auth
 * middleware runs once per procedure, so the nonce must be claimed exactly once
 * per HTTP request; otherwise every procedure after the first in a batch is
 * rejected as a replay. This exercises that memoization end to end through the
 * real middleware.
 */

import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyRequest: vi.fn(),
    createSupabaseClient: vi.fn(),
    rpc: vi.fn()
}));

vi.mock("@/lib/crypto/signing", () => ({
    isSignedTRPCOperationList: () => true,
    verifyRequest: mocks.verifyRequest
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseClient: mocks.createSupabaseClient
}));

import type { TRPCContext } from "@/server/trpc";
import { protectedProcedure, router } from "@/server/trpc";

const verifiedHash = createHash("sha256").update("batch-member").digest("hex");
const nonce = "batched-request-nonce-value-that-is-long-enough";
const timestampMs = 1784505600000;

const probeRouter = router({
    first: protectedProcedure.query(({ ctx }) => ({ who: ctx.pubkeyHash })),
    second: protectedProcedure.query(({ ctx }) => ({ who: ctx.pubkeyHash }))
});

function createBatchContext(): TRPCContext {
    return {
        pubkeyHash: null,
        publicKey: "verified-public-key",
        headers: {
            "x-pubkey": "verified-public-key",
            "x-timestamp": String(timestampMs),
            "x-nonce": nonce,
            "x-signature": "verified-signature"
        },
        req: {
            method: "POST",
            path: "/api/trpc",
            body: [
                { path: "first", input: { json: null } },
                { path: "second", input: { json: null } }
            ]
        },
        nonceClaims: new Map()
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.verifyRequest.mockResolvedValue({
        verified: true,
        pubkeyHash: verifiedHash,
        nonce,
        requestTimestampMs: timestampMs
    });

    // A one-use nonce: the database accepts the first claim and rejects any
    // later claim of the same nonce.
    let claimed = false;
    mocks.rpc.mockImplementation((name: string) => {
        if (name === "claim_request_nonce") {
            if (claimed) return Promise.resolve({ data: false, error: null });
            claimed = true;
            return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: { message: "unexpected RPC" } });
    });
});

describe("batched authenticated requests", () => {
    it("authenticates every procedure in a batch that shares one nonce", async () => {
        const ctx = createBatchContext();
        const caller = probeRouter.createCaller(ctx);

        const [first, second] = await Promise.all([caller.first(), caller.second()]);

        expect(first).toEqual({ who: verifiedHash });
        expect(second).toEqual({ who: verifiedHash });
    });

    it("claims the shared nonce exactly once for the whole request", async () => {
        const ctx = createBatchContext();
        const caller = probeRouter.createCaller(ctx);

        await Promise.all([caller.first(), caller.second()]);

        const claimCalls = mocks.rpc.mock.calls.filter(([name]) => name === "claim_request_nonce");
        expect(claimCalls).toHaveLength(1);
    });
});
