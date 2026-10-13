import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    addDraftOutput,
    draftApplyMode,
    draftOutputFields,
    draftRuleContentEquals,
    emptyRuleDraft,
    rememberedChoiceFromDraft,
    type RuleEditorDraft,
    type RuleEditorFieldErrors,
    unsavedOutputField,
    validateRuleDraft
} from "@/components/features/automations/rule-editor-model";
import { APPLY_MODES, applyModeFrom, type ApplyScope } from "@/lib/domain/automation/apply-mode";
import {
    DEFAULT_REMEMBERED_CHOICE,
    type RememberedRuleChoice
} from "@/lib/domain/automation/preferences";

const BASE: RuleEditorDraft = {
    ...emptyRuleDraft(DEFAULT_REMEMBERED_CHOICE),
    descriptionText: "COFFEE"
};

function draft(overrides: Partial<RuleEditorDraft>): RuleEditorDraft {
    return { ...BASE, ...overrides };
}

const TAGS_ONLY = { tags: { mode: "add", tagIds: ["t1"] } } as const;

describe("emptyRuleDraft", () => {
    it("starts with no description, no restriction and no output", () => {
        const empty = emptyRuleDraft(DEFAULT_REMEMBERED_CHOICE);
        expect(empty.descriptionText).toBe("");
        expect(empty.useAccountScope).toBe(false);
        expect(empty.useAmountScope).toBe(false);
        expect(draftOutputFields(empty)).toEqual([]);
    });

    it.each(APPLY_MODES)(
        "takes scope and Apply on blur from the remembered %s choice and maps back to it",
        (applyMode) => {
            const remembered: RememberedRuleChoice = { ...DEFAULT_REMEMBERED_CHOICE, applyMode };
            expect(draftApplyMode(emptyRuleDraft(remembered))).toBe(applyMode);
        }
    );
});

describe("scope and Apply on blur round-trip through applyModeFrom", () => {
    it("persists exactly the four-mode value the two controls encode", () => {
        fc.assert(
            fc.property(
                fc.constantFrom<ApplyScope>("all", "new"),
                fc.boolean(),
                (scope, applyOnBlur) => {
                    const choice = rememberedChoiceFromDraft(
                        draft({ scope, applyOnBlur, outputs: TAGS_ONLY }),
                        DEFAULT_REMEMBERED_CHOICE
                    );
                    expect(choice.applyMode).toBe(applyModeFrom(scope, applyOnBlur));
                    const reopened = emptyRuleDraft(choice);
                    expect(reopened.scope).toBe(scope);
                    expect(reopened.applyOnBlur).toBe(applyOnBlur);
                }
            )
        );
    });
});

describe("rememberedChoiceFromDraft", () => {
    it("keeps the previous field and tag mode when the draft has no tags output", () => {
        const previous: RememberedRuleChoice = {
            ...DEFAULT_REMEMBERED_CHOICE,
            field: "allocation",
            tagMode: "set"
        };
        const choice = rememberedChoiceFromDraft(draft({ outputs: {} }), previous);
        expect(choice.field).toBe("allocation");
        expect(choice.tagMode).toBe("set");
    });

    it("remembers the first output field and the tags output's mode", () => {
        const choice = rememberedChoiceFromDraft(
            draft({
                outputs: {
                    descriptionAlias: { aliasId: "a" },
                    tags: { mode: "set", tagIds: [] }
                },
                useAccountScope: true
            }),
            DEFAULT_REMEMBERED_CHOICE
        );
        expect(choice.field).toBe("descriptionAlias");
        expect(choice.tagMode).toBe("set");
        expect(choice.useAccountScope).toBe(true);
    });
});

describe("addDraftOutput", () => {
    it.each([
        { field: "descriptionAlias", expected: { descriptionAlias: { aliasId: "" } } },
        { field: "tags", expected: { tags: { mode: "set", tagIds: [] } } },
        { field: "allocation", expected: { allocation: {} } }
    ] as const)("adds an empty $field output", ({ field, expected }) => {
        expect(addDraftOutput(draft({ outputs: {} }), field, "set").outputs).toEqual(expected);
    });

    it("never replaces an output the draft already has", () => {
        const existing = draft({ outputs: TAGS_ONLY });
        expect(addDraftOutput(existing, "tags", "set")).toBe(existing);
    });

    it("lists outputs in rule-field order whatever order they were added in", () => {
        const withAllocation = addDraftOutput(draft({ outputs: {} }), "allocation", "add");
        const withAlias = addDraftOutput(withAllocation, "descriptionAlias", "add");
        expect(draftOutputFields(withAlias)).toEqual(["descriptionAlias", "allocation"]);
    });
});

describe("validateRuleDraft", () => {
    type Case = {
        readonly name: string;
        readonly draft: RuleEditorDraft;
        readonly errors: readonly (keyof RuleEditorFieldErrors)[];
    };

    const invalid: readonly Case[] = [
        { name: "zero outputs", draft: draft({ outputs: {} }), errors: ["outputs"] },
        {
            name: "a blank description",
            draft: draft({ descriptionText: "  ", outputs: TAGS_ONLY }),
            errors: ["descriptionText"]
        },
        {
            name: "an account restriction with no account",
            draft: draft({ useAccountScope: true, accountId: "", outputs: TAGS_ONLY }),
            errors: ["accountId"]
        },
        {
            name: "an empty amount restriction",
            draft: draft({ useAmountScope: true, amountText: " ", outputs: TAGS_ONLY }),
            errors: ["amount"]
        },
        {
            name: "a non-numeric amount",
            draft: draft({ useAmountScope: true, amountText: "abc", outputs: TAGS_ONLY }),
            errors: ["amount"]
        },
        {
            name: "an alias output with no alias",
            draft: draft({ outputs: { descriptionAlias: { aliasId: "" } } }),
            errors: ["aliasId"]
        },
        {
            name: "an add-mode tags output with no tag",
            draft: draft({ outputs: { tags: { mode: "add", tagIds: [] } } }),
            errors: ["tagIds"]
        },
        {
            name: "an allocation output with every cell blank",
            draft: draft({ outputs: { allocation: { p1: "", p2: "  " } } }),
            errors: ["allocations"]
        },
        {
            name: "an allocation output with a non-numeric cell",
            draft: draft({ outputs: { allocation: { p1: "lots" } } }),
            errors: ["allocations"]
        },
        {
            name: "every output invalid at once",
            draft: draft({
                outputs: {
                    descriptionAlias: { aliasId: "" },
                    tags: { mode: "add", tagIds: [] },
                    allocation: {}
                }
            }),
            errors: ["aliasId", "tagIds", "allocations"]
        },
        {
            name: "one valid output beside an invalid one",
            draft: draft({
                outputs: { descriptionAlias: { aliasId: "a" }, tags: { mode: "add", tagIds: [] } }
            }),
            errors: ["tagIds"]
        }
    ];

    it.each(invalid)("rejects $name, reporting exactly the broken parts", (testCase) => {
        const result = validateRuleDraft(testCase.draft, "USD");
        expect(result.ok).toBe(false);
        if (result.ok) return;
        const reported = Object.entries(result.errors)
            .filter(([, message]) => message != null)
            .map(([key]) => key)
            .sort();
        expect(reported).toEqual([...testCase.errors].sort());
    });

    const valid = [
        {
            name: "an unscoped tags rule",
            draft: draft({ outputs: TAGS_ONLY }),
            outputs: { tags: { mode: "add", tagIds: ["t1"] } }
        },
        {
            name: "a set-mode tags output with no tag, which clears tags",
            draft: draft({ outputs: { tags: { mode: "set", tagIds: [] } } }),
            outputs: { tags: { mode: "set", tagIds: [] } }
        },
        {
            name: "three outputs together",
            draft: draft({
                outputs: {
                    descriptionAlias: { aliasId: " alias-1 " },
                    tags: { mode: "add", tagIds: ["t1", ""] },
                    allocation: { p1: "50", p2: "50" }
                }
            }),
            outputs: {
                descriptionAlias: { aliasId: "alias-1" },
                tags: { mode: "add", tagIds: ["t1"] },
                allocation: { allocations: { p1: 50, p2: 50 } }
            }
        },
        {
            name: "blank allocation cells as no answer but an explicit 0 as 0",
            draft: draft({ outputs: { allocation: { p1: "100", p2: "0", p3: "" } } }),
            outputs: { allocation: { allocations: { p1: 100, p2: 0 } } }
        }
    ] as const;

    it.each(valid)("accepts $name", (testCase) => {
        const result = validateRuleDraft(testCase.draft, "USD");
        expect(result).toEqual({
            ok: true,
            value: { accountId: undefined, amount: undefined, outputs: testCase.outputs }
        });
    });

    it.each([
        { currency: "USD", text: "12.34", minor: 1234 },
        { currency: "USD", text: "-4.5", minor: -450 },
        { currency: "JPY", text: "1234", minor: 1234 }
    ])("parses $text $currency into $minor minor units", ({ currency, text, minor }) => {
        const result = validateRuleDraft(
            draft({ useAmountScope: true, amountText: text, outputs: TAGS_ONLY }),
            currency
        );
        expect(result.ok && result.value.amount).toBe(minor);
    });

    it("writes the account only while the account restriction is on", () => {
        const on = validateRuleDraft(
            draft({ useAccountScope: true, accountId: "acc-1", outputs: TAGS_ONLY }),
            "USD"
        );
        const off = validateRuleDraft(
            draft({ useAccountScope: false, accountId: "acc-1", outputs: TAGS_ONLY }),
            "USD"
        );
        expect(on.ok && on.value.accountId).toBe("acc-1");
        expect(off.ok && off.value.accountId).toBeUndefined();
    });
});

describe("draftRuleContentEquals", () => {
    const STORED = draft({
        useAccountScope: true,
        accountId: "acc-1",
        useAmountScope: true,
        amountText: "12.5",
        outputs: {
            descriptionAlias: { aliasId: "a1" },
            tags: { mode: "add", tagIds: ["t1", "t2"] },
            allocation: { p1: "60", p2: "40" }
        }
    });

    it.each<readonly [string, RuleEditorDraft]>([
        ["the same draft", STORED],
        ["a different scope and Apply on blur", { ...STORED, scope: "new", applyOnBlur: true }],
        [
            "reordered tags",
            {
                ...STORED,
                outputs: { ...STORED.outputs, tags: { mode: "add", tagIds: ["t2", "t1"] } }
            }
        ],
        [
            "a blank allocation answer",
            {
                ...STORED,
                outputs: { ...STORED.outputs, allocation: { p1: "60", p2: "40", p3: " " } }
            }
        ],
        ["surrounding spaces on the amount", { ...STORED, amountText: " 12.5 " }],
        [
            "a stale account id behind an unticked restriction",
            { ...draft({ ...STORED, useAccountScope: false }), accountId: "other" }
        ]
    ])("treats %s as the same rule", (_label, candidate) => {
        const base =
            candidate.useAccountScope === STORED.useAccountScope
                ? STORED
                : { ...STORED, useAccountScope: false };
        expect(draftRuleContentEquals(candidate, base)).toBe(true);
        expect(draftRuleContentEquals(base, candidate)).toBe(true);
    });

    it.each<readonly [string, RuleEditorDraft]>([
        ["another description", { ...STORED, descriptionText: "TEA" }],
        ["an unticked account restriction", { ...STORED, useAccountScope: false }],
        ["another account", { ...STORED, accountId: "acc-2" }],
        ["an unticked amount restriction", { ...STORED, useAmountScope: false }],
        ["another amount", { ...STORED, amountText: "13" }],
        [
            "another alias",
            { ...STORED, outputs: { ...STORED.outputs, descriptionAlias: { aliasId: "a2" } } }
        ],
        [
            "a removed alias",
            {
                ...STORED,
                outputs: { tags: STORED.outputs.tags, allocation: STORED.outputs.allocation }
            }
        ],
        [
            "another tag mode",
            {
                ...STORED,
                outputs: { ...STORED.outputs, tags: { mode: "set", tagIds: ["t1", "t2"] } }
            }
        ],
        [
            "another tag set",
            { ...STORED, outputs: { ...STORED.outputs, tags: { mode: "add", tagIds: ["t1"] } } }
        ],
        [
            "another percentage",
            { ...STORED, outputs: { ...STORED.outputs, allocation: { p1: "50", p2: "50" } } }
        ],
        ["an added output", { ...draft({ outputs: { tags: { mode: "add", tagIds: ["t1"] } } }) }]
    ])("treats %s as a different rule", (_label, candidate) => {
        expect(draftRuleContentEquals(candidate, STORED)).toBe(false);
        expect(draftRuleContentEquals(STORED, candidate)).toBe(false);
    });
});

describe("unsavedOutputField", () => {
    it("names an output the draft has and the stored rule lacks", () => {
        expect(
            unsavedOutputField(draft({ outputs: { ...TAGS_ONLY, allocation: {} } }), TAGS_ONLY)
        ).toBe("allocation");
    });

    it("is undefined when every draft output is stored, even if its value changed", () => {
        expect(
            unsavedOutputField(draft({ outputs: { tags: { mode: "set", tagIds: [] } } }), TAGS_ONLY)
        ).toBeUndefined();
    });
});
