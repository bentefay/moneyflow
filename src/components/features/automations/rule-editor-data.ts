/**
 * Pure, surface-agnostic data helpers for the shared rule editor.
 *
 * Both the Automations page and the transaction inspector drive `RuleEditor` through these: turning
 * an existing {@link FieldRule} or a transaction edit into a draft, mapping a mutation error onto the
 * editor's messages, projecting vault records into option lists, and naming a rule's conditions and
 * outputs for display. Nothing here touches the vault.
 */

import type {
    useActiveAccounts,
    useActiveDescriptionAliases,
    useActivePeople,
    useActiveTags
} from "@/lib/crdt";
import { type FieldRuleMutationError } from "@/lib/crdt/field-rule-mutations";
import { resolvePersonDisplayName } from "@/lib/crdt/person";
import {
    type RememberedRuleChoice,
    rememberedApplyOnBlur,
    rememberedScope
} from "@/lib/domain/automation/preferences";
import { type FieldRule, type RuleField, type TagRuleMode } from "@/lib/domain/automation/rules";
import { getCurrency, type MoneyMinorUnits, toMajorUnits } from "@/lib/domain/currency";
import { assertNever } from "@/lib/utils/exhaustive";

import { type RuleEditorDraft, type RuleEditorFieldErrors } from "./rule-editor-model";

/** One choice in an editor option list: an account, tag, person or alias. */
export interface RuleEditorOption {
    readonly id: string;
    readonly label: string;
}

/** Every option list the editor offers. */
export interface RuleEditorOptions {
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
}

/** Human label for each output field, shared by the badge, the Add output list and Split. */
export const RULE_FIELD_LABELS: Readonly<Record<RuleField, string>> = {
    descriptionAlias: "Description",
    tags: "Tags",
    allocation: "Allocation"
};

// ============================================================================
// Drafts
// ============================================================================

/** Major-units text for a minor-units amount, as the amount input shows it. */
export function amountTextFromMinor(amount: MoneyMinorUnits, currencyCode: string): string {
    return String(toMajorUnits(amount, currencyCode));
}

function allocationText(
    allocations: Readonly<Record<string, number>>
): Readonly<Record<string, string>> {
    return Object.fromEntries(
        Object.entries(allocations).map(([personId, value]) => [personId, String(value)])
    );
}

/**
 * A draft reproducing an existing rule: its stored conditions and every output. Scope and Apply on
 * blur are the user's remembered choices, never properties of the rule.
 */
export function draftFromRule(
    rule: FieldRule,
    currencyCode: string,
    remembered: RememberedRuleChoice
): RuleEditorDraft {
    const { descriptionAlias, tags, allocation } = rule.outputs;
    return {
        descriptionText: rule.descriptionText,
        useAccountScope: rule.accountId != null,
        accountId: rule.accountId ?? "",
        useAmountScope: rule.amount != null,
        amountText: rule.amount == null ? "" : amountTextFromMinor(rule.amount, currencyCode),
        outputs: {
            ...(descriptionAlias == null
                ? {}
                : { descriptionAlias: { aliasId: descriptionAlias.aliasId } }),
            ...(tags == null ? {} : { tags: { mode: tags.mode, tagIds: [...tags.tagIds] } }),
            ...(allocation == null ? {} : { allocation: allocationText(allocation.allocations) })
        },
        scope: rememberedScope(remembered),
        applyOnBlur: rememberedApplyOnBlur(remembered)
    };
}

/**
 * The transaction facts a rule proposal is seeded from: the exact text the rule keys on, the value
 * the user just set, and the row's own account and amount so either restriction can be ticked.
 */
export interface RuleProposalSeed {
    readonly descriptionText: string;
    /** The value the user just set, discriminated on the rule field it belongs to. */
    readonly value:
        | { readonly field: "descriptionAlias"; readonly aliasId: string }
        | { readonly field: "tags"; readonly tagIds: readonly string[] }
        | { readonly field: "allocation"; readonly allocations: Readonly<Record<string, number>> };
    readonly accountId: string;
    /** This transaction's amount, used when "only if $x" is ticked (frozen `:258-259`); `undefined` when blank. */
    readonly amount: MoneyMinorUnits | undefined;
}

/**
 * A draft for a rule proposed from a field the user just changed on a transaction. It holds exactly
 * that one output. The restrictions are pre-filled from the row, so ticking either narrows the rule
 * to the row being looked at, and are ticked only if the user last chose them.
 */
export function draftFromProposal(
    seed: RuleProposalSeed,
    currencyCode: string,
    remembered: RememberedRuleChoice
): RuleEditorDraft {
    return {
        descriptionText: seed.descriptionText,
        useAccountScope: remembered.useAccountScope,
        accountId: seed.accountId,
        useAmountScope: remembered.useAmountScope,
        amountText: seed.amount == null ? "" : amountTextFromMinor(seed.amount, currencyCode),
        outputs: proposalOutputs(seed.value, remembered.tagMode),
        scope: rememberedScope(remembered),
        applyOnBlur: rememberedApplyOnBlur(remembered)
    };
}

function proposalOutputs(
    value: RuleProposalSeed["value"],
    tagMode: TagRuleMode
): RuleEditorDraft["outputs"] {
    switch (value.field) {
        case "descriptionAlias":
            return { descriptionAlias: { aliasId: value.aliasId } };
        case "tags":
            return { tags: { mode: tagMode, tagIds: [...value.tagIds] } };
        case "allocation":
            return { allocation: allocationText(value.allocations) };
        default:
            return assertNever(value);
    }
}

// ============================================================================
// Mutation errors
// ============================================================================

/** One sentence explaining why a rule mutation was refused. */
export function mutationErrorMessage(error: FieldRuleMutationError): string {
    switch (error.type) {
        case "duplicate-key":
            return "Another rule with these conditions already sets one of these outputs. Edit that rule instead.";
        case "invalid-allocations":
            return "Enter a valid percentage set (each between -100 and 100).";
        case "invalid-rule":
            return "This rule is not valid. Check the fields and try again.";
        case "not-found":
            return "This rule no longer exists.";
        case "missing-output":
            return "This rule no longer has that output.";
        case "single-output":
            return "A rule with one output cannot be split.";
        case "predicate-mismatch":
            return "The two rules have different conditions, so the output cannot move between them.";
        default:
            return assertNever(error);
    }
}

/** Map a mutation error onto the part of the editor it concerns. */
export function mutationErrorToFieldErrors(error: FieldRuleMutationError): RuleEditorFieldErrors {
    const message = mutationErrorMessage(error);
    switch (error.type) {
        case "duplicate-key":
        case "invalid-rule":
        case "not-found":
            return { descriptionText: message };
        case "invalid-allocations":
            return { allocations: message };
        case "missing-output":
        case "single-output":
        case "predicate-mismatch":
            return { outputs: message };
        default:
            return assertNever(error);
    }
}

// ============================================================================
// Options
// ============================================================================

/** The active vault records the editor's option lists are projected from. */
export interface RuleEditorOptionRecords {
    readonly accounts: ReturnType<typeof useActiveAccounts>;
    readonly tags: ReturnType<typeof useActiveTags>;
    readonly people: ReturnType<typeof useActivePeople>;
    readonly aliases: ReturnType<typeof useActiveDescriptionAliases>;
}

/** Project vault records into option lists. Only real aliases can be a rule's output. */
export function projectRuleEditorOptions(records: RuleEditorOptionRecords): RuleEditorOptions {
    return {
        accounts: Object.values(records.accounts).flatMap((account) =>
            typeof account === "object" ? [{ id: account.id, label: account.name }] : []
        ),
        tags: Object.values(records.tags).flatMap((tag) =>
            typeof tag === "object" ? [{ id: tag.id, label: tag.name }] : []
        ),
        people: Object.values(records.people).flatMap((person) =>
            typeof person === "object"
                ? [{ id: person.id, label: resolvePersonDisplayName(person) }]
                : []
        ),
        aliases: Object.values(records.aliases).flatMap((alias) =>
            typeof alias === "object" && alias.kind === "real"
                ? [{ id: alias.id, label: alias.name }]
                : []
        )
    };
}

// ============================================================================
// Display labels
// ============================================================================

/**
 * Render an amount for a restriction label. Falls back to the bare major-units number for a
 * currency the platform cannot format. A blank amount renders as a dash; the editor rejects an
 * amount scope seeded from it.
 */
export function formatAmountForRuleLabel(
    amount: MoneyMinorUnits | undefined,
    currencyCode: string,
    locale?: Intl.LocalesArgument
): string {
    if (amount == null) return "—";
    const majorUnits = toMajorUnits(amount, currencyCode);
    const currency = getCurrency(currencyCode);
    if (currency == null) return String(majorUnits);
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: currency.decimal_digits,
        maximumFractionDigits: currency.decimal_digits
    }).format(majorUnits);
}

function optionLabel(options: readonly RuleEditorOption[], id: string, fallback: string): string {
    return options.find((option) => option.id === id)?.label ?? fallback;
}

/** "COFFEE SHOP 123 · any account · any amount": a rule's name is its conditions. */
export function ruleConditionsLabel(
    rule: Pick<FieldRule, "descriptionText" | "accountId" | "amount">,
    accounts: readonly RuleEditorOption[],
    currencyCode: string
): string {
    const account =
        rule.accountId == null
            ? "any account"
            : optionLabel(accounts, rule.accountId, "an unknown account");
    const amount =
        rule.amount == null ? "any amount" : formatAmountForRuleLabel(rule.amount, currencyCode);
    return [rule.descriptionText, account, amount].join(" · ");
}

/**
 * The one-line summary of a draft output: "rename to “Coffee”", "add #coffee #work",
 * "Alex 50% / Sam —". Blank allocation cells read as an em dash: no answer, not zero.
 */
export function outputValueSummary(
    field: RuleField,
    outputs: RuleEditorDraft["outputs"],
    options: Pick<RuleEditorOptions, "aliases" | "tags" | "people">
): string {
    switch (field) {
        case "descriptionAlias": {
            const aliasId = outputs.descriptionAlias?.aliasId ?? "";
            if (aliasId.length === 0) return "no alias chosen";
            return `rename to “${optionLabel(options.aliases, aliasId, "unknown alias")}”`;
        }
        case "tags": {
            const tags = outputs.tags;
            if (tags == null) return "";
            const names = tags.tagIds.map((id) => `#${optionLabel(options.tags, id, "unknown")}`);
            const verb = tags.mode === "set" ? "set" : "add";
            if (names.length === 0) return tags.mode === "set" ? "clear tags" : "no tags chosen";
            return `${verb} ${names.join(" ")}`;
        }
        case "allocation": {
            const allocation = outputs.allocation ?? {};
            if (options.people.length === 0) return "no people";
            return options.people
                .map((person) => {
                    const raw = allocation[person.id]?.trim() ?? "";
                    return `${person.label} ${raw.length === 0 ? "—" : `${raw}%`}`;
                })
                .join(" / ");
        }
        default:
            return assertNever(field);
    }
}
