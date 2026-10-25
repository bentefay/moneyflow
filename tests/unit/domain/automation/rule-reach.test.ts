/**
 * Rule reach (`specs/017-rule-reach` §2): which matching transactions a rule governs, how reach
 * ranks above the conditions, how it widens uniqueness, how it survives the wire, how it changes the
 * "N transactions change" count, and which rule a one-row rule can be folded into.
 *
 * The fixtures follow the spec's worked examples: three `COFFEE SHOP 123` rows A (2 Jul), B (25 Jul)
 * and C (3 Aug), plus rows imported on 1 Jun and 10 Aug.
 */

import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    asTransactionId,
    type TransactionId
} from "@/components/features/transactions/table-model/ids";
import { type RuleFoldOffer, resolveRuleFoldOffer } from "@/lib/domain/automation/extension";
import {
    countRulePopulation,
    type RulePopulationTransaction
} from "@/lib/domain/automation/population";
import { buildRuleIndex } from "@/lib/domain/automation/rule-index";
import {
    compareRulePrecedence,
    decodeFieldRule,
    dedupeRulesByUniqueness,
    encodeFieldRule,
    type FieldRule,
    FieldRuleIdSchema,
    hasUniqueRuleKeys,
    RULE_FIELDS,
    RULE_REACH_ALL,
    type RuleField,
    ruleGoverns,
    type RuleMatchSubject,
    type RuleOutputs,
    type RuleReach,
    ruleReachRank,
    ruleReaches,
    ruleReachesEqual,
    rulesShareUniquenessSlot,
    selectWinningRule
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const TEXT = "COFFEE SHOP 123";
const BASE_INSTANT = Temporal.Instant.from("2026-07-01T00:00:00Z");
const SEED = 17_017_001;

const JUN_1 = Temporal.PlainDate.from("2026-06-01");
const JUL_2 = Temporal.PlainDate.from("2026-07-02");
const JUL_24 = Temporal.PlainDate.from("2026-07-24");
const JUL_25 = Temporal.PlainDate.from("2026-07-25");
const AUG_3 = Temporal.PlainDate.from("2026-08-03");

const A = asTransactionId("A");
const B = asTransactionId("B");
const C = asTransactionId("C");

const WORK: RuleOutputs = { tags: { mode: "add", tagIds: ["work"] } };
const HOME: RuleOutputs = { tags: { mode: "add", tagIds: ["home"] } };
const COFFEE_ALIAS: RuleOutputs = { descriptionAlias: { aliasId: "alias-coffee" } };

function only(...ids: readonly TransactionId[]): RuleReach {
    return { kind: "transactions", ids: new Set(ids) };
}

function from(date: Temporal.PlainDate): RuleReach {
    return { kind: "from", date };
}

interface RuleSpec {
    readonly id: string;
    readonly outputs?: RuleOutputs;
    readonly reach?: RuleReach;
    readonly accountId?: string;
    readonly amount?: number;
    readonly descriptionText?: string;
    readonly createdAtOffsetMs?: number;
}

function rule(spec: RuleSpec): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(spec.id),
        descriptionText: spec.descriptionText ?? TEXT,
        accountId: spec.accountId,
        amount: spec.amount == null ? undefined : asMinorUnits(spec.amount),
        outputs: spec.outputs ?? WORK,
        reach: spec.reach ?? RULE_REACH_ALL,
        createdAt: BASE_INSTANT.add({ milliseconds: spec.createdAtOffsetMs ?? 0 })
    };
}

function subject(
    transactionId: TransactionId,
    date: Temporal.PlainDate,
    overrides: Partial<RuleMatchSubject> = {}
): RuleMatchSubject {
    return {
        transactionId,
        date,
        descriptionText: TEXT,
        accountId: "acct-a",
        amount: asMinorUnits(-450),
        isManual: false,
        ...overrides
    };
}

const ROW_A = subject(A, JUL_2);
const ROW_B = subject(B, JUL_25);
const ROW_C = subject(C, AUG_3, { accountId: "acct-b", amount: asMinorUnits(-600) });

describe("ruleReaches", () => {
    it.each<{
        readonly name: string;
        readonly reach: RuleReach;
        readonly id: TransactionId;
        readonly date: Temporal.PlainDate;
        readonly expected: boolean;
    }>([
        {
            name: "all reaches an old row",
            reach: RULE_REACH_ALL,
            id: A,
            date: JUN_1,
            expected: true
        },
        {
            name: "from excludes the day before",
            reach: from(JUL_25),
            id: A,
            date: JUL_24,
            expected: false
        },
        {
            name: "from includes its own day",
            reach: from(JUL_25),
            id: B,
            date: JUL_25,
            expected: true
        },
        {
            name: "from includes a later day",
            reach: from(JUL_25),
            id: C,
            date: AUG_3,
            expected: true
        },
        { name: "a set includes its member", reach: only(B), id: B, date: JUL_25, expected: true },
        {
            name: "a set excludes a non-member",
            reach: only(B),
            id: C,
            date: AUG_3,
            expected: false
        },
        {
            name: "an empty set reaches nothing",
            reach: only(),
            id: B,
            date: JUL_25,
            expected: false
        }
    ])("$name", ({ reach, id, date, expected }) => {
        expect(ruleReaches({ reach }, { id, date })).toBe(expected);
    });

    it("narrows matching but never widens it", () => {
        const otherText = subject(B, JUL_25, { descriptionText: "BOOKSTORE 99" });
        expect(ruleGoverns(rule({ id: "r", reach: only(B) }), otherText)).toBe(false);
        expect(ruleGoverns(rule({ id: "r", reach: only(B) }), ROW_B)).toBe(true);
        expect(ruleGoverns(rule({ id: "r", reach: only(B) }), ROW_A)).toBe(false);
    });
});

describe("ruleReachesEqual", () => {
    it.each<{
        readonly name: string;
        readonly left: RuleReach;
        readonly right: RuleReach;
        readonly expected: boolean;
    }>([
        { name: "all and all", left: RULE_REACH_ALL, right: RULE_REACH_ALL, expected: true },
        { name: "all and from", left: RULE_REACH_ALL, right: from(JUL_25), expected: false },
        { name: "the same date", left: from(JUL_25), right: from(JUL_25), expected: true },
        { name: "different dates", left: from(JUL_25), right: from(JUL_24), expected: false },
        { name: "sets in another order", left: only(A, B), right: only(B, A), expected: true },
        { name: "a subset", left: only(A), right: only(A, B), expected: false },
        { name: "a set and all", left: only(A), right: RULE_REACH_ALL, expected: false }
    ])("$name: $expected", ({ left, right, expected }) => {
        expect(ruleReachesEqual(left, right)).toBe(expected);
        expect(ruleReachesEqual(right, left)).toBe(expected);
    });
});

describe("reach rank", () => {
    it("ranks an explicit set above a date and all, which rank equally", () => {
        expect(ruleReachRank(rule({ id: "r", reach: only(B) }))).toBe(1);
        expect(ruleReachRank(rule({ id: "r", reach: from(JUL_25) }))).toBe(0);
        expect(ruleReachRank(rule({ id: "r", reach: RULE_REACH_ALL }))).toBe(0);
    });

    it("compares reach before conditions", () => {
        const oneRowUnscoped = rule({ id: "one", reach: only(B) });
        const allMostSpecific = rule({ id: "all", accountId: "acct-a", amount: -450 });
        expect(compareRulePrecedence(oneRowUnscoped, allMostSpecific)).toBeGreaterThan(0);
        expect(compareRulePrecedence(allMostSpecific, oneRowUnscoped)).toBeLessThan(0);
        const fromUnscoped = rule({ id: "from", reach: from(JUL_25) });
        const allUnscoped = rule({ id: "all2" });
        expect(compareRulePrecedence(fromUnscoped, allUnscoped)).toBe(0);
    });
});

describe("selectWinningRule with reach", () => {
    // E1 and E6: R1 one-row on B, an all rule with the most specific conditions on the slot.
    const oneRow = rule({ id: "r1", reach: only(B), outputs: HOME });
    const wide = rule({ id: "r-all", accountId: "acct-a", amount: -450, createdAtOffsetMs: 10 });

    it("lets a one-row rule beat any wider rule on its own row", () => {
        expect(selectWinningRule([oneRow, wide], "tags", ROW_B)?.id).toBe("r1");
        expect(selectWinningRule([wide, oneRow], "tags", ROW_B)?.id).toBe("r1");
    });

    it("leaves every other row to the wider rule", () => {
        expect(selectWinningRule([oneRow, wide], "tags", ROW_A)?.id).toBe("r-all");
    });

    it("never consults a rule that does not reach the row", () => {
        // E4: neither rule reaches a row imported on 1 Jun.
        const r1 = rule({ id: "r1", reach: from(JUL_25) });
        const r2 = rule({ id: "r2", reach: only(A), outputs: HOME });
        expect(
            selectWinningRule([r1, r2], "tags", subject(asTransactionId("I1"), JUN_1))
        ).toBeNull();
        // E5: R1 reaches a row imported on 10 Aug on arrival.
        const august = subject(asTransactionId("I2"), Temporal.PlainDate.from("2026-08-10"));
        expect(selectWinningRule([r1, r2], "tags", august)?.id).toBe("r1");
    });

    it("lets two one-row rules with disjoint sets each govern their own row (E2)", () => {
        const r1 = rule({ id: "r1", reach: only(B) });
        const r2 = rule({ id: "r2", reach: only(A), outputs: HOME });
        expect(selectWinningRule([r1, r2], "tags", ROW_B)?.id).toBe("r1");
        expect(selectWinningRule([r1, r2], "tags", ROW_A)?.id).toBe("r2");
        expect(selectWinningRule([r1, r2], "tags", ROW_C)).toBeNull();
    });

    const reachArbitrary: fc.Arbitrary<RuleReach> = fc.oneof(
        fc.constant(RULE_REACH_ALL),
        fc.constantFrom(JUN_1, JUL_25, AUG_3).map(from),
        fc.subarray([A, B, C]).map((ids) => only(...ids))
    );
    const ruleArbitrary = fc
        .record({
            id: fc.constantFrom("r0", "r1", "r2", "r3"),
            outputs: fc.constantFrom(WORK, HOME, COFFEE_ALIAS, { ...COFFEE_ALIAS, ...WORK }),
            reach: reachArbitrary,
            accountId: fc.option(fc.constantFrom("acct-a", "acct-b"), { nil: undefined }),
            createdAtOffsetMs: fc.integer({ min: 0, max: 2 })
        })
        .map(rule);
    // Ids are unique, as in the vault's id-keyed map: identical ids and creation times are the one
    // tie nothing can break, so order-independence is only promised between distinct rules.
    const uniqueRulesArbitrary = fc.uniqueArray(ruleArbitrary, {
        selector: (candidate) => candidate.id,
        maxLength: 4
    });
    const subjectArbitrary = fc.constantFrom(ROW_A, ROW_B, ROW_C);

    it("always picks a rule that governs the row, preferring any explicit set that does", () => {
        fc.assert(
            fc.property(uniqueRulesArbitrary, subjectArbitrary, (rules, row) => {
                for (const field of RULE_FIELDS) {
                    const winner = selectWinningRule(rules, field, row);
                    const governing = rules.filter(
                        (candidate) =>
                            candidate.outputs[field] != null && ruleGoverns(candidate, row)
                    );
                    expect(winner == null).toBe(governing.length === 0);
                    if (winner == null) continue;
                    expect(ruleGoverns(winner, row)).toBe(true);
                    if (governing.some((candidate) => candidate.reach.kind === "transactions")) {
                        expect(winner.reach.kind).toBe("transactions");
                    }
                }
            }),
            { seed: SEED, numRuns: 500 }
        );
    });

    it("is unchanged by indexing and by input order", () => {
        fc.assert(
            fc.property(uniqueRulesArbitrary, subjectArbitrary, (rules, row) => {
                for (const field of RULE_FIELDS) {
                    const expected = selectWinningRule(rules, field, row);
                    expect(selectWinningRule(buildRuleIndex(rules), field, row)).toBe(expected);
                    expect(selectWinningRule([...rules].reverse(), field, row)).toBe(expected);
                }
            }),
            { seed: SEED, numRuns: 300 }
        );
    });
});

describe("uniqueness with reach", () => {
    it.each<{
        readonly name: string;
        readonly left: RuleSpec;
        readonly right: RuleSpec;
        readonly field?: RuleField;
        readonly collide: boolean;
    }>([
        { name: "two all rules", left: { id: "l" }, right: { id: "r" }, collide: true },
        {
            name: "an all rule and a from rule",
            left: { id: "l" },
            right: { id: "r", reach: from(JUL_25) },
            collide: false
        },
        {
            name: "two from rules with different dates",
            left: { id: "l", reach: from(JUL_2) },
            right: { id: "r", reach: from(JUL_25) },
            collide: true
        },
        {
            name: "an explicit set and an all rule",
            left: { id: "l", reach: only(B) },
            right: { id: "r" },
            collide: false
        },
        {
            name: "overlapping explicit sets",
            left: { id: "l", reach: only(A, B) },
            right: { id: "r", reach: only(B, C) },
            collide: true
        },
        {
            name: "disjoint explicit sets",
            left: { id: "l", reach: only(A) },
            right: { id: "r", reach: only(B) },
            collide: false
        },
        {
            name: "overlapping sets on different conditions",
            left: { id: "l", reach: only(B) },
            right: { id: "r", reach: only(B), accountId: "acct-a" },
            collide: false
        },
        {
            name: "overlapping sets on different fields",
            left: { id: "l", reach: only(B) },
            right: { id: "r", reach: only(B), outputs: COFFEE_ALIAS },
            field: "tags",
            collide: false
        }
    ])("$name: collide=$collide", ({ left, right, field, collide }) => {
        const leftRule = rule(left);
        const rightRule = rule(right);
        expect(rulesShareUniquenessSlot(leftRule, rightRule, field ?? "tags")).toBe(collide);
        expect(hasUniqueRuleKeys([leftRule, rightRule])).toBe(!collide);
    });

    it("dedupe keeps disjoint one-row rules and drops the older of an overlapping pair", () => {
        const r1 = rule({ id: "r1", reach: only(B), createdAtOffsetMs: 0 });
        const r2 = rule({ id: "r2", reach: only(A), createdAtOffsetMs: 1 });
        const r3 = rule({ id: "r3", reach: only(A, C), createdAtOffsetMs: 2 });
        const survivors = dedupeRulesByUniqueness([r1, r2, r3]).map((survivor) => survivor.id);
        expect(survivors.sort()).toEqual(["r1", "r3"]);
    });
});

describe("reach on the wire", () => {
    const createdAtEpochMs = BASE_INSTANT.epochMilliseconds;
    const legacyTags = {
        id: "legacy",
        field: "tags",
        descriptionText: TEXT,
        tagMode: "add",
        tagIds: ["work"],
        createdAtEpochMs
    };

    it("decodes a record written before reach existed as all", () => {
        const decoded = decodeFieldRule(legacyTags);
        expect(decoded.ok && decoded.value.reach).toEqual(RULE_REACH_ALL);
    });

    it.each<{ readonly name: string; readonly reach: RuleReach }>([
        { name: "all", reach: RULE_REACH_ALL },
        { name: "from a date", reach: from(JUL_25) },
        { name: "an explicit set", reach: only(A, B) },
        { name: "an empty explicit set", reach: only() }
    ])("round-trips $name", ({ reach }) => {
        const original = rule({ id: "rt", reach, accountId: "acct-a" });
        const wire = encodeFieldRule(original);
        expect(wire.reachKind).toBe(reach.kind);
        const decoded = decodeFieldRule(wire);
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(decoded.value).toEqual(original);
    });

    it("reads only true entries of the id map as members, ignoring the container id", () => {
        const decoded = decodeFieldRule({
            ...legacyTags,
            reachKind: "transactions",
            reachTransactionIds: { $cid: "cid:1", A: true, B: false }
        });
        expect(decoded.ok && decoded.value.reach).toEqual(only(A));
    });

    it.each([
        { name: "a from reach without its date", wire: { reachKind: "from" } },
        { name: "an unknown reach kind", wire: { reachKind: "some" } },
        {
            name: "a date that is not a calendar date",
            wire: { reachKind: "from", reachFromDate: "2026-07-25" }
        }
    ])("rejects $name", ({ wire }) => {
        const decoded = decodeFieldRule({ ...legacyTags, ...wire });
        expect(decoded.ok).toBe(false);
        if (!decoded.ok) expect(decoded.error.type).toBe("invalid-shape");
    });
});

describe("countRulePopulation under a candidate reach", () => {
    function row(
        rowSubject: RuleMatchSubject,
        tagIds: readonly string[] = []
    ): RulePopulationTransaction {
        return {
            subject: rowSubject,
            date: rowSubject.date,
            aliasId: null,
            tagIds,
            allocations: {}
        };
    }

    // E1: B was tagged by hand, so it already holds `work`.
    const rows = [row(ROW_A), row(ROW_B, ["work"]), row(ROW_C)];
    const r1 = rule({ id: "r1", reach: only(B) });

    function countUnder(reach: RuleReach | undefined, others: readonly FieldRule[] = []): number {
        return countRulePopulation({
            rule: r1,
            rules: [r1, ...others],
            transactions: rows,
            reach,
            scope: "all",
            referenceDate: null
        });
    }

    it("counts nothing under the rule's own one-row reach: its row already agrees", () => {
        expect(countUnder(undefined)).toBe(0);
    });

    it("counts C when widening to from 25 Jul (E3)", () => {
        expect(countUnder(from(JUL_25))).toBe(1);
    });

    it("counts A and C when widening to all with no other rule", () => {
        expect(countUnder(RULE_REACH_ALL)).toBe(2);
    });

    it("leaves out a row another one-row rule outranks it on (E6)", () => {
        const r2 = rule({ id: "r2", reach: only(A), outputs: HOME });
        expect(countUnder(RULE_REACH_ALL, [r2])).toBe(1);
    });
});

describe("resolveRuleFoldOffer", () => {
    function offer(
        oneRowRule: FieldRule,
        others: readonly FieldRule[],
        row: RuleMatchSubject = ROW_B,
        field: RuleField = "tags"
    ): RuleFoldOffer {
        return resolveRuleFoldOffer({
            rules: [oneRowRule, ...others],
            subject: row,
            oneRowRule,
            field
        });
    }

    const oneRowTags = rule({ id: "r-one", reach: only(B), outputs: HOME });

    it("offers to fold an exception into the wider rule that owns the field", () => {
        const wide = rule({ id: "r-wide" });
        expect(offer(oneRowTags, [wide])).toEqual({ kind: "fold-update", owner: wide });
    });

    it("offers to add the field to a wider rule that governs the row and lacks it (E11)", () => {
        const renameB = rule({ id: "r4", reach: only(B), outputs: COFFEE_ALIAS });
        const tagsEverywhere = rule({ id: "r1" });
        expect(offer(renameB, [tagsEverywhere], ROW_B, "descriptionAlias")).toEqual({
            kind: "fold-extend",
            host: tagsEverywhere
        });
    });

    it("combines with an explicit-set rule over exactly the same rows", () => {
        const sameRows = rule({ id: "r-same", reach: only(B), outputs: COFFEE_ALIAS });
        expect(offer(oneRowTags, [sameRows])).toEqual({ kind: "fold-extend", host: sameRows });
    });

    it.each<{ readonly name: string; readonly others: readonly FieldRule[] }>([
        { name: "no other rule exists", others: [] },
        {
            name: "the wider rule has other conditions",
            others: [rule({ id: "w", accountId: "acct-a" })]
        },
        {
            name: "the wider rule does not reach the row",
            others: [rule({ id: "w", reach: from(AUG_3) })]
        },
        {
            name: "the only other explicit-set rule covers different rows",
            others: [rule({ id: "w", reach: only(A, B), outputs: COFFEE_ALIAS })]
        },
        {
            name: "the wider rule has other text",
            others: [rule({ id: "w", descriptionText: "BOOKSTORE 99" })]
        }
    ])("offers nothing when $name", ({ others }) => {
        expect(offer(oneRowTags, others)).toEqual({ kind: "none" });
    });

    it("offers nothing for a rule that is not one-row, or on a row it does not govern", () => {
        const wide = rule({ id: "r-wide", outputs: HOME });
        const otherWide = rule({ id: "r-other", reach: from(JUL_2), outputs: COFFEE_ALIAS });
        expect(offer(wide, [otherWide])).toEqual({ kind: "none" });
        expect(offer(oneRowTags, [rule({ id: "w" })], ROW_A)).toEqual({ kind: "none" });
        expect(offer(oneRowTags, [rule({ id: "w" })], ROW_B, "descriptionAlias")).toEqual({
            kind: "none"
        });
    });

    it("offers nothing for an alias on a manual row", () => {
        const manualB = subject(B, JUL_25, { isManual: true });
        const renameB = rule({ id: "r4", reach: only(B), outputs: COFFEE_ALIAS });
        expect(offer(renameB, [rule({ id: "w" })], manualB, "descriptionAlias")).toEqual({
            kind: "none"
        });
    });

    it("prefers the alias host among hosts that lack the field", () => {
        const aliasHost = rule({ id: "z-alias", reach: from(JUL_2), outputs: COFFEE_ALIAS });
        const allocationHost = rule({
            id: "a-alloc",
            outputs: { allocation: { allocations: {} } }
        });
        expect(offer(oneRowTags, [allocationHost, aliasHost])).toEqual({
            kind: "fold-extend",
            host: aliasHost
        });
    });

    it("reports ambiguity rather than break a tie, sorted by id and independent of order", () => {
        const allHost = rule({ id: "b-all", outputs: { allocation: { allocations: {} } } });
        const fromHost = rule({
            id: "a-from",
            reach: from(JUL_2),
            outputs: { allocation: { allocations: {} } }
        });
        const expected: RuleFoldOffer = { kind: "ambiguous", candidates: [fromHost, allHost] };
        expect(offer(oneRowTags, [allHost, fromHost])).toEqual(expected);
        expect(offer(oneRowTags, [fromHost, allHost])).toEqual(expected);

        const owner1 = rule({ id: "o1" });
        const owner2 = rule({ id: "o2", reach: from(JUL_2) });
        expect(offer(oneRowTags, [owner2, owner1])).toEqual({
            kind: "ambiguous",
            candidates: [owner1, owner2]
        });
    });
});
