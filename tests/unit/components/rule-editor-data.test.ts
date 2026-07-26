import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    draftFromRule,
    mutationErrorToFieldErrors
} from "@/components/features/automations/rule-editor-data";
import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import { type FieldRule, FieldRuleIdSchema } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");

function ruleId(id: string): FieldRule["id"] {
    return FieldRuleIdSchema.parse(id);
}

describe("draftFromRule", () => {
    it("reproduces a scoped description-alias rule into an editable draft", () => {
        const rule: FieldRule = {
            id: ruleId("r1"),
            descriptionText: "COFFEE SHOP 123",
            accountId: "account-1",
            amount: asMinorUnits(-450),
            action: { field: "descriptionAlias", aliasId: "alias-coffee" },
            createdAt: CREATION
        };
        const draft = draftFromRule(rule, "USD", "updateNew");
        expect(draft.field).toBe("descriptionAlias");
        expect(draft.descriptionText).toBe("COFFEE SHOP 123");
        expect(draft.useAccountScope).toBe(true);
        expect(draft.accountId).toBe("account-1");
        expect(draft.useAmountScope).toBe(true);
        // -450 minor units in USD renders as major units -4.5.
        expect(draft.amountText).toBe("-4.5");
        expect(draft.aliasId).toBe("alias-coffee");
        expect(draft.applyMode).toBe("updateNew");
    });

    it("carries allocation percentages as raw strings and no scope when unscoped", () => {
        const rule: FieldRule = {
            id: ruleId("r2"),
            descriptionText: "RENT",
            action: {
                field: "allocation",
                allocations: {
                    "person-a": AllocationPercentageSchema.parse(60),
                    "person-b": AllocationPercentageSchema.parse(40)
                }
            },
            createdAt: CREATION
        };
        const draft = draftFromRule(rule, "USD", "updateAll");
        expect(draft.field).toBe("allocation");
        expect(draft.useAccountScope).toBe(false);
        expect(draft.useAmountScope).toBe(false);
        expect(draft.allocations).toEqual({ "person-a": "60", "person-b": "40" });
    });

    it("carries tag ids and mode for a tags rule", () => {
        const rule: FieldRule = {
            id: ruleId("r3"),
            descriptionText: "GROCERY",
            action: { field: "tags", mode: "set", tagIds: ["tag-a", "tag-b"] },
            createdAt: CREATION
        };
        const draft = draftFromRule(rule, "USD", "updatingAll");
        expect(draft.tagMode).toBe("set");
        expect(draft.tagIds).toEqual(["tag-a", "tag-b"]);
    });
});

describe("mutationErrorToFieldErrors", () => {
    it("maps duplicate-key onto the description field", () => {
        const errors = mutationErrorToFieldErrors({ type: "duplicate-key", existingRuleId: "r1" });
        expect(errors.descriptionText).toContain("already exists");
    });

    it("maps invalid-allocations onto the allocations field", () => {
        const errors = mutationErrorToFieldErrors({ type: "invalid-allocations", errors: [] });
        expect(errors.allocations).toContain("between -100 and 100");
    });

    it("maps invalid-rule and not-found onto a generic description message", () => {
        expect(
            mutationErrorToFieldErrors({ type: "invalid-rule", issues: [] }).descriptionText
        ).toContain("not valid");
        expect(
            mutationErrorToFieldErrors({ type: "not-found", ruleId: "r1" }).descriptionText
        ).toContain("not valid");
    });
});
