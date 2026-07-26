import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { computeDescriptionRobotState } from "@/components/features/transactions/description-rule-state";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleMatchSubject
} from "@/lib/domain/automation/rules";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";

const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");

function aliasRule(overrides: {
    readonly id: string;
    readonly descriptionText: string;
    readonly aliasId: string;
    readonly accountId?: string;
    readonly amount?: MoneyMinorUnits;
    readonly createdAt?: Temporal.Instant;
}): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(overrides.id),
        descriptionText: overrides.descriptionText,
        accountId: overrides.accountId,
        amount: overrides.amount,
        action: { field: "descriptionAlias", aliasId: overrides.aliasId },
        createdAt: overrides.createdAt ?? CREATION
    };
}

function tagRule(id: string, descriptionText: string): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(id),
        descriptionText,
        action: { field: "tags", mode: "add", tagIds: ["tag-1"] },
        createdAt: CREATION
    };
}

const DESCRIPTION = "COFFEE SHOP 123";

const SUBJECT: RuleMatchSubject = {
    descriptionText: DESCRIPTION,
    accountId: "account-1",
    amount: asMinorUnits(-450),
    isManual: false
};

describe("computeDescriptionRobotState", () => {
    it("returns none when no rule matches the subject", () => {
        const rules = [aliasRule({ id: "r1", descriptionText: "OTHER", aliasId: "alias-a" })];
        expect(computeDescriptionRobotState(rules, SUBJECT, "alias-a").kind).toBe("none");
    });

    it("returns none for a manual transaction even when text would match", () => {
        const rules = [aliasRule({ id: "r1", descriptionText: DESCRIPTION, aliasId: "alias-a" })];
        const manual: RuleMatchSubject = { ...SUBJECT, isManual: true };
        expect(computeDescriptionRobotState(rules, manual, "alias-a").kind).toBe("none");
    });

    it("returns match when the current alias equals the winning rule's alias", () => {
        const rules = [aliasRule({ id: "r1", descriptionText: DESCRIPTION, aliasId: "alias-a" })];
        const state = computeDescriptionRobotState(rules, SUBJECT, "alias-a");
        expect(state.kind).toBe("match");
        if (state.kind === "match") expect(state.rule.id).toBe("r1");
    });

    it("returns drift when the current alias differs from the winning rule's alias", () => {
        const rules = [aliasRule({ id: "r1", descriptionText: DESCRIPTION, aliasId: "alias-a" })];
        const state = computeDescriptionRobotState(rules, SUBJECT, "alias-b");
        expect(state.kind).toBe("drift");
        if (state.kind === "drift") expect(state.rule.id).toBe("r1");
    });

    it("returns drift when the transaction has no alias but a rule matches", () => {
        const rules = [aliasRule({ id: "r1", descriptionText: DESCRIPTION, aliasId: "alias-a" })];
        expect(computeDescriptionRobotState(rules, SUBJECT, null).kind).toBe("drift");
    });

    it("ignores non-descriptionAlias rules that match the same text", () => {
        const rules = [tagRule("t1", DESCRIPTION)];
        expect(computeDescriptionRobotState(rules, SUBJECT, "alias-a").kind).toBe("none");
    });

    it("selects the highest-precedence matching rule across overlapping scopes", () => {
        // Unscoped implies alias-a; account+amount scoped implies alias-b. The most specific wins.
        const rules = [
            aliasRule({
                id: "unscoped",
                descriptionText: DESCRIPTION,
                aliasId: "alias-a"
            }),
            aliasRule({
                id: "acct-amount",
                descriptionText: DESCRIPTION,
                aliasId: "alias-b",
                accountId: SUBJECT.accountId,
                amount: SUBJECT.amount
            })
        ];
        // Alias matches the specific rule -> normal robot for the winner.
        const matchState = computeDescriptionRobotState(rules, SUBJECT, "alias-b");
        expect(matchState.kind).toBe("match");
        if (matchState.kind === "match") expect(matchState.rule.id).toBe("acct-amount");
        // Alias matches only the broad rule -> drift, because the winner is the specific rule.
        const driftState = computeDescriptionRobotState(rules, SUBJECT, "alias-a");
        expect(driftState.kind).toBe("drift");
        if (driftState.kind === "drift") expect(driftState.rule.id).toBe("acct-amount");
    });

    it("match iff current alias equals the sole matching rule's implied alias", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.string({ minLength: 1 }),
                (impliedAlias, currentAlias) => {
                    const rules = [
                        aliasRule({
                            id: "r1",
                            descriptionText: DESCRIPTION,
                            aliasId: impliedAlias
                        })
                    ];
                    const state = computeDescriptionRobotState(rules, SUBJECT, currentAlias);
                    if (currentAlias === impliedAlias) expect(state.kind).toBe("match");
                    else expect(state.kind).toBe("drift");
                }
            )
        );
    });
});
