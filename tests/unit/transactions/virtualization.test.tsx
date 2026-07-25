import type { Range } from "@tanstack/react-virtual";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionRowData } from "@/components/features/transactions/TransactionRow";
import { TransactionTable } from "@/components/features/transactions/TransactionTable";

interface CapturedVirtualizerOptions {
    count: number;
    getScrollElement: () => HTMLElement | null;
    estimateSize: () => number;
    overscan: number;
    rangeExtractor: (range: Range) => number[];
    useFlushSync?: boolean;
}

const virtualizerSpy = vi.hoisted(() =>
    vi.fn((options: CapturedVirtualizerOptions) => ({
        getVirtualItems: () =>
            Array.from({ length: Math.min(11, options.count) }, (_, index) => ({
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
    defaultRangeExtractor: (range: Range) => {
        const start = Math.max(range.startIndex - range.overscan, 0);
        const end = Math.min(range.endIndex + range.overscan, range.count - 1);
        return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    },
    useVirtualizer: virtualizerSpy
}));

vi.mock("@/components/features/transactions/TransactionRow", () => ({
    TransactionRow: ({
        transaction,
        onFocus,
        allocationColumns,
        gridTemplateColumns
    }: {
        transaction?: TransactionRowData;
        onFocus?: () => void;
        allocationColumns?: ReadonlyArray<{ personId: string }>;
        gridTemplateColumns?: string;
    }) => (
        <div
            role="row"
            data-testid="transaction-row"
            data-allocation-count={allocationColumns?.length ?? 0}
            data-grid-template={gridTemplateColumns}
            tabIndex={0}
            onFocus={onFocus}
        >
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
    beforeEach(() => virtualizerSpy.mockClear());

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

    it("pins at most one focused row outside the virtual range to preserve focus and caret", () => {
        render(<TransactionTable transactions={createTransactions(10_000)} />);
        const firstOptions = virtualizerSpy.mock.calls.at(-1)?.[0];
        if (!firstOptions) throw new Error("Expected initial virtualizer options");
        const distantRange = { startIndex: 100, endIndex: 110, overscan: 5, count: 10_000 };
        const ordinaryIndexes = firstOptions.rangeExtractor(distantRange);
        expect(ordinaryIndexes).not.toContain(0);

        fireEvent.focus(screen.getAllByTestId("transaction-row")[0]);
        const focusedOptions = virtualizerSpy.mock.calls.at(-1)?.[0];
        if (!focusedOptions) throw new Error("Expected focused virtualizer options");
        const focusedIndexes = focusedOptions.rangeExtractor(distantRange);
        expect(focusedIndexes).toContain(0);
        expect(focusedIndexes).toHaveLength(ordinaryIndexes.length + 1);
    });

    it("keeps the focused transaction pinned when rapid rows insert ahead of it", () => {
        const original = createTransactions(20);
        const { rerender } = render(<TransactionTable transactions={original} />);

        fireEvent.focus(screen.getAllByTestId("transaction-row")[0]);
        rerender(
            <TransactionTable
                transactions={[
                    {
                        id: "new-empty-row",
                        date: "2026-01-01",
                        description: "",
                        amount: 0
                    },
                    ...original
                ]}
            />
        );

        const options = virtualizerSpy.mock.calls.at(-1)?.[0];
        if (!options) throw new Error("Expected updated virtualizer options");
        expect(
            options.rangeExtractor({ startIndex: 10, endIndex: 15, overscan: 5, count: 21 })
        ).toContain(1);
    });

    it("passes one stable allocation model through virtual rows and newly inserted rows", () => {
        const allocationColumns = [
            { personId: "person-a", label: "Ada", field: "allocation:person-a" as const }
        ];
        const gridTemplateColumns =
            "32px 120px minmax(150px,2fr) 160px 140px 110px 128px 112px 88px";
        const original = createTransactions(20);
        const { rerender } = render(
            <TransactionTable
                transactions={original}
                allocationColumns={allocationColumns}
                gridTemplateColumns={gridTemplateColumns}
            />
        );

        for (const row of screen.getAllByTestId("transaction-row")) {
            expect(row).toHaveAttribute("data-allocation-count", "1");
            expect(row).toHaveAttribute("data-grid-template", gridTemplateColumns);
        }

        rerender(
            <TransactionTable
                transactions={[
                    {
                        id: "new-empty-row",
                        date: "2026-01-01",
                        description: "",
                        amount: 0,
                        allocations: {}
                    },
                    ...original
                ]}
                allocationColumns={allocationColumns}
                gridTemplateColumns={gridTemplateColumns}
            />
        );
        expect(screen.getAllByTestId("transaction-row")[0]).toHaveAttribute(
            "data-allocation-count",
            "1"
        );
    });
});
