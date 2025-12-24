/**
 * Identity Management
 *
 * High-level functions for creating and restoring user identities.
 * Combines seed generation, key derivation, and pubkeyHash computation.
 */

import sodium from "libsodium-wrappers";
import {
  generateSeedPhrase,
  mnemonicToMasterSeed,
  validateSeedPhrase,
  normalizeMnemonic,
} from "./seed";
import { deriveKeysFromSeed, initCrypto, type DerivedKeys, publicKeyToBase64 } from "./keypair";
import { storeSession, type SessionData } from "./session";

/**
 * Result of creating a new identity.
 * The mnemonic must be shown to the user ONCE for them to write down.
 */
export interface NewIdentity {
  /** 12-word seed phrase - user must save this! */
  mnemonic: string;
  /** All derived keypairs */
  keys: DerivedKeys;
  /** BLAKE2b hash of signing public key - server identifier */
  pubkeyHash: string;
}

/**
 * Result of unlocking an existing identity.
 */
export interface UnlockedIdentity {
  /** All derived keypairs */
  keys: DerivedKeys;
  /** BLAKE2b hash of signing public key - server identifier */
  pubkeyHash: string;
}

/**
 * Computes the pubkeyHash from a signing public key.
 * Uses BLAKE2b-256 for a compact 32-byte hash.
 *
 * This hash is the server's only identifier for a user.
 * The server never sees the actual public key.
 *
 * @param publicKey - Ed25519 signing public key (32 bytes)
 * @returns Base64-encoded BLAKE2b-256 hash
 */
export function computePubkeyHash(publicKey: Uint8Array): string {
  const hash = sodium.crypto_generichash(32, publicKey);
  return sodium.to_base64(hash, sodium.base64_variants.ORIGINAL);
}

/**
 * Creates a new user identity.
 *
 * 1. Generates a random 12-word BIP39 seed phrase
 * 2. Derives Ed25519 (signing) and X25519 (encryption) keypairs
 * 3. Computes pubkeyHash for server identification
 * 4. Stores session data in sessionStorage
 *
 * ⚠️ The returned mnemonic must be shown to the user to write down.
 * We never store or persist the mnemonic.
 *
 * @returns New identity with mnemonic, keys, and pubkeyHash
 */
export async function createIdentity(): Promise<NewIdentity> {
  await initCrypto();

  // 1. Generate seed phrase
  const mnemonic = generateSeedPhrase();

  // 2. Derive master seed
  const masterSeed = await mnemonicToMasterSeed(mnemonic);

  // 3. Derive domain-separated keys
  const keys = deriveKeysFromSeed(masterSeed);

  // 4. Compute pubkeyHash
  const pubkeyHash = computePubkeyHash(keys.signing.publicKey);

  // 5. Store session (not the mnemonic!)
  const sessionData: SessionData = {
    publicKey: publicKeyToBase64(keys.signing.publicKey),
    secretKey: sodium.to_base64(keys.signing.privateKey, sodium.base64_variants.ORIGINAL),
    encPublicKey: publicKeyToBase64(keys.encryption.publicKey),
    encSecretKey: sodium.to_base64(keys.encryption.privateKey, sodium.base64_variants.ORIGINAL),
    pubkeyHash,
  };
  storeSession(sessionData);

  return { mnemonic, keys, pubkeyHash };
}

/**
 * Unlocks an existing identity using a seed phrase.
 *
 * 1. Validates the mnemonic
 * 2. Derives keypairs from the seed
 * 3. Computes pubkeyHash
 * 4. Stores session data
 *
 * @param mnemonic - 12-word seed phrase entered by user
 * @returns Unlocked identity with keys and pubkeyHash
 * @throws Error if mnemonic is invalid
 */
export async function unlockWithSeed(mnemonic: string): Promise<UnlockedIdentity> {
  await initCrypto();

  // Normalize user input
  const normalized = normalizeMnemonic(mnemonic);

  // Validate mnemonic
  if (!validateSeedPhrase(normalized)) {
    throw new Error("Invalid recovery phrase");
  }

  // Derive master seed
  const masterSeed = await mnemonicToMasterSeed(normalized);

  // Derive domain-separated keys
  const keys = deriveKeysFromSeed(masterSeed);

  // Compute pubkeyHash
  const pubkeyHash = computePubkeyHash(keys.signing.publicKey);

  // Store session
  const sessionData: SessionData = {
    publicKey: publicKeyToBase64(keys.signing.publicKey),
    secretKey: sodium.to_base64(keys.signing.privateKey, sodium.base64_variants.ORIGINAL),
    encPublicKey: publicKeyToBase64(keys.encryption.publicKey),
    encSecretKey: sodium.to_base64(keys.encryption.privateKey, sodium.base64_variants.ORIGINAL),
    pubkeyHash,
  };
  storeSession(sessionData);

  return { keys, pubkeyHash };
}
