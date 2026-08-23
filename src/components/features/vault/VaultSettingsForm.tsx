"use client";

/**
 * VaultSettingsForm Component
 *
 * Form for editing settings shown on the settings page. Currently supports:
 * - Vault name
 * - Default currency selection for new accounts
 * - Date presentation, which is per-viewer rather than vault-wide
 *
 * Settings are persisted immediately to the vault's CRDT state via loro-mirror.
 */

import { useDateFormatPreference } from "@/components/providers/date-locale-provider";
import { Input } from "@/components/ui/input";
import { usePubkeyHash } from "@/hooks/use-identity";
import {
    usePersistDateFormat,
    useVaultAction,
    useVaultEditAction,
    useVaultPreferences
} from "@/lib/crdt/context";
import { DEFAULT_CURRENCY, DEFAULT_VAULT_NAME } from "@/lib/crdt/defaults";
import { type DateFormatPreference } from "@/lib/domain/date-format-preference";

import { CurrencySelector } from "./CurrencySelector";
import { DateFormatSelector } from "./DateFormatSelector";

export interface VaultSettingsFormProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Form component for vault settings.
 * Changes are automatically persisted to the vault's CRDT document.
 */
export function VaultSettingsForm({ className }: VaultSettingsFormProps) {
    const preferences = useVaultPreferences();
    const vaultName = preferences?.name ?? DEFAULT_VAULT_NAME;
    const defaultCurrency = preferences?.defaultCurrency ?? DEFAULT_CURRENCY;

    // Create mutation action for updating vault name
    const vaultNameEdit = useVaultEditAction((state, name: string) => {
        state.preferences.name = name;
    });

    // Create mutation action for updating default currency
    const setDefaultCurrency = useVaultAction((state, currency: string) => {
        state.preferences.defaultCurrency = currency;
    });

    // Date presentation is stored against the viewer, not the vault, so members in different
    // countries each read dates their own way.
    const pubkeyHash = usePubkeyHash();
    const dateFormat = useDateFormatPreference();
    const persistDateFormat = usePersistDateFormat();
    const setDateFormat = (preference: DateFormatPreference) => {
        if (pubkeyHash == null) return;
        persistDateFormat({ pubkeyHash, dateFormat: preference });
    };

    return (
        <div className={className}>
            <div className="max-w-md space-y-8">
                {/* Vault Info Section */}
                <section>
                    <h2 className="mb-4 text-lg font-medium">Vault Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="vault-name" className="text-sm font-medium">
                                Vault Name
                            </label>
                            <p className="text-muted-foreground mt-1 mb-2 text-sm">
                                A friendly name to identify this vault.
                            </p>
                            <Input
                                id="vault-name"
                                value={vaultName}
                                onFocus={vaultNameEdit.begin}
                                onChange={(e) => vaultNameEdit.update(e.target.value)}
                                onBlur={vaultNameEdit.commit}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        vaultNameEdit.commit();
                                        event.currentTarget.blur();
                                    } else if (event.key === "Escape") {
                                        vaultNameEdit.cancel();
                                        event.currentTarget.blur();
                                    }
                                }}
                                placeholder="My Vault"
                                className="max-w-xs"
                            />
                        </div>
                    </div>
                </section>

                {/* Currency Settings Section */}
                <section>
                    <h2 className="mb-4 text-lg font-medium">Currency Settings</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="default-currency" className="text-sm font-medium">
                                Default Currency
                            </label>
                            <p className="text-muted-foreground mt-1 mb-2 text-sm">
                                New accounts will use this currency by default. Existing accounts
                                are not affected.
                            </p>
                            <CurrencySelector
                                value={defaultCurrency}
                                onChange={setDefaultCurrency}
                                className="max-w-xs"
                            />
                        </div>
                    </div>
                </section>

                {/* Date Format Section */}
                <section>
                    <h2 className="mb-4 text-lg font-medium">Date Format</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="date-format" className="text-sm font-medium">
                                Date Format
                            </label>
                            <p className="text-muted-foreground mt-1 mb-2 text-sm">
                                How dates are shown and typed throughout the app. Automatic follows
                                your browser, which reports its language rather than your region and
                                so can be wrong. This choice is yours alone; other members of this
                                vault keep their own.
                            </p>
                            <DateFormatSelector
                                value={dateFormat}
                                onChange={setDateFormat}
                                disabled={pubkeyHash == null}
                                className="max-w-xs"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
