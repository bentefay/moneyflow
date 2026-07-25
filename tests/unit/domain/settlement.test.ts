import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, expectTypeOf, it } from "vitest";

import { initializeVaultDefaults } from "@/lib/crdt/defaults";
import { createVaultMirror } from "@/lib/crdt/mirror";
import type {
    Account,
    NestedDuplicate,
    Status,
    Transaction,
    TransactionStore
} from "@/lib/crdt/schema";
import * as domainBarrel from "@/lib/domain";
import * as balanceDomain from "@/lib/domain/balance";
import { asMinorUnits } from "@/lib/domain/currency";
import {
    calculateSettlementBalances,
    type SettlementIssue,
    type SettlementResult
} from "@/lib/domain/settlement";

const PAID_STATUS_ID = "paid";
const PENDING_STATUS_ID = "pending";

function account(
    id: string,
    ownerships: Readonly<Record<string, unknown>>,
    currency: string | undefined = "USD"
): Account {
    return {
        id,
        name: id,
        accountType: "checking",
        balance: 0,
        currency,
        ownerships
    } as unknown as Account;
}

function status(id: string, behavior?: "treatAsPaid", deleted = false): Status {
    return {
        id,
        name: id,
        behavior,
        isDefault: false,
        deletedAt: deleted ? Temporal.Instant.from("2024-02-01T00:00:00Z") : undefined
    } as Status;
}

interface TransactionOptions {
    readonly accountId?: string;
    readonly allocations?: Readonly<Record<string, unknown>>;
    readonly deleted?: boolean;
    readonly nested?: readonly NestedDuplicate[];
    readonly statusId?: string;
    readonly tagIds?: readonly string[];
}

function transaction(id: string, amount: number, options: TransactionOptions = {}): Transaction {
    return {
        id,
        date: Temporal.PlainDate.from("2024-01-01"),
        description: id,
        notes: "",
        amount: asMinorUnits(amount),
        accountId: options.accountId ?? "account-a",
        tagIds: [...(options.tagIds ?? [])],
        statusId: options.statusId ?? PAID_STATUS_ID,
        allocations: { ...(options.allocations ?? {}) },
        creationInstant: Temporal.Instant.from("2024-01-01T00:00:00Z"),
        suspectedDuplicates: [...(options.nested ?? [])],
        deletedAt: options.deleted ? Temporal.Instant.from("2024-02-01T00:00:00Z") : undefined
    } as unknown as Transaction;
}

function unsafeAmountTransaction(id: string, amount: number): Transaction {
    return {
        ...transaction(id, 0),
        amount
    } as Transaction;
}

function runtimeTransaction(
    value: Transaction,
    overrides: Readonly<Record<string, unknown>>
): Transaction {
    return { ...value, ...overrides } as unknown as Transaction;
}

function runtimeAccount(value: Account, overrides: Readonly<Record<string, unknown>>): Account {
    return { ...value, ...overrides } as unknown as Account;
}

class BobAllocationEnvelope {
    readonly bob = 100;
}

class EmptyAllocationEnvelope {}

type SnapshotTrap = "descriptor" | "ownKeys" | "prototype";

function throwingRecordProxy(
    value: Readonly<Record<string, unknown>>,
    trap: SnapshotTrap
): Readonly<Record<string, unknown>> {
    return new Proxy(value, {
        getOwnPropertyDescriptor(target, property) {
            if (trap === "descriptor") throw new Error("descriptor trap");
            return Reflect.getOwnPropertyDescriptor(target, property);
        },
        getPrototypeOf(target) {
            if (trap === "prototype") throw new Error("prototype trap");
            return Reflect.getPrototypeOf(target);
        },
        ownKeys(target) {
            if (trap === "ownKeys") throw new Error("ownKeys trap");
            return Reflect.ownKeys(target);
        }
    });
}

function throwingArrayProxy(
    value: readonly unknown[],
    trap: "descriptor" | "index" | "iterator" | "length" | "ownKeys" | "prototype"
): readonly unknown[] {
    return new Proxy(value, {
        getOwnPropertyDescriptor(target, property) {
            if (trap === "descriptor") throw new Error("array descriptor trap");
            return Reflect.getOwnPropertyDescriptor(target, property);
        },
        get(target, property, receiver) {
            if (
                (trap === "index" && property === "0") ||
                (trap === "iterator" && property === Symbol.iterator) ||
                (trap === "length" && property === "length")
            ) {
                throw new Error(`${trap} trap`);
            }
            return Reflect.get(target, property, receiver);
        },
        getPrototypeOf(target) {
            if (trap === "prototype") throw new Error("array prototype trap");
            return Reflect.getPrototypeOf(target);
        },
        ownKeys(target) {
            if (trap === "ownKeys") throw new Error("array ownKeys trap");
            return Reflect.ownKeys(target);
        }
    });
}

function accessorRecord(
    value: Readonly<Record<string, unknown>>,
    key: string
): Readonly<Record<string, unknown>> {
    const result = { ...value };
    Object.defineProperty(result, key, {
        enumerable: true,
        get() {
            throw new Error(`${key} getter trap`);
        }
    });
    return result;
}

const INVALID_FINANCIAL_OBJECT_FACTORIES = [
    ["non-empty Map", () => new Map([["bob", 100]])],
    ["empty Map", () => new Map()],
    ["Set", () => new Set([100])],
    ["Date", () => new Date(0)],
    ["RegExp", () => /bob/u],
    ["typed collection", () => new Uint8Array([100])],
    ["non-empty class instance", () => new BobAllocationEnvelope()],
    ["empty class instance", () => new EmptyAllocationEnvelope()]
] as const;

function runtimeValueSnapshot(value: unknown): string {
    return String(JSON.stringify(value));
}

function nestedTransaction(id: string, amount: number): NestedDuplicate {
    const parent = transaction(id, amount);
    const nested: Partial<Transaction> = { ...parent };
    delete nested.suspectedDuplicates;
    return nested as NestedDuplicate;
}

function baseAccounts(
    ownerships: Readonly<Record<string, unknown>> = { alice: 100 },
    currency = "USD"
): Readonly<Record<string, Account | string>> {
    return { "account-a": account("account-a", ownerships, currency) };
}

function baseStatuses(
    paid = status(PAID_STATUS_ID, "treatAsPaid")
): Readonly<Record<string, Status | string>> {
    return {
        [PAID_STATUS_ID]: paid,
        [PENDING_STATUS_ID]: status(PENDING_STATUS_ID)
    };
}

function transactionStore(buckets: readonly (readonly Transaction[])[]): TransactionStore {
    const accountIds = Array.from(
        new Set(buckets.flatMap((transactions) => transactions.map(({ accountId }) => accountId)))
    ).sort();
    return {
        $cid: "transaction-store",
        ...Object.fromEntries(
            accountIds.map((accountId) => [
                accountId,
                {
                    $cid: `${accountId}-tree`,
                    accountId,
                    years: [
                        {
                            $cid: `${accountId}-year-2024`,
                            months: [
                                {
                                    $cid: `${accountId}-month-1`,
                                    days: buckets.map((transactions, index) => ({
                                        $cid: `${accountId}-day-${String(index + 1)}`,
                                        day: index + 1,
                                        transactions: transactions.filter(
                                            (entry) => entry.accountId === accountId
                                        )
                                    })),
                                    month: 1
                                }
                            ],
                            year: 2024
                        }
                    ]
                }
            ])
        )
    } as unknown as TransactionStore;
}

function settleStore(
    store: TransactionStore,
    accounts: Readonly<Record<string, Account | string>> = baseAccounts(),
    statuses: Readonly<Record<string, Status | string>> = baseStatuses(),
    defaultCurrency?: string
): SettlementResult {
    return calculateSettlementBalances(store, accounts, statuses, defaultCurrency);
}

function settle(
    transactions: readonly Transaction[],
    accounts: Readonly<Record<string, Account | string>> = baseAccounts(),
    statuses: Readonly<Record<string, Status | string>> = baseStatuses(),
    defaultCurrency?: string
): SettlementResult {
    return calculateSettlementBalances(
        transactionStore([transactions]),
        accounts,
        statuses,
        defaultCurrency
    );
}

function obligationShape(result: SettlementResult) {
    return result.obligations.map(
        ({ amountMinor, creditorPersonId, currency, debtorPersonId }) => ({
            amountMinor,
            creditorPersonId,
            currency,
            debtorPersonId
        })
    );
}

function positionAmount(result: SettlementResult, currency: string, personId: string): number {
    const currencyPositions = result.positions.find((entry) => entry.currency === currency);
    if (currencyPositions == null) throw new Error(`Missing ${currency} positions`);
    const personPosition = currencyPositions.people.find((entry) => entry.personId === personId);
    if (personPosition == null) throw new Error(`Missing ${personId} position`);
    return personPosition.amountMinor;
}

function expectNoSettlement(result: SettlementResult): void {
    expect(result.obligations).toEqual([]);
    expect(result.contributions).toEqual([]);
    expect(result.issues).toEqual([]);
}

function mathematicalFloor(numerator: bigint, denominator: bigint): bigint {
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    return remainder < BigInt(0) ? quotient - BigInt(1) : quotient;
}

function apportionRational(
    amount: number,
    weightNumerators: Readonly<Record<string, number>>,
    denominator: number
): Readonly<Record<string, number>> {
    const rationalDenominator = BigInt(denominator);
    const rows = Object.entries(weightNumerators)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([personId, weightNumerator]) => {
            const numerator = BigInt(amount) * BigInt(weightNumerator);
            const floor = mathematicalFloor(numerator, rationalDenominator);
            return {
                personId,
                floor,
                remainder: numerator - floor * rationalDenominator
            };
        });
    const floorTotal = rows.reduce((total, row) => total + row.floor, BigInt(0));
    const remaining = Number(BigInt(amount) - floorTotal);
    const recipients = new Set(
        [...rows]
            .sort(
                (left, right) =>
                    Number(right.remainder - left.remainder) ||
                    left.personId.localeCompare(right.personId)
            )
            .slice(0, remaining)
            .map((row) => row.personId)
    );
    return Object.fromEntries(
        rows.map((row) => [
            row.personId,
            Number(row.floor + (recipients.has(row.personId) ? BigInt(1) : BigInt(0)))
        ])
    );
}

function apportionByHundred(
    amount: number,
    weights: Readonly<Record<string, number>>
): Readonly<Record<string, number>> {
    return apportionRational(amount, weights, 100);
}

function assertFrozenGraph(value: object): void {
    expect(Object.isFrozen(value)).toBe(true);
    for (const nested of Object.values(value)) {
        if (nested != null && typeof nested === "object") assertFrozenGraph(nested);
    }
}

function runtimeCollection<T>(
    entries: readonly (readonly [string, unknown])[]
): Readonly<Record<string, T | string>> {
    return Object.fromEntries(entries) as Readonly<Record<string, T | string>>;
}

describe("sole settlement authority", () => {
    it("removes the competing balance implementation and compatibility alias", () => {
        expect("calculateSettlementBalances" in balanceDomain).toBe(false);
        expect("calculateSimpleSettlementBalances" in domainBarrel).toBe(false);
        expect(domainBarrel.calculateSettlementBalances).toBe(calculateSettlementBalances);
    });

    it("accepts only the retained hierarchical TransactionStore", () => {
        expectTypeOf(calculateSettlementBalances).parameter(0).toEqualTypeOf<TransactionStore>();
    });

    it("accepts the actual materialized default Loro mirror state without an incomplete issue", () => {
        const { mirror } = createVaultMirror();
        mirror.setState((draft) => {
            initializeVaultDefaults(draft);
        });
        const state = mirror.getState();

        const result = calculateSettlementBalances(
            state.transactions,
            state.accounts,
            state.statuses,
            state.preferences.defaultCurrency
        );

        expect(result.issues).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.obligations).toEqual([]);
    });
});

describe("exact Loro collection metadata boundary", () => {
    const accountEntryIssue = (accountId: string) => ({
        accountId,
        hierarchyLevel: "account",
        hierarchyPath: "accounts[]",
        reason: "invalid-hierarchy",
        transactionId: "<transaction-store>",
        type: "invalid-transaction"
    });
    const statusEntryIssue = {
        accountId: "<unknown-account>",
        hierarchyLevel: "status",
        hierarchyPath: "statuses[]",
        reason: "invalid-hierarchy",
        transactionId: "<transaction-store>",
        type: "invalid-transaction"
    };
    const expectedObligation = {
        amountMinor: 100,
        creditorPersonId: "alice",
        currency: "USD",
        debtorPersonId: "bob"
    };

    it("reports a referenced primitive account entry and atomically excludes its transaction", () => {
        const accounts = { "account-a": "legacy-account" };
        const originalAccounts = { ...accounts };
        const input = transaction("referenced-primitive-account", -100, {
            allocations: { bob: 100 }
        });

        const result = settle([input], accounts);

        expect(result.issues).toEqual([
            accountEntryIssue("account-a"),
            {
                accountId: "account-a",
                transactionId: "referenced-primitive-account",
                type: "missing-account"
            }
        ]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.obligations).toEqual([]);
        expect(result.contributions).toEqual([]);
        expect(result.positions).toEqual([]);
        expect(accounts).toEqual(originalAccounts);
        expect(Object.isFrozen(accounts)).toBe(false);
        expect(Object.isFrozen(input)).toBe(false);
        assertFrozenGraph(result);
    });

    it("reports a referenced primitive status entry and atomically excludes its transaction", () => {
        const statuses = {
            [PAID_STATUS_ID]: "legacy-status",
            [PENDING_STATUS_ID]: status(PENDING_STATUS_ID)
        };
        const originalStatuses = { ...statuses };
        const input = transaction("referenced-primitive-status", -100, {
            allocations: { bob: 100 }
        });

        const result = settle([input], baseAccounts(), statuses);

        expect(result.issues).toEqual([statusEntryIssue]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.obligations).toEqual([]);
        expect(result.contributions).toEqual([]);
        expect(result.positions).toEqual([]);
        expect(statuses).toEqual(originalStatuses);
        expect(Object.isFrozen(statuses)).toBe(false);
        expect(Object.isFrozen(input)).toBe(false);
        assertFrozenGraph(result);
    });

    it("reports an unreferenced primitive account in deterministic order while preserving valid financial output", () => {
        const validAccount = account("account-a", { alice: 100 });
        const forwardAccounts = {
            "legacy-account": "not-metadata",
            "account-a": validAccount
        };
        const reverseAccounts = {
            "account-a": validAccount,
            "legacy-account": "not-metadata"
        };
        const input = transaction("valid-account-sibling", -100, {
            allocations: { bob: 100 }
        });

        const forward = settle([input], forwardAccounts);
        const reverse = settle([input], reverseAccounts);

        expect(reverse).toEqual(forward);
        expect(forward.issues).toEqual([accountEntryIssue("legacy-account")]);
        expect(forward.qualifyingTransactionCount).toBe(1);
        expect(obligationShape(forward)).toEqual([expectedObligation]);
        expect(forwardAccounts).toEqual({
            "legacy-account": "not-metadata",
            "account-a": validAccount
        });
        expect(Object.isFrozen(forwardAccounts)).toBe(false);
        expect(Object.isFrozen(validAccount)).toBe(false);
        expect(Object.isFrozen(input)).toBe(false);
        assertFrozenGraph(forward);
        assertFrozenGraph(reverse);
    });

    it("reports an unreferenced primitive status in deterministic order while preserving valid financial output", () => {
        const paidStatus = status(PAID_STATUS_ID, "treatAsPaid");
        const pendingStatus = status(PENDING_STATUS_ID);
        const forwardStatuses = {
            "legacy-status": "not-metadata",
            [PAID_STATUS_ID]: paidStatus,
            [PENDING_STATUS_ID]: pendingStatus
        };
        const reverseStatuses = {
            [PENDING_STATUS_ID]: pendingStatus,
            [PAID_STATUS_ID]: paidStatus,
            "legacy-status": "not-metadata"
        };
        const input = transaction("valid-status-sibling", -100, {
            allocations: { bob: 100 }
        });

        const forward = settle([input], baseAccounts(), forwardStatuses);
        const reverse = settle([input], baseAccounts(), reverseStatuses);

        expect(reverse).toEqual(forward);
        expect(forward.issues).toEqual([statusEntryIssue]);
        expect(forward.qualifyingTransactionCount).toBe(1);
        expect(obligationShape(forward)).toEqual([expectedObligation]);
        expect(forwardStatuses).toEqual({
            "legacy-status": "not-metadata",
            [PAID_STATUS_ID]: paidStatus,
            [PENDING_STATUS_ID]: pendingStatus
        });
        expect(Object.isFrozen(forwardStatuses)).toBe(false);
        expect(Object.isFrozen(paidStatus)).toBe(false);
        expect(Object.isFrozen(input)).toBe(false);
        assertFrozenGraph(forward);
        assertFrozenGraph(reverse);
    });

    it("generates primitive account/status entries and insertion permutations with an independent exact issue oracle", () => {
        const entryId = fc
            .string({ maxLength: 20, minLength: 1 })
            .filter(
                (value) =>
                    value !== "$cid" &&
                    value !== "account-a" &&
                    value !== PAID_STATUS_ID &&
                    value !== PENDING_STATUS_ID
            );
        const primitive = fc.oneof(
            fc.string({ maxLength: 40 }),
            fc.integer(),
            fc.double(),
            fc.boolean(),
            fc.bigInt(),
            fc.constant(null),
            fc.constant(undefined)
        );
        const generatedEntries = fc.uniqueArray(fc.tuple(entryId, primitive), {
            maxLength: 6,
            minLength: 1,
            selector: ([id]) => id
        });

        fc.assert(
            fc.property(
                fc.boolean(),
                fc.boolean(),
                primitive,
                fc.string({ maxLength: 24 }),
                generatedEntries,
                (accountBoundary, referenced, referencedValue, cid, entries) => {
                    const invalidEntries: readonly (readonly [string, unknown])[] = referenced
                        ? [
                              [accountBoundary ? "account-a" : PAID_STATUS_ID, referencedValue],
                              ...entries
                          ]
                        : entries;
                    const metadataEntry = ["$cid", cid] as const;
                    const validEntry = accountBoundary
                        ? (["account-a", account("account-a", { alice: 100 })] as const)
                        : ([PAID_STATUS_ID, status(PAID_STATUS_ID, "treatAsPaid")] as const);
                    const forwardEntries = referenced
                        ? [metadataEntry, ...invalidEntries]
                        : [metadataEntry, validEntry, ...invalidEntries];
                    const reverseEntries = [...forwardEntries].reverse();
                    const accounts = accountBoundary
                        ? runtimeCollection<Account>(forwardEntries)
                        : baseAccounts();
                    const reverseAccounts = accountBoundary
                        ? runtimeCollection<Account>(reverseEntries)
                        : baseAccounts();
                    const statuses = accountBoundary
                        ? baseStatuses()
                        : runtimeCollection<Status>(forwardEntries);
                    const reverseStatuses = accountBoundary
                        ? baseStatuses()
                        : runtimeCollection<Status>(reverseEntries);
                    const input = transaction("generated-primitive-entry", -100, {
                        allocations: { bob: 100 }
                    });

                    const forward = settle([input], accounts, statuses);
                    const reverse = settle([input], reverseAccounts, reverseStatuses);
                    const invalidIds = invalidEntries.map(([id]) => id).sort();
                    const expectedIssues = accountBoundary
                        ? [
                              ...invalidIds.map(accountEntryIssue),
                              ...(referenced
                                  ? [
                                        {
                                            accountId: "account-a",
                                            transactionId: "generated-primitive-entry",
                                            type: "missing-account" as const
                                        }
                                    ]
                                  : [])
                          ]
                        : invalidIds.map(() => statusEntryIssue);

                    expect(reverse).toEqual(forward);
                    expect(forward.issues).toEqual(expectedIssues);
                    expect(forward.qualifyingTransactionCount).toBe(referenced ? 0 : 1);
                    expect(obligationShape(forward)).toEqual(
                        referenced ? [] : [expectedObligation]
                    );
                    assertFrozenGraph(forward);
                    assertFrozenGraph(reverse);
                }
            ),
            { numRuns: 1_000, seed: 26072508 }
        );
    });
});

describe("canonical examples A-H", () => {
    it("Example A: no explicit allocations produces no obligation", () => {
        const result = settle([transaction("example-a", -10_000)]);

        expectNoSettlement(result);
        expect(result.qualifyingTransactionCount).toBe(1);
        expect(positionAmount(result, "USD", "alice")).toBe(0);
    });

    it("Example B: 50/50 expense makes Bob owe Alice $50", () => {
        const result = settle([
            transaction("example-b", -10_000, { allocations: { alice: 50, bob: 50 } })
        ]);

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 5_000,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
    });

    it("Example C: owner remainder makes Bob owe Alice $30", () => {
        const result = settle([transaction("example-c", -10_000, { allocations: { bob: 30 } })]);

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 3_000,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
    });

    it("Example D: joint owners receive the third person's exact shares", () => {
        const result = settle(
            [transaction("example-d", -10_000, { allocations: { charlie: 30 } })],
            baseAccounts({ alice: 60, bob: 40 })
        );

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 1_800,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "charlie"
            },
            {
                amountMinor: 1_200,
                creditorPersonId: "bob",
                currency: "USD",
                debtorPersonId: "charlie"
            }
        ]);
    });

    it("Example E: a negative allocation reverses the expense direction", () => {
        const result = settle([transaction("example-e", -10_000, { allocations: { bob: -20 } })]);

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 2_000,
                creditorPersonId: "bob",
                currency: "USD",
                debtorPersonId: "alice"
            }
        ]);
    });

    it("Example F: income makes the receiving owner owe Bob $50", () => {
        const result = settle([
            transaction("example-f", 10_000, { allocations: { alice: 50, bob: 50 } })
        ]);

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 5_000,
                creditorPersonId: "bob",
                currency: "USD",
                debtorPersonId: "alice"
            }
        ]);
    });

    it("Example G: equal joint ownership produces no obligation", () => {
        const result = settle(
            [transaction("example-g", -10_000)],
            baseAccounts({ alice: 50, bob: 50 })
        );

        expectNoSettlement(result);
        expect(positionAmount(result, "USD", "alice")).toBe(0);
        expect(positionAmount(result, "USD", "bob")).toBe(0);
    });

    it("Example H: a non-paid status excludes the transaction", () => {
        const result = settle([
            transaction("example-h", -10_000, {
                allocations: { alice: 50, bob: 50 },
                statusId: PENDING_STATUS_ID
            })
        ]);

        expectNoSettlement(result);
        expect(result.positions).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(0);
    });
});

describe("eligibility and currency isolation", () => {
    it("excludes deleted transactions and nested suspected duplicates", () => {
        const nested = nestedTransaction("nested", -10_000);
        const parent = transaction("parent", -10_000, {
            allocations: { alice: 100 },
            nested: [nested]
        });
        const flattenedNested = {
            ...transaction("nested", -10_000, { allocations: { alice: 50, bob: 50 } }),
            suspectedDuplicates: []
        };
        const deleted = transaction("deleted", -10_000, {
            allocations: { alice: 50, bob: 50 },
            deleted: true
        });

        const result = settle([flattenedNested, deleted, parent]);

        expectNoSettlement(result);
        expect(result.qualifyingTransactionCount).toBe(1);
    });

    it("retains a deleted Treat-as-Paid status and ignores transfer tags", () => {
        const result = settle(
            [
                transaction("historical-paid", -2_000, {
                    allocations: { bob: 25 },
                    tagIds: ["transfer-tag"]
                })
            ],
            baseAccounts(),
            baseStatuses(status(PAID_STATUS_ID, "treatAsPaid", true))
        );

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 500,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
    });

    it("resolves account currency then vault default then USD", () => {
        const accounts = {
            explicit: account("explicit", { alice: 100 }, "EUR"),
            inherited: account("inherited", { alice: 100 }, ""),
            fallback: account("fallback", { alice: 100 }, "")
        };
        const transactions = [
            transaction("eur", -100, {
                accountId: "explicit",
                allocations: { bob: 100 }
            }),
            transaction("cad", -200, {
                accountId: "inherited",
                allocations: { bob: 100 }
            })
        ];

        const withDefault = settle(transactions, accounts, baseStatuses(), "CAD");
        const withoutDefault = settle(
            [
                transaction("usd", -300, {
                    accountId: "fallback",
                    allocations: { bob: 100 }
                })
            ],
            accounts
        );

        expect(withDefault.obligations.map(({ currency }) => currency)).toEqual(["CAD", "EUR"]);
        expect(withoutDefault.obligations.map(({ currency }) => currency)).toEqual(["USD"]);
    });

    it("never nets obligations across currencies", () => {
        const result = settle(
            [
                transaction("usd-expense", -1_000, {
                    accountId: "usd",
                    allocations: { bob: 100 }
                }),
                transaction("eur-income", 1_000, {
                    accountId: "eur",
                    allocations: { bob: 100 }
                })
            ],
            {
                eur: account("eur", { alice: 100 }, "EUR"),
                usd: account("usd", { alice: 100 }, "USD")
            }
        );

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 1_000,
                creditorPersonId: "bob",
                currency: "EUR",
                debtorPersonId: "alice"
            },
            {
                amountMinor: 1_000,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
    });
});

describe("retained runtime boundary sanitization", () => {
    it("treats a missing allocation map as the canonical empty allocation", () => {
        const input = runtimeTransaction(transaction("missing-allocations", -100), {
            allocations: undefined
        });

        const result = settle([input]);

        expect(result.issues).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(1);
        expect(result.obligations).toEqual([]);
    });

    it.each([null, [], 17, "legacy"])(
        "reports a typed issue for invalid allocation container %#",
        (allocations) => {
            const result = settle([
                runtimeTransaction(transaction("invalid-allocation-container", -100), {
                    allocations
                })
            ]);

            expect(result.issues).toEqual([
                {
                    accountId: "account-a",
                    reason: "invalid-container",
                    transactionId: "invalid-allocation-container",
                    type: "invalid-allocation"
                }
            ]);
            expect(result.qualifyingTransactionCount).toBe(0);
            expect(result.obligations).toEqual([]);
        }
    );

    it.each(INVALID_FINANCIAL_OBJECT_FACTORIES)(
        "rejects a non-record allocation %s without a plausible settled result",
        (_, create) => {
            const allocations = create();
            const input = runtimeTransaction(
                transaction("non-record-allocation", -100, { allocations: { bob: 100 } }),
                { allocations }
            );

            const result = settle([input]);

            expect(result.issues).toEqual([
                {
                    accountId: "account-a",
                    reason: "invalid-container",
                    transactionId: "non-record-allocation",
                    type: "invalid-allocation"
                }
            ]);
            expect(result.qualifyingTransactionCount).toBe(0);
            expect(result.positions).toEqual([]);
            expect(result.contributions).toEqual([]);
            expect(result.obligations).toEqual([]);
            expect(Object.isFrozen(allocations)).toBe(false);
        }
    );

    it.each([
        ["non-empty Map", () => new Map([["alice", 100]])],
        ["empty Map", () => new Map()],
        ["Set", () => new Set([100])],
        ["Date", () => new Date(0)],
        ["RegExp", () => /alice/u],
        ["typed collection", () => new Uint8Array([100])],
        ["class instance", () => new BobAllocationEnvelope()]
    ])("rejects a non-record ownership %s atomically", (_, create) => {
        const ownerships = create();
        const accounts = {
            "account-a": runtimeAccount(account("account-a", { alice: 100 }), {
                ownerships
            })
        };

        const result = settle(
            [transaction("non-record-ownership", -100, { allocations: { bob: 100 } })],
            accounts
        );

        expect(result.issues).toEqual([
            {
                accountId: "account-a",
                reason: "invalid-container",
                transactionId: "non-record-ownership",
                type: "invalid-ownership"
            }
        ]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.positions).toEqual([]);
        expect(result.contributions).toEqual([]);
        expect(result.obligations).toEqual([]);
        expect(Object.isFrozen(ownerships)).toBe(false);
    });

    it("accepts ordinary and null-prototype allocation and ownership records", () => {
        const allocations = Object.assign(Object.create(null) as Record<string, unknown>, {
            bob: 100
        });
        const ownerships = Object.assign(Object.create(null) as Record<string, unknown>, {
            alice: 100
        });
        const input = runtimeTransaction(transaction("null-prototype-records", -100), {
            allocations
        });

        const result = settle([input], baseAccounts(ownerships));

        expect(result.issues).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(1);
        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 100,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
        expect(Object.getPrototypeOf(allocations)).toBeNull();
        expect(Object.getPrototypeOf(ownerships)).toBeNull();
        expect(Object.isFrozen(allocations)).toBe(false);
        expect(Object.isFrozen(ownerships)).toBe(false);
    });

    it("rejects generated non-record financial containers at either boundary", () => {
        fc.assert(
            fc.property(
                fc.integer({
                    min: 0,
                    max: INVALID_FINANCIAL_OBJECT_FACTORIES.length - 1
                }),
                fc.boolean(),
                (factoryIndex, useOwnershipBoundary) => {
                    const factory = INVALID_FINANCIAL_OBJECT_FACTORIES[factoryIndex]?.[1];
                    if (factory == null) throw new Error("Missing financial-container factory");
                    const container = factory();
                    const id = useOwnershipBoundary
                        ? "generated-non-record-ownership"
                        : "generated-non-record-allocation";
                    const input = transaction(id, -100, { allocations: { bob: 100 } });
                    const result = useOwnershipBoundary
                        ? settle([input], {
                              "account-a": runtimeAccount(account("account-a", { alice: 100 }), {
                                  ownerships: container
                              })
                          })
                        : settle([runtimeTransaction(input, { allocations: container })]);

                    expect(result.issues).toEqual([
                        {
                            accountId: "account-a",
                            reason: "invalid-container",
                            transactionId: id,
                            type: useOwnershipBoundary ? "invalid-ownership" : "invalid-allocation"
                        }
                    ]);
                    expect(result.qualifyingTransactionCount).toBe(0);
                    expect(result.obligations).toEqual([]);
                }
            ),
            { numRuns: 200, seed: 26072504 }
        );
    });

    it.each([undefined, null, [], 17, "legacy"])(
        "reports a typed issue for invalid ownership container %#",
        (ownerships) => {
            const accounts = {
                "account-a": runtimeAccount(account("account-a", { alice: 100 }), {
                    ownerships
                })
            };
            const result = settle(
                [transaction("invalid-ownership-container", -100, { allocations: { bob: 50 } })],
                accounts
            );

            expect(result.issues).toEqual([
                {
                    accountId: "account-a",
                    reason: "invalid-container",
                    transactionId: "invalid-ownership-container",
                    type: "invalid-ownership"
                }
            ]);
            expect(result.qualifyingTransactionCount).toBe(0);
        }
    );

    it("accepts a missing duplicate list as empty and rejects null or mixed legacy lists", () => {
        const missing = settle([
            runtimeTransaction(transaction("missing-duplicates", -100), {
                suspectedDuplicates: undefined
            })
        ]);
        const invalidDuplicateLists: readonly unknown[] = [
            null,
            17,
            "legacy",
            {},
            [nestedTransaction("nested-valid", -100), 17]
        ];

        expect(missing.issues).toEqual([]);
        expect(missing.qualifyingTransactionCount).toBe(1);
        for (const [index, suspectedDuplicates] of invalidDuplicateLists.entries()) {
            const store = transactionStore([
                [
                    runtimeTransaction(transaction(`invalid-duplicates-${String(index)}`, -100), {
                        suspectedDuplicates
                    })
                ]
            ]);
            const result = settleStore(store);
            expect(result.issues).toHaveLength(1);
            expect(result.issues[0]).toMatchObject({
                reason: "invalid-duplicate-list",
                type: "invalid-transaction"
            });
            expect(result.qualifyingTransactionCount).toBe(0);
        }
    });

    it("reports non-string currency and missing fallback currency without throwing", () => {
        const numericCurrency = settle([transaction("numeric-currency", -100)], {
            "account-a": runtimeAccount(account("account-a", { alice: 100 }), {
                currency: 840
            })
        });
        const missingFallback = settle(
            [transaction("missing-fallback", -100)],
            {
                "account-a": runtimeAccount(account("account-a", { alice: 100 }), {
                    currency: undefined
                })
            },
            baseStatuses(),
            undefined
        );

        expect(numericCurrency.issues).toEqual([
            {
                accountId: "account-a",
                reason: "not-string",
                transactionId: "numeric-currency",
                type: "invalid-currency"
            }
        ]);
        expect(missingFallback.issues).toEqual([]);
        expect(missingFallback.positions[0]?.currency).toBe("USD");
    });

    it("reports every malformed entry type without aliasing or throwing", () => {
        const result = settle(
            [
                transaction("malformed-entry-values", -100, {
                    allocations: {
                        array: [],
                        infinity: Number.POSITIVE_INFINITY,
                        nan: Number.NaN,
                        negativeZero: -0,
                        object: {},
                        string: "25"
                    }
                })
            ],
            baseAccounts({
                alice: 100
            })
        );

        expect(
            result.issues.map((issue) => ({
                personId: "personId" in issue ? issue.personId : undefined,
                reason: "reason" in issue ? issue.reason : undefined,
                type: issue.type
            }))
        ).toEqual([
            { personId: "array", reason: "not-number", type: "invalid-allocation" },
            { personId: "infinity", reason: "not-finite", type: "invalid-allocation" },
            { personId: "nan", reason: "not-finite", type: "invalid-allocation" },
            {
                personId: "negativeZero",
                reason: "negative-zero",
                type: "invalid-allocation"
            },
            { personId: "object", reason: "not-number", type: "invalid-allocation" },
            { personId: "string", reason: "not-number", type: "invalid-allocation" }
        ]);
        expect(result.qualifyingTransactionCount).toBe(0);
    });

    it("reports every malformed ownership entry type without aliasing or throwing", () => {
        const result = settle(
            [transaction("malformed-ownership-values", -100, { allocations: { bob: 100 } })],
            baseAccounts({
                array: [],
                infinity: Number.NEGATIVE_INFINITY,
                nan: Number.NaN,
                negativeZero: -0,
                object: {},
                string: "100"
            })
        );

        expect(
            result.issues.map((issue) => ({
                personId: "personId" in issue ? issue.personId : undefined,
                reason: "reason" in issue ? issue.reason : undefined,
                type: issue.type
            }))
        ).toEqual([
            { personId: "array", reason: "not-number", type: "invalid-ownership" },
            { personId: "infinity", reason: "not-finite", type: "invalid-ownership" },
            { personId: "nan", reason: "not-finite", type: "invalid-ownership" },
            {
                personId: "negativeZero",
                reason: "negative-zero",
                type: "invalid-ownership"
            },
            { personId: "object", reason: "not-number", type: "invalid-ownership" },
            { personId: "string", reason: "not-number", type: "invalid-ownership" }
        ]);
        expect(result.qualifyingTransactionCount).toBe(0);
    });
});

describe("complete exception-safe materialized snapshots", () => {
    const invalidContainerIssue = (
        type: "invalid-allocation" | "invalid-ownership",
        transactionId: string
    ) => ({
        accountId: "account-a",
        reason: "invalid-container",
        transactionId,
        type
    });

    it.each(["ownKeys", "descriptor", "prototype"] as const)(
        "catches %s traps on top-level account and status collections",
        (trap) => {
            const input = transactionStore([
                [transaction("collection-trap", -100, { allocations: { bob: 100 } })]
            ]);
            const accounts = throwingRecordProxy(baseAccounts(), trap) as unknown as Readonly<
                Record<string, Account | string>
            >;
            const statuses = throwingRecordProxy(baseStatuses(), trap) as unknown as Readonly<
                Record<string, Status | string>
            >;

            expect(() =>
                calculateSettlementBalances(input, accounts, baseStatuses())
            ).not.toThrow();
            expect(() =>
                calculateSettlementBalances(input, baseAccounts(), statuses)
            ).not.toThrow();
            expect(calculateSettlementBalances(input, accounts, baseStatuses()).issues).toEqual([
                {
                    accountId: "<unknown-account>",
                    hierarchyLevel: "accounts",
                    hierarchyPath: "accounts",
                    reason: "invalid-hierarchy",
                    transactionId: "<transaction-store>",
                    type: "invalid-transaction"
                }
            ]);
            expect(calculateSettlementBalances(input, baseAccounts(), statuses).issues).toEqual([
                {
                    accountId: "<unknown-account>",
                    hierarchyLevel: "statuses",
                    hierarchyPath: "statuses",
                    reason: "invalid-hierarchy",
                    transactionId: "<transaction-store>",
                    type: "invalid-transaction"
                }
            ]);
        }
    );

    it.each(["ownKeys", "descriptor", "prototype"] as const)(
        "catches %s traps on store and retained records",
        (trap) => {
            const input = transaction("record-trap", -100, { allocations: { bob: 100 } });
            const trappedStore = throwingRecordProxy(
                transactionStore([[input]]) as unknown as Readonly<Record<string, unknown>>,
                trap
            ) as unknown as TransactionStore;
            const trappedTransaction = throwingRecordProxy(
                input as unknown as Readonly<Record<string, unknown>>,
                trap
            ) as unknown as Transaction;

            expect(() => settleStore(trappedStore)).not.toThrow();
            expect(settleStore(trappedStore).issues).toEqual([
                {
                    accountId: "<unknown-account>",
                    hierarchyLevel: "store-root",
                    hierarchyPath: "store-root",
                    reason: "invalid-hierarchy",
                    transactionId: "<transaction-store>",
                    type: "invalid-transaction"
                }
            ]);
            expect(() => settle([trappedTransaction])).not.toThrow();
            expect(settle([trappedTransaction]).issues).toEqual([
                {
                    accountId: "account-a",
                    hierarchyLevel: "transaction",
                    hierarchyPath: "years[].months[].days[].transactions[]",
                    reason: "invalid-hierarchy",
                    transactionId: "<transaction-store>",
                    type: "invalid-transaction"
                }
            ]);
        }
    );

    it("never invokes accessors while snapshotting transactions or financial maps", () => {
        const trappedTransaction = accessorRecord(
            transaction("transaction-getter", -100) as unknown as Readonly<Record<string, unknown>>,
            "id"
        ) as unknown as Transaction;
        const trappedAllocations = accessorRecord({ bob: 100 }, "bob");
        const trappedOwnerships = accessorRecord({ alice: 100 }, "alice");

        expect(() => settle([trappedTransaction])).not.toThrow();
        expect(settle([trappedTransaction]).issues).toEqual([
            {
                accountId: "account-a",
                hierarchyLevel: "transaction",
                hierarchyPath: "years[].months[].days[].transactions[]",
                reason: "invalid-hierarchy",
                transactionId: "<transaction-store>",
                type: "invalid-transaction"
            }
        ]);
        expect(() =>
            settle([
                runtimeTransaction(transaction("allocation-getter", -100), {
                    allocations: trappedAllocations
                })
            ])
        ).not.toThrow();
        expect(
            settle([
                runtimeTransaction(transaction("allocation-getter", -100), {
                    allocations: trappedAllocations
                })
            ]).issues
        ).toEqual([invalidContainerIssue("invalid-allocation", "allocation-getter")]);
        expect(() =>
            settle(
                [transaction("ownership-getter", -100, { allocations: { bob: 100 } })],
                baseAccounts(trappedOwnerships)
            )
        ).not.toThrow();
        expect(
            settle(
                [transaction("ownership-getter", -100, { allocations: { bob: 100 } })],
                baseAccounts(trappedOwnerships)
            ).issues
        ).toEqual([invalidContainerIssue("invalid-ownership", "ownership-getter")]);
    });

    it.each(["ownKeys", "descriptor", "prototype"] as const)(
        "catches %s traps at allocation and ownership boundaries",
        (trap) => {
            const allocations = throwingRecordProxy({ bob: 100 }, trap);
            const ownerships = throwingRecordProxy({ alice: 100 }, trap);

            expect(() =>
                settle([runtimeTransaction(transaction("allocation-proxy", -100), { allocations })])
            ).not.toThrow();
            expect(
                settle([runtimeTransaction(transaction("allocation-proxy", -100), { allocations })])
                    .issues
            ).toEqual([invalidContainerIssue("invalid-allocation", "allocation-proxy")]);
            expect(() =>
                settle(
                    [transaction("ownership-proxy", -100, { allocations: { bob: 100 } })],
                    baseAccounts(ownerships)
                )
            ).not.toThrow();
            expect(
                settle(
                    [transaction("ownership-proxy", -100, { allocations: { bob: 100 } })],
                    baseAccounts(ownerships)
                ).issues
            ).toEqual([invalidContainerIssue("invalid-ownership", "ownership-proxy")]);
        }
    );

    it("rejects hidden financial values and unexpected symbols instead of plausible settlement", () => {
        const hidden = {};
        Object.defineProperty(hidden, "bob", { enumerable: false, value: 100 });
        const symbol = Symbol("bob");
        const symbolBearing = { alice: 100, [symbol]: 100 };

        const hiddenResult = settle([
            runtimeTransaction(transaction("hidden-allocation", -100), { allocations: hidden })
        ]);
        const symbolResult = settle(
            [transaction("symbol-ownership", -100, { allocations: { bob: 100 } })],
            baseAccounts(symbolBearing)
        );

        expect(hiddenResult.issues).toEqual([
            invalidContainerIssue("invalid-allocation", "hidden-allocation")
        ]);
        expect(hiddenResult.qualifyingTransactionCount).toBe(0);
        expect(hiddenResult.obligations).toEqual([]);
        expect(symbolResult.issues).toEqual([
            invalidContainerIssue("invalid-ownership", "symbol-ownership")
        ]);
        expect(symbolResult.qualifyingTransactionCount).toBe(0);
    });

    it("copies a transparent prototype-spoofed class through descriptors before calculation", () => {
        const classValue = new BobAllocationEnvelope();
        const allocations = new Proxy(classValue, {
            get() {
                throw new Error("unsafe class property access");
            },
            getPrototypeOf() {
                return Object.prototype;
            }
        });

        const result = settle([
            runtimeTransaction(transaction("prototype-spoof", -100), { allocations })
        ]);

        expect(result.issues).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(1);
        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 100,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
    });

    it("does not traverse an untrusted core-field object while deriving physical-copy identity", () => {
        const amount = new Proxy(
            {},
            {
                get() {
                    throw new Error("amount get trap");
                },
                getOwnPropertyDescriptor() {
                    throw new Error("amount descriptor trap");
                },
                ownKeys() {
                    throw new Error("amount ownKeys trap");
                }
            }
        );
        const input = runtimeTransaction(transaction("object-amount", -100), { amount });

        expect(() => settle([input])).not.toThrow();
        expect(settle([input]).issues).toEqual([
            {
                accountId: "account-a",
                reason: "not-safe-integer",
                transactionId: "object-amount",
                type: "invalid-amount"
            }
        ]);
    });

    it("rejects a tree years accessor and an array index accessor without invoking either", () => {
        const trappedTree = accessorRecord({ accountId: "account-a", years: [] }, "years");
        const accessorYears: unknown[] = [];
        Object.defineProperty(accessorYears, "0", {
            enumerable: true,
            get() {
                throw new Error("year index getter");
            }
        });
        const treeStore = { "account-a": trappedTree } as unknown as TransactionStore;
        const arrayStore = {
            "account-a": { accountId: "account-a", years: accessorYears }
        } as unknown as TransactionStore;

        expect(() => settleStore(treeStore)).not.toThrow();
        expect(settleStore(treeStore).issues).toEqual([
            {
                accountId: "account-a",
                hierarchyLevel: "account-tree",
                hierarchyPath: "account-tree",
                reason: "invalid-hierarchy",
                transactionId: "<transaction-store>",
                type: "invalid-transaction"
            }
        ]);
        expect(() => settleStore(arrayStore)).not.toThrow();
        expect(settleStore(arrayStore).issues).toEqual([
            {
                accountId: "account-a",
                hierarchyLevel: "years",
                hierarchyPath: "years",
                reason: "invalid-hierarchy",
                transactionId: "<transaction-store>",
                type: "invalid-transaction"
            }
        ]);
    });

    it.each(["iterator", "index", "length"] as const)(
        "does not use trapped %s access while traversing materialized hierarchy arrays",
        (trap) => {
            const input = transaction("array-trap", -100, { allocations: { bob: 100 } });
            const years = throwingArrayProxy(
                [
                    {
                        months: [
                            {
                                days: [{ day: 1, transactions: [input] }],
                                month: 1
                            }
                        ],
                        year: 2024
                    }
                ],
                trap
            );
            const store = {
                "account-a": { accountId: "account-a", years }
            } as unknown as TransactionStore;

            const result = settleStore(store);

            expect(result.issues).toEqual([]);
            expect(result.qualifyingTransactionCount).toBe(1);
            expect(obligationShape(result)).toEqual([
                {
                    amountMinor: 100,
                    creditorPersonId: "alice",
                    currency: "USD",
                    debtorPersonId: "bob"
                }
            ]);
        }
    );

    it.each(["ownKeys", "descriptor", "prototype"] as const)(
        "rejects hierarchy arrays whose %s reflection traps",
        (trap) => {
            const years = throwingArrayProxy([], trap);
            const store = {
                "account-a": { accountId: "account-a", years }
            } as unknown as TransactionStore;

            expect(() => settleStore(store)).not.toThrow();
            expect(settleStore(store).issues).toEqual([
                {
                    accountId: "account-a",
                    hierarchyLevel: "years",
                    hierarchyPath: "years",
                    reason: "invalid-hierarchy",
                    transactionId: "<transaction-store>",
                    type: "invalid-transaction"
                }
            ]);
        }
    );

    it("copies duplicate lists without invoking iterator, index or length access", () => {
        for (const trap of ["iterator", "index", "length"] as const) {
            const input = runtimeTransaction(transaction(`duplicates-${trap}`, -100), {
                suspectedDuplicates: throwingArrayProxy(
                    [nestedTransaction("nested-trap", -100)],
                    trap
                )
            });

            expect(() => settle([input])).not.toThrow();
            expect(settle([input]).issues).toEqual([]);
            expect(settle([input]).qualifyingTransactionCount).toBe(1);
        }
    });

    it("catches duplicate-list ownKeys and descriptor traps with transaction context", () => {
        for (const trap of ["ownKeys", "descriptor", "prototype"] as const) {
            const input = runtimeTransaction(transaction(`duplicates-${trap}`, -100), {
                suspectedDuplicates: throwingArrayProxy(
                    [nestedTransaction("nested-trap", -100)],
                    trap
                )
            });

            expect(() => settle([input])).not.toThrow();
            expect(settle([input]).issues).toEqual([
                {
                    accountId: "account-a",
                    reason: "invalid-duplicate-list",
                    transactionId: `duplicates-${trap}`,
                    type: "invalid-transaction"
                }
            ]);
        }
    });

    it("generates reflection mechanisms and descriptor shapes beyond a finite object factory", () => {
        fc.assert(
            fc.property(
                fc.string({ maxLength: 24, minLength: 1 }),
                fc.integer({ max: 100, min: 0 }),
                fc.boolean(),
                fc.constantFrom(
                    "ownKeys",
                    "descriptor",
                    "prototype",
                    "accessor",
                    "hidden",
                    "symbol"
                ),
                (rawPersonId, percentage, ownershipBoundary, mechanism) => {
                    const personId = rawPersonId === "__proto__" ? "generated-person" : rawPersonId;
                    const target = Object.create(null) as Record<PropertyKey, unknown>;
                    Object.defineProperty(target, personId, {
                        configurable: true,
                        enumerable: mechanism !== "hidden",
                        value: percentage
                    });
                    let container: unknown = target;
                    if (mechanism === "accessor") {
                        Object.defineProperty(target, personId, {
                            configurable: true,
                            enumerable: true,
                            get() {
                                throw new Error("generated getter");
                            }
                        });
                    } else if (mechanism === "symbol") {
                        target[Symbol(rawPersonId)] = percentage;
                    } else if (
                        mechanism === "ownKeys" ||
                        mechanism === "descriptor" ||
                        mechanism === "prototype"
                    ) {
                        container = throwingRecordProxy(target, mechanism);
                    }
                    const id = ownershipBoundary ? "generated-ownership" : "generated-allocation";
                    const result = ownershipBoundary
                        ? settle(
                              [transaction(id, -100, { allocations: { bob: 100 } })],
                              baseAccounts(container as Readonly<Record<string, unknown>>)
                          )
                        : settle([
                              runtimeTransaction(transaction(id, -100), {
                                  allocations: container
                              })
                          ]);

                    expect(result.issues).toEqual([
                        invalidContainerIssue(
                            ownershipBoundary ? "invalid-ownership" : "invalid-allocation",
                            id
                        )
                    ]);
                    expect(result.qualifyingTransactionCount).toBe(0);
                    expect(result.obligations).toEqual([]);
                }
            ),
            { numRuns: 300, seed: 26072506 }
        );
    });
});

describe("hierarchical retained-topology eligibility", () => {
    const topologyIssue = (accountId: string, hierarchyLevel: string, hierarchyPath: string) => ({
        accountId,
        hierarchyLevel,
        hierarchyPath,
        reason: "invalid-hierarchy",
        transactionId: "<transaction-store>",
        type: "invalid-transaction"
    });

    const malformedHierarchyTree = (level: string, accountId: string) => {
        switch (level) {
            case "account-tree":
                return null;
            case "years":
                return { accountId, years: null };
            case "year":
                return { accountId, years: [null] };
            case "months":
                return { accountId, years: [{ year: 2024, months: {} }] };
            case "month":
                return { accountId, years: [{ year: 2024, months: [[]] }] };
            case "days":
                return {
                    accountId,
                    years: [{ year: 2024, months: [{ month: 1, days: "legacy" }] }]
                };
            case "day":
                return {
                    accountId,
                    years: [{ year: 2024, months: [{ month: 1, days: [17] }] }]
                };
            case "transactions":
                return {
                    accountId,
                    years: [
                        {
                            year: 2024,
                            months: [{ month: 1, days: [{ day: 1, transactions: {} }] }]
                        }
                    ]
                };
            case "transaction":
                return {
                    accountId,
                    years: [
                        {
                            year: 2024,
                            months: [{ month: 1, days: [{ day: 1, transactions: [new Set()] }] }]
                        }
                    ]
                };
            default:
                throw new Error(`Unknown hierarchy level ${level}`);
        }
    };

    const calendarStore = (
        year: unknown,
        month: unknown,
        day: unknown,
        options: {
            readonly transactionAccountId?: unknown;
            readonly treeAccountId?: unknown;
            readonly treeKey?: string;
        } = {}
    ) => {
        const treeKey = options.treeKey ?? "account-a";
        const input = runtimeTransaction(
            transaction("calendar", -100, { allocations: { bob: 100 } }),
            {
                accountId:
                    "transactionAccountId" in options ? options.transactionAccountId : "account-a"
            }
        );
        return {
            [treeKey]: {
                accountId: "treeAccountId" in options ? options.treeAccountId : "account-a",
                years: [
                    {
                        months: [
                            {
                                days: [{ day, transactions: [input] }],
                                month
                            }
                        ],
                        year
                    }
                ]
            }
        } as unknown as TransactionStore;
    };

    it.each([null, 17, "legacy", [], new Map(), new Set(), new Date(0)])(
        "reports invalid transaction-store root %#",
        (root) => {
            const result = settleStore(root as unknown as TransactionStore);

            expect(result.issues).toEqual([
                topologyIssue("<unknown-account>", "store-root", "store-root")
            ]);
            expect(result.qualifyingTransactionCount).toBe(0);
            expect(result.positions).toEqual([]);
            expect(result.obligations).toEqual([]);
            assertFrozenGraph(result);
        }
    );

    it("reports the exact retained years null reproduction", () => {
        const store = {
            $cid: "transaction-store",
            "account-a": {
                accountId: "account-a",
                years: null
            }
        } as unknown as TransactionStore;

        const result = settleStore(store);

        expect(result.issues).toEqual([topologyIssue("account-a", "years", "years")]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.positions).toEqual([]);
        expect(result.obligations).toEqual([]);
        assertFrozenGraph(result);
        expect(Object.isFrozen(store)).toBe(false);
        expect(Object.isFrozen(store["account-a"])).toBe(false);
    });

    it.each([
        [
            "account tree",
            { $cid: "transaction-store", "account-a": null },
            topologyIssue("account-a", "account-tree", "account-tree")
        ],
        [
            "missing years",
            { $cid: "transaction-store", "account-a": { accountId: "account-a" } },
            topologyIssue("account-a", "years", "years")
        ],
        [
            "year record",
            {
                $cid: "transaction-store",
                "account-a": { accountId: "account-a", years: [null] }
            },
            topologyIssue("account-a", "year", "years[]")
        ],
        [
            "months list",
            {
                $cid: "transaction-store",
                "account-a": {
                    accountId: "account-a",
                    years: [{ year: 2024, months: {} }]
                }
            },
            topologyIssue("account-a", "months", "years[].months")
        ],
        [
            "month record",
            {
                $cid: "transaction-store",
                "account-a": {
                    accountId: "account-a",
                    years: [{ year: 2024, months: [[]] }]
                }
            },
            topologyIssue("account-a", "month", "years[].months[]")
        ],
        [
            "days list",
            {
                $cid: "transaction-store",
                "account-a": {
                    accountId: "account-a",
                    years: [{ year: 2024, months: [{ month: 1, days: "legacy" }] }]
                }
            },
            topologyIssue("account-a", "days", "years[].months[].days")
        ],
        [
            "day record",
            {
                $cid: "transaction-store",
                "account-a": {
                    accountId: "account-a",
                    years: [{ year: 2024, months: [{ month: 1, days: [17] }] }]
                }
            },
            topologyIssue("account-a", "day", "years[].months[].days[]")
        ],
        [
            "transactions list",
            {
                $cid: "transaction-store",
                "account-a": {
                    accountId: "account-a",
                    years: [
                        {
                            year: 2024,
                            months: [{ month: 1, days: [{ day: 1, transactions: {} }] }]
                        }
                    ]
                }
            },
            topologyIssue("account-a", "transactions", "years[].months[].days[].transactions")
        ],
        [
            "transaction record",
            {
                $cid: "transaction-store",
                "account-a": {
                    accountId: "account-a",
                    years: [
                        {
                            year: 2024,
                            months: [{ month: 1, days: [{ day: 1, transactions: [new Set()] }] }]
                        }
                    ]
                }
            },
            topologyIssue("account-a", "transaction", "years[].months[].days[].transactions[]")
        ]
    ])("reports malformed %s context instead of silently skipping it", (_, rawStore, issue) => {
        const store = rawStore as unknown as TransactionStore;
        const before = runtimeValueSnapshot(store);

        const result = settleStore(store);

        expect(result.issues).toEqual([issue]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.positions).toEqual([]);
        expect(result.contributions).toEqual([]);
        expect(result.obligations).toEqual([]);
        expect(runtimeValueSnapshot(store)).toBe(before);
        assertFrozenGraph(result);
        expect(Object.isFrozen(store)).toBe(false);
    });

    it.each([
        ["missing", undefined],
        ["null", null],
        ["number", 42],
        ["empty", ""],
        ["different", "other"]
    ])("rejects %s account-tree accountId instead of falling back to its key", (_, accountId) => {
        const store = calendarStore(2024, 1, 1, { treeAccountId: accountId });

        const result = settleStore(store);

        expect(result.issues).toEqual([
            topologyIssue("account-a", "account-tree", "account-tree.accountId")
        ]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.obligations).toEqual([]);
    });

    it("rejects a retained transaction whose accountId disagrees with its canonical tree", () => {
        const store = calendarStore(2024, 1, 1, {
            transactionAccountId: "account-b"
        });

        const result = settleStore(store);

        expect(result.issues).toEqual([
            topologyIssue(
                "account-a",
                "transaction",
                "years[].months[].days[].transactions[].accountId"
            )
        ]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.obligations).toEqual([]);
    });

    it.each([
        ["year NaN", Number.NaN, 1, 1, "year", "years[]"],
        ["year positive infinity", Number.POSITIVE_INFINITY, 1, 1, "year", "years[]"],
        ["year negative infinity", Number.NEGATIVE_INFINITY, 1, 1, "year", "years[]"],
        ["year fraction", 2024.5, 1, 1, "year", "years[]"],
        ["year negative zero", -0, 1, 1, "year", "years[]"],
        ["year unsafe integer", Number.MAX_SAFE_INTEGER + 1, 1, 1, "year", "years[]"],
        ["year before supported range", -271822, 7, 1, "year", "years[]"],
        ["year after supported range", 275761, 7, 1, "year", "years[]"],
        ["month zero", 2024, 0, 1, "month", "years[].months[]"],
        ["month thirteen", 2024, 13, 1, "month", "years[].months[]"],
        ["month fraction", 2024, 1.5, 1, "month", "years[].months[]"],
        ["month negative zero", 2024, -0, 1, "month", "years[].months[]"],
        ["day zero", 2024, 1, 0, "day", "years[].months[].days[]"],
        ["day thirty two", 2024, 1, 32, "day", "years[].months[].days[]"],
        ["day fraction", 2024, 1, 1.5, "day", "years[].months[].days[]"],
        ["day negative zero", 2024, 1, -0, "day", "years[].months[].days[]"],
        ["non-leap February", 2023, 2, 29, "day", "years[].months[].days[]"],
        ["April thirty first", 2024, 4, 31, "day", "years[].months[].days[]"],
        ["before supported range", -271821, 4, 18, "day", "years[].months[].days[]"],
        ["after supported range", 275760, 9, 14, "day", "years[].months[].days[]"]
    ] as const)(
        "rejects invalid Gregorian discriminator: %s",
        (_, year, month, day, level, path) => {
            const result = settleStore(calendarStore(year, month, day));

            expect(result.issues).toEqual([topologyIssue("account-a", level, path)]);
            expect(result.qualifyingTransactionCount).toBe(0);
            expect(result.obligations).toEqual([]);
        }
    );

    it("accepts leap day and the temporal-polyfill supported calendar boundaries", () => {
        for (const [year, month, day] of [
            [2024, 2, 29],
            [-271821, 4, 19],
            [275760, 9, 13]
        ] as const) {
            const result = settleStore(calendarStore(year, month, day));

            expect(result.issues).toEqual([]);
            expect(result.qualifyingTransactionCount).toBe(1);
            expect(obligationShape(result)).toEqual([
                {
                    amountMinor: 100,
                    creditorPersonId: "alice",
                    currency: "USD",
                    debtorPersonId: "bob"
                }
            ]);
        }
    });

    it("matches Temporal rejection for generated numeric hierarchy discriminators", () => {
        const discriminator = fc.oneof(
            fc.integer({ max: 300_000, min: -300_000 }),
            fc.double({
                max: 300_000,
                min: -300_000,
                noDefaultInfinity: true,
                noNaN: true
            }),
            fc.constantFrom(
                Number.NaN,
                Number.POSITIVE_INFINITY,
                Number.NEGATIVE_INFINITY,
                -0,
                Number.MAX_SAFE_INTEGER + 1
            )
        );
        fc.assert(
            fc.property(discriminator, discriminator, discriminator, (year, month, day) => {
                const isComponent = (value: number) =>
                    Number.isSafeInteger(value) && !Object.is(value, -0);
                let validYear = false;
                if (isComponent(year)) {
                    try {
                        Temporal.PlainDate.from({ day: 1, month: 7, year }, { overflow: "reject" });
                        validYear = true;
                    } catch {
                        validYear = false;
                    }
                }
                const validMonth = isComponent(month) && month >= 1 && month <= 12;
                const validDayComponent = isComponent(day) && day >= 1 && day <= 31;
                let validDate = false;
                if (validYear && validMonth && validDayComponent) {
                    try {
                        Temporal.PlainDate.from({ day, month, year }, { overflow: "reject" });
                        validDate = true;
                    } catch {
                        validDate = false;
                    }
                }
                const result = settleStore(calendarStore(year, month, day));

                if (validDate) {
                    expect(result.issues).toEqual([]);
                    expect(result.qualifyingTransactionCount).toBe(1);
                    return;
                }
                const [level, path] = !validYear
                    ? (["year", "years[]"] as const)
                    : !validMonth
                      ? (["month", "years[].months[]"] as const)
                      : (["day", "years[].months[].days[]"] as const);
                expect(result.issues).toEqual([topologyIssue("account-a", level, path)]);
                expect(result.qualifyingTransactionCount).toBe(0);
            }),
            { numRuns: 500, seed: 26072507 }
        );
    });

    it("preserves valid siblings while reporting every mixed malformed hierarchy element", () => {
        const valid = transaction("valid-sibling", -100, { allocations: { bob: 100 } });
        const year = {
            year: 2024,
            months: [
                {
                    month: 1,
                    days: [{ day: 1, transactions: [valid, null, 17, []] }, null, []]
                },
                null,
                []
            ]
        };
        const makeStore = (reverse: boolean) =>
            ({
                $cid: "transaction-store",
                "account-a": {
                    accountId: "account-a",
                    years: reverse
                        ? [[], null, { ...year, months: [...year.months].reverse() }]
                        : [year, null, []]
                },
                "account-b": {
                    accountId: "account-b",
                    years: reverse ? {} : null
                }
            }) as unknown as TransactionStore;
        const forwardStore = makeStore(false);
        const reverseStore = makeStore(true);
        const forwardBefore = runtimeValueSnapshot(forwardStore);
        const reverseBefore = runtimeValueSnapshot(reverseStore);

        const forward = settleStore(forwardStore);
        const reverse = settleStore(reverseStore);

        expect(reverse).toEqual(forward);
        expect(forward.qualifyingTransactionCount).toBe(1);
        expect(obligationShape(forward)).toEqual([
            {
                amountMinor: 100,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
        expect(forward.issues).toEqual([
            topologyIssue("account-a", "day", "years[].months[].days[]"),
            topologyIssue("account-a", "day", "years[].months[].days[]"),
            topologyIssue("account-a", "month", "years[].months[]"),
            topologyIssue("account-a", "month", "years[].months[]"),
            topologyIssue("account-a", "transaction", "years[].months[].days[].transactions[]"),
            topologyIssue("account-a", "transaction", "years[].months[].days[].transactions[]"),
            topologyIssue("account-a", "transaction", "years[].months[].days[].transactions[]"),
            topologyIssue("account-a", "year", "years[]"),
            topologyIssue("account-a", "year", "years[]"),
            topologyIssue("account-b", "years", "years")
        ]);
        expect(runtimeValueSnapshot(forwardStore)).toBe(forwardBefore);
        expect(runtimeValueSnapshot(reverseStore)).toBe(reverseBefore);
        assertFrozenGraph(forward);
    });

    it("matches an independent generated hierarchy context oracle under insertion changes", () => {
        const hierarchyLevels = [
            "account-tree",
            "years",
            "year",
            "months",
            "month",
            "days",
            "day",
            "transactions",
            "transaction"
        ] as const;
        const hierarchyPaths: Readonly<Record<(typeof hierarchyLevels)[number], string>> = {
            "account-tree": "account-tree",
            day: "years[].months[].days[]",
            days: "years[].months[].days",
            month: "years[].months[]",
            months: "years[].months",
            transaction: "years[].months[].days[].transactions[]",
            transactions: "years[].months[].days[].transactions",
            year: "years[]",
            years: "years"
        };

        fc.assert(
            fc.property(
                fc.uniqueArray(fc.constantFrom(...hierarchyLevels), {
                    minLength: 1,
                    maxLength: hierarchyLevels.length
                }),
                (levels) => {
                    const entries = levels.map((level, index) => {
                        const accountId = `generated-${String(index).padStart(2, "0")}-${level}`;
                        return [accountId, malformedHierarchyTree(level, accountId)] as const;
                    });
                    const forwardStore = {
                        $cid: "transaction-store",
                        ...Object.fromEntries(entries)
                    } as unknown as TransactionStore;
                    const reverseStore = {
                        $cid: "transaction-store",
                        ...Object.fromEntries([...entries].reverse())
                    } as unknown as TransactionStore;
                    const expected = entries
                        .map(([accountId], index) => {
                            const level = levels[index];
                            if (level == null) throw new Error("Missing generated hierarchy level");
                            return topologyIssue(accountId, level, hierarchyPaths[level]);
                        })
                        .sort((left, right) =>
                            left.accountId < right.accountId
                                ? -1
                                : left.accountId > right.accountId
                                  ? 1
                                  : 0
                        );

                    const forward = settleStore(forwardStore);
                    const reverse = settleStore(reverseStore);

                    expect(reverse).toEqual(forward);
                    expect(forward.issues).toEqual(expected);
                    expect(forward.qualifyingTransactionCount).toBe(0);
                    expect(forward.obligations).toEqual([]);
                }
            ),
            { numRuns: 300, seed: 26072505 }
        );
    });

    it("filters inactive copies before selecting an active same-ID representation", () => {
        const live = runtimeTransaction(
            transaction("relocated", -1_000, { allocations: { bob: 100 } }),
            { $cid: "z-live" }
        );
        const deleted = runtimeTransaction(
            transaction("relocated", -1_000, {
                allocations: { charlie: 100 },
                deleted: true
            }),
            { $cid: "a-deleted" }
        );
        const reversedCidLive = runtimeTransaction(live, { $cid: "a-live" });
        const reversedCidDeleted = runtimeTransaction(deleted, { $cid: "z-deleted" });

        const first = settleStore(transactionStore([[deleted], [live]]));
        const second = settleStore(transactionStore([[reversedCidLive], [reversedCidDeleted]]));

        expect(second).toEqual(first);
        expect(first.qualifyingTransactionCount).toBe(1);
        expect(obligationShape(first)).toEqual([
            {
                amountMinor: 1_000,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
    });

    it("collapses exact active copies across buckets independently of list order", () => {
        const firstCopy = runtimeTransaction(
            transaction("duplicate-active", -500, { allocations: { bob: 100 } }),
            { $cid: "copy-a" }
        );
        const secondCopy = runtimeTransaction(firstCopy, { $cid: "copy-b" });

        const forward = settleStore(transactionStore([[firstCopy], [secondCopy]]));
        const reverse = settleStore(transactionStore([[secondCopy], [firstCopy]]));

        expect(reverse).toEqual(forward);
        expect(forward.qualifyingTransactionCount).toBe(1);
        expect(forward.contributions).toHaveLength(1);
    });

    it("excludes nested identities when only a deleted parent retains topology", () => {
        const nested = nestedTransaction("nested-retained", -700);
        const deletedParent = transaction("deleted-parent", -100, {
            deleted: true,
            nested: [nested]
        });
        const flattenedNested = transaction("nested-retained", -700, {
            allocations: { bob: 100 }
        });

        const result = settleStore(transactionStore([[flattenedNested], [deletedParent]]));

        expect(result.issues).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(0);
        expect(result.contributions).toEqual([]);
    });

    it("excludes a deleted nested identity when its active parent retains topology", () => {
        const deletedNested = {
            ...nestedTransaction("deleted-nested", -700),
            deletedAt: Temporal.Instant.from("2024-02-01T00:00:00Z")
        } as NestedDuplicate;
        const parent = transaction("active-parent", -100, {
            nested: [deletedNested]
        });
        const flattenedNested = transaction("deleted-nested", -700, {
            allocations: { bob: 100 }
        });

        const result = settleStore(transactionStore([[parent], [flattenedNested]]));

        expect(result.issues).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(1);
        expect(result.contributions).toEqual([]);
    });
});

describe("collision-free settlement identities", () => {
    it("does not reuse a malformed allocation result for a distinct delimiter payload", () => {
        const result = settle([
            transaction("collision-allocation-a", -100, {
                allocations: { a: "x|1:b=string:y" }
            }),
            transaction("collision-allocation-b", -100, {
                allocations: { a: "x", b: "y" }
            })
        ]);

        expect(
            result.issues.map((issue) => ({
                personId: "personId" in issue ? issue.personId : undefined,
                transactionId: issue.transactionId,
                type: issue.type
            }))
        ).toEqual([
            {
                personId: "a",
                transactionId: "collision-allocation-a",
                type: "invalid-allocation"
            },
            {
                personId: "a",
                transactionId: "collision-allocation-b",
                type: "invalid-allocation"
            },
            {
                personId: "b",
                transactionId: "collision-allocation-b",
                type: "invalid-allocation"
            }
        ]);
    });

    it("keeps NUL-delimited person identities in separate directed aggregates", () => {
        const result = settle(
            [
                transaction("nul-pair-a", -100, {
                    accountId: "account-c",
                    allocations: { "a\u0000b": 100 }
                }),
                transaction("nul-pair-b", -200, {
                    accountId: "account-bc",
                    allocations: { a: 100 }
                })
            ],
            {
                "account-bc": account("account-bc", { "b\u0000c": 100 }),
                "account-c": account("account-c", { c: 100 })
            }
        );

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 200,
                creditorPersonId: "b\u0000c",
                currency: "USD",
                debtorPersonId: "a"
            },
            {
                amountMinor: 100,
                creditorPersonId: "c",
                currency: "USD",
                debtorPersonId: "a\u0000b"
            }
        ]);
        expect(result.contributions).toHaveLength(2);
    });

    it("does not reuse a malformed ownership result for a distinct delimiter payload", () => {
        const result = settle(
            [
                transaction("collision-ownership-a", -100, {
                    accountId: "ownership-a",
                    allocations: { bob: 100 }
                }),
                transaction("collision-ownership-b", -100, {
                    accountId: "ownership-b",
                    allocations: { bob: 100 }
                })
            ],
            {
                "ownership-a": account("ownership-a", { a: "x|1:b=string:y" }),
                "ownership-b": account("ownership-b", { a: "x", b: "y" })
            }
        );

        expect(
            result.issues.map((issue) => ({
                personId: "personId" in issue ? issue.personId : undefined,
                transactionId: issue.transactionId,
                type: issue.type
            }))
        ).toEqual([
            {
                personId: "a",
                transactionId: "collision-ownership-a",
                type: "invalid-ownership"
            },
            {
                personId: "a",
                transactionId: "collision-ownership-b",
                type: "invalid-ownership"
            },
            {
                personId: "b",
                transactionId: "collision-ownership-b",
                type: "invalid-ownership"
            }
        ]);
    });

    it("separates invalid and valid cache paths across signed amounts and currencies", () => {
        const invalid = transaction("cache-invalid", -100, {
            allocations: { bob: "100" }
        });
        const validExpense = transaction("cache-valid-expense", -100, {
            allocations: { bob: 100 }
        });
        const validIncome = transaction("cache-valid-income", 40, {
            accountId: "eur",
            allocations: { bob: 100 }
        });
        const accounts = {
            "account-a": account("account-a", { alice: 100 }, "USD"),
            eur: account("eur", { alice: 100 }, "EUR")
        };

        const forward = settle([invalid, validExpense, validIncome], accounts);
        const reverse = settle([validIncome, validExpense, invalid], accounts);

        expect(reverse).toEqual(forward);
        expect(forward.qualifyingTransactionCount).toBe(2);
        expect(forward.issues).toHaveLength(1);
        expect(forward.issues[0]).toMatchObject({
            personId: "bob",
            transactionId: "cache-invalid",
            type: "invalid-allocation"
        });
        expect(obligationShape(forward)).toEqual([
            {
                amountMinor: 40,
                creditorPersonId: "bob",
                currency: "EUR",
                debtorPersonId: "alice"
            },
            {
                amountMinor: 100,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
    });

    it("is permutation invariant for generated delimiter, NUL and Unicode person IDs", () => {
        const adversarialPersonId = fc
            .tuple(
                fc.constantFrom("", ":", "|", "=", "\u0000", "💸", "e\u0301", "𐐷"),
                fc.string({ maxLength: 8 }),
                fc.constantFrom("", ":", "|", "=", "\u0000", "漢", "🙂")
            )
            .map(([prefix, body, suffix]) => `${prefix}${body}${suffix}`);

        fc.assert(
            fc.property(
                fc.uniqueArray(adversarialPersonId, {
                    minLength: 2,
                    maxLength: 5,
                    selector: (value) => value
                }),
                fc.integer({ min: -1_000_000, max: 1_000_000 }),
                (personIds, amount) => {
                    const [owner, ...allocatedPeople] = personIds;
                    if (owner == null) return;
                    const allocations = Object.fromEntries(
                        allocatedPeople.map((personId, index) => [personId, index === 0 ? 100 : 0])
                    );
                    const input = allocatedPeople.map((personId, index) =>
                        transaction(`adversarial-${String(index)}`, index === 0 ? amount : 0, {
                            allocations:
                                index === 0
                                    ? allocations
                                    : Object.fromEntries([...Object.entries(allocations)].reverse())
                        })
                    );
                    const accounts = baseAccounts({ [owner]: 100 });

                    const forward = settle(input, accounts);
                    const reverse = settle([...input].reverse(), accounts);

                    expect(reverse).toEqual(forward);
                    expect(forward.issues).toEqual([]);
                    expect(forward.qualifyingTransactionCount).toBe(input.length);
                }
            ),
            { numRuns: 500, seed: 26072502 }
        );
    });

    it("preserves every generated malformed issue across adversarial insertion permutations", () => {
        const adversarialPersonId = fc
            .tuple(
                fc.constantFrom(":", "|", "=", "\u0000", "💸", "e\u0301", "𐐷"),
                fc.string({ maxLength: 6 }),
                fc.constantFrom("", ":", "|", "=", "\u0000", "漢", "🙂")
            )
            .map(([prefix, body, suffix]) => `${prefix}${body}${suffix}`);
        const invalidValues: readonly unknown[] = [
            "legacy|string=value",
            -0,
            Number.NaN,
            Number.POSITIVE_INFINITY,
            [],
            {}
        ];

        fc.assert(
            fc.property(
                fc.uniqueArray(adversarialPersonId, {
                    minLength: 1,
                    maxLength: 8,
                    selector: (value) => value
                }),
                (personIds) => {
                    const entries = personIds.map(
                        (personId, index) =>
                            [personId, invalidValues[index % invalidValues.length]] as const
                    );
                    const forward = settle([
                        transaction("generated-malformed", -100, {
                            allocations: Object.fromEntries(entries)
                        })
                    ]);
                    const reverse = settle([
                        transaction("generated-malformed", -100, {
                            allocations: Object.fromEntries([...entries].reverse())
                        })
                    ]);

                    expect(reverse).toEqual(forward);
                    expect(forward.issues).toHaveLength(personIds.length);
                    expect(
                        forward.issues
                            .map((issue) => ("personId" in issue ? issue.personId : ""))
                            .sort()
                    ).toEqual([...personIds].sort());
                    expect(forward.qualifyingTransactionCount).toBe(0);
                }
            ),
            { numRuns: 500, seed: 26072503 }
        );
    });
});

describe("positions, deterministic matching, reverse netting and traceability", () => {
    it("matches sorted debtors and creditors deterministically", () => {
        const result = settle(
            [
                transaction("matching", -10_000, {
                    allocations: { delta: 25, charlie: 25 }
                })
            ],
            baseAccounts({ alice: 25, bob: 75 })
        );

        expect(
            result.contributions.map(({ debtorPersonId, creditorPersonId, amountMinor }) => ({
                amountMinor,
                creditorPersonId,
                debtorPersonId
            }))
        ).toEqual([
            { amountMinor: 1_250, creditorPersonId: "alice", debtorPersonId: "charlie" },
            { amountMinor: 1_250, creditorPersonId: "bob", debtorPersonId: "charlie" },
            { amountMinor: 2_500, creditorPersonId: "bob", debtorPersonId: "delta" }
        ]);
    });

    it("aggregates a pair, reverse-nets it and retains every signed source contribution", () => {
        const result = settle([
            transaction("forward-a", -1_000, { allocations: { bob: 100 } }),
            transaction("reverse", 400, { allocations: { bob: 100 } }),
            transaction("forward-b", -200, { allocations: { bob: 100 } })
        ]);

        expect(obligationShape(result)).toEqual([
            {
                amountMinor: 800,
                creditorPersonId: "alice",
                currency: "USD",
                debtorPersonId: "bob"
            }
        ]);
        expect(result.obligations[0]?.sourceContributions).toEqual([
            { amountMinor: 1_000, transactionId: "forward-a" },
            { amountMinor: 200, transactionId: "forward-b" },
            { amountMinor: -400, transactionId: "reverse" }
        ]);
        expect(
            result.obligations[0]?.sourceContributions.reduce(
                (total, contribution) => total + contribution.amountMinor,
                0
            )
        ).toBe(800);
        expect(result.contributions.map(({ transactionId }) => transactionId).sort()).toEqual([
            "forward-a",
            "forward-b",
            "reverse"
        ]);
    });

    it("keeps unknown and deleted People positions by stable ID", () => {
        const result = settle([
            transaction("historical", -300, {
                allocations: { "deleted-person": 50, "unknown-person": 50 }
            })
        ]);

        expect(result.positions[0]?.people.map(({ personId }) => personId)).toEqual([
            "alice",
            "deleted-person",
            "unknown-person"
        ]);
        expect(
            result.positions[0]?.people.reduce((total, position) => total + position.amountMinor, 0)
        ).toBe(0);
    });

    it("is independent of transaction and map insertion order", () => {
        const forward = transaction("forward", -999, {
            allocations: { charlie: 33, bob: 67 }
        });
        const reverse = transaction("reverse", 199, {
            allocations: { bob: 67, charlie: 33 }
        });
        const accountsA = baseAccounts({ alice: 60, delta: 40 });
        const accountsB = baseAccounts({ delta: 40, alice: 60 });

        const first = settle([forward, reverse], accountsA);
        const second = settle([reverse, forward], accountsB);

        expect(second).toEqual(first);
    });
});

describe("typed issues exclude invalid financial inputs", () => {
    function expectSingleIssue(result: SettlementResult, type: SettlementIssue["type"]): void {
        expect(result.issues.map((issue) => issue.type)).toEqual([type]);
        expect(result.obligations).toEqual([]);
        expect(result.positions).toEqual([]);
        expect(result.contributions).toEqual([]);
        expect(result.qualifyingTransactionCount).toBe(0);
    }

    it("reports missing-account with stable transaction/account context", () => {
        const result = settle(
            [transaction("missing-account-tx", -100, { accountId: "missing" })],
            {}
        );

        expectSingleIssue(result, "missing-account");
        expect(result.issues[0]).toMatchObject({
            accountId: "missing",
            transactionId: "missing-account-tx"
        });
    });

    it("reports invalid-currency instead of inventing a total", () => {
        const result = settle(
            [transaction("bad-currency", -100)],
            baseAccounts({ alice: 100 }, "NOT_A_CURRENCY")
        );

        expectSingleIssue(result, "invalid-currency");
    });

    it("reports every invalid allocation and excludes the transaction", () => {
        const result = settle([
            transaction("bad-allocation", -100, {
                allocations: { bob: 101, charlie: Number.NaN }
            })
        ]);

        expect(result.issues.map((issue) => issue.type)).toEqual([
            "invalid-allocation",
            "invalid-allocation"
        ]);
        expect(result.issues.map((issue) => "personId" in issue && issue.personId)).toEqual([
            "bob",
            "charlie"
        ]);
        expect(result.obligations).toEqual([]);
    });

    it("reports invalid ownership and excludes the transaction", () => {
        const result = settle(
            [transaction("bad-ownership", -100, { allocations: { bob: 50 } })],
            baseAccounts({ alice: 80 })
        );

        expectSingleIssue(result, "invalid-ownership");
        expect(result.issues[0]).toMatchObject({
            accountId: "account-a",
            reason: "invalid-total",
            transactionId: "bad-ownership"
        });
    });

    it("reports unsafe or non-integer money and excludes the transaction", () => {
        const nonInteger = unsafeAmountTransaction("fractional", 1.5);
        const unsafe = unsafeAmountTransaction("unsafe", Number.MAX_SAFE_INTEGER + 1);
        const result = settle([nonInteger, unsafe]);

        expect(result.issues.map((issue) => issue.type)).toEqual([
            "invalid-amount",
            "invalid-amount"
        ]);
        expect(result.qualifyingTransactionCount).toBe(0);
    });

    it("reports unsafe-calculation rather than overflowing a position", () => {
        const result = settle(
            [
                transaction("unsafe-position", Number.MAX_SAFE_INTEGER, {
                    allocations: { bob: 100, charlie: 100 }
                })
            ],
            baseAccounts({ alice: 100 })
        );

        expectSingleIssue(result, "unsafe-calculation");
    });
});

describe("fixed-seed independent integer/rational properties", () => {
    it("conserves signed positions and matches a BigInt hundredths oracle", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1_000_000, max: 1_000_000 }),
                fc.integer({ min: -100, max: 100 }),
                (amount, bobPercentage) => {
                    const result = settle([
                        transaction("property", amount, {
                            allocations: { bob: bobPercentage }
                        })
                    ]);
                    const effective = apportionByHundred(amount, {
                        alice: 100 - bobPercentage,
                        bob: bobPercentage
                    });
                    const ownership = apportionByHundred(amount, { alice: 100 });
                    const expectedAlice = (effective.alice ?? 0) - (ownership.alice ?? 0);
                    const expectedBob = effective.bob ?? 0;

                    expect(positionAmount(result, "USD", "alice")).toBe(expectedAlice);
                    expect(positionAmount(result, "USD", "bob")).toBe(expectedBob);
                    expect(expectedAlice + expectedBob).toBe(0);
                    expect(
                        result.positions[0]?.people.reduce(
                            (total, position) => total + position.amountMinor,
                            0
                        )
                    ).toBe(0);
                }
            ),
            { numRuns: 1_000, seed: 16001611 }
        );
    });

    it("conserves each currency and preserves reverse-net source sums under insertion changes", () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: -10_000, max: 10_000 }), {
                    minLength: 8,
                    maxLength: 8
                }),
                (amounts) => {
                    const transactions = amounts.map((amount, index) =>
                        transaction(`tx-${String(index).padStart(2, "0")}`, amount, {
                            accountId: index % 2 === 0 ? "usd" : "eur",
                            allocations: { bob: 100 }
                        })
                    );
                    const accounts = {
                        eur: account("eur", { alice: 100 }, "EUR"),
                        usd: account("usd", { alice: 100 }, "USD")
                    };
                    const forward = settle(transactions, accounts);
                    const reversed = settle([...transactions].reverse(), accounts);

                    expect(reversed).toEqual(forward);
                    for (const currencyPositions of forward.positions) {
                        const expectedBob = transactions
                            .filter(
                                ({ accountId }) =>
                                    (accountId === "usd" ? "USD" : "EUR") ===
                                    currencyPositions.currency
                            )
                            .reduce((sum, { amount }) => sum + amount, 0);
                        expect(
                            currencyPositions.people.reduce(
                                (sum, position) => sum + position.amountMinor,
                                0
                            )
                        ).toBe(0);
                        expect(
                            currencyPositions.people.find(({ personId }) => personId === "bob")
                                ?.amountMinor
                        ).toBe(expectedBob);
                        expect(
                            currencyPositions.people.find(({ personId }) => personId === "alice")
                                ?.amountMinor
                        ).toBe(-expectedBob);
                    }
                    for (const obligation of forward.obligations) {
                        expect(
                            obligation.sourceContributions.reduce(
                                (sum, source) => sum + source.amountMinor,
                                0
                            )
                        ).toBe(obligation.amountMinor);
                    }
                }
            ),
            { numRuns: 1_000, seed: 26072501 }
        );
    });

    it("matches a multi-owner rational oracle across positive, zero and negative remainder", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constantFrom(-1, 0, 1),
                    fc.integer({ min: -1_000_000, max: 1_000_000 })
                ),
                fc.integer({ min: 0, max: 100 }),
                fc.integer({ min: -100, max: 100 }),
                fc.integer({ min: -100, max: 100 }),
                (amount, aliceOwnership, charlieExplicit, deltaExplicit) => {
                    const bobOwnership = 100 - aliceOwnership;
                    const ownerRemainder = 100 - charlieExplicit - deltaExplicit;
                    const allocations =
                        amount % 2 === 0
                            ? {
                                  charlie: charlieExplicit,
                                  delta: deltaExplicit
                              }
                            : {
                                  delta: deltaExplicit,
                                  charlie: charlieExplicit
                              };
                    const ownerships =
                        amount % 2 === 0
                            ? { alice: aliceOwnership, bob: bobOwnership }
                            : { bob: bobOwnership, alice: aliceOwnership };
                    const result = settle(
                        [
                            transaction("multi-owner-property", amount, {
                                allocations
                            })
                        ],
                        baseAccounts(ownerships)
                    );
                    const effective = apportionRational(
                        amount,
                        {
                            alice: ownerRemainder * aliceOwnership,
                            bob: ownerRemainder * bobOwnership,
                            charlie: charlieExplicit * 100,
                            delta: deltaExplicit * 100
                        },
                        10_000
                    );
                    const ownership = apportionRational(
                        amount,
                        {
                            alice: aliceOwnership * 100,
                            bob: bobOwnership * 100
                        },
                        10_000
                    );

                    expect(result.issues).toEqual([]);
                    for (const personId of ["alice", "bob", "charlie", "delta"]) {
                        expect(positionAmount(result, "USD", personId)).toBe(
                            (effective[personId] ?? 0) - (ownership[personId] ?? 0)
                        );
                    }
                    expect(
                        result.positions[0]?.people.reduce(
                            (sum, position) => sum + position.amountMinor,
                            0
                        )
                    ).toBe(0);
                }
            ),
            { numRuns: 5_000, seed: 26072501 }
        );
    });
});

describe("runtime immutability and caller-input purity", () => {
    it("freezes every success and issue graph without freezing or mutating inputs", () => {
        const transactions = [
            transaction("valid", -500, { allocations: { bob: 50 } }),
            transaction("invalid", -500, {
                allocations: { charlie: 101 }
            })
        ];
        const accounts = baseAccounts();
        const statuses = baseStatuses();
        const store = transactionStore([transactions]);
        const transactionsBefore = JSON.stringify(transactions);
        const storeBefore = JSON.stringify(store);
        const accountsBefore = JSON.stringify(accounts);
        const statusesBefore = JSON.stringify(statuses);

        const result = settleStore(store, accounts, statuses);

        assertFrozenGraph(result);
        expect(Reflect.set(result, "qualifyingTransactionCount", 99)).toBe(false);
        expect(Reflect.set(result.obligations[0] ?? {}, "amountMinor", 99)).toBe(false);
        expect(Reflect.set(result.contributions[0] ?? {}, "amountMinor", 99)).toBe(false);
        expect(
            Reflect.set(result.obligations[0]?.sourceContributions[0] ?? {}, "amountMinor", 99)
        ).toBe(false);
        expect(Reflect.set(result.positions[0]?.people[0] ?? {}, "amountMinor", 99)).toBe(false);
        expect(Reflect.set(result.issues[0] ?? {}, "type", "missing-account")).toBe(false);
        expect(Reflect.set(result.obligations, "length", 0)).toBe(false);
        expect(Reflect.set(result.issues, "length", 0)).toBe(false);
        expect(JSON.stringify(transactions)).toBe(transactionsBefore);
        expect(JSON.stringify(store)).toBe(storeBefore);
        expect(JSON.stringify(accounts)).toBe(accountsBefore);
        expect(JSON.stringify(statuses)).toBe(statusesBefore);
        expect(Object.isFrozen(transactions)).toBe(false);
        expect(Object.isFrozen(store)).toBe(false);
        expect(Object.isFrozen(store["account-a"])).toBe(false);
        expect(Object.isFrozen(accounts)).toBe(false);
        expect(Object.isFrozen(statuses)).toBe(false);
    });
});

describe("production settlement scale", () => {
    it.runIf(process.env.P16B_BENCHMARK === "1")(
        "benchmarks 100,000 deterministic transactions with complete output",
        () => {
            const date = Temporal.PlainDate.from("2024-01-01");
            const creationInstant = Temporal.Instant.from("2024-01-01T00:00:00Z");
            const benchmarkTransaction = (
                id: string,
                amount: number,
                accountId: string,
                allocations: Readonly<Record<string, number>>
            ): Transaction =>
                ({
                    accountId,
                    allocations,
                    amount,
                    creationInstant,
                    date,
                    deletedAt: undefined,
                    description: "",
                    id,
                    notes: "",
                    statusId: PAID_STATUS_ID,
                    suspectedDuplicates: [],
                    tagIds: []
                }) as unknown as Transaction;
            const transactions = Array.from({ length: 100_000 }, (_, index) => {
                const id = `benchmark-${String(index).padStart(6, "0")}`;
                switch (index % 4) {
                    case 0:
                        return benchmarkTransaction(id, -10_000, "usd", { bob: 50 });
                    case 1:
                        return benchmarkTransaction(id, 5_000, "usd", { bob: 50 });
                    case 2:
                        return benchmarkTransaction(id, -5_000, "eur", { charlie: 25 });
                    default:
                        return benchmarkTransaction(id, 0, "eur", { delta: -20 });
                }
            });
            const accounts = {
                eur: account("eur", { alice: 100 }, "EUR"),
                usd: account("usd", { alice: 100 }, "USD")
            };
            const stores = new Map(
                [1_000, 10_000, 50_000, 100_000].map((count) => [
                    count,
                    transactionStore([transactions.slice(0, count)])
                ])
            );
            const execute = (count: number) => {
                const store = stores.get(count);
                if (store == null) throw new Error(`Missing benchmark store for ${String(count)}`);
                return settleStore(store, accounts, baseStatuses(), "CAD");
            };

            for (let index = 0; index < 5; index += 1) execute(1_000);
            const measure = (count: number) => {
                const startedAt = performance.now();
                const result = execute(count);
                return { elapsedMs: performance.now() - startedAt, result };
            };
            const scale10k = measure(10_000);
            const scale50k = measure(50_000);
            const samples = Array.from({ length: 5 }, () => measure(100_000));

            for (const { result } of samples) {
                expect(result.qualifyingTransactionCount).toBe(100_000);
                expect(result.issues).toEqual([]);
                expect(result.obligations).toHaveLength(2);
                expect(result.contributions).toHaveLength(75_000);
                expect(
                    result.positions.every(
                        ({ people }) =>
                            people.reduce((sum, position) => sum + position.amountMinor, 0) === 0
                    )
                ).toBe(true);
                expect(
                    result.obligations.every(
                        (obligation) =>
                            obligation.sourceContributions.reduce(
                                (sum, source) => sum + source.amountMinor,
                                0
                            ) === obligation.amountMinor
                    )
                ).toBe(true);
            }
            console.info(
                "P16B benchmark node=%s transactions=100000 construction=excluded projection=included warmup=5x1000 samples=5 scale10kMs=%s scale50kMs=%s elapsed100kMs=%s obligations=2 contributions=75000 issues=0 conservation=true",
                process.version,
                scale10k.elapsedMs.toFixed(2),
                scale50k.elapsedMs.toFixed(2),
                samples.map(({ elapsedMs }) => elapsedMs.toFixed(2)).join(",")
            );
        },
        120_000
    );
});
