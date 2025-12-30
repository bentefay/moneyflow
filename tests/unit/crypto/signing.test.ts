/**
 * Tests for Ed25519 Request Signing
 *
 * Tests request signing and verification for API authentication.
 * Note: signRequest/signData require a session, so we test lower-level functions
 * and verifyRequest/verifySignature which don't require session.
 */

import sodium from "libsodium-wrappers";
import { beforeAll, describe, expect, it } from "vitest";
import { computePubkeyHash } from "@/lib/crypto/identity";
import { deriveKeysFromSeed, initCrypto, publicKeyToBase64 } from "@/lib/crypto/keypair";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";
import { verifyRequest, verifySignature, verifyStringSignature } from "@/lib/crypto/signing";

beforeAll(async () => {
	await initCrypto();
});

// Helper to create test user keys
async function createTestUser() {
	const mnemonic = generateSeedPhrase();
	const masterSeed = await mnemonicToMasterSeed(mnemonic);
	return deriveKeysFromSeed(masterSeed);
}

// Helper to sign a request manually (without needing session)
async function createSignedRequest(
	method: string,
	path: string,
	body: unknown,
	signingPrivateKey: Uint8Array,
	signingPublicKey: Uint8Array
) {
	await initCrypto(); // Ensure sodium is ready

	const timestamp = Date.now().toString();
	const bodyHash = body
		? sodium.to_base64(
				sodium.crypto_generichash(32, JSON.stringify(body)),
				sodium.base64_variants.ORIGINAL
			)
		: "";

	const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
	const messageBytes = new Uint8Array(Buffer.from(message));
	const signature = sodium.crypto_sign_detached(messageBytes, signingPrivateKey);

	return {
		headers: {
			"X-Pubkey": publicKeyToBase64(signingPublicKey),
			"X-Timestamp": timestamp,
			"X-Signature": sodium.to_base64(signature, sodium.base64_variants.ORIGINAL),
		},
		body,
	};
}

describe("verifyRequest", () => {
	it("verifies valid signed request", async () => {
		const user = await createTestUser();
		const method = "POST";
		const path = "/api/trpc/vault.create";
		const body = { name: "Test Vault" };

		const { headers } = await createSignedRequest(
			method,
			path,
			body,
			user.signing.privateKey,
			user.signing.publicKey
		);

		const result = await verifyRequest(method, path, body, headers);

		expect(result.verified).toBe(true);
		expect(result.pubkeyHash).toBe(computePubkeyHash(user.signing.publicKey));
		expect(result.error).toBeUndefined();
	});

	it("verifies request with no body", async () => {
		const user = await createTestUser();
		const method = "GET";
		const path = "/api/trpc/vault.list";

		const { headers } = await createSignedRequest(
			method,
			path,
			undefined,
			user.signing.privateKey,
			user.signing.publicKey
		);

		const result = await verifyRequest(method, path, undefined, headers);

		expect(result.verified).toBe(true);
	});

	it("rejects missing headers", async () => {
		const result = await verifyRequest("GET", "/api/test", undefined, {});

		expect(result.verified).toBe(false);
		expect(result.error).toBe("Missing authentication headers");
	});

	it("rejects invalid timestamp", async () => {
		const user = await createTestUser();
		const headers = {
			"X-Pubkey": publicKeyToBase64(user.signing.publicKey),
			"X-Timestamp": "not-a-number",
			"X-Signature": "dummy",
		};

		const result = await verifyRequest("GET", "/api/test", undefined, headers);

		expect(result.verified).toBe(false);
		expect(result.error).toBe("Invalid timestamp");
	});

	it("rejects expired request", async () => {
		const user = await createTestUser();
		const method = "GET";
		const path = "/api/test";

		// Create request with old timestamp
		const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
		const message = `${method}\n${path}\n${oldTimestamp}\n`;
		const messageBytes = new Uint8Array(Buffer.from(message));
		const signature = sodium.crypto_sign_detached(messageBytes, user.signing.privateKey);

		const headers = {
			"X-Pubkey": publicKeyToBase64(user.signing.publicKey),
			"X-Timestamp": oldTimestamp,
			"X-Signature": sodium.to_base64(signature, sodium.base64_variants.ORIGINAL),
		};

		const result = await verifyRequest(method, path, undefined, headers, 5 * 60 * 1000);

		expect(result.verified).toBe(false);
		expect(result.error).toBe("Request expired");
	});

	it("rejects wrong public key", async () => {
		const user1 = await createTestUser();
		const user2 = await createTestUser();
		const method = "POST";
		const path = "/api/test";
		const body = { data: "test" };

		// Sign with user1's key but claim to be user2
		const timestamp = Date.now().toString();
		const bodyHash = sodium.to_base64(
			sodium.crypto_generichash(32, JSON.stringify(body)),
			sodium.base64_variants.ORIGINAL
		);
		const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
		const messageBytes = new Uint8Array(Buffer.from(message));
		const signature = sodium.crypto_sign_detached(messageBytes, user1.signing.privateKey);

		const headers = {
			"X-Pubkey": publicKeyToBase64(user2.signing.publicKey), // Wrong public key
			"X-Timestamp": timestamp,
			"X-Signature": sodium.to_base64(signature, sodium.base64_variants.ORIGINAL),
		};

		const result = await verifyRequest(method, path, body, headers);

		expect(result.verified).toBe(false);
		expect(result.error).toBe("Invalid signature");
	});

	it("rejects tampered body", async () => {
		const user = await createTestUser();
		const method = "POST";
		const path = "/api/test";
		const originalBody = { amount: 100 };
		const tamperedBody = { amount: 999 };

		const { headers } = await createSignedRequest(
			method,
			path,
			originalBody,
			user.signing.privateKey,
			user.signing.publicKey
		);

		const result = await verifyRequest(method, path, tamperedBody, headers);

		expect(result.verified).toBe(false);
		expect(result.error).toBe("Invalid signature");
	});

	it("rejects tampered path", async () => {
		const user = await createTestUser();
		const method = "DELETE";
		const originalPath = "/api/vault/123";
		const tamperedPath = "/api/vault/456";

		const { headers } = await createSignedRequest(
			method,
			originalPath,
			undefined,
			user.signing.privateKey,
			user.signing.publicKey
		);

		const result = await verifyRequest(method, tamperedPath, undefined, headers);

		expect(result.verified).toBe(false);
		expect(result.error).toBe("Invalid signature");
	});
});

describe("verifySignature", () => {
	it("verifies valid signature", async () => {
		const user = await createTestUser();
		const data = new Uint8Array(Buffer.from("Test message"));
		const signature = sodium.crypto_sign_detached(data, user.signing.privateKey);

		const valid = await verifySignature(data, signature, publicKeyToBase64(user.signing.publicKey));

		expect(valid).toBe(true);
	});

	it("rejects invalid signature", async () => {
		const user = await createTestUser();
		const data = new Uint8Array(Buffer.from("Test message"));
		const fakeSignature = new Uint8Array(64);

		const valid = await verifySignature(
			data,
			fakeSignature,
			publicKeyToBase64(user.signing.publicKey)
		);

		expect(valid).toBe(false);
	});

	it("rejects signature from wrong key", async () => {
		const user1 = await createTestUser();
		const user2 = await createTestUser();
		const data = new Uint8Array(Buffer.from("Test message"));
		const signature = sodium.crypto_sign_detached(data, user1.signing.privateKey);

		const valid = await verifySignature(
			data,
			signature,
			publicKeyToBase64(user2.signing.publicKey) // Wrong key
		);

		expect(valid).toBe(false);
	});

	it("rejects tampered data", async () => {
		const user = await createTestUser();
		const originalData = new Uint8Array(Buffer.from("Original"));
		const tamperedData = new Uint8Array(Buffer.from("Tampered"));
		const signature = sodium.crypto_sign_detached(originalData, user.signing.privateKey);

		const valid = await verifySignature(
			tamperedData,
			signature,
			publicKeyToBase64(user.signing.publicKey)
		);

		expect(valid).toBe(false);
	});
});

describe("verifyStringSignature", () => {
	it("verifies valid string signature", async () => {
		const user = await createTestUser();
		const text = "Hello, World!";
		const data = new Uint8Array(Buffer.from(text));
		const signature = sodium.crypto_sign_detached(data, user.signing.privateKey);
		const signatureBase64 = sodium.to_base64(signature, sodium.base64_variants.ORIGINAL);

		const valid = await verifyStringSignature(
			text,
			signatureBase64,
			publicKeyToBase64(user.signing.publicKey)
		);

		expect(valid).toBe(true);
	});

	it("rejects invalid base64 signature", async () => {
		const user = await createTestUser();

		const valid = await verifyStringSignature(
			"Test",
			"not-valid-base64!!!",
			publicKeyToBase64(user.signing.publicKey)
		);

		expect(valid).toBe(false);
	});
});
