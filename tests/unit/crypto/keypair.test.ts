/**
 * Tests for Ed25519 Keypair Derivation
 *
 * Tests key derivation from master seed with domain separation.
 */

import * as fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import {
	base64ToPrivateKey,
	base64ToPublicKey,
	DOMAIN_ED25519_SIGNING,
	DOMAIN_X25519_ENCRYPTION,
	deriveKeysFromSeed,
	initCrypto,
	privateKeyToBase64,
	publicKeyToBase64,
} from "@/lib/crypto/keypair";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";

beforeAll(async () => {
	await initCrypto();
});

describe("domain separation constants", () => {
	it("has distinct domain strings", () => {
		expect(DOMAIN_ED25519_SIGNING).not.toBe(DOMAIN_X25519_ENCRYPTION);
		expect(DOMAIN_ED25519_SIGNING).toContain("ed25519");
		expect(DOMAIN_X25519_ENCRYPTION).toContain("x25519");
	});
});

describe("deriveKeysFromSeed", () => {
	it("derives signing and encryption keypairs", async () => {
		const mnemonic = generateSeedPhrase();
		const masterSeed = await mnemonicToMasterSeed(mnemonic);
		const keys = deriveKeysFromSeed(masterSeed);

		// Signing keypair
		expect(keys.signing.publicKey).toBeInstanceOf(Uint8Array);
		expect(keys.signing.publicKey.length).toBe(32);
		expect(keys.signing.privateKey).toBeInstanceOf(Uint8Array);
		expect(keys.signing.privateKey.length).toBe(64); // Ed25519 private key includes seed + public
		expect(keys.signing.keyType).toBe("Ed25519");

		// Encryption keypair
		expect(keys.encryption.publicKey).toBeInstanceOf(Uint8Array);
		expect(keys.encryption.publicKey.length).toBe(32);
		expect(keys.encryption.privateKey).toBeInstanceOf(Uint8Array);
		expect(keys.encryption.privateKey.length).toBe(32);
		expect(keys.encryption.keyType).toBe("X25519");
	});

	it("is deterministic - same seed produces same keys", async () => {
		const mnemonic = generateSeedPhrase();
		const masterSeed = await mnemonicToMasterSeed(mnemonic);

		const keys1 = deriveKeysFromSeed(masterSeed);
		const keys2 = deriveKeysFromSeed(masterSeed);

		expect(keys1.signing.publicKey).toEqual(keys2.signing.publicKey);
		expect(keys1.signing.privateKey).toEqual(keys2.signing.privateKey);
		expect(keys1.encryption.publicKey).toEqual(keys2.encryption.publicKey);
		expect(keys1.encryption.privateKey).toEqual(keys2.encryption.privateKey);
	});

	it("produces different keys for different seeds", async () => {
		const mnemonic1 = generateSeedPhrase();
		const mnemonic2 = generateSeedPhrase();
		const seed1 = await mnemonicToMasterSeed(mnemonic1);
		const seed2 = await mnemonicToMasterSeed(mnemonic2);

		const keys1 = deriveKeysFromSeed(seed1);
		const keys2 = deriveKeysFromSeed(seed2);

		expect(keys1.signing.publicKey).not.toEqual(keys2.signing.publicKey);
		expect(keys1.encryption.publicKey).not.toEqual(keys2.encryption.publicKey);
	});

	it("signing and encryption keys are independent", async () => {
		const mnemonic = generateSeedPhrase();
		const masterSeed = await mnemonicToMasterSeed(mnemonic);
		const keys = deriveKeysFromSeed(masterSeed);

		// The public keys should be different (different domains)
		expect(keys.signing.publicKey).not.toEqual(keys.encryption.publicKey);
	});
});

describe("publicKeyToBase64 / base64ToPublicKey", () => {
	it("roundtrips public key", async () => {
		const mnemonic = generateSeedPhrase();
		const masterSeed = await mnemonicToMasterSeed(mnemonic);
		const keys = deriveKeysFromSeed(masterSeed);

		const base64 = publicKeyToBase64(keys.signing.publicKey);
		const recovered = base64ToPublicKey(base64);

		expect(recovered).toEqual(keys.signing.publicKey);
	});

	it("produces valid base64 string", async () => {
		const mnemonic = generateSeedPhrase();
		const masterSeed = await mnemonicToMasterSeed(mnemonic);
		const keys = deriveKeysFromSeed(masterSeed);

		const base64 = publicKeyToBase64(keys.signing.publicKey);

		// Should be valid base64 (no padding issues, proper characters)
		expect(typeof base64).toBe("string");
		expect(base64.length).toBeGreaterThan(0);
		// Base64 for 32 bytes should be ~44 characters
		expect(base64.length).toBeLessThanOrEqual(48);
	});
});

describe("privateKeyToBase64 / base64ToPrivateKey", () => {
	it("roundtrips private key", async () => {
		const mnemonic = generateSeedPhrase();
		const masterSeed = await mnemonicToMasterSeed(mnemonic);
		const keys = deriveKeysFromSeed(masterSeed);

		const base64 = privateKeyToBase64(keys.signing.privateKey);
		const recovered = base64ToPrivateKey(base64);

		expect(recovered).toEqual(keys.signing.privateKey);
	});
});

describe("key derivation property-based tests", () => {
	it("always produces valid key sizes", () => {
		fc.assert(
			fc.asyncProperty(fc.constant(null), async () => {
				const mnemonic = generateSeedPhrase();
				const masterSeed = await mnemonicToMasterSeed(mnemonic);
				const keys = deriveKeysFromSeed(masterSeed);

				return (
					keys.signing.publicKey.length === 32 &&
					keys.signing.privateKey.length === 64 &&
					keys.encryption.publicKey.length === 32 &&
					keys.encryption.privateKey.length === 32
				);
			}),
			{ numRuns: 10 }
		);
	});

	it("base64 roundtrip is lossless", () => {
		fc.assert(
			fc.asyncProperty(fc.constant(null), async () => {
				const mnemonic = generateSeedPhrase();
				const masterSeed = await mnemonicToMasterSeed(mnemonic);
				const keys = deriveKeysFromSeed(masterSeed);

				const signingPubRoundtrip = base64ToPublicKey(publicKeyToBase64(keys.signing.publicKey));
				const signingPrivRoundtrip = base64ToPrivateKey(
					privateKeyToBase64(keys.signing.privateKey)
				);
				const encryptionPubRoundtrip = base64ToPublicKey(
					publicKeyToBase64(keys.encryption.publicKey)
				);
				const encryptionPrivRoundtrip = base64ToPrivateKey(
					privateKeyToBase64(keys.encryption.privateKey)
				);

				return (
					arraysEqual(signingPubRoundtrip, keys.signing.publicKey) &&
					arraysEqual(signingPrivRoundtrip, keys.signing.privateKey) &&
					arraysEqual(encryptionPubRoundtrip, keys.encryption.publicKey) &&
					arraysEqual(encryptionPrivRoundtrip, keys.encryption.privateKey)
				);
			}),
			{ numRuns: 10 }
		);
	});
});

// Helper to compare Uint8Arrays
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
