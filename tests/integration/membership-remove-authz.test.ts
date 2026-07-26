/**
 * Integration tests for `membership.remove` authorization (DoD 5, HS-011).
 *
 * Member removal is an owner-only capability: the router must reject a caller who
 * is a non-owner member, and a caller who is not a member of the vault at all.
 * These drive the real router logic against a mocked Supabase client and a
 * signature-verified context, asserting the authorization gate — not the wire
 * schema, which `invite.test.ts` already covers.
 *
 * No real secret material is used: hashes are synthetic hex strings.
 */

import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyRequest: vi.fn(),
    createSupabaseClient: vi.fn()
}));

vi.mock("@/lib/crypto/signing", () => ({
    isSignedTRPCOperationList: () => true,
    verifyRequest: mocks.verifyRequest
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseClient: mocks.createSupabaseClient
}));

import { membershipRouter } from "@/server/routers/membership";
import type { TRPCContext } from "@/server/trpc";

const vaultId = "660e8400-e29b-41d4-a716-446655440111";
const callerHash = createHash("sha256").update("non-owner-member").digest("hex");
const targetHash = createHash("sha256").update("some-other-member").digest("hex");

/**
 * Supabase double covering both surfaces this path touches: the auth
 * middleware's `claim_request_nonce` RPC, and the router's caller-membership
 * lookup. `callerRole` is the persisted role the vault would return for the
 * caller, or null when the caller is not a member.
 */
function createSupabaseMock(callerRole: "owner" | "member" | null) {
    const membershipRow =
        callerRole != null
            ? { data: { role: callerRole }, error: null }
            : { data: null, error: { code: "PGRST116" } };
    const builder = {
        select: () => builder,
        eq: () => builder,
        single: () => Promise.resolve(membershipRow)
    };
    return {
        from: () => builder,
        rpc: (name: string) =>
            Promise.resolve(
                name === "claim_request_nonce"
                    ? { data: true, error: null }
                    : { data: null, error: { code: "42883" } }
            )
    };
}

function createContext(): TRPCContext {
    return {
        pubkeyHash: null,
        publicKey: "verified-public-key",
        headers: {
            "x-pubkey": "verified-public-key",
            "x-timestamp": "1784505600000",
            "x-nonce": "verified-remove-nonce",
            "x-signature": "verified-signature"
        },
        req: {
            method: "POST",
            path: "/api/trpc",
            body: [{ path: "membership.remove", input: { vaultId, pubkeyHash: targetHash } }]
        }
    } as unknown as TRPCContext;
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyRequest.mockResolvedValue({
        verified: true,
        pubkeyHash: callerHash,
        nonce: "verified-remove-nonce",
        requestTimestampMs: 1784505600000
    });
});

describe("membership.remove authorization", () => {
    it("rejects a non-owner member with FORBIDDEN", async () => {
        mocks.createSupabaseClient.mockResolvedValue(createSupabaseMock("member"));

        await expect(
            membershipRouter
                .createCaller(createContext())
                .remove({ vaultId, pubkeyHash: targetHash })
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("rejects a caller who is not a member of the vault", async () => {
        mocks.createSupabaseClient.mockResolvedValue(createSupabaseMock(null));

        await expect(
            membershipRouter
                .createCaller(createContext())
                .remove({ vaultId, pubkeyHash: targetHash })
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
});
