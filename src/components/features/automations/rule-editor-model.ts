/**
 * Pure model for the shared, multi-output rule editor (`RuleEditor`).
 *
 * A {@link RuleEditorDraft} is the editable form state for one grouped rule: its match conditions,
 * one to three outputs, and the user's apply choice. {@link validateRuleDraft} turns a draft into
 * either ready-to-write conditions and outputs for the CRUD mutations, or per-field errors. Keeping
 * this pure lets the same editor mount on the Automations page and in the transaction inspector, and
 * keeps the validation testable without React.
 *
 * Matching, precedence and application stay in the engine; nothing here re-implements them.
 */

import { type FieldRuleOutputsInput } from "@/lib/crdt/field-rule-mutations";
import { type ApplyMode, applyModeFrom, type ApplyScope } from "@/lib/domain/automation/apply-mode";
import {
    type RememberedRuleChoice,
    rememberedApplyOnBlur,
    rememberedScope
} from "@/lib/domain/automation/preferences";
import { RULE_FIELDS, type RuleField, type TagRuleMode } from "@/lib/domain/automation/rules";
import { toMinorUnitsForCurrency } from "@/lib/domain/currency";
import { assertNever } from "@/lib/utils/exhaustive";

export type { ApplyScope };

/** One draft tags output: the explicit add/set mode and the chosen tag ids. */
export interface RuleEditorTagsDraft {
    readonly mode: TagRuleMode;
    readonly tagIds: readonly string[];
}

/**
 * The draft's outputs, at most one per field. Strings hold raw user input. An allocation maps each
 * person id to raw percent text, where blank means "no answer" and is not written.
 */
export interface RuleEditorOutputsDraft {
    readonly descriptionAlias?: { readonly aliasId: string };
    readonly tags?: RuleEditorTagsDraft;
    readonly allocation?: Readonly<Record<string, string>>;
}

/** Editable form state for one grouped rule. */
export interface RuleEditorDraft {
    /** Exact raw description text the rule keys on. */
    readonly descriptionText: string;
    readonly useAccountScope: boolean;
    /** Selected account id when {@link useAccountScope}. */
    readonly accountId: string;
    readonly useAmountScope: boolean;
    /** Raw major-units amount text when {@link useAmountScope}. */
    readonly amountText: string;
    readonly outputs: RuleEditorOutputsDraft;
    /** Which transactions Apply updates. Not a property of the rule: the user's remembered choice. */
    readonly scope: ApplyScope;
    /** Whether the inspector applies when focus leaves the row. Also a remembered choice. */
    readonly applyOnBlur: boolean;
}

/** Per-field validation messages. A missing key means that part of the draft is valid. */
export interface RuleEditorFieldErrors {
    readonly descriptionText?: string;
    readonly accountId?: string;
    readonly amount?: string;
    /** The description-alias output. */
    readonly aliasId?: string;
    /** The tags output. */
    readonly tagIds?: string;
    /** The allocation output. */
    readonly allocations?: string;
    /** The output set as a whole: empty, or refused by a grouped-rule mutation. */
    readonly outputs?: string;
}

/** The conditions and outputs a valid draft resolves to, ready for the CRUD mutations. */
export interface ResolvedRuleWrite {
    readonly accountId?: string;
    readonly amount?: number;
    readonly outputs: FieldRuleOutputsInput;
}

export type RuleEditorValidation =
    | { readonly ok: true; readonly value: ResolvedRuleWrite }
    | { readonly ok: false; readonly errors: RuleEditorFieldErrors };

/**
 * An empty draft for a rule created from scratch: no description, no restriction, no output. Scope
 * and Apply on blur are the user's remembered choices.
 */
export function emptyRuleDraft(remembered: RememberedRuleChoice): RuleEditorDraft {
    return {
        descriptionText: "",
        useAccountScope: false,
        accountId: "",
        useAmountScope: false,
        amountText: "",
        outputs: {},
        scope: rememberedScope(remembered),
        applyOnBlur: rememberedApplyOnBlur(remembered)
    };
}

/** The fields the draft has an output for, in {@link RULE_FIELDS} order. */
export function draftOutputFields(draft: Pick<RuleEditorDraft, "outputs">): readonly RuleField[] {
    return RULE_FIELDS.filter((field) => draft.outputs[field] != null);
}

/**
 * Add an empty output for `field`, leaving any existing output for it untouched. Tags start in the
 * remembered mode because set mode clears hand-typed tags and so must never be guessed.
 */
export function addDraftOutput(
    draft: RuleEditorDraft,
    field: RuleField,
    tagMode: TagRuleMode
): RuleEditorDraft {
    if (draft.outputs[field] != null) return draft;
    switch (field) {
        case "descriptionAlias":
            return { ...draft, outputs: { ...draft.outputs, descriptionAlias: { aliasId: "" } } };
        case "tags":
            return { ...draft, outputs: { ...draft.outputs, tags: { mode: tagMode, tagIds: [] } } };
        case "allocation":
            return { ...draft, outputs: { ...draft.outputs, allocation: {} } };
        default:
            return assertNever(field);
    }
}

/** The four-mode value the preference wire stores for the draft's scope and Apply on blur. */
export function draftApplyMode(draft: Pick<RuleEditorDraft, "scope" | "applyOnBlur">): ApplyMode {
    return applyModeFrom(draft.scope, draft.applyOnBlur);
}

/**
 * The remembered choice to persist after the draft is applied. A draft with several outputs has no
 * single field, so the first one stands for it, matching how the wire names a rule's legacy field.
 */
export function rememberedChoiceFromDraft(
    draft: RuleEditorDraft,
    previous: RememberedRuleChoice
): RememberedRuleChoice {
    return {
        field: draftOutputFields(draft)[0] ?? previous.field,
        tagMode: draft.outputs.tags?.mode ?? previous.tagMode,
        useAccountScope: draft.useAccountScope,
        useAmountScope: draft.useAmountScope,
        applyMode: draftApplyMode(draft)
    };
}

/**
 * Validate a draft into ready-to-write conditions and outputs, or per-field errors. Every output is
 * checked, so all its problems are reported at once. Amount is parsed in the vault currency to
 * integer minor units; allocation percents become numbers, and the whole-set range check stays at
 * the domain boundary the mutations call.
 */
export function validateRuleDraft(
    draft: RuleEditorDraft,
    currencyCode: string
): RuleEditorValidation {
    const errors: Mutable<RuleEditorFieldErrors> = {};

    if (draft.descriptionText.trim().length === 0) {
        errors.descriptionText = "Enter the exact description text this rule matches.";
    }

    const accountId = draft.useAccountScope ? draft.accountId : "";
    if (draft.useAccountScope && accountId.length === 0) {
        errors.accountId = "Choose an account for the account restriction.";
    }

    const amount = parseAmount(draft, currencyCode, errors);
    const outputs = parseOutputs(draft.outputs, errors);

    if (Object.values(errors).some((message) => message != null)) return { ok: false, errors };

    return {
        ok: true,
        value: {
            accountId: accountId.length === 0 ? undefined : accountId,
            amount,
            outputs
        }
    };
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function parseAmount(
    draft: RuleEditorDraft,
    currencyCode: string,
    errors: Mutable<RuleEditorFieldErrors>
): number | undefined {
    if (!draft.useAmountScope) return undefined;
    const raw = draft.amountText.trim();
    if (raw.length === 0) {
        errors.amount = "Enter an amount for the amount restriction.";
        return undefined;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
        errors.amount = "Enter a valid number.";
        return undefined;
    }
    return toMinorUnitsForCurrency(parsed, currencyCode);
}

function parseOutputs(
    draft: RuleEditorOutputsDraft,
    errors: Mutable<RuleEditorFieldErrors>
): FieldRuleOutputsInput {
    if (draftOutputFields({ outputs: draft }).length === 0) {
        errors.outputs = "Add at least one output.";
        return {};
    }
    const outputs: Mutable<FieldRuleOutputsInput> = {};

    if (draft.descriptionAlias != null) {
        const aliasId = draft.descriptionAlias.aliasId.trim();
        if (aliasId.length === 0) errors.aliasId = "Choose the description alias to apply.";
        else outputs.descriptionAlias = { aliasId };
    }

    if (draft.tags != null) {
        const tagIds = draft.tags.tagIds.filter((id) => id.length > 0);
        // An empty set-mode output is meaningful: it clears the row's tags.
        if (draft.tags.mode === "add" && tagIds.length === 0) {
            errors.tagIds = "Choose at least one tag to add.";
        } else {
            outputs.tags = { mode: draft.tags.mode, tagIds };
        }
    }

    if (draft.allocation != null) {
        const allocations = parseAllocations(draft.allocation, errors);
        if (allocations != null) outputs.allocation = { allocations };
    }

    return outputs;
}

function parseAllocations(
    raw: Readonly<Record<string, string>>,
    errors: Mutable<RuleEditorFieldErrors>
): Readonly<Record<string, number>> | null {
    const allocations: Record<string, number> = {};
    for (const [personId, text] of Object.entries(raw)) {
        const trimmed = text.trim();
        // Blank is "no answer", which the allocation views count as 0% without storing a value.
        if (trimmed.length === 0) continue;
        const value = Number(trimmed);
        if (!Number.isFinite(value)) {
            errors.allocations = "Enter valid percentages for each person.";
            return null;
        }
        allocations[personId] = value;
    }
    if (Object.keys(allocations).length === 0) {
        errors.allocations = "Enter at least one person's percentage.";
        return null;
    }
    return allocations;
}
