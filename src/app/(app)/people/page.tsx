"use client";

/**
 * People Page
 *
 * Main people view for managing vault members, invite links,
 * and settlement balances.
 */

import { PeopleTable } from "@/components/features/people";
import { useActiveVault } from "@/hooks/use-active-vault";

/**
 * People page component.
 *
 * Membership and invites are managed in Vault Settings; this page manages only
 * the vault's encrypted people/financial state.
 */
export default function PeoplePage() {
    const { activeVault } = useActiveVault();

    return (
        <div className="flex h-full flex-col">
            {/* Page header */}
            <div className="border-b px-6 py-4">
                <h1 className="text-2xl font-semibold">People</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Manage household members, invite collaborators, and track settlement balances.
                </p>
            </div>

            {/* People table */}
            <div className="flex-1 overflow-auto p-6">
                {activeVault?.id ? (
                    <PeopleTable />
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
