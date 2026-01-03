/**
 * Unit Tests: Automation Condition Matching
 *
 * Tests for automation condition evaluation and action application.
 * Uses table-driven tests for comprehensive coverage.
 */

import { describe, expect, it } from "vitest";
import type { ActionData, ConditionData } from "@/components/features/automations";
import type { Automation, Transaction } from "@/lib/crdt/schema";
import {
	applyActions,
	applyAutomationsWithTracking,
	createAutomationApplication,
	createAutomationFromTransaction,
	evaluateAutomation,
	evaluateAutomations,
	evaluateCondition,
	evaluateConditions,
	getUndoChanges,
	validateRegex,
} from "@/lib/domain/automation";

// Helper to create a transaction for testing
function createTransaction(overrides: Partial<Omit<Transaction, "$cid">> = {}): Transaction {
	return {
		id: "tx-1",
		date: "2024-01-15",
		description: "Amazon",
		notes: "Office Supplies",
		amount: -5000, // -$50.00
		accountId: "acc-1",
		tagIds: [] as string[],
		statusId: "status-1",
		importId: "import-1",
		allocations: {} as Record<string, number>,
		duplicateOf: "",
		deletedAt: 0,
		...overrides,
	} as unknown as Transaction;
}

// Helper to create an automation for testing
function createAutomation(overrides: Record<string, unknown> = {}): Automation {
	const base = {
		id: "auto-1",
		name: "Test Automation",
		conditions: [] as ConditionData[],
		actions: [] as ActionData[],
		order: 0,
		excludedTransactionIds: [] as string[],
		deletedAt: 0,
	};
	return { ...base, ...overrides } as unknown as Automation;
}

describe("validateRegex", () => {
	it("should return null for valid regex patterns", () => {
		expect(validateRegex(".*")).toBeNull();
		expect(validateRegex("^Amazon")).toBeNull();
		expect(validateRegex("\\d+")).toBeNull();
		expect(validateRegex("[a-z]+")).toBeNull();
	});

	it("should return error message for invalid regex patterns", () => {
		expect(validateRegex("[")).not.toBeNull();
		expect(validateRegex("(")).not.toBeNull();
		expect(validateRegex("*")).not.toBeNull();
	});
});

describe("evaluateCondition", () => {
	describe("contains operator", () => {
		const tests: Array<{
			name: string;
			condition: ConditionData;
			transaction: Transaction;
			expected: boolean;
		}> = [
			{
				name: "matches when description contains value (case insensitive)",
				condition: {
					id: "c1",
					column: "description",
					operator: "contains",
					value: "amazon",
					caseSensitive: false,
				},
				transaction: createTransaction({ description: "Amazon" }),
				expected: true,
			},
			{
				name: "does not match when description does not contain value",
				condition: {
					id: "c1",
					column: "description",
					operator: "contains",
					value: "walmart",
					caseSensitive: false,
				},
				transaction: createTransaction({ description: "Amazon" }),
				expected: false,
			},
			{
				name: "respects case sensitivity",
				condition: {
					id: "c1",
					column: "description",
					operator: "contains",
					value: "amazon",
					caseSensitive: true,
				},
				transaction: createTransaction({ description: "Amazon" }),
				expected: false,
			},
			{
				name: "matches notes field",
				condition: {
					id: "c1",
					column: "notes",
					operator: "contains",
					value: "supplies",
					caseSensitive: false,
				},
				transaction: createTransaction({ notes: "Office Supplies" }),
				expected: true,
			},
		];

		for (const { name, condition, transaction, expected } of tests) {
			it(name, () => {
				expect(evaluateCondition(condition, transaction)).toBe(expected);
			});
		}
	});

	describe("equals operator", () => {
		const tests: Array<{
			name: string;
			condition: ConditionData;
			transaction: Transaction;
			expected: boolean;
		}> = [
			{
				name: "matches exact value (case insensitive)",
				condition: {
					id: "c1",
					column: "description",
					operator: "equals",
					value: "amazon",
					caseSensitive: false,
				},
				transaction: createTransaction({ description: "Amazon" }),
				expected: true,
			},
			{
				name: "does not match partial value",
				condition: {
					id: "c1",
					column: "description",
					operator: "equals",
					value: "amaz",
					caseSensitive: false,
				},
				transaction: createTransaction({ description: "Amazon" }),
				expected: false,
			},
		];

		for (const { name, condition, transaction, expected } of tests) {
			it(name, () => {
				expect(evaluateCondition(condition, transaction)).toBe(expected);
			});
		}
	});

	describe("startsWith operator", () => {
		it("matches when description starts with value", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "description",
				operator: "startsWith",
				value: "ama",
				caseSensitive: false,
			};
			expect(evaluateCondition(condition, createTransaction({ description: "Amazon" }))).toBe(true);
		});

		it("does not match when description does not start with value", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "description",
				operator: "startsWith",
				value: "zon",
				caseSensitive: false,
			};
			expect(evaluateCondition(condition, createTransaction({ description: "Amazon" }))).toBe(
				false
			);
		});
	});

	describe("endsWith operator", () => {
		it("matches when description ends with value", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "description",
				operator: "endsWith",
				value: "zon",
				caseSensitive: false,
			};
			expect(evaluateCondition(condition, createTransaction({ description: "Amazon" }))).toBe(true);
		});

		it("does not match when description does not end with value", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "description",
				operator: "endsWith",
				value: "ama",
				caseSensitive: false,
			};
			expect(evaluateCondition(condition, createTransaction({ description: "Amazon" }))).toBe(
				false
			);
		});
	});

	describe("regex operator", () => {
		it("matches regex pattern", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "description",
				operator: "regex",
				value: "^Am.*n$",
				caseSensitive: false,
			};
			expect(evaluateCondition(condition, createTransaction({ description: "Amazon" }))).toBe(true);
		});

		it("does not match invalid regex (returns false)", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "description",
				operator: "regex",
				value: "[", // Invalid regex
				caseSensitive: false,
			};
			expect(evaluateCondition(condition, createTransaction({ description: "Amazon" }))).toBe(
				false
			);
		});

		it("respects case sensitivity in regex", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "description",
				operator: "regex",
				value: "amazon",
				caseSensitive: true,
			};
			expect(evaluateCondition(condition, createTransaction({ description: "Amazon" }))).toBe(
				false
			);
		});
	});

	describe("amount column", () => {
		it("matches amount as string", () => {
			const condition: ConditionData = {
				id: "c1",
				column: "amount",
				operator: "contains",
				value: "-5000",
				caseSensitive: false,
			};
			expect(evaluateCondition(condition, createTransaction({ amount: -5000 }))).toBe(true);
		});
	});
});

describe("evaluateConditions", () => {
	it("returns false for empty conditions", () => {
		expect(evaluateConditions([], createTransaction())).toBe(false);
	});

	it("returns true when all conditions match (AND logic)", () => {
		const conditions: ConditionData[] = [
			{
				id: "c1",
				column: "description",
				operator: "contains",
				value: "amazon",
				caseSensitive: false,
			},
			{
				id: "c2",
				column: "notes",
				operator: "contains",
				value: "supplies",
				caseSensitive: false,
			},
		];
		expect(evaluateConditions(conditions, createTransaction())).toBe(true);
	});

	it("returns false when any condition does not match", () => {
		const conditions: ConditionData[] = [
			{
				id: "c1",
				column: "description",
				operator: "contains",
				value: "amazon",
				caseSensitive: false,
			},
			{
				id: "c2",
				column: "notes",
				operator: "contains",
				value: "electronics",
				caseSensitive: false,
			},
		];
		expect(evaluateConditions(conditions, createTransaction())).toBe(false);
	});
});

describe("applyActions", () => {
	it("sets tag IDs", () => {
		const actions: ActionData[] = [{ id: "a1", type: "setTags", value: ["tag-1", "tag-2"] }];
		const changes = applyActions(actions, createTransaction());
		expect(changes.tagIds).toEqual(["tag-1", "tag-2"]);
	});

	it("sets status ID", () => {
		const actions: ActionData[] = [{ id: "a1", type: "setStatus", value: "status-paid" }];
		const changes = applyActions(actions, createTransaction());
		expect(changes.statusId).toBe("status-paid");
	});

	it("sets allocations", () => {
		const actions: ActionData[] = [
			{ id: "a1", type: "setAllocation", value: { "person-1": 60, "person-2": 40 } },
		];
		const changes = applyActions(actions, createTransaction());
		expect(changes.allocations).toEqual({ "person-1": 60, "person-2": 40 });
	});

	it("applies multiple actions", () => {
		const actions: ActionData[] = [
			{ id: "a1", type: "setTags", value: ["tag-1"] },
			{ id: "a2", type: "setStatus", value: "status-paid" },
		];
		const changes = applyActions(actions, createTransaction());
		expect(changes.tagIds).toEqual(["tag-1"]);
		expect(changes.statusId).toBe("status-paid");
	});
});

describe("evaluateAutomation", () => {
	it("returns matched=false for automation with no conditions", () => {
		const automation = createAutomation({ conditions: [] as ConditionData[] });
		const result = evaluateAutomation(automation, createTransaction());
		expect(result.matched).toBe(false);
	});

	it("returns matched=true and applies actions when conditions match", () => {
		const automation = createAutomation({
			conditions: [
				{
					id: "c1",
					column: "description",
					operator: "contains",
					value: "amazon",
					caseSensitive: false,
				},
			] as ConditionData[],
			actions: [{ id: "a1", type: "setTags", value: ["shopping"] }] as ActionData[],
		});
		const result = evaluateAutomation(automation, createTransaction());
		expect(result.matched).toBe(true);
		expect(result.changes.tagIds).toEqual(["shopping"]);
		expect(result.automationId).toBe("auto-1");
	});

	it("excludes transactions in excludedTransactionIds", () => {
		const automation = createAutomation({
			conditions: [
				{
					id: "c1",
					column: "description",
					operator: "contains",
					value: "amazon",
					caseSensitive: false,
				},
			] as ConditionData[],
			excludedTransactionIds: ["tx-1"],
		});
		const result = evaluateAutomation(automation, createTransaction({ id: "tx-1" }));
		expect(result.matched).toBe(false);
	});
});

describe("evaluateAutomations", () => {
	it("returns first matching automation", () => {
		const automations: Automation[] = [
			createAutomation({
				id: "auto-1",
				conditions: [
					{
						id: "c1",
						column: "description",
						operator: "equals",
						value: "walmart",
						caseSensitive: false,
					},
				] as ConditionData[],
				order: 1,
			}),
			createAutomation({
				id: "auto-2",
				conditions: [
					{
						id: "c1",
						column: "description",
						operator: "contains",
						value: "amazon",
						caseSensitive: false,
					},
				] as ConditionData[],
				actions: [{ id: "a1", type: "setTags", value: ["online-shopping"] }] as ActionData[],
				order: 2,
			}),
		];
		const result = evaluateAutomations(automations, createTransaction());
		expect(result.matched).toBe(true);
		expect(result.automationId).toBe("auto-2");
		expect(result.changes.tagIds).toEqual(["online-shopping"]);
	});

	it("skips deleted automations", () => {
		const automations: Automation[] = [
			createAutomation({
				id: "auto-1",
				conditions: [
					{
						id: "c1",
						column: "description",
						operator: "contains",
						value: "amazon",
						caseSensitive: false,
					},
				] as ConditionData[],
				deletedAt: Date.now(),
			}),
		];
		const result = evaluateAutomations(automations, createTransaction());
		expect(result.matched).toBe(false);
	});
});

describe("createAutomationFromTransaction", () => {
	it("creates automation with description condition when description is present", () => {
		const tx = createTransaction({ description: "Amazon", tagIds: ["tag-1"] as string[] });
		const automation = createAutomationFromTransaction(tx, "Amazon Rule");

		expect(automation.name).toBe("Amazon Rule");
		expect(automation.conditions).toHaveLength(1);
		expect(automation.conditions[0].column).toBe("description");
		expect(automation.conditions[0].value).toBe("Amazon");
	});

	it("creates automation with notes condition when description is empty", () => {
		const tx = createTransaction({ description: "", notes: "Office Supplies" });
		const automation = createAutomationFromTransaction(tx, "Office Rule");

		expect(automation.conditions).toHaveLength(1);
		expect(automation.conditions[0].column).toBe("notes");
		expect(automation.conditions[0].value).toBe("Office Supplies");
	});

	it("includes tag action when transaction has tags", () => {
		const tx = createTransaction({ tagIds: ["tag-1", "tag-2"] as string[] });
		const automation = createAutomationFromTransaction(tx, "Test");

		const tagAction = automation.actions.find((a) => a.type === "setTags");
		expect(tagAction).toBeDefined();
		expect(tagAction?.value).toEqual(["tag-1", "tag-2"]);
	});

	it("includes status action when transaction has status", () => {
		const tx = createTransaction({ statusId: "status-paid" });
		const automation = createAutomationFromTransaction(tx, "Test");

		const statusAction = automation.actions.find((a) => a.type === "setStatus");
		expect(statusAction).toBeDefined();
		expect(statusAction?.value).toBe("status-paid");
	});
});

describe("createAutomationApplication", () => {
	it("captures previous tag IDs when tags will change", () => {
		const tx = createTransaction({ tagIds: ["old-tag"] as string[] });
		const changes = { tagIds: ["new-tag"] };
		const application = createAutomationApplication("tx-1", "auto-1", tx, changes);

		expect(application.previousValues.tagIds).toEqual(["old-tag"]);
	});

	it("captures previous status when status will change", () => {
		const tx = createTransaction({ statusId: "status-old" });
		const changes = { statusId: "status-new" };
		const application = createAutomationApplication("tx-1", "auto-1", tx, changes);

		expect(application.previousValues.statusId).toBe("status-old");
	});

	it("only captures values for fields that will change", () => {
		const tx = createTransaction({ statusId: "status-1", tagIds: ["tag-1"] as string[] });
		const changes = { statusId: "status-2" }; // Only status changes
		const application = createAutomationApplication("tx-1", "auto-1", tx, changes);

		expect(application.previousValues.statusId).toBe("status-1");
		expect(application.previousValues.tagIds).toBeUndefined();
	});
});

describe("getUndoChanges", () => {
	it("returns previous values as changes", () => {
		const application = {
			id: "app-1",
			transactionId: "tx-1",
			automationId: "auto-1",
			appliedAt: Date.now(),
			previousValues: {
				tagIds: ["old-tag"],
				statusId: "old-status",
			},
		};

		const changes = getUndoChanges(application);
		expect(changes.tagIds).toEqual(["old-tag"]);
		expect(changes.statusId).toBe("old-status");
	});
});

describe("applyAutomationsWithTracking", () => {
	it("applies automations and creates application records", () => {
		const automations: Automation[] = [
			createAutomation({
				id: "auto-1",
				conditions: [
					{
						id: "c1",
						column: "description",
						operator: "contains",
						value: "amazon",
						caseSensitive: false,
					},
				] as ConditionData[],
				actions: [{ id: "a1", type: "setTags", value: ["shopping"] }] as ActionData[],
			}),
		];
		const transactions = [createTransaction({ id: "tx-1" }), createTransaction({ id: "tx-2" })];

		const { appliedChanges, applications } = applyAutomationsWithTracking(
			automations,
			transactions
		);

		expect(appliedChanges.size).toBe(2);
		expect(applications).toHaveLength(2);
		expect(applications[0].transactionId).toBe("tx-1");
		expect(applications[0].automationId).toBe("auto-1");
	});

	it("does not apply to transactions that do not match", () => {
		const automations: Automation[] = [
			createAutomation({
				id: "auto-1",
				conditions: [
					{
						id: "c1",
						column: "description",
						operator: "equals",
						value: "walmart",
						caseSensitive: false,
					},
				] as ConditionData[],
			}),
		];
		const transactions = [createTransaction({ description: "Amazon" })];

		const { appliedChanges, applications } = applyAutomationsWithTracking(
			automations,
			transactions
		);

		expect(appliedChanges.size).toBe(0);
		expect(applications).toHaveLength(0);
	});
});
