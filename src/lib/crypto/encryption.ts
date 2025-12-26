/**
 * XChaCha20-Poly1305 Encryption
 *
 * Provides symmetric encryption for vault data using XChaCha20-Poly1305.
 * Uses 192-bit random nonces for safe random generation without collision risk.
 */

import sodium from "libsodium-wrappers";
import { initCrypto } from "./keypair";

/** Nonce size for XChaCha20-Poly1305 (24 bytes = 192 bits) */
export const NONCE_BYTES = 24; // sodium.crypto_secretbox_NONCEBYTES

/** Key size for XChaCha20-Poly1305 (32 bytes = 256 bits) */
export const KEY_BYTES = 32; // sodium.crypto_secretbox_KEYBYTES

/**
 * Generates a random vault encryption key.
 *
 * @returns 32-byte random key
 */
export async function generateVaultKey(): Promise<Uint8Array> {
  await initCrypto();
  return sodium.crypto_secretbox_keygen();
}

/**
 * Encrypts data using XChaCha20-Poly1305.
 *
 * Uses random 192-bit nonces which are safe up to ~2^96 encryptions
 * per key without collision risk (birthday bound).
 *
 * @param plaintext - Data to encrypt
 * @param key - 32-byte encryption key
 * @returns Object with ciphertext and nonce
 */
export async function encrypt(
  plaintext: Uint8Array,
  key: Uint8Array
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  await initCrypto();

  if (key.length !== KEY_BYTES) {
    throw new Error(`Key must be ${KEY_BYTES} bytes`);
  }

  // Ensure we have native Uint8Arrays (needed for libsodium in jsdom environments)
  const plaintextNative = Uint8Array.from(plaintext);
  const keyNative = Uint8Array.from(key);

  // Generate random 24-byte nonce (192-bit)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

  // Encrypt with authentication
  const ciphertext = sodium.crypto_secretbox_easy(plaintextNative, nonce, keyNative);

  return { ciphertext, nonce };
}

/**
 * Decrypts data using XChaCha20-Poly1305.
 *
 * @param ciphertext - Encrypted data
 * @param nonce - 24-byte nonce used for encryption
 * @param key - 32-byte encryption key
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key or corrupted data)
 */
export async function decrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> {
  await initCrypto();

  if (key.length !== KEY_BYTES) {
    throw new Error(`Key must be ${KEY_BYTES} bytes`);
  }

  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`Nonce must be ${NONCE_BYTES} bytes`);
  }

  // Ensure we have native Uint8Arrays (needed for libsodium in jsdom environments)
  const ciphertextNative = Uint8Array.from(ciphertext);
  const nonceNative = Uint8Array.from(nonce);
  const keyNative = Uint8Array.from(key);

  try {
    return sodium.crypto_secretbox_open_easy(ciphertextNative, nonceNative, keyNative);
  } catch {
    throw new Error("Decryption failed - invalid key or corrupted data");
  }
}

/**
 * Encrypts data for storage with nonce prepended.
 *
 * Format: nonce (24 bytes) || ciphertext
 * This makes the blob self-describing for decryption.
 *
 * @param plaintext - Data to encrypt
 * @param key - 32-byte encryption key
 * @returns Single blob with nonce prepended to ciphertext
 */
export async function encryptForStorage(
  plaintext: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> {
  const { ciphertext, nonce } = await encrypt(plaintext, key);

  // Prepend nonce to ciphertext
  const result = new Uint8Array(nonce.length + ciphertext.length);
  result.set(nonce);
  result.set(ciphertext, nonce.length);
  return result;
}

/**
 * Decrypts a storage blob (nonce || ciphertext format).
 *
 * @param blob - Encrypted blob with prepended nonce
 * @param key - 32-byte encryption key
 * @returns Decrypted plaintext
 * @throws Error if blob is too short or decryption fails
 */
export async function decryptFromStorage(blob: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  if (blob.length < NONCE_BYTES) {
    throw new Error("Blob too short - must contain nonce");
  }

  const nonce = blob.slice(0, NONCE_BYTES);
  const ciphertext = blob.slice(NONCE_BYTES);

  return decrypt(ciphertext, nonce, key);
}

/**
 * Encrypts a string to a base64-encoded blob.
 * Convenience function for encrypting text data.
 *
 * @param text - String to encrypt
 * @param key - 32-byte encryption key
 * @returns Base64-encoded encrypted blob
 */
export async function encryptString(text: string, key: Uint8Array): Promise<string> {
  await initCrypto();
  const plaintext = new TextEncoder().encode(text);
  const blob = await encryptForStorage(plaintext, key);
  return sodium.to_base64(blob, sodium.base64_variants.ORIGINAL);
}

/**
 * Decrypts a base64-encoded blob to a string.
 *
 * @param base64Blob - Base64-encoded encrypted blob
 * @param key - 32-byte encryption key
 * @returns Decrypted string
 */
export async function decryptString(base64Blob: string, key: Uint8Array): Promise<string> {
  await initCrypto();
  const blob = sodium.from_base64(base64Blob, sodium.base64_variants.ORIGINAL);
  const plaintext = await decryptFromStorage(blob, key);
  return new TextDecoder().decode(plaintext);
}

/**
 * Encrypts JSON data to a base64-encoded blob.
 * Convenience function for encrypting structured data.
 *
 * @param data - JSON-serializable data
 * @param key - 32-byte encryption key
 * @returns Base64-encoded encrypted blob
 */
export async function encryptJSON<T>(data: T, key: Uint8Array): Promise<string> {
  return encryptString(JSON.stringify(data), key);
}

/**
 * Decrypts a base64-encoded blob to JSON data.
 *
 * @param base64Blob - Base64-encoded encrypted blob
 * @param key - 32-byte encryption key
 * @returns Decrypted JSON data
 */
export async function decryptJSON<T>(base64Blob: string, key: Uint8Array): Promise<T> {
  const json = await decryptString(base64Blob, key);
  return JSON.parse(json) as T;
}
