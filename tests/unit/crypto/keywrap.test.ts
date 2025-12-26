/**
 * Tests for X25519 Key Wrapping
 *
 * Tests asymmetric key wrapping for vault key sharing between users.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fc from "fast-check";
import {
  wrapKey,
  unwrapKey,
  wrapKeyToBase64,
  unwrapKeyFromBase64,
  sealKey,
  unsealKey,
  sealKeyToBase64,
  unsealKeyFromBase64,
} from "@/lib/crypto/keywrap";
import { generateVaultKey } from "@/lib/crypto/encryption";
import { initCrypto, deriveKeysFromSeed, publicKeyToBase64 } from "@/lib/crypto/keypair";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";

beforeAll(async () => {
  await initCrypto();
});

// Helper to create a test user's keys
async function createTestUser() {
  const mnemonic = generateSeedPhrase();
  const masterSeed = await mnemonicToMasterSeed(mnemonic);
  return deriveKeysFromSeed(masterSeed);
}

describe("wrapKey / unwrapKey", () => {
  it("roundtrips vault key between two users", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const vaultKey = await generateVaultKey();

    const wrapped = await wrapKey(
      vaultKey,
      recipient.encryption.publicKey,
      sender.encryption.privateKey
    );
    const unwrapped = await unwrapKey(
      wrapped,
      sender.encryption.publicKey,
      recipient.encryption.privateKey
    );

    expect(unwrapped).toEqual(vaultKey);
  });

  it("produces different ciphertext each time (random nonce)", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const vaultKey = await generateVaultKey();

    const wrapped1 = await wrapKey(
      vaultKey,
      recipient.encryption.publicKey,
      sender.encryption.privateKey
    );
    const wrapped2 = await wrapKey(
      vaultKey,
      recipient.encryption.publicKey,
      sender.encryption.privateKey
    );

    expect(wrapped1).not.toEqual(wrapped2);
  });

  it("fails with wrong sender public key", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const wrongSender = await createTestUser();
    const vaultKey = await generateVaultKey();

    const wrapped = await wrapKey(
      vaultKey,
      recipient.encryption.publicKey,
      sender.encryption.privateKey
    );

    await expect(
      unwrapKey(wrapped, wrongSender.encryption.publicKey, recipient.encryption.privateKey)
    ).rejects.toThrow("Key unwrap failed");
  });

  it("fails with wrong recipient private key", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const wrongRecipient = await createTestUser();
    const vaultKey = await generateVaultKey();

    const wrapped = await wrapKey(
      vaultKey,
      recipient.encryption.publicKey,
      sender.encryption.privateKey
    );

    await expect(
      unwrapKey(wrapped, sender.encryption.publicKey, wrongRecipient.encryption.privateKey)
    ).rejects.toThrow("Key unwrap failed");
  });

  it("throws on invalid vault key size", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const invalidKey = new Uint8Array(16);

    await expect(
      wrapKey(invalidKey, recipient.encryption.publicKey, sender.encryption.privateKey)
    ).rejects.toThrow("Vault key must be 32 bytes");
  });

  it("throws on wrapped key too short", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const shortWrapped = new Uint8Array(10);

    await expect(
      unwrapKey(shortWrapped, sender.encryption.publicKey, recipient.encryption.privateKey)
    ).rejects.toThrow("Wrapped key too short");
  });
});

describe("wrapKeyToBase64 / unwrapKeyFromBase64", () => {
  it("roundtrips with base64 encoding", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const vaultKey = await generateVaultKey();

    const recipientPubBase64 = publicKeyToBase64(recipient.encryption.publicKey);
    const senderPubBase64 = publicKeyToBase64(sender.encryption.publicKey);

    const wrappedBase64 = await wrapKeyToBase64(
      vaultKey,
      recipientPubBase64,
      sender.encryption.privateKey
    );
    const unwrapped = await unwrapKeyFromBase64(
      wrappedBase64,
      senderPubBase64,
      recipient.encryption.privateKey
    );

    expect(unwrapped).toEqual(vaultKey);
  });

  it("produces valid base64 string", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const vaultKey = await generateVaultKey();

    const recipientPubBase64 = publicKeyToBase64(recipient.encryption.publicKey);
    const wrappedBase64 = await wrapKeyToBase64(
      vaultKey,
      recipientPubBase64,
      sender.encryption.privateKey
    );

    expect(typeof wrappedBase64).toBe("string");
    expect(wrappedBase64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe("sealKey / unsealKey (self-encryption)", () => {
  it("roundtrips vault key for self", async () => {
    const user = await createTestUser();
    const vaultKey = await generateVaultKey();

    const sealed = await sealKey(vaultKey, user.encryption.publicKey);
    const unsealed = await unsealKey(sealed, user.encryption.publicKey, user.encryption.privateKey);

    expect(unsealed).toEqual(vaultKey);
  });

  it("produces ephemeral ciphertext (different each time)", async () => {
    const user = await createTestUser();
    const vaultKey = await generateVaultKey();

    const sealed1 = await sealKey(vaultKey, user.encryption.publicKey);
    const sealed2 = await sealKey(vaultKey, user.encryption.publicKey);

    expect(sealed1).not.toEqual(sealed2);
  });

  it("fails with wrong private key", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const vaultKey = await generateVaultKey();

    const sealed = await sealKey(vaultKey, user1.encryption.publicKey);

    await expect(
      unsealKey(sealed, user1.encryption.publicKey, user2.encryption.privateKey)
    ).rejects.toThrow("Key unseal failed");
  });

  it("throws on invalid vault key size", async () => {
    const user = await createTestUser();
    const invalidKey = new Uint8Array(16);

    await expect(sealKey(invalidKey, user.encryption.publicKey)).rejects.toThrow(
      "Vault key must be 32 bytes"
    );
  });
});

describe("sealKeyToBase64 / unsealKeyFromBase64", () => {
  it("roundtrips with base64 encoding", async () => {
    const user = await createTestUser();
    const vaultKey = await generateVaultKey();
    const userPubBase64 = publicKeyToBase64(user.encryption.publicKey);

    const sealedBase64 = await sealKeyToBase64(vaultKey, userPubBase64);
    const unsealed = await unsealKeyFromBase64(
      sealedBase64,
      userPubBase64,
      user.encryption.privateKey
    );

    expect(unsealed).toEqual(vaultKey);
  });
});

describe("key wrapping property-based tests", () => {
  it("wrapKey always produces output larger than input", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const sender = await createTestUser();
        const recipient = await createTestUser();
        const vaultKey = await generateVaultKey();

        const wrapped = await wrapKey(
          vaultKey,
          recipient.encryption.publicKey,
          sender.encryption.privateKey
        );

        // Wrapped should be nonce (24) + ciphertext (32 + 16 auth tag)
        return wrapped.length > vaultKey.length;
      }),
      { numRuns: 10 }
    );
  });

  it("sealKey always roundtrips correctly", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const user = await createTestUser();
        const vaultKey = await generateVaultKey();

        const sealed = await sealKey(vaultKey, user.encryption.publicKey);
        const unsealed = await unsealKey(
          sealed,
          user.encryption.publicKey,
          user.encryption.privateKey
        );

        return arraysEqual(unsealed, vaultKey);
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
