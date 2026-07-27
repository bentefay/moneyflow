/**
 * Vault Settings Page
 *
 * Allows users to configure vault-level preferences such as default currency.
 * This page is the default landing page for newly created vaults.
 */

import { PasskeyManager } from "@/components/features/identity";
import { AccessMembersSection } from "@/components/features/vault/AccessMembersSection";
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
            <div className="flex-1 space-y-8 overflow-auto p-6">
                <VaultSettingsForm />
                {/* Members and invites are authoritative here (D-013); the People page holds
                    only encrypted financial state. */}
                <AccessMembersSection />
                {/* Passkeys belong to the identity rather than the vault, but this is the only
                    authenticated settings surface a returning user can reach today. */}
                <PasskeyManager />
            </div>
        </div>
    );
}
