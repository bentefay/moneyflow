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

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSession, hasSession, clearSession, type SessionData } from "@/lib/crypto/session";
import {
  createIdentity,
  unlockWithSeed,
  type NewIdentity,
  type UnlockedIdentity,
} from "@/lib/crypto/identity";
import { trpc } from "@/lib/trpc";

// ============================================================================
// Types
// ============================================================================

export type IdentityStatus =
  | "loading" // Checking sessionStorage on mount
  | "locked" // No session, user needs to unlock
  | "unlocking" // Unlock in progress
  | "unlocked"; // Session active

export interface IdentityState {
  /** Current identity status */
  status: IdentityStatus;

  /** Session data when unlocked, null otherwise */
  session: SessionData | null;

  /** Pubkey hash for the current user (convenience accessor) */
  pubkeyHash: string | null;

  /** Whether this is a new user (just created identity) */
  isNewUser: boolean;

  /** Error message if unlock failed */
  error: string | null;
}

export interface IdentityActions {
  /**
   * Create a new identity (new user flow).
   * Returns the mnemonic that user must write down.
   *
   * Flow:
   * 1. Generate seed phrase and keys
   * 2. Register with server
   * 3. Store session
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
// Hook Implementation
// ============================================================================

export function useIdentity(): UseIdentityReturn {
  const [status, setStatus] = useState<IdentityStatus>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tRPC mutations for server registration
  const registerMutation = trpc.user.register.useMutation();
  const getOrCreateMutation = trpc.user.getOrCreate.useMutation();

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
  // Create new identity
  // -------------------------------------------------------------------------

  const createNew = useCallback(async (): Promise<NewIdentity> => {
    setStatus("unlocking");
    setError(null);

    try {
      // Generate new identity (stores session automatically)
      const identity = await createIdentity();

      // Register with server
      const result = await registerMutation.mutateAsync({
        pubkeyHash: identity.pubkeyHash,
      });

      // Update state
      const newSession = getSession();
      if (!newSession) {
        throw new Error("Session storage failed");
      }

      setSession(newSession);
      setIsNewUser(result.isNew);
      setStatus("unlocked");

      return identity;
    } catch (err) {
      setStatus("locked");
      const message = err instanceof Error ? err.message : "Failed to create identity";
      setError(message);
      throw err;
    }
  }, [registerMutation]);

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
        setStatus("unlocked");

        return identity;
      } catch (err) {
        setStatus("locked");
        const message = err instanceof Error ? err.message : "Invalid recovery phrase";
        setError(message);
        throw err;
      }
    },
    [getOrCreateMutation]
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
    setPubkeyHash(session?.pubkeyHash ?? null);
  }, []);

  return pubkeyHash;
}
