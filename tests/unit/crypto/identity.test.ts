/**
 * Tests for Identity Management
 *
 * Tests high-level identity creation and restoration.
 * Note: These tests mock sessionStorage since we're in Node.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import {
  createIdentity,
  unlockWithSeed,
  computePubkeyHash,
  type NewIdentity,
  type UnlockedIdentity,
} from "@/lib/crypto/identity";
import { initCrypto, deriveKeysFromSeed } from "@/lib/crypto/keypair";
import { generateSeedPhrase, mnemonicToMasterSeed, validateSeedPhrase } from "@/lib/crypto/seed";

// Mock sessionStorage for Node environment
const mockSessionStorage = new Map<string, string>();

beforeAll(async () => {
  await initCrypto();

  // Mock sessionStorage
  vi.stubGlobal("window", {});
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => mockSessionStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockSessionStorage.set(key, value),
    removeItem: (key: string) => mockSessionStorage.delete(key),
    clear: () => mockSessionStorage.clear(),
  });
});

beforeEach(() => {
  mockSessionStorage.clear();
});

describe("computePubkeyHash", () => {
  it("produces 32-byte hash encoded as hex (64 chars)", async () => {
    const mnemonic = generateSeedPhrase();
    const masterSeed = await mnemonicToMasterSeed(mnemonic);
    const keys = deriveKeysFromSeed(masterSeed);

    const hash = computePubkeyHash(keys.signing.publicKey);

    expect(typeof hash).toBe("string");
    // Hex of 32 bytes = 64 characters
    expect(hash.length).toBe(64);
    // Should be valid hex
    expect(hash).toMatch(/^[a-f0-9]+$/i);
  });

  it("is deterministic", async () => {
    const mnemonic = generateSeedPhrase();
    const masterSeed = await mnemonicToMasterSeed(mnemonic);
    const keys = deriveKeysFromSeed(masterSeed);

    const hash1 = computePubkeyHash(keys.signing.publicKey);
    const hash2 = computePubkeyHash(keys.signing.publicKey);

    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different keys", async () => {
    const mnemonic1 = generateSeedPhrase();
    const mnemonic2 = generateSeedPhrase();
    const seed1 = await mnemonicToMasterSeed(mnemonic1);
    const seed2 = await mnemonicToMasterSeed(mnemonic2);
    const keys1 = deriveKeysFromSeed(seed1);
    const keys2 = deriveKeysFromSeed(seed2);

    const hash1 = computePubkeyHash(keys1.signing.publicKey);
    const hash2 = computePubkeyHash(keys2.signing.publicKey);

    expect(hash1).not.toBe(hash2);
  });
});

describe("createIdentity", () => {
  it("creates new identity with valid mnemonic", async () => {
    const identity = await createIdentity();

    expect(identity.mnemonic).toBeDefined();
    expect(validateSeedPhrase(identity.mnemonic)).toBe(true);
    expect(identity.mnemonic.split(" ")).toHaveLength(12);
  });

  it("creates identity with all required keys", async () => {
    const identity = await createIdentity();

    // Signing keypair
    expect(identity.keys.signing.publicKey).toBeInstanceOf(Uint8Array);
    expect(identity.keys.signing.publicKey.length).toBe(32);
    expect(identity.keys.signing.privateKey.length).toBe(64);
    expect(identity.keys.signing.keyType).toBe("Ed25519");

    // Encryption keypair
    expect(identity.keys.encryption.publicKey).toBeInstanceOf(Uint8Array);
    expect(identity.keys.encryption.publicKey.length).toBe(32);
    expect(identity.keys.encryption.privateKey.length).toBe(32);
    expect(identity.keys.encryption.keyType).toBe("X25519");

    // PubkeyHash
    expect(typeof identity.pubkeyHash).toBe("string");
    expect(identity.pubkeyHash.length).toBeGreaterThan(0);
  });

  it("stores session data", async () => {
    await createIdentity();

    const stored = mockSessionStorage.get("moneyflow_session");
    expect(stored).toBeDefined();

    const session = JSON.parse(stored!);
    expect(session.publicKey).toBeDefined();
    expect(session.secretKey).toBeDefined();
    expect(session.encPublicKey).toBeDefined();
    expect(session.encSecretKey).toBeDefined();
    expect(session.pubkeyHash).toBeDefined();
  });

  it("creates unique identities on each call", async () => {
    const identity1 = await createIdentity();
    const identity2 = await createIdentity();

    expect(identity1.mnemonic).not.toBe(identity2.mnemonic);
    expect(identity1.pubkeyHash).not.toBe(identity2.pubkeyHash);
  });
});

describe("unlockWithSeed", () => {
  it("unlocks with valid mnemonic", async () => {
    const original = await createIdentity();
    mockSessionStorage.clear(); // Clear session to simulate tab close

    const unlocked = await unlockWithSeed(original.mnemonic);

    expect(unlocked.pubkeyHash).toBe(original.pubkeyHash);
    expect(unlocked.keys.signing.publicKey).toEqual(original.keys.signing.publicKey);
    expect(unlocked.keys.encryption.publicKey).toEqual(original.keys.encryption.publicKey);
  });

  it("normalizes mnemonic input", async () => {
    const original = await createIdentity();
    mockSessionStorage.clear();

    // Add extra whitespace and uppercase
    const messyMnemonic = "  " + original.mnemonic.toUpperCase() + "  ";
    const unlocked = await unlockWithSeed(messyMnemonic);

    expect(unlocked.pubkeyHash).toBe(original.pubkeyHash);
  });

  it("stores session on unlock", async () => {
    const original = await createIdentity();
    mockSessionStorage.clear();

    await unlockWithSeed(original.mnemonic);

    const stored = mockSessionStorage.get("moneyflow_session");
    expect(stored).toBeDefined();

    const session = JSON.parse(stored!);
    expect(session.pubkeyHash).toBe(original.pubkeyHash);
  });

  it("throws on invalid mnemonic", async () => {
    await expect(unlockWithSeed("invalid seed phrase")).rejects.toThrow("Invalid recovery phrase");
  });

  it("throws on wrong word count", async () => {
    await expect(unlockWithSeed("abandon abandon abandon")).rejects.toThrow(
      "Invalid recovery phrase"
    );
  });
});

describe("identity roundtrip", () => {
  it("create → unlock produces same identity", async () => {
    const original = await createIdentity();
    mockSessionStorage.clear();

    const restored = await unlockWithSeed(original.mnemonic);

    // Same public keys
    expect(restored.keys.signing.publicKey).toEqual(original.keys.signing.publicKey);
    expect(restored.keys.signing.privateKey).toEqual(original.keys.signing.privateKey);
    expect(restored.keys.encryption.publicKey).toEqual(original.keys.encryption.publicKey);
    expect(restored.keys.encryption.privateKey).toEqual(original.keys.encryption.privateKey);

    // Same pubkeyHash
    expect(restored.pubkeyHash).toBe(original.pubkeyHash);
  });

  it("property: roundtrip always produces same identity", () => {
    fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const original = await createIdentity();
        mockSessionStorage.clear();

        const restored = await unlockWithSeed(original.mnemonic);

        return (
          restored.pubkeyHash === original.pubkeyHash &&
          arraysEqual(restored.keys.signing.publicKey, original.keys.signing.publicKey) &&
          arraysEqual(restored.keys.encryption.publicKey, original.keys.encryption.publicKey)
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
