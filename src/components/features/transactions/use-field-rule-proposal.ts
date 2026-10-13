"use client";

/**
 * The rule proposal a field edit on a transaction offers (HS-007 / UR-009).
 *
 * {@link computeFieldRuleProposal} decides whether the edit can be offered at all. Which rule it then
 * creates or joins is the ownership ladder's answer, `resolveRuleExtensionTarget`, recomputed from
 * the draft's conditions on every change, so ticking "Only this account" re-derives the target. When
 * the ladder needs the user to choose (a conflict between the owner and the description rule, or
 * several candidates), the choice is held beside the draft in the controller-owned override, so it
 * survives a re-render and the inspector closing and reopening.
 *
 * `apply` makes exactly one rule mutation, then applies at the chosen scope through the engine. A
 * refused mutation applies nothing and remembers nothing.
 */

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { type Temporal } from "temporal-polyfill";

import { useActiveFieldRuleIndex, useApplyFieldRules, useFieldRuleActions } from "@/lib/crdt";
import {
    type FieldRuleMutationError,
    type FieldRuleOutputChange,
    type FieldRuleOutputsInput
} from "@/lib/crdt/field-rule-mutations";
import {
    resolveRuleExtensionTarget,
    type RuleExtensionTarget
} from "@/lib/domain/automation/extension";
import { candidateRulesFor, type RuleIndex } from "@/lib/domain/automation/rule-index";
import {
    type FieldRule,
    type RuleField,
    ruleMatchesSubject,
    type RuleMatchSubject,
    ruleOutputFields
} from "@/lib/domain/automation/rules";
import { assertNever } from "@/lib/utils/exhaustive";

import {
    draftFromProposal,
    mutationErrorToFieldErrors,
    type RuleEditorOption,
    type RuleProposalSeed
} from "../automations/rule-editor-data";
import {
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    validateRuleDraft
} from "../automations/rule-editor-model";
import { useRuleEditorOptions } from "../automations/use-rule-editor-options";
import {
    computeFieldRuleProposal,
    type FieldRuleProposalState,
    proposalPredicate,
    type RuleProposalDraftGeneration,
    type RuleProposalDraftOverride,
    type RuleProposalErrorOverride,
    type RuleProposalResolutionChoice
} from "./field-rule-proposal-state";
import { type RobotCurrentValue } from "./field-rule-robot-state";
import { type TransactionId } from "./table-model";
import {
    useRememberedRuleChoice,
    useTransactionCurrencyCode
} from "./use-transaction-rule-workflow";

/**
 * The user's answer to the target's required choice, already checked against the current target. A
 * conflict defaults to keeping the owner; an ambiguous target has no default.
 */
export type RuleProposalResolution =
    | { readonly kind: "conflict"; readonly choice: "keep" | "move" }
    | { readonly kind: "ambiguous"; readonly ruleId: string | null };

export interface FieldRuleProposalWorkflow {
    readonly proposal: FieldRuleProposalState;
    /** Which rule Apply writes to, for the draft's current conditions. `null` with no proposal. */
    readonly target: RuleExtensionTarget | null;
    readonly draft: RuleEditorDraft | null;
    readonly errors: RuleEditorFieldErrors;
    /** `null` unless the target is a conflict or ambiguous. */
    readonly resolution: RuleProposalResolution | null;
    /** False for an ineligible target and for an ambiguous one with no rule chosen. */
    readonly canApply: boolean;
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
    readonly currencyCode: string;
    readonly setDraft: (next: RuleEditorDraft) => void;
    readonly setResolution: (choice: RuleProposalResolutionChoice) => void;
    /**
     * Write the proposed output and apply at the draft's scope. True when the write succeeded; false
     * when validation, the target or the mutation refused it (errors are then populated).
     */
    readonly apply: () => boolean;
}

export interface FieldRuleProposalPersistence {
    readonly draftOverride: RuleProposalDraftOverride | null;
    readonly errorOverride: RuleProposalErrorOverride | null;
    readonly setDraftOverride: (override: RuleProposalDraftOverride | null) => void;
    readonly setErrorOverride: (override: RuleProposalErrorOverride | null) => void;
}

type RuleProposalCurrentValueKey =
    | { readonly field: "descriptionAlias"; readonly aliasId: string | null }
    | { readonly field: "tags"; readonly tagIds: readonly string[] }
    | {
          readonly field: "allocation";
          readonly allocations: readonly (readonly [string, number])[];
      };

/** The draft output for `field` as one validated output change, or `null` if it has none. */
function pendingOutputChange(
    outputs: FieldRuleOutputsInput,
    field: RuleField
): FieldRuleOutputChange | null {
    switch (field) {
        case "descriptionAlias":
            return outputs.descriptionAlias == null
                ? null
                : { field, output: outputs.descriptionAlias };
        case "tags":
            return outputs.tags == null ? null : { field, output: outputs.tags };
        case "allocation":
            return outputs.allocation == null ? null : { field, output: outputs.allocation };
        default:
            return assertNever(field);
    }
}

/** Keep a stored choice only while it still answers the current target. */
function validResolution(
    target: RuleExtensionTarget | null,
    stored: RuleProposalResolutionChoice | null
): RuleProposalResolution | null {
    if (target == null) return null;
    switch (target.kind) {
        case "conflict":
            return {
                kind: "conflict",
                choice: stored?.kind === "conflict" ? stored.choice : "keep"
            };
        case "ambiguous": {
            const chosen =
                stored?.kind === "ambiguous" &&
                target.candidates.some((candidate) => candidate.id === stored.ruleId)
                    ? stored.ruleId
                    : null;
            return { kind: "ambiguous", ruleId: chosen };
        }
        case "ineligible":
        case "create":
        case "update-owner":
        case "extend":
            return null;
        default:
            return assertNever(target);
    }
}

export function useFieldRuleProposal(params: {
    readonly subject: RuleMatchSubject;
    /** Stable owner whose current value seeded this proposal. */
    readonly transactionId: TransactionId;
    /** The value the transaction currently carries for the changed field. */
    readonly current: RobotCurrentValue;
    /** This transaction's date; Update new applies to rows on or after it. */
    readonly referenceDate: Temporal.PlainDate;
    /** Optional controller-owned persistence used by the stable transaction inspector. */
    readonly persistence?: FieldRuleProposalPersistence;
}): FieldRuleProposalWorkflow {
    const { subject, transactionId, current, referenceDate, persistence } = params;

    const rules = useActiveFieldRuleIndex();
    const options = useRuleEditorOptions();
    const currencyCode = useTransactionCurrencyCode(subject.accountId);
    const { remembered, remember } = useRememberedRuleChoice();
    const { create, setOutput, moveOutput } = useFieldRuleActions();
    const { applyAll, applyNewerThan } = useApplyFieldRules();

    const proposal = useMemo(() => computeFieldRuleProposal(subject, current), [subject, current]);
    const draftKey = useMemo(
        () => ruleProposalDraftKey(transactionId, proposal, rules, current, subject, currencyCode),
        [currencyCode, current, proposal, rules, subject, transactionId]
    );
    const draftGeneration = useMemo<RuleProposalDraftGeneration>(
        () => ({ semanticKey: draftKey }),
        [draftKey]
    );

    const [localDraftOverride, setLocalDraftOverride] = useState<RuleProposalDraftOverride | null>(
        null
    );
    const [localErrorOverride, setLocalErrorOverride] = useState<RuleProposalErrorOverride | null>(
        null
    );
    const draftOverride = persistence == null ? localDraftOverride : persistence.draftOverride;
    const errorOverride = persistence == null ? localErrorOverride : persistence.errorOverride;
    const setDraftOverride = persistence?.setDraftOverride ?? setLocalDraftOverride;
    const setErrorOverride = persistence?.setErrorOverride ?? setLocalErrorOverride;
    const generationMatches = (generation: RuleProposalDraftGeneration): boolean =>
        persistence == null
            ? generation === draftGeneration
            : generation.semanticKey === draftGeneration.semanticKey;
    const errors =
        errorOverride != null && generationMatches(errorOverride.generation)
            ? errorOverride.errors
            : {};
    const liveOverride =
        draftOverride != null && generationMatches(draftOverride.generation) ? draftOverride : null;

    // An inspector remount gets a new local token, but its controller-owned override still belongs to
    // the same semantic proposal. A semantic mismatch is ignored immediately and retired before an
    // A → B → A transition can resurrect it.
    useLayoutEffect(() => {
        if (persistence == null) return;
        if (
            draftOverride != null &&
            draftOverride.generation.semanticKey !== draftGeneration.semanticKey
        ) {
            setDraftOverride(null);
        }
        if (
            errorOverride != null &&
            errorOverride.generation.semanticKey !== draftGeneration.semanticKey
        ) {
            setErrorOverride(null);
        }
    }, [
        draftGeneration.semanticKey,
        draftOverride,
        errorOverride,
        persistence,
        setDraftOverride,
        setErrorOverride
    ]);

    // The draft is DERIVED from the proposal, so the controls never need an effect to seed
    // themselves when they appear. User edits are held in the override.
    const baselineDraft = useMemo<RuleEditorDraft | null>(() => {
        if (proposal.kind === "none") return null;
        const seed = seedFromCurrent(proposal.descriptionText, current, subject);
        return draftFromProposal(seed, currencyCode, remembered);
    }, [proposal, current, subject, currencyCode, remembered]);
    const draft = proposal.kind === "none" ? null : (liveOverride?.draft ?? baselineDraft);
    const storedResolution = liveOverride?.resolution ?? null;

    const useAccountScope = draft?.useAccountScope ?? false;
    const useAmountScope = draft?.useAmountScope ?? false;
    const target = useMemo<RuleExtensionTarget | null>(() => {
        if (proposal.kind === "none") return null;
        return resolveRuleExtensionTarget({
            rules,
            subject,
            field: proposal.field,
            predicate: proposalPredicate(
                proposal.descriptionText,
                { useAccountScope, useAmountScope },
                subject
            )
        });
    }, [proposal, rules, subject, useAccountScope, useAmountScope]);
    const resolution = validResolution(target, storedResolution);
    const canApply =
        draft != null &&
        target != null &&
        target.kind !== "ineligible" &&
        !(resolution?.kind === "ambiguous" && resolution.ruleId == null);

    const setDraft = useCallback(
        (next: RuleEditorDraft) => {
            if (proposal.kind === "none") return;
            setDraftOverride({
                draft: next,
                generation: draftGeneration,
                resolution: storedResolution
            });
            setErrorOverride(null);
        },
        [draftGeneration, proposal.kind, setDraftOverride, setErrorOverride, storedResolution]
    );

    const setResolution = useCallback(
        (choice: RuleProposalResolutionChoice) => {
            if (draft == null) return;
            setDraftOverride({ draft, generation: draftGeneration, resolution: choice });
        },
        [draft, draftGeneration, setDraftOverride]
    );

    const apply = useCallback((): boolean => {
        if (draft == null || proposal.kind === "none" || target == null) return false;
        const validation = validateRuleDraft(draft, currencyCode);
        if (!validation.ok) {
            setErrorOverride({ errors: validation.errors, generation: draftGeneration });
            return false;
        }
        const { accountId, amount, outputs } = validation.value;
        const change = pendingOutputChange(outputs, proposal.field);
        if (change == null) return false;

        const result = writeProposal({
            target,
            resolution,
            change,
            create: () =>
                create({
                    id: crypto.randomUUID(),
                    descriptionText: proposal.descriptionText,
                    accountId,
                    amount,
                    // The proposal draft holds only the pending output, so this is exactly it.
                    outputs,
                    createdAtEpochMs: Date.now()
                }),
            setOutput: (ruleId) => setOutput({ id: ruleId, ...change }),
            moveOutput: (owner, host) =>
                moveOutput({
                    sourceId: owner.id,
                    hostId: host.id,
                    deletedAtEpochMs: Date.now(),
                    ...change
                })
        });
        if (result == null) return false;
        if (!result.ok) {
            setErrorOverride({
                errors: mutationErrorToFieldErrors(result.error),
                generation: draftGeneration
            });
            return false;
        }

        // Both scopes apply every active rule to the targeted rows: the engine's frozen semantics.
        if (draft.scope === "new") applyNewerThan(referenceDate);
        else applyAll();

        remember(draft);
        setDraftOverride(null);
        setErrorOverride(null);
        return true;
    }, [
        applyAll,
        applyNewerThan,
        create,
        currencyCode,
        draft,
        draftGeneration,
        moveOutput,
        proposal,
        referenceDate,
        remember,
        resolution,
        setDraftOverride,
        setErrorOverride,
        setOutput,
        target
    ]);

    return {
        proposal,
        target,
        draft,
        errors,
        resolution,
        canApply,
        ...options,
        currencyCode,
        setDraft,
        setResolution,
        apply
    };
}

type ProposalWriteResult =
    | { readonly ok: true }
    | { readonly ok: false; readonly error: FieldRuleMutationError };

/**
 * The one rule mutation the target calls for, or `null` when nothing may be written: an ineligible
 * target, or an ambiguous one the user has not answered.
 */
function writeProposal(input: {
    readonly target: RuleExtensionTarget;
    readonly resolution: RuleProposalResolution | null;
    readonly change: FieldRuleOutputChange;
    readonly create: () => ProposalWriteResult;
    readonly setOutput: (ruleId: string) => ProposalWriteResult;
    readonly moveOutput: (owner: FieldRule, host: FieldRule) => ProposalWriteResult;
}): ProposalWriteResult | null {
    const { target, resolution } = input;
    switch (target.kind) {
        case "ineligible":
            return null;
        case "create":
            return input.create();
        case "update-owner":
        case "extend":
            return input.setOutput(target.rule.id);
        case "conflict":
            return resolution?.kind === "conflict" && resolution.choice === "move"
                ? input.moveOutput(target.owner, target.host)
                : input.setOutput(target.owner.id);
        case "ambiguous":
            // `setFieldRuleOutput` adds or replaces, so it covers an owner and a non-owner alike.
            return resolution?.kind === "ambiguous" && resolution.ruleId != null
                ? input.setOutput(resolution.ruleId)
                : null;
        default:
            return assertNever(target);
    }
}

/**
 * Stable semantic identity for the facts an override was made against. It must not include the
 * target, which depends on the override's own conditions and would retire it on every checkbox tick.
 * The signature of same-text rules matching the row does retire it when another writer changes the
 * candidate set, so the proposal is re-presented rather than written over a changed rule.
 */
function ruleProposalDraftKey(
    transactionId: TransactionId,
    proposal: FieldRuleProposalState,
    rules: RuleIndex,
    current: RobotCurrentValue,
    subject: RuleMatchSubject,
    currencyCode: string
): string {
    const ruleSignature = candidateRulesFor(rules, subject)
        .filter((rule) => ruleMatchesSubject(rule, subject))
        .map((rule) => [rule.id, ruleOutputFields(rule)] as const)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return JSON.stringify([
        transactionId,
        proposal.kind,
        current.field,
        subject.descriptionText,
        subject.accountId,
        subject.amount,
        currencyCode,
        ruleProposalCurrentValueKey(current),
        ruleSignature
    ]);
}

function ruleProposalCurrentValueKey(current: RobotCurrentValue): RuleProposalCurrentValueKey {
    switch (current.field) {
        case "descriptionAlias":
            return { aliasId: current.currentAliasId, field: current.field };
        case "tags":
            return { field: current.field, tagIds: [...current.currentTagIds].sort() };
        case "allocation":
            return {
                allocations: Object.entries(current.currentAllocations).sort(([left], [right]) =>
                    left.localeCompare(right)
                ),
                field: current.field
            };
        default:
            return assertNever(current);
    }
}

/** Project the changed field's current value into the pure {@link RuleProposalSeed}. */
function seedFromCurrent(
    descriptionText: string,
    current: RobotCurrentValue,
    subject: RuleMatchSubject
): RuleProposalSeed {
    const scope = { accountId: subject.accountId, amount: subject.amount, descriptionText };
    switch (current.field) {
        case "descriptionAlias":
            return {
                ...scope,
                value: { field: "descriptionAlias", aliasId: current.currentAliasId ?? "" }
            };
        case "tags":
            return { ...scope, value: { field: "tags", tagIds: current.currentTagIds } };
        case "allocation":
            return {
                ...scope,
                value: { field: "allocation", allocations: current.currentAllocations }
            };
        default:
            return assertNever(current);
    }
}
