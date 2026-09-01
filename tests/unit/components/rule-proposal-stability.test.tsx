import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TransactionRow } from "@/components/features/transactions/TransactionRow";

describe("transaction row automation retirement", () => {
    it("renders no row-owned automation descendants", () => {
        render(
            <TransactionRow
                transaction={{
                    account: "Default",
                    accountId: "account-1",
                    amount: -100,
                    date: "2026-08-26",
                    description: "Coffee",
                    id: "transaction-1",
                    tags: []
                }}
            />
        );

        expect(screen.getByTestId("description-display")).toHaveTextContent("Coffee");
        expect(screen.queryByTestId(/rule-(proposal|robot)/)).not.toBeInTheDocument();
    });
});
