"use client";

import { useCallback, useId, useLayoutEffect, useMemo, useRef } from "react";
import type { Temporal } from "temporal-polyfill";

import { applyModeIsAutomatic } from "@/lib/domain/automation/apply-mode";
import type { RuleField, RuleMatchSubject } from "@/lib/domain/automation/rules";

import { formatAmountForRuleLabel } from "./field-rule-proposal-state";
import type { RobotCurrentValue } from "./field-rule-robot-state";
import { FieldRuleProposal } from "./FieldRuleProposal";
import {
    transactionAutomationOwnerEquals,
    useTransactionGridControllerSnapshot,
    type TransactionAutomationOwner,
    type TransactionGridWorkspaceController
} from "./hooks/useTransactionGridController";
import type { TransactionId, TransactionInspectorBindingRegistration } from "./table-model";
import { TransactionRulePopup } from "./TransactionRulePopup";
import { useFieldRuleProposal, type FieldRuleProposalPersistence } from "./use-field-rule-proposal";
import { useTransactionRuleWorkflow } from "./use-transaction-rule-workflow";

const FIELD_LABELS: Readonly<Record<RuleField, string>> = {
    descriptionAlias: "Description",
    tags: "Tags",
    allocation: "Person percentages"
};

export interface TransactionInspectorAutomationContext {
    readonly subject: RuleMatchSubject;
    readonly referenceDate: Temporal.PlainDate;
    readonly accountLabel: string;
    readonly currents: readonly RobotCurrentValue[];
}

export interface TransactionInspectorAutomationProps {
    readonly controller: TransactionGridWorkspaceController;
    readonly transactionId: TransactionId;
    readonly context: TransactionInspectorAutomationContext;
}

function InspectorPendingProposal(props: {
    readonly controller: TransactionGridWorkspaceController;
    readonly owner: TransactionAutomationOwner;
    readonly current: RobotCurrentValue;
    readonly context: TransactionInspectorAutomationContext;
    readonly focusFieldHeading: () => void;
    readonly registerPortal: (element: HTMLDivElement | null) => void | (() => void);
}): React.JSX.Element | null {
    const snapshot = useTransactionGridControllerSnapshot(props.controller);
    const persisted = snapshot.automation.proposal;
    const idPrefix = useId();
    const persistence: FieldRuleProposalPersistence = {
        draftOverride:
            persisted != null && transactionAutomationOwnerEquals(persisted.owner, props.owner)
                ? persisted.draftOverride
                : null,
        errorOverride:
            persisted != null && transactionAutomationOwnerEquals(persisted.owner, props.owner)
                ? persisted.errorOverride
                : null,
        setDraftOverride: (override) => {
            props.controller.setAutomationProposalDraft(props.owner, override);
        },
        setErrorOverride: (override) => {
            props.controller.setAutomationProposalErrors(props.owner, override);
        }
    };
    const workflow = useFieldRuleProposal({
        current: props.current,
        persistence,
        referenceDate: props.context.referenceDate,
        subject: props.context.subject,
        transactionId: props.owner.transactionId
    });
    const dismiss = useCallback(() => {
        props.controller.dismissAutomationProposal(props.owner);
    }, [props.controller, props.owner]);
    const dismissFromControl = useCallback(() => {
        props.focusFieldHeading();
        dismiss();
    }, [dismiss, props]);
    const confirm = useCallback(() => {
        if (!workflow.apply()) return;
        props.focusFieldHeading();
        dismiss();
    }, [dismiss, props, workflow]);
    const ownsPersistedProposal =
        persisted != null && transactionAutomationOwnerEquals(persisted.owner, props.owner);
    const proposalIsRenderable = workflow.proposal.kind !== "none" && workflow.draft != null;

    useLayoutEffect(() => {
        if (!ownsPersistedProposal) return;
        if (!proposalIsRenderable) {
            dismiss();
            return;
        }
        props.controller.setAutomationProposalRenderable(props.owner, true);
    }, [dismiss, ownsPersistedProposal, proposalIsRenderable, props.controller, props.owner]);

    useLayoutEffect(() => {
        if (!ownsPersistedProposal || !proposalIsRenderable) return;
        return props.controller.registerAutomationFinalizer(props.owner, () => {
            if (
                workflow.draft != null &&
                applyModeIsAutomatic(workflow.draft.applyMode) &&
                workflow.apply()
            ) {
                dismiss();
            }
        });
    }, [
        dismiss,
        ownsPersistedProposal,
        proposalIsRenderable,
        props.controller,
        props.owner,
        workflow
    ]);

    if (!ownsPersistedProposal || !proposalIsRenderable) return null;

    return (
        <div className="border-border bg-muted/30 rounded-md border p-3">
            <FieldRuleProposal
                accountLabel={props.context.accountLabel}
                amountLabel={formatAmountForRuleLabel(
                    props.context.subject.amount,
                    workflow.currencyCode
                )}
                draft={workflow.draft}
                errors={workflow.errors}
                field={workflow.proposal.field}
                idPrefix={idPrefix}
                kind={workflow.proposal.kind}
                onConfirm={confirm}
                onDismiss={dismissFromControl}
                onDraftChange={workflow.setDraft}
                registerPortal={props.registerPortal}
                rowId={props.owner.transactionId}
            />
        </div>
    );
}

function InspectorExistingRule(props: {
    readonly current: RobotCurrentValue;
    readonly context: TransactionInspectorAutomationContext;
    readonly focusFieldHeading: () => void;
    readonly registerPortal: (element: HTMLDivElement | null) => void | (() => void);
    readonly transactionId: TransactionId;
}): React.JSX.Element | null {
    const idPrefix = useId();
    const workflow = useTransactionRuleWorkflow({
        current: props.current,
        referenceDate: props.context.referenceDate,
        subject: props.context.subject,
        transactionId: props.transactionId
    });
    const state = workflow.robotState;
    const applyThis = useCallback(() => {
        props.focusFieldHeading();
        workflow.applyThis();
    }, [props, workflow]);
    const remove = useCallback(() => {
        if (state.kind === "none") return;
        props.focusFieldHeading();
        workflow.remove(state.rule.id);
    }, [props, state, workflow]);
    if (state.kind === "none" || workflow.draft == null) return null;

    return (
        <div
            className="border-border rounded-md border p-3"
            data-testid={`${props.current.field}-rule-inspector`}
        >
            <TransactionRulePopup
                accounts={workflow.accounts}
                aliases={workflow.aliases}
                className="space-y-3"
                currencyCode={workflow.currencyCode}
                draft={workflow.draft}
                errors={workflow.errors}
                idPrefix={idPrefix}
                isDrift={state.kind === "drift"}
                onApplyAll={() => workflow.applyAll()}
                onApplyNew={() => workflow.applyNew()}
                onApplyThis={applyThis}
                onDelete={remove}
                onDraftChange={workflow.setDraft}
                onSave={() => workflow.save(state.rule.id)}
                people={workflow.people}
                registerPortal={props.registerPortal}
                tags={workflow.tags}
            />
        </div>
    );
}

function InspectorAutomationField(props: {
    readonly controller: TransactionGridWorkspaceController;
    readonly current: RobotCurrentValue;
    readonly context: TransactionInspectorAutomationContext;
    readonly transactionId: TransactionId;
}): React.JSX.Element {
    const fieldHeading = useRef<HTMLHeadingElement>(null);
    const owner = { field: props.current.field, transactionId: props.transactionId };
    const registration = useMemo<TransactionInspectorBindingRegistration>(
        () => ({
            binding: { field: props.current.field, kind: "automation" },
            transactionOwner: props.transactionId
        }),
        [props.current.field, props.transactionId]
    );
    const registerControl = useCallback(
        (element: HTMLDivElement | null) => {
            if (element == null) return;
            return props.controller.registerInspectorControl(registration, element);
        },
        [props.controller, registration]
    );
    const registerPortal = useCallback(
        (element: HTMLDivElement | null) => {
            if (element == null) return;
            return props.controller.registerInspectorPortal(registration, element);
        },
        [props.controller, registration]
    );
    const focusFieldHeading = useCallback(() => {
        fieldHeading.current?.focus({ preventScroll: true });
    }, []);

    return (
        <div
            ref={registerControl}
            className="space-y-2"
            data-automation-field={props.current.field}
        >
            <h4
                ref={fieldHeading}
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                data-testid={`${props.current.field}-automation-title`}
                tabIndex={-1}
            >
                {FIELD_LABELS[props.current.field]}
            </h4>
            <InspectorPendingProposal
                context={props.context}
                controller={props.controller}
                current={props.current}
                focusFieldHeading={focusFieldHeading}
                owner={owner}
                registerPortal={registerPortal}
            />
            <InspectorExistingRule
                context={props.context}
                current={props.current}
                focusFieldHeading={focusFieldHeading}
                registerPortal={registerPortal}
                transactionId={props.transactionId}
            />
        </div>
    );
}

export function TransactionInspectorAutomation({
    context,
    controller,
    transactionId
}: TransactionInspectorAutomationProps): React.JSX.Element {
    return (
        <div className="space-y-4">
            {context.currents.map((current) => (
                <InspectorAutomationField
                    context={context}
                    controller={controller}
                    current={current}
                    key={`${transactionId}-${current.field}`}
                    transactionId={transactionId}
                />
            ))}
        </div>
    );
}
