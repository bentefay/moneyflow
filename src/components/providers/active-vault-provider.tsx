"use client";

/**
 * Active Vault Provider
 *
 * Manages the currently selected vault in React context, with localStorage
 * persistence for session recovery. This replaces the old useActiveVault hook
 * that caused race conditions by reading from localStorage on every mount.
 *
 * Architecture:
 * - Active vault ID is held in React state (memory)
 * - On mount, we read from localStorage to recover the session
 * - When vault changes, we persist to localStorage and clear old vault data
 * - Components use useActiveVaultContext() instead of the old hook
 */

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

// ============================================================================
// Constants
// ============================================================================

const ACTIVE_VAULT_STORAGE_KEY = "moneyflow_active_vault";

// ============================================================================
// Types
// ============================================================================

export interface ActiveVault {
	id: string;
	name?: string;
}

interface ActiveVaultContextValue {
	/** The currently active vault */
	activeVault: ActiveVault | null;
	/** Whether we're still loading from localStorage */
	isLoading: boolean;
	/** Set the active vault (persists to localStorage) */
	setActiveVault: (vault: ActiveVault | null) => void;
	/** Clear the active vault */
	clearActiveVault: () => void;
	/** Whether a vault is currently selected */
	hasActiveVault: boolean;
}

// ============================================================================
// Context
// ============================================================================

const ActiveVaultContext = createContext<ActiveVaultContextValue | null>(null);

// ============================================================================
// Storage Helper (for use outside React)
// ============================================================================

/**
 * Get the active vault from localStorage synchronously.
 * Safe to call during component initialization.
 */
function getActiveVaultFromStorage(): ActiveVault | null {
	if (typeof window === "undefined" || typeof localStorage === "undefined") {
		return null;
	}

	try {
		const stored = localStorage.getItem(ACTIVE_VAULT_STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored) as ActiveVault;
		}
	} catch (error) {
		console.error("Failed to read active vault from storage:", error);
	}

	return null;
}

// ============================================================================
// Provider
// ============================================================================

interface ActiveVaultProviderProps {
	children: ReactNode;
	/** Initial vault to set (e.g., from server-side props) */
	initialVault?: ActiveVault | null;
}

export function ActiveVaultProvider({ children, initialVault }: ActiveVaultProviderProps) {
	// Read from localStorage synchronously on first render (client-side only)
	// This avoids the flash of "no vault selected" on navigation
	const [activeVault, setActiveVaultState] = useState<ActiveVault | null>(() => {
		if (initialVault) return initialVault;
		return getActiveVaultFromStorage();
	});
	const [isLoading, setIsLoading] = useState(false); // No longer needed with sync init

	// Set active vault and persist to localStorage
	const setActiveVault = useCallback((vault: ActiveVault | null) => {
		setActiveVaultState(vault);

		try {
			if (vault) {
				localStorage.setItem(ACTIVE_VAULT_STORAGE_KEY, JSON.stringify(vault));
			} else {
				localStorage.removeItem(ACTIVE_VAULT_STORAGE_KEY);
			}
		} catch (error) {
			console.error("Failed to persist active vault:", error);
		}
	}, []);

	// Clear active vault
	const clearActiveVault = useCallback(() => {
		setActiveVault(null);
	}, [setActiveVault]);

	const value: ActiveVaultContextValue = {
		activeVault,
		isLoading,
		setActiveVault,
		clearActiveVault,
		hasActiveVault: activeVault !== null,
	};

	return <ActiveVaultContext.Provider value={value}>{children}</ActiveVaultContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Use the active vault context.
 * Must be used within an ActiveVaultProvider.
 */
export function useActiveVaultContext(): ActiveVaultContextValue {
	const context = useContext(ActiveVaultContext);
	if (!context) {
		throw new Error("useActiveVaultContext must be used within an ActiveVaultProvider");
	}
	return context;
}

// ============================================================================
// Storage Helper (for use outside React)
// ============================================================================

/**
 * Set the active vault in localStorage.
 * Use this from non-React code (e.g., identity registration flow).
 * React components should use useActiveVaultContext().setActiveVault() instead.
 */
export function setActiveVaultStorage(vault: { id: string; name?: string } | null): void {
	if (typeof window === "undefined" || typeof localStorage === "undefined") {
		return;
	}

	try {
		if (vault) {
			localStorage.setItem(ACTIVE_VAULT_STORAGE_KEY, JSON.stringify(vault));
		} else {
			localStorage.removeItem(ACTIVE_VAULT_STORAGE_KEY);
		}
	} catch (error) {
		console.error("Failed to persist active vault:", error);
	}
}

/**
 * Get the active vault from localStorage.
 * Use this from non-React code to read the current vault.
 */
export function getActiveVaultStorage(): ActiveVault | null {
	if (typeof window === "undefined" || typeof localStorage === "undefined") {
		return null;
	}

	try {
		const stored = localStorage.getItem(ACTIVE_VAULT_STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored) as ActiveVault;
		}
	} catch (error) {
		console.error("Failed to read active vault from storage:", error);
	}

	return null;
}
