import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TRANSACTION_MAIN_ROW_HEIGHT_PX } from "@/components/features/transactions/transaction-row-geometry";

const TRANSACTION_COMPONENT_ROOT = join(process.cwd(), "src/components/features/transactions");
const TRANSACTION_TEST_ROOT = join(process.cwd(), "tests/unit/transactions");

async function transactionSource(file: string): Promise<string> {
    return readFile(join(TRANSACTION_COMPONENT_ROOT, file), "utf8");
}

async function transactionTestSource(file: string): Promise<string> {
    return readFile(join(TRANSACTION_TEST_ROOT, file), "utf8");
}

describe("inline transaction notes retirement", () => {
    it("removes the expanded second row and its row-count compensation", async () => {
        const [row, table] = await Promise.all([
            transactionSource("TransactionRow.tsx"),
            transactionSource("TransactionTable.tsx")
        ]);

        for (const source of [row, table]) {
            expect(source).not.toContain("expandedIds");
            expect(source).not.toContain("expandedRowIndexes");
            expect(source).not.toContain("notes-row");
            expect(source).not.toContain("expand-notes-button");
            expect(source).not.toContain("onToggleExpand");
        }
        expect(table).toContain("const ariaRowCount = matchingRowCount + 1;");
        expect(table).toContain("const ariaRowIndex = index + 2;");
    });

    it("keeps production and its harness on fixed 57px geometry", async () => {
        const [virtualRows, harness] = await Promise.all([
            transactionSource("TransactionVirtualRows.tsx"),
            transactionTestSource("virtual-grid-harness.ts")
        ]);
        const forbiddenMeasurementPaths = [
            "measureElement",
            "measuredRowHeight",
            "onProgrammaticScroll",
            "ResizeObserver",
            "resizeItem",
            "useFlushSync",
            "flushSync"
        ];

        for (const source of [virtualRows, harness]) {
            for (const forbidden of forbiddenMeasurementPaths) {
                expect(source).not.toContain(forbidden);
            }
        }
        expect(TRANSACTION_MAIN_ROW_HEIGHT_PX).toBe(57);
        expect(virtualRows).toContain("estimateSize: () => estimatedRowHeight");
        expect(virtualRows).toContain("rangeExtractor");
        expect(virtualRows).toContain("scrollToIndex");
        expect(harness).toContain("export const HARNESS_ROW_HEIGHT = 57;");
        expect(harness).toContain("HARNESS_ROW_HEIGHT * HARNESS_VIEWPORT_ROWS");
    });

    it("retains behavioral oracles for fixed geometry, deep reveal, and bounded windows", async () => {
        const [geometry, virtualization, fullCount] = await Promise.all([
            transactionTestSource("cell-hit-area.test.ts"),
            transactionTestSource("virtualization.test.tsx"),
            transactionTestSource("full-count-virtualization.test.tsx")
        ]);

        expect(geometry).toContain("expect(TRANSACTION_MAIN_ROW_HEIGHT_PX).toBe(57)");
        expect(virtualization).toContain("mountedRowIndexes()).toEqual(");
        expect(virtualization).toContain("mountedRowIndexes()).toContain(4_000)");
        expect(fullCount).toContain("const deepIndex = TOTAL_TRANSACTIONS - 1;");
        expect(fullCount).toContain("expect(mountedRowIndexes()).toContain(deepIndex)");
        expect(fullCount).toContain("expect(largestWindowSize()).toBeLessThanOrEqual(");
    });
});

describe("row automation retirement", () => {
    it("removes row proposal and robot components after inspector replacement", async () => {
        const retiredComponents = ["TransactionRuleProposal.tsx", "TransactionRuleRobot.tsx"];
        for (const file of retiredComponents) {
            await expect(access(join(TRANSACTION_COMPONENT_ROOT, file))).rejects.toThrow();
        }
    });

    it("removes page and row automation render geometry", async () => {
        const [row, table, page] = await Promise.all([
            transactionSource("TransactionRow.tsx"),
            transactionSource("TransactionTable.tsx"),
            readFile(join(process.cwd(), "src/app/(app)/transactions/page.tsx"), "utf8")
        ]);
        for (const source of [row, table, page]) {
            expect(source).not.toContain("renderRuleProposal");
            expect(source).not.toContain("renderDescriptionRobot");
            expect(source).not.toContain("TransactionRuleRobot");
            expect(source).not.toContain("TransactionRuleProposal");
        }
    });
});
