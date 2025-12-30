"use client";

/**
 * Tags Page
 *
 * Main tags view for managing hierarchical transaction categories.
 * Supports creating, editing, and organizing tags with parent-child relationships.
 */

import { TagsTable } from "@/components/features/tags";
import { useActiveVault } from "@/hooks/use-active-vault";
import { useIdentity } from "@/hooks/use-identity";
import { useVaultPresence } from "@/hooks/use-vault-presence";

/**
 * Tags page component.
 */
export default function TagsPage() {
	// Vault & identity for presence
	const { activeVault } = useActiveVault();
	const { pubkeyHash } = useIdentity();

	// Presence (only active when vault & identity are available)
	useVaultPresence(activeVault?.id ?? null, pubkeyHash ?? null);

	return (
		<div className="flex h-full flex-col">
			{/* Page header */}
			<div className="border-b px-6 py-4">
				<h1 className="font-semibold text-2xl">Tags</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Create and manage tags to categorize your transactions. Use hierarchical tags for detailed
					organization.
				</p>
			</div>

			{/* Tags table */}
			<div className="flex-1 overflow-auto p-6">
				{activeVault?.id ? (
					<TagsTable />
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
