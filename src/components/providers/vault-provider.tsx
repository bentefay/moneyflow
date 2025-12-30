"use client";

/**
 * Vault Provider
 *
 * Wraps the app with the CRDT vault context, initializing the LoroDoc
 * and providing state management to all children.
 *
 * The provider initializes with default vault state including:
 * - Default statuses ("For Review", "Paid")
 * - Empty collections for all entities
 * - Default preferences
 */

import { LoroDoc } from "loro-crdt";
import { useEffect, useMemo, useState } from "react";
import { VaultProvider as BaseVaultProvider } from "@/lib/crdt/context";
import { getDefaultVaultState } from "@/lib/crdt/defaults";

interface VaultProviderProps {
	children: React.ReactNode;
}

/**
 * Provider component that initializes the vault LoroDoc and provides
 * CRDT state management to the app.
 */
export function VaultProvider({ children }: VaultProviderProps) {
	// Track client-side hydration
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// Create LoroDoc instance - stable across renders
	const doc = useMemo(() => {
		if (typeof window === "undefined") return null;
		return new LoroDoc();
	}, []);

	// Loading state during SSR or while initializing
	if (!isClient || !doc) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<BaseVaultProvider
			doc={doc}
			initialState={getDefaultVaultState()}
			debug={process.env.NODE_ENV === "development"}
		>
			{children}
		</BaseVaultProvider>
	);
}
