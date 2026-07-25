/**
 * Central transaction-allocation validation and draft mutation boundary.
 *
 * Allocation records are Loro maps. A one-person edit therefore changes exactly one map key while a
 * complete replacement validates and materializes its entire caller input before touching a draft.
 */

import {
    type AllocationPercentage,
    type AllocationValidationError,
    validateAllocationSet
} from "@/lib/domain/allocation";

import type { TransactionLocation } from "./mutations";
import {
    isPublicTransaction,
    type NestedDuplicate,
    type Transaction,
    type TransactionStore
} from "./schema";

const LORO_COLLECTION_METADATA_KEY = "$cid";

function compareCodeUnits(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

export type AllocationBoundaryError =
    | {
          readonly personId: string;
          readonly type: "invalid-person-id";
      }
    | {
          readonly errors: readonly AllocationValidationError[];
          readonly type: "invalid-allocations";
      }
    | {
          readonly reason:
              | "accessor-entry"
              | "invalid-prototype"
              | "not-record"
              | "symbol-entry"
              | "uninspectable-record";
          readonly type: "invalid-allocation-container";
      }
    | {
          readonly type: "transaction-not-found";
      };

export interface AllocationMutationSummary {
    readonly affectedTransactions: number;
    readonly changed: boolean;
}

export type AllocationBoundaryResult<Value = AllocationMutationSummary> =
    | {
          readonly ok: true;
          readonly value: Value;
      }
    | {
          readonly error: AllocationBoundaryError;
          readonly ok: false;
      };

export interface SetTransactionAllocationInput {
    readonly location: TransactionLocation;
    readonly personId: string;
    readonly value: unknown;
}

export interface ReplaceTransactionAllocationsInput {
    readonly allocations: unknown;
    readonly location: TransactionLocation;
}

export type MaterializedAllocationSet = Readonly<Record<string, AllocationPercentage>>;

function freezeResultGraph<T extends object>(value: T): T {
    for (const nested of Object.values(value)) {
        if (nested != null && typeof nested === "object" && !Object.isFrozen(nested)) {
            freezeResultGraph(nested);
        }
    }
    return Object.freeze(value);
}

function ok<Value>(value: Value): AllocationBoundaryResult<Value> {
    return freezeResultGraph({ ok: true, value });
}

function error(errorValue: AllocationBoundaryError): AllocationBoundaryResult<never> {
    return freezeResultGraph({ error: errorValue, ok: false });
}

function defineEntry(target: Record<string, unknown>, key: string, value: unknown): void {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true
    });
}

function inspectOwnDataEntries(
    input: unknown
):
    | { readonly ok: true; readonly value: Record<string, unknown> }
    | { readonly error: AllocationBoundaryError; readonly ok: false } {
    if (input == null || typeof input !== "object") {
        return {
            error: { reason: "not-record", type: "invalid-allocation-container" },
            ok: false
        };
    }

    const materialized = Object.create(null) as Record<string, unknown>;
    try {
        if (Array.isArray(input)) {
            return {
                error: { reason: "not-record", type: "invalid-allocation-container" },
                ok: false
            };
        }
        const prototype = Object.getPrototypeOf(input);
        if (prototype !== null && prototype !== Object.prototype) {
            return {
                error: { reason: "invalid-prototype", type: "invalid-allocation-container" },
                ok: false
            };
        }

        const keys = Reflect.ownKeys(input);
        for (const key of keys) {
            const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
            if (!descriptor || !descriptor.enumerable) continue;
            if (typeof key !== "string") {
                return {
                    error: { reason: "symbol-entry", type: "invalid-allocation-container" },
                    ok: false
                };
            }
        }
        for (const key of keys
            .filter((key): key is string => typeof key === "string")
            .sort(compareCodeUnits)) {
            const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
            if (!descriptor || !descriptor.enumerable) continue;
            if (key === LORO_COLLECTION_METADATA_KEY) continue;
            if (!("value" in descriptor)) {
                return {
                    error: { reason: "accessor-entry", type: "invalid-allocation-container" },
                    ok: false
                };
            }
            defineEntry(materialized, key, descriptor.value);
        }
    } catch {
        return {
            error: { reason: "uninspectable-record", type: "invalid-allocation-container" },
            ok: false
        };
    }
    return { ok: true, value: materialized };
}

/**
 * Materialize and validate a complete explicit allocation set without invoking caller accessors.
 * Zero is valid input but is omitted because it means removal at the CRDT boundary.
 */
export function prepareAllocationReplacement(
    input: unknown
): AllocationBoundaryResult<MaterializedAllocationSet> {
    const inspected = inspectOwnDataEntries(input);
    if (!inspected.ok) return error(inspected.error);

    const validation = validateAllocationSet(inspected.value);
    if (!validation.ok) {
        return error({
            errors: [...validation.errors].sort((left, right) =>
                compareCodeUnits(left.personId, right.personId)
            ),
            type: "invalid-allocations"
        });
    }

    const explicit = Object.create(null) as Record<string, AllocationPercentage>;
    for (const [personId, value] of Object.entries(validation.value)) {
        if (value !== 0) defineEntry(explicit, personId, value);
    }
    return ok(explicit);
}

/** Iterate own stored allocation data without invoking accessors. */
export function* storedAllocationDataEntries(
    allocations: Readonly<Record<string, unknown>>
): Generator<readonly [string, unknown]> {
    for (const key of Reflect.ownKeys(allocations)) {
        if (typeof key !== "string" || key === LORO_COLLECTION_METADATA_KEY) continue;
        const descriptor = Reflect.getOwnPropertyDescriptor(allocations, key);
        if (descriptor?.enumerable && "value" in descriptor) yield [key, descriptor.value];
    }
}

/** Copy own allocation data while excluding only loro-mirror's exact collection metadata key. */
export function copyAllocationData(
    allocations: Readonly<Record<string, unknown>>
): Record<string, unknown> {
    const copy = Object.create(null) as Record<string, unknown>;
    for (const [key, value] of storedAllocationDataEntries(allocations)) {
        defineEntry(copy, key, value);
    }
    return copy;
}

export function allocationPresenceField(personId: string): `allocation:${string}` {
    return `allocation:${personId}`;
}

function allocationMap(transaction: Transaction | NestedDuplicate): Record<string, number> {
    return transaction.allocations as unknown as Record<string, number>;
}

function findLogicalTransactions(
    store: TransactionStore,
    location: TransactionLocation
): Array<Transaction | NestedDuplicate> {
    const tree = store[location.accountId];
    if (!tree || typeof tree === "string") return [];
    const matches: Array<Transaction | NestedDuplicate> = [];
    for (const year of tree.years) {
        if (year.year !== location.date.year) continue;
        for (const month of year.months) {
            if (month.month !== location.date.month) continue;
            for (const day of month.days) {
                if (day.day !== location.date.day) continue;
                for (const transaction of day.transactions) {
                    if (!isPublicTransaction(transaction)) continue;
                    if (transaction.id === location.transactionId) matches.push(transaction);
                    for (const duplicate of transaction.suspectedDuplicates) {
                        if (duplicate.id === location.transactionId) matches.push(duplicate);
                    }
                }
            }
        }
    }
    return matches;
}

function replacePreparedAllocations(
    transactions: readonly (Transaction | NestedDuplicate)[],
    replacement: MaterializedAllocationSet
): AllocationMutationSummary {
    let changed = false;
    const replacementKeys = new Set(Object.keys(replacement));
    for (const transaction of transactions) {
        const current = allocationMap(transaction);
        for (const personId of Object.keys(current)) {
            if (personId !== LORO_COLLECTION_METADATA_KEY && !replacementKeys.has(personId)) {
                delete current[personId];
                changed = true;
            }
        }
        for (const [personId, value] of Object.entries(replacement)) {
            if (!Object.is(current[personId], value)) {
                current[personId] = value;
                changed = true;
            }
        }
    }
    return { affectedTransactions: transactions.length, changed };
}

/** Set or remove exactly one Person key over every physical copy of a logical transaction. */
export function setTransactionAllocation(
    store: TransactionStore,
    input: SetTransactionAllocationInput
): AllocationBoundaryResult {
    if (
        typeof input.personId !== "string" ||
        input.personId.length === 0 ||
        input.personId === LORO_COLLECTION_METADATA_KEY
    ) {
        return error({ personId: input.personId, type: "invalid-person-id" });
    }

    const candidate = Object.create(null) as Record<string, unknown>;
    defineEntry(candidate, input.personId, input.value);
    const prepared = prepareAllocationReplacement(candidate);
    if (!prepared.ok) return prepared;

    const transactions = findLogicalTransactions(store, input.location);
    if (transactions.length === 0) return error({ type: "transaction-not-found" });

    let changed = false;
    for (const transaction of transactions) {
        const allocations = allocationMap(transaction);
        if (input.value === 0) {
            if (Object.prototype.hasOwnProperty.call(allocations, input.personId)) {
                delete allocations[input.personId];
                changed = true;
            }
        } else if (!Object.is(allocations[input.personId], input.value)) {
            allocations[input.personId] = input.value as number;
            changed = true;
        }
    }
    return ok({ affectedTransactions: transactions.length, changed });
}

/** Replace the complete explicit set after full materialization and validation. */
export function replaceTransactionAllocations(
    store: TransactionStore,
    input: ReplaceTransactionAllocationsInput
): AllocationBoundaryResult {
    const prepared = prepareAllocationReplacement(input.allocations);
    if (!prepared.ok) return prepared;

    const transactions = findLogicalTransactions(store, input.location);
    if (transactions.length === 0) return error({ type: "transaction-not-found" });
    return ok(replacePreparedAllocations(transactions, prepared.value));
}

/** Validate insertion data using the same complete-set contract. */
export function prepareInsertedAllocations(
    input: unknown
): AllocationBoundaryResult<MaterializedAllocationSet> {
    return prepareAllocationReplacement(input);
}
