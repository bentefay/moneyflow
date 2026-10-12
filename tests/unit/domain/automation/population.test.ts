import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import {
    countRulePopulation,
    ruleOutputAgrees,
    type RuleFieldValue,
    type RulePopulationTransaction
} from "@/lib/domain/automation/population";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleMatchSubject,
    type RuleOutputs
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const TEXT = "COFFEE SHOP 123";
const REFERENCE = Temporal.PlainDate.from("2026-07-25");

function rule(
    id: string,
    outputs: RuleOutputs,
    scope: { readonly accountId?: string; readonly amount?: number } = {}
): FieldRule {
    return {
        id: FieldRuleIdSchema.parse(id),
        descriptionText: TEXT,
        accountId: scope.accountId,
        amount: scope.amount == null ? undefined : asMinorUnits(scope.amount),
        outputs,
        createdAt: Temporal.Instant.from("2026-07-01T00:00:00Z")
    };
}

function row(
    overrides: Partial<Omit<RulePopulationTransaction, "subject">> & {
        readonly subject?: Partial<RuleMatchSubject>;
    } = {}
): RulePopulationTransaction {
    return {
        date: overrides.date ?? REFERENCE,
        aliasId: overrides.aliasId ?? null,
        tagIds: overrides.tagIds ?? [],
        allocations: overrides.allocations ?? {},
        subject: {
            descriptionText: TEXT,
            accountId: "acct-a",
            amount: asMinorUnits(-450),
            isManual: false,
            ...overrides.subject
        }
    };
}

const ADD_COFFEE: RuleOutputs = { tags: { mode: "add", tagIds: ["coffee"] } };

function count(
    candidate: FieldRule,
    transactions: readonly RulePopulationTransaction[],
    options: {
        readonly rules?: readonly FieldRule[];
        readonly scope?: "all" | "new";
        readonly referenceDate?: Temporal.PlainDate | null;
    } = {}
): number {
    return countRulePopulation({
        rule: candidate,
        rules: options.rules ?? [],
        transactions,
        scope: options.scope ?? "all",
        referenceDate: options.referenceDate === undefined ? REFERENCE : options.referenceDate
    });
}

describe("countRulePopulation", () => {
    it("counts matching rows whose value the rule would change, and no others", () => {
        const transactions = [
            row({ tagIds: [] }),
            row({ tagIds: ["coffee"] }),
            row({ tagIds: ["work"] }),
            row({ subject: { descriptionText: "TEA HOUSE" } })
        ];
        expect(count(rule("r1", ADD_COFFEE), transactions)).toBe(2);
    });

    it("counts a row once even when several of the rule's outputs would change it", () => {
        const grouped = rule("r1", {
            ...ADD_COFFEE,
            descriptionAlias: { aliasId: "alias-coffee" }
        });
        expect(count(grouped, [row()])).toBe(1);
    });

    it("skips a field another rule outranks on that row", () => {
        const accountTags = rule(
            "r-account",
            { tags: { mode: "set", tagIds: ["work"] } },
            {
                accountId: "acct-a"
            }
        );
        const transactions = [row(), row({ subject: { accountId: "acct-b" } })];
        expect(count(rule("r1", ADD_COFFEE), transactions, { rules: [accountTags] })).toBe(1);
    });

    it("replaces the stored rule with the same id rather than competing with it", () => {
        const stored = rule("r1", { tags: { mode: "add", tagIds: ["old"] } });
        const edited = rule("r1", ADD_COFFEE);
        expect(count(edited, [row({ tagIds: ["old"] })], { rules: [stored] })).toBe(1);
        expect(count(edited, [row({ tagIds: ["coffee"] })], { rules: [stored] })).toBe(0);
    });

    it("Update new counts the reference date itself and later dates only", () => {
        const transactions = [
            row({ date: REFERENCE.subtract({ days: 1 }) }),
            row({ date: REFERENCE }),
            row({ date: REFERENCE.add({ days: 3 }) })
        ];
        expect(count(rule("r1", ADD_COFFEE), transactions, { scope: "new" })).toBe(2);
        expect(count(rule("r1", ADD_COFFEE), transactions, { scope: "all" })).toBe(3);
    });

    it("Update new with no reference date means future imports, so nothing changes now", () => {
        expect(count(rule("r1", ADD_COFFEE), [row()], { scope: "new", referenceDate: null })).toBe(
            0
        );
    });

    it("never counts an alias output on a manual row", () => {
        const alias = rule("r1", { descriptionAlias: { aliasId: "alias-coffee" } });
        expect(count(alias, [row({ subject: { isManual: true } })])).toBe(0);
    });
});

describe("ruleOutputAgrees", () => {
    const allocation: RuleOutputs = {
        allocation: { allocations: { p1: AllocationPercentageSchema.parse(100) } }
    };

    it.each([
        {
            name: "alias equal",
            outputs: { descriptionAlias: { aliasId: "a" } },
            current: { field: "descriptionAlias", currentAliasId: "a" },
            expected: true
        },
        {
            name: "alias different",
            outputs: { descriptionAlias: { aliasId: "a" } },
            current: { field: "descriptionAlias", currentAliasId: null },
            expected: false
        },
        {
            name: "add tags already present",
            outputs: ADD_COFFEE,
            current: { field: "tags", currentTagIds: ["work", "coffee"] },
            expected: true
        },
        {
            name: "set tags with an extra tag on the row",
            outputs: { tags: { mode: "set", tagIds: ["coffee"] } },
            current: { field: "tags", currentTagIds: ["coffee", "work"] },
            expected: false
        },
        {
            name: "allocation equal",
            outputs: allocation,
            current: { field: "allocation", currentAllocations: { p1: 100 } },
            expected: true
        },
        {
            name: "no output for the field",
            outputs: ADD_COFFEE,
            current: { field: "allocation", currentAllocations: { p1: 7 } },
            expected: null
        }
    ] satisfies ReadonlyArray<{
        readonly name: string;
        readonly outputs: RuleOutputs;
        readonly current: RuleFieldValue;
        readonly expected: boolean | null;
    }>)("$name", ({ outputs, current, expected }) => {
        expect(ruleOutputAgrees({ outputs }, current)).toBe(expected);
    });
});
