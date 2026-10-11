import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleField,
    type RuleMatchSubject,
    type RuleOutputs,
    type TagsOutput,
    buildFieldRule,
    decodeFieldRule,
    dedupeRulesByUniqueness,
    encodeFieldRule,
    fieldAppliesToManual,
    groupRulesByUniquenessKey,
    hasUniqueRuleKeys,
    isOnOrAfterTransactionDate,
    nonEmptyRuleOutputs,
    primaryOutputField,
    projectRuleMatchSubject,
    resolveTagRuleResult,
    ruleMatchesSubject,
    ruleOutput,
    ruleOutputFields,
    rulePredicatesEqual,
    ruleScopeRank,
    ruleUniquenessKeyFor,
    ruleUniquenessKeys,
    selectWinningRule,
    selectWinningRulesByField,
    withoutRuleOutput
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
    readonly outputs?: RuleOutputs;
    readonly createdAtOffsetMs?: number;
}

function tagsOutput(mode: "add" | "set", tagIds: readonly string[]): TagsOutput {
    return { mode, tagIds };
}

const ALIAS_OUTPUTS: RuleOutputs = { descriptionAlias: { aliasId: "alias-1" } };
const ALLOCATION_60_40 = {
    allocations: {
        "person-a": AllocationPercentageSchema.parse(60),
        "person-b": AllocationPercentageSchema.parse(40)
    }
};

function makeRule(input: MakeRuleInput): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(input.id),
        descriptionText: input.descriptionText,
        accountId: input.accountId,
        amount: input.amount == null ? undefined : asMinorUnits(input.amount),
        outputs: input.outputs ?? { tags: tagsOutput("add", ["tag-a"]) },
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
        // Zero is a PRESENT constraint, not an absent one: the rank test is `== null`, never
        // falsiness. A zero-amount rule outranks the unscoped slot exactly like any other amount.
        { accountId: undefined, amount: 0, rank: 1 },
        { accountId: "acct-checking", amount: undefined, rank: 2 },
        { accountId: "acct-checking", amount: -450, rank: 3 },
        { accountId: "acct-checking", amount: 0, rank: 3 }
    ])("ranks account=$accountId amount=$amount as $rank", ({ accountId, amount, rank }) => {
        const rule = makeRule({ id: "r1", descriptionText: "X", accountId, amount });
        expect(ruleScopeRank(rule)).toBe(rank);
    });
});

describe("uniqueness", () => {
    it("collides only on identical field + text + scope", () => {
        const a = makeRule({ id: "r1", descriptionText: "X" });
        const b = makeRule({ id: "r2", descriptionText: "X" });
        expect(ruleUniquenessKeys(a)).toEqual(ruleUniquenessKeys(b));
    });

    it("distinguishes scope, text and field", () => {
        const unscoped = makeRule({ id: "r1", descriptionText: "X" });
        const amountScoped = makeRule({ id: "r2", descriptionText: "X", amount: -450 });
        const otherText = makeRule({ id: "r3", descriptionText: "Y" });
        const otherField = makeRule({ id: "r4", descriptionText: "X", outputs: ALIAS_OUTPUTS });
        const keys = new Set(
            [unscoped, amountScoped, otherText, otherField].flatMap(ruleUniquenessKeys)
        );
        expect(keys.size).toBe(4);
    });

    it("has one key per output, each the key of that field's slot", () => {
        const grouped = makeRule({
            id: "r1",
            descriptionText: "X",
            accountId: "acct-checking",
            outputs: {
                descriptionAlias: { aliasId: "alias-1" },
                tags: tagsOutput("add", ["t1"]),
                allocation: ALLOCATION_60_40
            }
        });
        expect(ruleUniquenessKeys(grouped)).toEqual([
            ruleUniquenessKeyFor("descriptionAlias", grouped),
            ruleUniquenessKeyFor("tags", grouped),
            ruleUniquenessKeyFor("allocation", grouped)
        ]);
    });

    it("lets identical conditions with disjoint outputs coexist", () => {
        const aliasRule = makeRule({ id: "r1", descriptionText: "X", outputs: ALIAS_OUTPUTS });
        const tagsRule = makeRule({ id: "r2", descriptionText: "X" });
        expect(hasUniqueRuleKeys([aliasRule, tagsRule])).toBe(true);
    });

    it("collides a grouped rule with a single-output rule sharing one of its slots", () => {
        const grouped = makeRule({
            id: "r1",
            descriptionText: "X",
            outputs: { descriptionAlias: { aliasId: "alias-1" }, tags: tagsOutput("add", ["t"]) }
        });
        const tagsRule = makeRule({ id: "r2", descriptionText: "X" });
        expect(hasUniqueRuleKeys([grouped, tagsRule])).toBe(false);
        const tagsKey = ruleUniquenessKeyFor("tags", grouped);
        expect(
            groupRulesByUniquenessKey([grouped, tagsRule])
                .get(tagsKey)
                ?.map((r) => r.id)
        ).toEqual(["r1", "r2"]);
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

    it("dedupe never keeps a grouped rule that would share a slot, in any order", () => {
        // r3 (newest) takes the alias slot, so r1 (which also wants alias) is dropped and the tags
        // slot falls to r2. Keeping r1 for its tags would leave two alias holders.
        const r1 = makeRule({
            id: "r1",
            descriptionText: "X",
            outputs: { descriptionAlias: { aliasId: "a1" }, tags: tagsOutput("add", ["t"]) },
            createdAtOffsetMs: 500
        });
        const r2 = makeRule({ id: "r2", descriptionText: "X", createdAtOffsetMs: 0 });
        const r3 = makeRule({
            id: "r3",
            descriptionText: "X",
            outputs: { descriptionAlias: { aliasId: "a3" } },
            createdAtOffsetMs: 1000
        });
        fc.assert(
            fc.property(fc.shuffledSubarray([r1, r2, r3], { minLength: 3 }), (shuffled) => {
                const survivors = dedupeRulesByUniqueness(shuffled);
                expect(survivors.map((rule) => rule.id).sort()).toEqual(["r2", "r3"]);
                expect(hasUniqueRuleKeys(survivors)).toBe(true);
            }),
            { seed: SHUFFLE_SEED, numRuns: 50 }
        );
    });
});

describe("projectRuleMatchSubject", () => {
    it("uses raw provenance for imported rows and resolved aliases for manual rows", () => {
        const imported = projectRuleMatchSubject({
            accountId: "acct-checking",
            amount: asMinorUnits(-450),
            description: "RAW IMPORT",
            importId: "import-1",
            resolvedAliasName: "Visible alias"
        });
        const manual = projectRuleMatchSubject({
            accountId: "acct-checking",
            amount: asMinorUnits(-450),
            description: "",
            importId: undefined,
            resolvedAliasName: "Visible alias"
        });

        expect(imported).toMatchObject({ descriptionText: "RAW IMPORT", isManual: false });
        expect(manual).toMatchObject({ descriptionText: "Visible alias", isManual: true });
    });

    it("projects empty or unresolved matching text to null", () => {
        expect(
            projectRuleMatchSubject({
                accountId: "acct-checking",
                amount: asMinorUnits(-450),
                description: "",
                importId: "import-1",
                resolvedAliasName: null
            }).descriptionText
        ).toBeNull();
        expect(
            projectRuleMatchSubject({
                accountId: "acct-checking",
                amount: asMinorUnits(-450),
                description: "ignored",
                importId: undefined,
                resolvedAliasName: null
            }).descriptionText
        ).toBeNull();
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

    it("treats a zero amount as an exact constraint, not an absent one", () => {
        // `ruleMatchesSubject` narrows on `rule.amount != null`, so a zero-amount rule constrains
        // to exactly zero rather than degrading to "any amount".
        const zeroScoped = makeRule({ id: "r1", descriptionText: "COFFEE SHOP 123", amount: 0 });
        expect(ruleMatchesSubject(zeroScoped, subject({ amount: asMinorUnits(0) }))).toBe(true);
        expect(ruleMatchesSubject(zeroScoped, subject({ amount: asMinorUnits(-450) }))).toBe(false);
        // And the converse: an unscoped rule still matches a zero-amount transaction.
        const unscopedRule = makeRule({ id: "r2", descriptionText: "COFFEE SHOP 123" });
        expect(ruleMatchesSubject(unscopedRule, subject({ amount: asMinorUnits(0) }))).toBe(true);
    });

    it("excludes manual rows from description-alias outputs but not tag/allocation outputs", () => {
        // Eligibility is per output, so it is decided by the per-field winner, not the conditions:
        // a grouped rule matches a manual row and drives its tags but never its alias.
        const manual = subject({ isManual: true });
        const aliasRule = makeRule({
            id: "r1",
            descriptionText: "COFFEE SHOP 123",
            outputs: ALIAS_OUTPUTS
        });
        const tagRule = makeRule({ id: "r2", descriptionText: "COFFEE SHOP 123" });
        const grouped = makeRule({
            id: "r3",
            descriptionText: "COFFEE SHOP 123",
            accountId: "acct-checking",
            outputs: { descriptionAlias: { aliasId: "alias-2" }, tags: tagsOutput("add", ["t"]) }
        });
        expect(ruleMatchesSubject(grouped, manual)).toBe(true);
        expect(selectWinningRule([aliasRule, grouped], "descriptionAlias", manual)).toBeNull();
        expect(selectWinningRule([tagRule], "tags", manual)?.id).toBe("r2");
        expect(selectWinningRule([tagRule, grouped], "tags", manual)?.id).toBe("r3");
        expect(selectWinningRule([aliasRule, grouped], "descriptionAlias", subject())?.id).toBe(
            "r3"
        );
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

    it("gives the same winner when the four competing ranks arrive reversed", () => {
        // Deterministic companion to the shuffle property below: input order is not a tiebreak.
        expect(selectWinningRule([...all].reverse(), "tags", subject())?.id).toBe(bothScoped.id);
        expect(selectWinningRule(all, "tags", subject())?.id).toBe(bothScoped.id);
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
            outputs: ALIAS_OUTPUTS
        });
        const winners = selectWinningRulesByField([...all, aliasRule], subject());
        expect(winners.tags?.id).toBe(bothScoped.id);
        expect(winners.descriptionAlias?.id).toBe(aliasRule.id);
        expect(winners.allocation).toBeUndefined();
    });

    it("lets each field win at its own scope rank, independently", () => {
        // Precedence is resolved per field, not once for the whole subject: tags wins at rank 3
        // while allocation's most specific match is rank 1 and the alias field's is rank 0.
        const allocationAmountScoped = makeRule({
            id: "r-alloc-amount",
            descriptionText: "COFFEE SHOP 123",
            amount: -450,
            outputs: {
                allocation: { allocations: { "person-a": AllocationPercentageSchema.parse(100) } }
            }
        });
        const allocationUnscoped = makeRule({
            id: "r-alloc-unscoped",
            descriptionText: "COFFEE SHOP 123",
            outputs: {
                allocation: { allocations: { "person-b": AllocationPercentageSchema.parse(100) } }
            }
        });
        const aliasUnscoped = makeRule({
            id: "r-alias-unscoped",
            descriptionText: "COFFEE SHOP 123",
            outputs: ALIAS_OUTPUTS
        });
        const winners = selectWinningRulesByField(
            [...all, allocationAmountScoped, allocationUnscoped, aliasUnscoped],
            subject()
        );
        expect(winners.tags?.id).toBe(bothScoped.id);
        expect(ruleScopeRank(winners.tags!)).toBe(3);
        expect(winners.allocation?.id).toBe(allocationAmountScoped.id);
        expect(ruleScopeRank(winners.allocation!)).toBe(1);
        expect(winners.descriptionAlias?.id).toBe(aliasUnscoped.id);
        expect(ruleScopeRank(winners.descriptionAlias!)).toBe(0);
    });

    it("requires the winner to carry an output for the field", () => {
        // The most specific rule for this row has only an alias output, so it competes for the
        // alias field alone; tags fall to the broader rule that actually sets tags.
        const narrowAlias = makeRule({
            id: "r-narrow-alias",
            descriptionText: "COFFEE SHOP 123",
            accountId: "acct-checking",
            amount: -450,
            outputs: ALIAS_OUTPUTS
        });
        expect(selectWinningRule([narrowAlias, unscoped], "tags", subject())?.id).toBe(unscoped.id);
        expect(selectWinningRule([narrowAlias, unscoped], "descriptionAlias", subject())?.id).toBe(
            narrowAlias.id
        );
        expect(selectWinningRule([narrowAlias], "allocation", subject())).toBeNull();
    });

    it("lets one grouped rule win several fields while precedence stays per field", () => {
        const grouped = makeRule({
            id: "r-grouped",
            descriptionText: "COFFEE SHOP 123",
            accountId: "acct-checking",
            outputs: {
                descriptionAlias: { aliasId: "alias-1" },
                tags: tagsOutput("add", ["t"]),
                allocation: ALLOCATION_60_40
            }
        });
        const rules = [unscoped, amountScoped, bothScoped, grouped];
        fc.assert(
            fc.property(fc.shuffledSubarray(rules, { minLength: rules.length }), (shuffled) => {
                const winners = selectWinningRulesByField(shuffled, subject());
                // bothScoped (rank 3) still beats the grouped rule (rank 2) for tags.
                expect(winners.tags?.id).toBe(bothScoped.id);
                expect(winners.descriptionAlias?.id).toBe(grouped.id);
                expect(winners.allocation?.id).toBe(grouped.id);
            }),
            { seed: SHUFFLE_SEED, numRuns: PROPERTY_RUNS }
        );
    });
});

describe("isOnOrAfterTransactionDate", () => {
    it.each([
        { candidate: "2026-03-11", expected: true },
        // Inclusive: a row dated the same day as the reference is in "update new" scope.
        { candidate: "2026-03-10", expected: true },
        { candidate: "2026-03-09", expected: false },
        { candidate: "2027-01-01", expected: true },
        { candidate: "2025-12-31", expected: false }
    ])("on-or-after 2026-03-10 for $candidate is $expected", ({ candidate, expected }) => {
        const ref = Temporal.PlainDate.from("2026-03-10");
        expect(isOnOrAfterTransactionDate(Temporal.PlainDate.from(candidate), ref)).toBe(expected);
    });
});

describe("resolveTagRuleResult", () => {
    it("set replaces existing tags", () => {
        expect(resolveTagRuleResult(["old"], tagsOutput("set", ["a", "b"]))).toEqual(["a", "b"]);
    });

    it("add unions preserving order and de-duplicating", () => {
        expect(resolveTagRuleResult(["a"], tagsOutput("add", ["b", "a", "c"]))).toEqual([
            "a",
            "b",
            "c"
        ]);
    });

    it("is idempotent under re-application", () => {
        const output = tagsOutput("add", ["b", "c"]);
        const once = resolveTagRuleResult(["a"], output);
        const twice = resolveTagRuleResult([...once], output);
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
        if (result.ok) {
            expect(result.value.outputs.tags?.tagIds).toEqual(["t1", "t2"]);
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
        if (result.ok) {
            expect(Object.keys(result.value.outputs.allocation?.allocations ?? {}).sort()).toEqual([
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
            allocations: { "person-a": Number.POSITIVE_INFINITY },
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

describe("encodeFieldRule round-trips through decodeFieldRule", () => {
    it.each<{ readonly name: string; readonly outputs: RuleOutputs }>([
        { name: "tags/add", outputs: { tags: tagsOutput("add", ["t1", "t2"]) } },
        { name: "tags/set", outputs: { tags: tagsOutput("set", ["t3"]) } },
        { name: "descriptionAlias", outputs: ALIAS_OUTPUTS },
        { name: "allocation", outputs: { allocation: ALLOCATION_60_40 } },
        {
            name: "alias + tags",
            outputs: { descriptionAlias: { aliasId: "alias-1" }, tags: tagsOutput("set", ["t"]) }
        },
        {
            name: "tags + allocation",
            outputs: { tags: tagsOutput("add", ["t1"]), allocation: ALLOCATION_60_40 }
        },
        {
            name: "alias + tags + allocation",
            outputs: {
                descriptionAlias: { aliasId: "alias-1" },
                tags: tagsOutput("add", ["t1", "t2"]),
                allocation: ALLOCATION_60_40
            }
        }
    ])("preserves a $name rule", ({ outputs }) => {
        const rule = makeRule({
            id: "rule-rt",
            descriptionText: "COFFEE SHOP 123",
            accountId: "acct-checking",
            amount: -450,
            outputs
        });
        const wire = encodeFieldRule(rule);
        // The legacy marker is always the first output so an older reader still decodes one.
        expect(wire.field).toBe(ruleOutputFields(rule)[0]);
        expect(wire.outputFields).toEqual(ruleOutputFields(rule));
        const decoded = decodeFieldRule(wire);
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(decoded.value).toEqual(rule);
    });

    it("emits empty columns for absent outputs, never stale values", () => {
        const wire = encodeFieldRule(
            makeRule({ id: "r1", descriptionText: "X", outputs: ALIAS_OUTPUTS })
        );
        expect(wire).toMatchObject({ tagIds: [], allocations: {}, tagMode: undefined });
    });
});

describe("legacy and grouped wire records", () => {
    const createdAtEpochMs = BASE_INSTANT.epochMilliseconds;

    it("decodes a record without outputFields to exactly the output its field names", () => {
        // A record written before grouped rules. Its stale alias column is ignored, exactly as before.
        const result = decodeFieldRule({
            id: "legacy-1",
            field: "tags",
            descriptionText: "COFFEE SHOP 123",
            aliasId: "stale-alias",
            tagMode: "set",
            tagIds: ["t1"],
            allocations: {},
            createdAtEpochMs
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.outputs).toEqual({ tags: { mode: "set", tagIds: ["t1"] } });
            expect(ruleOutputFields(result.value)).toEqual(["tags"]);
        }
    });

    it("treats an empty outputFields list as a legacy record", () => {
        const result = decodeFieldRule({
            id: "legacy-2",
            field: "descriptionAlias",
            outputFields: [],
            descriptionText: "X",
            aliasId: "alias-1",
            createdAtEpochMs
        });
        expect(result.ok && result.value.outputs).toEqual({
            descriptionAlias: { aliasId: "alias-1" }
        });
    });

    it("reads outputFields over field when both are present", () => {
        const result = decodeFieldRule({
            id: "grouped-1",
            field: "descriptionAlias",
            outputFields: ["descriptionAlias", "allocation"],
            descriptionText: "X",
            aliasId: "alias-1",
            tagMode: "add",
            tagIds: ["ignored"],
            allocations: { "person-a": 100 },
            createdAtEpochMs
        });
        expect(result.ok).toBe(true);
        if (result.ok)
            expect(ruleOutputFields(result.value)).toEqual(["descriptionAlias", "allocation"]);
    });

    it.each([
        {
            name: "a listed tags output without tagMode",
            wire: { field: "tags", outputFields: ["descriptionAlias", "tags"], aliasId: "a" },
            type: "invalid-shape"
        },
        {
            name: "a listed alias output without aliasId",
            wire: { field: "tags", outputFields: ["tags", "descriptionAlias"], tagMode: "add" },
            type: "invalid-shape"
        },
        {
            name: "a listed allocation output with an invalid set",
            wire: {
                field: "tags",
                outputFields: ["tags", "allocation"],
                tagMode: "add",
                allocations: { "person-a": 999 }
            },
            type: "invalid-allocations"
        },
        {
            name: "an unknown output field",
            wire: { field: "tags", outputFields: ["tags", "status"], tagMode: "add" },
            type: "invalid-shape"
        }
    ])("rejects $name", ({ wire, type }) => {
        const result = decodeFieldRule({
            id: "r",
            descriptionText: "X",
            createdAtEpochMs,
            ...wire
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.type).toBe(type);
    });
});

describe("buildFieldRule", () => {
    const base = { id: "r1", descriptionText: "X", createdAtEpochMs: 0 };

    it("rejects a rule with zero outputs", () => {
        const result = buildFieldRule({ ...base, outputs: {} });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.error).toEqual({
                type: "invalid-shape",
                issues: ["a rule requires at least one output"]
            });
    });

    it.each([
        {
            name: "an empty alias id",
            outputs: { descriptionAlias: { aliasId: "" } },
            type: "invalid-shape"
        },
        {
            name: "an invalid allocation set",
            outputs: { allocation: { allocations: { "person-a": 999 } } },
            type: "invalid-allocations"
        }
    ])("rejects $name", ({ outputs, type }) => {
        const result = buildFieldRule({ ...base, outputs });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.type).toBe(type);
    });

    it.each([
        { name: "an empty id", candidate: { ...base, id: "" } },
        { name: "an empty account", candidate: { ...base, accountId: "" } },
        { name: "a fractional amount", candidate: { ...base, amount: 1.5 } }
    ])("rejects $name", ({ candidate }) => {
        expect(buildFieldRule({ ...candidate, outputs: ALIAS_OUTPUTS }).ok).toBe(false);
    });

    it("de-duplicates tag ids preserving order", () => {
        const result = buildFieldRule({
            ...base,
            outputs: { tags: { mode: "add", tagIds: ["b", "a", "b"] } }
        });
        expect(result.ok && result.value.outputs.tags?.tagIds).toEqual(["b", "a"]);
    });
});

describe("output helpers", () => {
    const grouped: RuleOutputs = {
        descriptionAlias: { aliasId: "alias-1" },
        tags: tagsOutput("add", ["t"])
    };

    it("lists output fields in canonical order and reads one output at a time", () => {
        const rule = makeRule({ id: "r1", descriptionText: "X", outputs: grouped });
        expect(ruleOutputFields(rule)).toEqual(["descriptionAlias", "tags"]);
        expect(primaryOutputField(rule.outputs)).toBe("descriptionAlias");
        expect(ruleOutput(rule, "tags")).toEqual({
            field: "tags",
            output: { mode: "add", tagIds: ["t"] }
        });
        expect(ruleOutput(rule, "descriptionAlias")).toEqual({
            field: "descriptionAlias",
            output: { aliasId: "alias-1" }
        });
        expect(ruleOutput(rule, "allocation")).toBeNull();
    });

    it("removes one output and reports emptiness", () => {
        const withoutAlias = withoutRuleOutput(grouped, "descriptionAlias");
        expect(withoutAlias).toEqual({ tags: tagsOutput("add", ["t"]) });
        const onlyTags = nonEmptyRuleOutputs(withoutAlias);
        expect(onlyTags).not.toBeNull();
        if (onlyTags != null)
            expect(nonEmptyRuleOutputs(withoutRuleOutput(onlyTags, "tags"))).toBeNull();
    });

    it.each([
        { left: {}, right: {}, equal: true },
        { left: { accountId: "a" }, right: { accountId: "a" }, equal: true },
        { left: { accountId: "a" }, right: {}, equal: false },
        // Zero is a present constraint, not an absent one.
        { left: { amount: asMinorUnits(0) }, right: {}, equal: false },
        { left: { amount: asMinorUnits(-450) }, right: { amount: asMinorUnits(-450) }, equal: true }
    ])("rulePredicatesEqual($left, $right) = $equal", ({ left, right, equal }) => {
        expect(
            rulePredicatesEqual(
                { descriptionText: "X", ...left },
                { descriptionText: "X", ...right }
            )
        ).toBe(equal);
    });

    it("never treats different description texts as the same predicate", () => {
        expect(rulePredicatesEqual({ descriptionText: "X" }, { descriptionText: "Y" })).toBe(false);
    });
});
