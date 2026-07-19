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

import { realtimeRouter } from "@/server/routers/realtime";
import type { TRPCContext } from "@/server/trpc";

const verifiedHash = createHash("sha256").update("verified-member").digest("hex");
const vaultId = "20000000-0000-4000-8000-000000000001";
const grantId = "10000000-0000-4000-8000-000000000001";

function createContext(authenticated: boolean): TRPCContext {
    return {
        pubkeyHash: null,
        publicKey: authenticated ? "verified-public-key" : null,
        headers: authenticated
            ? {
                  "x-pubkey": "verified-public-key",
                  "x-timestamp": "1784505600000",
                  "x-nonce": "verified-realtime-nonce",
                  "x-signature": "verified-signature"
              }
            : {},
        req: {
            method: "POST",
            path: "/api/trpc",
            body: [{ path: "realtime.authorize", input: { vaultId, purpose: "sync" } }]
        }
    };
}

function decodePayload(token: string): Record<string, unknown> {
    const payload = token.split(".")[1];
    if (!payload) throw new Error("JWT payload missing");
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!isUnknownRecord(parsed)) {
        throw new Error("JWT payload invalid");
    }
    return parsed;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    mocks.createSupabaseClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.verifyRequest.mockResolvedValue({
        verified: true,
        pubkeyHash: verifiedHash,
        nonce: "verified-realtime-nonce",
        requestTimestampMs: 1784505600000
    });
    mocks.rpc.mockImplementation((name: string) => {
        if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
        if (name === "rotate_realtime_grant") {
            return Promise.resolve({
                data: [
                    {
                        grant_id: grantId,
                        vault_role: "member",
                        expires_at: new Date(Date.now() + 60_000).toISOString()
                    }
                ],
                error: null
            });
        }
        return Promise.resolve({ data: null, error: { message: "unexpected RPC" } });
    });
});

describe("realtime authorization router", () => {
    it("rejects anonymous minting before database access", async () => {
        await expect(
            realtimeRouter
                .createCaller(createContext(false))
                .authorize({ vaultId, purpose: "sync" })
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("mints a short-lived exact-scope token without an identity hash", async () => {
        const result = await realtimeRouter
            .createCaller(createContext(true))
            .authorize({ vaultId, purpose: "sync" });
        const claims = decodePayload(result.token);

        expect(claims).toMatchObject({
            jti: grantId,
            role: "authenticated",
            vault_id: vaultId,
            realtime_table: "vault_ops",
            realtime_purpose: "sync",
            realtime_topic: `vault:${vaultId}:sync`,
            vault_role: "member"
        });
        expect(claims).not.toHaveProperty("pubkey_hash");
        expect(JSON.stringify(result)).not.toContain(verifiedHash);
        expect(Number(claims.exp) - Number(claims.iat)).toBe(60);
        expect(mocks.rpc).toHaveBeenCalledWith(
            "rotate_realtime_grant",
            expect.objectContaining({
                p_pubkey_hash: verifiedHash,
                p_vault_id: vaultId,
                p_purpose: "sync"
            })
        );
    });

    it("fails closed when current membership authorization is denied", async () => {
        mocks.rpc.mockImplementation((name: string) => {
            if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
            return Promise.resolve({ data: null, error: { code: "42501" } });
        });

        await expect(
            realtimeRouter.createCaller(createContext(true)).authorize({ vaultId, purpose: "sync" })
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
});
