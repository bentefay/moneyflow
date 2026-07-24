import { describe, expect, it } from "vitest";

import { MAX_IMPORT_FILE_BYTES, validateImportFiles } from "@/lib/import/file-validation";

const CSV_CONTENT = "Date,Description,Amount\n2026-07-25,Coffee,-4.25";
const OFX_CONTENT = "OFXHEADER:100\nDATA:OFXSGML\n<OFX></OFX>";

class OversizedFile extends File {
    override get size(): number {
        return MAX_IMPORT_FILE_BYTES + 1;
    }
}

class UnreadableBlob extends Blob {
    override text(): Promise<string> {
        return Promise.reject(new DOMException("Synthetic read failure", "NotReadableError"));
    }
}

class UnreadableFile extends File {
    override slice(): Blob {
        return new UnreadableBlob();
    }
}

describe("validateImportFiles", () => {
    it("accepts mixed-case CSV and OFX/QFX names while preserving the original File", async () => {
        const csv = new File([CSV_CONTENT], "mixed.CsV", { type: "text/csv" });
        const ofx = new File([OFX_CONTENT], "statement.OFX", { type: "application/x-ofx" });
        const qfx = new File([OFX_CONTENT], "statement.QfX", { type: "application/octet-stream" });

        await expect(validateImportFiles([csv])).resolves.toEqual({
            ok: true,
            file: csv,
            fileType: "csv"
        });
        await expect(validateImportFiles([ofx])).resolves.toEqual({
            ok: true,
            file: ofx,
            fileType: "ofx"
        });
        await expect(validateImportFiles([qfx])).resolves.toEqual({
            ok: true,
            file: qfx,
            fileType: "ofx"
        });
    });

    it("returns specific typed failures for cardinality, size and extension", async () => {
        const csv = new File([CSV_CONTENT], "valid.csv", { type: "text/csv" });

        await expect(validateImportFiles([])).resolves.toMatchObject({
            ok: false,
            error: { code: "no-file" }
        });
        await expect(validateImportFiles([csv, csv])).resolves.toMatchObject({
            ok: false,
            error: { code: "multiple-files" }
        });
        await expect(
            validateImportFiles([new File([], "empty.csv", { type: "text/csv" })])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "empty-file" }
        });
        await expect(
            validateImportFiles([
                new OversizedFile([CSV_CONTENT], "large.csv", { type: "text/csv" })
            ])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "file-too-large" }
        });
        await expect(
            validateImportFiles([new File(["PDF"], "statement.pdf", { type: "application/pdf" })])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "unsupported-extension" }
        });
    });

    it("rejects incompatible MIME types and clearly spoofed or binary content", async () => {
        await expect(
            validateImportFiles([new File([CSV_CONTENT], "statement.csv", { type: "image/png" })])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "unsupported-content-type" }
        });
        await expect(
            validateImportFiles([new File([OFX_CONTENT], "statement.csv", { type: "text/csv" })])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "content-mismatch" }
        });
        await expect(
            validateImportFiles([
                new File([CSV_CONTENT], "statement.ofx", { type: "application/x-ofx" })
            ])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "content-mismatch" }
        });
        await expect(
            validateImportFiles([
                new File([new Uint8Array([0, 1, 2])], "statement.csv", { type: "text/csv" })
            ])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "content-mismatch" }
        });
    });

    it("returns a typed unreadable failure instead of throwing", async () => {
        await expect(
            validateImportFiles([
                new UnreadableFile([CSV_CONTENT], "unreadable.csv", { type: "text/csv" })
            ])
        ).resolves.toMatchObject({
            ok: false,
            error: { code: "unreadable-file" }
        });
    });
});
