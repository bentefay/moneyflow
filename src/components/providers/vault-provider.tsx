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
import { VaultProvider as BaseVaultProvider, useVaultPreferences } from "@/lib/crdt/context";
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
 * Component that syncs the vault name from CRDT preferences to the activeVault context.
 * This ensures the header vault selector stays in sync when the name is edited.
 */
function VaultNameSync({ children }: { children: React.ReactNode }) {
	const preferences = useVaultPreferences();
	const { activeVault, setActiveVault } = useActiveVault();

	// Sync vault name from CRDT to activeVault context
	useEffect(() => {
		const crdtName = preferences?.name;
		if (crdtName && activeVault && crdtName !== activeVault.name) {
			setActiveVault({ ...activeVault, name: crdtName });
		}
	}, [preferences?.name, activeVault, setActiveVault]);

	return <>{children}</>;
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
	const { activeVault } = useActiveVault();

	// Get sync status context for updating state
	const syncStatusContext = useSyncStatusManager();

	// Fetch vault list to get encrypted keys
	const vaultListQuery = trpc.vault.list.useQuery(undefined, {
		enabled: !!activeVault?.id,
	});

	// Create stable LoroDoc instance
	const docRef = useRef<LoroDoc | null>(null);
	const syncManagerRef = useRef<SyncManager | null>(null);

	// Get tRPC utils for sync manager
	const trpcUtils = trpc.useUtils();

	// Initialize on client side
	useEffect(() => {
		setIsClient(true);
	}, []);

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
								query: (input) => trpcUtils.sync.getSnapshot.fetch(input),
							},
							getUpdates: {
								query: (input) => trpcUtils.sync.getUpdates.fetch(input),
							},
							pushOps: {
								mutate: (input) => trpcUtils.client.sync.pushOps.mutate(input),
							},
							pushSnapshot: {
								mutate: (input) => trpcUtils.client.sync.pushSnapshot.mutate(input),
							},
						},
					},
					onSyncStateChange: (state) => {
						syncStatusContext.setSyncState(state);
					},
					onError: (error) => {
						console.error("SyncManager error:", error);
					},
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
					setInitError(error instanceof Error ? error.message : "Failed to initialize vault");
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
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	// No vault selected
	if (!activeVault?.id) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">No vault selected</p>
			</div>
		);
	}

	// Loading vault data
	if (vaultListQuery.isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<BaseVaultProvider
			doc={docRef.current}
			initialState={getDefaultVaultState()}
			debug={process.env.NODE_ENV === "development"}
		>
			<VaultNameSync>{children}</VaultNameSync>
		</BaseVaultProvider>
	);
}
