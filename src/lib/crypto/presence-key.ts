/**
 * Vault-derived ephemeral presence key.
 *
 * Presence payloads are encrypted with a key derived from the vault key rather than the vault key
 * itself, so a presence transcript can never be replayed against durable vault ciphertext and a
 * compromise of one does not trivially yield the other. Derivation is HKDF-SHA256 with its own
 * domain separation string, matching the identity derivation in `keypair.ts`.
 */

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

import { KEY_BYTES } from "./encryption";

/** Domain separation for presence keys - NEVER change this after launch. */
export const DOMAIN_PRESENCE_EPHEMERAL = "moneyflow-v1-presence-ephemeral";

const DOMAIN_PRESENCE_EPHEMERAL_BYTES = new TextEncoder().encode(DOMAIN_PRESENCE_EPHEMERAL);

/**
 * Derives the ephemeral presence key for a vault.
 *
 * @param vaultKey - The 32-byte vault encryption key
 * @returns 32-byte presence key, independent of the vault key
 */
export function derivePresenceKey(vaultKey: Uint8Array): Uint8Array {
    if (vaultKey.length !== KEY_BYTES) {
        throw new Error(`Vault key must be ${KEY_BYTES} bytes`);
    }
    return hkdf(sha256, vaultKey, undefined, DOMAIN_PRESENCE_EPHEMERAL_BYTES, KEY_BYTES);
}
