import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { computeFieldRuleRobotState } from "@/components/features/transactions/field-rule-robot-state";
import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleAction,
    type RuleMatchSubject
} from "@/lib/domain/automation/rules";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";

const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");
const DESCRIPTION = "COFFEE SHOP 123";

function rule(overrides: {
    readonly id: string;
    readonly action: RuleAction;
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
        action: overrides.action,
        createdAt: overrides.createdAt ?? CREATION
    };
}

const IMPORTED: RuleMatchSubject = {
    descriptionText: DESCRIPTION,
    accountId: "account-1",
    amount: asMinorUnits(-450),
    isManual: false
};
const MANUAL: RuleMatchSubject = { ...IMPORTED, isManual: true };

function allocationAction(record: Record<string, number>): RuleAction {
    const allocations: Record<string, ReturnType<typeof AllocationPercentageSchema.parse>> = {};
    for (const [personId, value] of Object.entries(record)) {
        allocations[personId] = AllocationPercentageSchema.parse(value);
    }
    return { field: "allocation", allocations };
}

describe("computeFieldRuleRobotState — tags", () => {
    it("is none when no tag rule matches the subject", () => {
        const rules = [rule({ id: "r1", action: { field: "tags", mode: "add", tagIds: ["a"] } })];
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
        const rules = [rule({ id: "r1", action: { field: "tags", mode: "add", tagIds: ["a"] } })];
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
        const rules = [
            rule({ id: "r1", action: { field: "tags", mode: "set", tagIds: ["a", "b"] } })
        ];
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
        const rules = [rule({ id: "r1", action: { field: "tags", mode: "add", tagIds: ["a"] } })];
        expect(
            computeFieldRuleRobotState(rules, MANUAL, { field: "tags", currentTagIds: [] }).kind
        ).toBe("drift");
    });
});

describe("computeFieldRuleRobotState — allocation", () => {
    it("match iff the current explicit set equals the rule's whole spanning set", () => {
        const rules = [rule({ id: "r1", action: allocationAction({ "p-a": 60, "p-b": 40 }) })];
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
        const rules = [rule({ id: "r1", action: allocationAction({ "p-a": 100 }) })];
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
        const rules = [
            rule({ id: "r1", action: { field: "descriptionAlias", aliasId: "alias-a" } })
        ];
        expect(
            computeFieldRuleRobotState(rules, MANUAL, {
                field: "descriptionAlias",
                currentAliasId: "alias-a"
            }).kind
        ).toBe("none");
    });

    it("evaluates each field against only its own winning rule", () => {
        const rules = [
            rule({ id: "tag", action: { field: "tags", mode: "add", tagIds: ["a"] } }),
            rule({ id: "alloc", action: allocationAction({ "p-a": 100 }) })
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
            rule({ id: "broad", action: { field: "tags", mode: "set", tagIds: ["x"] } }),
            rule({
                id: "specific",
                action: { field: "tags", mode: "set", tagIds: ["y"] },
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
                        rule({ id: "r1", action: { field: "tags", mode: "add", tagIds: ruleTags } })
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
