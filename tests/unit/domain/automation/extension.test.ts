import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import {
    type RuleExtensionTarget,
    resolveRuleExtensionTarget
} from "@/lib/domain/automation/extension";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleField,
    type RuleMatchSubject,
    type RuleOutputs,
    type RulePredicate,
    decodeFieldRule
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

// Shared facts of the ownership contract's §5.4 scenario table.
const TEXT = "COFFEE SHOP 123";
const ACCOUNT_A = "acct-a";
const ACCOUNT_B = "acct-b";
const BASE_INSTANT = Temporal.Instant.from("2026-07-25T00:00:00Z");
const SHUFFLE_SEED = 17_050_003;

const ALIAS: RuleOutputs = { descriptionAlias: { aliasId: "alias-coffee" } };
const TAGS: RuleOutputs = { tags: { mode: "add", tagIds: ["coffee"] } };
const ALLOCATION: RuleOutputs = {
    allocation: { allocations: { "person-1": AllocationPercentageSchema.parse(100) } }
};

interface RuleSpec {
    readonly id: string;
    readonly outputs: RuleOutputs;
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
        outputs: spec.outputs,
        createdAt: BASE_INSTANT.add({ milliseconds: spec.createdAtOffsetMs ?? 0 })
    };
}

function subject(overrides: Partial<RuleMatchSubject> = {}): RuleMatchSubject {
    return {
        descriptionText: TEXT,
        accountId: ACCOUNT_A,
        amount: asMinorUnits(-450),
        isManual: false,
        ...overrides
    };
}

function predicate(
    scope: { readonly accountId?: string; readonly amount?: number } = {}
): RulePredicate {
    return {
        descriptionText: TEXT,
        accountId: scope.accountId,
        amount: scope.amount == null ? undefined : asMinorUnits(scope.amount)
    };
}

/** The expected result by rule id, so each table row reads like the contract's own column. */
type Expected =
    | { readonly kind: "ineligible" }
    | { readonly kind: "create" }
    | { readonly kind: "update-owner"; readonly rule: string }
    | { readonly kind: "extend"; readonly rule: string }
    | { readonly kind: "conflict"; readonly owner: string; readonly host: string }
    | { readonly kind: "ambiguous"; readonly candidates: readonly string[] };

function byId(target: RuleExtensionTarget): Expected {
    switch (target.kind) {
        case "ineligible":
        case "create":
            return { kind: target.kind };
        case "update-owner":
        case "extend":
            return { kind: target.kind, rule: target.rule.id };
        case "conflict":
            return { kind: "conflict", owner: target.owner.id, host: target.host.id };
        case "ambiguous":
            return { kind: "ambiguous", candidates: target.candidates.map((r) => r.id) };
    }
}

interface Scenario {
    readonly name: string;
    readonly rules: readonly FieldRule[];
    readonly field: RuleField;
    readonly predicate: RulePredicate;
    readonly subject?: RuleMatchSubject;
    readonly expected: Expected;
}

const SCENARIOS: readonly Scenario[] = [
    {
        name: "S-01 no rules: create",
        rules: [],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A, amount: -450 }),
        expected: { kind: "create" }
    },
    {
        name: "S-02 the account-scoped tags owner is updated",
        rules: [rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_A })],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A }),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-03 the amount-scoped owner is updated when the draft keeps the amount",
        rules: [rule({ id: "r1", outputs: TAGS, amount: -450 })],
        field: "tags",
        predicate: predicate({ amount: -450 }),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-03 dropping the amount restriction is a different predicate: create (D-004)",
        rules: [rule({ id: "r1", outputs: TAGS, amount: -450 })],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "create" }
    },
    {
        name: "S-04 the account+amount owner is updated",
        rules: [rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_A, amount: -450 })],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A, amount: -450 }),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-05 tags fold into the unscoped alias rule when the draft is unscoped (EX-03)",
        rules: [rule({ id: "r1", outputs: ALIAS })],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "extend", rule: "r1" }
    },
    {
        name: "S-05 a narrower draft never folds into the broader alias rule: create",
        rules: [rule({ id: "r1", outputs: ALIAS })],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A, amount: -450 }),
        expected: { kind: "create" }
    },
    {
        name: "S-06 three tags rules at three ranks: only the identical one is a candidate",
        rules: [
            rule({ id: "r1", outputs: TAGS }),
            rule({ id: "r2", outputs: TAGS, amount: -450 }),
            rule({ id: "r3", outputs: TAGS, accountId: ACCOUNT_A, amount: -450 })
        ],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A, amount: -450 }),
        expected: { kind: "update-owner", rule: "r3" }
    },
    {
        name: "S-07 the tags owner and a different alias rule: conflict, owner first (D-003)",
        rules: [rule({ id: "r1", outputs: ALIAS }), rule({ id: "r2", outputs: TAGS })],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "conflict", owner: "r2", host: "r1" }
    },
    {
        name: "S-08 an alias rule with a different predicate is not a host",
        rules: [
            rule({ id: "r1", outputs: ALIAS, accountId: ACCOUNT_A }),
            rule({ id: "r2", outputs: TAGS })
        ],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r2" }
    },
    {
        name: "S-09 two non-alias candidates, one owns the field: the owner, no tiebreak",
        rules: [rule({ id: "r1", outputs: TAGS }), rule({ id: "r2", outputs: ALLOCATION })],
        field: "allocation",
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r2" }
    },
    {
        name: "S-10 the alias owner is also the preferred host: update it",
        rules: [
            rule({ id: "r1", outputs: ALIAS }),
            rule({ id: "r2", outputs: TAGS }),
            rule({ id: "r3", outputs: ALLOCATION })
        ],
        field: "descriptionAlias",
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-11 on the A row the account rule is the owner",
        rules: [
            rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_A }),
            rule({ id: "r2", outputs: TAGS })
        ],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A }),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-11 on the B row the unscoped rule is the owner",
        rules: [
            rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_A }),
            rule({ id: "r2", outputs: TAGS })
        ],
        field: "tags",
        subject: subject({ accountId: ACCOUNT_B }),
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r2" }
    },
    {
        name: "S-12 a different-account set-mode rule is not a candidate",
        rules: [
            rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_A }),
            rule({
                id: "r2",
                outputs: { tags: { mode: "set", tagIds: ["coffee"] } },
                accountId: ACCOUNT_B
            })
        ],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A }),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-13 a drifted owner is still the owner; showing the drift is the surface's job",
        rules: [rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_A })],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A }),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-14 a duplicated slot is surfaced, never resolved by recency (D-012)",
        rules: [
            rule({ id: "r2", outputs: TAGS, accountId: ACCOUNT_A, createdAtOffsetMs: 1000 }),
            rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_A })
        ],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_A }),
        expected: { kind: "ambiguous", candidates: ["r1", "r2"] }
    },
    {
        name: "S-16 a manual row matches through its resolved alias name",
        rules: [rule({ id: "r1", outputs: TAGS })],
        field: "tags",
        subject: subject({ isManual: true }),
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "S-16 an alias edit on a manual row is ineligible even with an alias owner",
        rules: [rule({ id: "r1", outputs: ALIAS })],
        field: "descriptionAlias",
        subject: subject({ isManual: true }),
        predicate: predicate(),
        expected: { kind: "ineligible" }
    },
    {
        name: "S-16 an alias edit on a manual row is ineligible with no rules at all",
        rules: [],
        field: "descriptionAlias",
        subject: subject({ isManual: true }),
        predicate: predicate(),
        expected: { kind: "ineligible" }
    },
    {
        name: "S-16 an alias-only rule is not a host for a manual row's tag edit",
        rules: [rule({ id: "r1", outputs: ALIAS })],
        field: "tags",
        subject: subject({ isManual: true }),
        predicate: predicate(),
        expected: { kind: "create" }
    },
    {
        name: "S-16 on a manual row an alias-only rule never turns the tags owner into a conflict",
        rules: [rule({ id: "r1", outputs: ALIAS }), rule({ id: "r2", outputs: TAGS })],
        field: "tags",
        subject: subject({ isManual: true }),
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r2" }
    },
    {
        name: "S-16 a grouped alias rule is still a host on a manual row through its tags",
        rules: [rule({ id: "r1", outputs: { ...ALIAS, ...TAGS } })],
        field: "allocation",
        subject: subject({ isManual: true }),
        predicate: predicate(),
        expected: { kind: "extend", rule: "r1" }
    },
    {
        name: "the same alias-only rule IS the host for an imported row's tag edit",
        rules: [rule({ id: "r1", outputs: ALIAS })],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "extend", rule: "r1" }
    },
    {
        name: "S-17 a rule on a different text is never a host",
        rules: [rule({ id: "r1", outputs: TAGS, descriptionText: "BOOKSTORE 99" })],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "create" }
    },
    {
        name: "S-18 a zero-amount rule is a real constraint and does not match a -450 row",
        rules: [rule({ id: "r1", outputs: TAGS, amount: 0 }), rule({ id: "r2", outputs: TAGS })],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r2" }
    },
    {
        name: "S-20 two alias rules in one slot are surfaced, not chosen between",
        rules: [
            rule({ id: "r1", outputs: { descriptionAlias: { aliasId: "alias-x" } } }),
            rule({ id: "r2", outputs: { descriptionAlias: { aliasId: "alias-y" } } })
        ],
        field: "descriptionAlias",
        predicate: predicate(),
        expected: { kind: "ambiguous", candidates: ["r1", "r2"] }
    },
    // Ladder steps the contract table does not spell out row by row.
    {
        name: "step 5: a single non-alias candidate without the field is extended",
        rules: [rule({ id: "r1", outputs: TAGS })],
        field: "allocation",
        predicate: predicate(),
        expected: { kind: "extend", rule: "r1" }
    },
    {
        name: "step 6: several non-alias candidates and no owner is ambiguous (D-005)",
        rules: [rule({ id: "r2", outputs: ALLOCATION }), rule({ id: "r1", outputs: TAGS })],
        field: "descriptionAlias",
        predicate: predicate(),
        expected: { kind: "ambiguous", candidates: ["r1", "r2"] }
    },
    {
        name: "step 4: the alias rule is preferred over another candidate without the field",
        rules: [rule({ id: "r1", outputs: ALIAS }), rule({ id: "r2", outputs: TAGS })],
        field: "allocation",
        predicate: predicate(),
        expected: { kind: "extend", rule: "r1" }
    },
    {
        name: "a grouped rule that owns the field and carries the alias is updated",
        rules: [rule({ id: "r1", outputs: { ...ALIAS, ...TAGS } })],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "update-owner", rule: "r1" }
    },
    {
        name: "a grouped alias rule is extended with its missing field",
        rules: [
            rule({ id: "r1", outputs: { ...ALIAS, ...TAGS } }),
            rule({ id: "r2", outputs: TAGS, amount: -450 })
        ],
        field: "allocation",
        predicate: predicate(),
        expected: { kind: "extend", rule: "r1" }
    },
    {
        name: "an owner beside two alias hosts cannot name one host: ambiguous",
        rules: [
            rule({ id: "r3", outputs: TAGS }),
            rule({ id: "r1", outputs: { descriptionAlias: { aliasId: "alias-x" } } }),
            rule({ id: "r2", outputs: { descriptionAlias: { aliasId: "alias-y" } } })
        ],
        field: "tags",
        predicate: predicate(),
        expected: { kind: "ambiguous", candidates: ["r1", "r2", "r3"] }
    },
    {
        name: "a rule matching the row under a broader predicate is excluded",
        rules: [
            rule({ id: "r1", outputs: ALIAS }),
            rule({ id: "r2", outputs: TAGS, accountId: ACCOUNT_A })
        ],
        field: "allocation",
        predicate: predicate({ accountId: ACCOUNT_A }),
        expected: { kind: "extend", rule: "r2" }
    },
    {
        name: "an identical predicate that does not match the row is excluded",
        rules: [rule({ id: "r1", outputs: TAGS, accountId: ACCOUNT_B })],
        field: "tags",
        predicate: predicate({ accountId: ACCOUNT_B }),
        expected: { kind: "create" }
    }
];

describe("resolveRuleExtensionTarget", () => {
    it.each(SCENARIOS)("$name", ({ rules, field, predicate: draft, subject: row, expected }) => {
        const target = resolveRuleExtensionTarget({
            rules,
            field,
            predicate: draft,
            subject: row ?? subject()
        });
        expect(byId(target)).toEqual(expected);
    });

    it("S-15 an undecodable record is never a host", () => {
        // The ladder receives only decoded rules, exactly as `readActiveFieldRules` provides them.
        const wires = [
            {
                id: "r1",
                field: "tags",
                descriptionText: TEXT,
                accountId: ACCOUNT_A,
                tagMode: "add",
                allocations: { "person-1": 999 },
                outputFields: ["tags", "allocation"],
                createdAtEpochMs: 0
            }
        ];
        const rules = wires.flatMap((wire) => {
            const decoded = decodeFieldRule(wire);
            return decoded.ok ? [decoded.value] : [];
        });
        expect(rules).toEqual([]);
        const target = resolveRuleExtensionTarget({
            rules,
            field: "tags",
            predicate: predicate({ accountId: ACCOUNT_A }),
            subject: subject()
        });
        expect(target).toEqual({ kind: "create" });
    });

    it.each(SCENARIOS)(
        "$name — independent of rule order",
        ({ rules, field, predicate: draft, subject: row }) => {
            const query = { field, predicate: draft, subject: row ?? subject() };
            const reference = resolveRuleExtensionTarget({ ...query, rules });
            fc.assert(
                fc.property(
                    fc.shuffledSubarray([...rules], { minLength: rules.length }),
                    (shuffled) => {
                        expect(resolveRuleExtensionTarget({ ...query, rules: shuffled })).toEqual(
                            reference
                        );
                    }
                ),
                { seed: SHUFFLE_SEED, numRuns: 30 }
            );
        }
    );

    it("never depends on rule order for arbitrary rule sets", () => {
        const outputsArbitrary = fc.constantFrom<RuleOutputs>(
            ALIAS,
            TAGS,
            ALLOCATION,
            { ...ALIAS, ...TAGS },
            { ...TAGS, ...ALLOCATION },
            { ...ALIAS, ...TAGS, ...ALLOCATION }
        );
        const scopeArbitrary = fc.record({
            accountId: fc.constantFrom(undefined, ACCOUNT_A, ACCOUNT_B),
            amount: fc.constantFrom(undefined, -450, -600)
        });
        const rulesArbitrary = fc
            .array(fc.tuple(outputsArbitrary, scopeArbitrary, fc.nat({ max: 3 })), {
                maxLength: 6
            })
            .map((specs) =>
                specs.map(([outputs, scope, offset], index) =>
                    rule({ id: `r${index}`, outputs, ...scope, createdAtOffsetMs: offset * 1000 })
                )
            );
        fc.assert(
            fc.property(
                rulesArbitrary.chain((rules) =>
                    fc.tuple(
                        fc.constant(rules),
                        fc.shuffledSubarray(rules, { minLength: rules.length })
                    )
                ),
                fc.constantFrom<RuleField>("descriptionAlias", "tags", "allocation"),
                scopeArbitrary,
                fc.boolean(),
                ([rules, shuffled], field, scope, isManual) => {
                    const query = {
                        field,
                        predicate: predicate(scope),
                        subject: subject({ isManual })
                    };
                    expect(resolveRuleExtensionTarget({ ...query, rules: shuffled })).toEqual(
                        resolveRuleExtensionTarget({ ...query, rules })
                    );
                }
            ),
            { seed: SHUFFLE_SEED, numRuns: 300 }
        );
    });
});
