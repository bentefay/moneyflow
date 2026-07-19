"use client";

/**
 * Tx Descriptions Page
 *
 * Main view for managing description aliases.
 * Aliases replace raw imported transaction descriptions with curated names.
 */

import { DescriptionAliasesTable } from "@/components/features/description-aliases/DescriptionAliasesTable";
import { useActiveVault } from "@/hooks/use-active-vault";

/**
 * Tx Descriptions page component.
 */
export default function TxDescriptionsPage() {
    const { activeVault } = useActiveVault();

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
