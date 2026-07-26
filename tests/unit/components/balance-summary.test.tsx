import { fireEvent, render, screen, within } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BalanceSummary } from "@/components/features/people/BalanceSummary";
import type { TransactionStore } from "@/lib/crdt/schema";
import { calculateSettlementBalances, type SettlementResult } from "@/lib/domain/settlement";

vi.mock("@/lib/domain/settlement", () => ({
    calculateSettlementBalances: vi.fn()
}));

const calculateSettlement = vi.mocked(calculateSettlementBalances);
const emptyTransactions = {} as TransactionStore;

const PEOPLE = {
    $cid: "people",
    alice: {
        $cid: "person-alice",
        deletedAt: undefined,
        id: "alice",
        linkedUserId: undefined,
        name: "Alice"
    },
    bob: {
        $cid: "person-bob",
        deletedAt: undefined,
        id: "bob",
        linkedUserId: undefined,
        name: "Bob"
    },
    ghost: {
        $cid: "person-ghost",
        deletedAt: Temporal.Instant.from("2026-01-01T00:00:00Z"),
        id: "ghost",
        linkedUserId: undefined,
        name: "Ghost"
    }
};

function mockResult(overrides: Partial<SettlementResult>): void {
    calculateSettlement.mockReturnValue(
        Object.freeze({
            contributions: Object.freeze([]),
            issues: Object.freeze([]),
            obligations: Object.freeze([]),
            positions: Object.freeze([]),
            qualifyingTransactionCount: 0,
            ...overrides
        })
    );
}

function renderSummary(props: Partial<Parameters<typeof BalanceSummary>[0]> = {}) {
    return render(
        <BalanceSummary
            accounts={{ $cid: "accounts" }}
            people={PEOPLE}
            statuses={{ $cid: "statuses" }}
            transactions={emptyTransactions}
            vaultDefaultCurrency="USD"
            {...props}
        />
    );
}

describe("BalanceSummary canonical settlement result", () => {
    beforeEach(() => {
        calculateSettlement.mockReset();
    });

    it("consumes the sole production engine with the vault's retained state", () => {
        mockResult({});
        renderSummary();

        expect(calculateSettlement).toHaveBeenCalledWith(
            emptyTransactions,
            { $cid: "accounts" },
            { $cid: "statuses" },
            "USD"
        );
    });

    it("shows Settlement incomplete with the affected count and reasons, never a settled claim", () => {
        mockResult({
            issues: Object.freeze([
                Object.freeze({
                    accountId: "missing-account",
                    transactionId: "affected-transaction",
                    type: "missing-account" as const
                }),
                Object.freeze({
                    accountId: "acct",
                    personId: "bob",
                    reason: "out-of-range" as const,
                    transactionId: "second-affected",
                    type: "invalid-allocation" as const
                })
            ]),
            qualifyingTransactionCount: 0
        });
        renderSummary();

        expect(screen.getByText("Settlement incomplete")).toBeInTheDocument();
        expect(screen.getByTestId("settlement-incomplete-count")).toHaveTextContent(
            /2 transactions need/i
        );
        expect(screen.getByText("Transaction references a missing account")).toBeInTheDocument();
        expect(screen.getByText("Allocation percentages are invalid")).toBeInTheDocument();
        expect(screen.queryByTestId("settlement-settled")).not.toBeInTheDocument();
    });

    it("keeps Settlement incomplete even when obligations were also produced", () => {
        mockResult({
            issues: Object.freeze([
                Object.freeze({
                    accountId: "acct",
                    reason: "empty" as const,
                    transactionId: "bad-ownership",
                    type: "invalid-ownership" as const
                })
            ]),
            obligations: Object.freeze([
                Object.freeze({
                    amountMinor: 5000,
                    creditorPersonId: "alice",
                    currency: "USD",
                    debtorPersonId: "bob",
                    sourceContributions: Object.freeze([])
                })
            ]),
            qualifyingTransactionCount: 2
        });
        renderSummary();

        expect(screen.getByText("Settlement incomplete")).toBeInTheDocument();
        expect(screen.queryByTestId("settlement-currency-section-USD")).not.toBeInTheDocument();
    });

    it("distinguishes the neutral no-qualifying-paid state from everyone settled", () => {
        mockResult({ qualifyingTransactionCount: 0 });
        const neutral = renderSummary();
        expect(screen.getByTestId("settlement-no-qualifying")).toBeInTheDocument();
        expect(screen.queryByTestId("settlement-settled")).not.toBeInTheDocument();
        neutral.unmount();

        mockResult({ qualifyingTransactionCount: 5 });
        renderSummary();
        expect(screen.getByTestId("settlement-settled")).toBeInTheDocument();
        expect(screen.queryByTestId("settlement-no-qualifying")).not.toBeInTheDocument();
    });

    it("renders separate currency sections with positive amounts and no combined total", () => {
        mockResult({
            obligations: Object.freeze([
                Object.freeze({
                    amountMinor: 500,
                    creditorPersonId: "alice",
                    currency: "EUR",
                    debtorPersonId: "bob",
                    sourceContributions: Object.freeze([
                        Object.freeze({ amountMinor: 500, transactionId: "eur-source" })
                    ])
                }),
                Object.freeze({
                    amountMinor: 700,
                    creditorPersonId: "bob",
                    currency: "USD",
                    debtorPersonId: "alice",
                    sourceContributions: Object.freeze([
                        Object.freeze({ amountMinor: 700, transactionId: "usd-source" })
                    ])
                })
            ]),
            qualifyingTransactionCount: 2
        });
        renderSummary();

        const eur = screen.getByTestId("settlement-currency-section-EUR");
        const usd = screen.getByTestId("settlement-currency-section-USD");
        expect(within(eur).getByRole("heading", { name: "EUR" })).toBeInTheDocument();
        expect(within(usd).getByRole("heading", { name: "USD" })).toBeInTheDocument();
        expect(within(eur).getByText("€5.00")).toBeInTheDocument();
        expect(within(usd).getByText("$7.00")).toBeInTheDocument();

        // €5.00 and $7.00 are never added: no element shows a combined 12.00 in any currency.
        expect(screen.queryByText(/12\.00/)).not.toBeInTheDocument();
    });

    it("highlights the linked Person's obligations only", () => {
        mockResult({
            obligations: Object.freeze([
                Object.freeze({
                    amountMinor: 700,
                    creditorPersonId: "alice",
                    currency: "USD",
                    debtorPersonId: "bob",
                    sourceContributions: Object.freeze([])
                }),
                Object.freeze({
                    amountMinor: 100,
                    creditorPersonId: "ghost",
                    currency: "USD",
                    debtorPersonId: "bob",
                    sourceContributions: Object.freeze([])
                })
            ]),
            qualifyingTransactionCount: 2
        });
        renderSummary({ currentPersonId: "alice" });

        expect(screen.getByTestId("settlement-obligation-USD:bob:alice").className).toContain(
            "bg-accent/50"
        );
        expect(screen.getByTestId("settlement-obligation-USD:bob:ghost").className).not.toContain(
            "bg-accent/50"
        );
    });

    it("labels deleted and unknown People by stable identity instead of dropping them", () => {
        mockResult({
            obligations: Object.freeze([
                Object.freeze({
                    amountMinor: 250,
                    creditorPersonId: "ghost",
                    currency: "USD",
                    debtorPersonId: "person-gone-1234",
                    sourceContributions: Object.freeze([])
                })
            ]),
            qualifyingTransactionCount: 1
        });
        renderSummary();

        expect(screen.getByText("Ghost (deleted)")).toBeInTheDocument();
        expect(screen.getByText("Unknown person person-g")).toBeInTheDocument();
        expect(screen.getByText("$2.50")).toBeInTheDocument();
    });

    it("expands an obligation to its contributing transactions with a View transaction link", () => {
        mockResult({
            obligations: Object.freeze([
                Object.freeze({
                    amountMinor: 3000,
                    creditorPersonId: "alice",
                    currency: "USD",
                    debtorPersonId: "bob",
                    sourceContributions: Object.freeze([
                        Object.freeze({ amountMinor: 5000, transactionId: "tx-forward" }),
                        Object.freeze({ amountMinor: -2000, transactionId: "tx-reverse" })
                    ])
                })
            ]),
            qualifyingTransactionCount: 2
        });
        renderSummary();

        const toggle = screen.getByRole("button", { expanded: false });
        expect(screen.queryByTestId("settlement-source-tx-forward")).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");

        const forward = screen.getByTestId("settlement-source-tx-forward");
        const reverse = screen.getByTestId("settlement-source-tx-reverse");
        expect(within(forward).getByText("$50.00")).toBeInTheDocument();
        // A netting-reducing contribution keeps its negative sign.
        expect(within(reverse).getByText("-$20.00")).toBeInTheDocument();

        expect(within(forward).getByRole("link", { name: "View transaction" })).toHaveAttribute(
            "href",
            "/transactions?transaction=tx-forward"
        );
        expect(within(reverse).getByRole("link", { name: "View transaction" })).toHaveAttribute(
            "href",
            "/transactions?transaction=tx-reverse"
        );

        fireEvent.click(toggle);
        expect(screen.queryByTestId("settlement-source-tx-forward")).not.toBeInTheDocument();
    });
});
