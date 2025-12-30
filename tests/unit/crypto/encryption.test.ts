/**
 * Tests for XChaCha20-Poly1305 Encryption
 *
 * Property-based tests for roundtrip correctness and security properties.
 */

import * as fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import {
	decrypt,
	decryptFromStorage,
	decryptJSON,
	decryptString,
	encrypt,
	encryptForStorage,
	encryptJSON,
	encryptString,
	generateVaultKey,
	KEY_BYTES,
	NONCE_BYTES,
} from "@/lib/crypto/encryption";
import { initCrypto } from "@/lib/crypto/keypair";

beforeAll(async () => {
	await initCrypto();
});

describe("constants", () => {
	it("has correct sizes", () => {
		expect(NONCE_BYTES).toBe(24); // XChaCha20 uses 192-bit nonces
		expect(KEY_BYTES).toBe(32); // 256-bit keys
	});
});

describe("generateVaultKey", () => {
	it("generates 32-byte key", async () => {
		const key = await generateVaultKey();

		expect(key).toBeInstanceOf(Uint8Array);
		expect(key.length).toBe(32);
	});

	it("generates unique keys", async () => {
		const keys = await Promise.all(Array.from({ length: 10 }, () => generateVaultKey()));
		const uniqueKeys = new Set(keys.map((k) => Array.from(k).join(",")));

		expect(uniqueKeys.size).toBe(10);
	});
});

describe("encrypt / decrypt", () => {
	it("roundtrips data", async () => {
		const key = await generateVaultKey();
		// Use Uint8Array directly - libsodium accepts this
		const plaintext = new Uint8Array(Buffer.from("Hello, World!"));

		const { ciphertext, nonce } = await encrypt(plaintext, key);
		const decrypted = await decrypt(ciphertext, nonce, key);

		expect(decrypted).toEqual(plaintext);
	});

	it("produces ciphertext different from plaintext", async () => {
		const key = await generateVaultKey();
		const plaintext = new Uint8Array(Buffer.from("Hello, World!"));

		const { ciphertext } = await encrypt(plaintext, key);

		expect(ciphertext).not.toEqual(plaintext);
		// Ciphertext should be longer (includes auth tag)
		expect(ciphertext.length).toBeGreaterThan(plaintext.length);
	});

	it("uses unique nonces per encryption", async () => {
		const key = await generateVaultKey();
		const plaintext = new Uint8Array(Buffer.from("Same data"));

		const result1 = await encrypt(plaintext, key);
		const result2 = await encrypt(plaintext, key);

		// Nonces should be different
		expect(result1.nonce).not.toEqual(result2.nonce);
		// Ciphertexts should be different due to different nonces
		expect(result1.ciphertext).not.toEqual(result2.ciphertext);
	});

	it("throws on wrong key", async () => {
		const key1 = await generateVaultKey();
		const key2 = await generateVaultKey();
		const plaintext = new Uint8Array(Buffer.from("Secret data"));

		const { ciphertext, nonce } = await encrypt(plaintext, key1);

		await expect(decrypt(ciphertext, nonce, key2)).rejects.toThrow("Decryption failed");
	});

	it("throws on tampered ciphertext", async () => {
		const key = await generateVaultKey();
		const plaintext = new Uint8Array(Buffer.from("Tamper test"));

		const { ciphertext, nonce } = await encrypt(plaintext, key);

		// Tamper with ciphertext
		const tampered = new Uint8Array(ciphertext);
		tampered[0] ^= 0xff;

		await expect(decrypt(tampered, nonce, key)).rejects.toThrow("Decryption failed");
	});

	it("throws on invalid key size", async () => {
		const shortKey = new Uint8Array(16);
		const plaintext = new TextEncoder().encode("Test");

		await expect(encrypt(plaintext, shortKey)).rejects.toThrow("Key must be 32 bytes");
	});

	it("throws on invalid nonce size", async () => {
		const key = await generateVaultKey();
		const ciphertext = new Uint8Array(32);
		const shortNonce = new Uint8Array(12);

		await expect(decrypt(ciphertext, shortNonce, key)).rejects.toThrow("Nonce must be 24 bytes");
	});
});

describe("encryptForStorage / decryptFromStorage", () => {
	it("roundtrips with prepended nonce", async () => {
		const key = await generateVaultKey();
		const plaintext = new Uint8Array(Buffer.from("Storage test"));

		const blob = await encryptForStorage(plaintext, key);
		const decrypted = await decryptFromStorage(blob, key);

		expect(decrypted).toEqual(plaintext);
	});

	it("blob starts with 24-byte nonce", async () => {
		const key = await generateVaultKey();
		const plaintext = new Uint8Array(Buffer.from("Nonce check"));

		const blob = await encryptForStorage(plaintext, key);

		// Blob should be nonce (24) + ciphertext (plaintext + 16 auth tag)
		expect(blob.length).toBe(24 + plaintext.length + 16);
	});

	it("throws on blob too short", async () => {
		const key = await generateVaultKey();
		const shortBlob = new Uint8Array(10);

		await expect(decryptFromStorage(shortBlob, key)).rejects.toThrow("Blob too short");
	});
});

describe("encryptString / decryptString", () => {
	const cases = [
		{ name: "empty string", value: "" },
		{ name: "simple text", value: "Hello, World!" },
		{ name: "unicode", value: "Hello, 世界! 🌍" },
		{ name: "long string", value: "x".repeat(10000) },
		{ name: "special characters", value: "Line1\nLine2\tTab\"Quote'" },
	] as const;

	cases.forEach(({ name, value }) => {
		it(`roundtrips ${name}`, async () => {
			const key = await generateVaultKey();

			const encrypted = await encryptString(value, key);
			const decrypted = await decryptString(encrypted, key);

			expect(decrypted).toBe(value);
		});
	});

	it("produces base64 output", async () => {
		const key = await generateVaultKey();
		const encrypted = await encryptString("Test", key);

		// Should be valid base64 (only contains base64 characters)
		expect(typeof encrypted).toBe("string");
		expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
	});
});

describe("encryptJSON / decryptJSON", () => {
	const cases = [
		{ name: "null", value: null },
		{ name: "boolean", value: true },
		{ name: "number", value: 42.5 },
		{ name: "string", value: "hello" },
		{ name: "array", value: [1, 2, 3] },
		{ name: "object", value: { key: "value", nested: { a: 1 } } },
		{ name: "complex object", value: { users: [{ id: 1, name: "Alice" }], count: 1 } },
	] as const;

	cases.forEach(({ name, value }) => {
		it(`roundtrips ${name}`, async () => {
			const key = await generateVaultKey();

			const encrypted = await encryptJSON(value, key);
			const decrypted = await decryptJSON(encrypted, key);

			expect(decrypted).toEqual(value);
		});
	});
});

describe("encryption property-based tests", () => {
	it("roundtrips arbitrary byte arrays", async () => {
		await fc.assert(
			fc.asyncProperty(fc.uint8Array({ minLength: 0, maxLength: 1000 }), async (data) => {
				const key = await generateVaultKey();
				const encrypted = await encryptForStorage(data, key);
				const decrypted = await decryptFromStorage(encrypted, key);
				return arraysEqual(decrypted, data);
			}),
			{ numRuns: 20 }
		);
	});

	it("roundtrips arbitrary strings", async () => {
		await fc.assert(
			fc.asyncProperty(fc.string({ minLength: 0, maxLength: 500 }), async (str) => {
				const key = await generateVaultKey();
				const encrypted = await encryptString(str, key);
				const decrypted = await decryptString(encrypted, key);
				return decrypted === str;
			}),
			{ numRuns: 20 }
		);
	});

	it("ciphertext is always larger than plaintext", async () => {
		await fc.assert(
			fc.asyncProperty(fc.uint8Array({ minLength: 1, maxLength: 500 }), async (data) => {
				const key = await generateVaultKey();
				const encrypted = await encryptForStorage(data, key);
				// Should be at least nonce (24) + auth tag (16) larger
				return encrypted.length >= data.length + 40;
			}),
			{ numRuns: 20 }
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
