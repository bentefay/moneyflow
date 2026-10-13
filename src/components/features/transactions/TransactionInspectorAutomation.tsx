"use client";

/**
 * The inspector's Automation section: one shared {@link RuleEditor} card per rule that wins a field
 * on the active row, most specific first, plus the pending proposal card when the user has just
 * changed a field.
 *
 * The proposal card folds in the rule it would extend, so that rule is never shown twice. Every card
 * registers with the grid controller under its own binding, and the section heading is a registered
 * control too: each handler that can unmount the focused card moves focus to the heading first, so
 * focus never falls to the document and the controller never mistakes a click for leaving the
 * inspector.
 */

import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Temporal } from "temporal-polyfill";

import { useActiveFieldRules } from "@/lib/crdt";
import type { RuleExtensionTarget } from "@/lib/domain/automation/extension";
import {
    type FieldRule,
    type RuleField,
    type RuleMatchSubject,
    ruleOutputFields
} from "@/lib/domain/automation/rules";
import { assertNever } from "@/lib/utils/exhaustive";

import {
    currentValueLabel,
    draftFromRule,
    draftOutputsFromRule,
    formatAmountForRuleLabel,
    outputValueSummary,
    pickDraftOutput,
    ruleConditionsLabel,
    type RuleEditorOption,
    type RuleEditorOptions,
    ruleOutputsLabel,
    ruleOutputsSummary
} from "../automations/rule-editor-data";
import {
    draftRuleContentEquals,
    type RuleEditorDraft,
    unsavedOutputField,
    validateRuleDraft
} from "../automations/rule-editor-model";
import {
    RuleEditor,
    type RuleEditorDivergence,
    type RuleEditorResolution,
    type RuleEditorSplitPreview,
    type RuleEditorTitle,
    type RuleEditorTransaction
} from "../automations/RuleEditor";
import {
    type RulePopulationCandidate,
    useRulePopulationCount
} from "../automations/use-rule-population-count";
import { proposalPredicate } from "./field-rule-proposal-state";
import {
    computeRuleCardStates,
    type RobotCurrentValue,
    type RuleCardState
} from "./field-rule-robot-state";
import {
    useTransactionGridControllerSnapshot,
    type TransactionAutomationOwner,
    type TransactionGridWorkspaceController
} from "./hooks/useTransactionGridController";
import type {
    TransactionId,
    TransactionInspectorBindingRegistration,
    TransactionInspectorControlBinding
} from "./table-model";
import {
    type FieldRuleProposalPersistence,
    type FieldRuleProposalWorkflow,
    type RuleProposalResolution,
    useFieldRuleProposal
} from "./use-field-rule-proposal";
import { useTransactionRuleWorkflow } from "./use-transaction-rule-workflow";

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

const HEADING_BINDING: TransactionInspectorControlBinding = {
    action: "automation",
    kind: "action"
};

/** Stands in for a field value when no proposal is pending: an empty tag set proposes nothing. */
const NO_PROPOSAL_CURRENT: RobotCurrentValue = { currentTagIds: [], field: "tags" };

const NO_EXCLUDED_RULES: readonly string[] = [];

/** The proposal card's test id per field, unchanged from the per-field proposal it replaced. */
const PROPOSAL_TEST_IDS: Readonly<Record<RuleField, string>> = {
    descriptionAlias: "description-rule-proposal",
    tags: "tags-rule-proposal",
    allocation: "allocation-rule-proposal"
};

type RegisterElement = (element: HTMLDivElement | null) => void | (() => void);

/** Register an element, and its portaled popups, as one inspector control under `binding`. */
function useInspectorRegistration(
    controller: TransactionGridWorkspaceController,
    transactionId: TransactionId,
    binding: TransactionInspectorControlBinding
): { readonly registerControl: RegisterElement; readonly registerPortal: RegisterElement } {
    const registration = useMemo<TransactionInspectorBindingRegistration>(
        () => ({ binding, transactionOwner: transactionId }),
        [binding, transactionId]
    );
    const registerControl = useCallback(
        (element: HTMLDivElement | null) => {
            if (element == null) return;
            return controller.registerInspectorControl(registration, element);
        },
        [controller, registration]
    );
    const registerPortal = useCallback(
        (element: HTMLDivElement | null) => {
            if (element == null) return;
            return controller.registerInspectorPortal(registration, element);
        },
        [controller, registration]
    );
    return { registerControl, registerPortal };
}

function transactionConditions(
    context: TransactionInspectorAutomationContext,
    currencyCode: string
): RuleEditorTransaction {
    return {
        accountId: context.subject.accountId,
        accountLabel: context.accountLabel,
        amount: context.subject.amount,
        amountLabel: formatAmountForRuleLabel(context.subject.amount, currencyCode)
    };
}

/**
 * A note when a rule's stored conditions differ from the row. A winning rule matches the row, so this
 * only fires if a rule is shown for a row it does not match; it keeps the card honest if that changes.
 */
function storedConditionsNote(
    rule: FieldRule,
    context: TransactionInspectorAutomationContext,
    currencyCode: string
): string | undefined {
    const differences = [
        ...(rule.accountId != null && rule.accountId !== context.subject.accountId
            ? [`this transaction is on ${context.accountLabel}`]
            : []),
        ...(rule.amount != null && rule.amount !== context.subject.amount
            ? [
                  `this transaction is ${formatAmountForRuleLabel(context.subject.amount, currencyCode)}`
              ]
            : [])
    ];
    return differences.length === 0
        ? undefined
        : `Stored conditions shown; ${differences.join(", ")}.`;
}

// ============================================================================
// Rule cards
// ============================================================================

function InspectorRuleCard(props: {
    readonly controller: TransactionGridWorkspaceController;
    readonly transactionId: TransactionId;
    readonly context: TransactionInspectorAutomationContext;
    readonly state: RuleCardState;
    readonly focusHeading: () => void;
}): React.JSX.Element {
    const { controller, transactionId, context, state, focusHeading } = props;
    const { rule } = state;
    const idPrefix = useId();
    const binding = useMemo<TransactionInspectorControlBinding>(
        () => ({ kind: "automation-rule", ruleId: rule.id }),
        [rule.id]
    );
    const { registerControl, registerPortal } = useInspectorRegistration(
        controller,
        transactionId,
        binding
    );
    const workflow = useTransactionRuleWorkflow({
        transactionId,
        rule,
        accountId: context.subject.accountId,
        referenceDate: context.referenceDate
    });
    const { options, currencyCode, remembered } = workflow;
    const [splitField, setSplitField] = useState<RuleField | null>(null);

    // Split rewrites the stored rule, so it is offered only while the draft still IS that rule; an
    // output added but not saved is pending instead. Same gate as the Automations page.
    const storedDraft = useMemo(
        () => draftFromRule(rule, currencyCode, remembered),
        [currencyCode, remembered, rule]
    );
    const splittable =
        ruleOutputFields(rule).length > 1 && draftRuleContentEquals(workflow.draft, storedDraft);
    const pendingField = unsavedOutputField(workflow.draft, storedDraft.outputs);

    const divergence = useMemo(() => {
        const stored = draftOutputsFromRule(rule);
        const entries: Partial<Record<RuleField, RuleEditorDivergence>> = {};
        for (const current of context.currents) {
            if (!state.driftFields.includes(current.field)) continue;
            entries[current.field] = {
                ruleValue: outputValueSummary(current.field, stored, options),
                rowValue: currentValueLabel(current, options)
            };
        }
        return entries;
    }, [context.currents, options, rule, state.driftFields]);
    const title = useMemo<RuleEditorTitle>(
        () => ({
            kind: "rule",
            conditions: ruleConditionsLabel(rule, options.accounts, currencyCode)
        }),
        [currencyCode, options.accounts, rule]
    );
    const transaction = useMemo(
        () => transactionConditions(context, currencyCode),
        [context, currencyCode]
    );

    const save = useCallback(() => {
        if (!workflow.save()) return;
        focusHeading();
    }, [focusHeading, workflow]);
    const cancel = useCallback(() => {
        focusHeading();
        setSplitField(null);
        workflow.resetDraft();
    }, [focusHeading, workflow]);
    const remove = useCallback(() => {
        focusHeading();
        workflow.remove();
    }, [focusHeading, workflow]);
    // Apply-this is whole-row: one click applies every winning rule, resolving drift on every card.
    const applyThis = useCallback(() => {
        focusHeading();
        workflow.applyThis();
    }, [focusHeading, workflow]);
    const splitPreview = useMemo<RuleEditorSplitPreview | undefined>(
        () =>
            splitField == null || !splittable
                ? undefined
                : {
                      field: splitField,
                      onConfirm: () => {
                          focusHeading();
                          setSplitField(null);
                          workflow.split(splitField);
                      },
                      // Back unmounts the focused button, so focus moves to the heading first.
                      onCancel: () => {
                          focusHeading();
                          setSplitField(null);
                      }
                  },
        [focusHeading, splitField, splittable, workflow]
    );

    return (
        <div
            ref={registerControl}
            className="border-border rounded-md border p-3"
            data-automation-field={ruleOutputFields(rule).join(" ")}
            data-testid={`rule-inspector-${rule.id}`}
        >
            <RuleEditor
                accounts={options.accounts}
                aliases={options.aliases}
                canSplit={splittable}
                context="transaction"
                currencyCode={currencyCode}
                divergence={divergence}
                draft={workflow.draft}
                errors={workflow.errors}
                idPrefix={idPrefix}
                mode="edit"
                onAddOutput={workflow.addOutput}
                onApply={save}
                onApplyThis={applyThis}
                onCancel={cancel}
                onDelete={remove}
                onDraftChange={workflow.setDraft}
                onSplit={setSplitField}
                pendingField={pendingField}
                people={options.people}
                populationCount={workflow.populationCount}
                referenceDate={context.referenceDate}
                registerPortal={registerPortal}
                splitPreview={splitPreview}
                storedConditionsNote={storedConditionsNote(rule, context, currencyCode)}
                tags={options.tags}
                title={title}
                transaction={transaction}
            />
        </div>
    );
}

// ============================================================================
// Proposal card
// ============================================================================

/** The rule Apply would write the pending output into, for the target and the user's choice. */
function proposalTargetRule(
    target: RuleExtensionTarget,
    resolution: RuleProposalResolution | null
): FieldRule | null {
    switch (target.kind) {
        case "ineligible":
        case "create":
            return null;
        case "update-owner":
        case "extend":
            return target.rule;
        case "conflict":
            return resolution?.kind === "conflict" && resolution.choice === "move"
                ? target.host
                : target.owner;
        case "ambiguous":
            return resolution?.kind === "ambiguous"
                ? (target.candidates.find((rule) => rule.id === resolution.ruleId) ?? null)
                : null;
        default:
            return assertNever(target);
    }
}

/** Rules the proposal card stands in for while it is pending, so none is shown twice. */
function foldedRuleIds(
    target: RuleExtensionTarget | null,
    resolution: RuleProposalResolution | null
): readonly string[] {
    if (target == null) return NO_EXCLUDED_RULES;
    switch (target.kind) {
        case "ineligible":
        case "create":
            return NO_EXCLUDED_RULES;
        case "update-owner":
        case "extend":
            return [target.rule.id];
        case "conflict":
            return [target.owner.id, target.host.id];
        case "ambiguous":
            return resolution?.kind === "ambiguous" && resolution.ruleId != null
                ? [resolution.ruleId]
                : NO_EXCLUDED_RULES;
        default:
            return assertNever(target);
    }
}

/** The proposal card's `data-kind`, kept from the per-field proposal so specs can read the ladder. */
function proposalKind(target: RuleExtensionTarget): string {
    switch (target.kind) {
        case "update-owner":
            return "update";
        case "ineligible":
        case "create":
        case "extend":
        case "conflict":
        case "ambiguous":
            return target.kind;
        default:
            return assertNever(target);
    }
}

function editorResolution(
    target: RuleExtensionTarget,
    resolution: RuleProposalResolution | null,
    setResolution: FieldRuleProposalWorkflow["setResolution"],
    options: RuleEditorOptions
): RuleEditorResolution | undefined {
    const option = (rule: FieldRule): RuleEditorOption => ({
        id: rule.id,
        label: ruleOutputsLabel(rule)
    });
    if (target.kind === "conflict") {
        return {
            kind: "conflict",
            owner: option(target.owner),
            host: option(target.host),
            choice: resolution?.kind === "conflict" ? resolution.choice : "keep",
            onChoose: (choice) => setResolution({ kind: "conflict", choice }),
            ownerKeepsOutputs: ruleOutputFields(target.owner).length > 1
        };
    }
    if (target.kind === "ambiguous") {
        return {
            kind: "ambiguous",
            candidates: target.candidates.map((rule) => ({
                ...option(rule),
                summary: ruleOutputsSummary(rule, options)
            })),
            choice: resolution?.kind === "ambiguous" ? resolution.ruleId : null,
            onChoose: (ruleId) => setResolution({ kind: "ambiguous", ruleId })
        };
    }
    return undefined;
}

function InspectorProposalCard(props: {
    readonly controller: TransactionGridWorkspaceController;
    readonly owner: TransactionAutomationOwner;
    readonly context: TransactionInspectorAutomationContext;
    readonly workflow: FieldRuleProposalWorkflow;
    readonly draft: RuleEditorDraft;
    readonly target: RuleExtensionTarget;
    readonly descriptionText: string;
    readonly onConfirm: () => void;
    readonly onDismiss: () => void;
}): React.JSX.Element {
    const { controller, owner, context, workflow, draft, target, descriptionText } = props;
    const { field } = owner;
    const idPrefix = useId();
    const binding = useMemo<TransactionInspectorControlBinding>(
        () => ({ field, kind: "automation" }),
        [field]
    );
    const { registerControl, registerPortal } = useInspectorRegistration(
        controller,
        owner.transactionId,
        binding
    );
    const options = useMemo<RuleEditorOptions>(
        () => ({
            accounts: workflow.accounts,
            aliases: workflow.aliases,
            people: workflow.people,
            tags: workflow.tags
        }),
        [workflow.accounts, workflow.aliases, workflow.people, workflow.tags]
    );
    const { currencyCode, resolution } = workflow;
    const targetRule = proposalTargetRule(target, resolution);
    const { useAccountScope, useAmountScope } = draft;
    const predicate = useMemo(
        () =>
            proposalPredicate(
                descriptionText,
                { useAccountScope, useAmountScope },
                context.subject
            ),
        [context.subject, descriptionText, useAccountScope, useAmountScope]
    );

    // The card shows the target rule's other outputs beside the pending one, read-only: only the
    // pending output is written.
    const displayDraft = useMemo<RuleEditorDraft>(
        () =>
            targetRule == null
                ? draft
                : { ...draft, outputs: { ...draftOutputsFromRule(targetRule), ...draft.outputs } },
        [draft, targetRule]
    );
    // An update overwrites the target's stored value for the field; show it so the user sees what
    // Apply replaces. An extend adds a field the rule lacks, so there is nothing stored to show.
    const pendingStoredSummary =
        targetRule?.outputs[field] == null
            ? undefined
            : outputValueSummary(field, draftOutputsFromRule(targetRule), options);
    const setDraft = workflow.setDraft;
    const onDraftChange = useCallback(
        (next: RuleEditorDraft) =>
            setDraft({ ...next, outputs: pickDraftOutput(next.outputs, field) }),
        [field, setDraft]
    );

    const populationCandidate = useMemo<RulePopulationCandidate | null>(() => {
        if (!workflow.canApply) return null;
        const validation = validateRuleDraft(draft, currencyCode);
        if (!validation.ok) return null;
        return {
            id: targetRule?.id ?? `proposal-${owner.transactionId}`,
            descriptionText,
            write: {
                ...validation.value,
                outputs: { ...targetRule?.outputs, ...validation.value.outputs }
            }
        };
    }, [currencyCode, descriptionText, draft, owner.transactionId, targetRule, workflow.canApply]);
    const movedOwnerIds = useMemo(
        () =>
            target.kind === "conflict" &&
            resolution?.kind === "conflict" &&
            resolution.choice === "move"
                ? [target.owner.id]
                : NO_EXCLUDED_RULES,
        [resolution, target]
    );
    const populationCount = useRulePopulationCount({
        candidate: populationCandidate,
        scope: draft.scope,
        referenceDate: context.referenceDate,
        excludedRuleIds: movedOwnerIds
    });

    const title = useMemo<RuleEditorTitle>(
        () =>
            target.kind === "create"
                ? { kind: "new" }
                : {
                      kind: "extend",
                      field,
                      conditions: ruleConditionsLabel(predicate, options.accounts, currencyCode)
                  },
        [currencyCode, field, options.accounts, predicate, target.kind]
    );
    const transaction = useMemo(
        () => transactionConditions(context, currencyCode),
        [context, currencyCode]
    );
    const { setResolution } = workflow;
    const editorResolutionProps = useMemo(
        () => editorResolution(target, resolution, setResolution, options),
        [options, resolution, setResolution, target]
    );
    const noop = useCallback(() => {}, []);

    return (
        <div
            ref={registerControl}
            className="border-border bg-muted/30 rounded-md border p-3"
            data-automation-field={field}
            data-kind={proposalKind(target)}
            data-testid={PROPOSAL_TEST_IDS[field]}
        >
            <RuleEditor
                accounts={options.accounts}
                aliases={options.aliases}
                applyDisabled={!workflow.canApply}
                applyLabel={target.kind === "create" ? "Create and apply" : "Apply"}
                canSplit={false}
                context="transaction"
                currencyCode={currencyCode}
                draft={displayDraft}
                errors={workflow.errors}
                idPrefix={idPrefix}
                lockOtherOutputs
                mode={target.kind === "create" ? "create" : "edit"}
                onAddOutput={noop}
                onApply={props.onConfirm}
                onCancel={props.onDismiss}
                onDraftChange={onDraftChange}
                pendingField={field}
                pendingStoredSummary={pendingStoredSummary}
                people={options.people}
                populationCount={populationCount}
                referenceDate={context.referenceDate}
                registerPortal={registerPortal}
                resolution={editorResolutionProps}
                tags={options.tags}
                title={title}
                transaction={transaction}
            />
        </div>
    );
}

// ============================================================================
// Section
// ============================================================================

export function TransactionInspectorAutomation({
    context,
    controller,
    transactionId
}: TransactionInspectorAutomationProps): React.JSX.Element {
    const heading = useRef<HTMLHeadingElement | null>(null);
    const headingRegistration = useMemo<TransactionInspectorBindingRegistration>(
        () => ({ binding: HEADING_BINDING, transactionOwner: transactionId }),
        [transactionId]
    );
    const registerHeading = useCallback(
        (element: HTMLHeadingElement | null) => {
            heading.current = element;
            if (element == null) return;
            const unregister = controller.registerInspectorControl(headingRegistration, element);
            return () => {
                heading.current = null;
                unregister();
            };
        },
        [controller, headingRegistration]
    );
    const focusHeading = useCallback(() => {
        heading.current?.focus({ preventScroll: true });
    }, []);

    const snapshot = useTransactionGridControllerSnapshot(controller);
    const persisted = snapshot.automation.proposal;
    const owner =
        persisted != null && persisted.owner.transactionId === transactionId
            ? persisted.owner
            : null;
    const ownedCurrent =
        owner == null
            ? null
            : (context.currents.find((current) => current.field === owner.field) ?? null);
    const persistence = useMemo<FieldRuleProposalPersistence | undefined>(
        () =>
            owner == null
                ? undefined
                : {
                      draftOverride: persisted?.draftOverride ?? null,
                      errorOverride: persisted?.errorOverride ?? null,
                      setDraftOverride: (override) => {
                          controller.setAutomationProposalDraft(owner, override);
                      },
                      setErrorOverride: (override) => {
                          controller.setAutomationProposalErrors(owner, override);
                      }
                  },
        [controller, owner, persisted?.draftOverride, persisted?.errorOverride]
    );
    const workflow = useFieldRuleProposal({
        current: ownedCurrent ?? NO_PROPOSAL_CURRENT,
        persistence,
        referenceDate: context.referenceDate,
        subject: context.subject,
        transactionId
    });
    const { proposal, target, draft } = workflow;
    const renderable =
        owner != null &&
        ownedCurrent != null &&
        proposal.kind === "proposal" &&
        draft != null &&
        target != null &&
        target.kind !== "ineligible";

    const dismiss = useCallback(() => {
        if (owner != null) controller.dismissAutomationProposal(owner);
    }, [controller, owner]);
    const dismissFromControl = useCallback(() => {
        focusHeading();
        dismiss();
    }, [dismiss, focusHeading]);
    const applyProposal = workflow.apply;
    const confirm = useCallback(() => {
        // A refused write leaves the card mounted with its errors and focus where it was.
        if (!applyProposal()) return;
        focusHeading();
        dismiss();
    }, [applyProposal, dismiss, focusHeading]);

    useLayoutEffect(() => {
        if (owner == null) return;
        if (!renderable) {
            dismiss();
            return;
        }
        controller.setAutomationProposalRenderable(owner, true);
    }, [controller, dismiss, owner, renderable]);

    // Apply on blur: the controller runs this once when focus genuinely leaves the row. Only a target
    // the user need not choose for may write on its own; a conflict or ambiguous target waits for Apply.
    const finalizes =
        renderable &&
        draft.applyOnBlur &&
        (target.kind === "create" || target.kind === "update-owner" || target.kind === "extend");
    useLayoutEffect(() => {
        if (!finalizes || owner == null) return;
        return controller.registerAutomationFinalizer(owner, () => {
            if (applyProposal()) dismiss();
        });
    }, [applyProposal, controller, dismiss, finalizes, owner]);

    const rules = useActiveFieldRules();
    const cardStates = useMemo(
        () => computeRuleCardStates(rules, context.subject, context.currents),
        [context.currents, context.subject, rules]
    );
    const folded = renderable ? foldedRuleIds(target, workflow.resolution) : NO_EXCLUDED_RULES;
    const visibleCards = cardStates.filter((state) => !folded.includes(state.rule.id));

    return (
        <div className="space-y-3">
            <h3
                ref={registerHeading}
                className="text-sm font-medium outline-none"
                data-testid="transaction-inspector-automation-title"
                id="transaction-inspector-automation-title"
                tabIndex={-1}
            >
                Automation
            </h3>
            {renderable && owner != null ? (
                <InspectorProposalCard
                    context={context}
                    controller={controller}
                    descriptionText={proposal.descriptionText}
                    draft={draft}
                    key={`proposal-${owner.field}`}
                    onConfirm={confirm}
                    onDismiss={dismissFromControl}
                    owner={owner}
                    target={target}
                    workflow={workflow}
                />
            ) : null}
            {visibleCards.map((state) => (
                <InspectorRuleCard
                    context={context}
                    controller={controller}
                    focusHeading={focusHeading}
                    key={state.rule.id}
                    state={state}
                    transactionId={transactionId}
                />
            ))}
            {!renderable && visibleCards.length === 0 ? (
                <p
                    className="text-muted-foreground text-sm"
                    data-testid="transaction-automation-empty"
                >
                    No rule applies to this transaction. Change a field to propose one.
                </p>
            ) : null}
        </div>
    );
}
