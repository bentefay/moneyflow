"use client";

/**
 * Vault Access Hook
 *
 * Exposes the caller's membership role and the unwrapped vault key for the
 * active vault. This is the single place UI surfaces (Vault Settings members
 * management, invite generation) obtain the material they need, deriving it the
 * same way {@link VaultProvider} does rather than threading secret key bytes
 * through React context.
 *
 * The vault key is unwrapped from the caller's own membership envelope
 * (sender == self), so it is only ever available to an authenticated, unlocked
 * member of the vault.
 */

import { useEffect, useState } from "react";

import { useActiveVault } from "@/hooks/use-active-vault";
import { base64ToPrivateKey, initCrypto } from "@/lib/crypto";
import { unwrapKeyFromBase64 } from "@/lib/crypto/keywrap";
import { getSession, getSessionEncSecretKey } from "@/lib/crypto/session";
import type { VaultRole } from "@/lib/supabase/types";
import { trpc } from "@/lib/trpc";

export interface VaultAccess {
    /** Active vault id, or null when none is selected. */
    vaultId: string | null;
    /** Caller's role in the active vault, or null until loaded. */
    role: VaultRole | null;
    /** True when the caller owns the active vault. */
    isOwner: boolean;
    /** Unwrapped vault key, available once decrypted. */
    vaultKey: Uint8Array | undefined;
    /** Caller's X25519 secret key bytes, for authenticated key wrapping. */
    encSecretKey: Uint8Array | undefined;
    /** True while the vault list / key material is still loading. */
    isLoading: boolean;
}

/**
 * Decode the session's X25519 secret key to raw bytes, or undefined if the
 * session is absent.
 */
function readEncSecretKey(): Uint8Array | undefined {
    const base64 = getSessionEncSecretKey();
    if (base64 == null) return undefined;
    return base64ToPrivateKey(base64);
}

export function useVaultAccess(): VaultAccess {
    const { activeVault } = useActiveVault();
    const vaultId = activeVault?.id ?? null;

    const vaultListQuery = trpc.vault.list.useQuery();
    const activeMembership = vaultListQuery.data?.vaults.find((vault) => vault.id === vaultId);
    const role = activeMembership?.role ?? null;
    const encryptedVaultKey = activeMembership?.encryptedVaultKey ?? null;

    const [vaultKey, setVaultKey] = useState<Uint8Array | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;

        async function unwrap() {
            if (encryptedVaultKey == null) {
                setVaultKey(undefined);
                return;
            }
            try {
                await initCrypto();
                const session = getSession();
                if (session == null) {
                    setVaultKey(undefined);
                    return;
                }
                const key = await unwrapKeyFromBase64(
                    encryptedVaultKey,
                    session.encPublicKey, // sender was self
                    base64ToPrivateKey(session.encSecretKey)
                );
                if (!cancelled) setVaultKey(key);
            } catch {
                if (!cancelled) setVaultKey(undefined);
            }
        }

        void unwrap();
        return () => {
            cancelled = true;
        };
    }, [encryptedVaultKey]);

    return {
        vaultId,
        role,
        isOwner: role === "owner",
        vaultKey,
        encSecretKey: readEncSecretKey(),
        isLoading: vaultListQuery.isLoading
    };
}
