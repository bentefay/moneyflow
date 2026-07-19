import sodium from "libsodium-wrappers";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { computePubkeyHash } from "@/lib/crypto/identity";
import { deriveKeysFromSeed, initCrypto, publicKeyToBase64 } from "@/lib/crypto/keypair";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";
import { clearSession, storeSession } from "@/lib/crypto/session";
import { verifyRequest } from "@/lib/crypto/signing";
import { createTRPCClient } from "@/lib/trpc/client";

const nonceRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseClient: vi.fn(async () => ({ rpc: nonceRpc }))
}));

import { protectedProcedure, router, type TRPCContext } from "@/server/trpc";

const testRouter = router({
    identity: protectedProcedure.query(({ ctx }) => ({
        pubkeyHash: ctx.pubkeyHash,
        publicKey: ctx.publicKey
    }))
});

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function createSignedContext(
    body: unknown,
    method: "GET" | "POST" = "POST"
): Promise<{
    context: TRPCContext;
    expectedHash: string;
}> {
    const masterSeed = await mnemonicToMasterSeed(generateSeedPhrase());
    const keys = await deriveKeysFromSeed(masterSeed);
    const timestamp = Date.now().toString();
    const nonce = sodium.to_base64(sodium.randombytes_buf(32), sodium.base64_variants.ORIGINAL);
    const bodyHash =
        body === undefined
            ? ""
            : sodium.to_base64(
                  sodium.crypto_generichash(32, JSON.stringify(body), null),
                  sodium.base64_variants.ORIGINAL
              );
    const message = `${method}\n/api/trpc\n${timestamp}\n${nonce}\n${bodyHash}`;
    const signature = sodium.crypto_sign_detached(
        Uint8Array.from(new TextEncoder().encode(message)),
        keys.signing.privateKey
    );
    const publicKey = publicKeyToBase64(keys.signing.publicKey);

    return {
        context: {
            pubkeyHash: null,
            publicKey,
            headers: {
                "x-pubkey": publicKey,
                "x-timestamp": timestamp,
                "x-nonce": nonce,
                "x-signature": sodium.to_base64(signature, sodium.base64_variants.ORIGINAL)
            },
            req: { method, path: "/api/trpc", body }
        },
        expectedHash: computePubkeyHash(keys.signing.publicKey)
    };
}

beforeAll(async () => {
    await initCrypto();
});

beforeEach(() => {
    nonceRpc.mockReset();
    nonceRpc.mockResolvedValue({ data: true, error: null });
});

afterEach(() => {
    clearSession();
    vi.unstubAllGlobals();
});

describe("protectedProcedure authentication", () => {
    it("derives identity only from a verified public key and atomically claims its nonce", async () => {
        const body = [{ path: "identity", input: null }];
        const { context, expectedHash } = await createSignedContext(body);

        await expect(testRouter.createCaller(context).identity()).resolves.toEqual({
            pubkeyHash: expectedHash,
            publicKey: context.publicKey
        });
        expect(nonceRpc).toHaveBeenCalledWith("claim_request_nonce", {
            p_pubkey_hash: expectedHash,
            p_nonce: context.headers["x-nonce"],
            p_request_timestamp_ms: Number(context.headers["x-timestamp"])
        });
    });

    it("rejects replay when the database nonce claim loses the unique race", async () => {
        const body = [{ path: "identity", input: null }];
        const { context } = await createSignedContext(body);
        nonceRpc.mockResolvedValue({ data: false, error: null });

        await expect(testRouter.createCaller(context).identity()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
            message: "Request authentication failed"
        });
    });

    it("rejects body substitution before touching replay state", async () => {
        const signedBody = [{ path: "identity", input: null }];
        const { context } = await createSignedContext(signedBody);
        const tamperedContext: TRPCContext = {
            ...context,
            req: { ...context.req, body: [{ path: "vault.delete", input: {} }] }
        };

        await expect(testRouter.createCaller(tamperedContext).identity()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
            message: "Invalid signature"
        });
        expect(nonceRpc).not.toHaveBeenCalled();
    });

    it("rejects authenticated GET even when its generic representation is correctly signed", async () => {
        const { context } = await createSignedContext(undefined, "GET");

        await expect(testRouter.createCaller(context).identity()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
            message: "Authenticated requests must use POST"
        });
        expect(nonceRpc).not.toHaveBeenCalled();
    });

    it("rejects exact procedure substitution before touching replay state", async () => {
        const signedBody = [{ path: "identity", input: { vaultId: crypto.randomUUID() } }];
        const { context } = await createSignedContext(signedBody);
        const tamperedContext: TRPCContext = {
            ...context,
            req: {
                ...context.req,
                body: [{ path: "vault.delete", input: signedBody[0]?.input }]
            }
        };

        await expect(testRouter.createCaller(tamperedContext).identity()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
            message: "Invalid signature"
        });
        expect(nonceRpc).not.toHaveBeenCalled();
    });

    it("rejects exact input substitution before touching replay state", async () => {
        const signedBody = [{ path: "identity", input: { vaultId: crypto.randomUUID() } }];
        const { context } = await createSignedContext(signedBody);
        const tamperedContext: TRPCContext = {
            ...context,
            req: {
                ...context.req,
                body: [{ path: "identity", input: { vaultId: crypto.randomUUID() } }]
            }
        };

        await expect(testRouter.createCaller(tamperedContext).identity()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
            message: "Invalid signature"
        });
        expect(nonceRpc).not.toHaveBeenCalled();
    });

    it("rejects a spoofed public key before touching replay state", async () => {
        const body = [{ path: "identity", input: null }];
        const { context } = await createSignedContext(body);
        const otherSeed = await mnemonicToMasterSeed(generateSeedPhrase());
        const otherKeys = await deriveKeysFromSeed(otherSeed);
        const spoofedContext: TRPCContext = {
            ...context,
            publicKey: publicKeyToBase64(otherKeys.signing.publicKey),
            headers: {
                ...context.headers,
                "x-pubkey": publicKeyToBase64(otherKeys.signing.publicKey)
            }
        };

        await expect(testRouter.createCaller(spoofedContext).identity()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
            message: "Invalid signature"
        });
        expect(nonceRpc).not.toHaveBeenCalled();
    });
});

describe("production tRPC transport", () => {
    it("sends authenticated query input only in a signed POST body", async () => {
        const masterSeed = await mnemonicToMasterSeed(generateSeedPhrase());
        const keys = await deriveKeysFromSeed(masterSeed);
        storeSession({
            publicKey: publicKeyToBase64(keys.signing.publicKey),
            secretKey: sodium.to_base64(keys.signing.privateKey, sodium.base64_variants.ORIGINAL),
            encPublicKey: publicKeyToBase64(keys.encryption.publicKey),
            encSecretKey: sodium.to_base64(
                keys.encryption.privateKey,
                sodium.base64_variants.ORIGINAL
            ),
            pubkeyHash: computePubkeyHash(keys.signing.publicKey)
        });

        const fetchMock = vi.fn<typeof fetch>(async () =>
            Promise.resolve(
                new Response(JSON.stringify([{ result: { data: { json: null } } }]), {
                    headers: { "content-type": "application/json" }
                })
            )
        );
        vi.stubGlobal("fetch", fetchMock);

        const vaultId = crypto.randomUUID();
        const versionVector = JSON.stringify({ peer: 17 });
        await createTRPCClient()
            .sync.getUpdates.query({ vaultId, versionVector, hasUnpushed: true })
            .catch(() => undefined);

        expect(fetchMock).toHaveBeenCalledOnce();
        const request = fetchMock.mock.calls.at(0);
        expect(request).toBeDefined();
        if (!request) throw new Error("Expected one tRPC request");

        const [requestUrl, requestInit] = request;
        if (!requestInit) throw new Error("Expected tRPC request options");
        const url = String(requestUrl);
        expect(requestInit.method).toBe("POST");
        expect(url).not.toContain("input=");
        expect(url).not.toContain(vaultId);
        expect(url).not.toContain(encodeURIComponent(vaultId));
        expect(url).not.toContain(versionVector);
        expect(url).not.toContain("hasUnpushed");

        const requestBody = requestInit.body;
        expect(typeof requestBody).toBe("string");
        if (typeof requestBody !== "string") throw new Error("Expected a JSON request body");
        expect(requestBody).toContain(vaultId);
        expect(requestBody).toContain("hasUnpushed");

        const headers = new Headers(requestInit.headers);
        expect(headers.get("x-pubkey")).toBeTruthy();
        expect(headers.get("x-timestamp")).toMatch(/^\d{13}$/);
        expect(headers.get("x-nonce")).toBeTruthy();
        expect(headers.get("x-signature")).toBeTruthy();

        const wireBody: unknown = JSON.parse(requestBody);
        if (!isUnknownRecord(wireBody)) throw new Error("Expected indexed tRPC wire inputs");
        const procedureNames = new URL(url, "http://localhost").pathname
            .replace("/api/trpc/", "")
            .split(",");
        const normalizedBody = Object.keys(wireBody).map((key, index) => ({
            path: procedureNames[index] ?? "",
            input: wireBody[key]
        }));
        const verification = await verifyRequest("POST", "/api/trpc", normalizedBody, {
            "X-Pubkey": headers.get("x-pubkey") ?? undefined,
            "X-Timestamp": headers.get("x-timestamp") ?? undefined,
            "X-Nonce": headers.get("x-nonce") ?? undefined,
            "X-Signature": headers.get("x-signature") ?? undefined
        });
        expect(verification.verified).toBe(true);
    });
});
