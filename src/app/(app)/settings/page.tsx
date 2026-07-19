"use client";

/**
 * Vault Settings Page
 *
 * Allows users to configure vault-level preferences such as default currency.
 * This page is the default landing page for newly created vaults.
 */

import { VaultSettingsForm } from "@/components/features/vault/VaultSettingsForm";

export default function SettingsPage() {
    return (
        <div className="flex h-full flex-col">
            {/* Page header */}
            <div className="border-b px-6 py-4">
                <h1 className="text-2xl font-semibold">Vault Settings</h1>
                <p className="text-muted-foreground mt-1 text-sm">
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
