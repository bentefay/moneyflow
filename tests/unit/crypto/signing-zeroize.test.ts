/**
 * Regression tests for secret-key hygiene in signData.
 *
 * Crypto SKILL rule 5 requires zeroizing secret material once it is no longer needed. `signData`
 * previously decoded the Ed25519 secret key (and made a second native copy of it) and left both
 * buffers populated on the heap after signing.
 *
 * All key material here is derived from a freshly generated synthetic seed phrase.
 */

import sodium from "libsodium-wrappers";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { deriveKeysFromSeed, initCrypto, privateKeyToBase64 } from "@/lib/crypto/keypair";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";
import * as session from "@/lib/crypto/session";
import { signData, verifySignature } from "@/lib/crypto/signing";

beforeAll(async () => {
    await initCrypto();
});

afterEach(() => {
    vi.restoreAllMocks();
});

async function installSyntheticSession() {
    const keys = deriveKeysFromSeed(await mnemonicToMasterSeed(generateSeedPhrase()));
    const sessionData = {
        publicKey: sodium.to_base64(keys.signing.publicKey, sodium.base64_variants.ORIGINAL),
        secretKey: privateKeyToBase64(keys.signing.privateKey),
        encPublicKey: sodium.to_base64(keys.encryption.publicKey, sodium.base64_variants.ORIGINAL),
        encSecretKey: sodium.to_base64(keys.encryption.privateKey, sodium.base64_variants.ORIGINAL),
        pubkeyHash: "0".repeat(64)
    };
    vi.spyOn(session, "getSession").mockReturnValue(sessionData);
    return keys;
}

describe("signData secret hygiene", () => {
    it("zeroizes every buffer holding the decoded secret key after signing", async () => {
        const keys = await installSyntheticSession();

        // Capture the buffers signData derives from the session, before they are consumed.
        const decoded: Uint8Array[] = [];
        const fromBase64 = sodium.from_base64.bind(sodium);
        vi.spyOn(sodium, "from_base64").mockImplementation((value, variant) => {
            const bytes = fromBase64(value, variant);
            decoded.push(bytes);
            return bytes;
        });

        const copies: Uint8Array[] = [];
        const originalFrom = Uint8Array.from.bind(Uint8Array);
        const fromSpy = vi
            .spyOn(Uint8Array, "from")
            .mockImplementation((...args: Parameters<typeof originalFrom>) => {
                const copy = originalFrom(...args);
                copies.push(copy);
                return copy;
            });

        const data = new TextEncoder().encode("invite-token-payload");
        const signature = await signData(data);
        fromSpy.mockRestore();

        // The signature must still be valid - zeroizing may not break the operation itself.
        await expect(
            verifySignature(
                data,
                signature,
                sodium.to_base64(keys.signing.publicKey, sodium.base64_variants.ORIGINAL)
            )
        ).resolves.toBe(true);

        const secretKeyLength = keys.signing.privateKey.length;
        const secretSized = [...decoded, ...copies].filter(
            (buffer) => buffer.length === secretKeyLength
        );

        expect(secretSized.length).toBeGreaterThanOrEqual(2);
        for (const buffer of secretSized) {
            expect(buffer.every((byte) => byte === 0)).toBe(true);
        }
    });

    it("zeroizes the secret key even when signing throws", async () => {
        await installSyntheticSession();

        const decoded: Uint8Array[] = [];
        const fromBase64 = sodium.from_base64.bind(sodium);
        vi.spyOn(sodium, "from_base64").mockImplementation((value, variant) => {
            const bytes = fromBase64(value, variant);
            decoded.push(bytes);
            return bytes;
        });
        vi.spyOn(sodium, "crypto_sign_detached").mockImplementation(() => {
            throw new Error("signing backend unavailable");
        });

        await expect(signData(new TextEncoder().encode("payload"))).rejects.toThrow(
            "signing backend unavailable"
        );

        const secretSized = decoded.filter((buffer) => buffer.length === 64);
        expect(secretSized.length).toBeGreaterThan(0);
        for (const buffer of secretSized) {
            expect(buffer.every((byte) => byte === 0)).toBe(true);
        }
    });
});
