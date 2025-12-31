"use client";

import { useState } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteImportDialog } from "./DeleteImportDialog";
import { type ImportData, ImportRow } from "./ImportRow";

interface ImportsTableProps {
	imports: ImportData[];
	onDeleteImport: (id: string) => void;
}

/**
 * Table displaying all imports with delete functionality.
 *
 * Features:
 * - Sortable by date (most recent first)
 * - Shows filename, transaction count, and import date
 * - Delete action with confirmation dialog
 */
export function ImportsTable({ imports, onDeleteImport }: ImportsTableProps) {
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		import_: ImportData | null;
	}>({ open: false, import_: null });

	// Sort imports by creation date, most recent first
	const sortedImports = [...imports].sort((a, b) => b.createdAt - a.createdAt);

	const handleDeleteClick = (id: string) => {
		const import_ = imports.find((i) => i.id === id);
		if (import_) {
			setDeleteDialog({ open: true, import_ });
		}
	};

	const handleConfirmDelete = () => {
		if (deleteDialog.import_) {
			onDeleteImport(deleteDialog.import_.id);
		}
	};

	if (imports.length === 0) {
		return (
			<div className="py-12 text-center text-muted-foreground">
				<p>No imports yet.</p>
				<p className="mt-1 text-sm">Import transactions from a CSV or OFX file to get started.</p>
			</div>
		);
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Filename</TableHead>
						<TableHead className="text-right">Transactions</TableHead>
						<TableHead>Imported</TableHead>
						<TableHead className="w-[60px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedImports.map((import_) => (
						<ImportRow key={import_.id} import_={import_} onDelete={handleDeleteClick} />
					))}
				</TableBody>
			</Table>

			{deleteDialog.import_ && (
				<DeleteImportDialog
					open={deleteDialog.open}
					onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
					filename={deleteDialog.import_.filename}
					transactionCount={deleteDialog.import_.transactionCount}
					onConfirm={handleConfirmDelete}
				/>
			)}
		</>
	);
}
