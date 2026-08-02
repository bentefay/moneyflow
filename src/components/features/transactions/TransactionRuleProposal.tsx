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

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { type Temporal } from "temporal-polyfill";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { applyModeIsAutomatic } from "@/lib/domain/automation/apply-mode";
import { type RuleMatchSubject } from "@/lib/domain/automation/rules";

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
    return (
        <Popover open={props.isPending}>
            <PopoverAnchor asChild>
                <div className={props.anchorClassName} ref={anchorRef} style={props.anchorStyle}>
                    {props.children}
                </div>
            </PopoverAnchor>
            {props.isPending ? <PendingRuleProposal {...props} anchorRef={anchorRef} /> : null}
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
    }
): React.JSX.Element | null {
    const { subject, current, referenceDate, isEditing, onDismiss, anchorRef } = props;
    const workflow = useFieldRuleProposal({ subject, current, referenceDate });
    const idPrefix = useId();

    // Apply the CURRENT draft exactly once. A ref (not state) holds the guard so the handler never
    // re-runs from its own re-render, and it is the sole writer of that flag.
    const appliedRef = useRef(false);

    // Whether focus has genuinely left the row since this proposal opened.
    //
    // This is the frozen `:263-266` gesture — "when the row loses focus" — and it is deliberately
    // NOT derived from `isEditing`. A cell can stop reporting itself as edited while the caret is
    // still in the row (a tag dropdown closing is exactly that), and in revision 01 that alone
    // triggered an "Updating…" apply, writing a rule and rewriting other transactions before the
    // user had even seen the controls. Only a real `focusout` that lands outside the row counts.
    const [rowLostFocus, setRowLostFocus] = useState(false);

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

    // Watch for focus genuinely leaving the row. `focusout` bubbles, and `relatedTarget` is where
    // focus went — inside the row (another cell, the popover) means the user is still working here,
    // so it does not count. The listener lives on the row element rather than the cell precisely
    // because the frozen text says "the ROW loses focus".
    useEffect(() => {
        const row = anchorRef.current?.closest('[data-testid="transaction-row"]');
        if (row == null) return;
        const handleFocusOut = (event: Event): void => {
            // `focusout` is a FocusEvent, but addEventListener types the callback as Event; narrow
            // with a guard rather than a cast so `relatedTarget` is read type-safely.
            const next = event instanceof FocusEvent ? event.relatedTarget : null;
            if (next instanceof Node && row.contains(next)) return;
            setRowLostFocus(true);
        };
        row.addEventListener("focusout", handleFocusOut);
        return () => row.removeEventListener("focusout", handleFocusOut);
    }, [anchorRef]);

    // Frozen `:263-266`: the "Updating…" modes apply automatically once the row loses focus; the
    // "Update…" modes wait for the tick. Both conditions are required — the cell must have finished
    // editing AND focus must have left the row — so a dropdown merely closing can never write a rule.
    const isAutomatic = draft != null && applyModeIsAutomatic(draft.applyMode);
    useEffect(() => {
        if (!open || isEditing || !isAutomatic || !rowLostFocus) return;
        confirm();
    }, [confirm, isAutomatic, isEditing, open, rowLostFocus]);

    if (!open || draft == null) return null;

    return (
        <PopoverContent
            align="start"
            className="w-auto max-w-[90vw] p-3"
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
