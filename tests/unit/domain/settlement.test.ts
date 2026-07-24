import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import type { Account, NestedDuplicate, Status, Transaction } from "@/lib/crdt/schema";
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

function settle(
    transactions: readonly Transaction[],
    accounts: Readonly<Record<string, Account | string>> = baseAccounts(),
    statuses: Readonly<Record<string, Status | string>> = baseStatuses(),
    defaultCurrency?: string
): SettlementResult {
    return calculateSettlementBalances(transactions, accounts, statuses, defaultCurrency);
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

describe("sole settlement authority", () => {
    it("removes the competing balance implementation and compatibility alias", () => {
        expect("calculateSettlementBalances" in balanceDomain).toBe(false);
        expect("calculateSimpleSettlementBalances" in domainBarrel).toBe(false);
        expect(domainBarrel.calculateSettlementBalances).toBe(calculateSettlementBalances);
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
                    minLength: 1,
                    maxLength: 40
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
                        expect(
                            currencyPositions.people.reduce(
                                (sum, position) => sum + position.amountMinor,
                                0
                            )
                        ).toBe(0);
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
            { numRuns: 500, seed: 16001612 }
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
                    const result = settle(
                        [
                            transaction("multi-owner-property", amount, {
                                allocations: {
                                    charlie: charlieExplicit,
                                    delta: deltaExplicit
                                }
                            })
                        ],
                        baseAccounts({ alice: aliceOwnership, bob: bobOwnership })
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
            { numRuns: 1_000, seed: 16001613 }
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
        const transactionsBefore = JSON.stringify(transactions);
        const accountsBefore = JSON.stringify(accounts);
        const statusesBefore = JSON.stringify(statuses);

        const result = settle(transactions, accounts, statuses);

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
        expect(JSON.stringify(accounts)).toBe(accountsBefore);
        expect(JSON.stringify(statuses)).toBe(statusesBefore);
        expect(Object.isFrozen(transactions)).toBe(false);
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
            const execute = (count: number) =>
                settle(transactions.slice(0, count), accounts, baseStatuses(), "CAD");

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
                "P16B benchmark node=%s transactions=100000 construction=excluded warmup=5x1000 samples=5 scale10kMs=%s scale50kMs=%s elapsed100kMs=%s obligations=2 contributions=75000 issues=0 conservation=true",
                process.version,
                scale10k.elapsedMs.toFixed(2),
                scale50k.elapsedMs.toFixed(2),
                samples.map(({ elapsedMs }) => elapsedMs.toFixed(2)).join(",")
            );
        },
        120_000
    );
});
