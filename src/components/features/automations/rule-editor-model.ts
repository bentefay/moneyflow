/**
 * Pure model for the shared field-rule editor (HS-007 / P17B).
 *
 * The editor UI is a thin, controlled shell over this module: a {@link RuleEditorDraft} is the
 * editable form state, and {@link validateRuleDraft} turns a draft into either a ready-to-write
 * action (consumed by the P17B CRUD mutations) or per-field validation errors. Keeping this pure
 * makes the four-mode/constraint/validation logic testable without React and lets the SAME editor
 * mount on the Automations page now and in the P17C contextual popup later.
 *
 * It reuses the P17A domain types (`RuleField`, `TagRuleMode`, `FieldRuleActionInput`) and never
 * re-implements precedence, matching or application — those stay in the engine.
 */

import { type FieldRuleActionInput } from "@/lib/crdt/field-rule-mutations";
import { type RuleField, type TagRuleMode } from "@/lib/domain/automation/rules";
import { toMinorUnitsForCurrency } from "@/lib/domain/currency";

/**
 * The four frozen apply modes. "updating*" apply automatically when the edited row loses focus (the
 * P17C inline surface); "update*" apply only on an explicit tick/Apply click. "*All" cover all
 * existing and new transactions; "*New" cover only newer ones. On the Automations page the explicit
 * Apply buttons are authoritative; this choice is remembered so the inline surface pre-fills it.
 */
export type ApplyMode = "updatingAll" | "updatingNew" | "updateAll" | "updateNew";

export const APPLY_MODES: readonly ApplyMode[] = [
    "updatingAll",
    "updatingNew",
    "updateAll",
    "updateNew"
];

/** Human label for an apply mode (frozen numbering: 1 updating all … 4 update new). */
export function applyModeLabel(mode: ApplyMode): string {
    switch (mode) {
        case "updatingAll":
            return "Updating all";
        case "updatingNew":
            return "Updating new";
        case "updateAll":
            return "Update all";
        case "updateNew":
            return "Update new";
        default:
            return assertNever(mode);
    }
}

/** True when the mode targets only newer transactions (vs all existing + new). */
export function applyModeTargetsNewOnly(mode: ApplyMode): boolean {
    switch (mode) {
        case "updatingNew":
        case "updateNew":
            return true;
        case "updatingAll":
        case "updateAll":
            return false;
        default:
            return assertNever(mode);
    }
}

/** True when the mode applies automatically on blur ("updating…") rather than on an explicit tick. */
export function applyModeIsAutomatic(mode: ApplyMode): boolean {
    switch (mode) {
        case "updatingAll":
        case "updatingNew":
            return true;
        case "updateAll":
        case "updateNew":
            return false;
        default:
            return assertNever(mode);
    }
}

function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

/** Editable form state for one rule. Strings hold raw user input; validation parses them. */
export interface RuleEditorDraft {
    readonly field: RuleField;
    /** Exact raw description text the rule keys on. */
    readonly descriptionText: string;
    readonly useAccountScope: boolean;
    /** Selected account id when {@link useAccountScope}. */
    readonly accountId: string;
    readonly useAmountScope: boolean;
    /** Raw major-units amount text when {@link useAmountScope}. */
    readonly amountText: string;
    /** descriptionAlias action: selected alias id. */
    readonly aliasId: string;
    readonly tagMode: TagRuleMode;
    readonly tagIds: readonly string[];
    /** allocation action: personId -> raw percent text. */
    readonly allocations: Readonly<Record<string, string>>;
    readonly applyMode: ApplyMode;
}

/** Per-field validation messages. A missing key means that field is valid. */
export interface RuleEditorFieldErrors {
    readonly descriptionText?: string;
    readonly accountId?: string;
    readonly amount?: string;
    readonly aliasId?: string;
    readonly tagIds?: string;
    readonly allocations?: string;
}

/** The scope + action a valid draft resolves to, ready for the CRUD mutations. */
export interface ResolvedRuleWrite {
    readonly accountId?: string;
    readonly amount?: number;
    readonly action: FieldRuleActionInput;
}

export type RuleEditorValidation =
    | { readonly ok: true; readonly value: ResolvedRuleWrite }
    | { readonly ok: false; readonly errors: RuleEditorFieldErrors };

/** An empty draft with the given remembered defaults. */
export function emptyRuleDraft(defaults: {
    readonly field: RuleField;
    readonly tagMode: TagRuleMode;
    readonly useAccountScope: boolean;
    readonly useAmountScope: boolean;
    readonly applyMode?: ApplyMode;
}): RuleEditorDraft {
    return {
        field: defaults.field,
        descriptionText: "",
        useAccountScope: defaults.useAccountScope,
        accountId: "",
        useAmountScope: defaults.useAmountScope,
        amountText: "",
        aliasId: "",
        tagMode: defaults.tagMode,
        tagIds: [],
        allocations: {},
        applyMode: defaults.applyMode ?? "updateNew"
    };
}

/**
 * Validate a draft into a ready-to-write scope + action, or per-field errors. Pure: no mutation.
 * Amount is parsed in the vault currency to integer minor units; allocation percents are parsed to
 * numbers (final range/whole-set validation stays in the P17A boundary via the CRUD mutations).
 */
export function validateRuleDraft(
    draft: RuleEditorDraft,
    currencyCode: string
): RuleEditorValidation {
    const errors: Mutable<RuleEditorFieldErrors> = {};

    const descriptionText = draft.descriptionText.trim();
    if (descriptionText.length === 0) {
        errors.descriptionText = "Enter the exact description text this rule matches.";
    }

    const accountId = draft.useAccountScope ? draft.accountId : undefined;
    if (draft.useAccountScope && (accountId == null || accountId.length === 0)) {
        errors.accountId = "Choose an account for the account constraint.";
    }

    const amount = parseAmount(draft, currencyCode, errors);
    const action = parseAction(draft, errors);

    if (hasAnyError(errors)) return { ok: false, errors };
    if (action == null) return { ok: false, errors };

    return {
        ok: true,
        value: {
            accountId: accountId == null || accountId.length === 0 ? undefined : accountId,
            amount,
            action
        }
    };
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function hasAnyError(errors: RuleEditorFieldErrors): boolean {
    return Object.values(errors).some((message) => message != null);
}

function parseAmount(
    draft: RuleEditorDraft,
    currencyCode: string,
    errors: Mutable<RuleEditorFieldErrors>
): number | undefined {
    if (!draft.useAmountScope) return undefined;
    const raw = draft.amountText.trim();
    if (raw.length === 0) {
        errors.amount = "Enter an amount for the amount constraint.";
        return undefined;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
        errors.amount = "Enter a valid number.";
        return undefined;
    }
    return toMinorUnitsForCurrency(parsed, currencyCode);
}

function parseAction(
    draft: RuleEditorDraft,
    errors: Mutable<RuleEditorFieldErrors>
): FieldRuleActionInput | null {
    switch (draft.field) {
        case "descriptionAlias": {
            const aliasId = draft.aliasId.trim();
            if (aliasId.length === 0) {
                errors.aliasId = "Choose the description alias to apply.";
                return null;
            }
            return { field: "descriptionAlias", aliasId };
        }
        case "tags": {
            const tagIds = draft.tagIds.filter((id) => id.length > 0);
            if (draft.tagMode === "add" && tagIds.length === 0) {
                errors.tagIds = "Choose at least one tag to add.";
                return null;
            }
            return { field: "tags", mode: draft.tagMode, tagIds };
        }
        case "allocation": {
            const allocations = parseAllocations(draft.allocations, errors);
            if (allocations == null) return null;
            return { field: "allocation", allocations };
        }
        default:
            return assertNever(draft.field);
    }
}

function parseAllocations(
    raw: Readonly<Record<string, string>>,
    errors: Mutable<RuleEditorFieldErrors>
): Readonly<Record<string, number>> | null {
    const allocations: Record<string, number> = {};
    for (const [personId, text] of Object.entries(raw)) {
        const trimmed = text.trim();
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
