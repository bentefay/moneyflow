import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";

interface CapturedVirtualizerOptions {
    count: number;
    getScrollElement: () => HTMLElement | null;
    estimateSize: () => number;
    overscan: number;
    useFlushSync?: boolean;
}

const virtualizerSpy = vi.hoisted(() =>
    vi.fn((options: CapturedVirtualizerOptions) => ({
        getVirtualItems: () =>
            Array.from({ length: 11 }, (_, index) => ({
                index,
                key: index,
                start: index * options.estimateSize(),
                end: (index + 1) * options.estimateSize(),
                size: options.estimateSize(),
                lane: 0
            })),
        getTotalSize: () => options.count * options.estimateSize(),
        measureElement: vi.fn()
    }))
);

vi.mock("@tanstack/react-virtual", () => ({
    useVirtualizer: virtualizerSpy
}));

vi.mock("@/components/features/transactions/TransactionRow", () => ({
    TransactionRow: ({ transaction }: { transaction?: TransactionRowData }) => (
        <div role="row" data-testid="transaction-row">
            {transaction?.description}
        </div>
    )
}));

function createTransactions(count: number): TransactionRowData[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `transaction-${index}`,
        date: "2026-01-01",
        description: `Virtual transaction ${index}`,
        amount: -index
    }));
}

describe("TransactionTable virtualization", () => {
    it("explicitly enables released flushSync behavior while bounding a 10,000-row render", () => {
        render(<TransactionTable transactions={createTransactions(10_000)} />);

        expect(virtualizerSpy).toHaveBeenCalledTimes(1);
        const options = virtualizerSpy.mock.calls[0]?.[0];
        expect(options).toBeDefined();
        if (!options) throw new Error("Expected virtualizer options");

        expect(options.count).toBe(10_000);
        expect(options.estimateSize()).toBe(44);
        expect(options.overscan).toBe(5);
        expect(options.useFlushSync).toBe(true);
        expect(options.getScrollElement()).toBeInstanceOf(HTMLElement);
        expect(screen.getAllByTestId("transaction-row")).toHaveLength(11);
        expect(screen.getByRole("rowgroup")).toHaveStyle({ height: "440000px" });
    });
});
