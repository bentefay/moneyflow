"use client";

/**
 * Container for the inline rule-proposal controls (HS-007 / UR-009).
 *
 * Owns the three things the presentational {@link FieldRuleProposal} must not: the CRDT workflow, the
 * popover anchoring, and the frozen auto-apply-on-blur semantics.
 *
 * The frozen text (`:263-266`) splits the four modes by PREFIX, not by scope: "Updating…" means the
 * change "will apply automatically when the row loses focus", while "Update…" means "you have to
 * manually click the tick button". That distinction is enforced here, in one place, via the domain
 * predicate {@link applyModeIsAutomatic} — the same predicate the editor's tooltip describes — so the
 * behaviour and the explanation cannot diverge.
 *
 * Layout: the controls render inside a Radix popover portal anchored to the edited cell. Being
 * portaled, they are outside the table's grid entirely and cannot change any row or column size
 * (frozen `:252-253`); being anchored, they open beside the cell the user just edited (`:253-254`).
 * Focus is never stolen, so the row can lose focus normally — which is precisely the gesture the
 * "Updating…" modes key on.
 */

import { useCallback, useEffect, useId, useRef } from "react";
import { type Temporal } from "temporal-polyfill";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { applyModeIsAutomatic } from "@/lib/domain/automation/apply-mode";
import { type RuleMatchSubject } from "@/lib/domain/automation/rules";

import { isFocusStillInRow } from "./field-rule-proposal-state";
import { type RobotCurrentValue } from "./field-rule-robot-state";
import { FieldRuleProposal } from "./FieldRuleProposal";
import { useFieldRuleProposal } from "./use-field-rule-proposal";

export interface TransactionRuleProposalProps {
    readonly subject: RuleMatchSubject;
    /** The value the transaction now carries for the field the user just changed. */
    readonly current: RobotCurrentValue;
    readonly referenceDate: Temporal.PlainDate;
    /** Formatted amount for the "only if $x" label. */
    readonly amountLabel: string;
    readonly accountLabel: string;
    /**
     * True while the edited cell reports itself as being edited.
     *
     * This alone is NOT the frozen blur gesture. A cell can report `false` without the row ever
     * losing focus — e.g. a tag dropdown that has just closed while the caret is still in the row.
     * The auto-apply path therefore requires an actual `focusout` from the row as well.
     */
    readonly isEditing: boolean;
    /**
     * Whether THIS cell is the one whose change is currently being proposed.
     *
     * Passed as a prop rather than decided by the caller branching between two element types,
     * because branching would remount the cell and destroy the edit in progress.
     */
    readonly isPending: boolean;
    /**
     * The transaction id of the row this proposal belongs to.
     *
     * Stamped onto every portaled surface this row owns, so focus moving into ANOTHER row's picker
     * is not mistaken for focus that never left this one. A bare boolean marker named no row, so any
     * portaled surface read as "still here".
     */
    readonly rowId: string;
    /** Retract the proposal: the change was applied, dismissed, or superseded. */
    readonly onDismiss: () => void;
    /**
     * Layout classes for the anchor wrapper. The wrapper takes the place its content already
     * occupied in the cell, so anchoring adds no box of its own and the table keeps its geometry.
     */
    readonly anchorClassName?: string;
    /** Inline geometry the anchor layout needs, e.g. the allocation group's column span. */
    readonly anchorStyle?: React.CSSProperties;
    /** The edited cell's content, so the popover opens beside it rather than over the table. */
    readonly children: React.ReactNode;
}

/**
 * Always-mounted anchor for one rule-backed cell.
 *
 * This component renders the SAME element at this position whether or not the cell is the pending
 * edit, which is what keeps the cell it wraps from being remounted when a proposal opens. All the
 * CRDT-subscribing work lives in {@link PendingRuleProposal}, which mounts only for the one cell
 * that actually has a pending edit — so a table of any size carries exactly one set of rule
 * subscriptions, not one per row.
 */
export function TransactionRuleProposal(props: TransactionRuleProposalProps): React.JSX.Element {
    const anchorRef = useRef<HTMLDivElement>(null);

    // The proposal waits for the cell's own edit surface to close before appearing.
    //
    // Several cells edit through a surface that is portaled and positioned directly BELOW the cell —
    // the tag picker is `fixed`, `z-[9999]`, opened at the cell's bottom edge. That is the same space
    // this popover anchors into, so opening while the picker is up puts two overlapping layers over
    // the row: MEASURED as `overlap: true`, with the picker's search input sitting on the click point
    // of `proposal-apply-mode`, which made the four-mode select and the tick unreachable. Frozen
    // `:255-257` requires those controls to be operable, and `:252-253` forbids occlusion; a control
    // the user cannot click fails both.
    //
    // Deferring is the fix rather than a z-index or keyboard-precedence contest, because those
    // arbitrate a collision instead of avoiding it — and the collision is the defect.
    //
    // DEFER WHAT IS PAINTED; DO NOT DEFER WHAT IS OBSERVED. Revision 04 gated both on `shouldShow`,
    // and only the painting needed it. Tying the observer to the same condition meant the component
    // could not exist during the very blur it was waiting for — so the frozen `:263-266` trigger was
    // missed on three of the four ways a row loses focus. The two concerns are separated here:
    // `shouldShow` decides visibility, `isPending` decides whether we are watching.
    const shouldShow = props.isPending && !props.isEditing;

    return (
        <Popover open={shouldShow}>
            <PopoverAnchor asChild>
                <div className={props.anchorClassName} ref={anchorRef} style={props.anchorStyle}>
                    {props.children}
                </div>
            </PopoverAnchor>
            {props.isPending ? (
                <PendingRuleProposal {...props} anchorRef={anchorRef} showControls={shouldShow} />
            ) : null}
        </Popover>
    );
}

/**
 * The proposal itself, mounted only while this cell has a pending edit.
 *
 * Mounting/unmounting THIS is safe: it is a sibling of the anchor, not an ancestor of the cell, so
 * its lifecycle never touches the edited cell's DOM.
 */
function PendingRuleProposal(
    props: TransactionRuleProposalProps & {
        readonly anchorRef: React.RefObject<HTMLDivElement | null>;
        /**
         * Whether the controls should be PAINTED. This component mounts as soon as the cell has a
         * pending edit, so it is watching for the row blur from the moment the edit begins; the
         * popover itself still waits for the cell's edit surface to close, which is what keeps the
         * two surfaces from overlapping.
         */
        readonly showControls: boolean;
    }
): React.JSX.Element | null {
    const { subject, current, referenceDate, onDismiss, anchorRef } = props;
    const workflow = useFieldRuleProposal({ subject, current, referenceDate });
    const idPrefix = useId();

    // Apply the CURRENT draft exactly once. A ref (not state) holds the guard so the handler never
    // re-runs from its own re-render, and it is the sole writer of that flag.
    const appliedRef = useRef(false);

    const { apply } = workflow;
    const confirm = useCallback(() => {
        if (appliedRef.current) return;
        appliedRef.current = true;
        if (!apply()) {
            // Validation rejected the write, so nothing was created and the controls must stay open
            // for the user to correct the restriction.
            appliedRef.current = false;
            return;
        }
        onDismiss();
    }, [apply, onDismiss]);

    const { proposal, draft } = workflow;
    const open = proposal.kind !== "none" && draft != null;
    const isAutomatic = draft != null && applyModeIsAutomatic(draft.applyMode);

    // Watch for focus genuinely leaving the row, by reading focus STATE rather than tracking events.
    //
    // Revision 04 listened for `focusin` alone and missed three of the four ways a row loses focus:
    // pressing Enter in a cell, tabbing off the document, and clicking non-focusable page chrome all
    // blur to `<body>`, which fires `focusout` and NO `focusin`. The frozen text's own worked example
    // (`:249-251`, applying a description alias) is one of the missed cases — the alias input calls
    // `blur()` on Enter, so the commit and the blur are the same event.
    //
    // Reading `document.activeElement` also removes a mount-ordering hazard the deferral introduced:
    // this component mounts only once the cell's edit surface has closed, so an event listener can be
    // armed AFTER the transition it is waiting for. A state read answers correctly whenever it runs,
    // including immediately on mount.
    //
    // `focusout` is the event that always accompanies a blur, but at its dispatch the next focus has
    // not landed yet, so the check is deferred a task. `focusin` is kept for the case where focus
    // moves straight into another control without an intervening idle state.
    // Read live focus state. Called both from the listeners and again at apply time, so the decision
    // is never made from a remembered value.
    const isRowFocusLost = useCallback((): boolean => {
        const row = anchorRef.current?.closest('[data-testid="transaction-row"]');
        return !isFocusStillInRow({
            active: document.activeElement,
            row: row ?? null,
            rowId: row?.getAttribute("data-transaction-id") ?? null,
            ownerRowId: (element: Element) =>
                element.closest("[data-owned-by-row]")?.getAttribute("data-owned-by-row") ?? null
        });
    }, [anchorRef]);

    // Decide the frozen `:263-266` gesture at ONE instant.
    //
    // Revision 06 split this into a flag set by the listener and a re-read at apply time, and MEASURED
    // they are never true together: at the first evaluation focus is genuinely outside but the flag
    // has not been set yet (it is set inside the deferred callback), and by the time the flag lands
    // focus has moved on and the live read says "still in the row". Two conditions that are satisfied
    // at different moments cannot gate one action. The result was silent inaction on every gesture —
    // the same direction as F-7, reintroduced by the fix for F-11.
    //
    // So the whole decision happens inside the deferred read, where focus state and edit state are
    // both current. There is no remembered value to go stale and no second gate to miss.
    //
    // The read must be deferred: at `focusout` dispatch `document.activeElement` is already `<body>`
    // even when focus is heading to a focusable target, so an immediate read reports "left the row"
    // on every focus move. `focusin` is kept for moves with no idle state between, and one evaluation
    // runs on mount to catch a blur that happened before this component existed — revision 04 missed
    // three of the four blur gestures precisely because it could be armed after the event it awaited.
    const shouldAutoApply = props.isEditing !== true && isAutomatic && open;
    const shouldAutoApplyRef = useRef(shouldAutoApply);
    // A ref, not a dependency: the deferred callback must read the CURRENT value when it fires, not
    // the one captured when the listener was registered.
    useEffect(() => {
        shouldAutoApplyRef.current = shouldAutoApply;
    }, [shouldAutoApply]);

    useEffect(() => {
        const evaluateSoon = (): void => {
            window.setTimeout(() => {
                if (!shouldAutoApplyRef.current) return;
                if (!isRowFocusLost()) return;
                confirm();
            }, 0);
        };
        document.addEventListener("focusin", evaluateSoon);
        document.addEventListener("focusout", evaluateSoon);
        evaluateSoon();
        return () => {
            document.removeEventListener("focusin", evaluateSoon);
            document.removeEventListener("focusout", evaluateSoon);
        };
    }, [confirm, isRowFocusLost]);

    if (!open || draft == null || !props.showControls) return null;

    return (
        <PopoverContent
            align="start"
            className="w-auto max-w-[90vw] p-3"
            data-owned-by-row={props.rowId}
            data-testid="transaction-rule-proposal-popover"
            onOpenAutoFocus={(event) => event.preventDefault()}
            // Radix gives popover content `role="dialog"`, which would announce this as a modal the
            // user must deal with. The frozen text (`:252-254`) asks for the opposite: an UNFOCUSED
            // popup beside the cell that never interrupts the edit. The accessible grouping and
            // label live on the inner FieldRuleProposal, so this wrapper takes `presentation` rather
            // than adding a second nested group — and "is a dialog open" stays meaningful for the
            // rest of the app.
            role="presentation"
            side="bottom"
        >
            <FieldRuleProposal
                accountLabel={props.accountLabel}
                rowId={props.rowId}
                amountLabel={props.amountLabel}
                draft={draft}
                errors={workflow.errors}
                field={proposal.field}
                idPrefix={idPrefix}
                kind={proposal.kind}
                onConfirm={confirm}
                onDismiss={onDismiss}
                onDraftChange={workflow.setDraft}
            />
        </PopoverContent>
    );
}
