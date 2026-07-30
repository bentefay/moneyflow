/**
 * E2E Test: Import Panel Journey
 *
 * Journey-style test covering the complete CSV/OFX import flow
 * with the new tabbed configuration panel (ImportPanel).
 * Uses test.step() to break complex flows into logical sections.
 *
 * Features tested:
 * - File upload (CSV and OFX)
 * - Side-by-side preview (raw data + parsed preview)
 * - Tabbed configuration (Template, Columns, Format, Duplicates, Account)
 * - Account selection validation
 * - Duplicate detection settings
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { createNewIdentity, goToImportNew, goToImports, goToTransactions } from "./helpers";
import { addEmptyTransaction } from "./helpers/settlement";

const XML_OFX_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<DTSERVER>20260725120000</DTSERVER>
<LANGUAGE>ENG</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>P15-XML</TRNUID>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<STMTRS>
<CURDEF>USD</CURDEF>
<BANKACCTFROM>
<BANKID>123456789</BANKID>
<ACCTID>P15XML</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260701</DTSTART>
<DTEND>20260725</DTEND>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20260725</DTPOSTED>
<TRNAMT>-4.25</TRNAMT>
<FITID>P15-XML-1</FITID>
<NAME>P15 XML OFX</NAME>
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>95.75</BALAMT>
<DTASOF>20260725</DTASOF>
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const DROP_COLLISION_MARGIN_PX = 8;

// ============================================================================
// Import-Specific Helpers
// ============================================================================

/**
 * Create a temporary file for testing.
 */
function createTestFile(content: string, extension: string): string {
    const tmpDir = os.tmpdir();
    // Date.now() alone collides: the suite runs 4 workers against one shared tmpdir, so two
    // callers landing in the same millisecond get the same path and the first cleanup unlinks
    // the other's file. The random suffix makes the name unique per call.
    const uniqueName = `test-import-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const filePath = path.join(tmpDir, `${uniqueName}.${extension}`);
    fs.writeFileSync(filePath, content);
    return filePath;
}

/**
 * Create a sample CSV with standard bank format.
 */
function createSampleBankCSV(): string {
    const content = `Date,Description,Amount,Balance
2024-01-15,Coffee Shop,-5.50,1000.00
2024-01-16,Grocery Store,-75.25,924.75
2024-01-17,Direct Deposit,2500.00,3424.75
2024-01-18,Gas Station,-45.00,3379.75
2024-01-19,Restaurant,-32.50,3347.25`;
    return createTestFile(content, "csv");
}

/**
 * Create a sample OFX file.
 */
function createSampleOFX(): string {
    const content = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<DTSERVER>20240120120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>987654321
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240115
<DTEND>20240120
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-5.50
<FITID>2024011501
<NAME>Coffee Shop
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240117
<TRNAMT>2500.00
<FITID>2024011701
<NAME>Direct Deposit
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>3347.25
<DTASOF>20240120
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
    return createTestFile(content, "ofx");
}

interface BrowserImportFile {
    readonly content: string;
    readonly name: string;
    readonly size?: number;
    readonly type: string;
}

async function dispatchImportDrag(
    target: Locator,
    eventType: "dragend" | "dragenter" | "dragleave" | "dragover" | "drop",
    files: readonly BrowserImportFile[]
): Promise<string> {
    return target.evaluate(
        (element, event) => {
            const dataTransfer = new DataTransfer();
            for (const file of event.files) {
                const content = file.size == null ? file.content : new Uint8Array(file.size);
                dataTransfer.items.add(new File([content], file.name, { type: file.type }));
            }
            element.dispatchEvent(
                new DragEvent(event.eventType, {
                    bubbles: true,
                    cancelable: true,
                    clientX: 1,
                    clientY: 1,
                    dataTransfer
                })
            );
            return dataTransfer.dropEffect;
        },
        { eventType, files }
    );
}

async function expectFloatingWithinVisibleTarget(
    page: Page,
    target: Locator,
    floating: Locator
): Promise<void> {
    const targetBox = await target.boundingBox();
    const floatingBox = await floating.boundingBox();
    if (targetBox == null || floatingBox == null) {
        throw new Error("Missing target or floating geometry");
    }
    const viewport = await page.evaluate(() => ({
        height: window.innerHeight,
        width: window.innerWidth
    }));
    const textBoxes = await floating.evaluate((element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const boxes: Array<{
            readonly bottom: number;
            readonly left: number;
            readonly right: number;
            readonly top: number;
        }> = [];
        for (let node = walker.nextNode(); node != null; node = walker.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of Array.from(range.getClientRects())) {
                boxes.push({
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    top: rect.top
                });
            }
        }
        return boxes;
    });
    const visible = {
        bottom: Math.min(targetBox.y + targetBox.height, viewport.height),
        left: Math.max(targetBox.x, 0),
        right: Math.min(targetBox.x + targetBox.width, viewport.width),
        top: Math.max(targetBox.y, 0)
    };
    const boxes = [
        {
            bottom: floatingBox.y + floatingBox.height,
            left: floatingBox.x,
            right: floatingBox.x + floatingBox.width,
            top: floatingBox.y
        },
        ...textBoxes
    ];
    const contained = boxes.every(
        (box) =>
            box.left >= visible.left + DROP_COLLISION_MARGIN_PX &&
            box.top >= visible.top + DROP_COLLISION_MARGIN_PX &&
            box.right <= visible.right - DROP_COLLISION_MARGIN_PX &&
            box.bottom <= visible.bottom - DROP_COLLISION_MARGIN_PX
    );

    expect(
        contained,
        JSON.stringify({
            boxes,
            visible
        })
    ).toBe(true);
}

async function measuredContrastRatio(element: Locator): Promise<number> {
    return element.evaluate((node) => {
        const context = document.createElement("canvas").getContext("2d");
        if (context == null) throw new Error("Canvas 2D context unavailable");
        const colorBytes = (color: string): readonly [number, number, number, number] => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
            return [red, green, blue, alpha];
        };
        const styles = getComputedStyle(node);
        const background = colorBytes(styles.backgroundColor);
        const foreground = colorBytes(styles.color);
        const foregroundAlpha = foreground[3] / 255;
        const compositedForeground = [
            foreground[0] * foregroundAlpha + background[0] * (1 - foregroundAlpha),
            foreground[1] * foregroundAlpha + background[1] * (1 - foregroundAlpha),
            foreground[2] * foregroundAlpha + background[2] * (1 - foregroundAlpha)
        ];
        const luminance = (channels: readonly number[]) => {
            const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
                const normalized = channel / 255;
                return normalized <= 0.04045
                    ? normalized / 12.92
                    : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return red * 0.2126 + green * 0.7152 + blue * 0.0722;
        };
        const foregroundLuminance = luminance(compositedForeground);
        const backgroundLuminance = luminance(background);
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);
        return (lighter + 0.05) / (darker + 0.05);
    });
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Import Panel", () => {
    test("transaction surface drop transfers one File without plaintext storage and cancel returns", async ({
        page
    }) => {
        await createNewIdentity(page);
        await page.getByRole("link", { name: "Transactions", exact: true }).click();
        await page.getByTestId("transaction-table-toolbar").waitFor();
        const file = {
            content: [
                "Date,Description,Amount",
                ...Array.from(
                    { length: 60 },
                    (_, index) =>
                        `2026-07-25,P15 transaction drop ${String(index).padStart(4, "0")},${index + 1}.00`
                )
            ].join("\n"),
            name: "p15-transaction-drop.csv",
            type: "text/csv"
        };
        const target = page.getByTestId("transaction-import-drop-target");

        await expect(target).toBeVisible();
        await dispatchImportDrag(target, "dragenter", [file]);
        await expect(page.getByTestId("import-drop-overlay")).toBeVisible();
        await dispatchImportDrag(target, "drop", [file]);

        await expect(page).toHaveURL(/\/imports\/new$/);
        await expect(page.getByText(file.name, { exact: true })).toBeVisible();
        const storageLeak = await page.evaluate((syntheticFile) => {
            const values = [
                ...Object.entries(sessionStorage),
                ...Object.entries(localStorage)
            ].flatMap(([key, value]) => [key, value]);
            return values.some(
                (value) =>
                    value.includes(syntheticFile.name) ||
                    value.includes(syntheticFile.content) ||
                    value.includes("pendingImportFile")
            );
        }, file);
        expect(storageLeak).toBe(false);
        expect(page.url()).not.toContain(file.name);
        expect(page.url()).not.toContain("P15");

        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(page).toHaveURL(/\/transactions$/);
        await expect(page.getByTestId("transaction-table-toolbar")).toContainText("0 transactions");
        await page.goBack();
        await expect(page).toHaveURL(/\/imports\/new$/);
        await expect(page.getByTestId("file-dropzone")).toBeVisible();
        await expect(page.getByText(file.name, { exact: true })).toHaveCount(0);
        await page.goBack();
        await expect(page).toHaveURL(/\/transactions$/);

        await dispatchImportDrag(target, "drop", [file]);
        await expect(page).toHaveURL(/\/imports\/new$/);
        await expect(page.getByText(file.name, { exact: true })).toBeVisible();

        await page.getByRole("tab", { name: /Columns/i }).click();
        await page.getByRole("button", { name: /Auto-detect/i }).click();
        await expect(page.getByText(/All required fields mapped/i)).toBeVisible();
        await page.getByRole("tab", { name: /Account/i }).click();
        await page.locator("#account-select").click();
        await page.getByRole("option", { name: /Default/i }).click();
        await page.getByRole("button", { name: /Import 60 Transactions/i }).click();
        await expect(page).toHaveURL(/\/transactions$/);
        await expect(page.getByTestId("transaction-table-toolbar")).toContainText(
            "60 transactions"
        );
        expect(await page.locator("[data-transaction-id]").count()).toBeLessThan(60);

        const firstVirtualRow = page.getByRole("row", {
            name: /P15 transaction drop 0000/
        });
        const transactionScroller = page.getByTestId("transaction-table").locator("..");
        await expect(firstVirtualRow).toBeVisible();
        await dispatchImportDrag(target, "dragenter", [file]);
        await dispatchImportDrag(firstVirtualRow, "dragenter", [file]);
        await expect(page.getByTestId("import-drop-overlay")).toBeVisible();
        await transactionScroller.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
        });
        await expect(firstVirtualRow).toHaveCount(0);
        await dispatchImportDrag(target, "dragleave", [file]);
        await expect(page.getByTestId("import-drop-overlay")).toHaveCount(0);
        await transactionScroller.evaluate((element) => {
            element.scrollTop = 0;
        });

        const filteredDescription = "P15 transaction drop 0059";
        await page.getByPlaceholder(/Search/i).fill(filteredDescription);
        const filteredRow = page.getByRole("row", { name: new RegExp(filteredDescription) });
        await expect(filteredRow).toBeVisible();
        const followUpFile = {
            content: "Date,Description,Amount\n2026-07-25,P15 filtered row drop,99.00",
            name: "p15-filtered-row.csv",
            type: "text/csv"
        };
        await dispatchImportDrag(filteredRow, "dragenter", [followUpFile]);
        await expect(page.getByTestId("import-drop-overlay")).toBeVisible();
        await dispatchImportDrag(filteredRow, "drop", [followUpFile]);
        await expect(page).toHaveURL(/\/imports\/new$/);
        await expect(page.getByText(followUpFile.name, { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(page).toHaveURL(/\/transactions$/);
        await expect(page.getByTestId("transaction-table-toolbar")).toContainText(
            "60 transactions"
        );
    });

    test("imports surface overlay is stable for nested and outside drag transitions", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToImports(page);
        const file = {
            content: "Date,Description,Amount\n2026-07-25,P15 nested drag,1.00",
            name: "p15-nested.csv",
            type: "text/csv"
        };
        const target = page.locator("main > div").first();
        const child = page.getByRole("heading", { name: "Imports", level: 1 });

        await dispatchImportDrag(target, "dragenter", [file]);
        await expect(page.getByText("Drop file to import", { exact: true })).toBeVisible();
        await dispatchImportDrag(child, "dragenter", [file]);
        await dispatchImportDrag(child, "dragleave", [file]);
        await expect(page.getByText("Drop file to import", { exact: true })).toBeVisible();
        await dispatchImportDrag(target, "dragleave", [file]);
        await expect(page.getByText("Drop file to import", { exact: true })).toHaveCount(0);

        await dispatchImportDrag(target, "dragenter", [file]);
        await dispatchImportDrag(page.locator("body"), "dragend", [file]);
        await expect(page.getByTestId("import-drop-overlay")).toHaveCount(0);
        await expect(page).toHaveURL(/\/imports$/);
    });

    test("imports drop rejects invalid payloads before navigation with actionable alerts", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToImports(page);
        const target = page.locator("main > div").first();
        const valid = {
            content: "Date,Description,Amount\n2026-07-25,P15 valid,1.00",
            name: "p15-valid.csv",
            type: "text/csv"
        };
        const invalidCases = [
            {
                files: [valid, { ...valid, name: "p15-second.csv" }],
                message: /one file at a time/i
            },
            {
                files: [{ content: "", name: "p15-empty.csv", type: "text/csv" }],
                message: /empty/i
            },
            {
                files: [
                    {
                        content: "",
                        name: "p15-large.csv",
                        size: 10 * 1024 * 1024 + 1,
                        type: "text/csv"
                    }
                ],
                message: /10 MiB/i
            },
            {
                files: [
                    {
                        content: "<html>not a bank export</html>",
                        name: "p15-spoofed.csv",
                        type: "text/csv"
                    }
                ],
                message: /content/i
            },
            {
                files: [
                    {
                        content: "%PDF",
                        name: "p15-unsupported.pdf",
                        type: "application/pdf"
                    }
                ],
                message: /CSV, OFX, or QFX/i
            },
            {
                files: [
                    {
                        content: valid.content,
                        name: "p15-mime.csv",
                        type: "image/png"
                    }
                ],
                message: /content type/i
            }
        ];

        for (const invalidCase of invalidCases) {
            const picker = page.getByRole("button", { name: "Import new file" });
            await picker.focus();
            await dispatchImportDrag(target, "dragenter", invalidCase.files);
            await dispatchImportDrag(target, "drop", invalidCase.files);
            await expect(
                page.getByTestId("imports-import-drop-target").getByRole("alert")
            ).toContainText(invalidCase.message);
            await expect(picker).toBeFocused();
            await expect(page).toHaveURL(/\/imports$/);
            await expect(page.getByRole("heading", { name: "Imports", level: 1 })).toBeVisible();
        }
    });

    test("imports surface drops OFX and QFX into preview without implicit import", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToImports(page);
        const ofxPath = createSampleOFX();
        const content = fs.readFileSync(ofxPath, "utf8");
        const target = page.getByTestId("imports-import-drop-target");

        for (const extension of ["ofx", "qfx"]) {
            const file = {
                content,
                name: `p15-preview.${extension}`,
                type: extension === "ofx" ? "application/x-ofx" : "application/octet-stream"
            };
            await dispatchImportDrag(target, "drop", [file]);
            await expect(page).toHaveURL(/\/imports\/new$/);
            await expect(page.getByText(file.name, { exact: true })).toBeVisible();
            await expect(page.getByText(/OFX • \d+ rows/i)).toBeVisible();
            await page.getByRole("button", { name: "Cancel" }).click();
            await expect(page).toHaveURL(/\/imports$/);
            await expect(page.getByRole("row", { name: new RegExp(file.name) })).toHaveCount(0);
        }

        fs.unlinkSync(ofxPath);
    });

    test("XML OFX picker and both surface drops reach preview without implicit import", async ({
        page
    }) => {
        await createNewIdentity(page);
        await goToImportNew(page);

        const pickerFile = {
            name: "p15-xml-picker.ofx",
            mimeType: "application/x-ofx",
            buffer: Buffer.from(XML_OFX_CONTENT)
        };
        await page.locator('input[type="file"]').setInputFiles(pickerFile);
        await expect(page.getByText(pickerFile.name, { exact: true })).toBeVisible();
        await expect(page.getByText(/OFX • \d+ rows?/i)).toBeVisible();
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(page).toHaveURL(/\/imports$/);
        await expect(page.getByRole("row", { name: new RegExp(pickerFile.name) })).toHaveCount(0);

        const surfaceCases = [
            {
                name: "p15-xml-imports.ofx",
                sourcePath: /\/imports$/,
                targetTestId: "imports-import-drop-target"
            },
            {
                name: "p15-xml-transactions.ofx",
                sourcePath: /\/transactions$/,
                targetTestId: "transaction-import-drop-target"
            }
        ] as const;

        for (const surfaceCase of surfaceCases) {
            if (surfaceCase.targetTestId === "transaction-import-drop-target") {
                await page.getByRole("link", { name: "Transactions", exact: true }).click();
                await page.getByTestId("transaction-table-toolbar").waitFor();
            }
            const file = {
                content: XML_OFX_CONTENT,
                name: surfaceCase.name,
                type: "application/x-ofx"
            };
            await dispatchImportDrag(page.getByTestId(surfaceCase.targetTestId), "drop", [file]);
            await expect(page).toHaveURL(/\/imports\/new$/);
            await expect(page.getByText(file.name, { exact: true })).toBeVisible();
            await expect(page.getByText(/OFX • \d+ rows?/i)).toBeVisible();
            await page.getByRole("button", { name: "Cancel" }).click();
            await expect(page).toHaveURL(surfaceCase.sourcePath);
        }
    });

    test("renamed JSON is rejected by picker and both surface drops", async ({ page }) => {
        await createNewIdentity(page);
        const renamedJson = {
            content: '{"date":"2026-07-25","description":"P15 JSON","amount":4.25}',
            name: "p15-renamed-json.csv",
            type: "text/csv"
        };

        await goToImportNew(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: renamedJson.name,
            mimeType: renamedJson.type,
            buffer: Buffer.from(renamedJson.content)
        });
        await expect(page.getByTestId("file-dropzone").getByRole("alert")).toBeVisible();
        await expect(page).toHaveURL(/\/imports\/new$/);
        await expect(page.getByText(/CSV • \d+ rows?/i)).toHaveCount(0);

        await goToImports(page);
        const importsPicker = page.getByRole("button", { name: "Import new file" });
        await importsPicker.focus();
        await dispatchImportDrag(page.getByTestId("imports-import-drop-target"), "drop", [
            renamedJson
        ]);
        await expect(
            page.getByTestId("imports-import-drop-target").getByRole("alert")
        ).toBeVisible();
        await expect(importsPicker).toBeFocused();
        await expect(page).toHaveURL(/\/imports$/);

        await page.getByRole("link", { name: "Transactions", exact: true }).click();
        await page.getByTestId("transaction-table-toolbar").waitFor();
        const transactionTarget = page.getByTestId("transaction-import-drop-target");
        await dispatchImportDrag(transactionTarget, "drop", [renamedJson]);
        await expect(transactionTarget.getByRole("alert")).toBeVisible();
        await expect(page).toHaveURL(/\/transactions$/);
    });

    test("drop guidance and alerts meet theme contrast and zoomed visible geometry", async ({
        page
    }) => {
        await createNewIdentity(page);
        await page.setViewportSize({ width: 390, height: 844 });
        const valid = {
            content: "Date,Description,Amount\n2026-07-25,P15 geometry,1.00",
            name: "p15-geometry.csv",
            type: "text/csv"
        };
        const invalid = {
            content: '{"date":"2026-07-25","amount":1.00}',
            name: "p15-geometry-json.csv",
            type: "text/csv"
        };
        const surfaceCases = [
            {
                dark: false,
                targetTestId: "imports-import-drop-target"
            },
            {
                dark: true,
                targetTestId: "transaction-import-drop-target"
            }
        ] as const;

        for (const surfaceCase of surfaceCases) {
            await page.evaluate(() => {
                document.documentElement.style.zoom = "1";
            });
            if (surfaceCase.targetTestId === "imports-import-drop-target") {
                await goToImports(page);
            } else {
                await goToTransactions(page);
            }
            await page.evaluate((dark) => {
                document.documentElement.classList.toggle("dark", dark);
                document.documentElement.style.zoom = "2";
            }, surfaceCase.dark);

            const target = page.getByTestId(surfaceCase.targetTestId);
            await dispatchImportDrag(target, "dragenter", [valid]);
            const guidance = page.getByTestId("import-drop-guidance");
            await expect(guidance).toBeVisible();
            await expectFloatingWithinVisibleTarget(page, target, guidance);

            await dispatchImportDrag(target, "drop", [invalid]);
            const alert = target.getByRole("alert");
            await expect(alert).toBeVisible();
            await expectFloatingWithinVisibleTarget(page, target, alert);
            expect(await measuredContrastRatio(alert)).toBeGreaterThanOrEqual(4.5);
            await expect(page).toHaveURL(
                surfaceCase.targetTestId === "imports-import-drop-target"
                    ? /\/imports$/
                    : /\/transactions$/
            );
        }

        await page.evaluate(() => {
            document.documentElement.classList.remove("dark");
            document.documentElement.style.zoom = "1";
        });
    });

    test("CSV and OFX lineage survives edits/reload and delete is isolated one-step history", async ({
        page
    }) => {
        await createNewIdentity(page);
        const csvFilename = "p14-lineage-a.csv";
        const ofxFilename = "p14-lineage-b.ofx";
        const liveCsvDescriptions = [
            "P14 CSV negative",
            "P14 CSV positive",
            "P14 CSV zero"
        ] as const;
        const independentlyDeletedDescription = "P14 CSV independently deleted";
        const ofxDescription = "P14 OFX survivor";
        const manualDescription = "P14 manual survivor";
        let csvTransactionIds: string[] = [];
        let independentlyDeletedTransactionId = "";
        let ofxTransactionId = "";
        let manualTransactionId = "";
        const transactionId = async (description: string): Promise<string> => {
            const id = await page
                .getByRole("row", { name: new RegExp(description) })
                .getAttribute("data-transaction-id");
            if (!id) throw new Error(`Missing transaction identity for ${description}`);
            return id;
        };

        await test.step("import the target CSV with negative and zero minor-unit values", async () => {
            await goToImportNew(page);
            await page.locator('input[type="file"]').setInputFiles({
                name: csvFilename,
                mimeType: "text/csv",
                buffer: Buffer.from(
                    [
                        "Date,Description,Amount",
                        "2026-06-01,P14 CSV negative,-12.50",
                        "2026-06-02,P14 CSV positive,4.25",
                        "2026-06-03,P14 CSV zero,0.00",
                        `2026-06-04,${independentlyDeletedDescription},8.50`
                    ].join("\n")
                )
            });
            await page.getByRole("tab", { name: /Columns/i }).click();
            await page.getByRole("button", { name: /Auto-detect/i }).click();
            await expect(page.getByText(/All required fields mapped/i)).toBeVisible();
            await page.getByRole("tab", { name: /Account/i }).click();
            await page.locator("#account-select").click();
            await page.getByRole("option", { name: /Default/i }).click();
            await page.getByRole("button", { name: /Import 4 Transactions/i }).click();
            await expect(page).toHaveURL(/\/transactions/);
        });

        await test.step("capture the first amount once and expose it accessibly after reload", async () => {
            let row = page.getByRole("row", { name: /P14 CSV negative/i });
            let amount = row.getByTestId("amount-editable");
            await amount.fill("-20.75");
            await amount.press("Enter");
            await amount.fill("-30.25");
            await amount.press("Enter");
            await expect(amount).toHaveValue("-30.25");
            await expect(amount).toHaveAttribute(
                "aria-description",
                /Original imported amount: -USD\s12\.50/
            );
            await amount.hover();
            await expect(
                page
                    .getByTestId("original-amount-tooltip")
                    .filter({ hasText: /Original imported amount: -USD\s12\.50/ })
            ).toBeVisible();

            const uneditedZero = page
                .getByRole("row", { name: /P14 CSV zero/i })
                .getByTestId("amount-editable");
            await expect(uneditedZero).not.toHaveAttribute("aria-description");

            await page.reload();
            row = page.getByRole("row", { name: /P14 CSV negative/i });
            amount = row.getByTestId("amount-editable");
            await expect(amount).toHaveValue("-30.25");
            await amount.focus();
            await expect(
                page
                    .getByTestId("original-amount-tooltip")
                    .filter({ hasText: /Original imported amount: -USD\s12\.50/ })
            ).toBeVisible();
        });

        await test.step("ordinary deletion leaves exactly three live linked identities", async () => {
            csvTransactionIds = await Promise.all(
                liveCsvDescriptions.map((description) => transactionId(description))
            );
            independentlyDeletedTransactionId = await transactionId(
                independentlyDeletedDescription
            );

            const independentlyDeletedRow = page.getByRole("row", {
                name: new RegExp(independentlyDeletedDescription)
            });
            await independentlyDeletedRow.getByTestId("delete-button").click();
            await independentlyDeletedRow.getByTestId("delete-button").click();
            await expect(
                page.locator(`[data-transaction-id="${independentlyDeletedTransactionId}"]`)
            ).toHaveCount(0);
            for (const id of csvTransactionIds)
                await expect(page.locator(`[data-transaction-id="${id}"]`)).toBeVisible();
        });

        await test.step("add a manual row and import a distinct OFX batch", async () => {
            manualTransactionId = await addEmptyTransaction(page);
            const manualRow = page.locator(`[data-transaction-id="${manualTransactionId}"]`);
            await manualRow.getByTestId("description-editable").fill(manualDescription);
            await manualRow.getByTestId("description-editable").press("Enter");
            await manualRow.getByTestId("amount-editable").fill("7.77");
            await manualRow.getByTestId("amount-editable").press("Enter");

            await goToImportNew(page);
            await page.locator('input[type="file"]').setInputFiles({
                name: ofxFilename,
                mimeType: "application/x-ofx",
                buffer: Buffer.from(`OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<DTSERVER>20260604120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>P14-B
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>P14B
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260603
<DTEND>20260604
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260603
<TRNAMT>3.21
<FITID>P14-OFX-B-1
<NAME>${ofxDescription}
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>3.21
<DTASOF>20260604
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`)
            });
            await expect(page.getByText(/OFX • \d+ rows/i)).toBeVisible();
            await page.getByRole("tab", { name: /Account/i }).click();
            await page.locator("#account-select").click();
            await page.getByRole("option", { name: /Default/i }).click();
            await page.getByRole("button", { name: /Import 1 Transaction/i }).click();
            await expect(page).toHaveURL(/\/transactions/);
            await expect(page.getByRole("row", { name: new RegExp(ofxDescription) })).toBeVisible();
            ofxTransactionId = await transactionId(ofxDescription);
        });

        await test.step("delete only the chosen import and describe the boundary precisely", async () => {
            await goToImports(page);
            const targetImport = page.getByRole("row", { name: new RegExp(csvFilename) });
            await expect(targetImport.getByRole("cell").nth(1)).toHaveText("3");
            await targetImport
                .getByRole("button", { name: new RegExp(`Delete import ${csvFilename}`) })
                .click();
            const dialog = page.getByRole("alertdialog");
            await expect(dialog).toContainText("3 transactions");
            await expect(dialog).toContainText("Transactions from other imports");
            await expect(dialog).toContainText("added manually will not be deleted");
            await expect(dialog).toContainText("undo this as one action");
            await page.getByTestId("confirm-delete-import").click();
            await expect(page.getByRole("row", { name: new RegExp(csvFilename) })).toHaveCount(0);
            await expect(page.getByRole("row", { name: new RegExp(ofxFilename) })).toBeVisible();

            await page.getByRole("link", { name: "Transactions", exact: true }).click();
            await page.getByTestId("transaction-table-toolbar").waitFor();
            for (const id of csvTransactionIds)
                await expect(page.locator(`[data-transaction-id="${id}"]`)).toHaveCount(0);
            await expect(
                page.locator(`[data-transaction-id="${independentlyDeletedTransactionId}"]`)
            ).toHaveCount(0);
            await expect(page.locator(`[data-transaction-id="${ofxTransactionId}"]`)).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${manualTransactionId}"]`)
            ).toBeVisible();
        });

        await test.step("one Undo restores the exact import and one Redo removes it again", async () => {
            await page.getByRole("button", { name: "Undo" }).click();
            for (const id of csvTransactionIds)
                await expect(page.locator(`[data-transaction-id="${id}"]`)).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${independentlyDeletedTransactionId}"]`)
            ).toHaveCount(0);
            await expect(page.locator(`[data-transaction-id="${ofxTransactionId}"]`)).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${manualTransactionId}"]`)
            ).toBeVisible();

            await page.getByRole("link", { name: "Imports", exact: true }).click();
            await page.getByRole("heading", { name: "Imports", level: 1 }).waitFor();
            await expect(page.getByRole("row", { name: new RegExp(csvFilename) })).toBeVisible();
            await page.getByRole("link", { name: "Transactions", exact: true }).click();
            await page.getByTestId("transaction-table-toolbar").waitFor();
            await page.getByRole("button", { name: "Redo" }).click();
            for (const id of csvTransactionIds)
                await expect(page.locator(`[data-transaction-id="${id}"]`)).toHaveCount(0);
            await expect(
                page.locator(`[data-transaction-id="${independentlyDeletedTransactionId}"]`)
            ).toHaveCount(0);
            await expect(page.locator(`[data-transaction-id="${ofxTransactionId}"]`)).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${manualTransactionId}"]`)
            ).toBeVisible();
        });
    });

    test("nested duplicate import count matches its reversible exact deletion", async ({
        page
    }) => {
        await createNewIdentity(page);
        const parentFilename = "p14-nested-parent.csv";
        const nestedFilename = "p14-nested-child.csv";
        const unrelatedFilename = "p14-nested-unrelated.csv";
        const duplicateDescription = "P14 nested duplicate identity";
        const unrelatedDescription = "P14 nested unrelated survivor";
        const importSingleCsv = async (
            filename: string,
            date: string,
            description: string,
            amount: string
        ) => {
            await goToImportNew(page);
            await page.locator('input[type="file"]').setInputFiles({
                name: filename,
                mimeType: "text/csv",
                buffer: Buffer.from(
                    ["Date,Description,Amount", `${date},${description},${amount}`].join("\n")
                )
            });
            await page.getByRole("tab", { name: /Columns/i }).click();
            await page.getByRole("button", { name: /Auto-detect/i }).click();
            await expect(page.getByText(/All required fields mapped/i)).toBeVisible();
            await page.getByRole("tab", { name: /Account/i }).click();
            await page.locator("#account-select").click();
            await page.getByRole("option", { name: /Default/i }).click();
            await page.getByRole("button", { name: /Import 1 Transaction/i }).click();
            await expect(page).toHaveURL(/\/transactions/);
        };

        await test.step("ordinary identical imports create one parent and one nested identity", async () => {
            await importSingleCsv(parentFilename, "2026-06-10", duplicateDescription, "12.34");
            await importSingleCsv(nestedFilename, "2026-06-10", duplicateDescription, "12.34");
        });

        const parentRow = page.getByRole("row", { name: new RegExp(duplicateDescription) });
        const parentTransactionId = await parentRow.getAttribute("data-transaction-id");
        if (!parentTransactionId) throw new Error("Missing nested duplicate parent identity");
        await expect(parentRow.getByTitle("Potential duplicate")).toBeVisible();

        let manualTransactionId = "";
        let unrelatedTransactionId = "";
        await test.step("add unrelated manual and imported survivors", async () => {
            manualTransactionId = await addEmptyTransaction(page);
            const manualRow = page.locator(`[data-transaction-id="${manualTransactionId}"]`);
            await manualRow.getByTestId("description-editable").fill("P14 nested manual survivor");
            await manualRow.getByTestId("description-editable").press("Enter");

            await importSingleCsv(unrelatedFilename, "2026-06-11", unrelatedDescription, "45.67");
            unrelatedTransactionId =
                (await page
                    .getByRole("row", { name: new RegExp(unrelatedDescription) })
                    .getAttribute("data-transaction-id")) ?? "";
            if (!unrelatedTransactionId) {
                throw new Error("Missing nested journey unrelated import identity");
            }
        });

        await test.step("parent and nested imports each report one current logical identity", async () => {
            await goToImports(page);
            const parentImport = page.getByRole("row", { name: new RegExp(parentFilename) });
            const nestedImport = page.getByRole("row", { name: new RegExp(nestedFilename) });
            const unrelatedImport = page.getByRole("row", {
                name: new RegExp(unrelatedFilename)
            });

            await expect(parentImport.getByRole("cell").nth(1)).toHaveText("1");
            await expect(nestedImport.getByRole("cell").nth(1)).toHaveText("1");
            await expect(unrelatedImport.getByRole("cell").nth(1)).toHaveText("1");
            await nestedImport
                .getByRole("button", { name: new RegExp(`Delete import ${nestedFilename}`) })
                .click();
            await expect(page.getByRole("alertdialog")).toContainText("1 transaction");
            await page.getByTestId("confirm-delete-import").click();
            await expect(nestedImport).toHaveCount(0);
            await expect(parentImport).toBeVisible();
            await expect(unrelatedImport).toBeVisible();
        });

        await test.step("delete, Undo and Redo affect only the exact nested identity and record", async () => {
            await page.getByRole("link", { name: "Transactions", exact: true }).click();
            await page.getByTestId("transaction-table-toolbar").waitFor();
            const preservedParent = page.locator(`[data-transaction-id="${parentTransactionId}"]`);
            await expect(preservedParent).toBeVisible();
            await expect(preservedParent.getByTitle("Potential duplicate")).toHaveCount(0);
            await expect(
                page.locator(`[data-transaction-id="${unrelatedTransactionId}"]`)
            ).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${manualTransactionId}"]`)
            ).toBeVisible();

            await page.getByRole("button", { name: "Undo" }).click();
            await expect(preservedParent.getByTitle("Potential duplicate")).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${unrelatedTransactionId}"]`)
            ).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${manualTransactionId}"]`)
            ).toBeVisible();
            await page.getByRole("link", { name: "Imports", exact: true }).click();
            await page.getByRole("heading", { name: "Imports", level: 1 }).waitFor();
            await expect(page.getByRole("row", { name: new RegExp(nestedFilename) })).toBeVisible();

            await page.getByRole("link", { name: "Transactions", exact: true }).click();
            await page.getByTestId("transaction-table-toolbar").waitFor();
            await page.getByRole("button", { name: "Redo" }).click();
            await expect(preservedParent).toBeVisible();
            await expect(preservedParent.getByTitle("Potential duplicate")).toHaveCount(0);
            await expect(
                page.locator(`[data-transaction-id="${unrelatedTransactionId}"]`)
            ).toBeVisible();
            await expect(
                page.locator(`[data-transaction-id="${manualTransactionId}"]`)
            ).toBeVisible();
            await page.getByRole("link", { name: "Imports", exact: true }).click();
            await page.getByRole("heading", { name: "Imports", level: 1 }).waitFor();
            await expect(page.getByRole("row", { name: new RegExp(nestedFilename) })).toHaveCount(
                0
            );
            await expect(page.getByRole("row", { name: new RegExp(parentFilename) })).toBeVisible();
            await expect(
                page.getByRole("row", { name: new RegExp(unrelatedFilename) })
            ).toBeVisible();
        });
    });

    test("original amount tooltip stays inside the zoomed virtualized viewport", async ({
        page
    }) => {
        await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
        await createNewIdentity(page);

        const descriptions = Array.from(
            { length: 14 },
            (_, index) => `P14 tooltip row ${String(index).padStart(2, "0")}`
        );
        await goToImportNew(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: "p14-tooltip-geometry.csv",
            mimeType: "text/csv",
            buffer: Buffer.from(
                [
                    "Date,Description,Amount",
                    ...descriptions.map(
                        (description, index) =>
                            `2026-07-24,${description},${(index + 1).toFixed(2)}`
                    )
                ].join("\n")
            )
        });
        await page.getByRole("tab", { name: /Columns/i }).click();
        await page.getByRole("button", { name: /Auto-detect/i }).click();
        await expect(page.getByText(/All required fields mapped/i)).toBeVisible();
        await page.getByRole("tab", { name: /Account/i }).click();
        await page.locator("#account-select").click();
        await page.getByRole("option", { name: /Default/i }).click();
        await page.getByRole("button", { name: /Import 14 Transactions/i }).click();
        await expect(page).toHaveURL(/\/transactions/);

        for (const [index, description] of [
            [0, descriptions[0]],
            [5, descriptions[5]],
            [10, descriptions[10]]
        ] as const) {
            const amount = page
                .getByRole("row", { name: new RegExp(description) })
                .getByTestId("amount-editable");
            await amount.fill(String(index + 2));
            await amount.press("Enter");
            await expect(amount).toHaveAttribute(
                "aria-description",
                new RegExp(`Original imported amount: USD\\s${index + 1}\\.00`)
            );
        }

        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
        });

        const transactionScroller = page.getByTestId("transaction-table").locator("..");
        const tooltipGeometry = async (expectedText: RegExp) => {
            const tooltip = page
                .getByTestId("original-amount-tooltip")
                .filter({ hasText: expectedText });
            await expect(tooltip).toBeVisible();
            await expect(tooltip).toContainText(expectedText);
            return tooltip.evaluate((element) => {
                const box = element.getBoundingClientRect();
                const arrowBox = element.querySelector("svg")?.getBoundingClientRect();
                const textBoxes = Array.from(element.childNodes).flatMap((node) => {
                    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return [];
                    const range = document.createRange();
                    range.selectNodeContents(node);
                    return Array.from(range.getClientRects()).map((rect) => ({
                        bottom: rect.bottom,
                        left: rect.left,
                        right: rect.right,
                        top: rect.top
                    }));
                });
                return {
                    arrow:
                        arrowBox == null
                            ? undefined
                            : {
                                  bottom: arrowBox.bottom,
                                  left: arrowBox.left,
                                  right: arrowBox.right,
                                  top: arrowBox.top
                              },
                    box: {
                        bottom: box.bottom,
                        left: box.left,
                        right: box.right,
                        top: box.top
                    },
                    textBoxes
                };
            });
        };
        const expectContained = async (
            description: string,
            expectedText: RegExp,
            interaction: "focus" | "hover"
        ) => {
            await page.evaluate(() => {
                if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            });
            await page.mouse.move(0, 0);

            const amount = page
                .getByRole("row", { name: new RegExp(description) })
                .getByTestId("amount-editable");
            await expect(amount).toBeVisible();
            if (interaction === "focus") {
                await amount.focus();
            } else {
                await amount.hover({ force: true });
            }

            const viewport = await page.evaluate(() => ({
                bottom: window.innerHeight,
                left: 0,
                right: window.innerWidth,
                top: 0
            }));
            const geometryIsContained = async () => {
                const geometry = await tooltipGeometry(expectedText);
                const boxes = [
                    geometry.box,
                    ...geometry.textBoxes,
                    ...(geometry.arrow == null ? [] : [geometry.arrow])
                ];
                return boxes.every(
                    (box) =>
                        box.left >= viewport.left &&
                        box.top >= viewport.top &&
                        box.right <= viewport.right &&
                        box.bottom <= viewport.bottom
                );
            };
            await expect
                .poll(geometryIsContained, {
                    message: `${description} ${interaction} tooltip geometry`
                })
                .toBe(true);
            const geometry = await tooltipGeometry(expectedText);
            expect(
                await geometryIsContained(),
                `${description} ${interaction}: ${JSON.stringify({ geometry, viewport })}`
            ).toBe(true);
            await expect(amount).toHaveAttribute("aria-description", expectedText);
        };

        await test.step("first-row focus and hover are the favorable control", async () => {
            await transactionScroller.evaluate((element) => {
                element.scrollLeft = element.scrollWidth;
                element.scrollTop = 0;
            });
            await expectContained(descriptions[0], /Original imported amount: USD\s1\.00/, "hover");
            await expectContained(descriptions[0], /Original imported amount: USD\s1\.00/, "focus");
        });

        await test.step("lower visible row focus and hover remain contained", async () => {
            const amount = page
                .getByRole("row", { name: new RegExp(descriptions[10]) })
                .getByTestId("amount-editable");
            await amount.scrollIntoViewIfNeeded();
            await expectContained(
                descriptions[10],
                /Original imported amount: USD\s11\.00/,
                "hover"
            );
            await expectContained(
                descriptions[10],
                /Original imported amount: USD\s11\.00/,
                "focus"
            );
        });

        await test.step("right-offset virtual row focus and hover remain contained", async () => {
            await transactionScroller.evaluate((element) => {
                element.scrollLeft = Math.round((element.scrollWidth - element.clientWidth) * 0.75);
                element.scrollTop = 5 * 44;
            });
            const amount = page
                .getByRole("row", { name: new RegExp(descriptions[5]) })
                .getByTestId("amount-editable");
            await amount.scrollIntoViewIfNeeded();
            await expectContained(descriptions[5], /Original imported amount: USD\s6\.00/, "hover");
            await expectContained(descriptions[5], /Original imported amount: USD\s6\.00/, "focus");
        });
    });

    test("CSV import journey: upload, configure tabs, and see preview", async ({ page }) => {
        await createNewIdentity(page);

        let csvPath: string;

        await test.step("navigate to import page with file dropzone", async () => {
            await goToImportNew(page);

            await expect(page.getByRole("heading", { name: /Import Transactions/i })).toBeVisible();
            await expect(page.locator('[data-testid="file-dropzone"]')).toBeVisible();
        });

        await test.step("upload CSV file and see split preview", async () => {
            csvPath = createSampleBankCSV();

            const picker = page.getByRole("button", {
                name: "Choose a CSV, OFX, or QFX file"
            });
            await picker.focus();
            await expect(picker).toBeFocused();
            const fileChooser = page.waitForEvent("filechooser");
            await picker.press("Enter");
            await (await fileChooser).setFiles(csvPath);

            // Should show file name and stats (6 rows including header)
            await expect(page.getByText(/\.csv/i)).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText(/6 rows/i)).toBeVisible();
        });

        await test.step("preserve named keyboard tabs and labelled panels on mobile", async () => {
            await page.setViewportSize({ width: 320, height: 720 });

            const tabNames = ["Template", "Columns", "Format", "Duplicates", "Account"] as const;
            const templateTab = page.getByRole("tab", { name: "Template", exact: true });

            await expect(templateTab).toHaveCount(1);
            await templateTab.focus();

            for (const tabName of tabNames) {
                const tab = page.getByRole("tab", { name: tabName, exact: true });
                const panel = page.getByRole("tabpanel", { name: tabName, exact: true });

                await expect(tab).toHaveCount(1);
                await expect(tab).toBeFocused();
                await expect(tab).toHaveAttribute("aria-selected", "true");
                await expect(panel).toBeVisible();

                const tabId = await tab.getAttribute("id");
                const panelId = await panel.getAttribute("id");

                expect(tabId).toBeTruthy();
                expect(panelId).toBeTruthy();
                await expect(tab).toHaveAttribute("aria-controls", panelId ?? "missing-panel-id");
                await expect(panel).toHaveAttribute("aria-labelledby", tabId ?? "missing-tab-id");

                await tab.press("ArrowRight");
            }

            await expect(templateTab).toBeFocused();
            await expect(templateTab).toHaveAttribute("aria-selected", "true");

            await page.setViewportSize({ width: 1280, height: 720 });
        });

        await test.step("verify tabbed configuration panel", async () => {
            // Should show config tabs
            await expect(page.getByRole("tab", { name: /Template/i })).toBeVisible();
            await expect(page.getByRole("tab", { name: /Columns/i })).toBeVisible();
            await expect(page.getByRole("tab", { name: /Format/i })).toBeVisible();
            await expect(page.getByRole("tab", { name: /Duplicates/i })).toBeVisible();
            await expect(page.getByRole("tab", { name: /Account/i })).toBeVisible();
        });

        await test.step("access column mapping tab", async () => {
            await page.getByRole("tab", { name: /Columns/i }).click();

            // Should show column mapping controls
            await expect(page.getByText(/date|amount|description/i).first()).toBeVisible();
        });

        await test.step("access account tab and see selection required", async () => {
            await page.getByRole("tab", { name: /Account/i }).click();

            // Should show account selector
            await expect(page.getByText(/target account/i)).toBeVisible();
        });

        await test.step("verify summary statistics", async () => {
            // Should show summary stats
            await expect(page.getByText(/total rows/i)).toBeVisible();
            // "Valid" label in summary card
            await expect(page.getByText("Valid", { exact: true })).toBeVisible();
        });

        await test.step("cleanup", async () => {
            fs.unlinkSync(csvPath);
        });
    });

    test("OFX import journey: upload and see auto-parsed data", async ({ page }) => {
        await createNewIdentity(page);

        let ofxPath: string;

        await test.step("navigate to import page", async () => {
            await goToImportNew(page);
            await expect(page.locator('[data-testid="file-dropzone"]')).toBeVisible();
        });

        await test.step("upload OFX file", async () => {
            ofxPath = createSampleOFX();

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles(ofxPath);

            // Should show file type as "OFX" in the header stats
            await expect(page.getByText(/OFX • \d+ rows/i)).toBeVisible({ timeout: 15_000 });
        });

        await test.step("verify OFX-specific tab visibility", async () => {
            // OFX should NOT show Columns or Format tabs (they're CSV-only)
            await expect(page.getByRole("tab", { name: /Template/i })).toBeVisible();
            await expect(page.getByRole("tab", { name: /Duplicates/i })).toBeVisible();
            await expect(page.getByRole("tab", { name: /Account/i })).toBeVisible();
        });

        await test.step("verify transactions are parsed", async () => {
            // Should show import button with transaction count
            await expect(
                page.getByRole("button", { name: /Import \d+ Transactions/i })
            ).toBeVisible();
        });

        await test.step("cleanup", async () => {
            fs.unlinkSync(ofxPath);
        });
    });

    test("import page shows supported formats", async ({ page }) => {
        await createNewIdentity(page);
        await goToImportNew(page);

        // Should mention supported formats
        await expect(page.getByText(/csv|ofx/i).first()).toBeVisible();
    });

    test("duplicate detection settings are configurable", async ({ page }) => {
        await createNewIdentity(page);

        let csvPath: string;

        await test.step("upload CSV file", async () => {
            await goToImportNew(page);
            csvPath = createSampleBankCSV();

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles(csvPath);

            // 6 rows including header
            await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 15_000 });
        });

        await test.step("access duplicates tab", async () => {
            await page.getByRole("tab", { name: /Duplicates/i }).click();

            // Should show duplicate detection section
            await expect(page.getByText(/duplicate detection/i)).toBeVisible();
        });

        await test.step("configure date matching", async () => {
            // Should show date matching options
            await expect(page.getByText(/date matching/i)).toBeVisible();
            await expect(page.getByLabel(/exact date match/i)).toBeVisible();
        });

        await test.step("configure description matching", async () => {
            // Should show description matching options
            await expect(page.getByText(/description matching/i)).toBeVisible();
        });

        await test.step("configure old transaction filter", async () => {
            // Should show old transaction filter section with new label
            await expect(page.getByText(/how to handle old transactions/i)).toBeVisible();
            // Should show filter mode options (one of the radio options) - use first() to handle duplicates
            await expect(page.getByText(/import all old transactions/i).first()).toBeVisible();
        });

        await test.step("cleanup", async () => {
            fs.unlinkSync(csvPath);
        });
    });

    test("CSV import creates transactions and auto-saves template on first import", async ({
        page
    }) => {
        await createNewIdentity(page);

        let csvPath: string;

        await test.step("upload CSV file", async () => {
            await goToImportNew(page);
            csvPath = createSampleBankCSV();

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles(csvPath);

            await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 15_000 });
        });

        await test.step("configure column mappings", async () => {
            await page.getByRole("tab", { name: /Columns/i }).click();
            // Wait for tab panel to be visible
            const autoDetectBtn = page.getByRole("button", { name: /Auto-detect/i });
            await expect(autoDetectBtn).toBeVisible();
            // Click "Auto-detect" button to map columns
            await autoDetectBtn.click();
            // Wait for mappings to apply - check for the green "All required fields mapped" message
            await expect(page.getByText(/All required fields mapped/i)).toBeVisible({
                timeout: 15_000
            });
        });

        await test.step("select target account", async () => {
            await page.getByRole("tab", { name: /Account/i }).click();

            // Select the default account created during identity setup
            const accountSelect = page.locator("#account-select");
            await accountSelect.click();
            // Select the "Default" account by name
            await page.getByRole("option", { name: /Default/i }).click();
        });

        await test.step("verify import button is enabled and click", async () => {
            // Should show import button with transaction count (5 data rows)
            const importButton = page.getByRole("button", { name: /Import \d+ Transactions/i });
            await expect(importButton).toBeEnabled({ timeout: 15_000 });
            await importButton.click();
        });

        await test.step("verify redirected to transactions page with new transactions", async () => {
            // Should redirect to transactions page
            await expect(page).toHaveURL(/\/transactions/);

            // Should show all 5 imported transactions - check for rows containing description text
            await expect(page.getByRole("row", { name: /Coffee Shop/i })).toBeVisible({
                timeout: 15_000
            });
            await expect(page.getByRole("row", { name: /Direct Deposit/i })).toBeVisible();
            await expect(page.getByText("5 transactions")).toBeVisible();
        });

        await test.step("verify template was auto-saved on first import", async () => {
            // Navigate back to import page
            await goToImportNew(page);
            csvPath = createSampleBankCSV();

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles(csvPath);

            await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 15_000 });

            // Go to Template tab - should now have auto-saved template
            await page.getByRole("tab", { name: /Template/i }).click();

            // The auto-saved template should be visible in the template selector dropdown
            const templateCombobox = page.getByRole("combobox", { name: /Import Template/i });
            await expect(templateCombobox).toContainText(/test-import-\d+/i);
        });

        await test.step("cleanup", async () => {
            fs.unlinkSync(csvPath);
        });
    });

    test("selecting template and importing auto-updates template config", async ({ page }) => {
        await createNewIdentity(page);

        let csvPath: string;
        let csvPath2: string;

        await test.step("first import to create template", async () => {
            await goToImportNew(page);
            csvPath = createSampleBankCSV();

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles(csvPath);
            await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 15_000 });

            // Configure column mappings
            await page.getByRole("tab", { name: /Columns/i }).click();
            await page.getByRole("button", { name: /Auto-detect/i }).click();

            // Select account
            await page.getByRole("tab", { name: /Account/i }).click();
            await expect(page.getByText(/Target Account/i)).toBeVisible();
            const accountSelect = page.locator("#account-select");
            await accountSelect.click();
            await expect(page.getByRole("option", { name: /Default/i })).toBeVisible();
            await page.getByRole("option", { name: /Default/i }).click();

            // Import
            const importBtn = page.getByRole("button", { name: /Import \d+ Transactions/i });
            await expect(importBtn).toBeEnabled({ timeout: 15_000 });
            await importBtn.click();
            await expect(page).toHaveURL(/\/transactions/);
        });

        await test.step("second import with template selected and modified config", async () => {
            await goToImportNew(page);
            // Create a CSV with different transaction data to avoid duplicate detection
            csvPath2 = createTestFile(
                `Date,Description,Amount,Balance
2024-02-01,Office Supplies,-125.00,5000.00
2024-02-02,Client Payment,3500.00,8500.00
2024-02-03,Utility Bill,-89.99,8410.01`,
                "csv"
            );

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles(csvPath2);
            await expect(page.getByText(/4 rows/i)).toBeVisible({ timeout: 15_000 });

            // Select the auto-saved template from the Template tab
            await page.getByRole("tab", { name: /Template/i }).click();
            // Use the template selector (select dropdown)
            const templateTrigger = page.locator("#template-select");
            await templateTrigger.click();
            // Select the first non-"No template" option (the auto-saved template)
            await page.getByRole("option", { name: /test-import-\d+/i }).click();

            // Change a config setting (e.g., date matching mode)
            await page.getByRole("tab", { name: /Duplicates/i }).click();
            const exactDateRadio = page.getByLabel(/exact date match/i);
            const withinDateRadio = page.getByLabel(/Allow dates within range/i);
            const wasExact = await exactDateRadio.isChecked();
            // Click the opposite option to toggle (radio buttons don't toggle when clicking the selected option)
            if (wasExact) {
                await withinDateRadio.click();
            } else {
                await exactDateRadio.click();
            }

            // Select account
            await page.getByRole("tab", { name: /Account/i }).click();
            const accountSelect2 = page.locator("#account-select");
            await accountSelect2.click();
            await page.getByRole("option", { name: /Default/i }).click();

            // Import (should auto-update template)
            const importBtn = page.getByRole("button", { name: /Import \d+ Transactions/i });
            await expect(importBtn).toBeEnabled({ timeout: 15_000 });
            await importBtn.click();
            await expect(page).toHaveURL(/\/transactions/);

            // Verify the config change was saved by checking on third import
            await goToImportNew(page);
            const csvPath3 = createTestFile(
                `Date,Description,Amount,Balance
2024-03-01,Test Transaction,-50.00,1000.00`,
                "csv"
            );
            const fileInput2 = page.locator('input[type="file"]');
            await fileInput2.setInputFiles(csvPath3);
            await expect(page.getByText(/2 rows/i)).toBeVisible({ timeout: 15_000 });

            // Select template and check if config persisted
            await page.getByRole("tab", { name: /Template/i }).click();
            const templateTrigger2 = page.locator("#template-select");
            await templateTrigger2.click();
            await page.getByRole("option", { name: /test-import-\d+/i }).click();

            await page.getByRole("tab", { name: /Duplicates/i }).click();
            const exactDateRadio2 = page.getByLabel(/exact date match/i);
            // Should now have the toggled value (opposite of original)
            await expect(exactDateRadio2).toHaveAttribute(
                "aria-checked",
                wasExact ? "false" : "true"
            );

            // Cleanup temp files
            fs.unlinkSync(csvPath3);
        });

        await test.step("cleanup", async () => {
            fs.unlinkSync(csvPath);
            fs.unlinkSync(csvPath2);
        });
    });
});
