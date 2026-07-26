/**
 * Integration Tests: Realtime grant lifecycle at the tRPC boundary (HS-015).
 *
 * The realtime grant is the ONLY thing standing between a browser socket and a vault's encrypted
 * operation stream, so these tests pin its exact shape: which identity may mint one, what the token
 * is scoped to, how long it lives, that it cannot be forged or widened, and that rotation/revocation
 * flow through the pubkey-hash-bound database RPC rather than the browser.
 *
 * Socket-side enforcement of the same claims is covered against the real Realtime server in
 * `tests/integration/realtime-socket-security.test.ts`.
 */

import { createHash, createHmac } from "node:crypto";

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

const jwtSecret = "test-secret-that-is-at-least-thirty-two-characters";
const memberHash = createHash("sha256").update("verified-member").digest("hex");
const outsiderHash = createHash("sha256").update("verified-outsider").digest("hex");
const vaultId = "20000000-0000-4000-8000-000000000001";
const otherVaultId = "20000000-0000-4000-8000-0000000000ff";
const grantId = "10000000-0000-4000-8000-000000000001";
const rotatedGrantId = "10000000-0000-4000-8000-000000000002";

interface PostgresRpcError {
    readonly code: string;
}

type RpcResult = { data: unknown; error: PostgresRpcError | null };

function createContext(pubkeyHash: string | null): TRPCContext {
    return {
        pubkeyHash: null,
        publicKey: pubkeyHash ? "verified-public-key" : null,
        headers: pubkeyHash
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

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeClaims(token: string): Record<string, unknown> {
    const payload = token.split(".")[1];
    if (!payload) throw new Error("JWT payload missing");
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!isUnknownRecord(parsed)) throw new Error("JWT payload invalid");
    return parsed;
}

/** Recomputes the HS256 signature the way the Realtime server does before trusting any claim. */
function signatureIsValid(token: string, secret: string): boolean {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return false;
    const expected = createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64url");
    return signature === expected;
}

/** Membership state the `rotate_realtime_grant` RPC would see, keyed by identity hash. */
function grantingRpc(membership: ReadonlyMap<string, "owner" | "member">) {
    return (name: string, parameters: unknown): Promise<RpcResult> => {
        if (name === "claim_request_nonce") {
            return Promise.resolve({ data: true, error: null });
        }
        if (name !== "rotate_realtime_grant" || !isUnknownRecord(parameters)) {
            return Promise.resolve({ data: null, error: { code: "42883" } });
        }
        const callerHash = parameters.p_pubkey_hash;
        const requestedVaultId = parameters.p_vault_id;
        const role = typeof callerHash === "string" ? membership.get(callerHash) : undefined;
        // The RPC scopes membership to one exact vault; anything else raises 42501.
        if (!role || requestedVaultId !== vaultId) {
            return Promise.resolve({ data: null, error: { code: "42501" } });
        }
        const isRotation = parameters.p_previous_grant_id !== NO_PREVIOUS_GRANT_ID;
        return Promise.resolve({
            data: [
                {
                    grant_id: isRotation ? rotatedGrantId : grantId,
                    vault_role: role,
                    expires_at: new Date(Date.now() + 60_000).toISOString()
                }
            ],
            error: null
        });
    };
}

const NO_PREVIOUS_GRANT_ID = "00000000-0000-0000-0000-000000000000";

beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = jwtSecret;
    mocks.createSupabaseClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.verifyRequest.mockResolvedValue({
        verified: true,
        pubkeyHash: memberHash,
        nonce: "verified-realtime-nonce",
        requestTimestampMs: 1784505600000
    });
    mocks.rpc.mockImplementation(grantingRpc(new Map([[memberHash, "member"]])));
});

describe("realtime grant minting", () => {
    it("binds the mint to the signature-verified pubkey hash, never to client input", async () => {
        await realtimeRouter.createCaller(createContext(memberHash)).authorize({
            vaultId,
            purpose: "sync"
        });

        expect(mocks.rpc).toHaveBeenCalledWith("rotate_realtime_grant", {
            p_pubkey_hash: memberHash,
            p_vault_id: vaultId,
            p_purpose: "sync",
            p_previous_grant_id: NO_PREVIOUS_GRANT_ID,
            p_ttl_seconds: 60
        });
    });

    it("issues a verifiable HS256 token scoped to exactly one vault, topic, table and role", async () => {
        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });
        const claims = decodeClaims(credential.token);

        expect(signatureIsValid(credential.token, jwtSecret)).toBe(true);
        expect(claims).toMatchObject({
            jti: grantId,
            sub: grantId,
            role: "authenticated",
            vault_id: vaultId,
            realtime_table: "vault_ops",
            realtime_purpose: "sync",
            realtime_topic: `vault:${vaultId}:sync`,
            vault_role: "member"
        });
    });

    it("never subscribes to the legacy duplicated table", async () => {
        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });

        expect(decodeClaims(credential.token).realtime_table).toBe("vault_ops");
        expect(credential.token).not.toContain("vault_updates");
    });

    it("keeps the token short-lived with a refresh lead inside its own lifetime", async () => {
        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });
        const claims = decodeClaims(credential.token);

        expect(Number(claims.exp) - Number(claims.iat)).toBe(60);
        // A small backdated nbf absorbs clock skew without extending the usable window.
        expect(Number(claims.iat) - Number(claims.nbf)).toBe(5);
        const refreshAt = Date.parse(credential.refreshAt);
        const expiresAt = Date.parse(credential.expiresAt);
        expect(refreshAt).toBeLessThan(expiresAt);
        expect(expiresAt - refreshAt).toBe(20_000);
    });

    it("keeps the identity hash out of the token and the response", async () => {
        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });

        expect(decodeClaims(credential.token)).not.toHaveProperty("pubkey_hash");
        expect(JSON.stringify(credential)).not.toContain(memberHash);
    });

    it("never returns the signing secret to the browser", async () => {
        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });

        expect(JSON.stringify(credential)).not.toContain(jwtSecret);
        expect(JSON.stringify(decodeClaims(credential.token))).not.toContain(jwtSecret);
    });

    it("mints a token no other secret can forge", async () => {
        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });

        expect(signatureIsValid(credential.token, "a-different-secret-of-sufficient-length")).toBe(
            false
        );
    });

    it("invalidates the signature when a claim is widened after minting", async () => {
        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });
        const [header, payload, signature] = credential.token.split(".");
        const escalated = Buffer.from(
            JSON.stringify({ ...decodeClaims(credential.token), vault_role: "owner" }),
            "utf8"
        ).toString("base64url");

        expect(signatureIsValid(`${header}.${escalated}.${signature}`, jwtSecret)).toBe(false);
        expect(escalated).not.toBe(payload);
    });

    it("refuses to mint at all when the server has no usable signing secret", async () => {
        delete process.env.SUPABASE_JWT_SECRET;

        await expect(
            realtimeRouter.createCaller(createContext(memberHash)).authorize({
                vaultId,
                purpose: "sync"
            })
        ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
        // Failing closed means no database work happens either.
        expect(mocks.rpc).not.toHaveBeenCalledWith("rotate_realtime_grant", expect.anything());
    });
});

describe("realtime grant authorization boundaries", () => {
    it("rejects an unauthenticated caller before any database access", async () => {
        await expect(
            realtimeRouter.createCaller(createContext(null)).authorize({ vaultId, purpose: "sync" })
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
        expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it("denies an outsider whose identity has no membership in the vault", async () => {
        mocks.verifyRequest.mockResolvedValue({
            verified: true,
            pubkeyHash: outsiderHash,
            nonce: "verified-realtime-nonce",
            requestTimestampMs: 1784505600000
        });

        await expect(
            realtimeRouter
                .createCaller(createContext(outsiderHash))
                .authorize({ vaultId, purpose: "sync" })
        ).rejects.toMatchObject({ code: "FORBIDDEN", message: "Vault access denied" });
    });

    it("denies a member reaching across into a vault it does not belong to", async () => {
        await expect(
            realtimeRouter
                .createCaller(createContext(memberHash))
                .authorize({ vaultId: otherVaultId, purpose: "sync" })
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("mints the role the database reports, not a role the caller asks for", async () => {
        mocks.rpc.mockImplementation(grantingRpc(new Map([[memberHash, "member"]])));

        const credential = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" });

        expect(decodeClaims(credential.token).vault_role).toBe("member");
    });

    it("reports an authorization failure without leaking database detail", async () => {
        mocks.rpc.mockImplementation((name: string): Promise<RpcResult> => {
            if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
            return Promise.resolve({ data: null, error: { code: "42501" } });
        });

        const denial = await realtimeRouter
            .createCaller(createContext(memberHash))
            .authorize({ vaultId, purpose: "sync" })
            .catch((error: unknown) => error);

        expect(denial).toMatchObject({ code: "FORBIDDEN" });
        expect(JSON.stringify(denial)).not.toContain("42501");
        expect(JSON.stringify(denial)).not.toContain(memberHash);
    });

    it("fails closed when the grant row does not match its expected shape", async () => {
        mocks.rpc.mockImplementation((name: string): Promise<RpcResult> => {
            if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
            return Promise.resolve({
                data: [{ grant_id: grantId, vault_role: "superuser", expires_at: "not-a-date" }],
                error: null
            });
        });

        await expect(
            realtimeRouter
                .createCaller(createContext(memberHash))
                .authorize({ vaultId, purpose: "sync" })
        ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });
});

describe("realtime grant refresh and revocation", () => {
    it("carries the prior grant id so the database can rotate rather than accumulate", async () => {
        const caller = realtimeRouter.createCaller(createContext(memberHash));
        const first = await caller.authorize({ vaultId, purpose: "sync" });
        const refreshed = await caller.authorize({
            vaultId,
            purpose: "sync",
            previousGrantId: first.grantId
        });

        expect(refreshed.grantId).not.toBe(first.grantId);
        expect(refreshed.token).not.toBe(first.token);
        expect(mocks.rpc).toHaveBeenLastCalledWith(
            "rotate_realtime_grant",
            expect.objectContaining({ p_previous_grant_id: first.grantId })
        );
    });

    it("surfaces a denied rotation rather than silently issuing a fresh grant", async () => {
        mocks.rpc.mockImplementation((name: string, parameters: unknown): Promise<RpcResult> => {
            if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
            if (
                isUnknownRecord(parameters) &&
                parameters.p_previous_grant_id !== NO_PREVIOUS_GRANT_ID
            ) {
                return Promise.resolve({ data: null, error: { code: "42501" } });
            }
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
        });
        const caller = realtimeRouter.createCaller(createContext(memberHash));
        const first = await caller.authorize({ vaultId, purpose: "sync" });

        await expect(
            caller.authorize({ vaultId, purpose: "sync", previousGrantId: first.grantId })
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("revokes only through the caller's own verified identity and exact scope", async () => {
        mocks.rpc.mockImplementation((name: string): Promise<RpcResult> => {
            if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
            if (name === "revoke_realtime_grant")
                return Promise.resolve({ data: true, error: null });
            return Promise.resolve({ data: null, error: { code: "42883" } });
        });

        const result = await realtimeRouter
            .createCaller(createContext(memberHash))
            .revoke({ vaultId, purpose: "sync", grantId });

        expect(result).toEqual({ revoked: true });
        expect(mocks.rpc).toHaveBeenCalledWith("revoke_realtime_grant", {
            p_pubkey_hash: memberHash,
            p_vault_id: vaultId,
            p_purpose: "sync",
            p_grant_id: grantId
        });
    });

    it("rejects an unauthenticated revoke", async () => {
        await expect(
            realtimeRouter
                .createCaller(createContext(null))
                .revoke({ vaultId, purpose: "sync", grantId })
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("reports an unmatched revoke as not revoked instead of claiming success", async () => {
        mocks.rpc.mockImplementation((name: string): Promise<RpcResult> => {
            if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
            if (name === "revoke_realtime_grant") {
                return Promise.resolve({ data: false, error: null });
            }
            return Promise.resolve({ data: null, error: { code: "42883" } });
        });

        await expect(
            realtimeRouter
                .createCaller(createContext(memberHash))
                .revoke({ vaultId, purpose: "sync", grantId })
        ).resolves.toEqual({ revoked: false });
    });
});

describe("realtime authorization input validation", () => {
    it("rejects a purpose outside the two supported channels", async () => {
        await expect(
            realtimeRouter
                .createCaller(createContext(memberHash))
                // @ts-expect-error deliberately invalid purpose from a hostile client
                .authorize({ vaultId, purpose: "admin" })
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(mocks.rpc).not.toHaveBeenCalledWith("rotate_realtime_grant", expect.anything());
    });

    it("rejects a non-UUID vault identifier before it reaches the database", async () => {
        await expect(
            realtimeRouter
                .createCaller(createContext(memberHash))
                .authorize({ vaultId: "'; DROP TABLE vault_ops; --", purpose: "sync" })
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(mocks.rpc).not.toHaveBeenCalledWith("rotate_realtime_grant", expect.anything());
    });

    it("rejects unknown extra fields that could smuggle scope", async () => {
        await expect(
            realtimeRouter
                .createCaller(createContext(memberHash))
                // @ts-expect-error deliberately extra field from a hostile client
                .authorize({ vaultId, purpose: "sync", vaultRole: "owner" })
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
});
