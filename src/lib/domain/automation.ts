/**
 * Automation Engine
 *
 * Evaluates automation rules against transactions and applies actions.
 * Used during import and manual rule application.
 */

import type { ActionData, ConditionData } from "@/components/features/automations";
import type { Automation, Transaction } from "@/lib/crdt/schema";

/**
 * Result of applying an automation to a transaction.
 */
export interface AutomationResult {
	/** Whether the automation matched */
	matched: boolean;
	/** Changes to apply to the transaction */
	changes: TransactionChanges;
	/** The automation that matched (for tracking) */
	automationId?: string;
	/** Error if condition evaluation failed */
	error?: string;
}

/**
 * Partial transaction changes that can be applied.
 * Uses plain types without loro-mirror's $cid.
 */
export interface TransactionChanges {
	tagIds?: string[];
	statusId?: string;
	allocations?: Record<string, number>;
}

/**
 * Validate a regex pattern.
 * Returns null if valid, error message if invalid.
 */
export function validateRegex(pattern: string): string | null {
	try {
		new RegExp(pattern);
		return null;
	} catch (e) {
		return e instanceof Error ? e.message : "Invalid regex pattern";
	}
}

/**
 * Evaluate a single condition against a transaction.
 */
export function evaluateCondition(condition: ConditionData, transaction: Transaction): boolean {
	// Get the value to check based on column
	let fieldValue: string;
	switch (condition.column) {
		case "merchant":
			fieldValue = transaction.merchant ?? "";
			break;
		case "description":
			fieldValue = transaction.description ?? "";
			break;
		case "amount":
			fieldValue = String(transaction.amount);
			break;
		case "accountId":
			fieldValue = transaction.accountId;
			break;
		default:
			return false;
	}

	// Apply case sensitivity
	const compareValue = condition.caseSensitive ? fieldValue : fieldValue.toLowerCase();
	const matchValue = condition.caseSensitive ? condition.value : condition.value.toLowerCase();

	// Evaluate based on operator
	switch (condition.operator) {
		case "contains":
			return compareValue.includes(matchValue);
		case "equals":
			return compareValue === matchValue;
		case "startsWith":
			return compareValue.startsWith(matchValue);
		case "endsWith":
			return compareValue.endsWith(matchValue);
		case "regex":
			try {
				const flags = condition.caseSensitive ? "" : "i";
				const regex = new RegExp(condition.value, flags);
				return regex.test(fieldValue);
			} catch {
				// Invalid regex, don't match
				return false;
			}
		default:
			return false;
	}
}

/**
 * Evaluate all conditions of an automation against a transaction.
 * All conditions must match (AND logic).
 */
export function evaluateConditions(conditions: ConditionData[], transaction: Transaction): boolean {
	if (conditions.length === 0) {
		return false; // No conditions = no match
	}
	return conditions.every((condition) => evaluateCondition(condition, transaction));
}

/**
 * Apply actions to a transaction and return the changes.
 */
export function applyActions(actions: ActionData[], _transaction: Transaction): TransactionChanges {
	const changes: TransactionChanges = {};

	for (const action of actions) {
		switch (action.type) {
			case "setTags":
				if (Array.isArray(action.value)) {
					changes.tagIds = action.value as string[];
				}
				break;
			case "setStatus":
				if (typeof action.value === "string") {
					changes.statusId = action.value;
				}
				break;
			case "setAllocation":
				if (typeof action.value === "object" && action.value !== null) {
					changes.allocations = action.value as Record<string, number>;
				}
				break;
		}
	}

	return changes;
}

/**
 * Evaluate a single automation against a transaction.
 */
export function evaluateAutomation(
	automation: Automation,
	transaction: Transaction
): AutomationResult {
	// Check if transaction is excluded from this automation
	const excludedIds = automation.excludedTransactionIds ?? [];
	if (Array.isArray(excludedIds) && excludedIds.includes(transaction.id)) {
		return { matched: false, changes: {} };
	}

	// Evaluate conditions
	const conditions = (automation.conditions ?? []) as ConditionData[];
	const matched = evaluateConditions(conditions, transaction);

	if (!matched) {
		return { matched: false, changes: {} };
	}

	// Apply actions
	const actions = (automation.actions ?? []) as ActionData[];
	const changes = applyActions(actions, transaction);

	return {
		matched: true,
		changes,
		automationId: automation.id,
	};
}

/**
 * Evaluate all automations against a transaction.
 * Returns the first matching automation's result.
 * Automations should be passed in order (sorted by order field).
 */
export function evaluateAutomations(
	automations: Automation[],
	transaction: Transaction
): AutomationResult {
	for (const automation of automations) {
		if (automation.deletedAt) continue;

		const result = evaluateAutomation(automation, transaction);
		if (result.matched) {
			return result;
		}
	}

	return { matched: false, changes: {} };
}

/**
 * Apply automations to multiple transactions.
 * Returns a map of transaction ID to changes.
 */
export function applyAutomationsToTransactions(
	automations: Automation[],
	transactions: Transaction[]
): Map<string, { changes: TransactionChanges; automationId: string }> {
	const results = new Map<string, { changes: TransactionChanges; automationId: string }>();

	// Sort automations by order
	const sortedAutomations = [...automations]
		.filter((a) => !a.deletedAt)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

	for (const transaction of transactions) {
		const result = evaluateAutomations(sortedAutomations, transaction);
		if (result.matched && result.automationId) {
			results.set(transaction.id, {
				changes: result.changes,
				automationId: result.automationId,
			});
		}
	}

	return results;
}

/**
 * Plain automation data without loro-mirror's $cid.
 */
export interface AutomationData {
	id: string;
	name: string;
	conditions: ConditionData[];
	actions: ActionData[];
	order: number;
	excludedTransactionIds: string[];
}

/**
 * Create an automation from a transaction.
 * Generates conditions based on transaction fields.
 */
export function createAutomationFromTransaction(
	transaction: Transaction,
	name: string
): AutomationData {
	const conditions: ConditionData[] = [];
	const actions: ActionData[] = [];

	// Create condition based on merchant if present
	if (transaction.merchant) {
		conditions.push({
			id: crypto.randomUUID(),
			column: "merchant",
			operator: "contains",
			value: transaction.merchant,
			caseSensitive: false,
		});
	} else if (transaction.description) {
		// Fallback to description
		conditions.push({
			id: crypto.randomUUID(),
			column: "description",
			operator: "contains",
			value: transaction.description,
			caseSensitive: false,
		});
	}

	// Create actions based on transaction fields
	const tagIds = transaction.tagIds;
	if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
		actions.push({
			id: crypto.randomUUID(),
			type: "setTags",
			value: [...tagIds],
		});
	}

	if (transaction.statusId) {
		actions.push({
			id: crypto.randomUUID(),
			type: "setStatus",
			value: transaction.statusId,
		});
	}

	const allocations = transaction.allocations;
	if (allocations && typeof allocations === "object" && Object.keys(allocations).length > 0) {
		actions.push({
			id: crypto.randomUUID(),
			type: "setAllocation",
			value: { ...allocations },
		});
	}

	return {
		id: crypto.randomUUID(),
		name,
		conditions,
		actions,
		order: 0,
		excludedTransactionIds: [],
	};
}

/**
 * Data for tracking automation application (for undo)
 */
export interface AutomationApplicationData {
	id: string;
	transactionId: string;
	automationId: string;
	appliedAt: number;
	previousValues: {
		tagIds?: string[];
		statusId?: string;
		allocations?: Record<string, number>;
	};
}

/**
 * Create an automation application record for undo capability.
 * Captures the previous values before applying automation changes.
 */
export function createAutomationApplication(
	transactionId: string,
	automationId: string,
	transaction: Transaction,
	changes: TransactionChanges
): AutomationApplicationData {
	const previousValues: AutomationApplicationData["previousValues"] = {};

	// Only capture previous values for fields that will be changed
	if (changes.tagIds !== undefined) {
		const tagIds = transaction.tagIds;
		previousValues.tagIds = Array.isArray(tagIds) ? [...tagIds] : [];
	}

	if (changes.statusId !== undefined) {
		previousValues.statusId = transaction.statusId;
	}

	if (changes.allocations !== undefined) {
		const allocations = transaction.allocations;
		previousValues.allocations =
			allocations && typeof allocations === "object" ? { ...allocations } : {};
	}

	return {
		id: crypto.randomUUID(),
		transactionId,
		automationId,
		appliedAt: Date.now(),
		previousValues,
	};
}

/**
 * Get the changes needed to undo an automation application.
 * Returns the previous values that should be restored.
 */
export function getUndoChanges(application: AutomationApplicationData): TransactionChanges {
	const changes: TransactionChanges = {};

	if (application.previousValues.tagIds !== undefined) {
		changes.tagIds = application.previousValues.tagIds;
	}

	if (application.previousValues.statusId !== undefined) {
		changes.statusId = application.previousValues.statusId;
	}

	if (application.previousValues.allocations !== undefined) {
		changes.allocations = application.previousValues.allocations;
	}

	return changes;
}

/**
 * Result of applying automations to transactions during import.
 */
export interface ApplyAutomationsResult {
	/** Map of transaction ID to the changes applied */
	appliedChanges: Map<string, TransactionChanges>;
	/** Automation application records for undo capability */
	applications: AutomationApplicationData[];
}

/**
 * Apply automations to transactions and create application records.
 * Used during import to track what was changed for undo.
 */
export function applyAutomationsWithTracking(
	automations: Automation[],
	transactions: Transaction[]
): ApplyAutomationsResult {
	const appliedChanges = new Map<string, TransactionChanges>();
	const applications: AutomationApplicationData[] = [];

	// Sort automations by order
	const sortedAutomations = [...automations]
		.filter((a) => !a.deletedAt)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

	for (const transaction of transactions) {
		const result = evaluateAutomations(sortedAutomations, transaction);
		if (result.matched && result.automationId) {
			// Record the application for undo
			const application = createAutomationApplication(
				transaction.id,
				result.automationId,
				transaction,
				result.changes
			);
			applications.push(application);
			appliedChanges.set(transaction.id, result.changes);
		}
	}

	return { appliedChanges, applications };
}
