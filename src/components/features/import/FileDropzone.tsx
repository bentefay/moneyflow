"use client";

/**
 * File Dropzone
 *
 * Drag-and-drop file upload component for CSV/OFX import.
 */

import { useCallback, useRef, useState } from "react";

import {
    ACCEPTED_IMPORT_EXTENSIONS,
    type ImportFileValidationError,
    validateImportFiles
} from "@/lib/import/file-validation";
import { cn } from "@/lib/utils";

import { ImportDropTarget } from "./ImportDropTarget";

/**
 * Accepted file types for import.
 */
export const ACCEPTED_FILE_TYPES = {
    "text/csv": [".csv"],
    "application/vnd.ms-excel": [".csv"],
    "application/x-ofx": [".ofx", ".qfx"],
    "text/plain": [".ofx", ".qfx"]
};

export const ACCEPTED_EXTENSIONS = ACCEPTED_IMPORT_EXTENSIONS;

export interface FileDropzoneProps {
    /** Callback when file is selected */
    onFileSelect: (file: File) => void;
    /** Callback on validation error */
    onError?: (error: string) => void;
    /** Whether the dropzone is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Currently selected file (for controlled mode) */
    selectedFile?: File | null;
}

/**
 * File dropzone component.
 */
export function FileDropzone({
    onFileSelect,
    onError,
    disabled = false,
    className,
    selectedFile
}: FileDropzoneProps) {
    const [validationError, setValidationError] = useState<ImportFileValidationError | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleValidationError = useCallback(
        (error: ImportFileValidationError | null) => {
            setValidationError(error);
            if (error) onError?.(error.message);
        },
        [onError]
    );

    const handleFile = useCallback(
        (file: File) => {
            handleValidationError(null);
            onFileSelect(file);
        },
        [handleValidationError, onFileSelect]
    );

    const handleClick = useCallback(() => {
        if (!disabled) {
            inputRef.current?.click();
        }
    }, [disabled]);

    const handleInputChange = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            // Reset input to allow selecting the same file again
            event.target.value = "";
            const result = await validateImportFiles(files);
            if (!result.ok) {
                handleValidationError(result.error);
                return;
            }
            handleFile(result.file);
        },
        [handleFile, handleValidationError]
    );

    const getFileIcon = () => {
        if (selectedFile) {
            const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));
            if (ext === ".csv") {
                return (
                    <svg
                        className="h-12 w-12 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                );
            }
            return (
                <svg
                    className="h-12 w-12 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            );
        }

        return (
            <svg
                className="text-muted-foreground h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
            </svg>
        );
    };

    return (
        <ImportDropTarget
            ariaLabel="Import bank statement file"
            className={cn(
                "min-h-[200px] rounded-lg border-2 border-dashed transition-colors",
                !disabled && "hover:border-primary/50 hover:bg-accent/50",
                disabled && "cursor-not-allowed opacity-50",
                selectedFile && "border-solid border-green-500/50 bg-green-50 dark:bg-green-950/20",
                className
            )}
            disabled={disabled}
            onFileAccepted={handleFile}
            onValidationError={handleValidationError}
            testId="file-dropzone"
            validationError={validationError}
        >
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",")}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
            />

            <div
                aria-label="Choose a CSV, OFX, or QFX file"
                className="flex min-h-[196px] cursor-pointer flex-col items-center justify-center p-8"
                onClick={handleClick}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleClick();
                    }
                }}
                role="button"
                tabIndex={disabled ? -1 : 0}
            >
                {getFileIcon()}

                <div className="mt-4 text-center">
                    {selectedFile ? (
                        <>
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium">Drop a file or click to browse</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                                Supports CSV, OFX, and QFX files up to 10 MiB
                            </p>
                        </>
                    )}
                </div>
            </div>
        </ImportDropTarget>
    );
}
