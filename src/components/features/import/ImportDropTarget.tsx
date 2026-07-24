"use client";

import { Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { type ImportFileValidationError, validateImportFiles } from "@/lib/import/file-validation";
import { cn } from "@/lib/utils";

export interface ImportDropTargetProps {
    readonly ariaLabel: string;
    readonly children: React.ReactNode;
    readonly className?: string;
    readonly containerRef?: React.Ref<HTMLDivElement>;
    readonly disabled?: boolean;
    readonly onFileAccepted: (file: File) => void;
    readonly onValidationError?: (error: ImportFileValidationError | null) => void;
    readonly testId?: string;
    readonly validationError?: ImportFileValidationError | null;
}

function isFileDrag(dataTransfer: DataTransfer): boolean {
    return Array.from(dataTransfer.types).includes("Files");
}

function hasOneFileItem(dataTransfer: DataTransfer): boolean {
    const fileItemCount = Array.from(dataTransfer.items).filter(
        (item) => item.kind === "file"
    ).length;
    return fileItemCount === 0 || fileItemCount === 1;
}

/**
 * Shared stable whole-surface target for browser import files.
 */
export function ImportDropTarget({
    ariaLabel,
    children,
    className,
    containerRef,
    disabled = false,
    onFileAccepted,
    onValidationError,
    testId = "import-drop-target",
    validationError
}: ImportDropTargetProps) {
    const dragDepthRef = useRef(0);
    const priorFocusRef = useRef<HTMLElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [internalError, setInternalError] = useState<ImportFileValidationError | null>(null);
    const displayedError = validationError === undefined ? internalError : validationError;

    const reportError = useCallback(
        (error: ImportFileValidationError | null) => {
            setInternalError(error);
            onValidationError?.(error);
        },
        [onValidationError]
    );

    const resetDragState = useCallback(() => {
        dragDepthRef.current = 0;
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        window.addEventListener("dragend", resetDragState, true);
        window.addEventListener("drop", resetDragState);
        return () => {
            window.removeEventListener("dragend", resetDragState, true);
            window.removeEventListener("drop", resetDragState);
        };
    }, [isDragging, resetDragState]);

    const handleDragEnter = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            if (!isFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            if (disabled) {
                event.dataTransfer.dropEffect = "none";
                return;
            }
            if (dragDepthRef.current === 0) {
                priorFocusRef.current =
                    document.activeElement instanceof HTMLElement ? document.activeElement : null;
                setIsDragging(true);
            }
            dragDepthRef.current += 1;
            event.dataTransfer.dropEffect = hasOneFileItem(event.dataTransfer) ? "copy" : "none";
        },
        [disabled]
    );

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (!isFileDrag(event.dataTransfer)) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            if (!isFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect =
                !disabled && hasOneFileItem(event.dataTransfer) ? "copy" : "none";
        },
        [disabled]
    );

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            if (!isFileDrag(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            resetDragState();
            if (disabled) {
                event.dataTransfer.dropEffect = "none";
                return;
            }

            const result = await validateImportFiles(Array.from(event.dataTransfer.files));
            if (!result.ok) {
                reportError(result.error);
                priorFocusRef.current?.focus();
                return;
            }

            reportError(null);
            onFileAccepted(result.file);
        },
        [disabled, onFileAccepted, reportError, resetDragState]
    );

    return (
        <div
            aria-label={ariaLabel}
            className={cn("relative", isDragging && "ring-primary/50 ring-2 ring-inset", className)}
            data-testid={testId}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            ref={containerRef}
            role="region"
        >
            {children}
            {isDragging && (
                <div
                    className="bg-background/85 pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm motion-reduce:transition-none"
                    data-testid="import-drop-overlay"
                    role="status"
                >
                    <div className="text-primary flex flex-col items-center gap-2 text-center">
                        <Upload aria-hidden="true" className="h-12 w-12" />
                        <p className="text-lg font-medium">Drop file to import</p>
                        <p className="text-muted-foreground text-sm">
                            One CSV, OFX, or QFX file up to 10 MiB
                        </p>
                    </div>
                </div>
            )}
            {displayedError && (
                <p
                    className="bg-destructive text-destructive-foreground absolute right-4 bottom-4 left-4 z-[60] rounded-md px-4 py-3 text-sm shadow-lg"
                    role="alert"
                >
                    {displayedError.message}
                </p>
            )}
        </div>
    );
}
