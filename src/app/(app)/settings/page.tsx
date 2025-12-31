"use client";

/**
 * Vault Settings Page
 *
 * Allows users to configure vault-level preferences such as default currency.
 * This page is the default landing page for newly created vaults.
 */

import { VaultSettingsForm } from "@/components/features/vault/VaultSettingsForm";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";
import { useVaultPresence } from "@/hooks/use-vault-presence";

export default function SettingsPage() {
	// Vault & identity for presence
	const { activeVault } = useActiveVault();
	const { pubkeyHash } = useIdentity();

	// Presence (only active when vault & identity are available)
	useVaultPresence(activeVault?.id ?? null, pubkeyHash ?? null);

	return (
		<div className="flex h-full flex-col">
			{/* Page header */}
			<div className="border-b px-6 py-4">
				<h1 className="font-semibold text-2xl">Vault Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Configure preferences for this vault. Changes are saved automatically.
				</p>
			</div>

			{/* Settings form */}
			<div className="flex-1 overflow-auto p-6">
				<VaultSettingsForm />
			</div>
		</div>
	);
}
