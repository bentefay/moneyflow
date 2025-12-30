"use client";

/**
 * Statuses Page
 *
 * Page for managing transaction statuses and their behaviors.
 */

import { StatusesTable } from "@/components/features/statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";
import { useVaultPresence } from "@/hooks/use-vault-presence";

/**
 * Statuses management page component.
 */
export default function StatusesPage() {
	// Vault & identity for presence
	const { activeVault } = useActiveVault();
	const { pubkeyHash } = useIdentity();

	// Presence (only active when vault & identity are available)
	useVaultPresence(activeVault?.id ?? null, pubkeyHash ?? null);

	return (
		<div className="flex h-full flex-col">
			{/* Page header */}
			<div className="border-b px-6 py-4">
				<h1 className="font-semibold text-2xl">Statuses</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Create custom statuses for your transactions. Use the &quot;Treat as Paid&quot; behavior
					to include transactions in settlement calculations.
				</p>
			</div>

			{/* Statuses table */}
			<div className="flex-1 overflow-auto p-6">
				{activeVault?.id ? (
					<Card>
						<CardHeader>
							<CardTitle>Transaction Statuses</CardTitle>
							<CardDescription>
								Manage how transactions are categorized and tracked.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<StatusesTable />
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
