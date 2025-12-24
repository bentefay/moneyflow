/**
 * X25519 Key Wrapping
 *
 * Provides asymmetric encryption for sharing vault keys between users.
 * Uses X25519 ECDH + XSalsa20-Poly1305 (crypto_box).
 */

import sodium from "libsodium-wrappers";
import { initCrypto } from "./keypair";

/**
 * Wraps (encrypts) a vault key for a recipient.
 *
 * Uses crypto_box (X25519 + XSalsa20-Poly1305):
 * 1. ECDH between sender's X25519 private key and recipient's X25519 public key
 * 2. Derive shared secret
 * 3. Encrypt vault key with shared secret
 *
 * @param vaultKey - The symmetric vault key to wrap (32 bytes)
 * @param recipientPublicKey - Recipient's X25519 public key
 * @param senderSecretKey - Sender's X25519 secret key
 * @returns Wrapped key blob (nonce || ciphertext)
 */
export async function wrapKey(
  vaultKey: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): Promise<Uint8Array> {
  await initCrypto();

  if (vaultKey.length !== 32) {
    throw new Error("Vault key must be 32 bytes");
  }

  if (recipientPublicKey.length !== 32) {
    throw new Error("Recipient public key must be 32 bytes");
  }

  if (senderSecretKey.length !== 32) {
    throw new Error("Sender secret key must be 32 bytes");
  }

  // Generate random nonce (24 bytes for XSalsa20-Poly1305)
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  // Encrypt vault key using crypto_box (X25519 + XSalsa20-Poly1305)
  const ciphertext = sodium.crypto_box_easy(vaultKey, nonce, recipientPublicKey, senderSecretKey);

  // Return nonce || ciphertext
  const result = new Uint8Array(nonce.length + ciphertext.length);
  result.set(nonce);
  result.set(ciphertext, nonce.length);
  return result;
}

/**
 * Unwraps (decrypts) a vault key from a sender.
 *
 * @param wrappedKey - Wrapped key blob (nonce || ciphertext)
 * @param senderPublicKey - Sender's X25519 public key
 * @param recipientSecretKey - Recipient's X25519 secret key
 * @returns Unwrapped vault key (32 bytes)
 * @throws Error if unwrapping fails (wrong keys or corrupted data)
 */
export async function unwrapKey(
  wrappedKey: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Promise<Uint8Array> {
  await initCrypto();

  const nonceLength = sodium.crypto_box_NONCEBYTES;

  if (wrappedKey.length < nonceLength) {
    throw new Error("Wrapped key too short - must contain nonce");
  }

  if (senderPublicKey.length !== 32) {
    throw new Error("Sender public key must be 32 bytes");
  }

  if (recipientSecretKey.length !== 32) {
    throw new Error("Recipient secret key must be 32 bytes");
  }

  const nonce = wrappedKey.slice(0, nonceLength);
  const ciphertext = wrappedKey.slice(nonceLength);

  try {
    return sodium.crypto_box_open_easy(ciphertext, nonce, senderPublicKey, recipientSecretKey);
  } catch {
    throw new Error("Key unwrap failed - invalid keys or corrupted data");
  }
}

/**
 * Wraps a vault key for a recipient and returns as base64.
 *
 * @param vaultKey - The symmetric vault key to wrap (32 bytes)
 * @param recipientPublicKeyBase64 - Recipient's X25519 public key (base64)
 * @param senderSecretKey - Sender's X25519 secret key
 * @returns Base64-encoded wrapped key
 */
export async function wrapKeyToBase64(
  vaultKey: Uint8Array,
  recipientPublicKeyBase64: string,
  senderSecretKey: Uint8Array
): Promise<string> {
  await initCrypto();
  const recipientPublicKey = sodium.from_base64(
    recipientPublicKeyBase64,
    sodium.base64_variants.ORIGINAL
  );
  const wrapped = await wrapKey(vaultKey, recipientPublicKey, senderSecretKey);
  return sodium.to_base64(wrapped, sodium.base64_variants.ORIGINAL);
}

/**
 * Unwraps a base64-encoded vault key.
 *
 * @param wrappedKeyBase64 - Base64-encoded wrapped key
 * @param senderPublicKeyBase64 - Sender's X25519 public key (base64)
 * @param recipientSecretKey - Recipient's X25519 secret key
 * @returns Unwrapped vault key (32 bytes)
 */
export async function unwrapKeyFromBase64(
  wrappedKeyBase64: string,
  senderPublicKeyBase64: string,
  recipientSecretKey: Uint8Array
): Promise<Uint8Array> {
  await initCrypto();
  const wrappedKey = sodium.from_base64(wrappedKeyBase64, sodium.base64_variants.ORIGINAL);
  const senderPublicKey = sodium.from_base64(
    senderPublicKeyBase64,
    sodium.base64_variants.ORIGINAL
  );
  return unwrapKey(wrappedKey, senderPublicKey, recipientSecretKey);
}

/**
 * Wraps a vault key for oneself (self-encryption).
 * Uses sealed box which doesn't require sender's secret key.
 *
 * This is useful for storing the user's own vault key.
 *
 * @param vaultKey - The symmetric vault key to wrap (32 bytes)
 * @param publicKey - User's X25519 public key
 * @returns Sealed box (ephemeral public key || ciphertext)
 */
export async function sealKey(vaultKey: Uint8Array, publicKey: Uint8Array): Promise<Uint8Array> {
  await initCrypto();

  if (vaultKey.length !== 32) {
    throw new Error("Vault key must be 32 bytes");
  }

  return sodium.crypto_box_seal(vaultKey, publicKey);
}

/**
 * Unwraps a self-encrypted vault key.
 *
 * @param sealedKey - Sealed box containing wrapped key
 * @param publicKey - User's X25519 public key
 * @param secretKey - User's X25519 secret key
 * @returns Unwrapped vault key (32 bytes)
 */
export async function unsealKey(
  sealedKey: Uint8Array,
  publicKey: Uint8Array,
  secretKey: Uint8Array
): Promise<Uint8Array> {
  await initCrypto();

  try {
    return sodium.crypto_box_seal_open(sealedKey, publicKey, secretKey);
  } catch {
    throw new Error("Key unseal failed - invalid keys or corrupted data");
  }
}

/**
 * Seals a vault key and returns as base64.
 *
 * @param vaultKey - The symmetric vault key to seal (32 bytes)
 * @param publicKeyBase64 - User's X25519 public key (base64)
 * @returns Base64-encoded sealed key
 */
export async function sealKeyToBase64(
  vaultKey: Uint8Array,
  publicKeyBase64: string
): Promise<string> {
  await initCrypto();
  const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const sealed = await sealKey(vaultKey, publicKey);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

/**
 * Unseals a base64-encoded vault key.
 *
 * @param sealedKeyBase64 - Base64-encoded sealed key
 * @param publicKeyBase64 - User's X25519 public key (base64)
 * @param secretKey - User's X25519 secret key
 * @returns Unwrapped vault key (32 bytes)
 */
export async function unsealKeyFromBase64(
  sealedKeyBase64: string,
  publicKeyBase64: string,
  secretKey: Uint8Array
): Promise<Uint8Array> {
  await initCrypto();
  const sealedKey = sodium.from_base64(sealedKeyBase64, sodium.base64_variants.ORIGINAL);
  const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  return unsealKey(sealedKey, publicKey, secretKey);
}
