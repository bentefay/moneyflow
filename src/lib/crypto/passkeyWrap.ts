/**
 * Passkey PRF Identity Wrapping
 *
 * A WebAuthn PRF output is used ONLY as a key-encryption key that wraps the SAME master identity
 * secret the recovery phrase produces. A passkey is an additional way to reach an existing
 * identity - it never mints, substitutes or derives a new one, and it never reduces entropy.
 *
 * Per W3C WebAuthn Level 3 §10.1.4 the PRF output is exactly 32 bytes, is specific to one
 * credential, and is available only to client-side script. It must never be transmitted or
 * persisted; only the ciphertext produced here may leave the device.
 */

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import sodium from "libsodium-wrappers";

import { decryptFromStorage, encryptForStorage, KEY_BYTES } from "./encryption";
import { initCrypto } from "./keypair";

/** Length of a WebAuthn PRF output, fixed at 32 bytes by the specification. */
export const PRF_OUTPUT_BYTES = 32;

/** Length of the master seed produced by BIP39, which is what gets wrapped. */
const MASTER_SECRET_BYTES = 64;

const textEncoder = new TextEncoder();

/**
 * Public, non-secret salt passed as the PRF evaluation input.
 *
 * The browser hashes this with the fixed `"WebAuthn PRF"` prefix before it reaches the
 * authenticator, and the resulting PRF is per-credential regardless of the salt, so one shared
 * constant is safe. A shared constant is also required in practice: a discoverable-credential
 * assertion has no `allowCredentials`, so `evalByCredential` cannot be used to select a
 * per-credential salt.
 */
export const PASSKEY_PRF_SALT = textEncoder.encode("moneyflow-v1-passkey-identity-wrap");

/**
 * Envelope format version, stored alongside each credential.
 *
 * Carrying it explicitly means the salt or key schedule can be rotated later without a schema
 * migration and without guessing how an existing envelope was produced.
 */
export const PASSKEY_WRAP_VERSION = 1;

/** HKDF domain separation for the key-encryption key. NEVER change this after launch. */
const DOMAIN_PASSKEY_KEK = textEncoder.encode("moneyflow-v1-passkey-kek");

/**
 * Derives the key-encryption key from a WebAuthn PRF output.
 *
 * The PRF output is already uniformly random, so HKDF here is domain separation rather than
 * entropy extraction: it guarantees that any future key derived from the same credential cannot
 * collide with this one.
 *
 * @param prfOutput - 32-byte PRF output from `clientExtensionResults.prf.results.first`
 * @returns 32-byte key-encryption key
 * @throws Error if the PRF output is not exactly 32 bytes
 */
export async function deriveKeyEncryptionKey(prfOutput: Uint8Array): Promise<Uint8Array> {
    await initCrypto();

    if (prfOutput.length !== PRF_OUTPUT_BYTES) {
        throw new Error(`PRF output must be ${PRF_OUTPUT_BYTES} bytes`);
    }

    return hkdf(sha256, prfOutput, undefined, DOMAIN_PASSKEY_KEK, KEY_BYTES);
}

/**
 * Wraps the master identity secret under a passkey's PRF output.
 *
 * Each call uses a fresh random 192-bit nonce. That matters more than usual here: the PRF output
 * is constant for a given credential and salt, so a reused nonce would be catastrophic.
 *
 * @param masterSecret - The 64-byte master seed the identity derives from
 * @param prfOutput - 32-byte PRF output for the credential being registered
 * @returns Base64-encoded envelope, safe to store on the server
 * @throws Error if either input has the wrong length
 */
export async function wrapMasterSecret(
    masterSecret: Uint8Array,
    prfOutput: Uint8Array
): Promise<string> {
    await initCrypto();

    if (masterSecret.length !== MASTER_SECRET_BYTES) {
        throw new Error(`Master secret must be ${MASTER_SECRET_BYTES} bytes`);
    }

    const kek = await deriveKeyEncryptionKey(prfOutput);
    try {
        const envelope = await encryptForStorage(masterSecret, kek);
        return sodium.to_base64(envelope, sodium.base64_variants.ORIGINAL);
    } finally {
        sodium.memzero(kek);
    }
}

/**
 * Unwraps the master identity secret using a passkey's PRF output.
 *
 * Fails closed on every mismatch. A wrong credential, a tampered envelope and a truncated
 * envelope are all indistinguishable to the caller, which is what prevents a malicious server
 * from probing the wrapping key.
 *
 * @param wrappedSecret - Base64-encoded envelope from the server
 * @param prfOutput - 32-byte PRF output for the asserting credential
 * @returns The 64-byte master secret
 * @throws Error if the envelope is malformed or does not authenticate under this PRF output
 */
export async function unwrapMasterSecret(
    wrappedSecret: string,
    prfOutput: Uint8Array
): Promise<Uint8Array> {
    await initCrypto();

    const kek = await deriveKeyEncryptionKey(prfOutput);
    try {
        const envelope = decodeEnvelope(wrappedSecret);
        const masterSecret = await decryptFromStorage(envelope, kek);

        if (masterSecret.length !== MASTER_SECRET_BYTES) {
            sodium.memzero(masterSecret);
            throw new Error("Passkey unwrap failed - unexpected secret length");
        }

        return masterSecret;
    } catch {
        // Deliberately uniform: never reveal which stage failed.
        throw new Error("Passkey unwrap failed - wrong credential or corrupted data");
    } finally {
        sodium.memzero(kek);
    }
}

/**
 * Overwrites secret bytes in place once they are no longer needed.
 *
 * This cannot guarantee erasure in a garbage-collected runtime, but it bounds how long a PRF
 * output or master secret stays readable in a heap snapshot.
 */
export function zeroize(secret: Uint8Array): void {
    sodium.memzero(secret);
}

/** Decodes a base64 envelope, rejecting malformed input rather than coercing it. */
function decodeEnvelope(wrappedSecret: string): Uint8Array {
    if (wrappedSecret.length === 0) {
        throw new Error("Wrapped secret is empty");
    }
    return sodium.from_base64(wrappedSecret, sodium.base64_variants.ORIGINAL);
}
