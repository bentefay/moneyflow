import { describe, expect, it } from "vitest";

import {
    buildAllocationEntries,
    buildSettlementView,
    resolvePersonLabel,
    summarizeIssues,
    type SettlementViewPerson,
    type SettlementViewTransaction
} from "@/components/features/people";
import type { SettlementIssue, SettlementResult } from "@/lib/domain/settlement";

const PEOPLE: Readonly<Record<string, SettlementViewPerson>> = {
    alice: { deleted: false, name: "Alice" },
    bob: { deleted: false, name: "Bob" },
    ghost: { deleted: true, name: "Ghost" }
};

const resolvePerson = (personId: string): SettlementViewPerson | undefined => PEOPLE[personId];

function settlementResult(overrides: Partial<SettlementResult> = {}): SettlementResult {
    return {
        contributions: [],
        issues: [],
        obligations: [],
        positions: [],
        qualifyingTransactionCount: 0,
        ...overrides
    };
}

function obligation(
    currency: string,
    debtorPersonId: string,
    creditorPersonId: string,
    amountMinor: number,
    sourceContributions: readonly { amountMinor: number; transactionId: string }[] = []
) {
    return { amountMinor, creditorPersonId, currency, debtorPersonId, sourceContributions };
}

const noTransaction = (): SettlementViewTransaction | undefined => undefined;

describe("resolvePersonLabel", () => {
    it("labels active, deleted and entirely unknown People distinctly by stable ID", () => {
        expect(resolvePersonLabel("alice", resolvePerson)).toEqual({
            kind: "active",
            text: "Alice"
        });
        expect(resolvePersonLabel("ghost", resolvePerson)).toEqual({
            kind: "deleted",
            text: "Ghost (deleted)"
        });
        expect(resolvePersonLabel("person-vanished-01", resolvePerson)).toEqual({
            kind: "unknown",
            text: "Unknown person person-v"
        });
    });
});

describe("summarizeIssues", () => {
    it("returns null when there are no issues", () => {
        expect(summarizeIssues([])).toBeNull();
    });

    it("counts distinct affected transactions and deduplicates ordered reasons", () => {
        const issues: readonly SettlementIssue[] = [
            { accountId: "acct", transactionId: "tx-1", type: "missing-account" },
            { accountId: "acct", transactionId: "tx-1", type: "missing-account" },
            {
                accountId: "acct",
                personId: "bob",
                reason: "out-of-range",
                transactionId: "tx-2",
                type: "invalid-allocation"
            }
        ];

        expect(summarizeIssues(issues)).toEqual({
            affectedTransactionCount: 2,
            reasons: [
                "Allocation percentages are invalid",
                "Transaction references a missing account"
            ]
        });
    });
});

describe("buildSettlementView states", () => {
    it("reports incomplete whenever issues exist, even with zero obligations", () => {
        const view = buildSettlementView({
            resolvePerson,
            resolveTransaction: noTransaction,
            result: settlementResult({
                issues: [{ accountId: "acct", transactionId: "tx-1", type: "missing-account" }],
                qualifyingTransactionCount: 0
            })
        });

        expect(view.state.kind).toBe("incomplete");
    });

    it("reports incomplete rather than settled when issues coexist with obligations", () => {
        const view = buildSettlementView({
            resolvePerson,
            resolveTransaction: noTransaction,
            result: settlementResult({
                issues: [
                    {
                        accountId: "acct",
                        reason: "empty",
                        transactionId: "tx-9",
                        type: "invalid-ownership"
                    }
                ],
                obligations: [obligation("USD", "bob", "alice", 5000)],
                qualifyingTransactionCount: 3
            })
        });

        expect(view.state.kind).toBe("incomplete");
    });

    it("distinguishes no-qualifying-paid from everyone-settled", () => {
        const neutral = buildSettlementView({
            resolvePerson,
            resolveTransaction: noTransaction,
            result: settlementResult({ qualifyingTransactionCount: 0 })
        });
        const settled = buildSettlementView({
            resolvePerson,
            resolveTransaction: noTransaction,
            result: settlementResult({ qualifyingTransactionCount: 4 })
        });

        expect(neutral.state.kind).toBe("no-qualifying-transactions");
        expect(settled.state.kind).toBe("settled");
    });
});

describe("buildSettlementView obligations", () => {
    it("groups obligations into separate currency sections and exposes no combined total", () => {
        const view = buildSettlementView({
            resolvePerson,
            resolveTransaction: noTransaction,
            result: settlementResult({
                obligations: [
                    obligation("EUR", "bob", "alice", 500),
                    obligation("USD", "alice", "bob", 700),
                    obligation("USD", "ghost", "alice", 100)
                ],
                qualifyingTransactionCount: 3
            })
        });

        if (view.state.kind !== "obligations") throw new Error("expected obligations state");
        expect(view.state.sections.map(({ currency }) => currency)).toEqual(["EUR", "USD"]);
        expect(view.state.sections[0]?.obligations).toHaveLength(1);
        expect(view.state.sections[1]?.obligations).toHaveLength(2);

        // No field anywhere in the view can express a cross-currency total.
        const serialized = JSON.stringify(view);
        expect(serialized).not.toContain("total");
        expect(serialized).not.toContain("grandTotal");
    });

    it("highlights only obligations involving the linked Person", () => {
        const view = buildSettlementView({
            linkedPersonId: "alice",
            resolvePerson,
            resolveTransaction: noTransaction,
            result: settlementResult({
                obligations: [
                    obligation("USD", "bob", "alice", 700),
                    obligation("USD", "bob", "ghost", 100)
                ],
                qualifyingTransactionCount: 2
            })
        });

        if (view.state.kind !== "obligations") throw new Error("expected obligations state");
        const [involving, notInvolving] = view.state.sections[0]?.obligations ?? [];
        expect(involving?.involvesLinkedPerson).toBe(true);
        expect(notInvolving?.involvesLinkedPerson).toBe(false);
    });

    it("keeps deleted and unknown People as labelled entries rather than dropping balances", () => {
        const view = buildSettlementView({
            resolvePerson,
            resolveTransaction: noTransaction,
            result: settlementResult({
                obligations: [obligation("USD", "person-gone-1234", "ghost", 250)],
                qualifyingTransactionCount: 1
            })
        });

        if (view.state.kind !== "obligations") throw new Error("expected obligations state");
        const only = view.state.sections[0]?.obligations[0];
        expect(only?.amountMinor).toBe(250);
        expect(only?.debtor).toEqual({ kind: "unknown", text: "Unknown person person-g" });
        expect(only?.creditor).toEqual({ kind: "deleted", text: "Ghost (deleted)" });
    });

    it("carries every signed source contribution through to the expandable rows", () => {
        const transactions: Readonly<Record<string, SettlementViewTransaction>> = {
            "tx-forward": {
                accountName: "Joint",
                allocations: [],
                date: "2026-01-05",
                description: "Groceries"
            }
        };
        const view = buildSettlementView({
            resolvePerson,
            resolveTransaction: (id) => transactions[id],
            result: settlementResult({
                obligations: [
                    obligation("USD", "bob", "alice", 3000, [
                        { amountMinor: 5000, transactionId: "tx-forward" },
                        { amountMinor: -2000, transactionId: "tx-reverse" }
                    ])
                ],
                qualifyingTransactionCount: 2
            })
        });

        if (view.state.kind !== "obligations") throw new Error("expected obligations state");
        const sources = view.state.sections[0]?.obligations[0]?.sources ?? [];
        expect(sources).toHaveLength(2);
        expect(sources[0]).toEqual({
            accountName: "Joint",
            allocations: [],
            amountMinor: 5000,
            date: "2026-01-05",
            description: "Groceries",
            transactionId: "tx-forward"
        });
        // A source no longer retained keeps its stable ID instead of disappearing.
        expect(sources[1]?.transactionId).toBe("tx-reverse");
        expect(sources[1]?.amountMinor).toBe(-2000);
        expect(sources[1]?.accountName).toBe("Unknown account");
    });
});

describe("buildAllocationEntries", () => {
    it("reports the explicit value and the derived effective percentage per person", () => {
        const entries = buildAllocationEntries({ bob: 30 }, { alice: 100 }, resolvePerson);

        expect(entries).toEqual([
            {
                effectivePercentage: "70",
                explicitPercentage: null,
                person: { kind: "active", text: "Alice" },
                personId: "alice"
            },
            {
                effectivePercentage: "30",
                explicitPercentage: "30",
                person: { kind: "active", text: "Bob" },
                personId: "bob"
            }
        ]);
    });

    it("preserves a negative explicit allocation and its above-100 owner remainder", () => {
        const entries = buildAllocationEntries({ bob: -20 }, { alice: 100 }, resolvePerson);

        expect(entries.map(({ effectivePercentage }) => effectivePercentage)).toEqual([
            "120",
            "-20"
        ]);
        expect(entries[1]?.explicitPercentage).toBe("-20");
    });

    it("returns no context instead of a plausible substitute for invalid data", () => {
        expect(buildAllocationEntries({ bob: 101 }, { alice: 100 }, resolvePerson)).toEqual([]);
        expect(buildAllocationEntries({ bob: 50 }, {}, resolvePerson)).toEqual([]);
        expect(buildAllocationEntries({ bob: 50 }, { alice: 60 }, resolvePerson)).toEqual([]);
    });
});
