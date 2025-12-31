/**
 * useSyncStatus Hook
 *
 * Exposes sync state from the SyncManager to React components.
 * Provides:
 * - Current sync state (idle, saving, syncing, error)
 * - Whether there are unsaved changes
 * - Functions to trigger sync operations
 *
 * Uses a context-based approach so all components share the same state.
 */

"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SyncState } from "@/lib/sync";
import { hasUnpushedOps } from "@/lib/sync/persistence";

/**
 * Sync status exposed by the hook.
 */
export interface SyncStatus {
	/** Current sync state */
	state: SyncState;
	/** Whether there are local changes not yet pushed to server */
	hasUnsavedChanges: boolean;
	/** Whether the sync manager is initialized and connected */
	isConnected: boolean;
	/** Force a sync with the server */
	forceSync: () => Promise<void>;
}

/**
 * Internal context value including setters for the provider.
 */
export interface SyncStatusContextValue extends SyncStatus {
	/** Update sync state (for provider use) */
	setSyncState: (state: SyncState) => void;
	/** Update unsaved changes flag (for provider use) */
	setHasUnsavedChanges: (hasChanges: boolean) => void;
	/** Update connection status (for provider use) */
	setIsConnected: (connected: boolean) => void;
	/** Register force sync handler (for provider use) */
	registerForceSync: (handler: () => Promise<void>) => void;
}

const defaultForceSync = async () => {
	console.warn("useSyncStatus: No SyncManager connected");
};

const defaultContextValue: SyncStatusContextValue = {
	state: "idle",
	hasUnsavedChanges: false,
	isConnected: false,
	forceSync: defaultForceSync,
	setSyncState: () => {},
	setHasUnsavedChanges: () => {},
	setIsConnected: () => {},
	registerForceSync: () => {},
};

const SyncStatusContext = createContext<SyncStatusContextValue>(defaultContextValue);

/**
 * Provider component for sync status.
 * Should be placed inside VaultProvider to have access to the active vault.
 */
export function SyncStatusProvider({ children }: { children: React.ReactNode }) {
	const [state, setSyncState] = useState<SyncState>("idle");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const forceSyncRef = useRef<() => Promise<void>>(defaultForceSync);

	const registerForceSync = useCallback((handler: () => Promise<void>) => {
		forceSyncRef.current = handler;
	}, []);

	const forceSync = useCallback(async () => {
		await forceSyncRef.current();
	}, []);

	const value: SyncStatusContextValue = {
		state,
		hasUnsavedChanges,
		isConnected,
		forceSync,
		setSyncState,
		setHasUnsavedChanges,
		setIsConnected,
		registerForceSync,
	};

	return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>;
}

/**
 * Hook to access sync status.
 */
export function useSyncStatus(): SyncStatus {
	const context = useContext(SyncStatusContext);
	return {
		state: context.state,
		hasUnsavedChanges: context.hasUnsavedChanges,
		isConnected: context.isConnected,
		forceSync: context.forceSync,
	};
}

/**
 * Hook for the provider to connect sync state management.
 * Used by VaultProvider or SyncProvider to wire up SyncManager.
 */
export function useSyncStatusManager(): SyncStatusContextValue {
	return useContext(SyncStatusContext);
}

/**
 * Hook to poll for unsaved changes.
 * Useful for standalone usage without full SyncManager integration.
 *
 * @param vaultId - The vault ID to check for unsaved changes
 * @param pollInterval - How often to check (default: 1000ms)
 */
export function usePollUnsavedChanges(vaultId: string | null, pollInterval = 1000) {
	const [hasUnsaved, setHasUnsaved] = useState(false);

	useEffect(() => {
		if (!vaultId) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state on vault change
			setHasUnsaved(false);
			return;
		}

		// Check immediately
		hasUnpushedOps(vaultId).then(setHasUnsaved);

		// Poll periodically
		const interval = setInterval(async () => {
			try {
				const unpushed = await hasUnpushedOps(vaultId);
				setHasUnsaved(unpushed);
			} catch {
				// Ignore errors during polling
			}
		}, pollInterval);

		return () => clearInterval(interval);
	}, [vaultId, pollInterval]);

	return hasUnsaved;
}
