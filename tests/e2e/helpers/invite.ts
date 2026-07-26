/**
 * Invite-redemption E2E helpers (HS-011).
 *
 * These prove the redemption fix at the data layer: after a member accepts an
 * invite through the real UI, their stored membership row must unwrap to the
 * SAME vault master key the owner holds. The old placeholder implementation also
 * produced a "Success!" screen, so only key equality distinguishes the fix from
 * the defect.
 *
 * Security: the recovered vault key is compared in memory only. It is never
 * returned, logged, or written to any Playwright artifact.
 */

import type { Page } from "@playwright/test";

import { base64ToPrivateKey } from "@/lib/crypto/keypair";
import { unwrapKeyFromBase64 } from "@/lib/crypto/keywrap";

import { createAdminClient, readBrowserIdentity } from "./realtime";

interface BrowserIdentitySession {
    pubkeyHash: string;
    encPublicKey: string;
    encSecretKey: string;
}

/** Read and unwrap a member's stored vault key for a vault (sender == self). */
async function unwrapMembershipKey(
    admin: ReturnType<typeof createAdminClient>,
    vaultId: string,
    identity: BrowserIdentitySession
): Promise<Uint8Array> {
    const { data, error } = await admin
        .from("vault_memberships")
        .select("encrypted_vault_key")
        .eq("vault_id", vaultId)
        .eq("pubkey_hash", identity.pubkeyHash)
        .single();
    if (error || !data) {
        throw new Error("Membership row is unavailable for the requested identity");
    }
    return unwrapKeyFromBase64(
        data.encrypted_vault_key,
        identity.encPublicKey,
        base64ToPrivateKey(identity.encSecretKey)
    );
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/**
 * Returns true when the member's redeemed membership key decrypts to the same
 * vault master key as the owner's — i.e. the invitee recovered the REAL key.
 */
export async function memberHoldsSameVaultKeyAsOwner(
    owner: Page,
    member: Page,
    vaultId: string
): Promise<boolean> {
    const admin = createAdminClient();
    const [ownerIdentity, memberIdentity] = await Promise.all([
        readBrowserIdentity(owner),
        readBrowserIdentity(member)
    ]);
    const [ownerKey, memberKey] = await Promise.all([
        unwrapMembershipKey(admin, vaultId, ownerIdentity),
        unwrapMembershipKey(admin, vaultId, memberIdentity)
    ]);
    return bytesEqual(ownerKey, memberKey);
}
