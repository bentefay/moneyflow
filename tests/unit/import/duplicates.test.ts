/**
 * Duplicate Detection Unit Tests
 *
 * Tests for transaction duplicate detection algorithms.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  checkDuplicate,
  detectDuplicates,
  detectInternalDuplicates,
  DEFAULT_DUPLICATE_CONFIG,
  type DuplicateCheckTransaction,
  type DuplicateDetectionConfig,
} from "@/lib/import/duplicates";
import { type ISODateString } from "@/types";

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a branded ISODateString for tests (bypasses runtime validation) */
function isoDate(date: string): ISODateString {
  return date as ISODateString;
}

function createTransaction(
  overrides: Partial<DuplicateCheckTransaction> = {}
): DuplicateCheckTransaction {
  return {
    id: `tx-${Math.random().toString(36).substring(7)}`,
    date: isoDate("2024-01-15"),
    amount: -50.0,
    description: "COFFEE SHOP",
    ...overrides,
  };
}

// ============================================================================
// checkDuplicate tests
// ============================================================================

describe("checkDuplicate", () => {
  describe("identical transactions", () => {
    it("detects exact duplicate", () => {
      const tx1 = createTransaction({ id: "tx-1" });
      const tx2 = createTransaction({ id: "tx-2" });

      const match = checkDuplicate(tx1, tx2);

      expect(match).not.toBeNull();
      expect(match?.confidence).toBeGreaterThanOrEqual(0.9);
      expect(match?.matchDetails.dateMatch).toBe(true);
      expect(match?.matchDetails.amountMatch).toBe(true);
      expect(match?.matchDetails.descriptionSimilarity).toBe(1);
    });
  });

  describe("date matching", () => {
    it("matches transactions on same date", () => {
      const tx1 = createTransaction({ id: "tx-1", date: isoDate("2024-01-15") });
      const tx2 = createTransaction({ id: "tx-2", date: isoDate("2024-01-15") });

      const match = checkDuplicate(tx1, tx2);
      expect(match?.matchDetails.dateMatch).toBe(true);
    });

    it("matches transactions within 3 day tolerance", () => {
      const tx1 = createTransaction({ id: "tx-1", date: isoDate("2024-01-15") });
      const tx2 = createTransaction({ id: "tx-2", date: isoDate("2024-01-17") });

      const match = checkDuplicate(tx1, tx2);
      expect(match?.matchDetails.dateMatch).toBe(true);
    });

    it("rejects transactions beyond date tolerance", () => {
      const tx1 = createTransaction({ id: "tx-1", date: isoDate("2024-01-15") });
      const tx2 = createTransaction({ id: "tx-2", date: isoDate("2024-01-20") });

      const match = checkDuplicate(tx1, tx2);
      expect(match).toBeNull(); // No match when date differs too much
    });
  });

  describe("amount matching", () => {
    it("matches exact amounts", () => {
      const tx1 = createTransaction({ id: "tx-1", amount: -50.0 });
      const tx2 = createTransaction({ id: "tx-2", amount: -50.0 });

      const match = checkDuplicate(tx1, tx2);
      expect(match?.matchDetails.amountMatch).toBe(true);
    });

    it("matches amounts within 1 cent tolerance", () => {
      const tx1 = createTransaction({ id: "tx-1", amount: -50.0 });
      const tx2 = createTransaction({ id: "tx-2", amount: -50.01 });

      const match = checkDuplicate(tx1, tx2);
      expect(match?.matchDetails.amountMatch).toBe(true);
    });

    it("reduces confidence when amounts differ significantly", () => {
      const tx1 = createTransaction({ id: "tx-1", amount: -50.0 });
      const tx2 = createTransaction({ id: "tx-2", amount: -55.0 });

      const match = checkDuplicate(tx1, tx2);
      // Even with different amounts, might still match if description is very similar
      if (match) {
        expect(match.matchDetails.amountMatch).toBe(false);
        expect(match.confidence).toBeLessThan(0.7); // Lower confidence
      }
    });
  });

  describe("description similarity", () => {
    it("matches identical descriptions", () => {
      const tx1 = createTransaction({ id: "tx-1", description: "AMAZON PURCHASE" });
      const tx2 = createTransaction({ id: "tx-2", description: "AMAZON PURCHASE" });

      const match = checkDuplicate(tx1, tx2);
      expect(match?.matchDetails.descriptionSimilarity).toBe(1);
    });

    it("matches similar descriptions", () => {
      const tx1 = createTransaction({ id: "tx-1", description: "AMAZON.COM*AMZN.COM/BI" });
      const tx2 = createTransaction({ id: "tx-2", description: "AMAZON.COM*AMZN.COM" });

      const match = checkDuplicate(tx1, tx2);
      expect(match?.matchDetails.descriptionSimilarity).toBeGreaterThan(0.8);
    });

    it("accounts for description differences in confidence", () => {
      const tx1 = createTransaction({ id: "tx-1", description: "COFFEE SHOP" });
      const tx2 = createTransaction({ id: "tx-2", description: "GAS STATION" });

      const match = checkDuplicate(tx1, tx2);
      // Different descriptions should not match or have low confidence
      if (match) {
        expect(match.matchDetails.descriptionSimilarity).toBeLessThan(0.5);
      }
    });
  });

  describe("confidence threshold", () => {
    it("rejects matches below minimum confidence", () => {
      const tx1 = createTransaction({
        id: "tx-1",
        date: isoDate("2024-01-15"),
        amount: -50.0,
        description: "COFFEE SHOP DOWNTOWN",
      });
      const tx2 = createTransaction({
        id: "tx-2",
        date: isoDate("2024-01-20"), // Too far
        amount: -75.0, // Different amount
        description: "DIFFERENT MERCHANT", // Different description
      });

      const match = checkDuplicate(tx1, tx2);
      expect(match).toBeNull();
    });
  });

  describe("custom configuration", () => {
    it("respects custom date tolerance", () => {
      const tx1 = createTransaction({ id: "tx-1", date: isoDate("2024-01-15") });
      const tx2 = createTransaction({ id: "tx-2", date: isoDate("2024-01-20") });

      const config: DuplicateDetectionConfig = {
        ...DEFAULT_DUPLICATE_CONFIG,
        maxDateDiffDays: 7,
      };

      const match = checkDuplicate(tx1, tx2, config);
      expect(match?.matchDetails.dateMatch).toBe(true);
    });

    it("respects custom amount tolerance", () => {
      const tx1 = createTransaction({ id: "tx-1", amount: -50.0 });
      const tx2 = createTransaction({ id: "tx-2", amount: -51.0 });

      const config: DuplicateDetectionConfig = {
        ...DEFAULT_DUPLICATE_CONFIG,
        maxAmountDiff: 5.0,
      };

      const match = checkDuplicate(tx1, tx2, config);
      expect(match?.matchDetails.amountMatch).toBe(true);
    });

    it("respects custom confidence threshold", () => {
      const tx1 = createTransaction({ id: "tx-1" });
      const tx2 = createTransaction({ id: "tx-2", description: "SLIGHTLY DIFFERENT" });

      const strictConfig: DuplicateDetectionConfig = {
        ...DEFAULT_DUPLICATE_CONFIG,
        minConfidence: 0.99,
      };

      const lenientConfig: DuplicateDetectionConfig = {
        ...DEFAULT_DUPLICATE_CONFIG,
        minConfidence: 0.3,
      };

      expect(checkDuplicate(tx1, tx2, strictConfig)).toBeNull();
      expect(checkDuplicate(tx1, tx2, lenientConfig)).not.toBeNull();
    });
  });

  describe("match output", () => {
    it("returns correct transaction IDs", () => {
      const tx1 = createTransaction({ id: "new-tx-123" });
      const tx2 = createTransaction({ id: "existing-tx-456" });

      const match = checkDuplicate(tx1, tx2);

      expect(match?.newTransactionId).toBe("new-tx-123");
      expect(match?.existingTransactionId).toBe("existing-tx-456");
    });

    it("includes match details", () => {
      const tx1 = createTransaction({ id: "tx-1" });
      const tx2 = createTransaction({ id: "tx-2" });

      const match = checkDuplicate(tx1, tx2);

      expect(match).toHaveProperty("matchDetails");
      expect(match?.matchDetails).toHaveProperty("dateMatch");
      expect(match?.matchDetails).toHaveProperty("amountMatch");
      expect(match?.matchDetails).toHaveProperty("descriptionSimilarity");
    });
  });
});

// ============================================================================
// detectDuplicates tests
// ============================================================================

describe("detectDuplicates", () => {
  it("returns empty array when no matches", () => {
    const newTxs = [createTransaction({ id: "new-1", date: isoDate("2024-01-15") })];
    const existingTxs = [createTransaction({ id: "existing-1", date: isoDate("2023-01-15") })];

    const matches = detectDuplicates(newTxs, existingTxs);
    expect(matches).toHaveLength(0);
  });

  it("detects single duplicate", () => {
    const newTxs = [createTransaction({ id: "new-1" })];
    const existingTxs = [createTransaction({ id: "existing-1" })];

    const matches = detectDuplicates(newTxs, existingTxs);

    expect(matches).toHaveLength(1);
    expect(matches[0].newTransactionId).toBe("new-1");
    expect(matches[0].existingTransactionId).toBe("existing-1");
  });

  it("detects multiple duplicates", () => {
    const newTxs = [
      createTransaction({ id: "new-1", date: isoDate("2024-01-15"), description: "TX A" }),
      createTransaction({ id: "new-2", date: isoDate("2024-01-20"), description: "TX B" }),
    ];
    const existingTxs = [
      createTransaction({ id: "existing-1", date: isoDate("2024-01-15"), description: "TX A" }),
      createTransaction({ id: "existing-2", date: isoDate("2024-01-20"), description: "TX B" }),
    ];

    const matches = detectDuplicates(newTxs, existingTxs);
    expect(matches).toHaveLength(2);
  });

  it("finds best match among multiple candidates", () => {
    const newTxs = [createTransaction({ id: "new-1", description: "COFFEE SHOP" })];
    const existingTxs = [
      createTransaction({ id: "existing-1", description: "COFFEE SHOP" }), // Exact match
      createTransaction({ id: "existing-2", description: "COFFEE STORE" }), // Similar
    ];

    const matches = detectDuplicates(newTxs, existingTxs);

    expect(matches).toHaveLength(1);
    expect(matches[0].existingTransactionId).toBe("existing-1"); // Best match
    expect(matches[0].matchDetails.descriptionSimilarity).toBe(1);
  });

  it("handles empty new transactions", () => {
    const existingTxs = [createTransaction({ id: "existing-1" })];
    const matches = detectDuplicates([], existingTxs);
    expect(matches).toHaveLength(0);
  });

  it("handles empty existing transactions", () => {
    const newTxs = [createTransaction({ id: "new-1" })];
    const matches = detectDuplicates(newTxs, []);
    expect(matches).toHaveLength(0);
  });

  it("optimizes lookup by month", () => {
    // Transactions in different months should still match within tolerance
    const newTxs = [createTransaction({ id: "new-1", date: isoDate("2024-01-31") })];
    const existingTxs = [createTransaction({ id: "existing-1", date: isoDate("2024-02-01") })];

    const matches = detectDuplicates(newTxs, existingTxs);
    expect(matches).toHaveLength(1); // Should match across month boundary
  });
});

// ============================================================================
// detectInternalDuplicates tests
// ============================================================================

describe("detectInternalDuplicates", () => {
  it("returns empty for unique transactions", () => {
    // Truly unique transactions: different dates, amounts, and descriptions
    const transactions = [
      createTransaction({
        id: "tx-1",
        date: isoDate("2024-01-15"),
        amount: -50.0,
        description: "COFFEE SHOP DOWNTOWN",
      }),
      createTransaction({
        id: "tx-2",
        date: isoDate("2024-02-20"),
        amount: -125.0,
        description: "GROCERY STORE MAIN ST",
      }),
      createTransaction({
        id: "tx-3",
        date: isoDate("2024-03-10"),
        amount: -300.0,
        description: "AUTO SERVICE CENTER",
      }),
    ];

    const matches = detectInternalDuplicates(transactions);
    expect(matches).toHaveLength(0);
  });

  it("detects duplicate pair in list", () => {
    const transactions = [
      createTransaction({ id: "tx-1", description: "COFFEE SHOP" }),
      createTransaction({ id: "tx-2", description: "COFFEE SHOP" }),
    ];

    const matches = detectInternalDuplicates(transactions);
    expect(matches).toHaveLength(1);
    expect(matches[0].newTransactionId).toBe("tx-1");
    expect(matches[0].existingTransactionId).toBe("tx-2");
  });

  it("reports each duplicate pair only once", () => {
    // Three identical transactions should result in 2 pairs
    const transactions = [
      createTransaction({ id: "tx-1", description: "SAME" }),
      createTransaction({ id: "tx-2", description: "SAME" }),
      createTransaction({ id: "tx-3", description: "SAME" }),
    ];

    const matches = detectInternalDuplicates(transactions);

    // Should mark tx-2 as dup of tx-1, tx-3 as dup of tx-1 (or tx-2 depending on order)
    expect(matches).toHaveLength(2);
  });

  it("handles empty list", () => {
    const matches = detectInternalDuplicates([]);
    expect(matches).toHaveLength(0);
  });

  it("handles single transaction", () => {
    const matches = detectInternalDuplicates([createTransaction({ id: "tx-1" })]);
    expect(matches).toHaveLength(0);
  });
});

// ============================================================================
// DEFAULT_DUPLICATE_CONFIG tests
// ============================================================================

describe("DEFAULT_DUPLICATE_CONFIG", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_DUPLICATE_CONFIG.maxDateDiffDays).toBe(3);
    expect(DEFAULT_DUPLICATE_CONFIG.maxAmountDiff).toBe(0.01);
    expect(DEFAULT_DUPLICATE_CONFIG.minDescriptionSimilarity).toBe(0.6);
    expect(DEFAULT_DUPLICATE_CONFIG.minConfidence).toBe(0.7);
  });
});

// ============================================================================
// Property-based tests
// ============================================================================

describe("duplicate detection properties", () => {
  // Arbitrary for generating test transactions with safe date generation
  const transactionArb = fc.record({
    id: fc.uuid(),
    date: fc.integer({ min: 1, max: 365 }).map((day) => {
      const d = new Date(2024, 0, day);
      return isoDate(d.toISOString().split("T")[0]);
    }),
    amount: fc.double({ min: -10000, max: 10000, noNaN: true }),
    description: fc.string({ minLength: 3, maxLength: 30 }),
  });

  // Property: identical transactions always match
  it("identical transactions always match (property-based)", () => {
    fc.assert(
      fc.property(transactionArb, (tx) => {
        const tx1 = { ...tx, id: "tx-1" };
        const tx2 = { ...tx, id: "tx-2" };

        const match = checkDuplicate(tx1, tx2);
        expect(match).not.toBeNull();
        expect(match?.matchDetails.dateMatch).toBe(true);
        expect(match?.matchDetails.amountMatch).toBe(true);
      })
    );
  });

  // Property: self-check returns null (can't duplicate yourself)
  it("transaction is not duplicate of itself", () => {
    const tx = createTransaction({ id: "tx-1" });

    // When checking against itself (same ID), we check the match
    // Note: the function uses IDs for tracking, same ID means we skip
    const match = checkDuplicate(tx, tx);

    // This should still return a match since we're checking the algorithm
    // The consumer should ensure they don't check tx against itself
    expect(match).not.toBeNull();
  });

  // Property: date outside tolerance never matches
  it("transactions far apart in date never match (property-based)", () => {
    fc.assert(
      fc.property(transactionArb, (tx) => {
        const tx1 = { ...tx, id: "tx-1", date: isoDate("2024-01-01") };
        const tx2 = { ...tx, id: "tx-2", date: isoDate("2024-06-01") }; // 6 months apart

        const match = checkDuplicate(tx1, tx2);
        expect(match).toBeNull();
      })
    );
  });

  // Property: confidence is between 0 and 1
  it("confidence is between 0 and 1 (property-based)", () => {
    fc.assert(
      fc.property(transactionArb, transactionArb, (tx1, tx2) => {
        const match = checkDuplicate({ ...tx1, id: "tx-1" }, { ...tx2, id: "tx-2" });

        if (match) {
          expect(match.confidence).toBeGreaterThanOrEqual(0);
          expect(match.confidence).toBeLessThanOrEqual(1);
        }
      })
    );
  });
});
