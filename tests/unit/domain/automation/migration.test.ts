import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    type LegacyAutomationView,
    type MigrationOptions,
    migrateLegacyAutomations
} from "@/lib/domain/automation/migration";

const NOW = Temporal.Instant.from("2026-02-02T00:00:00Z");
const options: MigrationOptions = {
    now: NOW,
    idFor: (automationId, field) => `rule-${automationId}-${field}`
};

function automation(overrides: Partial<LegacyAutomationView>): LegacyAutomationView {
    return {
        id: "auto-1",
        conditions: [{ column: "description", operator: "contains", value: "COFFEE" }],
        actions: [{ type: "setTags", value: ["tag-a"] }],
        ...overrides
    };
}

describe("migrateLegacyAutomations", () => {
    it("converts a description+setTags automation into a set-mode tags rule", () => {
        const result = migrateLegacyAutomations([automation({})], options);
        expect(result.skipped).toEqual([]);
        expect(result.rules).toHaveLength(1);
        const [rule] = result.rules;
        expect(rule?.descriptionText).toBe("COFFEE");
        expect(rule?.createdAt.epochMilliseconds).toBe(NOW.epochMilliseconds);
        if (rule?.action.field === "tags") {
            expect(rule.action.mode).toBe("set");
            expect(rule.action.tagIds).toEqual(["tag-a"]);
        } else {
            expect.fail("expected a tags rule");
        }
    });

    it("carries an accountId contains condition into account scope", () => {
        const result = migrateLegacyAutomations(
            [
                automation({
                    conditions: [
                        { column: "description", operator: "contains", value: "RENT" },
                        { column: "accountId", operator: "contains", value: "acct-checking" }
                    ]
                })
            ],
            options
        );
        expect(result.rules[0]?.accountId).toBe("acct-checking");
    });

    it("converts setAllocation into a validated allocation rule", () => {
        const result = migrateLegacyAutomations(
            [
                automation({
                    id: "auto-alloc",
                    actions: [{ type: "setAllocation", value: { "person-a": 60, "person-b": 40 } }]
                })
            ],
            options
        );
        expect(result.rules).toHaveLength(1);
        expect(result.rules[0]?.action.field).toBe("allocation");
    });

    it("does not mutate the input automations (no data loss)", () => {
        const input = [automation({})];
        const snapshot = JSON.stringify(input);
        migrateLegacyAutomations(input, options);
        expect(JSON.stringify(input)).toBe(snapshot);
    });

    it.each<[string, Partial<LegacyAutomationView>, string]>([
        ["deleted", { deletedAt: NOW.epochMilliseconds }, "deleted"],
        [
            "regex description",
            { conditions: [{ column: "description", operator: "regex", value: "CO.*" }] },
            "unsupported-conditions"
        ],
        [
            "notes condition",
            {
                conditions: [
                    { column: "description", operator: "contains", value: "X" },
                    { column: "notes", operator: "contains", value: "Y" }
                ]
            },
            "unsupported-conditions"
        ],
        [
            "no description condition",
            { conditions: [{ column: "accountId", operator: "contains", value: "a" }] },
            "unsupported-conditions"
        ],
        [
            "setStatus action",
            { actions: [{ type: "setStatus", value: "s1" }] },
            "status-not-supported"
        ],
        [
            "invalid allocation set",
            { actions: [{ type: "setAllocation", value: { "person-a": 999 } }] },
            "invalid-allocation-set"
        ],
        [
            "invalid tag value",
            { actions: [{ type: "setTags", value: "not-an-array" }] },
            "invalid-tag-value"
        ]
    ])("skips %s with a reason", (_label, overrides, reason) => {
        const result = migrateLegacyAutomations([automation(overrides)], options);
        expect(result.rules).toHaveLength(0);
        expect(result.skipped[0]?.reason).toBe(reason);
    });

    it("reports uniqueness collisions rather than emitting duplicate rules", () => {
        const shared: Partial<LegacyAutomationView> = {
            conditions: [{ column: "description", operator: "contains", value: "COFFEE" }],
            actions: [{ type: "setTags", value: ["tag-a"] }]
        };
        const result = migrateLegacyAutomations(
            [
                { ...automation(shared), id: "auto-1" },
                { ...automation(shared), id: "auto-2" }
            ],
            options
        );
        expect(result.rules).toHaveLength(1);
        // Same createdAt -> the lexicographically greater rule id survives (auto-2), auto-1 drops.
        expect(result.rules[0]?.id).toBe("rule-auto-2-tags");
        expect(result.skipped).toContainEqual({
            automationId: "auto-1",
            reason: "uniqueness-collision"
        });
    });

    it("emits one rule per supported action of a single automation", () => {
        const result = migrateLegacyAutomations(
            [
                automation({
                    id: "auto-multi",
                    actions: [
                        { type: "setTags", value: ["tag-a"] },
                        { type: "setAllocation", value: { "person-a": 100 } }
                    ]
                })
            ],
            options
        );
        const fields = result.rules.map((rule) => rule.action.field).sort();
        expect(fields).toEqual(["allocation", "tags"]);
    });
});
