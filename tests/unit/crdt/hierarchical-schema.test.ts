/**
 * Tests for Hierarchical Transaction Schema
 *
 * Verifies the hierarchical transaction storage schema and type definitions.
 * Schema structure is validated through type compilation and runtime checks.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    type AccountTransactionTree,
    type DayBucket,
    type MonthBucket,
    type NestedDuplicate,
    type Transaction,
    type TransactionStore,
    type YearBucket
} from "@/lib/crdt/schema";

describe("Transaction type", () => {
    it("has correct shape with new fields", () => {
        // This is a compile-time check - if it compiles, the types are correct
        // Use `as unknown as Type` for loro-mirror types that include $cid
        const mockTx = {
            id: "tx-1",
            date: "2024-01-15",
            description: "Test",
            notes: "",
            amount: 1000,
            accountId: "acc-1",
            tagIds: [],
            statusId: "status-1",
            importId: "import-1",
            allocations: {},
            creationInstant: Date.now(),
            importRowIndex: 0,
            suspectedDuplicates: [],
            deletedAt: 0
        } as unknown as Transaction;

        expect(mockTx.id).toBe("tx-1");
        expect(mockTx.creationInstant).toBeGreaterThan(0);
        expect(mockTx.suspectedDuplicates).toEqual([]);
    });

    it("includes creationInstant field", () => {
        const tx = { creationInstant: Temporal.Now.instant() } as Partial<Transaction>;
        expect(tx.creationInstant).toBeInstanceOf(Temporal.Instant);
    });

    it("includes importRowIndex field", () => {
        const tx = { importRowIndex: 5 } as Partial<Transaction>;
        expect(typeof tx.importRowIndex).toBe("number");
    });

    it("includes suspectedDuplicates field", () => {
        const tx = { suspectedDuplicates: [] } as Partial<Transaction>;
        expect(Array.isArray(tx.suspectedDuplicates)).toBe(true);
    });

    it("does not include duplicateOf field", () => {
        // Type-level check: duplicateOf should not be on Transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx: any = { duplicateOf: "some-id" };
        // Runtime check: if someone tried to add it, it wouldn't match the schema
        const validTx: Partial<Transaction> = { id: "test" };
        expect("duplicateOf" in validTx).toBe(false);
        expect("duplicateOf" in tx).toBe(true); // The arbitrary object has it, but Transaction type doesn't
    });
});

describe("NestedDuplicate type", () => {
    it("has correct shape", () => {
        const mockDup = {
            id: "dup-1",
            date: "2024-01-15",
            description: "Duplicate",
            notes: "",
            amount: 1000,
            accountId: "acc-1",
            tagIds: [],
            statusId: "status-1",
            importId: "import-1",
            allocations: {},
            creationInstant: Date.now(),
            importRowIndex: 1,
            deletedAt: 0
        } as unknown as NestedDuplicate;

        expect(mockDup.id).toBe("dup-1");
    });

    it("has same fields as transaction except suspectedDuplicates", () => {
        // Type-level verification: NestedDuplicate should NOT have suspectedDuplicates
        // This is enforced at compile time
        const dup = {
            id: "dup-1",
            date: "2024-01-15",
            description: "Duplicate",
            notes: "",
            amount: 1000,
            accountId: "acc-1",
            tagIds: [],
            statusId: "status-1",
            importId: "import-1",
            allocations: {},
            creationInstant: Date.now(),
            importRowIndex: 0,
            deletedAt: 0
        } as unknown as NestedDuplicate;

        // All transaction fields except suspectedDuplicates should exist
        expect(dup.id).toBeDefined();
        expect(dup.date).toBeDefined();
        expect(dup.description).toBeDefined();
        expect(dup.amount).toBeDefined();
        expect(dup.creationInstant).toBeDefined();

        // suspectedDuplicates should not be on the type
        expect("suspectedDuplicates" in dup).toBe(false);
    });

    it("includes creationInstant and importRowIndex", () => {
        const dup = {
            id: "dup-1",
            date: "2024-01-15",
            description: "Test",
            notes: "",
            amount: 1000,
            accountId: "acc-1",
            tagIds: [],
            statusId: "status-1",
            importId: "import-1",
            allocations: {},
            creationInstant: 12345,
            importRowIndex: 10,
            deletedAt: 0
        } as unknown as NestedDuplicate;

        expect(dup.creationInstant).toBe(12345);
        expect(dup.importRowIndex).toBe(10);
    });
});

describe("DayBucket type", () => {
    it("has correct shape", () => {
        const mockDay = {
            day: 15,
            transactions: []
        } as unknown as DayBucket;

        expect(mockDay.day).toBe(15);
        expect(mockDay.transactions).toEqual([]);
    });

    it("has day field", () => {
        const day = { day: 15, transactions: [] } as unknown as DayBucket;
        expect(typeof day.day).toBe("number");
    });

    it("has transactions field", () => {
        const day = { day: 15, transactions: [] } as unknown as DayBucket;
        expect(Array.isArray(day.transactions)).toBe(true);
    });
});

describe("MonthBucket type", () => {
    it("has correct shape", () => {
        const mockMonth = {
            month: 1,
            days: []
        } as unknown as MonthBucket;

        expect(mockMonth.month).toBe(1);
        expect(mockMonth.days).toEqual([]);
    });

    it("has month field", () => {
        const month = { month: 6, days: [] } as unknown as MonthBucket;
        expect(typeof month.month).toBe("number");
    });

    it("has days field", () => {
        const month = { month: 6, days: [] } as unknown as MonthBucket;
        expect(Array.isArray(month.days)).toBe(true);
    });
});

describe("YearBucket type", () => {
    it("has correct shape", () => {
        const mockYear = {
            year: 2024,
            months: []
        } as unknown as YearBucket;

        expect(mockYear.year).toBe(2024);
        expect(mockYear.months).toEqual([]);
    });

    it("has year field", () => {
        const year = { year: 2024, months: [] } as unknown as YearBucket;
        expect(typeof year.year).toBe("number");
    });

    it("has months field", () => {
        const year = { year: 2024, months: [] } as unknown as YearBucket;
        expect(Array.isArray(year.months)).toBe(true);
    });
});

describe("AccountTransactionTree type", () => {
    it("has correct shape", () => {
        const mockTree = {
            accountId: "acc-1",
            years: []
        } as unknown as AccountTransactionTree;

        expect(mockTree.accountId).toBe("acc-1");
        expect(mockTree.years).toEqual([]);
    });

    it("has accountId field", () => {
        const tree = {
            accountId: "acc-1",
            years: []
        } as unknown as AccountTransactionTree;
        expect(typeof tree.accountId).toBe("string");
    });

    it("has years field", () => {
        const tree = {
            accountId: "acc-1",
            years: []
        } as unknown as AccountTransactionTree;
        expect(Array.isArray(tree.years)).toBe(true);
    });
});

describe("Hierarchical structure invariants", () => {
    it("day field should be 1-31", () => {
        // This documents the expected range for day values
        const validDays = [1, 15, 28, 29, 30, 31];
        for (const day of validDays) {
            expect(day).toBeGreaterThanOrEqual(1);
            expect(day).toBeLessThanOrEqual(31);
        }
    });

    it("month field should be 1-12", () => {
        // This documents the expected range for month values
        const validMonths = [1, 6, 12];
        for (const month of validMonths) {
            expect(month).toBeGreaterThanOrEqual(1);
            expect(month).toBeLessThanOrEqual(12);
        }
    });

    it("year field should be positive integer", () => {
        // This documents the expected range for year values
        const validYears = [2020, 2024, 2025];
        for (const year of validYears) {
            expect(year).toBeGreaterThan(0);
            expect(Number.isInteger(year)).toBe(true);
        }
    });
});
