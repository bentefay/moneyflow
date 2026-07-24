import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BalanceSummary } from "@/components/features/people/BalanceSummary";
import type { TransactionStore } from "@/lib/crdt/schema";
import { calculateSettlementBalances } from "@/lib/domain/settlement";

vi.mock("@/lib/domain/settlement", () => ({
    calculateSettlementBalances: vi.fn()
}));

const calculateSettlement = vi.mocked(calculateSettlementBalances);
const emptyTransactions = {} as TransactionStore;

describe("BalanceSummary canonical settlement result", () => {
    beforeEach(() => {
        calculateSettlement.mockReset();
    });

    it("shows Settlement incomplete and never a settled claim when issues exist", () => {
        calculateSettlement.mockReturnValue(
            Object.freeze({
                contributions: Object.freeze([]),
                issues: Object.freeze([
                    Object.freeze({
                        accountId: "missing-account",
                        transactionId: "affected-transaction",
                        type: "missing-account" as const
                    })
                ]),
                obligations: Object.freeze([]),
                positions: Object.freeze([]),
                qualifyingTransactionCount: 0
            })
        );

        render(
            <BalanceSummary
                accounts={{ $cid: "accounts" }}
                people={{ $cid: "people" }}
                statuses={{ $cid: "statuses" }}
                transactions={emptyTransactions}
                vaultDefaultCurrency="USD"
            />
        );

        expect(screen.getByText("Settlement incomplete")).toBeInTheDocument();
        expect(screen.getByText(/1 transaction/i)).toBeInTheDocument();
        expect(screen.queryByText(/Everyone is settled up/i)).not.toBeInTheDocument();
        expect(calculateSettlement).toHaveBeenCalledWith(
            emptyTransactions,
            { $cid: "accounts" },
            { $cid: "statuses" },
            "USD"
        );
    });

    it("renders canonical obligations in separate currency sections", () => {
        calculateSettlement.mockReturnValue(
            Object.freeze({
                contributions: Object.freeze([]),
                issues: Object.freeze([]),
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
                positions: Object.freeze([]),
                qualifyingTransactionCount: 2
            })
        );

        render(
            <BalanceSummary
                accounts={{ $cid: "accounts" }}
                people={{
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
                    }
                }}
                statuses={{ $cid: "statuses" }}
                transactions={emptyTransactions}
                vaultDefaultCurrency="USD"
            />
        );

        expect(screen.getByRole("heading", { name: "EUR" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "USD" })).toBeInTheDocument();
        expect(screen.getByText("€5.00")).toBeInTheDocument();
        expect(screen.getByText("$7.00")).toBeInTheDocument();
        expect(calculateSettlement).toHaveBeenCalledWith(
            emptyTransactions,
            expect.any(Object),
            { $cid: "statuses" },
            "USD"
        );
    });
});
