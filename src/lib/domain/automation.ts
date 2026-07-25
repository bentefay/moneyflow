/**
 * Automation Engine
 *
 * Evaluates automation rules against transactions and applies actions.
 * Used during import and manual rule application.
 */

import { Temporal } from "temporal-polyfill";

import type { ActionData, ConditionData } from "@/components/features/automations";
import {
    copyAllocationData,
    prepareAllocationReplacement,
    replaceTransactionAllocations,
    type AllocationBoundaryError,
    type AllocationBoundaryResult
} from "@/lib/crdt/allocations";
import { DEFAULT_AUTOMATION_ORDER } from "@/lib/crdt/defaults";
import {
    findTransactionInStore,
    type TransactionLocation,
    updateTransaction
} from "@/lib/crdt/mutations";
import type { Automation, Transaction, TransactionStore } from "@/lib/crdt/schema";

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
    error?: AllocationBoundaryError;
}

/**
 * Partial transaction changes that can be applied.
 * Uses plain types without loro-mirror's $cid.
 */
export interface TransactionChanges {
    tagIds?: string[];
    statusId?: string;
    allocations?: unknown;
}

type PreparedActionsResult =
    | { readonly changes: TransactionChanges; readonly ok: true }
    | { readonly error: AllocationBoundaryError; readonly ok: false };

function prepareActions(actions: ActionData[]): PreparedActionsResult {
    let allocations: Record<string, number> | undefined;
    for (const action of actions) {
        if (action.type !== "setAllocation") continue;
        const prepared = prepareAllocationReplacement(action.value);
        if (!prepared.ok) {
            return {
                error: prepared.error,
                ok: false
            };
        }
        allocations = Object.fromEntries(Object.entries(prepared.value));
    }

    const changes: TransactionChanges = {};
    for (const action of actions) {
        switch (action.type) {
            case "setTags":
                if (Array.isArray(action.value)) changes.tagIds = [...(action.value as string[])];
                break;
            case "setStatus":
                if (typeof action.value === "string") changes.statusId = action.value;
                break;
            case "setAllocation":
                break;
        }
    }
    if (allocations !== undefined) changes.allocations = allocations;
    return { changes, ok: true };
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
        case "description":
            fieldValue = transaction.description ?? "";
            break;
        case "notes":
            fieldValue = transaction.notes ?? "";
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
 * Note: Second parameter reserved for future action types that may reference transaction data.
 */
export function applyActions(
    actions: ActionData[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: Transaction
): TransactionChanges {
    const prepared = prepareActions(actions);
    return prepared.ok ? prepared.changes : {};
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
    const prepared = prepareActions(actions);
    if (!prepared.ok) {
        return Object.freeze({
            matched: true,
            changes: Object.freeze({}),
            automationId: automation.id,
            error: prepared.error
        });
    }

    return {
        matched: true,
        changes: prepared.changes,
        automationId: automation.id
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
        .sort(
            (a, b) => (a.order ?? DEFAULT_AUTOMATION_ORDER) - (b.order ?? DEFAULT_AUTOMATION_ORDER)
        );

    for (const transaction of transactions) {
        const result = evaluateAutomations(sortedAutomations, transaction);
        if (result.matched && result.automationId && !result.error) {
            results.set(transaction.id, {
                changes: result.changes,
                automationId: result.automationId
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

    // Create condition based on description if present
    if (transaction.description) {
        conditions.push({
            id: crypto.randomUUID(),
            column: "description",
            operator: "contains",
            value: transaction.description,
            caseSensitive: false
        });
    } else if (transaction.notes) {
        // Fallback to notes
        conditions.push({
            id: crypto.randomUUID(),
            column: "notes",
            operator: "contains",
            value: transaction.notes,
            caseSensitive: false
        });
    }

    // Create actions based on transaction fields
    const tagIds = transaction.tagIds;
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        actions.push({
            id: crypto.randomUUID(),
            type: "setTags",
            value: [...tagIds]
        });
    }

    if (transaction.statusId) {
        actions.push({
            id: crypto.randomUUID(),
            type: "setStatus",
            value: transaction.statusId
        });
    }

    const allocations = transaction.allocations;
    if (allocations && typeof allocations === "object") {
        const prepared = prepareAllocationReplacement(allocations);
        if (prepared.ok && Object.keys(prepared.value).length > 0) {
            actions.push({
                id: crypto.randomUUID(),
                type: "setAllocation",
                value: Object.fromEntries(Object.entries(prepared.value))
            });
        }
    }

    return {
        id: crypto.randomUUID(),
        name,
        conditions,
        actions,
        order: 0,
        excludedTransactionIds: []
    };
}

/**
 * Data for tracking automation application (for undo)
 */
export interface AutomationApplicationData {
    id: string;
    transactionId: string;
    automationId: string;
    appliedAt: Temporal.Instant;
    previousValues: {
        tagIds?: string[];
        statusId?: string;
        allocations?: Record<string, unknown>;
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
            allocations && typeof allocations === "object" ? copyAllocationData(allocations) : {};
    }

    return {
        id: crypto.randomUUID(),
        transactionId,
        automationId,
        appliedAt: Temporal.Now.instant(),
        previousValues
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
 * Apply or restore automation changes to one logical CRDT transaction in a caller-owned action.
 * Allocation and current-state validation occurs before any unrelated field is touched.
 */
export function applyAutomationChanges(
    store: TransactionStore,
    location: TransactionLocation,
    changes: TransactionChanges
): AllocationBoundaryResult {
    const transaction = findTransactionInStore(store, location);
    if (!transaction) {
        return Object.freeze({
            error: Object.freeze({ type: "transaction-not-found" as const }),
            ok: false as const
        });
    }

    let preparedAllocations: Record<string, number> | undefined;
    if (changes.allocations !== undefined) {
        const current = prepareAllocationReplacement(transaction.allocations);
        if (!current.ok) return current;
        const prepared = prepareAllocationReplacement(changes.allocations);
        if (!prepared.ok) return prepared;
        preparedAllocations = Object.fromEntries(Object.entries(prepared.value));
    }

    let allocationResult: AllocationBoundaryResult | undefined;
    if (preparedAllocations !== undefined) {
        allocationResult = replaceTransactionAllocations(store, {
            allocations: preparedAllocations,
            location
        });
        if (!allocationResult.ok) return allocationResult;
    }

    updateTransaction(store, {
        location,
        updates: {
            ...(changes.statusId !== undefined ? { statusId: changes.statusId } : {}),
            ...(changes.tagIds !== undefined ? { tagIds: [...changes.tagIds] } : {})
        }
    });
    return (
        allocationResult ??
        Object.freeze({
            ok: true as const,
            value: Object.freeze({ affectedTransactions: 1, changed: true })
        })
    );
}

export function restoreAutomationApplication(
    store: TransactionStore,
    location: TransactionLocation,
    application: AutomationApplicationData
): AllocationBoundaryResult {
    return applyAutomationChanges(store, location, getUndoChanges(application));
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
        .sort(
            (a, b) => (a.order ?? DEFAULT_AUTOMATION_ORDER) - (b.order ?? DEFAULT_AUTOMATION_ORDER)
        );

    for (const transaction of transactions) {
        const result = evaluateAutomations(sortedAutomations, transaction);
        if (result.matched && result.automationId && !result.error) {
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
