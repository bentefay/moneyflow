"use client";

/**
 * Imports Page
 *
 * Lists all import batches with the ability to view details
 * and delete imports (along with their transactions).
 * The entire content area is a dropzone for quick file import.
 */

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import {
    ACCEPTED_EXTENSIONS,
    type ImportData,
    ImportDropTarget,
    ImportsTable,
    useImportFileTransfer
} from "@/components/features/import";
import { Button } from "@/components/ui/button";
import {
    useActiveImports,
    useActivePublicTransactionIdentities,
    useTransactionActions
} from "@/lib/crdt/context";
import type { Import as ImportRecord } from "@/lib/crdt/schema";
import { type ImportFileValidationError, validateImportFiles } from "@/lib/import/file-validation";

/**
 * Imports list page component.
 */
export default function ImportsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pickerButtonRef = useRef<HTMLButtonElement>(null);
    const { stageImportFile } = useImportFileTransfer();
    const [validationError, setValidationError] = useState<ImportFileValidationError | null>(null);

    // Get all active imports from CRDT state
    const importsMap = useActiveImports();
    const transactionIdentities = useActivePublicTransactionIdentities();

    const liveLinkedTransactionCountByImportId = useMemo(() => {
        const counts = new Map<string, number>();

        for (const transaction of transactionIdentities) {
            if (!transaction.importId) continue;
            counts.set(transaction.importId, (counts.get(transaction.importId) ?? 0) + 1);
        }

        return counts;
    }, [transactionIdentities]);

    // Transaction actions for deleting transactions by import
    const { deleteTransactionsByImport } = useTransactionActions();

    // Convert CRDT map to array for the table
    const imports: ImportData[] = Object.values(importsMap)
        .filter(
            (imp): imp is ImportRecord & { $cid: string } =>
                typeof imp === "object" && imp !== null && !imp.deletedAt
        )
        .map((imp) => ({
            id: imp.id,
            filename: imp.filename,
            transactionCount: liveLinkedTransactionCountByImportId.get(imp.id) ?? 0,
            createdAt: imp.createdAt,
            deletedAt: imp.deletedAt
        }));

    // Delete the import record and every linked physical transaction in one history action.
    const handleDeleteImport = useCallback(
        (importId: string) => {
            deleteTransactionsByImport(importId);
        },
        [deleteTransactionsByImport]
    );

    const handleAcceptedFile = useCallback(
        (file: File) => {
            setValidationError(null);
            stageImportFile(file);
            router.push("/imports/new");
        },
        [router, stageImportFile]
    );

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        const result = await validateImportFiles(files);
        if (!result.ok) {
            setValidationError(result.error);
            pickerButtonRef.current?.focus();
            return;
        }
        handleAcceptedFile(result.file);
    };

    return (
        <ImportDropTarget
            ariaLabel="Imports list file drop target"
            className="flex h-full flex-col"
            onFileAccepted={handleAcceptedFile}
            onValidationError={setValidationError}
            testId="imports-import-drop-target"
            validationError={validationError}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",")}
                onChange={handleInputChange}
                className="hidden"
            />

            {/* Page header */}
            <div className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Imports</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Import transactions from your bank statements.
                        </p>
                    </div>
                    <Button ref={pickerButtonRef} onClick={handleButtonClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import new file
                    </Button>
                </div>
            </div>

            {/* Imports table */}
            <div className="flex-1 overflow-auto p-6">
                <ImportsTable imports={imports} onDeleteImport={handleDeleteImport} />
            </div>
        </ImportDropTarget>
    );
}
