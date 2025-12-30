"use client";

/**
 * People Page
 *
 * Main people view for managing vault members, invite links,
 * and settlement balances.
 */

import { useMemo } from "react";
import { PeopleTable } from "@/components/features/people";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";
import { useVaultPresence } from "@/hooks/use-vault-presence";
import { getSessionEncSecretKey } from "@/lib/crypto/session";

/**
 * People page component.
 */
export default function PeoplePage() {
	// Vault & identity for presence
	const { activeVault } = useActiveVault();
	const { pubkeyHash } = useIdentity();

	// Presence (only active when vault & identity are available)
	useVaultPresence(activeVault?.id ?? null, pubkeyHash ?? null);

	// Get encryption secret key for invite generation
	const encSecretKey = useMemo(() => {
		const keyBase64 = getSessionEncSecretKey();
		if (!keyBase64) return undefined;
		try {
			return Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
		} catch {
			return undefined;
		}
	}, []);

	// TODO: These values should come from vault membership data
	// For now, we don't have the vault key or ownership info
	const isOwner = false;
	const vaultKey: Uint8Array | undefined = undefined;

	return (
		<div className="flex h-full flex-col">
			{/* Page header */}
			<div className="border-b px-6 py-4">
				<h1 className="font-semibold text-2xl">People</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage household members, invite collaborators, and track settlement balances.
				</p>
			</div>

			{/* People table */}
			<div className="flex-1 overflow-auto p-6">
				{activeVault?.id ? (
					<PeopleTable
						vaultId={activeVault.id}
						vaultKey={vaultKey}
						encSecretKey={encSecretKey}
						isOwner={isOwner}
					/>
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-muted-foreground">
							No vault selected. Select or create a vault first.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
