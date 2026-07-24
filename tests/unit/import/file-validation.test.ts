import { describe, expect, it } from "vitest";

import { MAX_IMPORT_FILE_BYTES, validateImportFiles } from "@/lib/import/file-validation";

const CSV_CONTENT = "Date,Description,Amount\n2026-07-25,Coffee,-4.25";
const OFX_CONTENT = "OFXHEADER:100\nDATA:OFXSGML\n<OFX></OFX>";
const XML_OFX_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST></BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

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

    it("accepts parser-compatible XML OFX with bounded declarations before the root", async () => {
        const xmlOfx = new File([XML_OFX_CONTENT], "statement.ofx", {
            type: "application/x-ofx"
        });
        const arbitraryXml = new File(
            ['<?xml version="1.0"?><document><OFX></OFX></document>'],
            "renamed.ofx",
            { type: "application/x-ofx" }
        );

        await expect(validateImportFiles([xmlOfx])).resolves.toEqual({
            ok: true,
            file: xmlOfx,
            fileType: "ofx"
        });
        await expect(validateImportFiles([arbitraryXml])).resolves.toMatchObject({
            ok: false,
            error: { code: "content-mismatch" }
        });
    });

    it("rejects renamed document signatures while retaining difficult valid CSV exports", async () => {
        const invalidDocuments = [
            '{"date":"2026-07-25","amount":4.25}',
            '<?xml version="1.0"?><transactions><amount>4.25</amount></transactions>',
            "%PDF-1.7\n1,0 obj",
            "<!DOCTYPE html><html><body>date,amount</body></html>",
            new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x2c, 0x00])
        ] as const;
        const validExports = [
            '\uFEFFDate,Description,Amount\n2026-07-25,"Coffee, tea",-4.25',
            'Date,Description,Amount\n2026-07-25,"Line one\nLine two",-4.25',
            'Date,Description,Amount\n2026-07-25,"He said ""hello""",-4.25',
            "Description\nCoffee\nGroceries",
            [
                "Date,Description,Amount",
                ...Array.from(
                    { length: 200 },
                    (_, index) =>
                        `2026-07-25,Long bounded description ${String(index).padStart(3, "0")} ${"x".repeat(80)},-4.25`
                )
            ].join("\n"),
            new Uint8Array([
                ...new TextEncoder().encode("Date;Description;Amount\r\n2026-07-25;Caf"),
                0xe9,
                ...new TextEncoder().encode(";-4,25")
            ])
        ] as const;

        for (const content of invalidDocuments) {
            await expect(
                validateImportFiles([new File([content], "renamed.csv", { type: "text/csv" })])
            ).resolves.toMatchObject({
                ok: false,
                error: { code: "content-mismatch" }
            });
        }

        for (const content of validExports) {
            await expect(
                validateImportFiles([new File([content], "bank.csv", { type: "text/csv" })])
            ).resolves.toMatchObject({
                ok: true,
                fileType: "csv"
            });
        }
    });
});
