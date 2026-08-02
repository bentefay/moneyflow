/**
 * Auto-apply behaviour of the SHIPPED `TransactionRuleProposal` (UR-009, frozen `:263-266`).
 *
 * These mount the real component, with only `useFieldRuleProposal` and the presentational
 * `FieldRuleProposal` mocked — so the `shouldShow` gate, the focus listener, the live focus read and
 * the auto-apply effect are all shipped code.
 *
 * Why this file exists at all. Revision 05's unit cases defined their own local `watches`/`paints`
 * helpers and imported nothing from the component, so the fix they existed to pin could be reverted
 * with the suite green (review F-12). Revision 06's first replacement drove the pure predicate but
 * never the effect that CONSUMES it — so reverting the live re-read again left the suite green.
 *
 * The discriminating question is not "does the predicate answer correctly" but "does the component
 * decide from it at the moment it writes". Only mounting the component asks that.
 */

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionRuleProposal } from "@/components/features/transactions/TransactionRuleProposal";
import { type RuleMatchSubject } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const apply = vi.fn(() => true);

vi.mock("@/components/features/transactions/use-field-rule-proposal", () => ({
    useFieldRuleProposal: () => ({
        proposal: { kind: "create", field: "tags", descriptionText: "COFFEE SHOP 123" },
        draft: { applyMode: "updatingAll", field: "tags" },
        errors: {},
        accounts: [],
        tags: [],
        people: [],
        aliases: [],
        currencyCode: "USD",
        setDraft: vi.fn(),
        apply
    })
}));

vi.mock("@/components/features/transactions/FieldRuleProposal", () => ({
    FieldRuleProposal: () => <div data-testid="proposal-body" />
}));

const SUBJECT: RuleMatchSubject = {
    descriptionText: "COFFEE SHOP 123",
    accountId: "acct-1",
    amount: asMinorUnits(-450),
    isManual: false
};

/**
 * Renders the proposal inside a real transaction row, with a focusable control in the row and one
 * outside it, so focus can genuinely move between them.
 */
function renderInRow(props: { readonly isEditing: boolean }) {
    const view = render(
        <>
            <div data-testid="transaction-row" data-transaction-id="tx-1">
                <input data-testid="in-row" />
                <TransactionRuleProposal
                    accountLabel="Checking"
                    amountLabel="-$4.50"
                    current={{ field: "tags", currentTagIds: ["tag-1"] }}
                    isEditing={props.isEditing}
                    isPending={true}
                    onDismiss={vi.fn()}
                    referenceDate={{ toString: () => "2026-07-01" } as never}
                    rowId="tx-1"
                    subject={SUBJECT}
                >
                    <span />
                </TransactionRuleProposal>
            </div>
            <input data-testid="outside" />
        </>
    );
    return view;
}

function focusOn(testId: string): void {
    const element = document.querySelector(`[data-testid="${testId}"]`);
    if (element instanceof HTMLElement) element.focus();
}

describe("the automatic modes decide from LIVE focus, not a remembered observation", () => {
    beforeEach(() => {
        apply.mockClear();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // The reviewer's measured F-11 sequence. Focus leaves the row while the edit is still open, so
    // the observation is recorded; the user then returns to the row before the edit surface closes.
    // Revision 05 applied here, writing a rule with the row focused and no chance to dismiss.
    it("does NOT apply when focus left during the edit but has returned by the time it closes", async () => {
        const { rerender } = renderInRow({ isEditing: true });

        // Focus leaves the row mid-edit — the wake-up flag is set.
        focusOn("outside");
        await vi.advanceTimersByTimeAsync(10);

        // The user comes back into the row, then the edit surface closes.
        focusOn("in-row");
        await vi.advanceTimersByTimeAsync(10);
        rerender(
            <>
                <div data-testid="transaction-row" data-transaction-id="tx-1">
                    <input data-testid="in-row" />
                    <TransactionRuleProposal
                        accountLabel="Checking"
                        amountLabel="-$4.50"
                        current={{ field: "tags", currentTagIds: ["tag-1"] }}
                        isEditing={false}
                        isPending={true}
                        onDismiss={vi.fn()}
                        referenceDate={{ toString: () => "2026-07-01" } as never}
                        rowId="tx-1"
                        subject={SUBJECT}
                    >
                        <span />
                    </TransactionRuleProposal>
                </div>
                <input data-testid="outside" />
            </>
        );
        await vi.advanceTimersByTimeAsync(10);

        // The row holds focus, so the frozen condition is NOT satisfied and nothing may be written.
        expect(apply).not.toHaveBeenCalled();
    });

    it("DOES apply once the edit has closed and focus is genuinely outside the row", async () => {
        renderInRow({ isEditing: false });

        focusOn("outside");
        await vi.advanceTimersByTimeAsync(10);

        await waitFor(() => {
            expect(apply).toHaveBeenCalledTimes(1);
        });
    });

    it("does not apply while the edit is still in progress, even with focus outside", async () => {
        renderInRow({ isEditing: true });

        focusOn("outside");
        await vi.advanceTimersByTimeAsync(10);

        expect(apply).not.toHaveBeenCalled();
    });
});
