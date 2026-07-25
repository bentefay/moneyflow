import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    allocationPresenceField,
    prepareAllocationReplacement,
    replaceTransactionAllocations,
    setTransactionAllocation
} from "@/lib/crdt/allocations";
import {
    insertManualDescriptionAliasedTransaction,
    updateDescriptionAliasedTransaction
} from "@/lib/crdt/description-aliases";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import * as transactionMutations from "@/lib/crdt/mutations";
import {
    deleteTransactionsByImport,
    findTransactionInStore,
    insertTransaction,
    moveTransaction,
    swapDuplicate,
    type TransactionLocation,
    unnestDuplicate,
    updateTransaction
} from "@/lib/crdt/mutations";
import type { TransactionInput, TransactionStore, VaultState } from "@/lib/crdt/schema";
import {
    applyEncryptedUpdate,
    createEncryptedSnapshot,
    createEncryptedUpdate,
    loadEncryptedSnapshot
} from "@/lib/crdt/snapshot";
import { VaultUndoCoordinator } from "@/lib/crdt/undo";
import {
    applyAutomationChanges,
    createAutomationApplication,
    restoreAutomationApplication
} from "@/lib/domain/automation";
import { asMinorUnits } from "@/lib/domain/currency";

const DATE = Temporal.PlainDate.from("2026-07-25");
const LOCATION: TransactionLocation = {
    accountId: "account-1",
    date: DATE,
    transactionId: "transaction-1"
};

function transaction(
    allocations: Record<string, number> = {}
): Omit<TransactionInput, "suspectedDuplicates"> {
    return {
        id: LOCATION.transactionId,
        date: DATE,
        description: "Allocation boundary",
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-1234),
        originalAmount: undefined,
        accountId: LOCATION.accountId,
        tagIds: [],
        statusId: "status-1",
        importId: undefined,
        allocations: allocations as TransactionInput["allocations"],
        creationInstant: Temporal.Instant.from("2026-07-25T00:00:00Z"),
        importRowIndex: undefined,
        deletedAt: undefined
    };
}

function populatedStore(allocations: Record<string, number>): TransactionStore {
    const store = {} as TransactionStore;
    insertTransaction(store, { transaction: transaction(allocations) });
    return store;
}

function explicitAllocations(store: TransactionStore, location = LOCATION): Record<string, number> {
    const allocations = findTransactionInStore(store, location)?.allocations;
    if (!allocations) throw new Error("Expected transaction allocations");
    const explicit: Record<string, number> = {};
    for (const [personId, value] of Object.entries(allocations)) {
        if (personId !== "$cid" && typeof value === "number") explicit[personId] = value;
    }
    return explicit;
}

function mirrorStore(mirror: ReturnType<typeof createVaultMirror>["mirror"]): TransactionStore {
    return mirror.getState().transactions as unknown as TransactionStore;
}

function seededMirror(allocations: Record<string, number> = { alice: 40, bob: 60 }) {
    const vault = createVaultMirror();
    vault.mirror.setState((state) => {
        const result = insertTransaction(state.transactions as unknown as TransactionStore, {
            transaction: transaction(allocations)
        });
        if (!result.ok) throw new Error(`Could not seed transaction: ${result.error.type}`);
    });
    return vault;
}

function pseudoRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        return state / 0x1_0000_0000;
    };
}

describe("allocation mutation boundary", () => {
    it("exposes typed one-key and complete-set operations", () => {
        expect(Reflect.get(transactionMutations, "setTransactionAllocation")).toBeTypeOf(
            "function"
        );
        expect(Reflect.get(transactionMutations, "replaceTransactionAllocations")).toBeTypeOf(
            "function"
        );
    });

    it("does not let the generic transaction updater replace allocations", () => {
        const store = populatedStore({ alice: 40, bob: 60 });

        updateTransaction(store, {
            location: LOCATION,
            updates: {
                allocations: { mallory: 101 }
            }
        } as unknown as Parameters<typeof updateTransaction>[1]);

        expect(findTransactionInStore(store, LOCATION)?.allocations).toEqual({
            alice: 40,
            bob: 60
        });
    });

    it("rejects invalid allocations before inserting any transaction structure", () => {
        const store = {} as TransactionStore;

        const result = insertTransaction(store, {
            transaction: transaction({ alice: 25, bob: Number.NaN })
        });

        expect(result).toMatchObject({ ok: false });
        expect(store).toEqual({});
    });

    it("routes manual description-alias insertion and updates through the same boundary", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            expect(
                insertManualDescriptionAliasedTransaction(state, {
                    transaction: {
                        ...transaction({ alice: 25, bob: Number.NaN }),
                        suspectedDuplicates: undefined
                    },
                    newAliasId: "invalid-alias",
                    name: "Invalid allocations"
                })
            ).toMatchObject({
                error: { code: "invalid-transaction-allocations" },
                ok: false
            });
        });
        expect(vault.mirror.getState().transactions).toEqual({});
        expect(vault.mirror.getState().descriptionAliases["invalid-alias"]).toBeUndefined();

        vault.mirror.setState((state: VaultState) => {
            expect(
                insertManualDescriptionAliasedTransaction(state, {
                    transaction: {
                        ...transaction({ alice: -12.5, bob: 87.5 }),
                        suspectedDuplicates: undefined
                    },
                    newAliasId: "valid-alias",
                    name: "Valid allocations"
                })
            ).toEqual({ ok: true, value: "valid-alias" });
            expect(
                updateDescriptionAliasedTransaction(state, {
                    location: LOCATION,
                    updates: { notes: "Preserve allocations" }
                })
            ).toEqual({ ok: true, value: undefined });
            expect(
                updateDescriptionAliasedTransaction(state, {
                    location: LOCATION,
                    updates: { allocations: { mallory: 101 } }
                } as unknown as Parameters<typeof updateDescriptionAliasedTransaction>[1])
            ).toMatchObject({
                error: { code: "invalid-transaction-allocations" },
                ok: false
            });
        });
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({
            alice: -12.5,
            bob: 87.5
        });
        expect(findTransactionInStore(mirrorStore(vault.mirror), LOCATION)?.notes).toBe(
            "Preserve allocations"
        );
        vault.mirror.dispose();
    });

    it("provides stable per-person presence field identities", () => {
        const presenceField = Reflect.get(transactionMutations, "allocationPresenceField");

        expect(presenceField).toBeTypeOf("function");
        expect((presenceField as (personId: string) => string)("person:alice")).toBe(
            "allocation:person:alice"
        );
        expect(allocationPresenceField("__proto__")).toBe("allocation:__proto__");
    });

    it("sets, updates, and removes one exact key without rewriting siblings", () => {
        const store = populatedStore({ alice: 40, bob: 60 });
        const bob = findTransactionInStore(store, LOCATION)?.allocations.bob;

        expect(
            setTransactionAllocation(store, {
                location: LOCATION,
                personId: "alice",
                value: -12.5
            })
        ).toMatchObject({ ok: true, value: { changed: true } });
        expect(explicitAllocations(store)).toEqual({ alice: -12.5, bob: 60 });
        expect(findTransactionInStore(store, LOCATION)?.allocations.bob).toBe(bob);

        expect(
            setTransactionAllocation(store, {
                location: LOCATION,
                personId: "alice",
                value: 0
            })
        ).toMatchObject({ ok: true, value: { changed: true } });
        expect(explicitAllocations(store)).toEqual({ bob: 60 });
    });

    it.each([
        ["not-number", "50"],
        ["positive-infinity", Number.POSITIVE_INFINITY],
        ["negative-infinity", Number.NEGATIVE_INFINITY],
        ["nan", Number.NaN],
        ["negative-zero", -0],
        ["below", -100.000_001],
        ["above", 100.000_001]
    ])("rejects %s before a real document version changes", (_label, value) => {
        const vault = seededMirror();
        const before = vault.doc.version().encode();
        let result: ReturnType<typeof setTransactionAllocation> | undefined;
        vault.mirror.setState((state) => {
            result = setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "alice",
                value
            });
        });

        expect(result).toMatchObject({ ok: false });
        expect(vault.doc.version().encode()).toEqual(before);
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({ alice: 40, bob: 60 });
        vault.mirror.dispose();
    });

    it("accepts exact signed boundaries and decimals without normalizing totals", () => {
        const store = populatedStore({ seed: 1 });

        expect(
            replaceTransactionAllocations(store, {
                location: LOCATION,
                allocations: { lower: -100, decimal: -0.125, upper: 100, totalAbove: 75.5 }
            })
        ).toMatchObject({ ok: true });
        expect(explicitAllocations(store)).toEqual({
            lower: -100,
            decimal: -0.125,
            upper: 100,
            totalAbove: 75.5
        });
    });

    it("replaces atomically, deletes absent keys after validation, and clears with an empty set", () => {
        const vault = seededMirror({ alice: 10, bob: 20, carol: 30 });
        const before = vault.doc.version().encode();
        let failed: ReturnType<typeof replaceTransactionAllocations> | undefined;
        vault.mirror.setState((state) => {
            failed = replaceTransactionAllocations(
                state.transactions as unknown as TransactionStore,
                {
                    location: LOCATION,
                    allocations: { alice: 50, bob: 101 }
                }
            );
        });

        expect(failed).toMatchObject({ ok: false });
        expect(vault.doc.version().encode()).toEqual(before);
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({
            alice: 10,
            bob: 20,
            carol: 30
        });

        vault.mirror.setState((state) => {
            expect(
                replaceTransactionAllocations(state.transactions as unknown as TransactionStore, {
                    location: LOCATION,
                    allocations: { alice: 50, zeroMeansAbsent: 0 }
                })
            ).toMatchObject({ ok: true });
        });
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({ alice: 50 });

        vault.mirror.setState((state) => {
            replaceTransactionAllocations(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                allocations: {}
            });
        });
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({});
        vault.mirror.dispose();
    });

    it("materializes only own data entries without invoking accessors or mutating descriptors", () => {
        let getterCalls = 0;
        const accessor = Object.create(null) as Record<string, unknown>;
        Object.defineProperty(accessor, "alice", {
            enumerable: true,
            get: () => {
                getterCalls += 1;
                return 50;
            }
        });
        const descriptorBefore = Object.getOwnPropertyDescriptor(accessor, "alice");
        const result = prepareAllocationReplacement(accessor);

        expect(result).toEqual({
            error: {
                reason: "accessor-entry",
                type: "invalid-allocation-container"
            },
            ok: false
        });
        expect(Object.isFrozen(result)).toBe(true);
        expect(getterCalls).toBe(0);
        expect(Object.getOwnPropertyDescriptor(accessor, "alice")).toEqual(descriptorBefore);

        const inherited = Object.create({ inherited: 99 }) as Record<string, unknown>;
        Object.defineProperty(inherited, "own", {
            enumerable: true,
            value: 12.5,
            writable: true
        });
        expect(prepareAllocationReplacement(inherited)).toMatchObject({
            error: { reason: "invalid-prototype" },
            ok: false
        });
    });

    it("rejects uninspectable proxies and preserves metadata-like Person IDs", () => {
        const proxy = new Proxy(
            {},
            {
                ownKeys: () => {
                    throw new Error("trap");
                }
            }
        );
        expect(prepareAllocationReplacement(proxy)).toMatchObject({
            error: { reason: "uninspectable-record" },
            ok: false
        });

        const input = Object.create(null) as Record<string, unknown>;
        for (const [key, value] of [
            ["$cid", "collection metadata"],
            ["$cid-like", 10],
            ["constructor", 20],
            ["__proto__", 30]
        ] as const) {
            Object.defineProperty(input, key, { enumerable: true, value });
        }
        const prepared = prepareAllocationReplacement(input);
        expect(prepared).toMatchObject({ ok: true });
        if (!prepared.ok) throw new Error("Expected adversarial IDs to validate");
        expect(prepared.value).toEqual({
            "$cid-like": 10,
            constructor: 20,
            __proto__: 30
        });
        expect(Object.getPrototypeOf(prepared.value)).toBeNull();
    });

    it("merges different keys and converges same-key LWW in both literal update orders", () => {
        const base = seededMirror({});
        const snapshot = base.doc.export({ mode: "snapshot" });
        const left = createVaultMirrorFromSnapshot(snapshot);
        const right = createVaultMirrorFromSnapshot(snapshot);
        const leftBase = left.doc.version();
        const rightBase = right.doc.version();

        left.mirror.setState((state) => {
            setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "alice",
                value: 12.5
            });
            setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "shared",
                value: -25
            });
        });
        right.mirror.setState((state) => {
            setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "bob",
                value: 87.5
            });
            setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "shared",
                value: 75
            });
        });
        const leftUpdate = left.doc.export({ mode: "update", from: leftBase });
        const rightUpdate = right.doc.export({ mode: "update", from: rightBase });
        const leftThenRight = createVaultMirrorFromSnapshot(snapshot);
        const rightThenLeft = createVaultMirrorFromSnapshot(snapshot);
        leftThenRight.doc.import(leftUpdate);
        leftThenRight.doc.import(rightUpdate);
        rightThenLeft.doc.import(rightUpdate);
        rightThenLeft.doc.import(leftUpdate);

        const first = explicitAllocations(mirrorStore(leftThenRight.mirror));
        const second = explicitAllocations(mirrorStore(rightThenLeft.mirror));
        expect(first).toEqual(second);
        expect(first).toMatchObject({ alice: 12.5, bob: 87.5 });
        expect([-25, 75]).toContain(first.shared);

        for (const vault of [base, left, right, leftThenRight, rightThenLeft]) {
            vault.mirror.dispose();
        }
    });

    it("converges a fixed-seed generated per-key operation schedule", () => {
        const random = pseudoRandom(0x16c_2026);
        const base = seededMirror({});
        const snapshot = base.doc.export({ mode: "snapshot" });
        const left = createVaultMirrorFromSnapshot(snapshot);
        const right = createVaultMirrorFromSnapshot(snapshot);
        const leftBase = left.doc.version();
        const rightBase = right.doc.version();
        const independentOracle: Record<string, number> = {};

        left.mirror.setState((state) => {
            for (let index = 0; index < 32; index += 1) {
                const personId = `left-${index}`;
                const value = Math.round((random() * 200 - 100) * 1000) / 1000;
                independentOracle[personId] = value;
                setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                    location: LOCATION,
                    personId,
                    value
                });
            }
            setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "shared",
                value: -44.125
            });
        });
        right.mirror.setState((state) => {
            for (let index = 0; index < 32; index += 1) {
                const personId = `right-${index}`;
                const value = Math.round((random() * 200 - 100) * 1000) / 1000;
                independentOracle[personId] = value;
                setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                    location: LOCATION,
                    personId,
                    value
                });
            }
            setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "shared",
                value: 55.875
            });
        });

        const leftUpdate = left.doc.export({ mode: "update", from: leftBase });
        const rightUpdate = right.doc.export({ mode: "update", from: rightBase });
        const orders = random() < 0.5 ? [leftUpdate, rightUpdate] : [rightUpdate, leftUpdate];
        const forward = createVaultMirrorFromSnapshot(snapshot);
        const reverse = createVaultMirrorFromSnapshot(snapshot);
        for (const update of orders) forward.doc.import(update);
        for (const update of orders.toReversed()) reverse.doc.import(update);
        const forwardValue = explicitAllocations(mirrorStore(forward.mirror));
        const reverseValue = explicitAllocations(mirrorStore(reverse.mirror));

        expect(forwardValue).toEqual(reverseValue);
        expect(forwardValue).toMatchObject(independentOracle);
        expect([-44.125, 55.875]).toContain(forwardValue.shared);
        expect(Object.keys(forwardValue)).toHaveLength(65);

        for (const vault of [base, left, right, forward, reverse]) vault.mirror.dispose();
    });

    it("uses one UndoManager action and creates no history for rejection", async () => {
        const vault = seededMirror({ alice: 40, bob: 60 });
        const coordinator = new VaultUndoCoordinator(vault.doc);

        coordinator.runUserAction("edit", (origin) => {
            vault.mirror.setState(
                (state) => {
                    replaceTransactionAllocations(
                        state.transactions as unknown as TransactionStore,
                        {
                            location: LOCATION,
                            allocations: { alice: -10, carol: 110 }
                        }
                    );
                },
                { origin }
            );
        });
        await Promise.resolve();
        expect(coordinator.getSnapshot().canUndo).toBe(false);
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({ alice: 40, bob: 60 });

        coordinator.runUserAction("edit", (origin) => {
            vault.mirror.setState(
                (state) => {
                    replaceTransactionAllocations(
                        state.transactions as unknown as TransactionStore,
                        {
                            location: LOCATION,
                            allocations: { alice: -10, carol: 25.5 }
                        }
                    );
                },
                { origin }
            );
        });
        await Promise.resolve();
        expect(coordinator.getSnapshot().canUndo).toBe(true);
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({
            alice: -10,
            carol: 25.5
        });
        expect(coordinator.undo()).toBe(true);
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({ alice: 40, bob: 60 });
        expect(coordinator.undo()).toBe(false);
        expect(coordinator.redo()).toBe(true);
        expect(explicitAllocations(mirrorStore(vault.mirror))).toEqual({
            alice: -10,
            carol: 25.5
        });

        coordinator.dispose();
        vault.mirror.dispose();
    });

    it("round-trips plain and encrypted snapshots and encrypted incremental updates", async () => {
        const vault = seededMirror({ alice: -33.25, bob: 100 });
        const key = new Uint8Array(32).fill(7);
        const encryptedSnapshot = await createEncryptedSnapshot(vault.doc, key, 1);
        expect(encryptedSnapshot.encryptedData).not.toContain("alice");
        const loadedDoc = await loadEncryptedSnapshot(encryptedSnapshot, key);
        const loaded = createVaultMirror({ doc: loadedDoc });
        expect(explicitAllocations(mirrorStore(loaded.mirror))).toEqual({
            alice: -33.25,
            bob: 100
        });

        const since = vault.doc.version();
        vault.mirror.setState((state) => {
            setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                location: LOCATION,
                personId: "carol",
                value: 12.75
            });
        });
        const encryptedUpdate = await createEncryptedUpdate(vault.doc, key, 1, since);
        expect(encryptedUpdate.encryptedData).not.toContain("carol");
        await applyEncryptedUpdate(loaded.doc, encryptedUpdate, key);
        expect(explicitAllocations(mirrorStore(loaded.mirror))).toEqual({
            alice: -33.25,
            bob: 100,
            carol: 12.75
        });

        loaded.mirror.dispose();
        vault.mirror.dispose();
    });

    it("rejects invalid automation changes before mutating status or tags", () => {
        const store = populatedStore({ alice: 40, bob: 60 });
        const failed = applyAutomationChanges(store, LOCATION, {
            allocations: { alice: 101 },
            statusId: "must-not-apply",
            tagIds: ["must-not-apply"]
        });

        expect(failed).toMatchObject({ ok: false });
        const stored = findTransactionInStore(store, LOCATION);
        expect(stored).toMatchObject({
            allocations: { alice: 40, bob: 60 },
            statusId: "status-1",
            tagIds: []
        });

        expect(
            applyAutomationChanges(store, LOCATION, {
                allocations: { alice: -25, carol: 50 },
                statusId: "automated",
                tagIds: ["tag-1"]
            })
        ).toMatchObject({ ok: true });
        expect(findTransactionInStore(store, LOCATION)).toMatchObject({
            allocations: { alice: -25, carol: 50 },
            statusId: "automated",
            tagIds: ["tag-1"]
        });
    });

    it("captures and restores automation allocations through the same atomic boundary", () => {
        const store = populatedStore({ alice: 40, bob: 60 });
        const stored = findTransactionInStore(store, LOCATION);
        if (!stored) throw new Error("Expected automation transaction");
        const changes = {
            allocations: { alice: -25, carol: 75.25 },
            statusId: "automated",
            tagIds: ["tag-1"]
        };
        const application = createAutomationApplication(
            LOCATION.transactionId,
            "automation-1",
            stored as Parameters<typeof createAutomationApplication>[2],
            changes
        );

        expect(applyAutomationChanges(store, LOCATION, changes)).toMatchObject({ ok: true });
        expect(explicitAllocations(store)).toEqual({ alice: -25, carol: 75.25 });
        expect(restoreAutomationApplication(store, LOCATION, application)).toMatchObject({
            ok: true
        });
        expect(findTransactionInStore(store, LOCATION)).toMatchObject({
            allocations: { alice: 40, bob: 60 },
            statusId: "status-1",
            tagIds: []
        });

        const invalidRestoration = {
            ...application,
            previousValues: {
                allocations: { alice: 101 },
                statusId: "must-not-restore",
                tagIds: ["must-not-restore"]
            }
        };
        expect(restoreAutomationApplication(store, LOCATION, invalidRestoration)).toMatchObject({
            ok: false
        });
        expect(findTransactionInStore(store, LOCATION)).toMatchObject({
            allocations: { alice: 40, bob: 60 },
            statusId: "status-1",
            tagIds: []
        });
    });

    it("retains an invalid legacy value across ordinary mirror hydration", () => {
        const source = createVaultMirror();
        source.mirror.setState((state) => {
            insertTransaction(state.transactions as unknown as TransactionStore, {
                transaction: transaction({ alice: 50, bob: 25 })
            });
        });
        source.mirror.setState((state) => {
            const stored = findTransactionInStore(
                state.transactions as unknown as TransactionStore,
                LOCATION
            );
            if (!stored) throw new Error("Expected seeded legacy transaction");
            stored.allocations.alice = 150 as (typeof stored.allocations)[string];
        });
        const snapshot = source.doc.export({ mode: "snapshot" });
        source.mirror.dispose();

        const hydrated = createVaultMirrorFromSnapshot(snapshot);

        expect(
            findTransactionInStore(
                hydrated.mirror.getState().transactions as unknown as TransactionStore,
                LOCATION
            )?.allocations
        ).toMatchObject({ alice: 150, bob: 25 });

        hydrated.mirror.setState((state) => {
            expect(
                setTransactionAllocation(state.transactions as unknown as TransactionStore, {
                    location: LOCATION,
                    personId: "alice",
                    value: -50
                })
            ).toMatchObject({ ok: true });
        });
        expect(explicitAllocations(mirrorStore(hydrated.mirror))).toEqual({
            alice: -50,
            bob: 25
        });
        hydrated.mirror.dispose();
    });

    it("preserves exact allocations through move, nest, unnest, and parent swap", () => {
        const store = populatedStore({ alice: -12.5, bob: 87.5 });
        const movedDate = DATE.add({ days: 1 });
        moveTransaction(store, {
            location: LOCATION,
            newAccountId: "account-2",
            newDate: movedDate
        });
        const movedLocation = {
            accountId: "account-2",
            date: movedDate,
            transactionId: LOCATION.transactionId
        };
        expect(explicitAllocations(store, movedLocation)).toEqual({ alice: -12.5, bob: 87.5 });

        const duplicate = transaction({ carol: 100 });
        duplicate.id = "duplicate-1";
        duplicate.accountId = "account-2";
        duplicate.date = movedDate;
        expect(
            insertTransaction(store, {
                transaction: duplicate,
                suspectedDuplicateOf: movedLocation
            })
        ).toMatchObject({ ok: true });
        const duplicateLocation = { ...movedLocation, transactionId: "duplicate-1" };
        expect(explicitAllocations(store, duplicateLocation)).toEqual({ carol: 100 });

        unnestDuplicate(store, {
            duplicateId: "duplicate-1",
            parentLocation: movedLocation
        });
        expect(explicitAllocations(store, duplicateLocation)).toEqual({ carol: 100 });

        const secondDuplicate = transaction({ dave: -100, erin: 25 });
        secondDuplicate.id = "duplicate-2";
        secondDuplicate.accountId = "account-2";
        secondDuplicate.date = movedDate;
        insertTransaction(store, {
            transaction: secondDuplicate,
            suspectedDuplicateOf: movedLocation
        });
        swapDuplicate(store, {
            duplicateId: "duplicate-2",
            parentLocation: movedLocation
        });
        const newParentLocation = { ...movedLocation, transactionId: "duplicate-2" };
        expect(explicitAllocations(store, newParentLocation)).toEqual({ dave: -100, erin: 25 });
        expect(explicitAllocations(store, movedLocation)).toEqual({ alice: -12.5, bob: 87.5 });
    });

    it("preserves a surviving nested import allocation map when deleting its imported parent", () => {
        const store = populatedStore({ parent: 100 });
        const duplicateDate = DATE.add({ days: 2 });
        const duplicate = transaction({ alice: -12.5, bob: 87.5 });
        duplicate.id = "surviving-import";
        duplicate.date = duplicateDate;
        duplicate.importId = "import-b";
        const parent = findTransactionInStore(store, LOCATION);
        if (!parent || !("suspectedDuplicates" in parent)) {
            throw new Error("Expected benchmark parent");
        }
        parent.importId = "import-a";

        expect(
            insertTransaction(store, {
                transaction: duplicate,
                suspectedDuplicateOf: LOCATION
            })
        ).toMatchObject({ ok: true });
        deleteTransactionsByImport(store, "import-a");

        expect(
            explicitAllocations(store, {
                accountId: LOCATION.accountId,
                date: duplicateDate,
                transactionId: duplicate.id
            })
        ).toEqual({ alice: -12.5, bob: 87.5 });
    });

    it("measures fixed-seed production edits over a large transaction set and allocation map", () => {
        const random = pseudoRandom(0x16c2026);
        const allocations = Object.fromEntries(
            Array.from({ length: 250 }, (_, index) => {
                const generated = Math.round((random() * 199.98 - 99.99) * 100) / 100;
                return [`person-${index}`, generated === 0 ? 0.01 : generated];
            })
        );
        const store = {} as TransactionStore;

        for (let index = 0; index < 1_000; index += 1) {
            const input = transaction(allocations);
            input.id = `transaction-${index}`;
            const result = insertTransaction(store, { transaction: input });
            if (!result.ok) throw new Error(`Could not seed benchmark: ${result.error.type}`);
        }

        const location = { ...LOCATION, transactionId: "transaction-500" };
        const replacementA = { ...allocations, "person-0": 12.34 };
        const replacementB = { ...allocations, "person-0": -56.78 };
        const oneKeySamples: number[] = [];
        const replacementSamples: number[] = [];
        const warmupCount = 20;
        const sampleCount = 100;

        for (let index = 0; index < warmupCount + sampleCount; index += 1) {
            const oneKeyStart = performance.now();
            const oneKeyResult = setTransactionAllocation(store, {
                location,
                personId: "person-0",
                value: index % 2 === 0 ? 12.34 : -56.78
            });
            const oneKeyElapsed = performance.now() - oneKeyStart;
            if (!oneKeyResult.ok) {
                throw new Error(`One-key benchmark failed: ${oneKeyResult.error.type}`);
            }

            const replacementStart = performance.now();
            const replacementResult = replaceTransactionAllocations(store, {
                location,
                allocations: index % 2 === 0 ? replacementB : replacementA
            });
            const replacementElapsed = performance.now() - replacementStart;
            if (!replacementResult.ok) {
                throw new Error(`Replacement benchmark failed: ${replacementResult.error.type}`);
            }

            if (index >= warmupCount) {
                oneKeySamples.push(oneKeyElapsed);
                replacementSamples.push(replacementElapsed);
            }
        }

        const summarize = (samples: number[]) => {
            const sorted = [...samples].sort((left, right) => left - right);
            return {
                meanMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
                p50Ms: sorted[Math.floor(samples.length * 0.5)],
                p95Ms: sorted[Math.floor(samples.length * 0.95)],
                maxMs: sorted.at(-1)
            };
        };
        const benchmark = {
            seed: "0x16c2026",
            transactions: 1_000,
            allocationKeys: 250,
            warmupCount,
            sampleCount,
            oneKey: summarize(oneKeySamples),
            completeReplacement: summarize(replacementSamples)
        };

        console.info(`P16C_BENCHMARK ${JSON.stringify(benchmark)}`);
        expect(oneKeySamples).toHaveLength(sampleCount);
        expect(replacementSamples).toHaveLength(sampleCount);
        expect(benchmark.oneKey.meanMs).toBeLessThan(100);
    });
});
