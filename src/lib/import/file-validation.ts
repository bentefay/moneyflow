/**
 * Browser-file validation shared by import pickers and whole-surface drop targets.
 */

import Papa from "papaparse";

import type { ImportFileType } from "./types";

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const IMPORT_FILE_SNIFF_BYTES = 8 * 1024;
export const ACCEPTED_IMPORT_EXTENSIONS = [".csv", ".ofx", ".qfx"] as const;

export type ImportFileValidationErrorCode =
    | "content-mismatch"
    | "empty-file"
    | "file-too-large"
    | "multiple-files"
    | "no-file"
    | "unreadable-file"
    | "unsupported-content-type"
    | "unsupported-extension";

export interface ImportFileValidationError {
    readonly code: ImportFileValidationErrorCode;
    readonly message: string;
}

export type ImportFileValidationResult =
    | {
          readonly file: File;
          readonly fileType: ImportFileType;
          readonly ok: true;
      }
    | {
          readonly error: ImportFileValidationError;
          readonly ok: false;
      };

const CSV_MIME_TYPES = new Set([
    "",
    "application/octet-stream",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain"
]);
const OFX_MIME_TYPES = new Set([
    "",
    "application/octet-stream",
    "application/vnd.intu.qfx",
    "application/x-ofx",
    "text/ofx",
    "text/plain"
]);

function failure(code: ImportFileValidationErrorCode, message: string): ImportFileValidationResult {
    return { error: { code, message }, ok: false };
}

function extensionFor(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    return lastDot < 0 ? "" : filename.slice(lastDot).toLowerCase();
}

function fileTypeForExtension(extension: string): ImportFileType | null {
    if (extension === ".csv") return "csv";
    if (extension === ".ofx" || extension === ".qfx") return "ofx";
    return null;
}

function hasOFXSignature(content: string): boolean {
    const normalized = content.replace(/^\uFEFF/, "").trimStart();
    if (/^(?:OFXHEADER\s*:|<OFX(?:\s|>))/i.test(normalized)) return true;

    const withoutXmlDeclaration = normalized.replace(/^<\?xml\b[\s\S]{0,1024}?\?>\s*/i, "");
    const ofxInstruction = withoutXmlDeclaration.match(/^<\?OFX\b[\s\S]{0,2048}?\?>\s*/i);
    if (ofxInstruction == null) return false;

    return /^<OFX(?:\s|>)/i.test(withoutXmlDeclaration.slice(ofxInstruction[0].length));
}

function hasKnownDocumentSignature(content: string): boolean {
    return (
        /^(?:\{|\[)/.test(content) ||
        /^</.test(content) ||
        /^%PDF-/i.test(content) ||
        /^PK[\u0000-\u001F]/.test(content) ||
        /^\{\\rtf/i.test(content) ||
        /^(?:GIF8|JFIF|PNG)/i.test(content)
    );
}

function hasBinaryControls(content: string): boolean {
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(content);
}

function hasCSVSignature(content: string, mayEndMidRecord: boolean): boolean {
    const normalized = content.replace(/^\uFEFF/, "").trimStart();
    if (
        normalized.length === 0 ||
        hasBinaryControls(normalized) ||
        hasKnownDocumentSignature(normalized) ||
        hasOFXSignature(normalized)
    ) {
        return false;
    }

    const parsed = Papa.parse<string[]>(normalized, {
        delimiter: "",
        header: false,
        preview: 12,
        skipEmptyLines: "greedy"
    });
    const rows = parsed.data.filter((row) => row.some((field) => field.trim().length > 0));
    const completeRows = mayEndMidRecord ? rows.slice(0, -1) : rows;
    const firstRow = completeRows[0];
    if (firstRow == null) return false;

    if (firstRow.length > 1) {
        return completeRows.slice(1).every((row) => row.length === firstRow.length);
    }

    return completeRows.length > 1 && completeRows.every((row) => row.length === 1);
}

/**
 * Validate one import file without copying its full contents.
 */
export async function validateImportFiles(
    files: readonly File[]
): Promise<ImportFileValidationResult> {
    if (files.length === 0) {
        return failure(
            "no-file",
            "No file was provided. Choose one CSV, OFX, or QFX file to import."
        );
    }
    if (files.length > 1) {
        return failure(
            "multiple-files",
            "Import one file at a time. Choose a single CSV, OFX, or QFX file."
        );
    }

    const file = files[0];
    if (file == null) {
        return failure(
            "no-file",
            "No file was provided. Choose one CSV, OFX, or QFX file to import."
        );
    }
    if (file.size === 0) {
        return failure(
            "empty-file",
            "This file is empty. Choose a bank export that contains data."
        );
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
        return failure(
            "file-too-large",
            "This file is larger than 10 MiB. Export a smaller date range and try again."
        );
    }

    const extension = extensionFor(file.name);
    const fileType = fileTypeForExtension(extension);
    if (fileType == null) {
        return failure(
            "unsupported-extension",
            "Unsupported file. Choose a CSV, OFX, or QFX bank export."
        );
    }

    const mimeType = file.type.toLowerCase().split(";", 1)[0] ?? "";
    const supportedMimeTypes = fileType === "csv" ? CSV_MIME_TYPES : OFX_MIME_TYPES;
    if (!supportedMimeTypes.has(mimeType)) {
        return failure(
            "unsupported-content-type",
            `The file content type (${file.type || "unknown"}) does not match a ${fileType.toUpperCase()} bank export.`
        );
    }

    const content = await file
        .slice(0, Math.min(file.size, IMPORT_FILE_SNIFF_BYTES))
        .text()
        .catch(() => null);
    if (content == null) {
        return failure(
            "unreadable-file",
            "This file could not be read. Check its permissions or export it again."
        );
    }

    const contentMatches =
        fileType === "csv"
            ? hasCSVSignature(content, file.size > IMPORT_FILE_SNIFF_BYTES)
            : hasOFXSignature(content);
    if (!contentMatches) {
        return failure(
            "content-mismatch",
            `The file content does not look like a ${fileType.toUpperCase()} bank export. Export it again without renaming the extension.`
        );
    }

    return { file, fileType, ok: true };
}
