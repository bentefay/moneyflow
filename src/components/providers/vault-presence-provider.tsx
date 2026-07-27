"use client";

/**
 * Vault Presence Provider (HS-003)
 *
 * Hosts the single presence session for the app shell so the header avatars and the transactions
 * table read the same Loro `EphemeralStore` instead of opening a channel each. One provider means
 * one session id per tab, which is what makes duplicate same-identity tabs distinguishable.
 */

import { createContext, useContext } from "react";

import { useActiveVault } from "@/hooks/use-active-vault";
import { useVaultAccess } from "@/hooks/use-vault-access";
import { useVaultPresence, type VaultPresence } from "@/hooks/use-vault-presence";
import { useAuthGuard } from "@/lib/auth";
import { EMPTY_PRESENCE_SNAPSHOT } from "@/lib/sync/presence";

const noop = () => {};

/** Inert presence for trees rendered outside the provider (tests, storybook, error states). */
const DISCONNECTED: VaultPresence = {
    snapshot: EMPTY_PRESENCE_SNAPSHOT,
    onlineIdentities: [],
    presentIdentities: [],
    isConnected: false,
    setPresenceState: noop,
    clearPresenceFocus: noop,
    disconnect: async () => {}
};

const VaultPresenceContext = createContext<VaultPresence>(DISCONNECTED);

export function VaultPresenceProvider({ children }: { readonly children: React.ReactNode }) {
    const { activeVault } = useActiveVault();
    const { pubkeyHash } = useAuthGuard({ redirect: false });
    const { vaultKey } = useVaultAccess();
    const presence = useVaultPresence(activeVault?.id ?? null, pubkeyHash, vaultKey);

    return (
        <VaultPresenceContext.Provider value={presence}>{children}</VaultPresenceContext.Provider>
    );
}

/** Read the app's presence session. Safe to call anywhere under the app shell. */
export function useVaultPresenceContext(): VaultPresence {
    return useContext(VaultPresenceContext);
}
