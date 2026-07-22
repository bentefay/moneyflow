import fc from "fast-check";
import { LoroList, LoroMap } from "loro-crdt";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import {
    assignDescriptionAlias,
    changeAllDescriptionAliases,
    createDescriptionAlias
} from "@/lib/crdt/description-aliases";
import {
    applyVaultMaintenancePlan,
    createVaultMaintenanceCursor,
    DEFAULT_VAULT_MAINTENANCE_BUDGET,
    isVaultMaintenancePlanCurrent,
    planVaultMaintenanceStep,
    runVaultMaintenanceFrame,
    type VaultMaintenanceCursor,
    type VaultMaintenancePlan
} from "@/lib/crdt/maintenance";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import {
    deleteTransaction,
    insertTransaction,
    moveTransaction,
    swapDuplicate,
    unnestDuplicate,
    updateTransaction
} from "@/lib/crdt/mutations";
import { getAccountTransactions } from "@/lib/crdt/queries";
import type { TransactionInput, VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { createDescriptionAliasLookup } from "@/lib/domain/description-aliases";
import { asPercentage } from "@/types";

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
    plan: VaultMaintenancePlan,
    doc: ReturnType<typeof createVaultMirror>["doc"]
): boolean {
    if (!isVaultMaintenancePlanCurrent(mirror.getState(), plan)) return false;
    if (
        plan.kind === "relocate-conflict-transaction" ||
        plan.kind === "discard-transaction-shadow"
    ) {
        return applyVaultMaintenancePlan(mirror.getState(), plan, doc);
    }
    let applied = false;
    mirror.setState(
        (state: VaultState) => {
            applied = applyVaultMaintenancePlan(state, plan, doc);
        },
        { origin: "system:gc" }
    );
    return applied;
}

function drainMaintenance(
    mirror: ReturnType<typeof createVaultMirror>["mirror"],
    doc: ReturnType<typeof createVaultMirror>["doc"]
): {
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
            apply: (plan) => applyPlan(mirror, plan, doc),
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
    const transactions = physicalTransactions(mirror.getState());
    throw new Error(
        `Maintenance did not reach a clean cursor: ${JSON.stringify({
            applied,
            cursor,
            frames,
            transactionCount: transactions.length,
            transactionIds: transactions.slice(0, 20).map(({ id }) => id)
        })}`
    );
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

function physicalTransactions(state: VaultState) {
    const tree = state.transactions.account;
    if (typeof tree !== "object" || tree == null) return [];
    return tree.years.flatMap((year) =>
        year.months.flatMap((month) => month.days.flatMap((day) => day.transactions))
    );
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
        expect(byTime).toMatchObject({ processed: 1, yieldReason: "time" });
        mirror.dispose();
    });

    it("merges only adjacent equal buckets one child at a time and preserves exact order", () => {
        const { doc, mirror } = createDuplicateBucketMirror(
            ["left-a", "left-b"],
            ["right-a", "right-b"]
        );
        const origins: Array<string | undefined> = [];
        const unsubscribe = doc.subscribe((event) => origins.push(event.origin));
        const result = drainMaintenance(mirror, doc);
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
        expect(drainMaintenance(mirror, doc).applied).toBe(0);
        expect(doc.version().encode()).toEqual(cleanVersion);
        unsubscribe();
        mirror.dispose();
    });

    it("completes a large conflict fixture without exceeding any frame item budget", () => {
        const leftIds = Array.from({ length: 128 }, (_, index) => `left-large-${index}`);
        const rightIds = Array.from({ length: 128 }, (_, index) => `right-large-${index}`);
        const { doc, mirror } = createDuplicateBucketMirror(leftIds, rightIds);

        const result = drainMaintenance(mirror, doc);
        const expected = [
            { id: "newest", creation: 100 },
            ...leftIds.map((id, index) => ({ id, creation: 80 - index })),
            ...rightIds.map((id, index) => ({ id, creation: 40 - index }))
        ]
            .sort(
                (left, right) => right.creation - left.creation || left.id.localeCompare(right.id)
            )
            .map(({ id }) => id);

        expect(
            getAccountTransactions(mirror.getState().transactions, "account").map(({ id }) => id)
        ).toEqual(expected);
        expect(result.frames).toBeGreaterThan(1);
        expect(result.maxProcessed).toBeLessThanOrEqual(DEFAULT_VAULT_MAINTENANCE_BUDGET.maxItems);
        mirror.dispose();
    });

    it("builds an oversized private shadow with bounded attached operations before atomic reveal", () => {
        const vault = createDuplicateBucketMirror(["a-target"], ["z-wide"]);
        vault.mirror.setState((state: VaultState) => {
            const source = physicalTransactions(state).find(({ id }) => id === "z-wide");
            if (!source) throw new Error("Missing wide relocation source");
            for (let index = 0; index < 128; index += 1) {
                source.tagIds.push(`tag-${index}`);
                source.allocations[`person-${index}`] = asPercentage(index / 128);
            }
            for (let index = 0; index < 64; index += 1) {
                insertTransaction(state.transactions, {
                    transaction: {
                        ...transactionInput(`nested-${index}`, index),
                        tagIds: [`nested-tag-${index}`],
                        allocations: { [`nested-person-${index}`]: asPercentage(1) }
                    },
                    suspectedDuplicateOf: {
                        accountId: "account",
                        date: DATE,
                        transactionId: "z-wide"
                    }
                });
            }
        });
        const origins: Array<string | undefined> = [];
        const pushContainer = vi.spyOn(LoroList.prototype, "pushContainer");
        const insertContainer = vi.spyOn(LoroList.prototype, "insertContainer");
        const listDelete = vi.spyOn(LoroList.prototype, "delete");
        const mapDelete = vi.spyOn(LoroMap.prototype, "delete");
        const mapSet = vi.spyOn(LoroMap.prototype, "set");
        const operationCount = () =>
            pushContainer.mock.calls.length +
            insertContainer.mock.calls.length +
            listDelete.mock.calls.length +
            mapDelete.mock.calls.length +
            mapSet.mock.calls.length;
        let previousOperations = 0;
        const operationsPerCommit: number[] = [];
        const observedPublicIds: string[][] = [];
        const unsubscribe = vault.doc.subscribe((event) => {
            origins.push(event.origin);
            const currentOperations = operationCount();
            operationsPerCommit.push(currentOperations - previousOperations);
            previousOperations = currentOperations;
            observedPublicIds.push(
                getAccountTransactions(vault.mirror.getState().transactions, "account").map(
                    ({ id }) => id
                )
            );
        });
        const result = drainMaintenance(vault.mirror, vault.doc);

        expect(result.applied).toBeGreaterThan(300);
        expect(Math.max(...operationsPerCommit)).toBeLessThanOrEqual(24);
        expect(
            pushContainer.mock.calls.some(
                ([child]) =>
                    child instanceof LoroMap && Object.keys(child.getShallowValue()).length > 0
            ) ||
                insertContainer.mock.calls.some(
                    ([, child]) =>
                        child instanceof LoroMap && Object.keys(child.getShallowValue()).length > 0
                )
        ).toBe(false);
        expect(new Set(origins)).toEqual(new Set(["system:gc"]));
        expect(
            observedPublicIds.every(
                (ids) => ids.length === new Set(ids).size && ids.includes("z-wide")
            )
        ).toBe(true);
        const relocated = physicalTransactions(vault.mirror.getState()).filter(
            ({ id }) => id === "z-wide"
        );
        expect(relocated).toHaveLength(1);
        expect(relocated[0].tagIds).toHaveLength(128);
        expect(relocated[0].suspectedDuplicates).toHaveLength(64);
        pushContainer.mockRestore();
        insertContainer.mockRestore();
        listDelete.mockRestore();
        mapDelete.mockRestore();
        mapSet.mockRestore();
        unsubscribe();
        vault.mirror.dispose();
    });

    it("revalidates stable bucket identities after a mid-plan mutation", () => {
        const { doc, mirror } = createDuplicateBucketMirror(["left"], ["right"]);
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
        expect(applyPlan(mirror, planned.plan, doc)).toBe(false);
        expect(dayTransactionIds(mirror.getState())).toHaveLength(1);
        mirror.dispose();
    });

    it("keeps one logical identity through every relocation commit and intervening mutations", () => {
        const editCase = createDuplicateBucketMirror(["left"], ["right"]);
        const observedIds: string[][] = [];
        const unsubscribe = editCase.doc.subscribe(() => {
            observedIds.push(
                getAccountTransactions(editCase.mirror.getState().transactions, "account").map(
                    ({ id }) => id
                )
            );
        });
        const copyPlan = findPlan(
            editCase.mirror.getState(),
            (plan) => plan.kind === "relocate-conflict-transaction" && plan.mode === "move"
        );
        if (copyPlan.plan.kind !== "relocate-conflict-transaction") {
            throw new Error("Expected a relocation plan");
        }
        const editedId = copyPlan.plan.transactionId;
        expect(applyPlan(editCase.mirror, copyPlan.plan, editCase.doc)).toBe(true);
        expect(observedIds.every((ids) => new Set(ids).size === ids.length)).toBe(true);
        expect(
            getAccountTransactions(editCase.mirror.getState().transactions, "account").filter(
                ({ id }) => id === editedId
            )
        ).toHaveLength(1);

        editCase.mirror.setState((state: VaultState) => {
            updateTransaction(state.transactions, {
                location: { accountId: "account", date: DATE, transactionId: editedId },
                updates: { notes: "edited between maintenance commits" }
            });
        });
        expect(
            physicalTransactions(editCase.mirror.getState())
                .filter(({ id }) => id === editedId)
                .map(({ notes }) => notes)
        ).toEqual(["edited between maintenance commits"]);
        drainMaintenance(editCase.mirror, editCase.doc);
        expect(
            getAccountTransactions(editCase.mirror.getState().transactions, "account")
                .filter(({ id }) => id === editedId)
                .map(({ notes }) => notes)
        ).toEqual(["edited between maintenance commits"]);
        unsubscribe();
        editCase.mirror.dispose();

        const deleteCase = createDuplicateBucketMirror(["left"], ["right"]);
        const deletePlan = findPlan(
            deleteCase.mirror.getState(),
            (plan) => plan.kind === "relocate-conflict-transaction" && plan.mode === "move"
        );
        if (deletePlan.plan.kind !== "relocate-conflict-transaction") {
            throw new Error("Expected a relocation plan");
        }
        const deletedId = deletePlan.plan.transactionId;
        expect(applyPlan(deleteCase.mirror, deletePlan.plan, deleteCase.doc)).toBe(true);
        deleteCase.mirror.setState((state: VaultState) => {
            deleteTransaction(state.transactions, {
                location: { accountId: "account", date: DATE, transactionId: deletedId }
            });
        });
        drainMaintenance(deleteCase.mirror, deleteCase.doc);
        expect(
            getAccountTransactions(deleteCase.mirror.getState().transactions, "account").filter(
                ({ id }) => id === deletedId
            )
        ).toEqual([]);
        deleteCase.mirror.dispose();

        const moveCase = createDuplicateBucketMirror(["left"], ["right"]);
        const movePlan = findPlan(
            moveCase.mirror.getState(),
            (plan) => plan.kind === "relocate-conflict-transaction" && plan.mode === "move"
        );
        if (movePlan.plan.kind !== "relocate-conflict-transaction") {
            throw new Error("Expected a relocation plan");
        }
        const movedId = movePlan.plan.transactionId;
        expect(applyPlan(moveCase.mirror, movePlan.plan, moveCase.doc)).toBe(true);
        const movedDate = DATE.add({ days: 1 });
        moveCase.mirror.setState((state: VaultState) => {
            moveTransaction(state.transactions, {
                location: { accountId: "account", date: DATE, transactionId: movedId },
                newDate: movedDate
            });
        });
        drainMaintenance(moveCase.mirror, moveCase.doc);
        const moved = getAccountTransactions(
            moveCase.mirror.getState().transactions,
            "account"
        ).filter(({ id }) => id === movedId);
        expect(moved).toHaveLength(1);
        expect(moved[0].date.equals(movedDate)).toBe(true);
        moveCase.mirror.dispose();
    });

    it("uses a peer-independent total order for exact creation and import ties", () => {
        const { mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            for (const id of ["tie-z", "tie-a", "tie-m"]) {
                insertTransaction(state.transactions, {
                    transaction: {
                        ...transactionInput(id, 1),
                        importRowIndex: 7
                    }
                });
            }
        });
        expect(
            getAccountTransactions(mirror.getState().transactions, "account").map(({ id }) => id)
        ).toEqual(["tie-a", "tie-m", "tie-z"]);
        mirror.dispose();
    });

    it("collapses concurrent same-ID peers in both delivery orders at every mutation boundary", () => {
        const base = createVaultMirror();
        const snapshot = base.doc.export({ mode: "snapshot" });
        const left = createVaultMirrorFromSnapshot(snapshot);
        const right = createVaultMirrorFromSnapshot(snapshot);
        const leftBase = left.doc.version();
        const rightBase = right.doc.version();
        left.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: { ...transactionInput("same-id", 1), notes: "left" }
            });
        });
        right.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: { ...transactionInput("same-id", 1), notes: "right" }
            });
        });
        const leftUpdate = left.doc.export({ mode: "update", from: leftBase });
        const rightUpdate = right.doc.export({ mode: "update", from: rightBase });

        const leftThenRight = createVaultMirrorFromSnapshot(snapshot);
        leftThenRight.doc.import(leftUpdate);
        leftThenRight.doc.import(rightUpdate);
        const rightThenLeft = createVaultMirrorFromSnapshot(snapshot);
        rightThenLeft.doc.import(rightUpdate);
        rightThenLeft.doc.import(leftUpdate);

        const first = getAccountTransactions(
            leftThenRight.mirror.getState().transactions,
            "account"
        );
        const second = getAccountTransactions(
            rightThenLeft.mirror.getState().transactions,
            "account"
        );
        expect(first).toHaveLength(1);
        expect(second).toHaveLength(1);
        expect(first[0].notes).toBe(second[0].notes);

        leftThenRight.mirror.setState((state: VaultState) => {
            updateTransaction(state.transactions, {
                location: { accountId: "account", date: DATE, transactionId: "same-id" },
                updates: { notes: "all copies edited" }
            });
        });
        const editedCopies = physicalTransactions(leftThenRight.mirror.getState()).filter(
            ({ id }) => id === "same-id"
        );
        expect(editedCopies.length).toBeGreaterThan(0);
        expect(editedCopies.every(({ notes }) => notes === "all copies edited")).toBe(true);
        leftThenRight.mirror.setState((state: VaultState) => {
            deleteTransaction(state.transactions, {
                cascade: false,
                location: { accountId: "account", date: DATE, transactionId: "same-id" }
            });
        });
        expect(
            physicalTransactions(leftThenRight.mirror.getState()).every(
                ({ deletedAt }) => deletedAt != null
            )
        ).toBe(true);

        const movedDate = DATE.add({ days: 2 });
        rightThenLeft.mirror.setState((state: VaultState) => {
            moveTransaction(state.transactions, {
                location: { accountId: "account", date: DATE, transactionId: "same-id" },
                newDate: movedDate
            });
        });
        const moved = getAccountTransactions(
            rightThenLeft.mirror.getState().transactions,
            "account"
        );
        expect(moved).toHaveLength(1);
        expect(moved[0].date.equals(movedDate)).toBe(true);

        rightThenLeft.mirror.setState((state: VaultState) => {
            deleteTransaction(state.transactions, {
                location: { accountId: "account", date: movedDate, transactionId: "same-id" }
            });
        });
        expect(
            getAccountTransactions(rightThenLeft.mirror.getState().transactions, "account")
        ).toEqual([]);

        leftThenRight.mirror.dispose();
        rightThenLeft.mirror.dispose();
        left.mirror.dispose();
        right.mirror.dispose();
        base.mirror.dispose();
    });

    it.each(["unnest", "swap"] as const)(
        "keeps subscribed %s states canonical and converges the real-Loro physical graph",
        (operation) => {
            const parentDate = DATE;
            const duplicateDate = DATE.subtract({ days: 1 });
            const base = createVaultMirror();
            base.mirror.setState((state: VaultState) => {
                createDescriptionAlias(state, { aliasId: "parent-alias", name: "Parent" });
                createDescriptionAlias(state, { aliasId: "duplicate-alias", name: "Duplicate" });
                insertTransaction(state.transactions, {
                    transaction: {
                        ...transactionInput("bucket-anchor", 99),
                        date: parentDate
                    }
                });
                insertTransaction(state.transactions, {
                    transaction: {
                        ...transactionInput("duplicate-bucket-anchor", 98),
                        date: duplicateDate
                    }
                });
            });
            const baseSnapshot = base.doc.export({ mode: "snapshot" });
            const left = createVaultMirrorFromSnapshot(baseSnapshot);
            const right = createVaultMirrorFromSnapshot(baseSnapshot);
            const leftBase = left.doc.version();
            const rightBase = right.doc.version();

            for (const [vault, side] of [
                [left, "left"],
                [right, "right"]
            ] as const) {
                vault.mirror.setState((state: VaultState) => {
                    insertTransaction(state.transactions, {
                        transaction: {
                            ...transactionInput(
                                "parent",
                                side === "left" ? 20 : 10,
                                "parent-alias"
                            ),
                            date: parentDate,
                            notes: side
                        }
                    });
                    insertTransaction(state.transactions, {
                        transaction: {
                            ...transactionInput(
                                "duplicate",
                                side === "left" ? 22 : 12,
                                "duplicate-alias"
                            ),
                            date: duplicateDate,
                            notes: side
                        },
                        suspectedDuplicateOf: {
                            accountId: "account",
                            date: parentDate,
                            transactionId: "parent"
                        }
                    });
                    insertTransaction(state.transactions, {
                        transaction: {
                            ...transactionInput(`other-${side}`, side === "left" ? 21 : 11),
                            date: duplicateDate
                        },
                        suspectedDuplicateOf: {
                            accountId: "account",
                            date: parentDate,
                            transactionId: "parent"
                        }
                    });
                    insertTransaction(state.transactions, {
                        transaction: {
                            ...transactionInput(
                                "duplicate",
                                side === "left" ? 22 : 12,
                                "duplicate-alias"
                            ),
                            date: duplicateDate,
                            notes: `standalone-${side}`
                        }
                    });
                });
            }

            const leftUpdate = left.doc.export({ mode: "update", from: leftBase });
            const rightUpdate = right.doc.export({ mode: "update", from: rightBase });
            const leftThenRight = createVaultMirrorFromSnapshot(baseSnapshot);
            const rightThenLeft = createVaultMirrorFromSnapshot(baseSnapshot);
            leftThenRight.doc.import(leftUpdate);
            leftThenRight.doc.import(rightUpdate);
            rightThenLeft.doc.import(rightUpdate);
            rightThenLeft.doc.import(leftUpdate);
            const observations: string[][] = [];
            const stopLeftThenRight = leftThenRight.doc.subscribe(() =>
                observations.push(
                    getAccountTransactions(
                        leftThenRight.mirror.getState().transactions,
                        "account"
                    ).map(({ id }) => id)
                )
            );
            const stopRightThenLeft = rightThenLeft.doc.subscribe(() =>
                observations.push(
                    getAccountTransactions(
                        rightThenLeft.mirror.getState().transactions,
                        "account"
                    ).map(({ id }) => id)
                )
            );
            for (const vault of [leftThenRight, rightThenLeft]) {
                vault.mirror.setState((state: VaultState) => {
                    const input = {
                        parentLocation: {
                            accountId: "account",
                            date: parentDate,
                            transactionId: "parent"
                        },
                        duplicateId: "duplicate"
                    };
                    if (operation === "unnest") unnestDuplicate(state.transactions, input);
                    else swapDuplicate(state.transactions, input);
                });
            }
            stopLeftThenRight();
            stopRightThenLeft();

            for (const ids of observations) {
                expect(ids).toEqual(Array.from(new Set(ids)));
                expect(ids).toContain(operation === "unnest" ? "parent" : "duplicate");
            }

            drainMaintenance(leftThenRight.mirror, leftThenRight.doc);
            drainMaintenance(rightThenLeft.mirror, rightThenLeft.doc);
            for (const vault of [leftThenRight, rightThenLeft]) {
                const publicTransactions = physicalTransactions(vault.mirror.getState()).filter(
                    ({ id }) => id === "parent" || id === "duplicate"
                );
                if (operation === "unnest") {
                    expect(publicTransactions.map(({ id }) => id).sort()).toEqual([
                        "duplicate",
                        "parent"
                    ]);
                    expect(
                        publicTransactions.find(({ id }) => id === "duplicate")?.descriptionAliasId
                    ).toBe("duplicate-alias");
                    expect(
                        publicTransactions.find(({ id }) => id === "parent")?.descriptionAliasId
                    ).toBe("parent-alias");
                    expect(
                        publicTransactions
                            .find(({ id }) => id === "parent")
                            ?.suspectedDuplicates.map(({ id }) => id)
                            .sort()
                    ).toEqual(["other-left", "other-right"]);
                    expect(
                        publicTransactions
                            .flatMap(({ suspectedDuplicates }) => suspectedDuplicates)
                            .some(({ id }) => id === "duplicate")
                    ).toBe(false);
                } else {
                    expect(publicTransactions).toHaveLength(1);
                    expect(publicTransactions[0].id).toBe("duplicate");
                    expect(publicTransactions[0].descriptionAliasId).toBe("duplicate-alias");
                    expect(
                        publicTransactions[0].suspectedDuplicates.map(({ id }) => id).sort()
                    ).toEqual(["other-left", "other-right", "parent"]);
                    expect(
                        publicTransactions[0].suspectedDuplicates.find(({ id }) => id === "parent")
                            ?.descriptionAliasId
                    ).toBe("parent-alias");
                }
            }
            expect(
                getAccountTransactions(leftThenRight.mirror.getState().transactions, "account")
            ).toEqual(
                getAccountTransactions(rightThenLeft.mirror.getState().transactions, "account")
            );

            for (const vault of [left, right, leftThenRight, rightThenLeft, base]) {
                vault.mirror.dispose();
            }
        }
    );

    it("rewrites parent and nested one-hop references before a proven hard delete", () => {
        const { doc, mirror } = createVaultMirror();
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

        drainMaintenance(mirror, doc);
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
        const { doc, mirror } = createVaultMirror();
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

        expect(applyPlan(mirror, planned.plan, doc)).toBe(false);
        expect(mirror.getState().descriptionAliases.source).toBeDefined();
        drainMaintenance(mirror, doc);
        expect(mirror.getState().descriptionAliases.source).toBeUndefined();
        mirror.dispose();
    });

    it("proves a wide alias graph one parent, nested item, or alias per discovery step", () => {
        const { doc, mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "source", name: "Source" });
            createDescriptionAlias(state, { aliasId: "target", name: "Target" });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "source",
                target: { kind: "existing", aliasId: "target" }
            });
            for (let index = 0; index < 128; index += 1) {
                createDescriptionAlias(state, {
                    aliasId: `other-${index.toString().padStart(3, "0")}`,
                    name: `Other ${index}`
                });
                insertTransaction(state.transactions, {
                    transaction: transactionInput(`wide-proof-${index}`, index)
                });
            }
        });

        let cursor = createVaultMaintenanceCursor(mirror.getState());
        let steps = 0;
        let removal: VaultMaintenancePlan | undefined;
        while (steps < 10_000 && !removal) {
            const step = planVaultMaintenanceStep(mirror.getState(), cursor);
            cursor = step.cursor;
            steps += 1;
            if (step.plan?.kind === "remove-alias-symlink") removal = step.plan;
        }

        expect(steps).toBeGreaterThan(256);
        if (!removal) throw new Error("Missing proven alias removal");
        expect(applyPlan(mirror, removal, doc)).toBe(true);
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
                        drainMaintenance(peerOne.mirror, peerOne.doc);
                        drainMaintenance(peerTwo.mirror, peerTwo.doc);
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
                        drainMaintenance(peerOne.mirror, peerOne.doc);
                        drainMaintenance(peerTwo.mirror, peerTwo.doc);

                        const expected = [...leftIds, ...rightIds];
                        expect(
                            getAccountTransactions(
                                peerOne.mirror.getState().transactions,
                                "account"
                            )
                                .filter(({ id }) => id !== "newest")
                                .map(({ id }) => id)
                                .sort()
                        ).toEqual(expected.sort());
                        expect(
                            getAccountTransactions(
                                peerTwo.mirror.getState().transactions,
                                "account"
                            )
                                .filter(({ id }) => id !== "newest")
                                .map(({ id }) => id)
                                .sort()
                        ).toEqual(expected);
                        const peerOneTransactions = peerOne.doc.getMap("transactions").toJSON();
                        const peerTwoTransactions = peerTwo.doc.getMap("transactions").toJSON();
                        delete peerOneTransactions["__moneyflow_gc_metadata__"];
                        delete peerTwoTransactions["__moneyflow_gc_metadata__"];
                        expect(peerOneTransactions).toEqual(peerTwoTransactions);
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
