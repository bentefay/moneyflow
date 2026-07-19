import sodium from "libsodium-wrappers";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { computePubkeyHash } from "@/lib/crypto/identity";
import { deriveKeysFromSeed, initCrypto, publicKeyToBase64 } from "@/lib/crypto/keypair";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";

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

async function createSignedContext(body: unknown): Promise<{
    context: TRPCContext;
    expectedHash: string;
}> {
    const masterSeed = await mnemonicToMasterSeed(generateSeedPhrase());
    const keys = await deriveKeysFromSeed(masterSeed);
    const timestamp = Date.now().toString();
    const nonce = sodium.to_base64(sodium.randombytes_buf(32), sodium.base64_variants.ORIGINAL);
    const bodyHash = sodium.to_base64(
        sodium.crypto_generichash(32, JSON.stringify(body), null),
        sodium.base64_variants.ORIGINAL
    );
    const message = `POST\n/api/trpc\n${timestamp}\n${nonce}\n${bodyHash}`;
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
            req: { method: "POST", path: "/api/trpc", body }
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
