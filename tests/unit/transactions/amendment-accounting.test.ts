import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SPEC_ROOT = join(process.cwd(), "specs/016-transaction-grid-interaction-inspector");
const AMENDMENT_001_PATH = "amendments/001-idle-reconciliation.md";
const AMENDMENT_002_PATH = "amendments/002-google-sheets-grid-treatment.md";
const AMENDMENT_003_PATH = "amendments/003-unified-grid-navigation-popup-escape.md";
const OBSOLETE_STYLING_PATH = "styling-amendment.md";

async function source(path: string): Promise<string> {
    return readFile(join(SPEC_ROOT, path), "utf8");
}

describe("transaction grid amendment accounting", () => {
    it("keeps the executable amendment and direct-user decisions distinct", async () => {
        const amendmentNames = (await readdir(join(SPEC_ROOT, "amendments")))
            .filter((name) => name.endsWith(".md"))
            .sort();
        expect(amendmentNames).toEqual(
            expect.arrayContaining([
                "001-idle-reconciliation.md",
                "002-google-sheets-grid-treatment.md",
                "003-unified-grid-navigation-popup-escape.md"
            ])
        );

        const [amendment001, amendment002, amendment003] = await Promise.all([
            source(AMENDMENT_001_PATH),
            source(AMENDMENT_002_PATH),
            source(AMENDMENT_003_PATH)
        ]);
        expect(amendment001.split("\n")[0]).toBe("# Amendment 001: Idle Reconciliation Neutrality");
        expect(amendment002.split("\n")[0]).toBe("# Amendment 002: Google Sheets Grid Treatment");
        expect(amendment003.split("\n")[0]).toBe(
            "# Amendment 003: Unified Grid Navigation and Popup Escape"
        );
        expect(amendment001).toContain("TGI-AMD-001");
        for (const directUserDecision of [amendment002, amendment003]) {
            expect(directUserDecision).not.toContain("TGI-AMD-001");
            expect(directUserDecision).not.toMatch(/TGI-AMD-00[23]/);
        }
        expect(amendment003).toMatch(/Alt\/Option\+Up\/Down\/Left\/Right/);
        expect(amendment003).toMatch(/One Escape delivered to a top-level grid-editor popup/);
        expect(amendment003).toMatch(
            /nested Select opened inside Create Account remains widget-owned/
        );
        expect(amendment003).toMatch(
            /unchanged 146 base records plus the one executable Amendment 001/
        );
    });

    it("points every mutable authority account at Amendment 002 without expanding 146 plus 1", async () => {
        const accounting = [
            {
                content: await readFile(
                    join(process.cwd(), ".agent-memory/transaction-grid-inspector/plan.md"),
                    "utf8"
                ),
                reference: `specs/016-transaction-grid-interaction-inspector/${AMENDMENT_002_PATH}`
            },
            {
                content: await readFile(
                    join(process.cwd(), ".agent-memory/transaction-grid-inspector/progress.md"),
                    "utf8"
                ),
                reference: `specs/016-transaction-grid-interaction-inspector/${AMENDMENT_002_PATH}`
            },
            {
                content: await source("evidence/README.md"),
                reference: `../${AMENDMENT_002_PATH}`
            },
            {
                content: await source("evidence/source-freeze/freeze-manifest.md"),
                reference: AMENDMENT_002_PATH
            }
        ];

        for (const { content, reference } of accounting) {
            expect(content).toContain(reference);
            expect(content).not.toContain(OBSOLETE_STYLING_PATH);
            expect(content).not.toContain("TGI-AMD-002");
        }

        const evidenceIndex = accounting[2]?.content;
        const freezeManifest = accounting[3]?.content;
        expect(evidenceIndex).toMatch(/does not alter the 146 base records/);
        expect(evidenceIndex).toMatch(/one executable\s+Amendment 001\s+record/);
        expect(freezeManifest).toMatch(/does not change the 146 base records/);
        expect(freezeManifest).toMatch(/one executable\s+Amendment 001\s+record/);

        for (const content of [evidenceIndex, freezeManifest]) {
            expect(content).toContain("417e103def4e2a2b07caf7171a8e467de9e3bfab");
            expect(content).toContain("72f583fbcdcf6539fbeb438bdfebc287a4cd20bd");
            expect(content).toMatch(/post-commit\s+verification\s+passed/i);
            expect(content).not.toMatch(
                /post-commit (?:amendment )?verification\s+(?:remains )?pending/i
            );
            expect(content).not.toMatch(/amendment commit pending/i);
            expect(content).not.toMatch(/product correction (?:is|remains) paused/i);
        }

        const amendment002Accounting = freezeManifest
            ?.split("## Source amendment 002")[1]
            ?.split("##")[0];
        expect(amendment002Accounting).toBeDefined();
        expect(amendment002Accounting).not.toContain("TGI-AMD-001");
        expect(amendment002Accounting).not.toContain("417e103def4e2a2b07caf7171a8e467de9e3bfab");
    });
});
