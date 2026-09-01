import { act, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TransactionTableToolbar } from "@/components/features/transactions/TransactionTableToolbar";

describe("TransactionTableToolbar narrow layout", () => {
    it("wraps both controls and the count without an intrinsic minimum width", () => {
        render(
            <TransactionTableToolbar
                inspectorOpen={false}
                automationPending
                isFiltered
                onAddClick={vi.fn()}
                onInspectorOpenChange={vi.fn()}
                selectedCount={12}
                totalCount={123}
            />
        );

        const toolbar = screen.getByTestId("transaction-table-toolbar");
        expect(toolbar.className).toContain("min-w-0");
        expect(toolbar.className).toContain("flex-wrap");
        expect(toolbar.className).toContain("gap-x-2");
        expect(toolbar.className).toContain("gap-y-1");
        expect(toolbar.className).not.toContain("min-w-fit");
        expect(within(toolbar).getByRole("button", { name: "Add transaction" })).toBeVisible();
        expect(
            within(toolbar).getByRole("button", {
                name: "Inspector, automation proposal pending"
            })
        ).toBeVisible();
        expect(within(toolbar).getByTestId("transaction-inspector-automation-badge")).toBeVisible();
        const count = within(toolbar).getByText(/123 transactions \(filtered\)/);
        expect(count).toHaveClass("ml-auto", "min-w-0", "text-right");
        expect(count).toHaveTextContent("12 selected");
    });

    it("announces a new closed-panel proposal once and keeps it in the accessibility tree", async () => {
        const props = {
            inspectorOpen: false,
            onAddClick: vi.fn(),
            onInspectorOpenChange: vi.fn()
        };
        const view = render(<TransactionTableToolbar {...props} automationPending={false} />);
        const status = screen.getByRole("status");
        const mutations: MutationRecord[] = [];
        const observer = new MutationObserver((records) => mutations.push(...records));
        observer.observe(status, { characterData: true, childList: true, subtree: true });

        view.rerender(<TransactionTableToolbar {...props} automationPending />);

        await waitFor(() =>
            expect(status).toHaveTextContent("Automation proposal pending in Inspector.")
        );
        expect(
            screen.getByRole("button", { name: "Inspector, automation proposal pending" })
        ).toBeVisible();
        expect(screen.getByTestId("transaction-inspector-automation-badge")).toBeVisible();
        mutations.length = 0;

        view.rerender(<TransactionTableToolbar {...props} automationPending />);
        await act(async () => Promise.resolve());

        expect(mutations).toHaveLength(0);
        expect(status).toHaveTextContent("Automation proposal pending in Inspector.");
        observer.disconnect();
    });
});
