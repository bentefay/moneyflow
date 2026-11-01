import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { asTransactionId } from "@/components/features/transactions/table-model/ids";
import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import {
    resolveRuleExtensionTarget,
    resolveRuleFoldOffer
} from "@/lib/domain/automation/extension";
import {
    countRulePopulation,
    populationFieldValue,
    ruleOutputAgrees,
    type RulePopulationQuery,
    type RulePopulationTransaction
} from "@/lib/domain/automation/population";
import {
    buildRuleIndex,
    candidateRulesFor,
    rulesKeyedOnText
} from "@/lib/domain/automation/rule-index";
import {
    type FieldRule,
    FieldRuleIdSchema,
    isOnOrAfterTransactionDate,
    RULE_FIELDS,
    type RuleMatchSubject,
    type RuleOutputs,
    RULE_REACH_ALL,
    type RuleReach,
    selectWinningRule,
    selectWinningRulesByField
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const SEED = 17_120_001;
const PROPERTY_RUNS = 500;
const BASE_INSTANT = Temporal.Instant.from("2026-07-25T00:00:00Z");
const REFERENCE = Temporal.PlainDate.from("2026-07-25");

// Small pools on every axis the engine branches on, so random rules routinely share a text, tie on
// rank and recency, and collide on uniqueness slots: the cases where an index could drift.
const TEXTS = ["COFFEE", "RENT", "GROCER"] as const;
const ACCOUNTS = ["acct-a", "acct-b"] as const;
const AMOUNTS = [-450, 0] as const;

const ALIAS = { descriptionAlias: { aliasId: "alias-1" } } as const;
const TAGS_ADD = { tags: { mode: "add", tagIds: ["tag-a"] } } as const;
const TAGS_SET = { tags: { mode: "set", tagIds: ["tag-b"] } } as const;
const ALLOCATION = {
    allocation: { allocations: { "person-1": AllocationPercentageSchema.parse(100) } }
} as const;

const outputsArbitrary: fc.Arbitrary<RuleOutputs> = fc.constantFrom<RuleOutputs>(
    ALIAS,
    TAGS_ADD,
    TAGS_SET,
    ALLOCATION,
    { ...ALIAS, ...TAGS_ADD },
    { ...TAGS_SET, ...ALLOCATION },
    { ...ALIAS, ...TAGS_SET, ...ALLOCATION }
);

// A small transaction id pool, so explicit sets routinely contain the subject's row.
const TRANSACTION_IDS = ["tx-0", "tx-1", "tx-2"] as const;

const reachArbitrary: fc.Arbitrary<RuleReach> = fc.oneof(
    fc.constant<RuleReach>(RULE_REACH_ALL),
    fc
        .integer({ min: -2, max: 2 })
        .map((days): RuleReach => ({ kind: "from", date: REFERENCE.add({ days }) })),
    fc
        .subarray([...TRANSACTION_IDS])
        .map((ids): RuleReach => ({ kind: "transactions", ids: new Set(ids.map(asTransactionId)) }))
);

const ruleArbitrary: fc.Arbitrary<FieldRule> = fc.record({
    // A small id pool also yields duplicate ids, which only concurrent creation can produce.
    id: fc
        .constantFrom("r0", "r1", "r2", "r3", "r4", "r5")
        .map((id) => FieldRuleIdSchema.parse(id)),
    descriptionText: fc.constantFrom(...TEXTS),
    accountId: fc.option(fc.constantFrom(...ACCOUNTS), { nil: undefined }),
    amount: fc.option(fc.constantFrom(...AMOUNTS).map(asMinorUnits), { nil: undefined }),
    outputs: outputsArbitrary,
    reach: reachArbitrary,
    createdAt: fc.integer({ min: 0, max: 2 }).map((offset) => BASE_INSTANT.add({ seconds: offset }))
});

const subjectArbitrary: fc.Arbitrary<RuleMatchSubject> = fc.record({
    transactionId: fc.constantFrom(...TRANSACTION_IDS).map(asTransactionId),
    date: fc.integer({ min: -2, max: 2 }).map((days) => REFERENCE.add({ days })),
    descriptionText: fc.option(fc.constantFrom(...TEXTS, "UNKNOWN"), { nil: null }),
    accountId: fc.constantFrom(...ACCOUNTS),
    amount: fc.constantFrom(...AMOUNTS, -12).map(asMinorUnits),
    isManual: fc.boolean()
});

const populationArbitrary: fc.Arbitrary<RulePopulationTransaction> = fc
    .record({
        subject: subjectArbitrary,
        aliasId: fc.constantFrom(null, "alias-1"),
        tagIds: fc.constantFrom([], ["tag-a"], ["tag-b"]),
        allocations: fc.constantFrom<Readonly<Record<string, number>>>({}, { "person-1": 100 })
    })
    // A row has one date: the one reach tests and the one the "new" scope tests are the same.
    .map((transaction) => ({ ...transaction, date: transaction.subject.date }));

const rulesArbitrary = fc.array(ruleArbitrary, { maxLength: 12 });

function rule(id: string, descriptionText: string, accountId?: string): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(id),
        descriptionText,
        accountId,
        outputs: TAGS_ADD,
        reach: RULE_REACH_ALL,
        createdAt: BASE_INSTANT
    };
}

/**
 * `countRulePopulation` as it stood before the index: every rule against every row. Kept verbatim
 * as the reference, because comparing the new list path with the new index path would pass on a
 * regression they share.
 */
function referenceCount(
    query: Omit<RulePopulationQuery, "rules"> & { readonly rules: readonly FieldRule[] }
): number {
    const { scope, referenceDate } = query;
    const rule = query.reach == null ? query.rule : { ...query.rule, reach: query.reach };
    if (scope === "new" && referenceDate == null) return 0;
    const rules = [...query.rules.filter((candidate) => candidate.id !== rule.id), rule];
    const fields = RULE_FIELDS.filter((field) => rule.outputs[field] != null);
    return query.transactions.filter((transaction) => {
        if (
            scope === "new" &&
            referenceDate != null &&
            !isOnOrAfterTransactionDate(transaction.date, referenceDate)
        ) {
            return false;
        }
        return fields.some(
            (field) =>
                selectWinningRule(rules, field, transaction.subject)?.id === rule.id &&
                ruleOutputAgrees(rule, populationFieldValue(transaction, field)) === false
        );
    }).length;
}

describe("buildRuleIndex", () => {
    it("buckets rules by exact description text, keeping input order within each bucket", () => {
        const first = rule("b", "COFFEE");
        const other = rule("a", "RENT");
        const second = rule("c", "COFFEE", "acct-a");
        const index = buildRuleIndex([first, other, second]);

        expect(index.rules).toEqual([first, other, second]);
        expect([...index.byDescriptionText.keys()]).toEqual(["COFFEE", "RENT"]);
        expect(index.byDescriptionText.get("COFFEE")).toEqual([first, second]);
    });

    it("offers no candidates for a subject without matchable text or with an unknown one", () => {
        const index = buildRuleIndex([rule("a", "COFFEE")]);
        const base = {
            transactionId: asTransactionId("tx-0"),
            date: REFERENCE,
            accountId: "acct-a",
            amount: asMinorUnits(-450),
            isManual: false
        };

        expect(candidateRulesFor(index, { ...base, descriptionText: null })).toEqual([]);
        expect(candidateRulesFor(index, { ...base, descriptionText: "coffee" })).toEqual([]);
        expect(candidateRulesFor(index, { ...base, descriptionText: "COFFEE" })).toHaveLength(1);
    });

    it("keys a list and its index on the same rules", () => {
        fc.assert(
            fc.property(rulesArbitrary, fc.constantFrom(...TEXTS, "UNKNOWN"), (rules, text) => {
                expect(rulesKeyedOnText(buildRuleIndex(rules), text)).toEqual(
                    rulesKeyedOnText(rules, text)
                );
            }),
            { seed: SEED, numRuns: PROPERTY_RUNS }
        );
    });
});

describe("index-backed engine equals list-backed engine", () => {
    it("selects the identical winner for every field", () => {
        fc.assert(
            fc.property(rulesArbitrary, subjectArbitrary, (rules, subject) => {
                const index = buildRuleIndex(rules);
                for (const field of RULE_FIELDS) {
                    expect(selectWinningRule(index, field, subject)).toBe(
                        selectWinningRule(rules, field, subject)
                    );
                }
                expect(selectWinningRulesByField(index, subject)).toEqual(
                    selectWinningRulesByField(rules, subject)
                );
            }),
            { seed: SEED, numRuns: PROPERTY_RUNS }
        );
    });

    it("counts the identical population", () => {
        fc.assert(
            fc.property(
                rulesArbitrary,
                ruleArbitrary,
                fc.array(populationArbitrary, { maxLength: 12 }),
                fc.constantFrom("all" as const, "new" as const),
                fc.constantFrom(null, REFERENCE),
                fc.subarray(["r0", "r1", "r2", "r3", "r4", "r5"]),
                fc.option(reachArbitrary, { nil: undefined }),
                (rules, candidate, transactions, scope, referenceDate, excluded, reach) => {
                    const excludedRuleIds = new Set(excluded);
                    const query = { rule: candidate, transactions, scope, referenceDate, reach };
                    // The reference applies the exclusion the way callers did before it was a
                    // query field: by filtering the list.
                    const expected = referenceCount({
                        ...query,
                        rules: rules.filter((other) => !excludedRuleIds.has(other.id))
                    });
                    expect(countRulePopulation({ ...query, rules, excludedRuleIds })).toBe(
                        expected
                    );
                    expect(
                        countRulePopulation({
                            ...query,
                            rules: buildRuleIndex(rules),
                            excludedRuleIds
                        })
                    ).toBe(expected);
                }
            ),
            { seed: SEED, numRuns: PROPERTY_RUNS }
        );
    });

    it("resolves the identical extension target", () => {
        fc.assert(
            fc.property(
                rulesArbitrary,
                subjectArbitrary,
                fc.constantFrom(...RULE_FIELDS),
                fc.boolean(),
                fc.boolean(),
                (rules, subject, field, useAccount, useAmount) => {
                    const predicate = {
                        descriptionText: subject.descriptionText ?? "COFFEE",
                        accountId: useAccount ? subject.accountId : undefined,
                        amount: useAmount ? subject.amount : undefined
                    };
                    const query = { subject, field, predicate };
                    expect(
                        resolveRuleExtensionTarget({ ...query, rules: buildRuleIndex(rules) })
                    ).toEqual(resolveRuleExtensionTarget({ ...query, rules }));
                }
            ),
            { seed: SEED, numRuns: PROPERTY_RUNS }
        );
    });

    it("resolves the identical fold offer", () => {
        fc.assert(
            fc.property(
                rulesArbitrary,
                ruleArbitrary,
                subjectArbitrary,
                fc.constantFrom(...RULE_FIELDS),
                (rules, oneRowRule, subject, field) => {
                    const query = { subject, field, oneRowRule };
                    expect(
                        resolveRuleFoldOffer({ ...query, rules: buildRuleIndex(rules) })
                    ).toEqual(resolveRuleFoldOffer({ ...query, rules }));
                }
            ),
            { seed: SEED, numRuns: PROPERTY_RUNS }
        );
    });
});
