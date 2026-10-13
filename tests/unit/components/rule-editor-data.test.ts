import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    draftFromProposal,
    draftFromRule,
    formatAmountForRuleLabel,
    mutationErrorMessage,
    mutationErrorToFieldErrors,
    outputValueSummary,
    ruleConditionsLabel,
    type RuleProposalSeed
} from "@/components/features/automations/rule-editor-data";
import {
    draftApplyMode,
    draftOutputFields,
    validateRuleDraft
} from "@/components/features/automations/rule-editor-model";
import { type FieldRuleMutationError } from "@/lib/crdt/field-rule-mutations";
import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import { APPLY_MODES } from "@/lib/domain/automation/apply-mode";
import {
    DEFAULT_REMEMBERED_CHOICE,
    type RememberedRuleChoice
} from "@/lib/domain/automation/preferences";
import { type FieldRule, FieldRuleIdSchema } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");

function ruleId(id: string): FieldRule["id"] {
    return FieldRuleIdSchema.parse(id);
}

const GROUPED_RULE: FieldRule = {
    id: ruleId("r1"),
    descriptionText: "COFFEE SHOP 123",
    accountId: "account-1",
    amount: asMinorUnits(-450),
    outputs: {
        descriptionAlias: { aliasId: "alias-coffee" },
        tags: { mode: "set", tagIds: ["tag-a", "tag-b"] },
        allocation: {
            allocations: {
                "person-a": AllocationPercentageSchema.parse(60),
                "person-b": AllocationPercentageSchema.parse(0)
            }
        }
    },
    createdAt: CREATION
};

describe("draftFromRule", () => {
    it("reproduces the stored conditions and every output", () => {
        const draft = draftFromRule(GROUPED_RULE, "USD", DEFAULT_REMEMBERED_CHOICE);
        expect(draft).toMatchObject({
            descriptionText: "COFFEE SHOP 123",
            useAccountScope: true,
            accountId: "account-1",
            useAmountScope: true,
            amountText: "-4.5",
            outputs: {
                descriptionAlias: { aliasId: "alias-coffee" },
                tags: { mode: "set", tagIds: ["tag-a", "tag-b"] },
                allocation: { "person-a": "60", "person-b": "0" }
            }
        });
    });

    it("holds only the outputs the rule has", () => {
        const rule: FieldRule = {
            id: ruleId("r2"),
            descriptionText: "RENT",
            outputs: { tags: { mode: "add", tagIds: ["tag-a"] } },
            createdAt: CREATION
        };
        const draft = draftFromRule(rule, "USD", DEFAULT_REMEMBERED_CHOICE);
        expect(draftOutputFields(draft)).toEqual(["tags"]);
        expect(draft.useAccountScope).toBe(false);
        expect(draft.useAmountScope).toBe(false);
    });

    it.each(APPLY_MODES)("takes scope and Apply on blur from the remembered %s", (applyMode) => {
        const draft = draftFromRule(GROUPED_RULE, "USD", {
            ...DEFAULT_REMEMBERED_CHOICE,
            applyMode
        });
        expect(draftApplyMode(draft)).toBe(applyMode);
    });

    it("validates back to the rule's own conditions and outputs", () => {
        const result = validateRuleDraft(
            draftFromRule(GROUPED_RULE, "USD", DEFAULT_REMEMBERED_CHOICE),
            "USD"
        );
        expect(result).toEqual({
            ok: true,
            value: {
                accountId: "account-1",
                amount: -450,
                outputs: {
                    descriptionAlias: { aliasId: "alias-coffee" },
                    tags: { mode: "set", tagIds: ["tag-a", "tag-b"] },
                    allocation: { allocations: { "person-a": 60, "person-b": 0 } }
                }
            }
        });
    });
});

describe("draftFromProposal", () => {
    const SEED: Omit<RuleProposalSeed, "value"> = {
        descriptionText: "COFFEE SHOP 123",
        accountId: "account-1",
        amount: asMinorUnits(-450)
    };

    it.each([
        {
            value: { field: "descriptionAlias", aliasId: "alias-coffee" },
            outputs: { descriptionAlias: { aliasId: "alias-coffee" } }
        },
        {
            value: { field: "tags", tagIds: ["tag-a"] },
            outputs: { tags: { mode: "add", tagIds: ["tag-a"] } }
        },
        {
            value: { field: "allocation", allocations: { "person-a": 60, "person-b": 40 } },
            outputs: { allocation: { "person-a": "60", "person-b": "40" } }
        }
    ] as const)("holds exactly the one $value.field output just edited", ({ value, outputs }) => {
        const draft = draftFromProposal({ ...SEED, value }, "USD", DEFAULT_REMEMBERED_CHOICE);
        expect(draft.outputs).toEqual(outputs);
    });

    it("pre-fills both restrictions from the row but leaves them off by default", () => {
        const draft = draftFromProposal(
            { ...SEED, value: { field: "tags", tagIds: ["t"] } },
            "USD",
            DEFAULT_REMEMBERED_CHOICE
        );
        expect(draft.accountId).toBe("account-1");
        expect(draft.amountText).toBe("-4.5");
        expect(draft.useAccountScope).toBe(false);
        expect(draft.useAmountScope).toBe(false);
    });

    it("honours every remembered choice", () => {
        const remembered: RememberedRuleChoice = {
            field: "tags",
            tagMode: "set",
            useAccountScope: true,
            useAmountScope: true,
            applyMode: "updatingAll"
        };
        const draft = draftFromProposal(
            { ...SEED, value: { field: "tags", tagIds: ["tag-a"] } },
            "USD",
            remembered
        );
        expect(draft.outputs.tags?.mode).toBe("set");
        expect(draft.useAccountScope).toBe(true);
        expect(draft.useAmountScope).toBe(true);
        expect(draft.scope).toBe("all");
        expect(draft.applyOnBlur).toBe(true);
    });

    it("formats the pre-filled amount in the currency's own minor units", () => {
        const draft = draftFromProposal(
            { ...SEED, amount: asMinorUnits(1234), value: { field: "tags", tagIds: ["t"] } },
            "JPY",
            DEFAULT_REMEMBERED_CHOICE
        );
        expect(draft.amountText).toBe("1234");
    });

    it("leaves the amount blank for a blank row, so an amount restriction cannot be seeded", () => {
        const draft = draftFromProposal(
            { ...SEED, amount: undefined, value: { field: "tags", tagIds: ["t"] } },
            "USD",
            { ...DEFAULT_REMEMBERED_CHOICE, useAmountScope: true }
        );
        expect(draft.amountText).toBe("");
        const validation = validateRuleDraft(draft, "USD");
        expect(validation.ok).toBe(false);
        if (!validation.ok) expect(validation.errors.amount).toBeDefined();
    });
});

describe("mutationErrorToFieldErrors", () => {
    const cases: readonly {
        readonly error: FieldRuleMutationError;
        readonly key: "descriptionText" | "allocations" | "outputs";
    }[] = [
        { error: { type: "duplicate-key", existingRuleId: "r1" }, key: "descriptionText" },
        { error: { type: "invalid-rule", issues: [] }, key: "descriptionText" },
        { error: { type: "not-found", ruleId: "r1" }, key: "descriptionText" },
        { error: { type: "invalid-allocations", errors: [] }, key: "allocations" },
        { error: { type: "missing-output", ruleId: "r1", field: "tags" }, key: "outputs" },
        { error: { type: "single-output", ruleId: "r1" }, key: "outputs" },
        { error: { type: "predicate-mismatch", sourceId: "r1", hostId: "r2" }, key: "outputs" }
    ];

    it.each(cases)("puts $error.type on $key with its message", ({ error, key }) => {
        const errors = mutationErrorToFieldErrors(error);
        expect(Object.keys(errors)).toEqual([key]);
        expect(errors[key]).toBe(mutationErrorMessage(error));
    });

    it("gives every error type its own message", () => {
        const messages = new Set(cases.map(({ error }) => mutationErrorMessage(error)));
        expect(messages.size).toBe(cases.length);
    });
});

describe("display labels", () => {
    const accounts = [{ id: "account-1", label: "Everyday" }];

    it("names a rule by its conditions", () => {
        expect(
            ruleConditionsLabel(
                { descriptionText: "COFFEE SHOP 123", accountId: undefined, amount: undefined },
                accounts,
                "USD"
            )
        ).toBe("COFFEE SHOP 123 · any account · any amount");
        expect(ruleConditionsLabel(GROUPED_RULE, accounts, "USD")).toBe(
            `COFFEE SHOP 123 · Everyday · ${formatAmountForRuleLabel(asMinorUnits(-450), "USD")}`
        );
    });

    it("formats an amount in the currency, falling back to the bare number", () => {
        expect(formatAmountForRuleLabel(asMinorUnits(-450), "USD", "en-US")).toBe("-$4.50");
        expect(formatAmountForRuleLabel(asMinorUnits(1234), "ZZZ", "en-US")).toBe("12.34");
        expect(formatAmountForRuleLabel(undefined, "USD", "en-US")).toBe("—");
    });

    const options = {
        aliases: [{ id: "alias-coffee", label: "Coffee" }],
        tags: [
            { id: "tag-a", label: "coffee" },
            { id: "tag-b", label: "work" }
        ],
        people: [
            { id: "person-a", label: "Alex" },
            { id: "person-b", label: "Sam" }
        ]
    };

    it.each([
        {
            field: "descriptionAlias",
            outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
            summary: "rename to “Coffee”"
        },
        {
            field: "tags",
            outputs: { tags: { mode: "add", tagIds: ["tag-a", "tag-b"] } },
            summary: "add #coffee #work"
        },
        {
            field: "tags",
            outputs: { tags: { mode: "set", tagIds: ["tag-a"] } },
            summary: "set #coffee"
        },
        {
            field: "allocation",
            outputs: { allocation: { "person-a": "50", "person-b": "" } },
            summary: "Alex 50% / Sam —"
        }
    ] as const)("summarises $field as $summary", ({ field, outputs, summary }) => {
        expect(outputValueSummary(field, outputs, options)).toBe(summary);
    });
});
