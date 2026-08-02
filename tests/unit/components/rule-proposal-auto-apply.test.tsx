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
 *
 * And mounting it is still not sufficient. Revision 06's cases here mounted the real component and
 * asserted both directions, and MEASURED green against the revision 06 component they were written
 * to fail — because every one of them began with focus already at `<body>`, outside the row. A
 * defect whose mechanism is "two conditions are never true at the same instant" is invisible when
 * both are true from the first tick. The starting state has to be the one the user starts in.
 *
 * Each revision's tests were one level closer and still had a gap one step along: rev 05 drove local
 * helpers, rev 06's first attempt drove the predicate but not the effect, rev 06's second drove the
 * effect from an unreachable starting state. Check the initial conditions, not just the assertions.
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
 * The proposal inside a real transaction row, with a focusable control in the row and one outside
 * it, so focus can genuinely move between them.
 */
function tree(isEditing: boolean): React.JSX.Element {
    return (
        <>
            <div data-testid="transaction-row" data-transaction-id="tx-1">
                <input data-testid="in-row" />
                <TransactionRuleProposal
                    accountLabel="Checking"
                    amountLabel="-$4.50"
                    current={{ field: "tags", currentTagIds: ["tag-1"] }}
                    isEditing={isEditing}
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
}

function renderInRow(props: { readonly isEditing: boolean }) {
    return render(tree(props.isEditing));
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
        rerender(tree(false));
        await vi.advanceTimersByTimeAsync(10);

        // The row holds focus, so the frozen condition is NOT satisfied and nothing may be written.
        expect(apply).not.toHaveBeenCalled();
    });

    // The positive direction as the user actually performs it: the edit BEGINS with the caret in the
    // row, and the click away both moves focus out and closes the edit surface.
    //
    // Starting focus inside the row is what makes this discriminating, and the reason it exists as a
    // separate case from the one below. Revision 06 needed two conditions — a remembered "focus was
    // seen outside" flag and a live re-read — to hold at the same instant, and they never did: the
    // flag is set inside a deferred task, so at the first evaluation focus is genuinely outside but
    // the flag is unset, and once the flag lands focus has moved on. A test that begins with focus
    // ALREADY outside the row cannot see that, because both conditions are then trivially true
    // together from the first tick. This one starts where the user starts, so the condition has to
    // change while the component is watching.
    it("applies when the edit began with focus in the row and the user then clicks away", async () => {
        const { rerender } = renderInRow({ isEditing: true });
        focusOn("in-row");
        await vi.advanceTimersByTimeAsync(10);

        // One gesture: focus leaves the row and the edit surface closes.
        focusOn("outside");
        rerender(tree(false));
        await vi.advanceTimersByTimeAsync(10);

        expect(apply).toHaveBeenCalledTimes(1);
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

    // `confirm` is a dependency of the listener effect, so the listeners tear down and re-register
    // whenever it changes — and each registration runs its own mount-time evaluation. Every one of
    // those sees a row that has genuinely lost focus, so `appliedRef` is the ONLY thing standing
    // between one gesture and a burst of writes.
    //
    // That is worth a test rather than a sentence in evidence. Deleting the guard and re-running this
    // case MEASURES 3 applies at the blur and 8 after five further renders, so a rule the user asked
    // for once would be created eight times.
    it("writes exactly once no matter how often the listeners re-register", async () => {
        const { rerender } = renderInRow({ isEditing: true });
        focusOn("in-row");
        await vi.advanceTimersByTimeAsync(10);

        focusOn("outside");
        rerender(tree(false));
        await vi.advanceTimersByTimeAsync(10);

        for (let index = 0; index < 5; index += 1) {
            rerender(tree(false));
            await vi.advanceTimersByTimeAsync(10);
        }

        expect(apply).toHaveBeenCalledTimes(1);
    });
});
