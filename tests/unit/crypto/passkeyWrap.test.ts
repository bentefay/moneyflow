/**
 * Tests for Passkey PRF Identity Wrapping
 *
 * The WebAuthn PRF output is used ONLY as a key-encryption key that wraps the SAME existing
 * master identity secret. These tests exist to prove that invariant holds and that every
 * failure mode fails closed rather than silently producing a different identity.
 *
 * No real secret material appears here: master seeds come from freshly generated throwaway
 * phrases or the public BIP39 all-`abandon` test vector, and PRF outputs are synthetic bytes.
 */

import * as fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";

import { computePubkeyHash } from "@/lib/crypto/identity";
import { deriveKeysFromSeed, initCrypto } from "@/lib/crypto/keypair";
import {
    deriveKeyEncryptionKey,
    PASSKEY_PRF_SALT,
    PASSKEY_WRAP_VERSION,
    unwrapMasterSecret,
    wrapMasterSecret
} from "@/lib/crypto/passkeyWrap";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";

beforeAll(async () => {
    await initCrypto();
});

/** Public BIP39 test vector - the canonical all-zero-entropy mnemonic. */
const PUBLIC_TEST_MNEMONIC =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

/** A synthetic 32-byte PRF output. Not real key material. */
function syntheticPrfOutput(fill: number): Uint8Array {
    return new Uint8Array(32).fill(fill);
}

async function throwawayMasterSeed(): Promise<Uint8Array> {
    return mnemonicToMasterSeed(generateSeedPhrase());
}

describe("protocol constants", () => {
    it("uses a non-empty public salt that contains no secret material", () => {
        expect(PASSKEY_PRF_SALT.length).toBeGreaterThan(0);
        expect(new TextDecoder().decode(PASSKEY_PRF_SALT)).toMatch(/^moneyflow-v1-/);
    });

    it("declares a wrap version so the salt can be rotated later", () => {
        expect(PASSKEY_WRAP_VERSION).toBe(1);
    });
});

describe("deriveKeyEncryptionKey", () => {
    it("derives a 32-byte key from a 32-byte PRF output", async () => {
        const kek = await deriveKeyEncryptionKey(syntheticPrfOutput(1));
        expect(kek.length).toBe(32);
    });

    it("is deterministic for the same PRF output", async () => {
        const first = await deriveKeyEncryptionKey(syntheticPrfOutput(7));
        const second = await deriveKeyEncryptionKey(syntheticPrfOutput(7));
        expect(first).toEqual(second);
    });

    it("does not return the PRF output verbatim", async () => {
        const prfOutput = syntheticPrfOutput(9);
        const kek = await deriveKeyEncryptionKey(prfOutput);
        expect(kek).not.toEqual(prfOutput);
    });

    it("rejects a PRF output that is not 32 bytes", async () => {
        await expect(deriveKeyEncryptionKey(new Uint8Array(16))).rejects.toThrow();
        await expect(deriveKeyEncryptionKey(new Uint8Array(33))).rejects.toThrow();
        await expect(deriveKeyEncryptionKey(new Uint8Array(0))).rejects.toThrow();
    });

    it("separates distinct PRF outputs", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uint8Array({ minLength: 32, maxLength: 32 }),
                fc.uint8Array({ minLength: 32, maxLength: 32 }),
                async (a, b) => {
                    fc.pre(!Buffer.from(a).equals(Buffer.from(b)));
                    const kekA = await deriveKeyEncryptionKey(a);
                    const kekB = await deriveKeyEncryptionKey(b);
                    expect(kekA).not.toEqual(kekB);
                }
            ),
            { numRuns: 25 }
        );
    });
});

describe("wrapMasterSecret / unwrapMasterSecret", () => {
    it("roundtrips the master secret unchanged", async () => {
        const masterSeed = await throwawayMasterSeed();
        const prfOutput = syntheticPrfOutput(3);

        const wrapped = await wrapMasterSecret(masterSeed, prfOutput);
        const unwrapped = await unwrapMasterSecret(wrapped, prfOutput);

        expect(unwrapped).toEqual(masterSeed);
    });

    it("yields the IDENTICAL Ed25519/X25519 identity after unwrapping", async () => {
        const masterSeed = await mnemonicToMasterSeed(PUBLIC_TEST_MNEMONIC);
        const prfOutput = syntheticPrfOutput(11);

        const expectedKeys = deriveKeysFromSeed(masterSeed);
        const wrapped = await wrapMasterSecret(masterSeed, prfOutput);
        const recoveredKeys = deriveKeysFromSeed(await unwrapMasterSecret(wrapped, prfOutput));

        expect(recoveredKeys.signing.publicKey).toEqual(expectedKeys.signing.publicKey);
        expect(recoveredKeys.signing.privateKey).toEqual(expectedKeys.signing.privateKey);
        expect(recoveredKeys.encryption.publicKey).toEqual(expectedKeys.encryption.publicKey);
        expect(recoveredKeys.encryption.privateKey).toEqual(expectedKeys.encryption.privateKey);
        expect(computePubkeyHash(recoveredKeys.signing.publicKey)).toBe(
            computePubkeyHash(expectedKeys.signing.publicKey)
        );
    });

    it("never emits the master secret in the wrapped envelope", async () => {
        const masterSeed = await throwawayMasterSeed();
        const wrapped = await wrapMasterSecret(masterSeed, syntheticPrfOutput(5));

        const envelopeBytes = Buffer.from(wrapped, "base64");
        expect(envelopeBytes.includes(Buffer.from(masterSeed))).toBe(false);
    });

    it("never emits the PRF output or derived KEK in the wrapped envelope", async () => {
        const masterSeed = await throwawayMasterSeed();
        const prfOutput = syntheticPrfOutput(13);
        const kek = await deriveKeyEncryptionKey(prfOutput);

        const envelopeBytes = Buffer.from(await wrapMasterSecret(masterSeed, prfOutput), "base64");

        expect(envelopeBytes.includes(Buffer.from(prfOutput))).toBe(false);
        expect(envelopeBytes.includes(Buffer.from(kek))).toBe(false);
    });

    it("produces a different envelope every time (fresh random nonce)", async () => {
        const masterSeed = await throwawayMasterSeed();
        const prfOutput = syntheticPrfOutput(2);

        const first = await wrapMasterSecret(masterSeed, prfOutput);
        const second = await wrapMasterSecret(masterSeed, prfOutput);

        expect(first).not.toBe(second);
        await expect(unwrapMasterSecret(first, prfOutput)).resolves.toEqual(masterSeed);
        await expect(unwrapMasterSecret(second, prfOutput)).resolves.toEqual(masterSeed);
    });

    it("fails closed for the WRONG PRF output", async () => {
        const masterSeed = await throwawayMasterSeed();
        const wrapped = await wrapMasterSecret(masterSeed, syntheticPrfOutput(4));

        await expect(unwrapMasterSecret(wrapped, syntheticPrfOutput(5))).rejects.toThrow();
    });

    it("fails closed for a PRF output differing in a single bit", async () => {
        const masterSeed = await throwawayMasterSeed();
        const prfOutput = syntheticPrfOutput(6);
        const wrapped = await wrapMasterSecret(masterSeed, prfOutput);

        const nearlyRight = Uint8Array.from(prfOutput);
        nearlyRight[31] ^= 0x01;

        await expect(unwrapMasterSecret(wrapped, nearlyRight)).rejects.toThrow();
    });

    it("fails closed when the ciphertext is tampered with", async () => {
        const masterSeed = await throwawayMasterSeed();
        const prfOutput = syntheticPrfOutput(8);
        const wrapped = await wrapMasterSecret(masterSeed, prfOutput);

        const bytes = Buffer.from(wrapped, "base64");
        bytes[bytes.length - 1] ^= 0xff;

        await expect(unwrapMasterSecret(bytes.toString("base64"), prfOutput)).rejects.toThrow();
    });

    it("fails closed when the nonce is tampered with", async () => {
        const masterSeed = await throwawayMasterSeed();
        const prfOutput = syntheticPrfOutput(10);
        const wrapped = await wrapMasterSecret(masterSeed, prfOutput);

        const bytes = Buffer.from(wrapped, "base64");
        bytes[0] ^= 0xff;

        await expect(unwrapMasterSecret(bytes.toString("base64"), prfOutput)).rejects.toThrow();
    });

    it("fails closed for a truncated envelope", async () => {
        const masterSeed = await throwawayMasterSeed();
        const prfOutput = syntheticPrfOutput(12);
        const wrapped = await wrapMasterSecret(masterSeed, prfOutput);

        const bytes = Buffer.from(wrapped, "base64");
        await expect(
            unwrapMasterSecret(bytes.subarray(0, 12).toString("base64"), prfOutput)
        ).rejects.toThrow();
    });

    it("fails closed for an empty or malformed envelope", async () => {
        const prfOutput = syntheticPrfOutput(14);
        await expect(unwrapMasterSecret("", prfOutput)).rejects.toThrow();
        await expect(unwrapMasterSecret("!!!not-base64!!!", prfOutput)).rejects.toThrow();
    });

    it("rejects a master secret of the wrong length rather than normalizing it", async () => {
        const prfOutput = syntheticPrfOutput(15);
        await expect(wrapMasterSecret(new Uint8Array(32), prfOutput)).rejects.toThrow();
        await expect(wrapMasterSecret(new Uint8Array(0), prfOutput)).rejects.toThrow();
    });

    it("never lets one credential's envelope open under another credential's PRF", async () => {
        const masterSeed = await throwawayMasterSeed();
        const credentialA = syntheticPrfOutput(21);
        const credentialB = syntheticPrfOutput(22);

        const envelopeA = await wrapMasterSecret(masterSeed, credentialA);
        const envelopeB = await wrapMasterSecret(masterSeed, credentialB);

        // Each opens under its own PRF...
        await expect(unwrapMasterSecret(envelopeA, credentialA)).resolves.toEqual(masterSeed);
        await expect(unwrapMasterSecret(envelopeB, credentialB)).resolves.toEqual(masterSeed);
        // ...and never under the other's.
        await expect(unwrapMasterSecret(envelopeA, credentialB)).rejects.toThrow();
        await expect(unwrapMasterSecret(envelopeB, credentialA)).rejects.toThrow();
    });

    it("lets MULTIPLE credentials each recover the SAME identity", async () => {
        const masterSeed = await mnemonicToMasterSeed(PUBLIC_TEST_MNEMONIC);
        const expectedHash = computePubkeyHash(deriveKeysFromSeed(masterSeed).signing.publicKey);

        const prfOutputs = [31, 32, 33].map(syntheticPrfOutput);
        const envelopes = await Promise.all(
            prfOutputs.map((prfOutput) => wrapMasterSecret(masterSeed, prfOutput))
        );

        for (const [index, envelope] of envelopes.entries()) {
            const recovered = await unwrapMasterSecret(envelope, prfOutputs[index]);
            expect(computePubkeyHash(deriveKeysFromSeed(recovered).signing.publicKey)).toBe(
                expectedHash
            );
        }
    });

    it("roundtrips any master secret under any PRF output (property)", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uint8Array({ minLength: 64, maxLength: 64 }),
                fc.uint8Array({ minLength: 32, maxLength: 32 }),
                async (masterSeed, prfOutput) => {
                    const wrapped = await wrapMasterSecret(masterSeed, prfOutput);
                    expect(await unwrapMasterSecret(wrapped, prfOutput)).toEqual(masterSeed);
                }
            ),
            { numRuns: 25 }
        );
    });

    it("never opens under a different PRF output (property)", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uint8Array({ minLength: 64, maxLength: 64 }),
                fc.uint8Array({ minLength: 32, maxLength: 32 }),
                fc.uint8Array({ minLength: 32, maxLength: 32 }),
                async (masterSeed, right, wrong) => {
                    fc.pre(!Buffer.from(right).equals(Buffer.from(wrong)));
                    const wrapped = await wrapMasterSecret(masterSeed, right);
                    await expect(unwrapMasterSecret(wrapped, wrong)).rejects.toThrow();
                }
            ),
            { numRuns: 25 }
        );
    });
});
