/**
 * useIdentity Hook
 *
 * React hook for managing user identity state.
 * Provides session state, unlock/lock functions, and loading states.
 *
 * Features:
 * - Checks sessionStorage on mount for existing session
 * - Provides functions to create new identity or unlock existing
 * - Handles registration with server
 * - Triggers unlock animation completion callback
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	createIdentity,
	type NewIdentity,
	storeIdentitySession,
	type UnlockedIdentity,
	unlockWithSeed,
} from "@/lib/crypto/identity";
import { clearSession, getSession, hasSession, type SessionData } from "@/lib/crypto/session";
import { trpc } from "@/lib/trpc";
import { ensureDefaultVault, setActiveVaultStorage } from "@/lib/vault";

// ============================================================================
// Types
// ============================================================================

export type IdentityStatus =
	| "loading" // Checking sessionStorage on mount
	| "locked" // No session, user needs to unlock
	| "unlocking" // Unlock in progress
	| "unlocked"; // Session active

export interface IdentityError {
	/** User-friendly error message */
	message: string;

	/** Technical details for debugging */
	details?: string;
}

export interface IdentityState {
	/** Current identity status */
	status: IdentityStatus;

	/** Session data when unlocked, null otherwise */
	session: SessionData | null;

	/** Pubkey hash for the current user (convenience accessor) */
	pubkeyHash: string | null;

	/** Whether this is a new user (just created identity) */
	isNewUser: boolean;

	/** Error info if unlock failed */
	error: IdentityError | null;
}

export interface IdentityActions {
	/**
	 * Generate a new identity (step 1 of new user flow).
	 * Returns the mnemonic that user must write down.
	 * Does NOT register with server or store session.
	 *
	 * Flow:
	 * 1. Generate seed phrase and keys
	 * 2. Return identity for display
	 *
	 * Call registerIdentity() after user confirms they've saved the phrase.
	 */
	generateNew: () => Promise<NewIdentity>;

	/**
	 * Register a generated identity with the server (step 2 of new user flow).
	 * Call this after user confirms they've written down their seed phrase.
	 *
	 * Flow:
	 * 1. Register with server
	 * 2. Store session
	 */
	registerIdentity: (identity: NewIdentity) => Promise<void>;

	/**
	 * Legacy: Create and immediately register a new identity.
	 * @deprecated Use generateNew() + registerIdentity() for proper consent flow.
	 */
	createNew: () => Promise<NewIdentity>;

	/**
	 * Unlock existing identity using seed phrase (returning user flow).
	 *
	 * Flow:
	 * 1. Validate and derive keys from seed
	 * 2. Check if user exists on server
	 * 3. Register if new (shouldn't happen for returning users)
	 * 4. Store session
	 */
	unlock: (mnemonic: string) => Promise<UnlockedIdentity>;

	/**
	 * Lock the identity (logout).
	 * Clears session storage.
	 */
	lock: () => void;

	/**
	 * Clear any error state.
	 */
	clearError: () => void;
}

export interface UseIdentityReturn extends IdentityState, IdentityActions {}

// ============================================================================
// Error Parsing Helper
// ============================================================================

/**
 * Parse an error into a user-friendly format with technical details.
 */
function parseError(err: unknown): IdentityError {
	const rawMessage = err instanceof Error ? err.message : String(err);
	const stack = err instanceof Error ? err.stack : undefined;

	// Connection errors - server returns sanitized message
	if (rawMessage.includes("Unable to connect to database")) {
		return {
			message: "Unable to connect to the database. Please make sure the server is running.",
			details: stack || rawMessage,
		};
	}

	// Generic database errors
	if (rawMessage.includes("Database operation failed")) {
		return {
			message: "A database error occurred. Please try again.",
			details: stack || rawMessage,
		};
	}

	// Generic server errors
	if (rawMessage.includes("500") || rawMessage.includes("Internal Server Error")) {
		return {
			message: "The server encountered an error. Please try again later.",
			details: stack || rawMessage,
		};
	}

	// Default: show the raw message
	return {
		message: rawMessage,
		details: stack,
	};
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useIdentity(): UseIdentityReturn {
	const [status, setStatus] = useState<IdentityStatus>("loading");
	const [session, setSession] = useState<SessionData | null>(null);
	const [isNewUser, setIsNewUser] = useState(false);
	const [error, setError] = useState<IdentityError | null>(null);

	// tRPC mutations for server registration
	const registerMutation = trpc.user.register.useMutation();
	const getOrCreateMutation = trpc.user.getOrCreate.useMutation();

	// tRPC utils for imperative query access
	const utils = trpc.useUtils();

	// tRPC mutations for vault operations (used by ensureDefaultVault)
	const createVaultMutation = trpc.vault.create.useMutation();
	const saveSnapshotMutation = trpc.sync.saveSnapshot.useMutation();

	// -------------------------------------------------------------------------
	// Check existing session on mount
	// -------------------------------------------------------------------------

	useEffect(() => {
		const existingSession = getSession();
		if (existingSession) {
			setSession(existingSession);
			setStatus("unlocked");
		} else {
			setStatus("locked");
		}
	}, []);

	// -------------------------------------------------------------------------
	// Generate new identity (without registration)
	// -------------------------------------------------------------------------

	const generateNew = useCallback(async (): Promise<NewIdentity> => {
		setError(null);

		try {
			// Generate new identity (does NOT store session)
			const identity = await createIdentity();
			return identity;
		} catch (err) {
			setError(parseError(err));
			throw err;
		}
	}, []);

	// -------------------------------------------------------------------------
	// Register identity with server (after user confirms)
	// -------------------------------------------------------------------------

	const registerIdentity = useCallback(
		async (identity: NewIdentity): Promise<void> => {
			setStatus("unlocking");
			setError(null);

			try {
				// Register with server
				const result = await registerMutation.mutateAsync({
					pubkeyHash: identity.pubkeyHash,
				});

				// Store session now that user has confirmed
				storeIdentitySession(identity);

				// Update state
				const newSession = getSession();
				if (!newSession) {
					throw new Error("Session storage failed");
				}

				setSession(newSession);
				setIsNewUser(result.isNew);

				// Ensure user has a default vault (creates one if none exist)
				// This is required for the authenticated app experience.
				const vaultResult = await ensureDefaultVault({
					api: {
						listVaults: () => utils.vault.list.fetch(),
						createVault: (input) => createVaultMutation.mutateAsync(input),
						saveSnapshot: (input) => saveSnapshotMutation.mutateAsync(input),
					},
				});

				// Set the vault as active
				setActiveVaultStorage({ id: vaultResult.vaultId, name: vaultResult.name });

				setStatus("unlocked");
			} catch (err) {
				setStatus("locked");
				setError(parseError(err));
				throw err;
			}
		},
		[registerMutation, utils, createVaultMutation, saveSnapshotMutation]
	);

	// -------------------------------------------------------------------------
	// Create new identity (legacy - generates and registers immediately)
	// -------------------------------------------------------------------------

	const createNew = useCallback(async (): Promise<NewIdentity> => {
		setStatus("unlocking");
		setError(null);

		try {
			// Generate new identity (does NOT store session)
			const identity = await createIdentity();

			// Register with server
			const result = await registerMutation.mutateAsync({
				pubkeyHash: identity.pubkeyHash,
			});

			// Store session
			storeIdentitySession(identity);

			// Update state
			const newSession = getSession();
			if (!newSession) {
				throw new Error("Session storage failed");
			}

			setSession(newSession);
			setIsNewUser(result.isNew);

			// Ensure user has a default vault
			const vaultResult = await ensureDefaultVault({
				api: {
					listVaults: () => utils.vault.list.fetch(),
					createVault: (input) => createVaultMutation.mutateAsync(input),
					saveSnapshot: (input) => saveSnapshotMutation.mutateAsync(input),
				},
			});
			setActiveVaultStorage({ id: vaultResult.vaultId, name: vaultResult.name });

			setStatus("unlocked");

			return identity;
		} catch (err) {
			setStatus("locked");
			setError(parseError(err));
			throw err;
		}
	}, [registerMutation, utils, createVaultMutation, saveSnapshotMutation]);

	// -------------------------------------------------------------------------
	// Unlock with existing seed phrase
	// -------------------------------------------------------------------------

	const unlock = useCallback(
		async (mnemonic: string): Promise<UnlockedIdentity> => {
			setStatus("unlocking");
			setError(null);

			try {
				// Derive keys from seed (stores session automatically)
				const identity = await unlockWithSeed(mnemonic);

				// Get or create user on server
				const result = await getOrCreateMutation.mutateAsync({
					pubkeyHash: identity.pubkeyHash,
				});

				// Update state
				const newSession = getSession();
				if (!newSession) {
					throw new Error("Session storage failed");
				}

				setSession(newSession);
				setIsNewUser(result.isNew);

				// Ensure user has a default vault (edge case: returning user with no vaults)
				const vaultResult = await ensureDefaultVault({
					api: {
						listVaults: () => utils.vault.list.fetch(),
						createVault: (input) => createVaultMutation.mutateAsync(input),
						saveSnapshot: (input) => saveSnapshotMutation.mutateAsync(input),
					},
				});

				// Set the vault as active
				setActiveVaultStorage({ id: vaultResult.vaultId, name: vaultResult.name });
				if (vaultResult.created) {
					console.log(`Created default vault for returning user: ${vaultResult.vaultId}`);
				}

				setStatus("unlocked");

				return identity;
			} catch (err) {
				setStatus("locked");
				setError(parseError(err));
				throw err;
			}
		},
		[getOrCreateMutation, utils, createVaultMutation, saveSnapshotMutation]
	);

	// -------------------------------------------------------------------------
	// Lock (logout)
	// -------------------------------------------------------------------------

	const lock = useCallback(() => {
		clearSession();
		setSession(null);
		setIsNewUser(false);
		setStatus("locked");
		setError(null);
	}, []);

	// -------------------------------------------------------------------------
	// Clear error
	// -------------------------------------------------------------------------

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// -------------------------------------------------------------------------
	// Derived values
	// -------------------------------------------------------------------------

	const pubkeyHash = useMemo(() => session?.pubkeyHash ?? null, [session]);

	// -------------------------------------------------------------------------
	// Return
	// -------------------------------------------------------------------------

	return {
		status,
		session,
		pubkeyHash,
		isNewUser,
		error,
		generateNew,
		registerIdentity,
		createNew,
		unlock,
		lock,
		clearError,
	};
}

// ============================================================================
// Convenience hooks
// ============================================================================

/**
 * Simple hook to check if user is authenticated.
 * Useful for conditionally showing UI.
 */
export function useIsAuthenticated(): boolean {
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration pattern
		setIsAuthenticated(hasSession());
	}, []);

	return isAuthenticated;
}

/**
 * Hook to get just the pubkeyHash.
 * Returns null if not authenticated.
 */
export function usePubkeyHash(): string | null {
	const [pubkeyHash, setPubkeyHash] = useState<string | null>(null);

	useEffect(() => {
		const session = getSession();
		// eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration pattern
		setPubkeyHash(session?.pubkeyHash ?? null);
	}, []);

	return pubkeyHash;
}
