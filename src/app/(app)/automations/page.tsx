"use client";

/**
 * Automations Page
 *
 * Page for managing transaction automation rules.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationsTable } from "@/components/features/automations";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";
import { useVaultPresence } from "@/hooks/use-vault-presence";

/**
 * Automations management page component.
 */
export default function AutomationsPage() {
  // Vault & identity for presence
  const { activeVault } = useActiveVault();
  const { pubkeyHash } = useIdentity();

  // Presence (only active when vault & identity are available)
  useVaultPresence(activeVault?.id ?? null, pubkeyHash ?? null);

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
