/**
 * Ed25519 Keypair Derivation
 *
 * Derives Ed25519 signing keypairs and X25519 encryption keypairs from a master seed.
 * Uses HKDF with domain separation to ensure key independence.
 */

import sodium from "libsodium-wrappers";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

// Domain separation constants - NEVER change these after launch
// These ensure that different key types are cryptographically independent
export const DOMAIN_ED25519_SIGNING = "moneyflow-v1-ed25519-signing";
export const DOMAIN_X25519_ENCRYPTION = "moneyflow-v1-x25519-encryption";

// Convert domain strings to Uint8Array once
const textEncoder = new TextEncoder();
const DOMAIN_ED25519_SIGNING_BYTES = textEncoder.encode(DOMAIN_ED25519_SIGNING);
const DOMAIN_X25519_ENCRYPTION_BYTES = textEncoder.encode(DOMAIN_X25519_ENCRYPTION);

/**
 * Ed25519 signing keypair for request authentication and identity.
 */
export interface SigningKeypair {
  publicKey: Uint8Array; // 32 bytes
  privateKey: Uint8Array; // 64 bytes (seed + public key)
  keyType: "Ed25519";
}

/**
 * X25519 encryption keypair for vault key wrapping.
 */
export interface EncryptionKeypair {
  publicKey: Uint8Array; // 32 bytes
  privateKey: Uint8Array; // 32 bytes
  keyType: "X25519";
}

/**
 * Complete set of derived keys for a user identity.
 */
export interface DerivedKeys {
  signing: SigningKeypair;
  encryption: EncryptionKeypair;
}

/**
 * Ensures libsodium is initialized.
 * Must be called before any crypto operations.
 */
export async function initCrypto(): Promise<void> {
  await sodium.ready;
}

/**
 * Derives domain-separated keys from a master seed.
 *
 * Uses HKDF (RFC 5869) with SHA-256 to derive independent keys:
 * - Ed25519 signing key for request authentication
 * - X25519 encryption key for vault key wrapping
 *
 * @param masterSeed - 64-byte seed from BIP39 mnemonic
 * @returns Both signing and encryption keypairs
 */
export function deriveKeysFromSeed(masterSeed: Uint8Array): DerivedKeys {
  // Derive Ed25519 signing seed (32 bytes) using HKDF
  const signingSeed = hkdf(
    sha256,
    masterSeed,
    undefined, // no salt (deterministic derivation)
    DOMAIN_ED25519_SIGNING_BYTES,
    32 // Ed25519 seed size
  );

  // Generate Ed25519 keypair from seed
  const signingKeypairRaw = sodium.crypto_sign_seed_keypair(signingSeed);

  // Derive X25519 encryption seed (32 bytes) using HKDF
  const encryptionSeed = hkdf(
    sha256,
    masterSeed,
    undefined,
    DOMAIN_X25519_ENCRYPTION_BYTES,
    32 // X25519 seed size
  );

  // Generate X25519 keypair from seed
  const encryptionKeypairRaw = sodium.crypto_box_seed_keypair(encryptionSeed);

  return {
    signing: {
      publicKey: signingKeypairRaw.publicKey,
      privateKey: signingKeypairRaw.privateKey,
      keyType: "Ed25519",
    },
    encryption: {
      publicKey: encryptionKeypairRaw.publicKey,
      privateKey: encryptionKeypairRaw.privateKey,
      keyType: "X25519",
    },
  };
}

/**
 * Converts a keypair's public key to base64 encoding.
 * Useful for storage and display.
 *
 * @param publicKey - Raw public key bytes
 * @returns Base64-encoded public key
 */
export function publicKeyToBase64(publicKey: Uint8Array): string {
  return sodium.to_base64(publicKey, sodium.base64_variants.ORIGINAL);
}

/**
 * Converts a base64-encoded public key back to bytes.
 *
 * @param base64Key - Base64-encoded public key
 * @returns Raw public key bytes
 */
export function base64ToPublicKey(base64Key: string): Uint8Array {
  return sodium.from_base64(base64Key, sodium.base64_variants.ORIGINAL);
}

/**
 * Converts a keypair's private key to base64 encoding.
 * ⚠️ Handle with care - this is secret material.
 *
 * @param privateKey - Raw private key bytes
 * @returns Base64-encoded private key
 */
export function privateKeyToBase64(privateKey: Uint8Array): string {
  return sodium.to_base64(privateKey, sodium.base64_variants.ORIGINAL);
}

/**
 * Converts a base64-encoded private key back to bytes.
 * ⚠️ Handle with care - this is secret material.
 *
 * @param base64Key - Base64-encoded private key
 * @returns Raw private key bytes
 */
export function base64ToPrivateKey(base64Key: string): Uint8Array {
  return sodium.from_base64(base64Key, sodium.base64_variants.ORIGINAL);
}
