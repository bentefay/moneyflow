"use client";

/**
 * Imports Page
 *
 * Lists all import batches with the ability to view details
 * and delete imports (along with their transactions).
 * Also provides a dropzone for quick file import.
 */

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { FileDropzone, type ImportData, ImportsTable } from "@/components/features/import";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveImports, useVaultAction } from "@/lib/crdt/context";
import type { Import as ImportRecord } from "@/lib/crdt/schema";

/**
 * Imports list page component.
 */
export default function ImportsPage() {
	const router = useRouter();

	// Get all active imports from CRDT state
	const importsMap = useActiveImports();

	// Convert CRDT map to array for the table
	const imports: ImportData[] = Object.values(importsMap)
		.filter(
			(imp): imp is ImportRecord & { $cid: string } =>
				typeof imp === "object" && imp !== null && !imp.deletedAt
		)
		.map((imp) => ({
			id: imp.id,
			filename: imp.filename,
			transactionCount: imp.transactionCount,
			createdAt: imp.createdAt,
			deletedAt: imp.deletedAt,
		}));

	// Soft-delete import and its transactions
	const deleteImport = useVaultAction((state, importId: string) => {
		const now = Date.now();

		// Mark the import as deleted
		const importRecord = state.imports[importId];
		if (importRecord && typeof importRecord === "object") {
			importRecord.deletedAt = now;
		}

		// Mark all transactions from this import as deleted
		for (const [, transaction] of Object.entries(state.transactions)) {
			if (
				typeof transaction === "object" &&
				transaction !== null &&
				transaction.importId === importId &&
				!transaction.deletedAt
			) {
				transaction.deletedAt = now;
			}
		}
	});

	const handleDeleteImport = (id: string) => {
		deleteImport(id);
	};

	// Handle file selection - store in sessionStorage and navigate
	const handleFileSelect = useCallback(
		(file: File) => {
			// Read file content and store in sessionStorage for the new page
			const reader = new FileReader();
			reader.onload = () => {
				sessionStorage.setItem(
					"pendingImportFile",
					JSON.stringify({
						name: file.name,
						content: reader.result,
						type: file.type,
					})
				);
				router.push("/imports/new");
			};
			reader.readAsText(file);
		},
		[router]
	);

	return (
		<div className="flex h-full flex-col">
			{/* Page header with dropzone */}
			<div className="border-b px-6 py-4">
				<div className="mb-4">
					<h1 className="font-semibold text-2xl">Imports</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Import transactions from your bank statements.
					</p>
				</div>
				<FileDropzone onFileSelect={handleFileSelect} className="w-full" />
			</div>

			{/* Imports table */}
			<div className="flex-1 overflow-auto p-6">
				<Card>
					<CardHeader>
						<CardTitle>Import History</CardTitle>
					</CardHeader>
					<CardContent>
						<ImportsTable imports={imports} onDeleteImport={handleDeleteImport} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
