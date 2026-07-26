/**
 * Invite redemption crypto (HS-011).
 *
 * Pure, side-effect-free helpers that turn an invite envelope into a real,
 * self-wrapped vault-key membership key. Extracted from the redemption page so
 * the security-critical key exchange is unit-testable end to end.
 *
 * Envelope contract (matches {@link InviteLinkGenerator} creation):
 * - The owner wraps the 32-byte vault key with authenticated `crypto_box`:
 *   sender = owner X25519 secret, recipient = ephemeral invite pubkey derived
 *   from the 32-byte fragment secret.
 * - Redemption unwraps with: sender = owner X25519 public key, recipient =
 *   ephemeral invite secret key (re-derived from the fragment secret).
 * - The invitee then self-wraps the real key exactly as vault creation does
 *   (sender == recipient == self), so `VaultProvider` opens the SAME vault.
 *
 * No placeholder/random key material is produced here.
 */

import sodium from "libsodium-wrappers";

import { initCrypto } from "@/lib/crypto/keypair";
import { unwrapKeyFromBase64, wrapKeyToBase64 } from "@/lib/crypto/keywrap";

/** Number of bytes in a vault symmetric key. */
const VAULT_KEY_BYTES = 32;

/** Number of bytes in the invite fragment secret. */
const INVITE_SECRET_BYTES = 32;

export interface DerivedInviteKeypair {
    /** Ephemeral X25519 public key (base64, ORIGINAL) — the invite lookup id. */
    readonly invitePubkeyBase64: string;
    /** Ephemeral X25519 secret key used to unwrap the owner's envelope. */
    readonly inviteSecretKey: Uint8Array;
}

/**
 * Decode the URL-fragment secret and derive the deterministic ephemeral
 * X25519 keypair the owner wrapped the vault key toward.
 *
 * @throws if the fragment is not a valid 32-byte URL-safe base64 secret.
 */
export async function deriveInviteKeypairFromFragment(
    fragmentSecret: string
): Promise<DerivedInviteKeypair> {
    await initCrypto();

    const inviteSecret = sodium.from_base64(fragmentSecret, sodium.base64_variants.URLSAFE);
    if (inviteSecret.length !== INVITE_SECRET_BYTES) {
        throw new Error("Invite secret must be 32 bytes");
    }

    const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSecret);
    return {
        invitePubkeyBase64: sodium.to_base64(
            inviteKeypair.publicKey,
            sodium.base64_variants.ORIGINAL
        ),
        inviteSecretKey: inviteKeypair.privateKey
    };
}

export interface RedeemVaultKeyInput {
    /** Owner's authenticated-`crypto_box` envelope (base64, ORIGINAL). */
    readonly encryptedVaultKey: string;
    /** Owner's X25519 sender public key (base64, ORIGINAL). */
    readonly senderEncPublicKey: string;
    /** Ephemeral invite secret key from {@link deriveInviteKeypairFromFragment}. */
    readonly inviteSecretKey: Uint8Array;
}

/**
 * Unwrap the REAL vault key from the owner's invite envelope.
 *
 * @throws if authentication fails (wrong keys / tampered envelope) or the
 * recovered key is not exactly 32 bytes.
 */
export async function redeemRealVaultKey(input: RedeemVaultKeyInput): Promise<Uint8Array> {
    const vaultKey = await unwrapKeyFromBase64(
        input.encryptedVaultKey,
        input.senderEncPublicKey,
        input.inviteSecretKey
    );

    if (vaultKey.length !== VAULT_KEY_BYTES) {
        throw new Error("Unwrapped vault key has an unexpected length");
    }

    return vaultKey;
}

export interface SelfWrapInput {
    /** The real 32-byte vault key recovered by {@link redeemRealVaultKey}. */
    readonly vaultKey: Uint8Array;
    /** Invitee's own X25519 public key (base64, ORIGINAL). */
    readonly ownEncPublicKey: string;
    /** Invitee's own X25519 secret key. */
    readonly ownEncSecretKey: Uint8Array;
}

/**
 * Re-wrap the real vault key for the invitee's own membership row, using the
 * same self-addressed authenticated `crypto_box` convention as vault creation
 * (sender == recipient == self). `VaultProvider` unwraps this with the
 * member's own public key as the sender.
 */
export async function selfWrapVaultKey(input: SelfWrapInput): Promise<string> {
    if (input.vaultKey.length !== VAULT_KEY_BYTES) {
        throw new Error("Vault key must be 32 bytes");
    }
    return wrapKeyToBase64(input.vaultKey, input.ownEncPublicKey, input.ownEncSecretKey);
}
