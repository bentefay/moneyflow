import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import { type TransactionInput, type TransactionStore } from "@/lib/crdt/schema";
import {
    type RuleApplicationTarget,
    applyRulePlans,
    applyRulesToTargets,
    planRuleApplications
} from "@/lib/domain/automation/apply";
import { type FieldRule, decodeFieldRule } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const DATE = Temporal.PlainDate.from("2026-07-25");
const LOCATION: TransactionLocation = {
    accountId: "account-1",
    date: DATE,
    transactionId: "transaction-1"
};
const CREATED_AT = Temporal.Instant.from("2026-07-01T00:00:00Z").epochMilliseconds;

function transaction(
    overrides: Partial<TransactionInput> = {}
): Omit<TransactionInput, "suspectedDuplicates"> {
    return {
        id: LOCATION.transactionId,
        date: DATE,
        description: "COFFEE SHOP 123",
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-450),
        originalAmount: undefined,
        accountId: LOCATION.accountId,
        tagIds: [],
        statusId: "status-1",
        importId: undefined,
        allocations: {} as TransactionInput["allocations"],
        creationInstant: Temporal.Instant.from("2026-07-25T00:00:00Z"),
        importRowIndex: 0,
        deletedAt: undefined,
        ...overrides
    };
}

function alloc(record: Record<string, number>): TransactionInput["allocations"] {
    return record as TransactionInput["allocations"];
}

function storeWith(overrides: Partial<TransactionInput> = {}): TransactionStore {
    const store = {} as TransactionStore;
    insertTransaction(store, { transaction: transaction(overrides) });
    return store;
}

function makeRule(wire: Record<string, unknown>): FieldRule {
    const result = decodeFieldRule({ createdAtEpochMs: CREATED_AT, ...wire });
    if (!result.ok) throw new Error(`Expected a valid rule: ${JSON.stringify(result.error)}`);
    return result.value;
}

function explicitAllocations(store: TransactionStore): Record<string, number> {
    const allocations = findTransactionInStore(store, LOCATION)?.allocations ?? {};
    const explicit: Record<string, number> = {};
    for (const [personId, value] of Object.entries(allocations)) {
        if (personId !== "$cid" && typeof value === "number") explicit[personId] = value;
    }
    return explicit;
}

function tagIds(store: TransactionStore): readonly string[] {
    return [...(findTransactionInStore(store, LOCATION)?.tagIds ?? [])];
}

function importedTarget(overrides: Partial<RuleApplicationTarget> = {}): RuleApplicationTarget {
    return {
        subject: {
            descriptionText: "COFFEE SHOP 123",
            accountId: LOCATION.accountId,
            amount: asMinorUnits(-450),
            isManual: false
        },
        location: LOCATION,
        currentTagIds: [],
        ...overrides
    };
}

describe("field-rule application to a real transaction store", () => {
    it("applies a tags rule via updateTransaction and is idempotent", () => {
        const store = storeWith();
        const rule = makeRule({
            id: "r-tags",
            field: "tags",
            descriptionText: "COFFEE SHOP 123",
            tagMode: "set",
            tagIds: ["coffee"]
        });
        const target = importedTarget();

        const first = applyRulePlans(store, target, planRuleApplications([rule], target));
        expect(first).toEqual([{ field: "tags", ruleId: "r-tags", status: "applied" }]);
        expect(tagIds(store)).toEqual(["coffee"]);

        // Re-applying with the now-current tags yields "unchanged" (idempotent, convergent).
        const second = applyRulePlans(
            store,
            importedTarget({ currentTagIds: ["coffee"] }),
            planRuleApplications([rule], importedTarget({ currentTagIds: ["coffee"] }))
        );
        expect(second).toEqual([{ field: "tags", ruleId: "r-tags", status: "unchanged" }]);
        expect(tagIds(store)).toEqual(["coffee"]);
    });

    it("routes allocation writes through P16C: complete-set replacement removes absent keys", () => {
        const store = storeWith({ allocations: alloc({ "person-a": 50, "person-b": 50 }) });
        expect(explicitAllocations(store)).toEqual({ "person-a": 50, "person-b": 50 });

        const rule = makeRule({
            id: "r-alloc",
            field: "allocation",
            descriptionText: "COFFEE SHOP 123",
            allocations: { "person-a": 100 }
        });
        const target = importedTarget();
        const outcomes = applyRulePlans(store, target, planRuleApplications([rule], target));

        expect(outcomes).toHaveLength(1);
        const [outcome] = outcomes;
        expect(outcome?.field).toBe("allocation");
        if (outcome?.field === "allocation" && outcome.status === "applied") {
            expect(outcome.previousAllocations).toEqual({ "person-a": 50, "person-b": 50 });
        } else {
            expect.fail("expected an applied allocation outcome");
        }
        // person-b removed (absent from the complete set), person-a replaced.
        expect(explicitAllocations(store)).toEqual({ "person-a": 100 });

        // Idempotent: applying the same allocation set again converges to the same state.
        applyRulePlans(store, target, planRuleApplications([rule], target));
        expect(explicitAllocations(store)).toEqual({ "person-a": 100 });
    });

    it("applies only the single highest-precedence rule per field", () => {
        const store = storeWith();
        const unscoped = makeRule({
            id: "r-unscoped",
            field: "tags",
            descriptionText: "COFFEE SHOP 123",
            tagMode: "set",
            tagIds: ["generic"]
        });
        const accountScoped = makeRule({
            id: "r-account",
            field: "tags",
            descriptionText: "COFFEE SHOP 123",
            accountId: LOCATION.accountId,
            tagMode: "set",
            tagIds: ["specific"]
        });
        const target = importedTarget();
        applyRulePlans(store, target, planRuleApplications([unscoped, accountScoped], target));
        expect(tagIds(store)).toEqual(["specific"]);
    });

    it("excludes manual transactions from description-alias rules but not tag rules", () => {
        const aliasRule = makeRule({
            id: "r-alias",
            field: "descriptionAlias",
            descriptionText: "COFFEE SHOP 123",
            aliasId: "alias-1"
        });
        const tagRule = makeRule({
            id: "r-tags",
            field: "tags",
            descriptionText: "COFFEE SHOP 123",
            tagMode: "add",
            tagIds: ["coffee"]
        });
        const manualTarget = importedTarget({
            subject: {
                descriptionText: "COFFEE SHOP 123",
                accountId: LOCATION.accountId,
                amount: asMinorUnits(-450),
                isManual: true
            }
        });
        const plans = planRuleApplications([aliasRule, tagRule], manualTarget);
        expect(plans.map((plan) => plan.field)).toEqual(["tags"]);
    });

    it("surfaces description-alias plans as deferred (dedicated P11 write boundary)", () => {
        const store = storeWith();
        const aliasRule = makeRule({
            id: "r-alias",
            field: "descriptionAlias",
            descriptionText: "COFFEE SHOP 123",
            aliasId: "alias-1"
        });
        const target = importedTarget();
        const outcomes = applyRulePlans(store, target, planRuleApplications([aliasRule], target));
        expect(outcomes).toEqual([
            {
                field: "descriptionAlias",
                ruleId: "r-alias",
                status: "deferred-alias-boundary",
                aliasId: "alias-1"
            }
        ]);
        // The alias id was NOT written to the transaction (boundary respected).
        expect(findTransactionInStore(store, LOCATION)?.descriptionAliasId).toBeUndefined();
    });

    it("bulk-applies across independent targets", () => {
        const store = storeWith();
        const rule = makeRule({
            id: "r-tags",
            field: "tags",
            descriptionText: "COFFEE SHOP 123",
            tagMode: "set",
            tagIds: ["coffee"]
        });
        const entries = applyRulesToTargets(store, [rule], [importedTarget()]);
        expect(entries).toHaveLength(1);
        expect(entries[0]?.outcomes[0]?.status).toBe("applied");
        expect(tagIds(store)).toEqual(["coffee"]);
    });
});
