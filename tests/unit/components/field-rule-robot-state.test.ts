import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    computeFieldRuleRobotState,
    computeRuleCardStates,
    type RobotCurrentValue
} from "@/components/features/transactions/field-rule-robot-state";
import { asTransactionId } from "@/components/features/transactions/table-model/ids";
import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleOutputs,
    type RuleMatchSubject,
    RULE_REACH_ALL
} from "@/lib/domain/automation/rules";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";

const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");
const DESCRIPTION = "COFFEE SHOP 123";

function rule(overrides: {
    readonly id: string;
    readonly outputs: RuleOutputs;
    readonly descriptionText?: string;
    readonly accountId?: string;
    readonly amount?: MoneyMinorUnits;
    readonly createdAt?: Temporal.Instant;
}): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(overrides.id),
        descriptionText: overrides.descriptionText ?? DESCRIPTION,
        accountId: overrides.accountId,
        amount: overrides.amount,
        outputs: overrides.outputs,
        reach: RULE_REACH_ALL,
        createdAt: overrides.createdAt ?? CREATION
    };
}

const IMPORTED: RuleMatchSubject = {
    descriptionText: DESCRIPTION,
    accountId: "account-1",
    amount: asMinorUnits(-450),
    transactionId: asTransactionId("tx-1"),
    date: Temporal.PlainDate.from("2026-07-25"),
    isManual: false
};
const MANUAL: RuleMatchSubject = { ...IMPORTED, isManual: true };

function allocationOutputs(record: Record<string, number>): RuleOutputs {
    const allocations: Record<string, ReturnType<typeof AllocationPercentageSchema.parse>> = {};
    for (const [personId, value] of Object.entries(record)) {
        allocations[personId] = AllocationPercentageSchema.parse(value);
    }
    return { allocation: { allocations } };
}

describe("computeFieldRuleRobotState — tags", () => {
    it("is none when no tag rule matches the subject", () => {
        const rules = [rule({ id: "r1", outputs: { tags: { mode: "add", tagIds: ["a"] } } })];
        expect(
            computeFieldRuleRobotState(
                rules,
                { ...IMPORTED, descriptionText: "OTHER" },
                {
                    field: "tags",
                    currentTagIds: []
                }
            ).kind
        ).toBe("none");
    });

    it("add: match when the rule's tags are already present, drift otherwise", () => {
        const rules = [rule({ id: "r1", outputs: { tags: { mode: "add", tagIds: ["a"] } } })];
        expect(
            computeFieldRuleRobotState(rules, IMPORTED, {
                field: "tags",
                currentTagIds: ["a", "b"]
            }).kind
        ).toBe("match");
        expect(
            computeFieldRuleRobotState(rules, IMPORTED, { field: "tags", currentTagIds: ["b"] })
                .kind
        ).toBe("drift");
    });

    it("set: match only when the current set equals the rule's set exactly", () => {
        const rules = [rule({ id: "r1", outputs: { tags: { mode: "set", tagIds: ["a", "b"] } } })];
        expect(
            computeFieldRuleRobotState(rules, IMPORTED, {
                field: "tags",
                currentTagIds: ["a", "b"]
            }).kind
        ).toBe("match");
        // A superset drifts under "set" (which clears extras), unlike "add".
        expect(
            computeFieldRuleRobotState(rules, IMPORTED, {
                field: "tags",
                currentTagIds: ["a", "b", "c"]
            }).kind
        ).toBe("drift");
    });

    it("surfaces a tag robot on manual rows (frozen :294-295)", () => {
        const rules = [rule({ id: "r1", outputs: { tags: { mode: "add", tagIds: ["a"] } } })];
        expect(
            computeFieldRuleRobotState(rules, MANUAL, { field: "tags", currentTagIds: [] }).kind
        ).toBe("drift");
    });
});

describe("computeFieldRuleRobotState — allocation", () => {
    it("match iff the current explicit set equals the rule's whole spanning set", () => {
        const rules = [rule({ id: "r1", outputs: allocationOutputs({ "p-a": 60, "p-b": 40 }) })];
        expect(
            computeFieldRuleRobotState(rules, IMPORTED, {
                field: "allocation",
                currentAllocations: { "p-a": 60, "p-b": 40 }
            }).kind
        ).toBe("match");
        // A missing column in the current set drifts: the rule spans the whole set.
        expect(
            computeFieldRuleRobotState(rules, IMPORTED, {
                field: "allocation",
                currentAllocations: { "p-a": 60 }
            }).kind
        ).toBe("drift");
        // A differing value drifts.
        expect(
            computeFieldRuleRobotState(rules, IMPORTED, {
                field: "allocation",
                currentAllocations: { "p-a": 70, "p-b": 30 }
            }).kind
        ).toBe("drift");
    });

    it("surfaces an allocation robot on manual rows (frozen :294-295)", () => {
        const rules = [rule({ id: "r1", outputs: allocationOutputs({ "p-a": 100 }) })];
        expect(
            computeFieldRuleRobotState(rules, MANUAL, {
                field: "allocation",
                currentAllocations: {}
            }).kind
        ).toBe("drift");
    });
});

describe("computeFieldRuleRobotState — description parity and precedence", () => {
    it("hides the description robot on manual rows even when text would match", () => {
        const rules = [rule({ id: "r1", outputs: { descriptionAlias: { aliasId: "alias-a" } } })];
        expect(
            computeFieldRuleRobotState(rules, MANUAL, {
                field: "descriptionAlias",
                currentAliasId: "alias-a"
            }).kind
        ).toBe("none");
    });

    it("evaluates each field against only its own winning rule", () => {
        const rules = [
            rule({ id: "tag", outputs: { tags: { mode: "add", tagIds: ["a"] } } }),
            rule({ id: "alloc", outputs: allocationOutputs({ "p-a": 100 }) })
        ];
        // The tag field ignores the allocation rule and vice-versa.
        const tagState = computeFieldRuleRobotState(rules, IMPORTED, {
            field: "tags",
            currentTagIds: ["a"]
        });
        expect(tagState.kind).toBe("match");
        if (tagState.kind !== "none") expect(tagState.rule.id).toBe("tag");
    });

    it("picks the highest-precedence matching rule for the field", () => {
        const rules = [
            rule({ id: "broad", outputs: { tags: { mode: "set", tagIds: ["x"] } } }),
            rule({
                id: "specific",
                outputs: { tags: { mode: "set", tagIds: ["y"] } },
                accountId: IMPORTED.accountId,
                amount: IMPORTED.amount
            })
        ];
        const state = computeFieldRuleRobotState(rules, IMPORTED, {
            field: "tags",
            currentTagIds: ["y"]
        });
        expect(state.kind).toBe("match");
        if (state.kind !== "none") expect(state.rule.id).toBe("specific");
    });

    it("property: add-mode match iff the rule's tags are a subset of current tags", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 4 }),
                fc.uniqueArray(fc.string({ minLength: 1 }), { maxLength: 4 }),
                (ruleTags, currentTags) => {
                    const rules = [
                        rule({ id: "r1", outputs: { tags: { mode: "add", tagIds: ruleTags } } })
                    ];
                    const state = computeFieldRuleRobotState(rules, IMPORTED, {
                        field: "tags",
                        currentTagIds: currentTags
                    });
                    const subset = ruleTags.every((tag) => currentTags.includes(tag));
                    expect(state.kind).toBe(subset ? "match" : "drift");
                }
            )
        );
    });
});

describe("computeRuleCardStates", () => {
    const ALIAS = { descriptionAlias: { aliasId: "alias-coffee" } } as const;
    const TAGS = { tags: { mode: "add", tagIds: ["coffee"] } } as const;
    const CURRENTS: readonly RobotCurrentValue[] = [
        { field: "descriptionAlias", currentAliasId: "alias-coffee" },
        { field: "tags", currentTagIds: [] },
        { field: "allocation", currentAllocations: { p1: 100 } }
    ];

    it("gives one card per winning rule, grouping the fields it wins and drifts on", () => {
        const grouped = rule({ id: "r-grouped", outputs: { ...ALIAS, ...TAGS } });
        const allocation = rule({ id: "r-alloc", outputs: allocationOutputs({ p1: 50, p2: 50 }) });
        expect(computeRuleCardStates([grouped, allocation], IMPORTED, CURRENTS)).toEqual([
            { rule: allocation, wonFields: ["allocation"], driftFields: ["allocation"] },
            { rule: grouped, wonFields: ["descriptionAlias", "tags"], driftFields: ["tags"] }
        ]);
    });

    it("orders the most specific rule first, then by id, whatever the input order", () => {
        const unscoped = rule({ id: "r-a", outputs: ALIAS });
        const accountScoped = rule({ id: "r-z", outputs: TAGS, accountId: "account-1" });
        const amountScoped = rule({
            id: "r-m",
            outputs: allocationOutputs({ p1: 100 }),
            amount: asMinorUnits(-450)
        });
        for (const rules of [
            [unscoped, accountScoped, amountScoped],
            [amountScoped, unscoped, accountScoped]
        ]) {
            expect(
                computeRuleCardStates(rules, IMPORTED, CURRENTS).map((state) => state.rule.id)
            ).toEqual(["r-z", "r-m", "r-a"]);
        }
    });

    it("gives no card, and so no drift marker, to a rule that wins nothing on the row", () => {
        // The broader grouped rule still has a tags output, but the account rule wins tags here.
        const broad = rule({ id: "r-broad", outputs: { ...ALIAS, ...TAGS } });
        const narrow = rule({
            id: "r-narrow",
            outputs: { tags: { mode: "add", tagIds: ["work"] } },
            accountId: "account-1"
        });
        const states = computeRuleCardStates([broad, narrow], IMPORTED, CURRENTS);
        expect(states.find((state) => state.rule.id === "r-broad")).toEqual({
            rule: broad,
            wonFields: ["descriptionAlias"],
            driftFields: []
        });
    });

    it("is empty when no rule matches", () => {
        expect(computeRuleCardStates([], IMPORTED, CURRENTS)).toEqual([]);
    });
});
