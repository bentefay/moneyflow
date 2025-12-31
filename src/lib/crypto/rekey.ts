/**
 * Vault Re-keying
 *
 * Handles the process of generating a new vault key and re-encrypting
 * data when a member is removed from a vault.
 *
 * Re-keying Flow:
 * 1. Owner removes member via membership.remove API
 * 2. Client generates new vault key
 * 3. Client decrypts CRDT snapshot with old key
 * 4. Client re-encrypts CRDT snapshot with new key
 * 5. Client wraps new key for each remaining member using their enc_public_key
 * 6. Client calls membership.rekey with new wrapped keys
 * 7. Client pushes re-encrypted snapshot to server
 *
 * This ensures the removed member cannot access future vault updates
 * even if they have stored encrypted updates.
 */

import sodium from "libsodium-wrappers";
import { decrypt, encrypt, generateVaultKey } from "./encryption";
import { initCrypto } from "./keypair";
import { sealKeyToBase64 } from "./keywrap";

export interface RemainingMember {
	pubkeyHash: string;
	encPublicKey: string; // Base64-encoded X25519 public key
}

export interface RekeyResult {
	/** New vault key (32 bytes) */
	newVaultKey: Uint8Array;
	/** New wrapped keys for each remaining member */
	memberKeys: Array<{
		pubkeyHash: string;
		encryptedVaultKey: string; // Base64-encoded wrapped key
	}>;
}

/**
 * Generates a new vault key and wraps it for all remaining members.
 *
 * Uses sealed box (crypto_box_seal) which doesn't require the sender's
 * private key - only the recipient's public key is needed.
 *
 * @param remainingMembers - Members who should receive the new key
 * @returns New vault key and wrapped keys for each member
 */
export async function rekeyVault(remainingMembers: RemainingMember[]): Promise<RekeyResult> {
	await initCrypto();

	// Generate new vault key
	const newVaultKey = await generateVaultKey();

	// Wrap new key for each remaining member using sealed box
	const memberKeys = await Promise.all(
		remainingMembers.map(async (member) => ({
			pubkeyHash: member.pubkeyHash,
			encryptedVaultKey: await sealKeyToBase64(newVaultKey, member.encPublicKey),
		}))
	);

	return {
		newVaultKey,
		memberKeys,
	};
}

/**
 * Re-encrypts a CRDT snapshot with a new vault key.
 *
 * @param encryptedSnapshot - Base64-encoded encrypted snapshot (old key)
 * @param oldVaultKey - Previous vault key (32 bytes)
 * @param newVaultKey - New vault key (32 bytes)
 * @returns Base64-encoded encrypted snapshot (new key)
 */
export async function reencryptSnapshot(
	encryptedSnapshot: string,
	oldVaultKey: Uint8Array,
	newVaultKey: Uint8Array
): Promise<string> {
	await initCrypto();

	// Decode the encrypted snapshot
	const encryptedData = sodium.from_base64(encryptedSnapshot, sodium.base64_variants.ORIGINAL);

	// The snapshot format is: nonce (24 bytes) || ciphertext
	const nonceLength = 24;
	const nonce = encryptedData.slice(0, nonceLength);
	const ciphertext = encryptedData.slice(nonceLength);

	// Decrypt with old key
	const plaintext = await decrypt(ciphertext, nonce, oldVaultKey);

	// Re-encrypt with new key
	const { ciphertext: newCiphertext, nonce: newNonce } = await encrypt(plaintext, newVaultKey);

	// Combine new nonce and ciphertext
	const result = new Uint8Array(newNonce.length + newCiphertext.length);
	result.set(newNonce);
	result.set(newCiphertext, newNonce.length);

	return sodium.to_base64(result, sodium.base64_variants.ORIGINAL);
}

/**
 * Performs a complete vault re-key operation.
 *
 * This is a convenience function that combines:
 * 1. Generate new vault key
 * 2. Wrap for all remaining members
 * 3. Re-encrypt snapshot
 *
 * @param remainingMembers - Members who should receive the new key
 * @param encryptedSnapshot - Current encrypted snapshot (optional)
 * @param oldVaultKey - Current vault key (required if snapshot provided)
 * @returns Re-key result with new key, member keys, and optionally re-encrypted snapshot
 */
export async function performCompleteRekey(
	remainingMembers: RemainingMember[],
	encryptedSnapshot?: string,
	oldVaultKey?: Uint8Array
): Promise<RekeyResult & { newEncryptedSnapshot?: string }> {
	const result = await rekeyVault(remainingMembers);

	// If snapshot and old key provided, re-encrypt
	let newEncryptedSnapshot: string | undefined;
	if (encryptedSnapshot && oldVaultKey) {
		newEncryptedSnapshot = await reencryptSnapshot(
			encryptedSnapshot,
			oldVaultKey,
			result.newVaultKey
		);
	}

	return {
		...result,
		newEncryptedSnapshot,
	};
}
