/**
 * Canonical settlement calculation.
 *
 * This module is the sole production owner of person-to-person settlement semantics. It derives
 * immutable results from retained vault state and never persists a cache or rewrites source data.
 */

import { Temporal } from "temporal-polyfill";

import {
    getTransactionMaintenanceShadowIdentity,
    type Account,
    type Status,
    type TransactionStore
} from "@/lib/crdt/schema";

import {
    apportionMinorUnits,
    deriveEffectiveAllocations,
    type EffectiveAllocationDerivation,
    type EffectiveAllocationResult,
    type ExactPercentageWeights,
    type MinorUnitApportionmentResult
} from "./allocation";
import { isValidCurrencyCode } from "./currency";

export interface SettlementContribution {
    readonly amountMinor: number;
    readonly creditorPersonId: string;
    readonly currency: string;
    readonly debtorPersonId: string;
    readonly transactionId: string;
}

export interface SettlementSourceContribution {
    /**
     * Signed relative to the final obligation direction. Positive contributions increase the
     * obligation; negative contributions are reverse-direction amounts removed by netting.
     */
    readonly amountMinor: number;
    readonly transactionId: string;
}

export interface SettlementObligation {
    readonly amountMinor: number;
    readonly creditorPersonId: string;
    readonly currency: string;
    readonly debtorPersonId: string;
    readonly sourceContributions: readonly SettlementSourceContribution[];
}

export interface SettlementPersonPosition {
    /** Positive means owed money; negative means owes money. */
    readonly amountMinor: number;
    readonly personId: string;
}

export interface SettlementCurrencyPositions {
    readonly currency: string;
    readonly people: readonly SettlementPersonPosition[];
}

export type SettlementHierarchyLevel =
    | "account"
    | "account-tree"
    | "accounts"
    | "day"
    | "days"
    | "month"
    | "months"
    | "status"
    | "statuses"
    | "store-root"
    | "transaction"
    | "transactions"
    | "year"
    | "years";

export type SettlementIssue =
    | {
          readonly accountId: string;
          readonly transactionId: string;
          readonly type: "missing-account";
      }
    | {
          readonly accountId: string;
          readonly currencyCode?: string;
          readonly reason: "invalid-code" | "not-string";
          readonly transactionId: string;
          readonly type: "invalid-currency";
      }
    | {
          readonly accountId: string;
          readonly reason: "invalid-container";
          readonly transactionId: string;
          readonly type: "invalid-allocation";
      }
    | {
          readonly accountId: string;
          readonly personId: string;
          readonly reason: "negative-zero" | "not-finite" | "not-number" | "out-of-range";
          readonly transactionId: string;
          readonly type: "invalid-allocation";
      }
    | {
          readonly accountId: string;
          readonly personId?: string;
          readonly reason:
              | "empty"
              | "invalid-container"
              | "invalid-total"
              | "negative-zero"
              | "not-finite"
              | "not-number"
              | "out-of-range";
          readonly total?: string;
          readonly transactionId: string;
          readonly type: "invalid-ownership";
      }
    | {
          readonly accountId: string;
          readonly reason: "invalid-core-fields" | "invalid-duplicate-list";
          readonly transactionId: string;
          readonly type: "invalid-transaction";
      }
    | {
          readonly accountId: string;
          readonly hierarchyLevel: SettlementHierarchyLevel;
          readonly hierarchyPath: string;
          readonly reason: "invalid-hierarchy";
          readonly transactionId: "<transaction-store>";
          readonly type: "invalid-transaction";
      }
    | {
          readonly accountId: string;
          readonly reason: "not-safe-integer";
          readonly transactionId: string;
          readonly type: "invalid-amount";
      }
    | {
          readonly accountId: string;
          readonly stage:
              | "aggregate"
              | "effective-apportionment"
              | "ownership-apportionment"
              | "position";
          readonly transactionId: string;
          readonly type: "unsafe-calculation";
      };

export interface SettlementResult {
    /** Positive directed per-transaction contributions before pair aggregation and reverse netting. */
    readonly contributions: readonly SettlementContribution[];
    readonly issues: readonly SettlementIssue[];
    readonly obligations: readonly SettlementObligation[];
    readonly positions: readonly SettlementCurrencyPositions[];
    /** Number of valid Treat-as-Paid top-level transactions included in the result. */
    readonly qualifyingTransactionCount: number;
}

interface RetainedTransaction {
    readonly accountId: string;
    readonly amount: unknown;
    readonly id: string;
    readonly raw: Readonly<Record<string, unknown>>;
    readonly statusId: string;
}

interface TransactionProjection {
    readonly issues: readonly SettlementIssue[];
    readonly transactions: readonly RetainedTransaction[];
}

interface MaterializedCollection {
    readonly entries: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
    readonly issues: readonly SettlementIssue[];
    readonly validRoot: boolean;
}

interface TransactionCalculation {
    readonly contributions: readonly Omit<SettlementContribution, "currency" | "transactionId">[];
    readonly positions: Readonly<Record<string, number>>;
}

interface DirectedAggregate {
    amountMinor: number;
    readonly sources: SettlementContribution[];
}

type PositionMap = Map<string, Map<string, number>>;
type AggregateMap = Map<string, Map<string, Map<string, DirectedAggregate>>>;
type AggregateAmountMap = Map<string, Map<string, Map<string, number>>>;
type SuccessfulEffectiveAllocationResult = Extract<
    EffectiveAllocationResult,
    { readonly ok: true }
>;

const EMPTY_RUNTIME_RECORD: Readonly<Record<string, unknown>> = Object.freeze({});

function compareStrings(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function freezeResultGraph<T extends object>(value: T): T {
    for (const nested of Object.values(value)) {
        if (nested != null && typeof nested === "object") freezeResultGraph(nested);
    }
    return Object.freeze(value);
}

function isRuntimeRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    if (value == null || typeof value !== "object") return false;
    try {
        return !Array.isArray(value);
    } catch {
        return false;
    }
}

function snapshotMaterializedRecord(
    value: unknown
):
    | { readonly ok: false }
    | { readonly ok: true; readonly value: Readonly<Record<string, unknown>> } {
    if (!isRuntimeRecord(value)) return { ok: false };
    try {
        const prototype = Reflect.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) return { ok: false };

        const keys = Reflect.ownKeys(value);
        const snapshot = Object.create(null) as Record<string, unknown>;
        for (const key of keys) {
            if (typeof key !== "string") return { ok: false };
            const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
            if (descriptor == null || !descriptor.enumerable || !("value" in descriptor)) {
                return { ok: false };
            }
            Object.defineProperty(snapshot, key, {
                configurable: true,
                enumerable: true,
                value: descriptor.value,
                writable: true
            });
        }
        return { ok: true, value: snapshot };
    } catch {
        return { ok: false };
    }
}

function snapshotMaterializedArray(
    value: unknown
): { readonly ok: false } | { readonly ok: true; readonly value: readonly unknown[] } {
    try {
        if (!Array.isArray(value) || Reflect.getPrototypeOf(value) !== Array.prototype) {
            return { ok: false };
        }
        const keys = Reflect.ownKeys(value);
        const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
        if (
            lengthDescriptor == null ||
            !("value" in lengthDescriptor) ||
            lengthDescriptor.enumerable ||
            typeof lengthDescriptor.value !== "number" ||
            !Number.isSafeInteger(lengthDescriptor.value) ||
            lengthDescriptor.value < 0
        ) {
            return { ok: false };
        }
        const length = lengthDescriptor.value;
        if (keys.length !== length + 1) return { ok: false };

        const snapshot = new Array<unknown>(length);
        const seen = new Set<number>();
        for (const key of keys) {
            if (key === "length") continue;
            if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
                return { ok: false };
            }
            const index = Number(key);
            if (!Number.isSafeInteger(index) || index < 0 || index >= length || seen.has(index)) {
                return { ok: false };
            }
            const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
            if (descriptor == null || !descriptor.enumerable || !("value" in descriptor)) {
                return { ok: false };
            }
            Object.defineProperty(snapshot, index, {
                configurable: true,
                enumerable: true,
                value: descriptor.value,
                writable: true
            });
            seen.add(index);
        }
        return seen.size === length ? { ok: true, value: snapshot } : { ok: false };
    } catch {
        return { ok: false };
    }
}

function recordFromLoroMap(
    collection: unknown,
    rootLevel: "accounts" | "statuses",
    entryLevel: "account" | "status"
): MaterializedCollection {
    const snapshot = snapshotMaterializedRecord(collection);
    if (!snapshot.ok) {
        return {
            entries: new Map(),
            issues: [hierarchyIssue("<unknown-account>", rootLevel, rootLevel)],
            validRoot: false
        };
    }

    const result = new Map<string, Readonly<Record<string, unknown>>>();
    const issues: SettlementIssue[] = [];
    for (const [id, value] of Object.entries(snapshot.value)) {
        if (id === "$cid" || typeof value === "string") continue;
        const entry = snapshotMaterializedRecord(value);
        if (entry.ok) {
            result.set(id, entry.value);
        } else {
            issues.push(
                hierarchyIssue(
                    entryLevel === "account" ? id : "<unknown-account>",
                    entryLevel,
                    `${rootLevel}[]`
                )
            );
        }
    }
    return { entries: result, issues, validRoot: true };
}

function encodePart(value: string): string {
    return `${value.length}:${value}`;
}

function runtimeScalarKey(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string") return `string${encodePart(value)}`;
    if (typeof value === "boolean") return value ? "boolean:1" : "boolean:0";
    if (typeof value === "number") {
        if (Number.isNaN(value)) return "number:NaN";
        if (Object.is(value, -0)) return "number:-0";
        if (value === Number.POSITIVE_INFINITY) return "number:+Infinity";
        if (value === Number.NEGATIVE_INFINITY) return "number:-Infinity";
        return `number${encodePart(String(value))}`;
    }
    if (typeof value === "bigint") return `bigint${encodePart(String(value))}`;
    return typeof value;
}

function materializedScalarRecordKey(value: unknown): string {
    if (value === undefined) return "undefined";
    const snapshot = snapshotMaterializedRecord(value);
    if (!snapshot.ok) return "invalid-record";
    return Object.entries(snapshot.value)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([key, entry]) => `${encodePart(key)}${encodePart(runtimeScalarKey(entry))}`)
        .join("");
}

function transactionSelectionKey(transaction: RetainedTransaction): string {
    const cid = transaction.raw.$cid;
    if (typeof cid === "string") return `cid${encodePart(cid)}`;
    return `semantic${encodePart(
        [
            transaction.accountId,
            transaction.id,
            transaction.statusId,
            runtimeScalarKey(transaction.amount),
            materializedScalarRecordKey(transaction.raw.allocations)
        ]
            .map(encodePart)
            .join("")
    )}`;
}

function retainedTransaction(
    record: Readonly<Record<string, unknown>>,
    fallbackAccountId: string
):
    | { readonly issue: SettlementIssue; readonly ok: false }
    | { readonly ok: true; readonly transaction: RetainedTransaction } {
    const id = record.id;
    const accountId = record.accountId;
    const statusId = record.statusId;
    if (
        typeof id !== "string" ||
        id.length === 0 ||
        typeof accountId !== "string" ||
        accountId.length === 0 ||
        typeof statusId !== "string" ||
        statusId.length === 0
    ) {
        return {
            issue: {
                accountId: typeof accountId === "string" ? accountId : fallbackAccountId,
                reason: "invalid-core-fields",
                transactionId:
                    typeof id === "string"
                        ? id
                        : typeof record.$cid === "string"
                          ? record.$cid
                          : "<unknown-transaction>",
                type: "invalid-transaction"
            },
            ok: false
        };
    }
    return {
        ok: true,
        transaction: {
            accountId,
            amount: record.amount,
            id,
            raw: record,
            statusId
        }
    };
}

function hierarchyIssue(
    accountId: string,
    hierarchyLevel: SettlementHierarchyLevel,
    hierarchyPath: string
): SettlementIssue {
    return {
        accountId,
        hierarchyLevel,
        hierarchyPath,
        reason: "invalid-hierarchy",
        transactionId: "<transaction-store>",
        type: "invalid-transaction"
    };
}

function isCalendarComponent(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0);
}

function isSupportedPlainDate(year: number, month: number, day: number): boolean {
    try {
        Temporal.PlainDate.from({ day, month, year }, { overflow: "reject" });
        return true;
    } catch {
        return false;
    }
}

function isSupportedCalendarYear(year: number): boolean {
    return isSupportedPlainDate(year, 7, 1);
}

function projectTransactionStore(store: unknown): TransactionProjection {
    const activeById = new Map<string, RetainedTransaction[]>();
    const invalidLogicalIds = new Set<string>();
    const nestedIds = new Set<string>();
    const hierarchyIssues: SettlementIssue[] = [];
    const transactionIssues = new Map<string, SettlementIssue>();

    const addTransactionIssue = (issue: SettlementIssue): void => {
        const key = `${encodePart(issue.accountId)}${encodePart(issue.transactionId)}${encodePart(
            issue.type
        )}${encodePart("reason" in issue ? issue.reason : "")}`;
        transactionIssues.set(key, issue);
    };

    const storeSnapshot = snapshotMaterializedRecord(store);
    if (!storeSnapshot.ok) {
        return {
            issues: [hierarchyIssue("<unknown-account>", "store-root", "store-root")],
            transactions: []
        };
    }

    for (const [treeKey, unsafeTreeValue] of Object.entries(storeSnapshot.value)) {
        if (treeKey === "$cid") continue;
        const treeSnapshot = snapshotMaterializedRecord(unsafeTreeValue);
        if (!treeSnapshot.ok) {
            hierarchyIssues.push(hierarchyIssue(treeKey, "account-tree", "account-tree"));
            continue;
        }
        const treeValue = treeSnapshot.value;
        if (
            typeof treeValue.accountId !== "string" ||
            treeValue.accountId.length === 0 ||
            treeValue.accountId !== treeKey
        ) {
            hierarchyIssues.push(hierarchyIssue(treeKey, "account-tree", "account-tree.accountId"));
            continue;
        }
        const accountId = treeValue.accountId;
        const yearsSnapshot = snapshotMaterializedArray(treeValue.years);
        if (!yearsSnapshot.ok) {
            hierarchyIssues.push(hierarchyIssue(accountId, "years", "years"));
            continue;
        }
        const years = yearsSnapshot.value;
        for (const yearValue of years) {
            const yearSnapshot = snapshotMaterializedRecord(yearValue);
            if (!yearSnapshot.ok) {
                hierarchyIssues.push(hierarchyIssue(accountId, "year", "years[]"));
                continue;
            }
            const retainedYear = yearSnapshot.value;
            const year = retainedYear.year;
            if (!isCalendarComponent(year) || !isSupportedCalendarYear(year)) {
                hierarchyIssues.push(hierarchyIssue(accountId, "year", "years[]"));
                continue;
            }
            const monthsSnapshot = snapshotMaterializedArray(retainedYear.months);
            if (!monthsSnapshot.ok) {
                hierarchyIssues.push(hierarchyIssue(accountId, "months", "years[].months"));
                continue;
            }
            for (const monthValue of monthsSnapshot.value) {
                const monthSnapshot = snapshotMaterializedRecord(monthValue);
                if (!monthSnapshot.ok) {
                    hierarchyIssues.push(hierarchyIssue(accountId, "month", "years[].months[]"));
                    continue;
                }
                const retainedMonth = monthSnapshot.value;
                const month = retainedMonth.month;
                if (!isCalendarComponent(month) || month < 1 || month > 12) {
                    hierarchyIssues.push(hierarchyIssue(accountId, "month", "years[].months[]"));
                    continue;
                }
                const daysSnapshot = snapshotMaterializedArray(retainedMonth.days);
                if (!daysSnapshot.ok) {
                    hierarchyIssues.push(
                        hierarchyIssue(accountId, "days", "years[].months[].days")
                    );
                    continue;
                }
                for (const dayValue of daysSnapshot.value) {
                    const daySnapshot = snapshotMaterializedRecord(dayValue);
                    if (
                        !daySnapshot.ok ||
                        !isCalendarComponent(daySnapshot.value.day) ||
                        daySnapshot.value.day < 1 ||
                        daySnapshot.value.day > 31 ||
                        !isSupportedPlainDate(year, month, daySnapshot.value.day)
                    ) {
                        hierarchyIssues.push(
                            hierarchyIssue(accountId, "day", "years[].months[].days[]")
                        );
                        continue;
                    }
                    const transactionsSnapshot = snapshotMaterializedArray(
                        daySnapshot.value.transactions
                    );
                    if (!transactionsSnapshot.ok) {
                        hierarchyIssues.push(
                            hierarchyIssue(
                                accountId,
                                "transactions",
                                "years[].months[].days[].transactions"
                            )
                        );
                        continue;
                    }
                    for (const transactionValue of transactionsSnapshot.value) {
                        const transactionSnapshot = snapshotMaterializedRecord(transactionValue);
                        if (!transactionSnapshot.ok) {
                            hierarchyIssues.push(
                                hierarchyIssue(
                                    accountId,
                                    "transaction",
                                    "years[].months[].days[].transactions[]"
                                )
                            );
                            continue;
                        }
                        const retained = retainedTransaction(transactionSnapshot.value, accountId);
                        if (!retained.ok) {
                            addTransactionIssue(retained.issue);
                            continue;
                        }
                        const transaction = retained.transaction;
                        if (transaction.accountId !== accountId) {
                            hierarchyIssues.push(
                                hierarchyIssue(
                                    accountId,
                                    "transaction",
                                    "years[].months[].days[].transactions[].accountId"
                                )
                            );
                            continue;
                        }
                        if (getTransactionMaintenanceShadowIdentity(transaction) != null) continue;

                        const duplicatesValue = transaction.raw.suspectedDuplicates;
                        let validDuplicateList = true;
                        if (duplicatesValue !== undefined) {
                            const duplicatesSnapshot = snapshotMaterializedArray(duplicatesValue);
                            if (!duplicatesSnapshot.ok) {
                                validDuplicateList = false;
                            } else {
                                for (const duplicate of duplicatesSnapshot.value) {
                                    const duplicateSnapshot = snapshotMaterializedRecord(duplicate);
                                    if (
                                        !duplicateSnapshot.ok ||
                                        typeof duplicateSnapshot.value.id !== "string" ||
                                        duplicateSnapshot.value.id.length === 0
                                    ) {
                                        validDuplicateList = false;
                                        continue;
                                    }
                                    nestedIds.add(duplicateSnapshot.value.id);
                                }
                            }
                        }
                        if (!validDuplicateList) {
                            invalidLogicalIds.add(transaction.id);
                            addTransactionIssue({
                                accountId: transaction.accountId,
                                reason: "invalid-duplicate-list",
                                transactionId: transaction.id,
                                type: "invalid-transaction"
                            });
                            continue;
                        }
                        if (transaction.raw.deletedAt != null) continue;
                        const candidates = activeById.get(transaction.id) ?? [];
                        candidates.push(transaction);
                        activeById.set(transaction.id, candidates);
                    }
                }
            }
        }
    }

    const transactions = Array.from(activeById.entries())
        .filter(([id]) => !invalidLogicalIds.has(id) && !nestedIds.has(id))
        .map(
            ([, candidates]) =>
                [...candidates].sort((left, right) =>
                    compareStrings(transactionSelectionKey(left), transactionSelectionKey(right))
                )[0]
        )
        .filter((transaction): transaction is RetainedTransaction => transaction != null)
        .sort(
            (left, right) =>
                compareStrings(left.id, right.id) ||
                compareStrings(transactionSelectionKey(left), transactionSelectionKey(right))
        );

    return {
        issues: [...hierarchyIssues, ...transactionIssues.values()].sort(issueOrder),
        transactions
    };
}

function allocationAndOwnershipIssues(
    result: EffectiveAllocationResult,
    transactionId: string,
    accountId: string
): readonly SettlementIssue[] {
    if (result.ok) return [];
    return [...result.errors]
        .sort((left, right) => {
            const domainOrder = compareStrings(left.domain, right.domain);
            if (domainOrder !== 0) return domainOrder;
            const leftPerson = "personId" in left ? left.personId : "";
            const rightPerson = "personId" in right ? right.personId : "";
            const personOrder = compareStrings(leftPerson, rightPerson);
            return personOrder !== 0 ? personOrder : compareStrings(left.reason, right.reason);
        })
        .map((error): SettlementIssue => {
            if (error.domain === "allocation") {
                return {
                    accountId,
                    personId: error.personId,
                    reason: error.reason,
                    transactionId,
                    type: "invalid-allocation"
                };
            }
            return {
                accountId,
                ...("personId" in error ? { personId: error.personId } : {}),
                reason: error.reason,
                ...("total" in error ? { total: error.total } : {}),
                transactionId,
                type: "invalid-ownership"
            };
        });
}

function apportionmentIssue(
    result: MinorUnitApportionmentResult,
    stage: "effective-apportionment" | "ownership-apportionment",
    transactionId: string,
    accountId: string
): SettlementIssue | null {
    if (result.ok) return null;
    return {
        accountId,
        stage,
        transactionId,
        type: "unsafe-calculation"
    };
}

function calculateTransaction(
    amountMinor: number,
    effectiveWeights: ExactPercentageWeights,
    ownershipWeights: ExactPercentageWeights
):
    | { readonly calculation: TransactionCalculation; readonly ok: true }
    | {
          readonly ok: false;
          readonly stage: "effective-apportionment" | "ownership-apportionment" | "position";
      } {
    const effectiveShares = apportionMinorUnits(amountMinor, effectiveWeights);
    if (!effectiveShares.ok) return { ok: false, stage: "effective-apportionment" };
    const ownershipShares = apportionMinorUnits(amountMinor, ownershipWeights);
    if (!ownershipShares.ok) return { ok: false, stage: "ownership-apportionment" };

    const personIds = Array.from(
        new Set([...Object.keys(effectiveShares.value), ...Object.keys(ownershipShares.value)])
    ).sort(compareStrings);
    const positions: Record<string, number> = {};
    for (const personId of personIds) {
        const position =
            (effectiveShares.value[personId] ?? 0) - (ownershipShares.value[personId] ?? 0);
        if (!Number.isSafeInteger(position)) return { ok: false, stage: "position" };
        positions[personId] = position;
    }
    if (Object.values(positions).reduce((sum, position) => sum + position, 0) !== 0) {
        return { ok: false, stage: "position" };
    }

    const debtors = Object.entries(positions)
        .filter(([, position]) => position < 0)
        .map(([personId, position]) => ({ personId, remaining: -position }));
    const creditors = Object.entries(positions)
        .filter(([, position]) => position > 0)
        .map(([personId, position]) => ({ personId, remaining: position }));
    const contributions: Array<Omit<SettlementContribution, "currency" | "transactionId">> = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const debtor = debtors[debtorIndex];
        const creditor = creditors[creditorIndex];
        if (debtor == null || creditor == null) return { ok: false, stage: "position" };
        const amount = Math.min(debtor.remaining, creditor.remaining);
        if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, stage: "position" };
        contributions.push({
            amountMinor: amount,
            creditorPersonId: creditor.personId,
            debtorPersonId: debtor.personId
        });
        debtor.remaining -= amount;
        creditor.remaining -= amount;
        if (debtor.remaining === 0) debtorIndex += 1;
        if (creditor.remaining === 0) creditorIndex += 1;
    }
    if (
        debtors.some(({ remaining }) => remaining !== 0) ||
        creditors.some(({ remaining }) => remaining !== 0)
    ) {
        return { ok: false, stage: "position" };
    }

    return { calculation: { contributions, positions }, ok: true };
}

function positionAmount(
    positions: Readonly<PositionMap>,
    currency: string,
    personId: string
): number {
    return positions.get(currency)?.get(personId) ?? 0;
}

function aggregate(
    aggregates: Readonly<AggregateMap>,
    currency: string,
    debtorPersonId: string,
    creditorPersonId: string
): DirectedAggregate | undefined {
    return aggregates.get(currency)?.get(debtorPersonId)?.get(creditorPersonId);
}

function aggregateAmount(
    aggregates: Readonly<AggregateAmountMap>,
    currency: string,
    debtorPersonId: string,
    creditorPersonId: string
): number {
    return aggregates.get(currency)?.get(debtorPersonId)?.get(creditorPersonId) ?? 0;
}

function setAggregateAmount(
    aggregates: AggregateAmountMap,
    currency: string,
    debtorPersonId: string,
    creditorPersonId: string,
    amountMinor: number
): void {
    const byDebtor = aggregates.get(currency) ?? new Map<string, Map<string, number>>();
    const byCreditor = byDebtor.get(debtorPersonId) ?? new Map<string, number>();
    byCreditor.set(creditorPersonId, amountMinor);
    byDebtor.set(debtorPersonId, byCreditor);
    aggregates.set(currency, byDebtor);
}

function canCommitCalculation(
    calculation: TransactionCalculation,
    currency: string,
    positions: Readonly<PositionMap>,
    aggregates: Readonly<AggregateMap>
): boolean {
    for (const [personId, amountMinor] of Object.entries(calculation.positions)) {
        const next = positionAmount(positions, currency, personId) + amountMinor;
        if (!Number.isSafeInteger(next)) return false;
    }
    const additions: AggregateAmountMap = new Map();
    for (const contribution of calculation.contributions) {
        const current = aggregateAmount(
            additions,
            currency,
            contribution.debtorPersonId,
            contribution.creditorPersonId
        );
        const next = current + contribution.amountMinor;
        if (!Number.isSafeInteger(next)) return false;
        setAggregateAmount(
            additions,
            currency,
            contribution.debtorPersonId,
            contribution.creditorPersonId,
            next
        );
    }
    const byDebtor = additions.get(currency);
    if (byDebtor == null) return true;
    for (const [debtorPersonId, byCreditor] of byDebtor) {
        for (const [creditorPersonId, addition] of byCreditor) {
            const next =
                (aggregate(aggregates, currency, debtorPersonId, creditorPersonId)?.amountMinor ??
                    0) + addition;
            if (!Number.isSafeInteger(next)) return false;
        }
    }
    return true;
}

function commitCalculation(
    calculation: TransactionCalculation,
    transactionId: string,
    currency: string,
    positions: PositionMap,
    aggregates: AggregateMap,
    contributions: SettlementContribution[]
): void {
    const currencyPositions = positions.get(currency) ?? new Map<string, number>();
    for (const [personId, amountMinor] of Object.entries(calculation.positions)) {
        currencyPositions.set(personId, (currencyPositions.get(personId) ?? 0) + amountMinor);
    }
    positions.set(currency, currencyPositions);

    const byDebtor = aggregates.get(currency) ?? new Map<string, Map<string, DirectedAggregate>>();
    for (const contribution of calculation.contributions) {
        const source: SettlementContribution = {
            ...contribution,
            currency,
            transactionId
        };
        contributions.push(source);
        const byCreditor =
            byDebtor.get(contribution.debtorPersonId) ?? new Map<string, DirectedAggregate>();
        const current = byCreditor.get(contribution.creditorPersonId);
        if (current == null) {
            byCreditor.set(contribution.creditorPersonId, {
                amountMinor: contribution.amountMinor,
                sources: [source]
            });
        } else {
            current.amountMinor += contribution.amountMinor;
            current.sources.push(source);
        }
        byDebtor.set(contribution.debtorPersonId, byCreditor);
    }
    aggregates.set(currency, byDebtor);
}

function contributionOrder(left: SettlementContribution, right: SettlementContribution): number {
    return (
        compareStrings(left.currency, right.currency) ||
        compareStrings(left.debtorPersonId, right.debtorPersonId) ||
        compareStrings(left.creditorPersonId, right.creditorPersonId) ||
        compareStrings(left.transactionId, right.transactionId) ||
        left.amountMinor - right.amountMinor
    );
}

function issueOrder(left: SettlementIssue, right: SettlementIssue): number {
    return (
        compareStrings(left.transactionId, right.transactionId) ||
        compareStrings(left.accountId, right.accountId) ||
        compareStrings(left.type, right.type) ||
        compareStrings(JSON.stringify(left), JSON.stringify(right))
    );
}

function buildPositions(positions: Readonly<PositionMap>): SettlementCurrencyPositions[] {
    return Array.from(positions.entries())
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([currency, currencyPositions]) => ({
            currency,
            people: Array.from(currencyPositions, ([personId, amountMinor]) => ({
                amountMinor,
                personId
            })).sort((left, right) => compareStrings(left.personId, right.personId))
        }));
}

function buildObligations(aggregates: Readonly<AggregateMap>): SettlementObligation[] {
    const pairs = new Map<string, Map<string, Set<string>>>();
    for (const [currency, byDebtor] of aggregates) {
        const currencyPairs = pairs.get(currency) ?? new Map<string, Set<string>>();
        for (const [debtorPersonId, byCreditor] of byDebtor) {
            for (const creditorPersonId of byCreditor.keys()) {
                const [left, right] =
                    compareStrings(debtorPersonId, creditorPersonId) < 0
                        ? [debtorPersonId, creditorPersonId]
                        : [creditorPersonId, debtorPersonId];
                const rights = currencyPairs.get(left) ?? new Set<string>();
                rights.add(right);
                currencyPairs.set(left, rights);
            }
        }
        pairs.set(currency, currencyPairs);
    }

    const obligations: SettlementObligation[] = [];
    for (const currency of Array.from(pairs.keys()).sort(compareStrings)) {
        const currencyPairs = pairs.get(currency);
        if (currencyPairs == null) continue;
        for (const left of Array.from(currencyPairs.keys()).sort(compareStrings)) {
            const rights = currencyPairs.get(left);
            if (rights == null) continue;
            for (const right of Array.from(rights).sort(compareStrings)) {
                const leftToRight = aggregate(aggregates, currency, left, right)?.amountMinor ?? 0;
                const rightToLeft = aggregate(aggregates, currency, right, left)?.amountMinor ?? 0;
                const net = leftToRight - rightToLeft;
                if (net === 0) continue;
                const debtorPersonId = net > 0 ? left : right;
                const creditorPersonId = net > 0 ? right : left;
                const forward =
                    aggregate(aggregates, currency, debtorPersonId, creditorPersonId)?.sources ??
                    [];
                const reverse =
                    aggregate(aggregates, currency, creditorPersonId, debtorPersonId)?.sources ??
                    [];
                const sourceContributions = [
                    ...forward.map(({ amountMinor, transactionId }) => ({
                        amountMinor,
                        transactionId
                    })),
                    ...reverse.map(({ amountMinor, transactionId }) => ({
                        amountMinor: -amountMinor,
                        transactionId
                    }))
                ].sort(
                    (first, second) =>
                        compareStrings(first.transactionId, second.transactionId) ||
                        second.amountMinor - first.amountMinor
                );
                obligations.push({
                    amountMinor: Math.abs(net),
                    creditorPersonId,
                    currency,
                    debtorPersonId,
                    sourceContributions
                });
            }
        }
    }
    return obligations.sort(
        (left, right) =>
            compareStrings(left.currency, right.currency) ||
            compareStrings(left.debtorPersonId, right.debtorPersonId) ||
            compareStrings(left.creditorPersonId, right.creditorPersonId)
    );
}

function numericRecordKey(record: Readonly<Record<string, unknown>>): string | null {
    const entries = Object.entries(record).sort(([left], [right]) => compareStrings(left, right));
    const encoded: string[] = [];
    for (const [key, value] of entries) {
        if (typeof value !== "number") return null;
        encoded.push(encodePart(key), encodePart(runtimeScalarKey(value)));
    }
    return `${entries.length}:${encoded.join("")}`;
}

function getCachedDerivation(
    allocations: Readonly<Record<string, unknown>>,
    ownerships: Readonly<Record<string, unknown>>,
    cache: Map<string, Map<string, SuccessfulEffectiveAllocationResult>>
): EffectiveAllocationResult {
    const allocationKey = numericRecordKey(allocations);
    const ownershipKey = numericRecordKey(ownerships);
    const cached =
        allocationKey == null || ownershipKey == null
            ? undefined
            : cache.get(ownershipKey)?.get(allocationKey);
    if (cached != null) return cached;

    const result = deriveEffectiveAllocations(allocations, ownerships);
    if (result.ok && allocationKey != null && ownershipKey != null) {
        const byAllocation =
            cache.get(ownershipKey) ?? new Map<string, SuccessfulEffectiveAllocationResult>();
        byAllocation.set(allocationKey, result);
        cache.set(ownershipKey, byAllocation);
    }
    return result;
}

function resolveCurrency(
    accountCurrency: unknown,
    vaultDefaultCurrency: unknown
):
    | { readonly code: string; readonly ok: true }
    | {
          readonly currencyCode?: string;
          readonly ok: false;
          readonly reason: "invalid-code" | "not-string";
      } {
    let candidate: unknown = accountCurrency;
    if (candidate == null || candidate === "") candidate = vaultDefaultCurrency;
    if (candidate == null || candidate === "") candidate = "USD";
    if (typeof candidate !== "string") return { ok: false, reason: "not-string" };
    const code = candidate.toUpperCase();
    return isValidCurrencyCode(code)
        ? { code, ok: true }
        : { currencyCode: candidate, ok: false, reason: "invalid-code" };
}

/**
 * Calculate the complete settlement result from the retained hierarchical transaction store.
 *
 * The projection scans only the hierarchy needed for settlement. It filters inactive physical
 * copies before canonical same-ID selection and preserves nested topology solely for exclusion.
 */
export function calculateSettlementBalances(
    transactions: TransactionStore,
    accounts: Readonly<Record<string, Account | string>>,
    statuses: Readonly<Record<string, Status | string>>,
    vaultDefaultCurrency?: string
): SettlementResult {
    const accountCollection = recordFromLoroMap(accounts, "accounts", "account");
    const statusCollection = recordFromLoroMap(statuses, "statuses", "status");
    const accountMap = accountCollection.entries;
    const statusMap = statusCollection.entries;
    const derivationCache = new Map<string, Map<string, SuccessfulEffectiveAllocationResult>>();
    const calculationCache = new WeakMap<
        EffectiveAllocationDerivation,
        Map<number, ReturnType<typeof calculateTransaction>>
    >();
    const positions: PositionMap = new Map();
    const aggregates: AggregateMap = new Map();
    const contributions: SettlementContribution[] = [];
    const projection = projectTransactionStore(transactions);
    const issues: SettlementIssue[] = [
        ...accountCollection.issues,
        ...statusCollection.issues,
        ...projection.issues
    ];
    let qualifyingTransactionCount = 0;

    const collectionsUsable = accountCollection.validRoot && statusCollection.validRoot;
    for (const transaction of projection.transactions) {
        if (!collectionsUsable) continue;
        const retainedStatus = statusMap.get(transaction.statusId);
        if (retainedStatus?.behavior !== "treatAsPaid") continue;

        const account = accountMap.get(transaction.accountId);
        if (account == null) {
            issues.push({
                accountId: transaction.accountId,
                transactionId: transaction.id,
                type: "missing-account"
            });
            continue;
        }
        if (typeof transaction.amount !== "number" || !Number.isSafeInteger(transaction.amount)) {
            issues.push({
                accountId: transaction.accountId,
                reason: "not-safe-integer",
                transactionId: transaction.id,
                type: "invalid-amount"
            });
            continue;
        }

        const currency = resolveCurrency(account.currency, vaultDefaultCurrency);
        if (!currency.ok) {
            issues.push({
                accountId: transaction.accountId,
                ...("currencyCode" in currency ? { currencyCode: currency.currencyCode } : {}),
                reason: currency.reason,
                transactionId: transaction.id,
                type: "invalid-currency"
            });
            continue;
        }

        const allocationValue = transaction.raw.allocations;
        const allocationSnapshot =
            allocationValue === undefined
                ? { ok: true as const, value: EMPTY_RUNTIME_RECORD }
                : snapshotMaterializedRecord(allocationValue);
        if (!allocationSnapshot.ok) {
            issues.push({
                accountId: transaction.accountId,
                reason: "invalid-container",
                transactionId: transaction.id,
                type: "invalid-allocation"
            });
            continue;
        }
        const allocations = allocationSnapshot.value;
        const ownershipValue = account.ownerships;
        const ownershipSnapshot = snapshotMaterializedRecord(ownershipValue);
        if (!ownershipSnapshot.ok) {
            issues.push({
                accountId: transaction.accountId,
                reason: "invalid-container",
                transactionId: transaction.id,
                type: "invalid-ownership"
            });
            continue;
        }

        const derivation = getCachedDerivation(
            allocations,
            ownershipSnapshot.value,
            derivationCache
        );
        const validationIssues = allocationAndOwnershipIssues(
            derivation,
            transaction.id,
            transaction.accountId
        );
        if (validationIssues.length > 0 || !derivation.ok) {
            issues.push(...validationIssues);
            continue;
        }

        const amount = transaction.amount;
        const byAmount =
            calculationCache.get(derivation.value) ??
            new Map<number, ReturnType<typeof calculateTransaction>>();
        const calculationResult =
            byAmount.get(amount) ??
            calculateTransaction(
                amount,
                derivation.value.effectiveAllocations,
                derivation.value.ownershipWeights
            );
        if (!byAmount.has(amount)) {
            byAmount.set(amount, calculationResult);
            calculationCache.set(derivation.value, byAmount);
        }
        if (!calculationResult.ok) {
            const apportionmentResult =
                calculationResult.stage === "effective-apportionment"
                    ? apportionMinorUnits(amount, derivation.value.effectiveAllocations)
                    : apportionMinorUnits(amount, derivation.value.ownershipWeights);
            const issue =
                calculationResult.stage === "position"
                    ? {
                          accountId: transaction.accountId,
                          stage: "position" as const,
                          transactionId: transaction.id,
                          type: "unsafe-calculation" as const
                      }
                    : apportionmentIssue(
                          apportionmentResult,
                          calculationResult.stage,
                          transaction.id,
                          transaction.accountId
                      );
            if (issue != null) issues.push(issue);
            continue;
        }
        if (
            !canCommitCalculation(
                calculationResult.calculation,
                currency.code,
                positions,
                aggregates
            )
        ) {
            issues.push({
                accountId: transaction.accountId,
                stage: "aggregate",
                transactionId: transaction.id,
                type: "unsafe-calculation"
            });
            continue;
        }

        commitCalculation(
            calculationResult.calculation,
            transaction.id,
            currency.code,
            positions,
            aggregates,
            contributions
        );
        qualifyingTransactionCount += 1;
    }

    contributions.sort(contributionOrder);
    issues.sort(issueOrder);
    return freezeResultGraph({
        contributions,
        issues,
        obligations: buildObligations(aggregates),
        positions: buildPositions(positions),
        qualifyingTransactionCount
    });
}
