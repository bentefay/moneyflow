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
import { useEffect, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { applyModeIsAutomatic } from "@/lib/domain/automation/apply-mode";

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
 * The shipped auto-apply rule, reproduced exactly: an "Updating…" mode applies only once the cell
 * has finished editing AND focus has genuinely left the row.
 */
function AutoApplyHost({
    applyMode,
    onApply
}: {
    readonly applyMode: "updatingAll" | "updateNew";
    readonly onApply: () => void;
}): React.JSX.Element {
    const [isEditing, setIsEditing] = useState(true);
    const [rowLostFocus, setRowLostFocus] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFocusIn = (event: Event): void => {
            const row = anchorRef.current?.closest('[data-testid="transaction-row"]');
            if (row == null) return;
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (row.contains(target)) return;
            if (target instanceof Element && target.closest("[data-owned-by-row]") != null) return;
            setRowLostFocus(true);
        };
        document.addEventListener("focusin", handleFocusIn);
        return () => document.removeEventListener("focusin", handleFocusIn);
    }, []);

    useEffect(() => {
        if (isEditing || !applyModeIsAutomatic(applyMode) || !rowLostFocus) return;
        onApply();
    }, [applyMode, isEditing, onApply, rowLostFocus]);

    return (
        <div data-testid="transaction-row">
            <div ref={anchorRef}>
                <button
                    data-testid="stop-editing"
                    onClick={() => setIsEditing(false)}
                    type="button"
                >
                    finish edit
                </button>
                <button data-testid="sibling" type="button">
                    other cell
                </button>
            </div>
        </div>
    );
}

/**
 * A surface this row owns but which is PORTALED outside it — the tag dropdown and the proposal
 * popover both are. Focus landing here means the user is still editing this row.
 */
function PortaledRowSurface(): React.JSX.Element {
    return (
        <div data-owned-by-row="true">
            <input data-testid="portaled-input" />
        </div>
    );
}

/** Somewhere genuinely outside the row, e.g. the page search box. */
function OutsideTarget(): React.JSX.Element {
    return <input data-testid="outside-input" />;
}

describe("F-2 — an Updating mode must not apply without the row losing focus", () => {
    it("does NOT write when the cell merely stops editing", () => {
        const onApply = vi.fn();
        render(<AutoApplyHost applyMode="updatingAll" onApply={onApply} />);

        // This is exactly the revision 01 sequence: isEditing true -> false, no blur. It wrote a
        // rule and rewrote every matching transaction.
        fireEvent.click(screen.getByTestId("stop-editing"));

        expect(onApply).not.toHaveBeenCalled();
    });

    it("does NOT write when focus moves to another cell in the SAME row", () => {
        const onApply = vi.fn();
        render(<AutoApplyHost applyMode="updatingAll" onApply={onApply} />);
        fireEvent.click(screen.getByTestId("stop-editing"));

        fireEvent.focusIn(screen.getByTestId("sibling"));

        // The user is still working in this row, so the frozen gesture has not happened.
        expect(onApply).not.toHaveBeenCalled();
    });

    // The case a row-scoped focus listener gets WRONG. This row's tag dropdown is portaled to
    // document.body, so by DOM containment it is "outside the row" — but the user is plainly still
    // editing. Treating it as a row blur would fire an Updating apply with the picker still open,
    // which is the original defect wearing a different hat.
    it("does NOT write when focus moves into a PORTALED surface this row owns", () => {
        const onApply = vi.fn();
        render(
            <>
                <AutoApplyHost applyMode="updatingAll" onApply={onApply} />
                <PortaledRowSurface />
            </>
        );
        fireEvent.click(screen.getByTestId("stop-editing"));

        fireEvent.focusIn(screen.getByTestId("portaled-input"));

        expect(onApply).not.toHaveBeenCalled();
    });

    it("DOES write once focus genuinely leaves the row", () => {
        const onApply = vi.fn();
        render(
            <>
                <AutoApplyHost applyMode="updatingAll" onApply={onApply} />
                <OutsideTarget />
            </>
        );
        fireEvent.click(screen.getByTestId("stop-editing"));

        fireEvent.focusIn(screen.getByTestId("outside-input"));

        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it("never auto-writes under a manual Update mode, even on a real blur", () => {
        const onApply = vi.fn();
        render(
            <>
                <AutoApplyHost applyMode="updateNew" onApply={onApply} />
                <OutsideTarget />
            </>
        );
        fireEvent.click(screen.getByTestId("stop-editing"));

        fireEvent.focusIn(screen.getByTestId("outside-input"));

        // "Update…" requires the tick; blur alone must never write.
        expect(onApply).not.toHaveBeenCalled();
    });
});
