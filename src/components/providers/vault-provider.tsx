"use client";

/**
 * Vault Provider
 *
 * Wraps the app with the CRDT vault context, initializing the LoroDoc
 * and managing sync with IndexedDB and server.
 *
 * Flow:
 * 1. Get active vault ID from ActiveVaultProvider
 * 2. Fetch vault list to get encrypted vault key
 * 3. Decrypt vault key using session keys
 * 4. Create SyncManager and initialize (loads from IndexedDB/server)
 * 5. Provide CRDT state to children
 */

import { LoroDoc } from "loro-crdt";
import { useEffect, useRef, useState } from "react";

import { useActiveVault } from "@/hooks/use-active-vault";
import { useSyncStatusManager } from "@/hooks/use-sync-status";
import { VaultProvider as BaseVaultProvider } from "@/lib/crdt/context";
import { getDefaultVaultState } from "@/lib/crdt/defaults";
import { base64ToPrivateKey, initCrypto } from "@/lib/crypto";
import { unwrapKeyFromBase64 } from "@/lib/crypto/keywrap";
import { getSession } from "@/lib/crypto/session";
import { createSyncManager, type SyncManager } from "@/lib/sync";
import { trpc } from "@/lib/trpc";

interface VaultProviderProps {
    children: React.ReactNode;
}

/**
 * Provider component that initializes the vault LoroDoc and provides
 * CRDT state management to the app.
 */
export function VaultProvider({ children }: VaultProviderProps) {
    // Track client-side hydration and initialization
    const [isClient, setIsClient] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    // Get active vault from context
    const { activeVault, setActiveVault } = useActiveVault();

    // Get sync status context for updating state
    const syncStatusContext = useSyncStatusManager();

    // Fetch the current identity's vaults even when local storage has no valid selection.
    // This lets us recover from stale identity-scoped browser state.
    const vaultListQuery = trpc.vault.list.useQuery();

    // Create stable LoroDoc instance
    const docRef = useRef<LoroDoc | null>(null);
    const syncManagerRef = useRef<SyncManager | null>(null);

    // Get tRPC utils for sync manager
    const trpcUtils = trpc.useUtils();

    // Initialize on client side
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Reconcile the persisted selection with vaults the current identity can access.
    // Without this, a vault ID left by another identity makes initialization return early
    // forever and the app displays an endless spinner.
    useEffect(() => {
        if (!isClient || !vaultListQuery.data) return;

        const vaults = vaultListQuery.data.vaults;
        if (vaults.length === 0) {
            setInitError("No accessible vaults were found for this account");
            return;
        }

        const activeVaultIsAccessible = vaults.some((vault) => vault.id === activeVault?.id);
        if (!activeVaultIsAccessible) {
            setInitError(null);
            setIsInitialized(false);
            setActiveVault({ id: vaults[0].id });
        }
    }, [isClient, activeVault?.id, setActiveVault, vaultListQuery.data]);

    // Initialize SyncManager when we have vault info
    useEffect(() => {
        const vaultId = activeVault?.id;
        if (!isClient || !vaultId || !vaultListQuery.data) return;

        const vaultInfo = vaultListQuery.data.vaults.find((v) => v.id === vaultId);
        if (!vaultInfo?.encryptedVaultKey) return;

        // Cleanup previous sync manager if vault changed
        if (syncManagerRef.current) {
            syncManagerRef.current.disconnect();
            syncManagerRef.current = null;
            docRef.current = null;
            setIsInitialized(false);
        }

        let cancelled = false;

        async function initialize() {
            try {
                await initCrypto();
                const session = getSession();
                if (!session) {
                    throw new Error("No session - user must be authenticated");
                }

                // Decrypt vault key - convert session's base64 secret to Uint8Array
                const encSecretKeyBytes = base64ToPrivateKey(session.encSecretKey);
                const vaultKey = await unwrapKeyFromBase64(
                    vaultInfo!.encryptedVaultKey,
                    session.encPublicKey, // Sender was self (own public key)
                    encSecretKeyBytes
                );

                // Create LoroDoc
                const doc = new LoroDoc();
                docRef.current = doc;

                // Create SyncManager
                const manager = createSyncManager({
                    vaultId: vaultId!, // Already guarded above, but TS can't narrow in nested function
                    pubkeyHash: session.pubkeyHash,
                    vaultKey,
                    doc,
                    trpc: {
                        sync: {
                            getSnapshot: {
                                query: (input) => trpcUtils.sync.getSnapshot.fetch(input)
                            },
                            getUpdates: {
                                query: (input) => trpcUtils.sync.getUpdates.fetch(input)
                            },
                            pushOps: {
                                mutate: (input) => trpcUtils.client.sync.pushOps.mutate(input)
                            },
                            pushSnapshot: {
                                mutate: (input) => trpcUtils.client.sync.pushSnapshot.mutate(input)
                            }
                        }
                    },
                    onSyncStateChange: (state) => {
                        syncStatusContext.setSyncState(state);
                    },
                    onError: (error) => {
                        console.error("SyncManager error:", error);
                    }
                });

                syncManagerRef.current = manager;

                // Initialize (loads from IndexedDB/server)
                await manager.initialize();

                if (!cancelled) {
                    setIsInitialized(true);
                    setInitError(null);
                    syncStatusContext.setIsConnected(true);

                    // Register force sync handler
                    syncStatusContext.registerForceSync(async () => {
                        await manager.forceSync();
                    });
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to initialize vault:", error);
                    setInitError(
                        error instanceof Error ? error.message : "Failed to initialize vault"
                    );
                    setIsInitialized(false);
                }
            }
        }

        initialize();

        return () => {
            cancelled = true;
            if (syncManagerRef.current) {
                syncManagerRef.current.disconnect();
                syncManagerRef.current = null;
            }
        };
    }, [isClient, activeVault?.id, vaultListQuery.data, trpcUtils, syncStatusContext]);

    // Loading state
    if (!isClient) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    // Loading vault data
    if (vaultListQuery.isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    if (vaultListQuery.isError) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive">Failed to load vaults</p>
                <p className="text-muted-foreground text-sm">{vaultListQuery.error.message}</p>
            </div>
        );
    }

    if (!vaultListQuery.data) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    // Wait for the reconciliation effect to select an accessible vault. If the
    // identity truly has none, show a terminal state rather than spinning forever.
    if (!activeVault?.id) {
        if (vaultListQuery.data.vaults.length > 0) {
            return (
                <div className="flex h-screen items-center justify-center">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                </div>
            );
        }

        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">No vault available</p>
            </div>
        );
    }

    // Error state
    if (initError) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive">Failed to load vault</p>
                <p className="text-muted-foreground text-sm">{initError}</p>
            </div>
        );
    }

    // Waiting for initialization
    if (!isInitialized || !docRef.current) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    return (
        <BaseVaultProvider
            doc={docRef.current}
            initialState={getDefaultVaultState()}
            debug={process.env.NODE_ENV === "development"}
        >
            {children}
        </BaseVaultProvider>
    );
}
