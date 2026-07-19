"use client";

/**
 * Automations Page
 *
 * Page for managing transaction automation rules.
 */

import { AutomationsTable } from "@/components/features/automations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveVault } from "@/hooks/use-active-vault";

/**
 * Automations management page component.
 */
export default function AutomationsPage() {
    const { activeVault } = useActiveVault();

    return (
        <div className="flex h-full flex-col">
            {/* Page header */}
            <div className="border-b px-6 py-4">
                <h1 className="text-2xl font-semibold">Automations</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Create rules to automatically categorize and tag transactions based on patterns.
                </p>
            </div>

            {/* Automations table */}
            <div className="flex-1 overflow-auto p-6">
                {activeVault?.id ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Automation Rules</CardTitle>
                            <CardDescription>
                                Rules are applied in order from top to bottom. Drag to reorder.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AutomationsTable />
                        </CardContent>
                    </Card>
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
