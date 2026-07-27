/**
 * Old Transaction Filter Unit Tests
 *
 * Tests for the filterOldTransactions function with table-driven tests
 * covering all three modes and edge cases.
 */

import { describe, expect, it } from "vitest";

import {
    calculateCutoffDate,
    type FilterableTransaction,
    filterOldTransactions,
    getFilterModeDescription,
    isBeforeCutoff
} from "@/lib/import/filter";
import type { FilterConfig, OldTransactionMode } from "@/lib/import/types";

// ============================================================================
// Test Helpers
// ============================================================================

interface TestTransaction extends FilterableTransaction {
    id: string;
}

function tx(id: string, date: string, isDuplicate = false): TestTransaction {
    return { id, date, isDuplicate };
}

// ============================================================================
// calculateCutoffDate tests
// ============================================================================

describe("calculateCutoffDate", () => {
    it("returns null when newestExistingDate is null", () => {
        expect(calculateCutoffDate(null, 10)).toBeNull();
    });

    it("subtracts cutoff days from newest date and adds 1", () => {
        // 2026-01-15 - 10 + 1 = 2026-01-06
        expect(calculateCutoffDate("2026-01-15", 10)).toBe("2026-01-06");
    });

    it("handles month boundaries correctly", () => {
        // 2026-01-05 - 10 + 1 = 2025-12-27
        expect(calculateCutoffDate("2026-01-05", 10)).toBe("2025-12-27");
    });

    it("handles year boundaries correctly", () => {
        // 2026-01-01 - 5 + 1 = 2025-12-28
        expect(calculateCutoffDate("2026-01-01", 5)).toBe("2025-12-28");
    });

    it("handles zero cutoff days - excludes newest date and before", () => {
        // 2026-01-15 - 0 + 1 = 2026-01-16
        // This means only dates >= 2026-01-16 are kept (newer than existing)
        expect(calculateCutoffDate("2026-01-15", 0)).toBe("2026-01-16");
    });
});

// ============================================================================
// isBeforeCutoff tests
// ============================================================================

describe("isBeforeCutoff", () => {
    it("returns true for dates before cutoff", () => {
        expect(isBeforeCutoff("2026-01-04", "2026-01-05")).toBe(true);
    });

    it("returns false for dates equal to cutoff", () => {
        expect(isBeforeCutoff("2026-01-05", "2026-01-05")).toBe(false);
    });

    it("returns false for dates after cutoff", () => {
        expect(isBeforeCutoff("2026-01-06", "2026-01-05")).toBe(false);
    });
});

// ============================================================================
// filterOldTransactions tests - Table-driven
// ============================================================================

describe("filterOldTransactions", () => {
    // Newest existing: 2026-01-15, cutoff 10 days = 2026-01-05
    const newestExisting = "2026-01-15";
    const cutoffDays = 10;

    describe("mode: do-not-ignore", () => {
        const config: FilterConfig = {
            mode: "do-not-ignore",
            cutoffType: "days",
            cutoffDays,
            cutoffDate: null
        };

        const testCases = [
            {
                name: "includes all transactions regardless of age or duplicate status",
                transactions: [
                    tx("1", "2026-01-20"), // New
                    tx("2", "2026-01-10"), // On/after cutoff
                    tx("3", "2026-01-01", true), // Old duplicate
                    tx("4", "2026-01-01", false) // Old non-duplicate
                ],
                expectedIncludedIds: ["1", "2", "3", "4"],
                expectedExcludedIds: []
            },
            {
                name: "handles empty array",
                transactions: [],
                expectedIncludedIds: [],
                expectedExcludedIds: []
            }
        ];

        it.each(testCases)(
            "$name",
            ({ transactions, expectedIncludedIds, expectedExcludedIds }) => {
                const result = filterOldTransactions(transactions, newestExisting, config);

                expect(result.included.map((t) => t.id)).toEqual(expectedIncludedIds);
                expect(result.excluded.map((t) => t.id)).toEqual(expectedExcludedIds);
                expect(result.stats.includedCount).toBe(expectedIncludedIds.length);
                expect(result.stats.excludedCount).toBe(expectedExcludedIds.length);
            }
        );
    });

    describe("mode: ignore-all", () => {
        const config: FilterConfig = {
            mode: "ignore-all",
            cutoffType: "days",
            cutoffDays,
            cutoffDate: null
        };

        // With cutoffDays=10 from 2026-01-15: cutoff = 2026-01-06
        // Dates >= 2026-01-06 are included, dates < 2026-01-06 are excluded
        const testCases = [
            {
                name: "excludes all transactions before cutoff",
                transactions: [
                    tx("1", "2026-01-20"), // New - included
                    tx("2", "2026-01-06"), // Exactly at cutoff - included
                    tx("3", "2026-01-05", true), // Old (before cutoff) duplicate - excluded
                    tx("4", "2026-01-05", false) // Old (before cutoff) non-duplicate - excluded
                ],
                expectedIncludedIds: ["1", "2"],
                expectedExcludedIds: ["3", "4"]
            },
            {
                name: "includes all when nothing is old",
                transactions: [tx("1", "2026-01-15"), tx("2", "2026-01-10"), tx("3", "2026-01-06")],
                expectedIncludedIds: ["1", "2", "3"],
                expectedExcludedIds: []
            },
            {
                name: "excludes all when everything is old",
                transactions: [tx("1", "2026-01-05"), tx("2", "2026-01-01"), tx("3", "2025-12-25")],
                expectedIncludedIds: [],
                expectedExcludedIds: ["1", "2", "3"]
            }
        ];

        it.each(testCases)(
            "$name",
            ({ transactions, expectedIncludedIds, expectedExcludedIds }) => {
                const result = filterOldTransactions(transactions, newestExisting, config);

                expect(result.included.map((t) => t.id)).toEqual(expectedIncludedIds);
                expect(result.excluded.map((t) => t.id)).toEqual(expectedExcludedIds);
            }
        );
    });

    describe("mode: ignore-duplicates", () => {
        const config: FilterConfig = {
            mode: "ignore-duplicates",
            cutoffType: "days",
            cutoffDays,
            cutoffDate: null
        };

        // With cutoffDays=10 from 2026-01-15: cutoff = 2026-01-06
        // Dates >= 2026-01-06 are new, dates < 2026-01-06 are old
        const testCases = [
            {
                name: "excludes old duplicates, includes old non-duplicates",
                transactions: [
                    tx("1", "2026-01-20"), // New - included
                    tx("2", "2026-01-10", true), // New duplicate - included (duplicates only excluded if OLD)
                    tx("3", "2026-01-05", true), // Old duplicate - excluded
                    tx("4", "2026-01-05", false), // Old non-duplicate - included
                    tx("5", "2026-01-01", true), // Old duplicate - excluded
                    tx("6", "2026-01-01", false) // Old non-duplicate - included
                ],
                expectedIncludedIds: ["1", "2", "4", "6"],
                expectedExcludedIds: ["3", "5"],
                expectedStats: {
                    oldDuplicatesCount: 2,
                    oldNonDuplicatesCount: 2
                }
            },
            {
                name: "treats undefined isDuplicate as false",
                transactions: [
                    { id: "1", date: "2026-01-01" }, // Old, isDuplicate undefined - included
                    { id: "2", date: "2026-01-01", isDuplicate: false } // Old, explicit false - included
                ],
                expectedIncludedIds: ["1", "2"],
                expectedExcludedIds: [],
                expectedStats: {
                    oldDuplicatesCount: 0,
                    oldNonDuplicatesCount: 2
                }
            }
        ];

        it.each(testCases)(
            "$name",
            ({ transactions, expectedIncludedIds, expectedExcludedIds, expectedStats }) => {
                const result = filterOldTransactions(transactions, newestExisting, config);

                expect(result.included.map((t) => t.id)).toEqual(expectedIncludedIds);
                expect(result.excluded.map((t) => t.id)).toEqual(expectedExcludedIds);

                if (expectedStats) {
                    expect(result.stats.oldDuplicatesCount).toBe(expectedStats.oldDuplicatesCount);
                    expect(result.stats.oldNonDuplicatesCount).toBe(
                        expectedStats.oldNonDuplicatesCount
                    );
                }
            }
        );
    });

    describe("edge cases", () => {
        it("includes all when newestExistingDate is null (empty vault)", () => {
            const config: FilterConfig = {
                mode: "ignore-all",
                cutoffType: "days",
                cutoffDays: 10,
                cutoffDate: null
            };
            const transactions = [
                tx("1", "2020-01-01"), // Very old
                tx("2", "2025-01-01"),
                tx("3", "2026-01-01")
            ];

            const result = filterOldTransactions(transactions, null, config);

            expect(result.included).toHaveLength(3);
            expect(result.excluded).toHaveLength(0);
        });

        it("handles transactions exactly at cutoff boundary", () => {
            const config: FilterConfig = {
                mode: "ignore-all",
                cutoffType: "days",
                cutoffDays: 10,
                cutoffDate: null
            };
            // With cutoffDays=10 from 2026-01-15: cutoff = 2026-01-06
            // Dates >= 2026-01-06 are included, dates < 2026-01-06 are excluded
            const transactions = [
                tx("1", "2026-01-06"), // Exactly at cutoff - included
                tx("2", "2026-01-05") // One day before cutoff - excluded
            ];

            const result = filterOldTransactions(transactions, newestExisting, config);

            expect(result.included.map((t) => t.id)).toEqual(["1"]);
            expect(result.excluded.map((t) => t.id)).toEqual(["2"]);
        });

        it("handles zero cutoff days (only strictly newer transactions pass)", () => {
            const config: FilterConfig = {
                mode: "ignore-all",
                cutoffType: "days",
                cutoffDays: 0,
                cutoffDate: null
            };
            // With cutoffDays=0 from 2026-01-15: cutoff = 2026-01-16
            // Dates >= 2026-01-16 are included (strictly newer than existing)
            // Dates <= 2026-01-15 are excluded (same day as newest or older)
            const transactions = [
                tx("1", "2026-01-16"), // Strictly newer than newest - included
                tx("2", "2026-01-15"), // Same as newest - excluded
                tx("3", "2026-01-14") // Older than newest - excluded
            ];

            const result = filterOldTransactions(transactions, newestExisting, config);

            expect(result.included.map((t) => t.id)).toEqual(["1"]);
            expect(result.excluded.map((t) => t.id)).toEqual(["2", "3"]);
        });

        it("preserves order of transactions", () => {
            const config: FilterConfig = {
                mode: "ignore-duplicates",
                cutoffType: "days",
                cutoffDays: 10,
                cutoffDate: null
            };
            const transactions = [
                tx("a", "2026-01-10"),
                tx("b", "2026-01-04", false),
                tx("c", "2026-01-12"),
                tx("d", "2026-01-03", false)
            ];

            const result = filterOldTransactions(transactions, newestExisting, config);

            // Order should be preserved
            expect(result.included.map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
        });

        it("provides accurate total count in stats", () => {
            const config: FilterConfig = {
                mode: "ignore-duplicates",
                cutoffType: "days",
                cutoffDays: 10,
                cutoffDate: null
            };
            const transactions = [
                tx("1", "2026-01-10"),
                tx("2", "2026-01-04", true),
                tx("3", "2026-01-04", false)
            ];

            const result = filterOldTransactions(transactions, newestExisting, config);

            expect(result.stats.totalCount).toBe(3);
            expect(result.stats.includedCount).toBe(2);
            expect(result.stats.excludedCount).toBe(1);
            expect(result.stats.oldDuplicatesCount).toBe(1);
            expect(result.stats.oldNonDuplicatesCount).toBe(1);
        });
    });
});

describe("getFilterModeDescription", () => {
    // Every OldTransactionMode must produce its own distinct, non-empty description; the switch
    // is exhaustive, so a new mode without a case would return undefined here.
    const cases: ReadonlyArray<{ mode: OldTransactionMode; expected: string }> = [
        { mode: "ignore-all", expected: "Skip all old transactions" },
        { mode: "ignore-duplicates", expected: "Skip old duplicates, keep old non-duplicates" },
        { mode: "do-not-ignore", expected: "Import all old transactions" }
    ];

    it.each(cases)("describes $mode", ({ mode, expected }) => {
        expect(getFilterModeDescription(mode)).toBe(expected);
    });

    it("gives each mode a distinct description", () => {
        const descriptions = cases.map(({ mode }) => getFilterModeDescription(mode));
        expect(new Set(descriptions).size).toBe(cases.length);
    });
});
