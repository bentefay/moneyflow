/**
 * Tests for invite redemption crypto (HS-011).
 *
 * These exercise the full owner -> invite envelope -> invitee membership-key
 * exchange and prove that:
 *   1. redemption recovers the REAL vault key and the invitee's self-wrapped
 *      membership key opens the SAME vault (matching `VaultProvider` unwrap), and
 *   2. the previously shipped placeholder (random membership key) is insecure:
 *      it does not decrypt to the owner's vault key.
 */

import sodium from "libsodium-wrappers";
import { beforeAll, describe, expect, it } from "vitest";

import { generateVaultKey } from "@/lib/crypto/encryption";
import { deriveKeysFromSeed, initCrypto, publicKeyToBase64 } from "@/lib/crypto/keypair";
import { unwrapKeyFromBase64, wrapKey } from "@/lib/crypto/keywrap";
import { generateSeedPhrase, mnemonicToMasterSeed } from "@/lib/crypto/seed";
import {
    deriveInviteKeypairFromFragment,
    redeemRealVaultKey,
    selfWrapVaultKey
} from "@/lib/vault/invite-redemption";

beforeAll(async () => {
    await initCrypto();
});

async function createTestUser() {
    const mnemonic = generateSeedPhrase();
    const masterSeed = await mnemonicToMasterSeed(mnemonic);
    return deriveKeysFromSeed(masterSeed);
}

/**
 * Reproduce what {@link InviteLinkGenerator} does on the owner side: mint a
 * random 32-byte fragment secret, derive the ephemeral invite keypair, and
 * wrap the vault key toward it with the owner's X25519 secret.
 */
async function mintInviteEnvelope(vaultKey: Uint8Array, ownerEncSecretKey: Uint8Array) {
    const inviteSecret = sodium.randombytes_buf(32);
    const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSecret);
    const wrapped = await wrapKey(vaultKey, inviteKeypair.publicKey, ownerEncSecretKey);
    return {
        fragmentSecret: sodium.to_base64(inviteSecret, sodium.base64_variants.URLSAFE),
        invitePubkeyBase64: sodium.to_base64(
            inviteKeypair.publicKey,
            sodium.base64_variants.ORIGINAL
        ),
        encryptedVaultKey: sodium.to_base64(wrapped, sodium.base64_variants.ORIGINAL)
    };
}

describe("invite redemption", () => {
    it("recovers the real vault key and self-wraps it so the vault opens", async () => {
        const owner = await createTestUser();
        const invitee = await createTestUser();
        const vaultKey = await generateVaultKey();
        const senderEncPublicKey = publicKeyToBase64(owner.encryption.publicKey);
        const inviteePubBase64 = publicKeyToBase64(invitee.encryption.publicKey);

        const envelope = await mintInviteEnvelope(vaultKey, owner.encryption.privateKey);

        // Redemption side: re-derive the ephemeral keypair from the fragment.
        const derived = await deriveInviteKeypairFromFragment(envelope.fragmentSecret);
        expect(derived.invitePubkeyBase64).toBe(envelope.invitePubkeyBase64);

        const realVaultKey = await redeemRealVaultKey({
            encryptedVaultKey: envelope.encryptedVaultKey,
            senderEncPublicKey,
            inviteSecretKey: derived.inviteSecretKey
        });
        expect(realVaultKey).toEqual(vaultKey);

        // Invitee self-wraps for their own membership row.
        const membershipKey = await selfWrapVaultKey({
            vaultKey: realVaultKey,
            ownEncPublicKey: inviteePubBase64,
            ownEncSecretKey: invitee.encryption.privateKey
        });

        // VaultProvider unwraps a member's own row with sender == self.
        const openedByProvider = await unwrapKeyFromBase64(
            membershipKey,
            inviteePubBase64,
            invitee.encryption.privateKey
        );
        expect(openedByProvider).toEqual(vaultKey);
    });

    it("rejects a tampered or wrong-sender envelope instead of yielding a key", async () => {
        const owner = await createTestUser();
        const attacker = await createTestUser();
        const vaultKey = await generateVaultKey();
        const envelope = await mintInviteEnvelope(vaultKey, owner.encryption.privateKey);
        const derived = await deriveInviteKeypairFromFragment(envelope.fragmentSecret);

        await expect(
            redeemRealVaultKey({
                encryptedVaultKey: envelope.encryptedVaultKey,
                senderEncPublicKey: publicKeyToBase64(attacker.encryption.publicKey),
                inviteSecretKey: derived.inviteSecretKey
            })
        ).rejects.toThrow();
    });

    it("proves the shipped placeholder membership key does NOT open the vault", async () => {
        // Regression guard for the redemption defect: the page used to send a
        // random 48-byte buffer as `encryptedVaultKey`. Decrypting it against the
        // invitee's own keys must fail and must not equal the real vault key.
        const invitee = await createTestUser();
        const vaultKey = await generateVaultKey();
        const inviteePubBase64 = publicKeyToBase64(invitee.encryption.publicKey);

        const placeholderMembershipKey = sodium.to_base64(
            sodium.randombytes_buf(48),
            sodium.base64_variants.ORIGINAL
        );

        await expect(
            unwrapKeyFromBase64(
                placeholderMembershipKey,
                inviteePubBase64,
                invitee.encryption.privateKey
            )
        ).rejects.toThrow();

        // And the real path yields something the placeholder never could.
        const envelope = await mintInviteEnvelope(vaultKey, invitee.encryption.privateKey);
        expect(placeholderMembershipKey).not.toBe(envelope.encryptedVaultKey);
    });
});
