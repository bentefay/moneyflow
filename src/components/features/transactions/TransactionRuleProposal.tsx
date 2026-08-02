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
    /** True while the edited cell still holds focus; going false triggers the "Updating…" modes. */
    readonly isEditing: boolean;
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

export function TransactionRuleProposal(props: TransactionRuleProposalProps): React.JSX.Element {
    const { subject, current, referenceDate, isEditing, onDismiss } = props;
    const workflow = useFieldRuleProposal({ subject, current, referenceDate });
    const idPrefix = useId();

    // Blur must apply the CURRENT draft exactly once. A ref (not state) holds the guard so the
    // handler never re-runs from its own re-render, and it is the sole writer of that flag.
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

    // Frozen `:263-266`: the "Updating…" modes apply automatically once the edited row loses focus;
    // the "Update…" modes wait for the tick. `isEditing` going false IS that blur, so this effect
    // fires exactly on the transition and does nothing while the user is still in the cell.
    const isAutomatic = draft != null && applyModeIsAutomatic(draft.applyMode);
    useEffect(() => {
        if (!open || isEditing || !isAutomatic) return;
        confirm();
    }, [confirm, isAutomatic, isEditing, open]);

    // The anchor wrapper and the children render IDENTICALLY whether or not the proposal is open, so
    // opening it never remounts the edited cell — the caret and any in-progress edit survive.
    return (
        <Popover open={open}>
            <PopoverAnchor asChild>
                <div className={props.anchorClassName} style={props.anchorStyle}>
                    {props.children}
                </div>
            </PopoverAnchor>
            {open && draft != null ? (
                <PopoverContent
                    align="start"
                    className="w-auto max-w-[90vw] p-3"
                    data-testid="transaction-rule-proposal-popover"
                    onOpenAutoFocus={(event) => event.preventDefault()}
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
            ) : null}
        </Popover>
    );
}
