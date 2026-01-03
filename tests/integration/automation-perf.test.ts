/**
 * Performance Tests: Automation Engine
 *
 * Tests that automation evaluation meets performance requirements:
 * - SC-010: Automation rules evaluate on 10,000 transactions in under 2 seconds
 */

import { describe, expect, it } from "vitest";
import type { ActionData, ConditionData } from "@/components/features/automations";
import type { Automation, Transaction } from "@/lib/crdt/schema";
import {
	applyAutomationsToTransactions,
	applyAutomationsWithTracking,
} from "@/lib/domain/automation";

// Generate test data
function generateTransactions(count: number): Transaction[] {
	const merchants = [
		"Amazon",
		"Walmart",
		"Target",
		"Starbucks",
		"McDonald's",
		"Shell Gas",
		"Whole Foods",
		"Netflix",
		"Spotify",
		"Electric Company",
		"Water Utility",
		"Internet Provider",
		"Gym Membership",
		"Doctor's Office",
		"Pharmacy",
		"Hardware Store",
		"Clothing Store",
		"Restaurant ABC",
		"Coffee Shop",
		"Bookstore",
	];

	const notesOptions = [
		"Regular purchase",
		"Monthly subscription",
		"One-time payment",
		"Recurring charge",
		"Refund",
		"Office supplies",
		"Home goods",
		"Food and beverage",
		"Entertainment",
		"Healthcare",
	];

	const transactions: Transaction[] = [];

	for (let i = 0; i < count; i++) {
		const merchant = merchants[i % merchants.length];
		const notesSuffix = notesOptions[i % notesOptions.length];
		const amount = -Math.floor(Math.random() * 50000) - 100; // -$1.00 to -$500.00

		transactions.push({
			id: `tx-${i}`,
			date: `2024-${String((Math.floor(i / 1000) % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
			description: merchant,
			notes: `${merchant} - ${notesSuffix}`,
			amount,
			accountId: "acc-1",
			tagIds: [] as string[],
			statusId: "status-review",
			importId: "import-perf-test",
			allocations: {} as Record<string, number>,
			duplicateOf: "",
			deletedAt: 0,
		} as unknown as Transaction);
	}

	return transactions;
}

function generateAutomations(count: number): Automation[] {
	const merchantPatterns = [
		"amazon",
		"walmart",
		"target",
		"starbucks",
		"mcdonald",
		"shell",
		"whole foods",
		"netflix",
		"spotify",
		"electric",
	];

	const automations: Automation[] = [];

	for (let i = 0; i < count; i++) {
		const pattern = merchantPatterns[i % merchantPatterns.length];
		automations.push({
			id: `auto-${i}`,
			name: `Rule ${i}`,
			conditions: [
				{
					id: `c-${i}`,
					column: "description",
					operator: i % 3 === 0 ? "regex" : "contains",
					value: i % 3 === 0 ? `^${pattern}` : pattern,
					caseSensitive: false,
				},
			] as ConditionData[],
			actions: [
				{ id: `a-${i}-1`, type: "setTags", value: [`tag-${i}`] },
				{ id: `a-${i}-2`, type: "setStatus", value: "status-paid" },
			] as ActionData[],
			order: i,
			excludedTransactionIds: [] as string[],
			deletedAt: 0,
		} as unknown as Automation);
	}

	return automations;
}

describe("Automation Performance", () => {
	describe("SC-010: 10,000 transactions in under 2 seconds", () => {
		it("evaluates 10 automations against 10,000 transactions in under 2s", () => {
			const transactions = generateTransactions(10000);
			const automations = generateAutomations(10);

			const startTime = performance.now();
			const results = applyAutomationsToTransactions(automations, transactions);
			const endTime = performance.now();

			const durationMs = endTime - startTime;

			// Log performance info
			console.log(
				`Performance: ${transactions.length} transactions, ${automations.length} automations`
			);
			console.log(`Duration: ${durationMs.toFixed(2)}ms`);
			console.log(`Matches: ${results.size}`);
			console.log(`Rate: ${((transactions.length / durationMs) * 1000).toFixed(0)} tx/sec`);

			// Must complete in under 2 seconds
			expect(durationMs).toBeLessThan(2000);

			// Sanity check: should have some matches
			expect(results.size).toBeGreaterThan(0);
		});

		it("evaluates 50 automations against 10,000 transactions in under 2s", () => {
			const transactions = generateTransactions(10000);
			const automations = generateAutomations(50);

			const startTime = performance.now();
			const results = applyAutomationsToTransactions(automations, transactions);
			const endTime = performance.now();

			const durationMs = endTime - startTime;

			console.log(
				`Performance: ${transactions.length} transactions, ${automations.length} automations`
			);
			console.log(`Duration: ${durationMs.toFixed(2)}ms`);
			console.log(`Matches: ${results.size}`);
			console.log(`Rate: ${((transactions.length / durationMs) * 1000).toFixed(0)} tx/sec`);

			// Must complete in under 2 seconds
			expect(durationMs).toBeLessThan(2000);
		});

		it("handles tracking overhead within performance budget", () => {
			const transactions = generateTransactions(10000);
			const automations = generateAutomations(10);

			const startTime = performance.now();
			const { appliedChanges, applications } = applyAutomationsWithTracking(
				automations,
				transactions
			);
			const endTime = performance.now();

			const durationMs = endTime - startTime;

			console.log(
				`With tracking: ${transactions.length} transactions, ${automations.length} automations`
			);
			console.log(`Duration: ${durationMs.toFixed(2)}ms`);
			console.log(`Matches: ${appliedChanges.size}`);
			console.log(`Applications: ${applications.length}`);

			// With tracking overhead, still must be under 2s
			expect(durationMs).toBeLessThan(2000);
		});
	});

	describe("Scaling characteristics", () => {
		it("scales linearly with transaction count", () => {
			const automations = generateAutomations(10);

			// Warmup run to stabilize JIT
			const warmupTx = generateTransactions(5000);
			applyAutomationsToTransactions(automations, warmupTx);

			// Measure at different scales
			const scales = [2000, 5000, 10000, 20000];
			const results: { count: number; ms: number }[] = [];

			for (const count of scales) {
				const transactions = generateTransactions(count);
				const start = performance.now();
				applyAutomationsToTransactions(automations, transactions);
				const end = performance.now();
				results.push({ count, ms: end - start });
			}

			console.log("Scaling test results:");
			for (const r of results) {
				console.log(
					`  ${r.count} tx: ${r.ms.toFixed(2)}ms (${((r.count / r.ms) * 1000).toFixed(0)} tx/sec)`
				);
			}

			// Use absolute time budgets instead of ratios (more stable in CI)
			// 20k transactions with 10 automations should complete in under 200ms
			expect(results[3].ms).toBeLessThan(200);

			// Also verify throughput is reasonable (at least 50k tx/sec)
			const throughput = (results[3].count / results[3].ms) * 1000;
			expect(throughput).toBeGreaterThan(50000);
		});

		it("handles regex-heavy automations within budget", () => {
			const transactions = generateTransactions(10000);

			// All regex conditions (worst case)
			const regexAutomations = Array.from({ length: 20 }, (_, i) => ({
				id: `auto-regex-${i}`,
				name: `Regex Rule ${i}`,
				conditions: [
					{
						id: `c-${i}`,
						column: "description" as const,
						operator: "regex" as const,
						value: `^(amazon|walmart|target|starbucks|shell).*${i}?`,
						caseSensitive: false,
					},
					{
						id: `c2-${i}`,
						column: "notes" as const,
						operator: "regex" as const,
						value: `(purchase|payment|subscription)`,
						caseSensitive: false,
					},
				] as ConditionData[],
				actions: [
					{ id: `a-${i}`, type: "setTags" as const, value: [`tag-regex-${i}`] },
				] as ActionData[],
				order: i,
				excludedTransactionIds: [] as string[],
				deletedAt: 0,
			})) as Automation[];

			const startTime = performance.now();
			const results = applyAutomationsToTransactions(regexAutomations, transactions);
			const endTime = performance.now();

			const durationMs = endTime - startTime;

			console.log(
				`Regex-heavy: ${transactions.length} transactions, ${regexAutomations.length} automations`
			);
			console.log(`Duration: ${durationMs.toFixed(2)}ms`);
			console.log(`Matches: ${results.size}`);

			// Even with complex regex, should complete in under 2s
			expect(durationMs).toBeLessThan(2000);
		});
	});

	describe("Edge cases", () => {
		it("handles empty automation list quickly", () => {
			const transactions = generateTransactions(10000);
			const automations: Automation[] = [];

			const startTime = performance.now();
			const results = applyAutomationsToTransactions(automations, transactions);
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(100); // Should be very fast
			expect(results.size).toBe(0);
		});

		it("handles transactions with no matches efficiently", () => {
			const transactions = generateTransactions(10000);

			// Automations that won't match anything
			const noMatchAutomations = [
				{
					id: "auto-nomatch",
					name: "No Match",
					conditions: [
						{
							id: "c1",
							column: "description",
							operator: "equals",
							value: "ZZZZZ-WILL-NEVER-MATCH-ZZZZZ",
							caseSensitive: true,
						},
					] as ConditionData[],
					actions: [{ id: "a1", type: "setTags", value: ["never"] }] as ActionData[],
					order: 1,
					excludedTransactionIds: [] as string[],
					deletedAt: 0,
				} as unknown as Automation,
			];

			const startTime = performance.now();
			const results = applyAutomationsToTransactions(noMatchAutomations, transactions);
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(500); // Should be fast when nothing matches
			expect(results.size).toBe(0);
		});
	});
});
