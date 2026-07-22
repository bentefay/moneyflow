import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    assignDescriptionAlias,
    changeAllDescriptionAliases,
    createDescriptionAlias
} from "@/lib/crdt/description-aliases";
import {
    applyVaultMaintenancePlan,
    createVaultMaintenanceCursor,
    DEFAULT_VAULT_MAINTENANCE_BUDGET,
    planVaultMaintenanceStep,
    runVaultMaintenanceFrame,
    type VaultMaintenanceCursor,
    type VaultMaintenancePlan
} from "@/lib/crdt/maintenance";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import { deleteTransaction, insertTransaction } from "@/lib/crdt/mutations";
import type { TransactionInput, VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { createDescriptionAliasLookup } from "@/lib/domain/description-aliases";

const DATE = Temporal.PlainDate.from("2024-02-03");

function transactionInput(
    id: string,
    creationMilliseconds: number,
    descriptionAliasId?: string
): TransactionInput {
    return {
        id,
        date: DATE,
        description: `Raw ${id}`,
        descriptionAliasId,
        notes: "",
        amount: asMinorUnits(creationMilliseconds),
        accountId: "account",
        tagIds: [],
        statusId: "status-for-review",
        importId: "maintenance-import",
        allocations: {},
        creationInstant: Temporal.Instant.fromEpochMilliseconds(creationMilliseconds),
        importRowIndex: creationMilliseconds,
        suspectedDuplicates: [],
        deletedAt: undefined
    };
}

function createDuplicateBucketMirror(leftIds: readonly string[], rightIds: readonly string[]) {
    const base = createVaultMirror();
    base.mirror.setState((state: VaultState) => {
        insertTransaction(state.transactions, {
            transaction: {
                ...transactionInput("newest", 100),
                date: Temporal.PlainDate.from("2025-01-01")
            }
        });
    });
    const snapshot = base.doc.export({ mode: "snapshot" });
    const left = createVaultMirrorFromSnapshot(snapshot);
    const right = createVaultMirrorFromSnapshot(snapshot);
    const leftBase = left.doc.version();
    const rightBase = right.doc.version();
    left.mirror.setState((state: VaultState) => {
        leftIds.forEach((id, index) =>
            insertTransaction(state.transactions, {
                transaction: transactionInput(id, 80 - index)
            })
        );
    });
    right.mirror.setState((state: VaultState) => {
        rightIds.forEach((id, index) =>
            insertTransaction(state.transactions, {
                transaction: transactionInput(id, 40 - index)
            })
        );
    });
    left.doc.import(right.doc.export({ mode: "update", from: rightBase }));
    right.doc.import(left.doc.export({ mode: "update", from: leftBase }));
    right.mirror.dispose();
    base.mirror.dispose();
    return left;
}

function applyPlan(
    mirror: ReturnType<typeof createVaultMirror>["mirror"],
    plan: VaultMaintenancePlan
): boolean {
    let applied = false;
    mirror.setState(
        (state: VaultState) => {
            applied = applyVaultMaintenancePlan(state, plan);
        },
        { origin: "system:gc" }
    );
    return applied;
}

function drainMaintenance(mirror: ReturnType<typeof createVaultMirror>["mirror"]): {
    readonly applied: number;
    readonly frames: number;
    readonly maxProcessed: number;
} {
    let cursor = createVaultMaintenanceCursor(mirror.getState());
    let applied = 0;
    let frames = 0;
    let maxProcessed = 0;
    while (frames < 10_000) {
        const result = runVaultMaintenanceFrame({
            apply: (plan) => applyPlan(mirror, plan),
            cursor,
            getState: () => mirror.getState(),
            now: () => 0
        });
        cursor = result.cursor;
        applied += result.applied;
        frames += 1;
        maxProcessed = Math.max(maxProcessed, result.processed);
        if (result.complete) return { applied, frames, maxProcessed };
    }
    throw new Error("Maintenance did not reach a clean cursor");
}

function findPlan(
    state: VaultState,
    predicate: (plan: VaultMaintenancePlan) => boolean
): { readonly cursor: VaultMaintenanceCursor; readonly plan: VaultMaintenancePlan } {
    let cursor = createVaultMaintenanceCursor(state);
    for (let item = 0; item < 10_000; item += 1) {
        const step = planVaultMaintenanceStep(state, cursor);
        cursor = step.cursor;
        if (step.plan && predicate(step.plan)) return { cursor, plan: step.plan };
        if (cursor.phase === "done") break;
    }
    throw new Error("Expected maintenance plan was not discovered");
}

function dayTransactionIds(state: VaultState): string[] {
    const tree = state.transactions.account;
    if (typeof tree !== "object" || tree == null) return [];
    const year = tree.years.find((bucket) => bucket.year === 2024);
    const month = year?.months.find((bucket) => bucket.month === 2);
    const day = month?.days.find((bucket) => bucket.day === 3);
    return day?.transactions.map((transaction) => transaction.id) ?? [];
}

describe("bounded vault maintenance", () => {
    it("enforces explicit item and measured-time bounds without sleeps", () => {
        expect(DEFAULT_VAULT_MAINTENANCE_BUDGET).toEqual({
            maxItems: 32,
            maxMilliseconds: 4
        });
        const { mirror } = createDuplicateBucketMirror(["left"], ["right"]);
        const byItems = runVaultMaintenanceFrame({
            apply: () => false,
            budget: { maxItems: 2, maxMilliseconds: 100 },
            cursor: createVaultMaintenanceCursor(mirror.getState()),
            getState: () => mirror.getState(),
            now: () => 0
        });
        expect(byItems).toMatchObject({ processed: 2, yieldReason: "items" });

        let clock = -1;
        const byTime = runVaultMaintenanceFrame({
            apply: () => false,
            budget: { maxItems: 100, maxMilliseconds: 4 },
            cursor: createVaultMaintenanceCursor(mirror.getState()),
            getState: () => mirror.getState(),
            now: () => {
                clock += 1;
                return clock;
            }
        });
        expect(byTime).toMatchObject({ processed: 3, yieldReason: "time" });
        mirror.dispose();
    });

    it("merges only adjacent equal buckets one child at a time and preserves exact order", () => {
        const { doc, mirror } = createDuplicateBucketMirror(
            ["left-a", "left-b"],
            ["right-a", "right-b"]
        );
        const origins: Array<string | undefined> = [];
        const unsubscribe = doc.subscribe((event) => origins.push(event.origin));
        const result = drainMaintenance(mirror);
        const state = mirror.getState();
        const tree = state.transactions.account;
        if (typeof tree !== "object" || tree == null) throw new Error("Missing account tree");
        expect(tree.years.map((year) => year.year)).toEqual([2025, 2024]);
        expect(tree.years[1].months.map((month) => month.month)).toEqual([2]);
        expect(tree.years[1].months[0].days.map((day) => day.day)).toEqual([3]);
        expect(dayTransactionIds(state)).toEqual(["left-a", "left-b", "right-a", "right-b"]);
        expect(result.maxProcessed).toBeLessThanOrEqual(DEFAULT_VAULT_MAINTENANCE_BUDGET.maxItems);
        expect(origins.length).toBeGreaterThan(0);
        expect(origins.length).toBeLessThanOrEqual(result.applied);
        expect(new Set(origins)).toEqual(new Set(["system:gc"]));

        const cleanVersion = doc.version().encode();
        expect(drainMaintenance(mirror).applied).toBe(0);
        expect(doc.version().encode()).toEqual(cleanVersion);
        unsubscribe();
        mirror.dispose();
    });

    it("completes a large conflict fixture without exceeding any frame item budget", () => {
        const leftIds = Array.from({ length: 128 }, (_, index) => `left-large-${index}`);
        const rightIds = Array.from({ length: 128 }, (_, index) => `right-large-${index}`);
        const { mirror } = createDuplicateBucketMirror(leftIds, rightIds);

        const result = drainMaintenance(mirror);
        const expected = [
            ...leftIds.map((id, index) => ({ id, creation: 80 - index })),
            ...rightIds.map((id, index) => ({ id, creation: 40 - index }))
        ]
            .sort((left, right) => right.creation - left.creation)
            .map(({ id }) => id);

        expect(dayTransactionIds(mirror.getState())).toEqual(expected);
        expect(result.frames).toBeGreaterThan(1);
        expect(result.maxProcessed).toBeLessThanOrEqual(DEFAULT_VAULT_MAINTENANCE_BUDGET.maxItems);
        mirror.dispose();
    });

    it("revalidates stable bucket identities after a mid-plan mutation", () => {
        const { mirror } = createDuplicateBucketMirror(["left"], ["right"]);
        const planned = findPlan(
            mirror.getState(),
            (plan) => plan.kind === "relocate-conflict-transaction"
        );
        mirror.setState((state: VaultState) => {
            if (planned.plan.kind !== "relocate-conflict-transaction") return;
            deleteTransaction(state.transactions, {
                location: {
                    accountId: planned.plan.accountId,
                    date: DATE,
                    transactionId: planned.plan.transactionId
                }
            });
        });
        expect(applyPlan(mirror, planned.plan)).toBe(false);
        expect(dayTransactionIds(mirror.getState())).toHaveLength(1);
        mirror.dispose();
    });

    it("rewrites parent and nested one-hop references before a proven hard delete", () => {
        const { mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "source", name: "Source" });
            createDescriptionAlias(state, { aliasId: "target", name: "Target" });
            insertTransaction(state.transactions, { transaction: transactionInput("parent", 2) });
            insertTransaction(state.transactions, {
                transaction: transactionInput("nested", 1),
                suspectedDuplicateOf: {
                    accountId: "account",
                    date: DATE,
                    transactionId: "parent"
                }
            });
            expect(
                assignDescriptionAlias(state, {
                    location: { accountId: "account", date: DATE, transactionId: "parent" },
                    aliasId: "source"
                }).ok
            ).toBe(true);
            expect(
                assignDescriptionAlias(state, {
                    location: { accountId: "account", date: DATE, transactionId: "nested" },
                    aliasId: "source"
                }).ok
            ).toBe(true);
            expect(
                changeAllDescriptionAliases(state, {
                    sourceAliasId: "source",
                    target: { kind: "existing", aliasId: "target" }
                }).ok
            ).toBe(true);
        });
        expect(
            createDescriptionAliasLookup(mirror.getState().descriptionAliases).resolve("source")
                ?.name
        ).toBe("Target");

        drainMaintenance(mirror);
        const state = mirror.getState();
        const tree = state.transactions.account;
        if (typeof tree !== "object" || tree == null) throw new Error("Missing account tree");
        const parent = tree.years[0].months[0].days[0].transactions[0];
        expect(parent.descriptionAliasId).toBe("target");
        expect(parent.suspectedDuplicates[0].descriptionAliasId).toBe("target");
        expect(state.descriptionAliases.source).toBeUndefined();
        expect(
            Object.keys(state.descriptionAliases.target.transactionIds)
                .filter((id) => id !== "$cid")
                .sort()
        ).toEqual(["nested", "parent"]);
        expect(state.descriptionAliases.target.symlinkIds.source).toBeUndefined();
        mirror.dispose();
    });

    it("defers hard deletion when a new direct reference lands after planning", () => {
        const { mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "source", name: "Source" });
            createDescriptionAlias(state, { aliasId: "target", name: "Target" });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "source",
                target: { kind: "existing", aliasId: "target" }
            });
        });
        const planned = findPlan(mirror.getState(), (plan) => plan.kind === "remove-alias-symlink");
        mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: transactionInput("late", 1, "source")
            });
            state.descriptionAliases.source.transactionIds.late = true;
        });

        expect(applyPlan(mirror, planned.plan)).toBe(false);
        expect(mirror.getState().descriptionAliases.source).toBeDefined();
        drainMaintenance(mirror);
        expect(mirror.getState().descriptionAliases.source).toBeUndefined();
        mirror.dispose();
    });

    it("conserves transaction identities and converges across two maintaining peers", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(fc.integer({ min: 0, max: 30 }), { minLength: 1, maxLength: 8 }),
                fc.uniqueArray(fc.integer({ min: 31, max: 60 }), {
                    minLength: 1,
                    maxLength: 8
                }),
                (leftValues, rightValues) => {
                    const leftIds = leftValues.map((value) => `left-${value}`);
                    const rightIds = rightValues.map((value) => `right-${value}`);
                    const base = createDuplicateBucketMirror(leftIds, rightIds);
                    const snapshot = base.doc.export({ mode: "snapshot" });
                    const peerOne = createVaultMirrorFromSnapshot(snapshot);
                    const peerTwo = createVaultMirrorFromSnapshot(snapshot);
                    try {
                        const peerOneBase = peerOne.doc.version();
                        const peerTwoBase = peerTwo.doc.version();
                        drainMaintenance(peerOne.mirror);
                        drainMaintenance(peerTwo.mirror);
                        const peerOneUpdate = peerOne.doc.export({
                            mode: "update",
                            from: peerOneBase
                        });
                        const peerTwoUpdate = peerTwo.doc.export({
                            mode: "update",
                            from: peerTwoBase
                        });
                        peerOne.doc.import(peerTwoUpdate);
                        peerTwo.doc.import(peerOneUpdate);
                        drainMaintenance(peerOne.mirror);
                        drainMaintenance(peerTwo.mirror);

                        const expected = [...leftIds, ...rightIds];
                        expect(dayTransactionIds(peerOne.mirror.getState())).toEqual(expected);
                        expect(dayTransactionIds(peerTwo.mirror.getState())).toEqual(expected);
                        expect(peerOne.doc.getMap("transactions").toJSON()).toEqual(
                            peerTwo.doc.getMap("transactions").toJSON()
                        );
                    } finally {
                        peerOne.mirror.dispose();
                        peerTwo.mirror.dispose();
                        base.mirror.dispose();
                    }
                }
            ),
            { numRuns: 25 }
        );
    });
});
