"use client";

/**
 * VaultSettingsForm Component
 *
 * Form for editing vault-level preferences. Currently supports:
 * - Default currency selection for new accounts
 *
 * Settings are persisted immediately to the vault's CRDT state via loro-mirror.
 */

import { useActiveVault } from "@/hooks/use-active-vault";
import { useVaultAction, useVaultPreferences } from "@/lib/crdt/context";
import { CurrencySelector } from "./CurrencySelector";

export interface VaultSettingsFormProps {
	/** Additional CSS classes */
	className?: string;
}

/**
 * Form component for vault settings.
 * Changes are automatically persisted to the vault's CRDT document.
 */
export function VaultSettingsForm({ className }: VaultSettingsFormProps) {
	const { activeVault } = useActiveVault();
	const preferences = useVaultPreferences();
	const defaultCurrency = preferences?.defaultCurrency ?? "USD";

	// Create mutation action for updating default currency
	const setDefaultCurrency = useVaultAction((state, currency: string) => {
		state.preferences.defaultCurrency = currency;
	});

	return (
		<div className={className}>
			<div className="max-w-md space-y-8">
				{/* Vault Info Section */}
				<section>
					<h2 className="mb-4 font-medium text-lg">Vault Information</h2>
					<div className="space-y-4">
						<div>
							<label className="font-medium text-sm">Vault Name</label>
							<p className="mt-1 text-muted-foreground text-sm">
								{activeVault?.name ?? "My Vault"}
							</p>
						</div>
					</div>
				</section>

				{/* Currency Settings Section */}
				<section>
					<h2 className="mb-4 font-medium text-lg">Currency Settings</h2>
					<div className="space-y-4">
						<div>
							<label htmlFor="default-currency" className="font-medium text-sm">
								Default Currency
							</label>
							<p className="mt-1 mb-2 text-muted-foreground text-sm">
								New accounts will use this currency by default. Existing accounts are not affected.
							</p>
							<CurrencySelector
								value={defaultCurrency}
								onChange={setDefaultCurrency}
								className="max-w-xs"
							/>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
