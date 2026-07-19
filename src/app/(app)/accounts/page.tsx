"use client";

/**
 * Accounts Page
 *
 * Main accounts view with inline editing, ownership management,
 * and real-time collaborative sync.
 */

import { AccountsTable } from "@/components/features/accounts";

/**
 * Accounts page component.
 */
export default function AccountsPage() {
    return (
        <div className="flex h-full flex-col">
            {/* Page header */}
            <div className="border-b px-6 py-4">
                <h1 className="text-2xl font-semibold">Accounts</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Manage your financial accounts and ownership percentages.
                </p>
            </div>

            {/* Accounts table */}
            <div className="flex-1 overflow-auto">
                <AccountsTable />
            </div>
        </div>
    );
}
