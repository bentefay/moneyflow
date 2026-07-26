"use client";

/**
 * Automations Page
 *
 * Page for managing transaction automation rules.
 */

import { FieldRulesManager } from "@/components/features/automations";
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
                    Create rules that set a transaction field for an exact description, optionally
                    narrowed by account and amount.
                </p>
            </div>

            {/* Field-rule manager */}
            <div className="flex-1 overflow-auto p-6">
                {activeVault?.id ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Automation Rules</CardTitle>
                            <CardDescription>
                                Each rule sets one field for transactions whose description matches
                                exactly. More specific rules (account and amount) take precedence.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FieldRulesManager />
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
