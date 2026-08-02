/**
 * Unit coverage for the UR-009 rule-PROPOSAL state — the CREATION half of the frozen automations
 * behaviour (`specs/human-scratch.md:249-256`, extended to tags and allocation by `:289-292`).
 *
 * The distinction these tests exist to pin down is the one the frozen text draws and the shipped
 * code previously collapsed: the ROBOT surfaces a rule that already exists, while the PROPOSAL
 * appears when a field is changed. A row that matches NO rule must still offer to create one — that
 * is precisely the case the robot returns `none` for.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    allocationValueChanged,
    computeFieldRuleProposal,
    formatAmountForRuleLabel,
    hasProposableValue,
    tagSetChanged
} from "@/components/features/transactions/field-rule-proposal-state";
import {
    computeFieldRuleRobotState,
    type RobotCurrentValue
} from "@/components/features/transactions/field-rule-robot-state";
import {
    type FieldRule,
    type FieldRuleId,
    type RuleAction,
    type RuleMatchSubject
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const DESCRIPTION = "COFFEE SHOP 123";
const ACCOUNT = "acct-checking";

const IMPORTED: RuleMatchSubject = {
    descriptionText: DESCRIPTION,
    accountId: ACCOUNT,
    amount: asMinorUnits(-450),
    isManual: false
};

const MANUAL: RuleMatchSubject = { ...IMPORTED, isManual: true };

function rule(overrides: {
    readonly id: string;
    readonly action: RuleAction;
    readonly accountId?: string;
    readonly amount?: number;
    readonly createdAtEpochMs?: number;
}): FieldRule {
    return {
        id: overrides.id as FieldRuleId,
        descriptionText: DESCRIPTION,
        accountId: overrides.accountId,
        amount: overrides.amount == null ? undefined : asMinorUnits(overrides.amount),
        action: overrides.action,
        createdAt: Temporal.Instant.fromEpochMilliseconds(overrides.createdAtEpochMs ?? 1000)
    };
}

const ALIAS_ACTION: RuleAction = { field: "descriptionAlias", aliasId: "alias-coffee" };
const TAGS_ACTION: RuleAction = { field: "tags", mode: "add", tagIds: ["tag-coffee"] };

const CURRENT_ALIAS: RobotCurrentValue = {
    field: "descriptionAlias",
    currentAliasId: "alias-coffee"
};
const CURRENT_TAGS: RobotCurrentValue = { field: "tags", currentTagIds: ["tag-coffee"] };
const CURRENT_ALLOCATION: RobotCurrentValue = {
    field: "allocation",
    currentAllocations: { "person-a": 60, "person-b": 40 }
};

describe("computeFieldRuleProposal — the reported defect", () => {
    // The principal changed a description and added a tag on an imported transaction that matched
    // no rule, and NO controls appeared. With no rules at all, every field must still propose.
    it.each([
        { field: "descriptionAlias", current: CURRENT_ALIAS },
        { field: "tags", current: CURRENT_TAGS },
        { field: "allocation", current: CURRENT_ALLOCATION }
    ])("offers to CREATE a $field rule when no rule matches", ({ field, current }) => {
        const proposal = computeFieldRuleProposal([], IMPORTED, current);
        expect(proposal.kind).toBe("create");
        if (proposal.kind !== "none") {
            expect(proposal.field).toBe(field);
            expect(proposal.descriptionText).toBe(DESCRIPTION);
        }
    });

    it("carries the exact description text the rule will key on", () => {
        const proposal = computeFieldRuleProposal([], IMPORTED, CURRENT_TAGS);
        expect(proposal.kind !== "none" && proposal.descriptionText).toBe(DESCRIPTION);
    });

    // This is the gap itself, stated as an executable fact rather than a claim: for exactly the
    // inputs above, the ROBOT state — the only rule surface that existed before UR-009 — is `none`
    // for every field. So no amount of robot wiring could have surfaced the principal's controls;
    // the creation surface had to be added. If a future change makes the robot cover this case,
    // this test fails and the two surfaces must be reconciled deliberately.
    it.each([
        { field: "descriptionAlias", current: CURRENT_ALIAS },
        { field: "tags", current: CURRENT_TAGS },
        { field: "allocation", current: CURRENT_ALLOCATION }
    ])(
        "the robot alone stays silent for $field, which is why the proposal exists",
        ({ current }) => {
            expect(computeFieldRuleRobotState([], IMPORTED, current).kind).toBe("none");
            expect(computeFieldRuleProposal([], IMPORTED, current).kind).toBe("create");
        }
    );
});

describe("computeFieldRuleProposal — update rather than create a second rule", () => {
    // Frozen `:287-289`: when the changed field already has a matching rule, the same controls
    // update THAT rule instead of creating a duplicate for the same description text.
    it("proposes an UPDATE of the matching rule", () => {
        const existing = rule({ id: "rule-1", action: TAGS_ACTION });
        const proposal = computeFieldRuleProposal([existing], IMPORTED, CURRENT_TAGS);
        expect(proposal.kind).toBe("update");
        if (proposal.kind === "update") expect(proposal.rule.id).toBe("rule-1");
    });

    // Frozen `:271-274`: precedence is description < description+amount < description+account <
    // description+account+amount. The proposal must update the WINNER, never an arbitrary match.
    it("updates the highest-precedence matching rule, independent of input order", () => {
        const unscoped = rule({ id: "rule-unscoped", action: TAGS_ACTION });
        const amountScoped = rule({ id: "rule-amount", action: TAGS_ACTION, amount: -450 });
        const accountScoped = rule({ id: "rule-account", action: TAGS_ACTION, accountId: ACCOUNT });
        const both = rule({
            id: "rule-both",
            action: TAGS_ACTION,
            accountId: ACCOUNT,
            amount: -450
        });

        for (const rules of [
            [unscoped, amountScoped, accountScoped, both],
            [both, accountScoped, amountScoped, unscoped],
            [accountScoped, both, unscoped, amountScoped]
        ]) {
            const proposal = computeFieldRuleProposal(rules, IMPORTED, CURRENT_TAGS);
            expect(proposal.kind === "update" && proposal.rule.id).toBe("rule-both");
        }
    });

    it("ignores a rule of a different field when deciding create vs update", () => {
        // An alias rule matching the same text must not make a TAG change look like an update.
        const aliasRule = rule({ id: "rule-alias", action: ALIAS_ACTION });
        const proposal = computeFieldRuleProposal([aliasRule], IMPORTED, CURRENT_TAGS);
        expect(proposal.kind).toBe("create");
    });
});

describe("computeFieldRuleProposal — manual rows", () => {
    // Frozen `:268-270` + `:294-295`: description-alias rules never apply to manually created
    // transactions, while tag and person-percentage rules do.
    it("never proposes a description-alias rule from a manual row", () => {
        expect(computeFieldRuleProposal([], MANUAL, CURRENT_ALIAS).kind).toBe("none");
    });

    it.each([
        { field: "tags", current: CURRENT_TAGS },
        { field: "allocation", current: CURRENT_ALLOCATION }
    ])("proposes a $field rule from a manual row", ({ current }) => {
        expect(computeFieldRuleProposal([], MANUAL, current).kind).toBe("create");
    });
});

describe("computeFieldRuleProposal — nothing to propose", () => {
    it("proposes nothing when the row exposes no matchable description text", () => {
        const textless: RuleMatchSubject = { ...IMPORTED, descriptionText: null };
        expect(computeFieldRuleProposal([], textless, CURRENT_TAGS).kind).toBe("none");
    });

    it("proposes nothing when the description text is empty", () => {
        const empty: RuleMatchSubject = { ...IMPORTED, descriptionText: "" };
        expect(computeFieldRuleProposal([], empty, CURRENT_TAGS).kind).toBe("none");
    });

    it.each([
        { label: "no alias", current: { field: "descriptionAlias", currentAliasId: null } },
        { label: "no tags", current: { field: "tags", currentTagIds: [] } },
        { label: "no allocations", current: { field: "allocation", currentAllocations: {} } }
    ] satisfies ReadonlyArray<{ label: string; current: RobotCurrentValue }>)(
        "proposes nothing when the change left the field empty ($label)",
        ({ current }) => {
            expect(hasProposableValue(current)).toBe(false);
            expect(computeFieldRuleProposal([], IMPORTED, current).kind).toBe("none");
        }
    );
});

describe("tagSetChanged", () => {
    // Pins the guard that decides whether a tag commit counts as an edit at all. Without it, the
    // inline cell's re-commits would put creation controls in front of a user who changed nothing.
    it("reports no change when the same tags are re-committed", () => {
        expect(tagSetChanged(["a", "b"], ["a", "b"])).toBe(false);
    });

    it("ignores order, since the cell does not preserve it", () => {
        expect(tagSetChanged(["b", "a"], ["a", "b"])).toBe(false);
    });

    it.each([
        { label: "a tag added", next: ["a", "b"], previous: ["a"] },
        { label: "a tag removed", next: ["a"], previous: ["a", "b"] },
        { label: "a tag swapped", next: ["a", "c"], previous: ["a", "b"] },
        { label: "the first tag on an untagged row", next: ["a"], previous: [] },
        { label: "the last tag removed", next: [], previous: ["a"] }
    ])("reports a change for $label", ({ next, previous }) => {
        expect(tagSetChanged(next, previous)).toBe(true);
    });

    // Same length and same members, but a duplicate on one side: the sets genuinely differ.
    it("reports a change when a duplicate masks a differing member", () => {
        expect(tagSetChanged(["a", "a"], ["a", "b"])).toBe(true);
    });
});

describe("allocationValueChanged", () => {
    it("reports no change when the same number is re-committed", () => {
        expect(allocationValueChanged(60, 60)).toBe(false);
    });

    it("reports a change for a different number", () => {
        expect(allocationValueChanged(60, 40)).toBe(true);
    });

    // A row that has never stored a percentage for this person has no comparable previous value, so
    // entering one is a change. Malformed legacy values behave the same way rather than throwing.
    it.each([
        { label: "absent", previous: undefined },
        { label: "null", previous: null },
        { label: "a legacy string", previous: "60" },
        { label: "NaN", previous: Number.NaN }
    ])("reports a change when the previous value is $label", ({ previous }) => {
        expect(allocationValueChanged(previous, 60)).toBe(true);
    });

    // 0 and -0 are different allocations to the domain, and Object.is keeps them distinct.
    it("distinguishes zero from negative zero", () => {
        expect(allocationValueChanged(0, -0)).toBe(true);
    });
});

describe("formatAmountForRuleLabel", () => {
    // Frozen `:258-259`: the restriction is labelled with the transaction's own amount x.
    it("formats minor units in the account's currency", () => {
        expect(formatAmountForRuleLabel(asMinorUnits(-450), "USD", "en-US")).toBe("-$4.50");
    });

    it("respects a currency with no minor units", () => {
        expect(formatAmountForRuleLabel(asMinorUnits(1234), "JPY", "en-US")).toBe("¥1,234");
    });

    // An unknown code has no currency record to format with, so the label falls back to the bare
    // number rather than inventing a symbol. `toMajorUnits` defaults such a code to two decimals.
    it("falls back to the bare major-units number for an unknown currency", () => {
        expect(formatAmountForRuleLabel(asMinorUnits(1234), "ZZZ", "en-US")).toBe("12.34");
    });
});
