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
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useActiveVault } from "@/hooks/use-active-vault";
import { useSyncStatusManager } from "@/hooks/use-sync-status";
import { useAuthGuard } from "@/lib/auth";
import { VaultProvider as BaseVaultProvider } from "@/lib/crdt/context";
import { getDefaultVaultState } from "@/lib/crdt/defaults";
import { ensureMemberPersonLinked, repairHydratedVaultDocument } from "@/lib/crdt/mirror";
import { VaultUndoCoordinator, VaultUndoProvider } from "@/lib/crdt/undo";
import { base64ToPrivateKey, initCrypto } from "@/lib/crypto";
import { unwrapKeyFromBase64 } from "@/lib/crypto/keywrap";
import { getSession } from "@/lib/crypto/session";
import { createSyncManager, type SyncManager } from "@/lib/sync";
import { trpc } from "@/lib/trpc";
import { consumePendingPersonLink } from "@/lib/vault/pending-person-link";

interface VaultProviderProps {
    children: React.ReactNode;
    registerDisconnect?: (disconnect: () => Promise<void>) => () => void;
}

const subscribeToHydration = () => () => {};

/** Hydrate, repair, and durably flush before the provider exposes this document. */
export async function hydrateAndRepairVaultDocument(
    doc: LoroDoc,
    manager: Pick<SyncManager, "awaitLocalPersistence" | "forceSync" | "initialize">
): Promise<boolean> {
    await manager.initialize();
    const repaired = repairHydratedVaultDocument(doc);
    if (repaired) {
        await manager.awaitLocalPersistence();
        await manager.forceSync();
    }
    return repaired;
}

/**
 * Provider component that initializes the vault LoroDoc and provides
 * CRDT state management to the app.
 */
export function VaultProvider({ children, registerDisconnect }: VaultProviderProps) {
    const isClient = useSyncExternalStore(
        subscribeToHydration,
        () => true,
        () => false
    );
    const [initializedVault, setInitializedVault] = useState<{
        vaultId: string;
        doc: LoroDoc;
        undoCoordinator: VaultUndoCoordinator;
    } | null>(null);
    const [initFailure, setInitFailure] = useState<{
        vaultId: string;
        message: string;
    } | null>(null);

    // Get active vault from context
    const { activeVault, setActiveVault } = useActiveVault();
    const { pubkeyHash } = useAuthGuard({ redirect: false });

    // Depend on stable context callbacks, never on the reconstructed context value.
    const { setSyncState, setIsConnected, registerForceSync } = useSyncStatusManager();

    // Fetch the current identity's vaults even when local storage has no valid selection.
    // This lets us recover from stale identity-scoped browser state.
    const vaultListQuery = trpc.vault.list.useQuery();

    // Create stable LoroDoc instance
    const syncManagerRef = useRef<SyncManager | null>(null);

    // Get tRPC utils for sync manager
    const trpcUtils = trpc.useUtils();
    const trpcUtilsRef = useRef(trpcUtils);
    useEffect(() => {
        trpcUtilsRef.current = trpcUtils;
    }, [trpcUtils]);
    // Sync reads go through the direct client, never the React Query cache. `utils.*.fetch()`
    // honours the 60s default `staleTime`, so a catch-up triggered by foregrounding or reconnecting
    // would be answered from cache and silently drop the very operations it exists to recover.
    const getSnapshot = useCallback(
        (input: { vaultId: string }) => trpcUtilsRef.current.client.sync.getSnapshot.query(input),
        []
    );
    const getUpdates = useCallback(
        (input: { vaultId: string; versionVector: string; hasUnpushed: boolean }) =>
            trpcUtilsRef.current.client.sync.getUpdates.query(input),
        []
    );
    const pushOps = useCallback(
        (input: {
            vaultId: string;
            ops: Array<{ id: string; encryptedData: string; versionVector: string }>;
        }) => trpcUtilsRef.current.client.sync.pushOps.mutate(input),
        []
    );
    const pushSnapshot = useCallback(
        (input: { vaultId: string; encryptedData: string; versionVector: string }) =>
            trpcUtilsRef.current.client.sync.pushSnapshot.mutate(input),
        []
    );

    const vaultId = activeVault?.id ?? null;
    const encryptedVaultKey =
        vaultListQuery.data?.vaults.find((vault) => vault.id === vaultId)?.encryptedVaultKey ??
        null;

    // Reconcile the persisted selection with vaults the current identity can access.
    // Without this, a vault ID left by another identity makes initialization return early
    // forever and the app displays an endless spinner.
    useEffect(() => {
        if (!isClient || !vaultListQuery.data) return;

        const vaults = vaultListQuery.data.vaults;
        if (vaults.length === 0) {
            return;
        }

        const activeVaultIsAccessible = vaults.some((vault) => vault.id === activeVault?.id);
        if (!activeVaultIsAccessible) {
            setActiveVault({ id: vaults[0].id });
        }
    }, [isClient, activeVault?.id, setActiveVault, vaultListQuery.data]);

    // Initialize SyncManager when we have vault info
    useEffect(() => {
        if (!isClient || !vaultId || !encryptedVaultKey || !pubkeyHash) return;
        const initializingVaultId = vaultId;
        const initializingEncryptedVaultKey = encryptedVaultKey;
        const initializingPubkeyHash = pubkeyHash;

        let cancelled = false;
        let effectManager: SyncManager | null = null;
        let effectUndoCoordinator: VaultUndoCoordinator | null = null;
        let unregisterDisconnect: (() => void) | null = null;

        async function initialize() {
            try {
                await initCrypto();
                const session = getSession();
                if (!session) {
                    throw new Error("No session - user must be authenticated");
                }
                if (session.pubkeyHash !== initializingPubkeyHash) {
                    throw new Error("Authenticated identity changed during vault initialization");
                }

                // Decrypt vault key - convert session's base64 secret to Uint8Array
                const encSecretKeyBytes = base64ToPrivateKey(session.encSecretKey);
                const vaultKey = await unwrapKeyFromBase64(
                    initializingEncryptedVaultKey,
                    session.encPublicKey, // Sender was self (own public key)
                    encSecretKeyBytes
                );
                if (cancelled) return;

                // Create LoroDoc
                const doc = new LoroDoc();

                // Create SyncManager
                const manager = createSyncManager({
                    vaultId: initializingVaultId,
                    pubkeyHash: initializingPubkeyHash,
                    vaultKey,
                    doc,
                    trpc: {
                        sync: {
                            getSnapshot: {
                                query: getSnapshot
                            },
                            getUpdates: {
                                query: getUpdates
                            },
                            pushOps: {
                                mutate: pushOps
                            },
                            pushSnapshot: {
                                mutate: pushSnapshot
                            }
                        }
                    },
                    onSyncStateChange: (state) => {
                        setSyncState(state);
                    },
                    onError: (error) => {
                        console.error("SyncManager error:", error);
                    }
                });

                effectManager = manager;
                syncManagerRef.current = manager;
                unregisterDisconnect = registerDisconnect?.(() => manager.disconnect()) ?? null;

                // Load durable state, repair it under system origin, and flush before first read.
                await hydrateAndRepairVaultDocument(doc, manager);

                // A member who just accepted an invite has no seeded Person (the
                // owner's is seeded at vault creation). Materialize it once, the
                // first time the shared vault opens after acceptance (HS-012).
                // Gating on the acceptance marker keeps ordinary re-opens from
                // emitting a redundant synced vault_ops op. A joining member never
                // adopts the seeded default Person, so adoptDefaultPerson is false.
                if (consumePendingPersonLink(initializingVaultId)) {
                    const linkedChanged = ensureMemberPersonLinked(
                        doc,
                        initializingPubkeyHash,
                        false
                    );
                    if (linkedChanged) {
                        await manager.awaitLocalPersistence();
                        await manager.forceSync();
                    }
                }

                if (cancelled) {
                    await manager.disconnect();
                    return;
                }

                const undoCoordinator = new VaultUndoCoordinator(doc);
                effectUndoCoordinator = undoCoordinator;
                setInitializedVault({
                    vaultId: initializingVaultId,
                    doc,
                    undoCoordinator
                });
                setInitFailure(null);
                setIsConnected(true);

                // Register force sync handler
                registerForceSync(async () => {
                    await manager.forceSync();
                });
            } catch (error) {
                unregisterDisconnect?.();
                unregisterDisconnect = null;
                if (syncManagerRef.current === effectManager) syncManagerRef.current = null;
                effectUndoCoordinator?.dispose();
                effectUndoCoordinator = null;
                await effectManager?.disconnect().catch(() => undefined);
                if (!cancelled) {
                    console.error("Failed to initialize vault:", error);
                    setInitializedVault(null);
                    setInitFailure({
                        vaultId: initializingVaultId,
                        message:
                            error instanceof Error ? error.message : "Failed to initialize vault"
                    });
                }
            }
        }

        void initialize();

        return () => {
            cancelled = true;
            unregisterDisconnect?.();
            unregisterDisconnect = null;
            if (effectManager && syncManagerRef.current === effectManager) {
                syncManagerRef.current = null;
            }
            effectUndoCoordinator?.dispose();
            effectUndoCoordinator = null;
            void effectManager?.disconnect();
            setIsConnected(false);
        };
    }, [
        isClient,
        vaultId,
        encryptedVaultKey,
        pubkeyHash,
        getSnapshot,
        getUpdates,
        pushOps,
        pushSnapshot,
        setSyncState,
        setIsConnected,
        registerForceSync,
        registerDisconnect
    ]);

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

    const initError = initFailure?.vaultId === activeVault.id ? initFailure.message : null;

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
    const activeInitializedVault =
        initializedVault?.vaultId === activeVault.id ? initializedVault : null;
    if (!activeInitializedVault) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    return (
        <BaseVaultProvider
            doc={activeInitializedVault.doc}
            initialState={getDefaultVaultState()}
            debug={process.env.NODE_ENV === "development"}
        >
            <VaultUndoProvider coordinator={activeInitializedVault.undoCoordinator}>
                {children}
            </VaultUndoProvider>
        </BaseVaultProvider>
    );
}
