"use client";

/**
 * File Dropzone
 *
 * Drag-and-drop file upload component for CSV/OFX import.
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * Accepted file types for import.
 */
export const ACCEPTED_FILE_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".csv"],
  "application/x-ofx": [".ofx", ".qfx"],
  "text/plain": [".ofx", ".qfx"],
};

export const ACCEPTED_EXTENSIONS = [".csv", ".ofx", ".qfx"];

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
  selectedFile,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file extension
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        onError?.(`Unsupported file type: ${extension}. Please use CSV, OFX, or QFX files.`);
        return false;
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        onError?.("File is too large. Maximum size is 10MB.");
        return false;
      }

      return true;
    },
    [onError]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input to allow selecting the same file again
      e.target.value = "";
    },
    [handleFile]
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
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-testid="file-dropzone"
      className={cn(
        "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragging && "border-primary bg-primary/5",
        !isDragging && !disabled && "hover:border-primary/50 hover:bg-accent/50",
        disabled && "cursor-not-allowed opacity-50",
        selectedFile && "border-solid border-green-500/50 bg-green-50 dark:bg-green-950/20",
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

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
            <p className="text-sm font-medium">
              {isDragging ? "Drop file here" : "Drop a file or click to browse"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Supports CSV, OFX, and QFX files up to 10MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
