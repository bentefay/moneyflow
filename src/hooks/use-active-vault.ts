"use client";

/**
 * Active Vault Hook
 *
 * Manages the currently selected vault with localStorage persistence.
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "moneyflow_active_vault";

export interface ActiveVault {
  id: string;
  name?: string;
}

/**
 * Hook to manage the active vault selection.
 */
export function useActiveVault() {
  const [activeVault, setActiveVaultState] = useState<ActiveVault | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ActiveVault;
        setActiveVaultState(parsed);
      }
    } catch (error) {
      console.error("Failed to load active vault from storage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set active vault and persist to localStorage
  const setActiveVault = useCallback((vault: ActiveVault | null) => {
    setActiveVaultState(vault);
    try {
      if (vault) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to persist active vault:", error);
    }
  }, []);

  // Clear active vault
  const clearActiveVault = useCallback(() => {
    setActiveVault(null);
  }, [setActiveVault]);

  return {
    /** The currently active vault */
    activeVault,
    /** Whether the vault is still loading from storage */
    isLoading,
    /** Set the active vault */
    setActiveVault,
    /** Clear the active vault selection */
    clearActiveVault,
    /** Whether a vault is currently selected */
    hasActiveVault: activeVault !== null,
  };
}
