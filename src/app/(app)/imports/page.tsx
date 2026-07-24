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

import { ACCEPTED_EXTENSIONS, type ImportData, ImportsTable } from "@/components/features/import";
import { Button } from "@/components/ui/button";
import { useActiveImports, useActiveTransactions, useTransactionActions } from "@/lib/crdt/context";
import type { Import as ImportRecord } from "@/lib/crdt/schema";
import { cn } from "@/lib/utils";

/**
 * Imports list page component.
 */
export default function ImportsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Get all active imports from CRDT state
    const importsMap = useActiveImports();
    const transactions = useActiveTransactions();

    const liveLinkedTransactionCountByImportId = useMemo(() => {
        const counts = new Map<string, number>();

        for (const transaction of transactions) {
            if (!transaction.importId) continue;
            counts.set(transaction.importId, (counts.get(transaction.importId) ?? 0) + 1);
        }

        return counts;
    }, [transactions]);

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

    // Validate file extension
    const validateFile = useCallback((file: File): boolean => {
        const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
        return ACCEPTED_EXTENSIONS.includes(extension);
    }, []);

    // Handle file selection - store in sessionStorage and navigate
    const handleFileSelect = useCallback(
        (file: File) => {
            if (!validateFile(file)) return;

            // Read file content and store in sessionStorage for the new page
            const reader = new FileReader();
            reader.onload = () => {
                sessionStorage.setItem(
                    "pendingImportFile",
                    JSON.stringify({
                        name: file.name,
                        content: reader.result,
                        type: file.type
                    })
                );
                router.push("/imports/new");
            };
            reader.readAsText(file);
        },
        [router, validateFile]
    );

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the container (not entering a child)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        },
        [handleFileSelect]
    );

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
        // Reset input to allow selecting the same file again
        e.target.value = "";
    };

    return (
        <div
            className={cn(
                "relative flex h-full flex-col",
                isDragging && "ring-primary/50 ring-2 ring-inset"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",")}
                onChange={handleInputChange}
                className="hidden"
            />

            {/* Drag overlay */}
            {isDragging && (
                <div className="bg-background/80 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-primary flex flex-col items-center gap-2">
                        <Upload className="h-12 w-12" />
                        <p className="text-lg font-medium">Drop file to import</p>
                        <p className="text-muted-foreground text-sm">CSV, OFX, or QFX files</p>
                    </div>
                </div>
            )}

            {/* Page header */}
            <div className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Imports</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Import transactions from your bank statements.
                        </p>
                    </div>
                    <Button onClick={handleButtonClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import new file
                    </Button>
                </div>
            </div>

            {/* Imports table */}
            <div className="flex-1 overflow-auto p-6">
                <ImportsTable imports={imports} onDeleteImport={handleDeleteImport} />
            </div>
        </div>
    );
}
