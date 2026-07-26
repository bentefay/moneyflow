"use client";

/**
 * Inline description-rule robot (HS-007 / P17C).
 *
 * A per-row affordance that surfaces the transaction's highest-precedence matching descriptionAlias
 * rule. The robot glyph is:
 *
 * - hidden when no rule matches, or while the description field is actively being edited;
 * - normal (muted) when the row's alias already matches the rule;
 * - red when the row has drifted from the rule (its alias differs from what the rule implies).
 *
 * Clicking it opens a contextual popup that mounts the shared editor to view/edit/delete the rule,
 * apply it to all / to newer transactions, or — on drift — reconcile just this transaction. The
 * popup is portaled and does not steal focus (`onOpenAutoFocus` is prevented), so it never resizes
 * the table or interrupts editing. All wiring lives in {@link useTransactionRuleWorkflow}.
 */

import { Bot } from "lucide-react";
import { useId, useState } from "react";
import { type Temporal } from "temporal-polyfill";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type RuleMatchSubject } from "@/lib/domain/automation/rules";
import { cn } from "@/lib/utils";

import { TransactionRulePopup } from "./TransactionRulePopup";
import { useTransactionRuleWorkflow } from "./use-transaction-rule-workflow";

export interface TransactionRuleRobotProps {
    readonly transactionId: string;
    readonly subject: RuleMatchSubject;
    readonly currentAliasId: string | null;
    /** This transaction's date; "apply to new imports" is scoped to strictly-newer rows. */
    readonly referenceDate: Temporal.PlainDate;
    /** True while the description field is focused; hides the robot to avoid clutter. */
    readonly isEditing: boolean;
    /** Request the popup open itself (e.g. right after an alias change created drift). */
    readonly autoOpen: boolean;
    readonly onAutoOpenHandled: () => void;
}

export function TransactionRuleRobot(props: TransactionRuleRobotProps): React.JSX.Element | null {
    const { transactionId, subject, currentAliasId, referenceDate, isEditing } = props;
    const workflow = useTransactionRuleWorkflow({
        transactionId,
        subject,
        currentAliasId,
        referenceDate
    });
    const [localOpen, setLocalOpen] = useState(false);
    const idPrefix = useId();

    const { robotState } = workflow;
    const isDrift = robotState.kind === "drift";

    // The popup opens either from a user click (`localOpen`) or from a caller request driven by a
    // recent alias change (`props.autoOpen`, kept set by the page until we close). Because the draft
    // is derived from the winning rule, opening needs no seeding effect — avoiding setState in an
    // effect entirely.
    const isOpen = localOpen || props.autoOpen;

    const handleOpenChange = (next: boolean): void => {
        setLocalOpen(next);
        if (!next) {
            workflow.resetDraft();
            if (props.autoOpen) props.onAutoOpenHandled();
        }
    };

    // Hidden while editing or when nothing matches. Hooks above always run.
    if (isEditing || robotState.kind === "none") return null;

    const label = isDrift
        ? "This transaction differs from its automation rule. Open rule."
        : "This transaction matches an automation rule. Open rule.";

    return (
        <Popover onOpenChange={handleOpenChange} open={isOpen}>
            <PopoverTrigger asChild>
                <button
                    aria-label={label}
                    className={cn(
                        "hover:bg-accent inline-flex size-6 shrink-0 items-center justify-center rounded-md",
                        isDrift ? "text-destructive" : "text-muted-foreground"
                    )}
                    data-drift={isDrift ? "true" : "false"}
                    data-testid="description-rule-robot"
                    onClick={(event) => event.stopPropagation()}
                    title={label}
                    type="button"
                >
                    <Bot aria-hidden="true" className="size-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-96 max-w-[90vw]"
                data-testid="transaction-rule-popover"
                onOpenAutoFocus={(event) => event.preventDefault()}
                side="bottom"
            >
                {workflow.draft != null ? (
                    <TransactionRulePopup
                        accounts={workflow.accounts}
                        aliases={workflow.aliases}
                        currencyCode={workflow.currencyCode}
                        draft={workflow.draft}
                        errors={workflow.errors}
                        idPrefix={idPrefix}
                        isDrift={isDrift}
                        onApplyAll={() => {
                            workflow.applyAll();
                            handleOpenChange(false);
                        }}
                        onApplyNew={() => {
                            workflow.applyNew();
                            handleOpenChange(false);
                        }}
                        onApplyThis={() => {
                            workflow.applyThis();
                            handleOpenChange(false);
                        }}
                        onDelete={() => {
                            workflow.remove(robotState.rule.id);
                            handleOpenChange(false);
                        }}
                        onDraftChange={workflow.setDraft}
                        onSave={() => {
                            if (workflow.save(robotState.rule.id)) handleOpenChange(false);
                        }}
                        people={workflow.people}
                        tags={workflow.tags}
                    />
                ) : null}
            </PopoverContent>
        </Popover>
    );
}
