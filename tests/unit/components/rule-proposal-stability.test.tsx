/**
 * Regression coverage for the two blocking defects found in P30 revision 01 (UR-009 F-1 and F-2).
 *
 * Both were structural rather than logical — the pure predicates were already correct — so they are
 * pinned here at the level they actually broke: how the proposal is MOUNTED, and what counts as the
 * frozen "row loses focus" gesture.
 *
 * F-1: the caller returned a bare `<div>` when a cell was not the pending edit and a
 * `<TransactionRuleProposal>` when it was. React reconciles by element type per position, so
 * flipping that state remounted the cell — closing the tag dropdown mid-edit, on the very gesture
 * the principal reported.
 *
 * F-2: because of that remount a freshly mounted cell reported "not editing" with no blur at all, so
 * the two "Updating…" modes applied a rule and rewrote other transactions before the user had seen
 * the controls. The frozen text at `:263-266` requires the ROW to lose focus.
 *
 * These use a faithful structural reproduction rather than the real page: the defects live in the
 * element-type branch and the focus wiring, both of which reproduce exactly without the CRDT stack.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isFocusStillInRow } from "@/components/features/transactions/field-rule-proposal-state";

/** Counts its own mounts, standing in for a cell holding un-committed edit state. */
function MountCountingCell({ onMount }: { readonly onMount: () => void }): React.JSX.Element {
    useEffect(() => {
        onMount();
    }, [onMount]);
    return <input data-testid="cell-input" defaultValue="" />;
}

/**
 * The SHIPPED shape after the fix: one element type at this position regardless of `isPending`.
 * Mirrors `page.tsx`'s `renderRuleProposal` and `TransactionRuleProposal`'s anchor.
 */
function FixedHost({
    isPending,
    onMount
}: {
    readonly isPending: boolean;
    readonly onMount: () => void;
}): React.JSX.Element {
    return (
        <Anchor isPending={isPending}>
            <MountCountingCell onMount={onMount} />
        </Anchor>
    );
}

/** The revision 01 shape: two different element types depending on `isPending`. */
function BrokenHost({
    isPending,
    onMount
}: {
    readonly isPending: boolean;
    readonly onMount: () => void;
}): React.JSX.Element {
    if (!isPending) {
        return (
            <div>
                <MountCountingCell onMount={onMount} />
            </div>
        );
    }
    return (
        <Anchor isPending={true}>
            <MountCountingCell onMount={onMount} />
        </Anchor>
    );
}

function Anchor({
    isPending,
    children
}: {
    readonly isPending: boolean;
    readonly children: React.ReactNode;
}): React.JSX.Element {
    return (
        <div data-pending={isPending ? "true" : "false"}>
            <div>{children}</div>
        </div>
    );
}

describe("F-1 — flipping the pending edit must not remount the cell", () => {
    it("keeps the cell mounted and the SAME DOM node when a proposal opens", () => {
        const onMount = vi.fn();
        const { rerender } = render(<FixedHost isPending={false} onMount={onMount} />);
        const before = screen.getByTestId("cell-input");

        rerender(<FixedHost isPending={true} onMount={onMount} />);

        expect(onMount).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("cell-input")).toBe(before);
    });

    it("preserves in-progress edit state across the flip", () => {
        const onMount = vi.fn();
        const { rerender } = render(<FixedHost isPending={false} onMount={onMount} />);
        const input = screen.getByTestId("cell-input");
        fireEvent.change(input, { target: { value: "half-typed" } });

        rerender(<FixedHost isPending={true} onMount={onMount} />);

        // A remount would reset this to the defaultValue, losing what the user was typing.
        expect(screen.getByTestId("cell-input")).toHaveValue("half-typed");
    });

    // The control: the revision 01 shape genuinely remounts, so the assertions above are
    // load-bearing rather than vacuously true of any structure.
    it("the two-element-type shape DOES remount, which is the defect being prevented", () => {
        const onMount = vi.fn();
        const { rerender } = render(<BrokenHost isPending={false} onMount={onMount} />);
        const before = screen.getByTestId("cell-input");

        rerender(<BrokenHost isPending={true} onMount={onMount} />);

        expect(onMount).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId("cell-input")).not.toBe(before);
    });
});

/**
 * Focus fixtures for the row-blur predicate.
 *
 * Revision 04's harness reimplemented the auto-apply RULE and was always mounted, so it could not
 * exhibit either defect that actually shipped: the listener being armed after the transition it
 * waited for, and the blur-to-`<body>` case that fires no `focusin` at all. A reproduction is
 * evidence only for the structure it reproduces (review F-9).
 *
 * These cases exercise the SHIPPED predicate `isFocusStillInRow` directly, against real DOM nodes,
 * so they answer the question the component actually asks rather than a restatement of it.
 */
function buildRow(rowId: string): { readonly row: Element; readonly inner: HTMLElement } {
    const row = document.createElement("div");
    row.setAttribute("data-testid", "transaction-row");
    row.setAttribute("data-transaction-id", rowId);
    const inner = document.createElement("input");
    row.appendChild(inner);
    document.body.appendChild(row);
    return { row, inner };
}

/** A surface this row owns but which the DOM places outside it, e.g. the portaled tag picker. */
function buildPortaledSurface(ownerRowId: string): HTMLElement {
    const portal = document.createElement("div");
    portal.setAttribute("data-owned-by-row", ownerRowId);
    const control = document.createElement("input");
    portal.appendChild(control);
    document.body.appendChild(portal);
    return control;
}

function focusStillInRow(active: Element | null, row: Element, rowId: string): boolean {
    return isFocusStillInRow({
        active,
        row,
        rowId,
        ownerRowId: (element) =>
            element.closest("[data-owned-by-row]")?.getAttribute("data-owned-by-row") ?? null
    });
}

describe("the row-blur predicate reads focus STATE, not focus events", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("counts focus inside the row as still in the row", () => {
        const { row, inner } = buildRow("tx-1");
        expect(focusStillInRow(inner, row, "tx-1")).toBe(true);
    });

    // The case revision 04 missed entirely. Pressing Enter in a cell calls blur(), tabbing off the
    // document and clicking non-focusable chrome all land here: focus goes to <body>, which fires
    // `focusout` and NO `focusin`. A listener watching only `focusin` never learns the row is gone.
    it("treats a blur to body as having LEFT the row", () => {
        const { row } = buildRow("tx-1");
        expect(focusStillInRow(document.body, row, "tx-1")).toBe(false);
    });

    // `document.activeElement` is null before first paint; nothing is focused, so no row holds it.
    it("treats a null activeElement as having left the row", () => {
        const { row } = buildRow("tx-1");
        expect(focusStillInRow(null, row, "tx-1")).toBe(false);
    });

    it("counts THIS row's portaled surface as still in the row", () => {
        const { row } = buildRow("tx-1");
        const picker = buildPortaledSurface("tx-1");
        expect(focusStillInRow(picker, row, "tx-1")).toBe(true);
    });

    // Review F-8: the marker used to be a bare boolean naming no row, so ANOTHER row's picker read
    // as "never left this one" and suppressed the apply.
    it("does NOT count another row's portaled surface as still in the row", () => {
        const { row } = buildRow("tx-1");
        const otherPicker = buildPortaledSurface("tx-2");
        expect(focusStillInRow(otherPicker, row, "tx-1")).toBe(false);
    });

    it("treats a missing row element as having left", () => {
        expect(
            isFocusStillInRow({
                active: document.body,
                row: null,
                rowId: null,
                ownerRowId: () => null
            })
        ).toBe(false);
    });
});

/**
 * F-11: the decision must be made from LIVE focus state, not a remembered flag.
 *
 * Revision 05 latched "focus was seen outside" and read that latch as the frozen condition. Moving
 * the observer to mount-on-`isPending` — necessary, so the blur could be seen at all — widened the
 * window enough for the latch to be set DURING the edit. The apply then fired on the `isEditing`
 * transition, with the row focused again, writing a rule the user never authorised.
 *
 * These drive the SHIPPED predicate rather than a restatement of it. Revision 05's unit cases
 * defined their own local `watches`/`paints` and imported nothing from the component, so the fix
 * they existed to pin could be reverted with the suite green (review F-12). A test that cannot fail
 * when the product changes is not coverage.
 */
describe("F-11 — a remembered observation is not the frozen condition", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    // The exact sequence the reviewer measured: focus leaves while the picker is still open, then
    // the user returns to the row and the edit surface closes.
    it("focus returning to the row makes the live read say 'still here' again", () => {
        const { row, inner } = buildRow("tx-1");

        // Step 3: focus leaves the row while the edit is still in progress.
        expect(focusStillInRow(document.body, row, "tx-1")).toBe(false);

        // Step 5: the user is back in the row when the edit surface closes. A latch set at step 3
        // still reads "left"; the live read does not, and the live read is what now decides.
        expect(focusStillInRow(inner, row, "tx-1")).toBe(true);
    });

    // The write direction that matters: a stale "outside" observation must never be sufficient.
    it("distinguishes a past observation from the present state", () => {
        const { row, inner } = buildRow("tx-1");
        const observedOutsideEarlier = !focusStillInRow(document.body, row, "tx-1");
        expect(observedOutsideEarlier).toBe(true);

        // Same flag, different present. Applying on the flag alone would write here.
        expect(focusStillInRow(inner, row, "tx-1")).toBe(true);
    });
});
