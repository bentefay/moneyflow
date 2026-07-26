import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleAction,
    type RuleField,
    type RuleMatchSubject,
    decodeFieldRule,
    dedupeRulesByUniqueness,
    fieldAppliesToManual,
    groupRulesByUniquenessKey,
    hasUniqueRuleKeys,
    isNewerTransactionDate,
    resolveTagRuleResult,
    ruleMatchesSubject,
    ruleScopeRank,
    ruleUniquenessKey,
    selectWinningRule,
    selectWinningRulesByField
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const SHUFFLE_SEED = 17_010_001;
const PROPERTY_RUNS = 500;
const BASE_INSTANT = Temporal.Instant.from("2026-01-01T00:00:00Z");

interface MakeRuleInput {
    readonly id: string;
    readonly descriptionText: string;
    readonly accountId?: string;
    readonly amount?: number;
    readonly action?: RuleAction;
    readonly createdAtOffsetMs?: number;
}

function tagsAction(
    mode: "add" | "set",
    tagIds: readonly string[]
): Extract<RuleAction, { field: "tags" }> {
    return { field: "tags", mode, tagIds };
}

function makeRule(input: MakeRuleInput): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(input.id),
        descriptionText: input.descriptionText,
        accountId: input.accountId,
        amount: input.amount == null ? undefined : asMinorUnits(input.amount),
        action: input.action ?? tagsAction("add", ["tag-a"]),
        createdAt: BASE_INSTANT.add({ milliseconds: input.createdAtOffsetMs ?? 0 })
    };
}

function subject(overrides: Partial<RuleMatchSubject> = {}): RuleMatchSubject {
    return {
        descriptionText: "COFFEE SHOP 123",
        accountId: "acct-checking",
        amount: asMinorUnits(-450),
        isManual: false,
        ...overrides
    };
}

describe("ruleScopeRank", () => {
    it.each([
        { accountId: undefined, amount: undefined, rank: 0 },
        { accountId: undefined, amount: -450, rank: 1 },
        { accountId: "acct-checking", amount: undefined, rank: 2 },
        { accountId: "acct-checking", amount: -450, rank: 3 }
    ])("ranks account=$accountId amount=$amount as $rank", ({ accountId, amount, rank }) => {
        const rule = makeRule({ id: "r1", descriptionText: "X", accountId, amount });
        expect(ruleScopeRank(rule)).toBe(rank);
    });
});

describe("uniqueness", () => {
    it("collides only on identical field + text + scope", () => {
        const a = makeRule({ id: "r1", descriptionText: "X" });
        const b = makeRule({ id: "r2", descriptionText: "X" });
        expect(ruleUniquenessKey(a)).toBe(ruleUniquenessKey(b));
    });

    it("distinguishes scope, text and field", () => {
        const unscoped = makeRule({ id: "r1", descriptionText: "X" });
        const amountScoped = makeRule({ id: "r2", descriptionText: "X", amount: -450 });
        const otherText = makeRule({ id: "r3", descriptionText: "Y" });
        const otherField = makeRule({
            id: "r4",
            descriptionText: "X",
            action: { field: "descriptionAlias", aliasId: "alias-1" }
        });
        const keys = new Set([
            ruleUniquenessKey(unscoped),
            ruleUniquenessKey(amountScoped),
            ruleUniquenessKey(otherText),
            ruleUniquenessKey(otherField)
        ]);
        expect(keys.size).toBe(4);
    });

    it("detects duplicate keys and groups them", () => {
        const rules = [
            makeRule({ id: "r1", descriptionText: "X" }),
            makeRule({ id: "r2", descriptionText: "X" }),
            makeRule({ id: "r3", descriptionText: "Y" })
        ];
        expect(hasUniqueRuleKeys(rules)).toBe(false);
        const grouped = groupRulesByUniquenessKey(rules);
        expect(grouped.size).toBe(2);
    });

    it("dedupe keeps most recent per slot and is order-independent", () => {
        const older = makeRule({ id: "r1", descriptionText: "X", createdAtOffsetMs: 0 });
        const newer = makeRule({ id: "r2", descriptionText: "X", createdAtOffsetMs: 1000 });
        const forward = dedupeRulesByUniqueness([older, newer]);
        const reverse = dedupeRulesByUniqueness([newer, older]);
        expect(forward).toHaveLength(1);
        expect(forward[0]?.id).toBe(newer.id);
        expect(reverse[0]?.id).toBe(newer.id);
        expect(hasUniqueRuleKeys(forward)).toBe(true);
    });
});

describe("ruleMatchesSubject", () => {
    it("requires exact description text (no substring/case folding)", () => {
        const rule = makeRule({ id: "r1", descriptionText: "COFFEE SHOP 123" });
        expect(ruleMatchesSubject(rule, subject())).toBe(true);
        expect(ruleMatchesSubject(rule, subject({ descriptionText: "coffee shop 123" }))).toBe(
            false
        );
        expect(ruleMatchesSubject(rule, subject({ descriptionText: "COFFEE SHOP 1234" }))).toBe(
            false
        );
    });

    it("honours account and amount narrowing", () => {
        const scoped = makeRule({
            id: "r1",
            descriptionText: "COFFEE SHOP 123",
            accountId: "acct-checking",
            amount: -450
        });
        expect(ruleMatchesSubject(scoped, subject())).toBe(true);
        expect(ruleMatchesSubject(scoped, subject({ accountId: "acct-savings" }))).toBe(false);
        expect(ruleMatchesSubject(scoped, subject({ amount: asMinorUnits(-999) }))).toBe(false);
    });

    it("never matches a null description", () => {
        const rule = makeRule({ id: "r1", descriptionText: "COFFEE SHOP 123" });
        expect(ruleMatchesSubject(rule, subject({ descriptionText: null }))).toBe(false);
    });

    it("excludes manual rows from description-alias rules but not tag/allocation rules", () => {
        const manual = subject({ isManual: true });
        const aliasRule = makeRule({
            id: "r1",
            descriptionText: "COFFEE SHOP 123",
            action: { field: "descriptionAlias", aliasId: "alias-1" }
        });
        const tagRule = makeRule({ id: "r2", descriptionText: "COFFEE SHOP 123" });
        expect(ruleMatchesSubject(aliasRule, manual)).toBe(false);
        expect(ruleMatchesSubject(tagRule, manual)).toBe(true);
    });

    it.each<[RuleField, boolean]>([
        ["descriptionAlias", false],
        ["tags", true],
        ["allocation", true]
    ])("fieldAppliesToManual(%s) = %s", (field, expected) => {
        expect(fieldAppliesToManual(field)).toBe(expected);
    });
});

describe("selectWinningRule precedence", () => {
    const unscoped = makeRule({ id: "r-unscoped", descriptionText: "COFFEE SHOP 123" });
    const amountScoped = makeRule({
        id: "r-amount",
        descriptionText: "COFFEE SHOP 123",
        amount: -450
    });
    const accountScoped = makeRule({
        id: "r-account",
        descriptionText: "COFFEE SHOP 123",
        accountId: "acct-checking"
    });
    const bothScoped = makeRule({
        id: "r-both",
        descriptionText: "COFFEE SHOP 123",
        accountId: "acct-checking",
        amount: -450
    });
    const all = [unscoped, amountScoped, accountScoped, bothScoped];

    it("selects the single highest-precedence match", () => {
        expect(selectWinningRule(all, "tags", subject())?.id).toBe(bothScoped.id);
    });

    it("account-scoped beats amount-scoped beats unscoped", () => {
        expect(
            selectWinningRule([unscoped, amountScoped, accountScoped], "tags", subject())?.id
        ).toBe(accountScoped.id);
        expect(selectWinningRule([unscoped, amountScoped], "tags", subject())?.id).toBe(
            amountScoped.id
        );
        expect(selectWinningRule([unscoped], "tags", subject())?.id).toBe(unscoped.id);
    });

    it("returns null when nothing matches", () => {
        expect(selectWinningRule(all, "tags", subject({ descriptionText: "OTHER" }))).toBeNull();
        expect(selectWinningRule(all, "allocation", subject())).toBeNull();
    });

    it("is order-independent under shuffle", () => {
        fc.assert(
            fc.property(fc.shuffledSubarray(all, { minLength: all.length }), (shuffled) => {
                expect(selectWinningRule(shuffled, "tags", subject())?.id).toBe(bothScoped.id);
            }),
            { seed: SHUFFLE_SEED, numRuns: PROPERTY_RUNS }
        );
    });

    it("selectWinningRulesByField isolates fields", () => {
        const aliasRule = makeRule({
            id: "r-alias",
            descriptionText: "COFFEE SHOP 123",
            action: { field: "descriptionAlias", aliasId: "alias-1" }
        });
        const winners = selectWinningRulesByField([...all, aliasRule], subject());
        expect(winners.tags?.id).toBe(bothScoped.id);
        expect(winners.descriptionAlias?.id).toBe(aliasRule.id);
        expect(winners.allocation).toBeUndefined();
    });
});

describe("isNewerTransactionDate", () => {
    it("is strict calendar-date greater-than (no time/zone)", () => {
        const ref = Temporal.PlainDate.from("2026-03-10");
        expect(isNewerTransactionDate(Temporal.PlainDate.from("2026-03-11"), ref)).toBe(true);
        expect(isNewerTransactionDate(Temporal.PlainDate.from("2026-03-10"), ref)).toBe(false);
        expect(isNewerTransactionDate(Temporal.PlainDate.from("2026-03-09"), ref)).toBe(false);
    });
});

describe("resolveTagRuleResult", () => {
    it("set replaces existing tags", () => {
        expect(resolveTagRuleResult(["old"], tagsAction("set", ["a", "b"]))).toEqual(["a", "b"]);
    });

    it("add unions preserving order and de-duplicating", () => {
        expect(resolveTagRuleResult(["a"], tagsAction("add", ["b", "a", "c"]))).toEqual([
            "a",
            "b",
            "c"
        ]);
    });

    it("is idempotent under re-application", () => {
        const action = tagsAction("add", ["b", "c"]);
        const once = resolveTagRuleResult(["a"], action);
        const twice = resolveTagRuleResult([...once], action);
        expect(twice).toEqual(once);
    });
});

describe("decodeFieldRule", () => {
    const createdAtEpochMs = BASE_INSTANT.epochMilliseconds;

    it("decodes a valid tags rule", () => {
        const result = decodeFieldRule({
            id: "rule-1",
            field: "tags",
            descriptionText: "COFFEE SHOP 123",
            accountId: "acct-checking",
            amount: -450,
            tagMode: "add",
            tagIds: ["t1", "t1", "t2"],
            createdAtEpochMs
        });
        expect(result.ok).toBe(true);
        if (result.ok && result.value.action.field === "tags") {
            expect(result.value.action.tagIds).toEqual(["t1", "t2"]);
            expect(result.value.amount).toBe(asMinorUnits(-450));
        }
    });

    it("decodes a valid allocation rule via validateAllocationSet", () => {
        const result = decodeFieldRule({
            id: "rule-2",
            field: "allocation",
            descriptionText: "RENT",
            allocations: { "person-a": 60, "person-b": 40 },
            createdAtEpochMs
        });
        expect(result.ok).toBe(true);
        if (result.ok && result.value.action.field === "allocation") {
            expect(Object.keys(result.value.action.allocations).sort()).toEqual([
                "person-a",
                "person-b"
            ]);
        }
    });

    it("rejects an invalid allocation set without normalising", () => {
        const result = decodeFieldRule({
            id: "rule-3",
            field: "allocation",
            descriptionText: "RENT",
            allocations: { "person-a": 999 },
            createdAtEpochMs
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.type).toBe("invalid-allocations");
    });

    it("rejects a descriptionAlias rule missing aliasId", () => {
        const result = decodeFieldRule({
            id: "rule-4",
            field: "descriptionAlias",
            descriptionText: "COFFEE SHOP 123",
            createdAtEpochMs
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.type).toBe("invalid-shape");
    });

    it("rejects an empty id", () => {
        const result = decodeFieldRule({
            id: "",
            field: "tags",
            descriptionText: "X",
            tagMode: "add",
            createdAtEpochMs
        });
        expect(result.ok).toBe(false);
    });
});
