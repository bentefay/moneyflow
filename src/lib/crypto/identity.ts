/**
 * Identity Management
 *
 * High-level functions for creating and restoring user identities.
 * Combines seed generation, key derivation, and pubkeyHash computation.
 */

import sodium from "libsodium-wrappers";
import { type DerivedKeys, deriveKeysFromSeed, initCrypto, publicKeyToBase64 } from "./keypair";
import {
	generateSeedPhrase,
	mnemonicToMasterSeed,
	normalizeMnemonic,
	validateSeedPhrase,
} from "./seed";
import { type SessionData, storeSession } from "./session";

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
 * @returns Hex-encoded BLAKE2b-256 hash (64 characters)
 */
export function computePubkeyHash(publicKey: Uint8Array): string {
	const hash = sodium.crypto_generichash(32, publicKey);
	return sodium.to_hex(hash);
}

/**
 * Generates a new user identity WITHOUT storing session.
 *
 * 1. Generates a random 12-word BIP39 seed phrase
 * 2. Derives Ed25519 (signing) and X25519 (encryption) keypairs
 * 3. Computes pubkeyHash for server identification
 *
 * ⚠️ The returned mnemonic must be shown to the user to write down.
 * ⚠️ Does NOT store session - call storeIdentitySession() after user confirms.
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

	return { mnemonic, keys, pubkeyHash };
}

/**
 * Stores session data for an identity.
 * Call this after user confirms they've written down their seed phrase.
 *
 * @param identity - The identity to store session for
 */
export function storeIdentitySession(identity: NewIdentity | UnlockedIdentity): void {
	const sessionData: SessionData = {
		publicKey: publicKeyToBase64(identity.keys.signing.publicKey),
		secretKey: sodium.to_base64(identity.keys.signing.privateKey, sodium.base64_variants.ORIGINAL),
		encPublicKey: publicKeyToBase64(identity.keys.encryption.publicKey),
		encSecretKey: sodium.to_base64(
			identity.keys.encryption.privateKey,
			sodium.base64_variants.ORIGINAL
		),
		pubkeyHash: identity.pubkeyHash,
	};
	storeSession(sessionData);
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

	// Store session (unlock always stores - user already has account)
	storeIdentitySession({ keys, pubkeyHash });

	return { keys, pubkeyHash };
}
