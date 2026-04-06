"use client";

/**
 * Tx Descriptions Page
 *
 * Main view for managing description aliases.
 * Aliases replace raw imported transaction descriptions with curated names.
 */

import { DescriptionAliasesTable } from "@/components/features/description-aliases/DescriptionAliasesTable";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";
import { useVaultPresence } from "@/hooks/use-vault-presence";

/**
 * Tx Descriptions page component.
 */
export default function TxDescriptionsPage() {
    // Vault & identity for presence
    const { activeVault } = useActiveVault();
    const { pubkeyHash } = useIdentity();

    // Presence (only active when vault & identity are available)
    useVaultPresence(activeVault?.id ?? null, pubkeyHash ?? null);

    return (
        <div className="flex h-full flex-col">
            {/* Page header */}
            <div className="border-b px-6 py-4">
                <h1 className="text-2xl font-semibold">Tx Descriptions</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Manage description aliases that replace raw imported transaction descriptions
                    with curated names.
                </p>
            </div>

            {/* Aliases table */}
            <div className="flex-1 overflow-auto p-6">
                {activeVault?.id ? (
                    <DescriptionAliasesTable />
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
