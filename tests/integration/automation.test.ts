/**
 * Integration Tests: Automation Engine
 *
 * Tests the complete automation workflow including:
 * - Automation evaluation during import
 * - Multi-automation ordering and priority
 * - Exclusion list handling
 * - Undo capability
 */

import { describe, it, expect } from "vitest";
import {
  evaluateAutomations,
  applyAutomationsToTransactions,
  applyAutomationsWithTracking,
  createAutomationFromTransaction,
  getUndoChanges,
  type AutomationApplicationData,
} from "@/lib/domain/automation";
import type { Transaction, Automation } from "@/lib/crdt/schema";
import type { ConditionData, ActionData } from "@/components/features/automations";

// Test fixtures
const fixtures = {
  transactions: {
    amazon: {
      id: "tx-amazon-1",
      date: "2024-01-15",
      merchant: "Amazon",
      description: "Office Supplies - Pens and Notebooks",
      amount: -2500,
      accountId: "acc-checking",
      tagIds: [] as string[],
      statusId: "status-review",
      importId: "import-1",
      allocations: {} as Record<string, number>,
      duplicateOf: "",
      deletedAt: 0,
    } as unknown as Transaction,
    starbucks: {
      id: "tx-starbucks-1",
      date: "2024-01-16",
      merchant: "Starbucks",
      description: "Coffee and Pastry",
      amount: -850,
      accountId: "acc-checking",
      tagIds: [] as string[],
      statusId: "status-review",
      importId: "import-1",
      allocations: {} as Record<string, number>,
      duplicateOf: "",
      deletedAt: 0,
    } as unknown as Transaction,
    salary: {
      id: "tx-salary-1",
      date: "2024-01-30",
      merchant: "ACME Corp",
      description: "Monthly Salary",
      amount: 500000,
      accountId: "acc-checking",
      tagIds: [] as string[],
      statusId: "status-review",
      importId: "import-1",
      allocations: {} as Record<string, number>,
      duplicateOf: "",
      deletedAt: 0,
    } as unknown as Transaction,
    groceries: {
      id: "tx-groceries-1",
      date: "2024-01-17",
      merchant: "Whole Foods Market",
      description: "Weekly Groceries",
      amount: -15000,
      accountId: "acc-checking",
      tagIds: [] as string[],
      statusId: "status-review",
      importId: "import-1",
      allocations: {} as Record<string, number>,
      duplicateOf: "",
      deletedAt: 0,
    } as unknown as Transaction,
  },
  automations: {
    amazonShopping: {
      id: "auto-amazon",
      name: "Amazon -> Shopping",
      conditions: [
        {
          id: "c1",
          column: "merchant",
          operator: "contains",
          value: "amazon",
          caseSensitive: false,
        },
      ] as ConditionData[],
      actions: [
        { id: "a1", type: "setTags", value: ["tag-shopping", "tag-online"] },
      ] as ActionData[],
      order: 1,
      excludedTransactionIds: [] as string[],
      deletedAt: 0,
    } as unknown as Automation,
    coffeeFood: {
      id: "auto-coffee",
      name: "Coffee -> Food & Drink",
      conditions: [
        {
          id: "c1",
          column: "merchant",
          operator: "regex",
          value: "starbucks|dunkin|coffee",
          caseSensitive: false,
        },
      ] as ConditionData[],
      actions: [
        { id: "a1", type: "setTags", value: ["tag-food"] },
        { id: "a2", type: "setStatus", value: "status-paid" },
      ] as ActionData[],
      order: 2,
      excludedTransactionIds: [] as string[],
      deletedAt: 0,
    } as unknown as Automation,
    incomeRule: {
      id: "auto-income",
      name: "Salary -> Income",
      conditions: [
        {
          id: "c1",
          column: "description",
          operator: "contains",
          value: "salary",
          caseSensitive: false,
        },
      ] as ConditionData[],
      actions: [
        { id: "a1", type: "setTags", value: ["tag-income"] },
        { id: "a2", type: "setStatus", value: "status-paid" },
        { id: "a3", type: "setAllocation", value: { "person-1": 100 } },
      ] as ActionData[],
      order: 3,
      excludedTransactionIds: [] as string[],
      deletedAt: 0,
    } as unknown as Automation,
    catchAllFood: {
      id: "auto-food-catchall",
      name: "Food Keywords -> Food",
      conditions: [
        {
          id: "c1",
          column: "description",
          operator: "regex",
          value: "groceries|food|restaurant|cafe",
          caseSensitive: false,
        },
      ] as ConditionData[],
      actions: [{ id: "a1", type: "setTags", value: ["tag-food"] }] as ActionData[],
      order: 10, // Lower priority
      excludedTransactionIds: [] as string[],
      deletedAt: 0,
    } as unknown as Automation,
  },
};

describe("Automation Engine Integration", () => {
  describe("Single automation matching", () => {
    it("applies automation to matching transaction", () => {
      const automations = [fixtures.automations.amazonShopping];
      const result = evaluateAutomations(automations, fixtures.transactions.amazon);

      expect(result.matched).toBe(true);
      expect(result.automationId).toBe("auto-amazon");
      expect(result.changes.tagIds).toEqual(["tag-shopping", "tag-online"]);
    });

    it("does not match non-matching transaction", () => {
      const automations = [fixtures.automations.amazonShopping];
      const result = evaluateAutomations(automations, fixtures.transactions.starbucks);

      expect(result.matched).toBe(false);
    });
  });

  describe("Multiple automations with ordering", () => {
    it("applies first matching automation in order", () => {
      const automations = [
        fixtures.automations.amazonShopping,
        fixtures.automations.coffeeFood,
        fixtures.automations.catchAllFood,
      ];

      // Starbucks matches both coffeeFood and catchAllFood
      const result = evaluateAutomations(automations, fixtures.transactions.starbucks);

      expect(result.matched).toBe(true);
      expect(result.automationId).toBe("auto-coffee"); // Lower order number = higher priority
      expect(result.changes.statusId).toBe("status-paid");
    });

    it("respects automation order for groceries matching multiple rules", () => {
      // Groceries description contains "groceries" which matches catchAllFood
      const automations = [
        fixtures.automations.amazonShopping,
        fixtures.automations.coffeeFood,
        fixtures.automations.catchAllFood,
      ];

      const result = evaluateAutomations(automations, fixtures.transactions.groceries);

      expect(result.matched).toBe(true);
      expect(result.automationId).toBe("auto-food-catchall");
      expect(result.changes.tagIds).toEqual(["tag-food"]);
    });
  });

  describe("Exclusion list handling", () => {
    it("skips excluded transactions", () => {
      const automationWithExclusion = {
        ...fixtures.automations.amazonShopping,
        excludedTransactionIds: ["tx-amazon-1"],
      } as Automation;

      const result = evaluateAutomations([automationWithExclusion], fixtures.transactions.amazon);

      expect(result.matched).toBe(false);
    });

    it("still matches non-excluded transactions", () => {
      const automationWithExclusion = {
        ...fixtures.automations.amazonShopping,
        excludedTransactionIds: ["tx-other"],
      } as Automation;

      const result = evaluateAutomations([automationWithExclusion], fixtures.transactions.amazon);

      expect(result.matched).toBe(true);
    });
  });

  describe("Batch processing", () => {
    it("applies automations to multiple transactions", () => {
      const automations = [
        fixtures.automations.amazonShopping,
        fixtures.automations.coffeeFood,
        fixtures.automations.incomeRule,
      ];
      const transactions = [
        fixtures.transactions.amazon,
        fixtures.transactions.starbucks,
        fixtures.transactions.salary,
        fixtures.transactions.groceries, // No matching automation
      ];

      const results = applyAutomationsToTransactions(automations, transactions);

      expect(results.size).toBe(3); // Amazon, Starbucks, Salary match
      expect(results.get("tx-amazon-1")?.automationId).toBe("auto-amazon");
      expect(results.get("tx-starbucks-1")?.automationId).toBe("auto-coffee");
      expect(results.get("tx-salary-1")?.automationId).toBe("auto-income");
      expect(results.has("tx-groceries-1")).toBe(false);
    });
  });

  describe("Automation tracking for undo", () => {
    it("creates application records with previous values", () => {
      const automations = [fixtures.automations.incomeRule];
      const transaction = {
        ...fixtures.transactions.salary,
        tagIds: ["existing-tag"] as string[],
        statusId: "status-review",
        allocations: { "person-2": 50, "person-3": 50 } as Record<string, number>,
      } as unknown as Transaction;

      const { applications } = applyAutomationsWithTracking(automations, [transaction]);

      expect(applications).toHaveLength(1);
      expect(applications[0].previousValues.tagIds).toEqual(["existing-tag"]);
      expect(applications[0].previousValues.statusId).toBe("status-review");
      expect(applications[0].previousValues.allocations).toEqual({
        "person-2": 50,
        "person-3": 50,
      });
    });

    it("allows undoing automation changes", () => {
      const transaction = {
        ...fixtures.transactions.salary,
        tagIds: ["old-tag"] as string[],
        statusId: "old-status",
      } as unknown as Transaction;

      const application: AutomationApplicationData = {
        id: "app-1",
        transactionId: transaction.id,
        automationId: "auto-income",
        appliedAt: Date.now(),
        previousValues: {
          tagIds: ["old-tag"],
          statusId: "old-status",
        },
      };

      const undoChanges = getUndoChanges(application);

      expect(undoChanges.tagIds).toEqual(["old-tag"]);
      expect(undoChanges.statusId).toBe("old-status");
    });
  });

  describe("Creating automations from transactions", () => {
    it("creates automation from a categorized transaction", () => {
      const categorizedTx = {
        ...fixtures.transactions.amazon,
        tagIds: ["tag-shopping", "tag-electronics"] as string[],
        statusId: "status-paid",
        allocations: { "person-1": 60, "person-2": 40 } as Record<string, number>,
      } as unknown as Transaction;

      const automation = createAutomationFromTransaction(categorizedTx, "Amazon Shopping Rule");

      expect(automation.name).toBe("Amazon Shopping Rule");
      expect(automation.conditions).toHaveLength(1);
      expect(automation.conditions[0].column).toBe("merchant");
      expect(automation.conditions[0].value).toBe("Amazon");

      // Check actions
      const tagAction = automation.actions.find((a) => a.type === "setTags");
      expect(tagAction?.value).toEqual(["tag-shopping", "tag-electronics"]);

      const statusAction = automation.actions.find((a) => a.type === "setStatus");
      expect(statusAction?.value).toBe("status-paid");

      const allocationAction = automation.actions.find((a) => a.type === "setAllocation");
      expect(allocationAction?.value).toEqual({ "person-1": 60, "person-2": 40 });
    });

    it("uses description when merchant is empty", () => {
      const txNoMerchant: Transaction = {
        ...fixtures.transactions.amazon,
        merchant: "",
        description: "Bank Transfer - Rent Payment",
      };

      const automation = createAutomationFromTransaction(txNoMerchant, "Rent Rule");

      expect(automation.conditions[0].column).toBe("description");
      expect(automation.conditions[0].value).toBe("Bank Transfer - Rent Payment");
    });
  });

  describe("Deleted automations handling", () => {
    it("ignores deleted automations", () => {
      const deletedAutomation: Automation = {
        ...fixtures.automations.amazonShopping,
        deletedAt: Date.now(),
      };

      const result = evaluateAutomations([deletedAutomation], fixtures.transactions.amazon);

      expect(result.matched).toBe(false);
    });

    it("processes remaining automations after deleted ones", () => {
      const automations: Automation[] = [
        { ...fixtures.automations.amazonShopping, deletedAt: Date.now() },
        fixtures.automations.catchAllFood, // Not deleted, but won't match Amazon
      ];

      const result = evaluateAutomations(automations, fixtures.transactions.amazon);

      // catchAllFood doesn't match Amazon merchant
      expect(result.matched).toBe(false);
    });
  });

  describe("Complex condition patterns", () => {
    it("handles regex with multiple patterns", () => {
      const multiPatternAutomation = {
        id: "auto-multi",
        name: "Multiple Stores",
        conditions: [
          {
            id: "c1",
            column: "merchant",
            operator: "regex",
            value: "amazon|walmart|target|costco",
            caseSensitive: false,
          },
        ] as ConditionData[],
        actions: [{ id: "a1", type: "setTags", value: ["tag-retail"] }] as ActionData[],
        order: 1,
        excludedTransactionIds: [] as string[],
        deletedAt: 0,
      } as unknown as Automation;

      expect(
        evaluateAutomations([multiPatternAutomation], fixtures.transactions.amazon).matched
      ).toBe(true);
    });

    it("handles amount-based conditions", () => {
      const largeExpenseAutomation = {
        id: "auto-large",
        name: "Large Expenses",
        conditions: [
          {
            id: "c1",
            column: "amount",
            operator: "regex",
            value: "^-[1-9]\\d{4,}$", // -10000 or less (more negative)
            caseSensitive: false,
          },
        ] as ConditionData[],
        actions: [{ id: "a1", type: "setTags", value: ["tag-large-expense"] }] as ActionData[],
        order: 1,
        excludedTransactionIds: [] as string[],
        deletedAt: 0,
      } as unknown as Automation;

      // -15000 matches (5 digit negative)
      expect(
        evaluateAutomations([largeExpenseAutomation], fixtures.transactions.groceries).matched
      ).toBe(true);
      // -850 doesn't match (only 3 digits)
      expect(
        evaluateAutomations([largeExpenseAutomation], fixtures.transactions.starbucks).matched
      ).toBe(false);
    });
  });
});
