"use client";

/**
 * Imports Page
 *
 * Lists all import batches with the ability to view details
 * and delete imports (along with their transactions).
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportsTable, type ImportData } from "@/components/features/import";
import { useActiveImports, useVaultAction } from "@/lib/crdt/context";
import { Plus } from "lucide-react";
import type { Import as ImportRecord } from "@/lib/crdt/schema";

/**
 * Imports list page component.
 */
export default function ImportsPage() {
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

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Imports</h1>
        <Button asChild>
          <Link href="/imports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Import
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportsTable imports={imports} onDeleteImport={handleDeleteImport} />
        </CardContent>
      </Card>
    </div>
  );
}
