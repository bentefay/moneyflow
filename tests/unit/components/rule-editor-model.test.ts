import { describe, expect, it } from "vitest";

import {
    APPLY_MODES,
    applyModeIsAutomatic,
    applyModeLabel,
    applyModeTargetsNewOnly,
    emptyRuleDraft,
    type RuleEditorDraft,
    validateRuleDraft
} from "@/components/features/automations/rule-editor-model";

const BASE = emptyRuleDraft({
    field: "tags",
    tagMode: "add",
    useAccountScope: false,
    useAmountScope: false
});

function draft(overrides: Partial<RuleEditorDraft>): RuleEditorDraft {
    return { ...BASE, ...overrides };
}

describe("apply-mode helpers", () => {
    it("covers all four frozen modes", () => {
        expect(APPLY_MODES).toEqual(["updatingAll", "updatingNew", "updateAll", "updateNew"]);
    });

    it("classifies automatic vs manual and all vs new", () => {
        expect(applyModeIsAutomatic("updatingAll")).toBe(true);
        expect(applyModeIsAutomatic("updateAll")).toBe(false);
        expect(applyModeTargetsNewOnly("updateNew")).toBe(true);
        expect(applyModeTargetsNewOnly("updateAll")).toBe(false);
    });

    it("labels every mode", () => {
        expect(applyModeLabel("updatingAll")).toBe("Updating all");
        expect(applyModeLabel("updateNew")).toBe("Update new");
    });
});

describe("validateRuleDraft", () => {
    it("rejects a blank description", () => {
        const result = validateRuleDraft(draft({ descriptionText: "   ", tagIds: ["t1"] }), "USD");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.descriptionText).toBeDefined();
    });

    it("accepts a valid unscoped tags rule", () => {
        const result = validateRuleDraft(
            draft({ descriptionText: "COFFEE", tagIds: ["t1"] }),
            "USD"
        );
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.action.field).toBe("tags");
            expect(result.value.accountId).toBeUndefined();
            expect(result.value.amount).toBeUndefined();
        }
    });

    it("requires an account when the account constraint is on", () => {
        const result = validateRuleDraft(
            draft({
                descriptionText: "COFFEE",
                tagIds: ["t1"],
                useAccountScope: true,
                accountId: ""
            }),
            "USD"
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.accountId).toBeDefined();
    });

    it("parses an amount constraint into integer minor units", () => {
        const result = validateRuleDraft(
            draft({
                descriptionText: "COFFEE",
                tagIds: ["t1"],
                useAmountScope: true,
                amountText: "12.34"
            }),
            "USD"
        );
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.amount).toBe(1234);
    });

    it("rejects a non-numeric amount", () => {
        const result = validateRuleDraft(
            draft({
                descriptionText: "COFFEE",
                tagIds: ["t1"],
                useAmountScope: true,
                amountText: "abc"
            }),
            "USD"
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.amount).toBeDefined();
    });

    it("requires at least one tag for an add rule", () => {
        const result = validateRuleDraft(
            draft({ descriptionText: "COFFEE", tagMode: "add", tagIds: [] }),
            "USD"
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.tagIds).toBeDefined();
    });

    it("allows an empty tag set for a set (clear) rule", () => {
        const result = validateRuleDraft(
            draft({ descriptionText: "COFFEE", tagMode: "set", tagIds: [] }),
            "USD"
        );
        expect(result.ok).toBe(true);
        if (result.ok && result.value.action.field === "tags") {
            expect(result.value.action.mode).toBe("set");
            expect(result.value.action.tagIds).toEqual([]);
        }
    });

    it("requires an alias for a descriptionAlias rule", () => {
        const result = validateRuleDraft(
            draft({ field: "descriptionAlias", descriptionText: "COFFEE", aliasId: "" }),
            "USD"
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.aliasId).toBeDefined();
    });

    it("builds a descriptionAlias action from a selected alias", () => {
        const result = validateRuleDraft(
            draft({ field: "descriptionAlias", descriptionText: "COFFEE", aliasId: "alias-1" }),
            "USD"
        );
        expect(result.ok).toBe(true);
        if (result.ok && result.value.action.field === "descriptionAlias") {
            expect(result.value.action.aliasId).toBe("alias-1");
        }
    });

    it("requires at least one allocation percentage", () => {
        const result = validateRuleDraft(
            draft({ field: "allocation", descriptionText: "COFFEE", allocations: {} }),
            "USD"
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.allocations).toBeDefined();
    });

    it("builds an allocation action from parsed percentages", () => {
        const result = validateRuleDraft(
            draft({
                field: "allocation",
                descriptionText: "COFFEE",
                allocations: { p1: "60", p2: "40", p3: "" }
            }),
            "USD"
        );
        expect(result.ok).toBe(true);
        if (result.ok && result.value.action.field === "allocation") {
            expect(result.value.action.allocations).toEqual({ p1: 60, p2: 40 });
        }
    });
});
