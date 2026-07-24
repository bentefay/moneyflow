import { act, render } from "@testing-library/react";
import { isContainerId, LoroList, LoroMap, VersionVector } from "loro-crdt";
import { createElement, Fragment } from "react";
import { Temporal } from "temporal-polyfill";
import { afterEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

import { PeopleTable } from "@/components/features/people/PeopleTable";
import { StatusesTable } from "@/components/features/statuses/StatusesTable";
import { TagsTable } from "@/components/features/tags/TagsTable";
import {
    useTransaction,
    useTransactions,
    useVaultAction,
    useVaultEditAction,
    useVaultSelector,
    VaultProvider
} from "@/lib/crdt/context";
import {
    changeAllDescriptionAliases,
    createDescriptionAlias
} from "@/lib/crdt/description-aliases";
import {
    startVaultMaintenanceScheduler,
    type VaultMaintenanceFrameHost
} from "@/lib/crdt/maintenance";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import { insertTransaction } from "@/lib/crdt/mutations";
import * as transactionQueries from "@/lib/crdt/queries";
import { getAccountTransactions } from "@/lib/crdt/queries";
import {
    getTransactionMaintenanceShadowIdentity,
    type TransactionInput,
    type VaultState
} from "@/lib/crdt/schema";
import * as transactionSchema from "@/lib/crdt/schema";
import { decryptUpdate } from "@/lib/crdt/snapshot";
import { VaultUndoCoordinator, VaultUndoProvider } from "@/lib/crdt/undo";
import { asMinorUnits } from "@/lib/domain/currency";
import { SyncManager, type SyncManagerOptions } from "@/lib/sync/manager";
import { closeDB, getUnpushedOps } from "@/lib/sync/persistence";
import { asPercentage } from "@/types";

const realtime = vi.hoisted(() => ({
    subscribe: vi.fn(async () => undefined),
    unsubscribe: vi.fn(async () => undefined)
}));

vi.mock("@/lib/supabase/realtime", () => ({
    createVaultRealtimeSync: () => realtime
}));

const DATE = Temporal.PlainDate.from("2026-07-22");
const LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY = "__moneyflow_gc_metadata__";
let vaultCounter = 0;

function createFrameHost() {
    let nextId = 0;
    let visible = true;
    const callbacks = new Map<number, FrameRequestCallback>();
    const listeners = new Set<() => void>();
    const cancelled: number[] = [];
    const host: VaultMaintenanceFrameHost = {
        cancelFrame: (frameId) => {
            cancelled.push(frameId);
            callbacks.delete(frameId);
        },
        isVisible: () => visible,
        now: () => 0,
        requestFrame: (callback) => {
            nextId += 1;
            callbacks.set(nextId, callback);
            return nextId;
        },
        subscribeVisibility: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
    return {
        cancelled,
        host,
        pending: () => callbacks.size,
        runOne: () => {
            const entry = callbacks.entries().next().value as
                | [number, FrameRequestCallback]
                | undefined;
            if (!entry) return false;
            callbacks.delete(entry[0]);
            entry[1](0);
            return true;
        },
        runAll: () => {
            for (let frame = 0; callbacks.size > 0 && frame < 10_000; frame += 1) {
                const entry = callbacks.entries().next().value as
                    | [number, FrameRequestCallback]
                    | undefined;
                if (!entry) break;
                callbacks.delete(entry[0]);
                entry[1](0);
            }
            if (callbacks.size) throw new Error("Maintenance frames did not settle");
        },
        setVisible: (next: boolean) => {
            visible = next;
            listeners.forEach((listener) => listener());
        }
    };
}

function createAliasGarbage() {
    const vault = createVaultMirror();
    vault.mirror.setState((state: VaultState) => {
        createDescriptionAlias(state, { aliasId: "source", name: "Source plaintext" });
        createDescriptionAlias(state, { aliasId: "target", name: "Target" });
        insertTransaction(state.transactions, {
            transaction: {
                id: "transaction",
                date: DATE,
                description: "Raw",
                descriptionAliasId: "source",
                notes: "before",
                amount: asMinorUnits(100),
                accountId: "account",
                tagIds: [],
                statusId: "status",
                importId: undefined,
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                importRowIndex: 0,
                deletedAt: undefined
            }
        });
        state.descriptionAliases.source.transactionIds.transaction = true;
        changeAllDescriptionAliases(state, {
            sourceAliasId: "source",
            target: { kind: "existing", aliasId: "target" }
        });
        const transaction = state.transactions.account.years[0].months[0].days[0].transactions[0];
        transaction.descriptionAliasId = "source";
        state.descriptionAliases.source.transactionIds.transaction = true;
        delete state.descriptionAliases.target.transactionIds.transaction;
    });
    return vault;
}

function relocationTransaction(id: string, creationMilliseconds: number): TransactionInput {
    return {
        id,
        date: DATE,
        description: `Raw ${id}`,
        descriptionAliasId: undefined,
        notes: "before",
        amount: asMinorUnits(creationMilliseconds),
        accountId: "account",
        tagIds: ["one", "two", "three"],
        statusId: "status",
        importId: "import",
        allocations: { "root-one": asPercentage(25), "root-two": asPercentage(75) },
        creationInstant: Temporal.Instant.fromEpochMilliseconds(creationMilliseconds),
        importRowIndex: creationMilliseconds,
        suspectedDuplicates: [
            {
                id: `${id}-nested`,
                date: DATE,
                description: `Nested ${id}`,
                descriptionAliasId: undefined,
                notes: "nested before",
                amount: asMinorUnits(creationMilliseconds),
                accountId: "account",
                tagIds: ["nested-one", "nested-two"],
                statusId: "status",
                importId: "import",
                allocations: {
                    "nested-one": asPercentage(40),
                    "nested-two": asPercentage(60)
                },
                creationInstant: Temporal.Instant.fromEpochMilliseconds(creationMilliseconds + 1),
                importRowIndex: creationMilliseconds,
                deletedAt: undefined
            }
        ],
        deletedAt: undefined
    };
}

function createRelocationGarbage() {
    const base = createVaultMirror();
    base.mirror.setState((state: VaultState) => {
        insertTransaction(state.transactions, {
            transaction: {
                ...relocationTransaction("newest", 100),
                date: DATE.add({ years: 1 })
            }
        });
    });
    const snapshot = base.doc.export({ mode: "snapshot" });
    const left = createVaultMirrorFromSnapshot(snapshot);
    const right = createVaultMirrorFromSnapshot(snapshot);
    const leftBase = left.doc.version();
    const rightBase = right.doc.version();
    left.mirror.setState((state: VaultState) => {
        insertTransaction(state.transactions, {
            transaction: relocationTransaction("a-target", 80)
        });
    });
    right.mirror.setState((state: VaultState) => {
        insertTransaction(state.transactions, {
            transaction: relocationTransaction("z-source", 40)
        });
    });
    left.doc.import(right.doc.export({ mode: "update", from: rightBase }));
    right.doc.import(left.doc.export({ mode: "update", from: leftBase }));
    right.mirror.dispose();
    base.mirror.dispose();
    return left;
}

function accountTransactions(state: VaultState) {
    const tree = state.transactions.account;
    if (typeof tree !== "object" || tree == null) return [];
    return tree.years.flatMap((year) =>
        year.months.flatMap((month) => month.days.flatMap((day) => day.transactions))
    );
}

function physicalTransactionGraph(store: VaultState["transactions"]): {
    readonly nestedIds: string[];
    readonly parentIds: string[];
} {
    const parentIds: string[] = [];
    const nestedIds: string[] = [];
    for (const tree of Object.values(store)) {
        if (typeof tree !== "object" || tree == null || !("years" in tree)) continue;
        for (const year of tree.years) {
            for (const month of year.months) {
                for (const day of month.days) {
                    for (const transaction of day.transactions) {
                        parentIds.push(transaction.id);
                        nestedIds.push(...transaction.suspectedDuplicates.map(({ id }) => id));
                    }
                }
            }
        }
    }
    return { nestedIds, parentIds };
}

function hasTransactionShadow(state: VaultState): boolean {
    return accountTransactions(state).some(
        (transaction) => getTransactionMaintenanceShadowIdentity(transaction) != null
    );
}

function activeTransactionShadow(state: VaultState) {
    return accountTransactions(state).find(
        (transaction) => getTransactionMaintenanceShadowIdentity(transaction) != null
    );
}

type ConsumedShadowValue = "nested-allocation" | "nested-tag" | "root-allocation" | "root-tag";

function hasConsumedShadowValue(state: VaultState, value: ConsumedShadowValue): boolean {
    const shadow = activeTransactionShadow(state);
    if (!shadow) return false;
    if (value === "root-tag") return shadow.tagIds[0] === "one";
    if (value === "root-allocation") {
        return (
            shadow.allocations["root-one"] === 25 &&
            shadow.allocations["root-two"] === 75 &&
            shadow.suspectedDuplicates.length > 0
        );
    }
    const nested = shadow.suspectedDuplicates[0];
    if (!nested) return false;
    if (value === "nested-tag") return nested.tagIds[0] === "nested-one";
    const identity = getTransactionMaintenanceShadowIdentity(shadow);
    return (
        identity != null &&
        nested.id === `${identity.publicId}-nested` &&
        nested.allocations["nested-one"] === 40 &&
        nested.allocations["nested-two"] === 60
    );
}

function runUntilConsumedShadowValue(
    frames: ReturnType<typeof createFrameHost>,
    state: () => VaultState,
    value: ConsumedShadowValue
): void {
    for (let frame = 0; frame < 1_000; frame += 1) {
        if (hasConsumedShadowValue(state(), value)) return;
        if (!frames.runOne()) break;
    }
    throw new Error(`Maintenance did not copy the expected ${value}`);
}

function editConsumedSourceValue(
    vault: ReturnType<typeof createRelocationGarbage>,
    value: ConsumedShadowValue
): { readonly publicId: string; readonly replacement: number | string } {
    const shadow = activeTransactionShadow(vault.mirror.getState());
    const identity = shadow && getTransactionMaintenanceShadowIdentity(shadow);
    if (!identity || !isContainerId(identity.sourceCid)) {
        throw new Error("Missing active relocation shadow identity");
    }
    const source = vault.doc.getContainerById(identity.sourceCid);
    if (!(source instanceof LoroMap)) throw new Error("Missing relocation source map");
    const parent =
        value === "nested-allocation" || value === "nested-tag"
            ? source.get("suspectedDuplicates")
            : source;
    const nested = parent instanceof LoroList ? parent.get(0) : undefined;
    const collectionParent = parent instanceof LoroList ? nested : parent;
    if (!(collectionParent instanceof LoroMap)) throw new Error("Missing collection parent");

    if (value === "root-tag" || value === "nested-tag") {
        const tags = collectionParent.get("tagIds");
        if (!(tags instanceof LoroList)) throw new Error("Missing source tags");
        const replacement = value === "root-tag" ? "changed-root" : "changed-nested";
        tags.delete(0, 1);
        tags.insert(0, replacement);
        vault.doc.commit({ origin: "user:edit" });
        return { publicId: identity.publicId, replacement };
    }

    const allocations = collectionParent.get("allocations");
    if (!(allocations instanceof LoroMap)) throw new Error("Missing source allocations");
    const replacement = value === "root-allocation" ? 26 : 41;
    allocations.set(value === "root-allocation" ? "root-one" : "nested-one", replacement);
    vault.doc.commit({ origin: "user:edit" });
    return { publicId: identity.publicId, replacement };
}

function installLegacyMetadata(doc: ReturnType<typeof createVaultMirror>["doc"]): void {
    const transactions = doc.getMap("transactions");
    const metadata = transactions.setContainer(
        LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY,
        new LoroMap()
    );
    metadata.set("accountId", LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY);
    metadata.setContainer("years", new LoroList());
    doc.commit({ origin: "legacy:maintenance" });
}

function maintenanceEpoch(doc: ReturnType<typeof createVaultMirror>["doc"]): string | undefined {
    const visit = (value: unknown): string | undefined => {
        if (typeof value !== "object" || value == null) return undefined;
        const id: unknown = Reflect.get(value, "id");
        if (typeof id === "string") {
            const identity = getTransactionMaintenanceShadowIdentity({ id });
            if (identity) return identity.epoch;
        }
        for (const child of Object.values(value)) {
            const epoch = visit(child);
            if (epoch) return epoch;
        }
        return undefined;
    };
    return visit(doc.getMap("transactions").toJSON());
}

function runUntilTransactionShadow(
    frames: ReturnType<typeof createFrameHost>,
    state: () => VaultState
): void {
    for (let frame = 0; frame < 1_000; frame += 1) {
        if (hasTransactionShadow(state())) return;
        if (!frames.runOne()) break;
    }
    throw new Error(
        `Maintenance did not expose its private transaction shadow: ${JSON.stringify({
            ids: accountTransactions(state()).map(({ id }) => id)
        })}`
    );
}

function createTrpc(
    pushOps: NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]
): NonNullable<SyncManagerOptions["trpc"]> {
    return {
        sync: {
            getSnapshot: { query: vi.fn(async () => null) },
            getUpdates: { query: vi.fn(async () => ({ type: "ops" as const, ops: [] })) },
            pushOps,
            pushSnapshot: { mutate: vi.fn(async () => ({ success: true })) }
        }
    };
}

afterEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    await closeDB();
});

describe("vault background maintenance integration", () => {
    it("does not expose a real-ID nested child through a malformed private parent", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: relocationTransaction("source-parent", 100)
            });
            insertTransaction(state.transactions, {
                transaction: {
                    ...relocationTransaction("nested-public", 90),
                    notes: "complete source"
                },
                suspectedDuplicateOf: {
                    accountId: "account",
                    date: DATE,
                    transactionId: "source-parent"
                }
            });
            insertTransaction(state.transactions, {
                transaction: {
                    ...relocationTransaction(
                        "__moneyflow_gc_shadow__:legacy\u0000source\u0000nested-private",
                        80
                    ),
                    notes: "private nested child"
                },
                suspectedDuplicateOf: {
                    accountId: "account",
                    date: DATE,
                    transactionId: "source-parent"
                }
            });
            insertTransaction(state.transactions, {
                transaction: {
                    ...relocationTransaction(
                        "__moneyflow_gc_shadow__:legacy\u0000source\u0000private-parent",
                        200
                    ),
                    suspectedDuplicates: [
                        {
                            ...relocationTransaction("nested-public", 190),
                            notes: "incomplete shadow"
                        }
                    ]
                }
            });
        });
        vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
        let observedNotes: string | undefined;
        let observedGraph:
            | { readonly nestedIds: string[]; readonly parentIds: string[] }
            | undefined;

        function CaptureTransaction() {
            observedNotes = useTransaction("nested-public")?.notes;
            observedGraph = physicalTransactionGraph(
                useVaultSelector((state) => state.transactions)
            );
            return null;
        }

        const view = render(
            createElement(VaultProvider, { doc: vault.doc }, createElement(CaptureTransaction))
        );

        expect(observedNotes).toBe("complete source");
        expect(observedGraph?.parentIds).toEqual(["source-parent"]);
        expect(observedGraph?.nestedIds).toEqual(["source-parent-nested", "nested-public"]);
        view.unmount();
        vault.mirror.dispose();
    });

    it("keeps account and reserved-key selectors path-lazy across a large transaction store", async () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            for (let accountIndex = 0; accountIndex < 24; accountIndex += 1) {
                const accountId = `account-${accountIndex}`;
                for (let transactionIndex = 0; transactionIndex < 4; transactionIndex += 1) {
                    insertTransaction(state.transactions, {
                        transaction: {
                            ...relocationTransaction(
                                `transaction-${accountIndex}-${transactionIndex}`,
                                accountIndex * 10 + transactionIndex + 1
                            ),
                            accountId,
                            suspectedDuplicates: [
                                {
                                    ...relocationTransaction(
                                        `nested-source-${accountIndex}-${transactionIndex}`,
                                        accountIndex * 10 + transactionIndex + 2
                                    ).suspectedDuplicates[0],
                                    id: `nested-${accountIndex}-${transactionIndex}`,
                                    accountId
                                }
                            ]
                        }
                    });
                }
            }
        });
        vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
        const classifyParent = vi.spyOn(transactionSchema, "isPublicTransaction");
        const classifyNested = vi.spyOn(
            transactionSchema,
            "getTransactionMaintenanceShadowIdentity"
        );
        let selectedAccount: unknown;
        let selectedReserved: unknown;
        let selectorRenderCount = 0;

        function CapturePaths() {
            selectorRenderCount += 1;
            selectedAccount = useVaultSelector((state) => state.transactions["account-0"]);
            selectedReserved = useVaultSelector(
                (state) => state.transactions[LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY]
            );
            return null;
        }

        const view = render(
            createElement(VaultProvider, { doc: vault.doc }, createElement(CapturePaths))
        );

        expect(selectedAccount).toBeDefined();
        expect(selectedReserved).toBeUndefined();
        expect(classifyParent).not.toHaveBeenCalled();
        expect(classifyNested).not.toHaveBeenCalled();
        const initialRenderCount = selectorRenderCount;

        classifyParent.mockClear();
        classifyNested.mockClear();
        await act(async () => {
            vault.mirror.setState((state: VaultState) => {
                state.transactions["account-0"].years[0].months[0].days[0].transactions[0].notes =
                    "ordinary update";
            });
            await Promise.resolve();
        });

        expect(selectorRenderCount).toBeGreaterThan(initialRenderCount);
        expect(classifyParent).not.toHaveBeenCalled();
        expect(classifyNested).not.toHaveBeenCalled();
        view.unmount();
        vault.mirror.dispose();
    });

    it("sanitizes generic action and edit callbacks before cleanup without changing Undo", async () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: {
                    ...relocationTransaction("action-public", 100),
                    suspectedDuplicates: [
                        ...relocationTransaction("action-public", 100).suspectedDuplicates,
                        {
                            ...relocationTransaction("nested-private-source", 90)
                                .suspectedDuplicates[0],
                            id: "__moneyflow_gc_shadow__:legacy\u0000source\u0000nested-private"
                        }
                    ]
                }
            });
            insertTransaction(state.transactions, {
                transaction: relocationTransaction(
                    "__moneyflow_gc_shadow__:legacy\u0000source\u0000private-parent",
                    80
                )
            });
            state.preferences.name = "Original name";
        });
        const frames = createFrameHost();
        const undoCoordinator = new VaultUndoCoordinator(vault.doc);
        vi.spyOn(window, "requestAnimationFrame").mockImplementation(frames.host.requestFrame);
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(frames.host.cancelFrame);
        let invokeAction: (() => void) | undefined;
        let invokeEdit: (() => void) | undefined;
        let actionGraph: { readonly nestedIds: string[]; readonly parentIds: string[] } | undefined;
        let editGraph: { readonly nestedIds: string[]; readonly parentIds: string[] } | undefined;
        let actionKeys: string[] = [];
        let editKeys: string[] = [];
        let actionNestedKeys: string[] = [];
        let actionTransactionKeys: string[] = [];
        let actionTransactionLength: unknown;
        let actionReserved: unknown;
        let editReserved: unknown;

        function CaptureActions() {
            const action = useVaultAction((state) => {
                actionKeys = Object.keys(state.transactions);
                actionReserved = state.transactions[LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY];
                actionGraph = physicalTransactionGraph(state.transactions);
                const transactions =
                    state.transactions.account.years[0].months[0].days[0].transactions;
                actionTransactionKeys = Object.keys(transactions);
                actionTransactionLength = Reflect.getOwnPropertyDescriptor(
                    transactions,
                    "length"
                )?.value;
                actionNestedKeys = Object.keys(transactions[0].suspectedDuplicates);
                transactions[0].notes = "generic action edit";
                insertTransaction(state.transactions, {
                    transaction: {
                        ...relocationTransaction("generic-action-insert", 70),
                        suspectedDuplicates: []
                    }
                });
            });
            const edit = useVaultEditAction((state) => {
                editKeys = Object.keys(state.transactions);
                editReserved = state.transactions[LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY];
                editGraph = physicalTransactionGraph(state.transactions);
                state.preferences.name = "Generic edit name";
            });
            invokeAction = action;
            invokeEdit = () => edit.update();
            return null;
        }

        const view = render(
            // createElement's required-children type needs the child in the typed props object.
            // eslint-disable-next-line react/no-children-prop
            createElement(VaultUndoProvider, {
                coordinator: undoCoordinator,
                children: createElement(
                    VaultProvider,
                    { doc: vault.doc },
                    createElement(CaptureActions)
                )
            })
        );
        const peer = createVaultMirrorFromSnapshot(vault.doc.export({ mode: "snapshot" }));
        const peerBase = VersionVector.decode(peer.doc.version().encode());
        installLegacyMetadata(peer.doc);
        const origins: Array<string | undefined> = [];
        const stopOrigins = vault.doc.subscribe((event) => origins.push(event.origin));

        await act(async () => {
            vault.doc.import(peer.doc.export({ mode: "update", from: peerBase }));
            await Promise.resolve();
        });
        expect(
            vault.doc.getMap("transactions").get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
        ).toBeInstanceOf(LoroMap);

        await act(async () => {
            invokeAction?.();
            invokeEdit?.();
            await Promise.resolve();
        });

        expect(actionKeys).toEqual(["account"]);
        expect(editKeys).toEqual(["account"]);
        expect(actionReserved).toBeUndefined();
        expect(editReserved).toBeUndefined();
        expect(actionTransactionKeys).toEqual(["0"]);
        expect(actionTransactionLength).toBe(1);
        expect(actionNestedKeys).toEqual(["0"]);
        expect(actionGraph?.parentIds).toEqual(["action-public"]);
        expect(editGraph?.parentIds).toEqual(["action-public", "generic-action-insert"]);
        expect(actionGraph?.nestedIds).toEqual(["action-public-nested"]);
        expect(editGraph?.nestedIds).toEqual(["action-public-nested"]);
        expect(
            accountTransactions(vault.mirror.getState()).find(({ id }) => id === "action-public")
                ?.notes
        ).toBe("generic action edit");
        expect(
            accountTransactions(vault.mirror.getState()).some(
                ({ id }) => id === "generic-action-insert"
            )
        ).toBe(true);
        expect(vault.mirror.getState().preferences.name).toBe("Generic edit name");
        expect(undoCoordinator.getSnapshot().canUndo).toBe(true);

        await act(async () => {
            expect(frames.runOne()).toBe(true);
            await Promise.resolve();
        });
        expect(origins.filter((origin) => origin === "system:gc")).toHaveLength(1);
        expect(
            vault.doc.getMap("transactions").get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
        ).toBeUndefined();

        await act(async () => {
            frames.runAll();
            await Promise.resolve();
        });
        let undone = false;
        await act(async () => {
            undone = undoCoordinator.undo();
            await Promise.resolve();
        });
        expect(undone).toBe(true);
        expect(vault.mirror.getState().preferences.name).toBe("Original name");
        expect(
            accountTransactions(vault.mirror.getState()).find(({ id }) => id === "action-public")
                ?.notes
        ).toBe("before");
        expect(
            accountTransactions(vault.mirror.getState()).some(
                ({ id }) => id === "generic-action-insert"
            )
        ).toBe(false);
        expect(
            vault.doc.getMap("transactions").get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
        ).toBeUndefined();

        stopOrigins();
        view.unmount();
        undoCoordinator.dispose();
        peer.mirror.dispose();
        vault.mirror.dispose();
    });

    it("collects a cleared change-all history frontier in the same provider", async () => {
        const vault = createVaultMirror();
        const coordinator = new VaultUndoCoordinator(vault.doc);
        vault.mirror.setState(
            (state: VaultState) => {
                createDescriptionAlias(state, { aliasId: "live-source", name: "Live source" });
                createDescriptionAlias(state, { aliasId: "live-target", name: "Live target" });
            },
            { origin: "system:hydration" }
        );
        const frames = createFrameHost();
        const dispose = startVaultMaintenanceScheduler({
            doc: vault.doc,
            host: frames.host,
            store: vault.mirror
        });
        frames.runAll();

        coordinator.runUserAction("alias", (origin) =>
            vault.mirror.setState(
                (state: VaultState) => {
                    changeAllDescriptionAliases(state, {
                        sourceAliasId: "live-source",
                        target: { kind: "existing", aliasId: "live-target" }
                    });
                },
                { origin }
            )
        );
        await Promise.resolve();
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"]).toBeDefined();
        expect(coordinator.undo()).toBe(true);
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"].kind).toBe("real");
        expect(coordinator.redo()).toBe(true);
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"]).toBeDefined();

        coordinator.clear();
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["live-source"]).toBeUndefined();

        dispose();
        coordinator.dispose();
        vault.mirror.dispose();
    });

    it("releases redo-invalidated, trimmed, and disposed alias history without a remount", async () => {
        const invalidated = createAliasGarbage();
        const invalidatedUndo = new VaultUndoCoordinator(invalidated.doc);
        invalidatedUndo.runUserAction("alias", (origin) =>
            invalidated.mirror.setState(
                (state: VaultState) => {
                    state.descriptionAliases.source.name = "History-only name";
                },
                { origin }
            )
        );
        await Promise.resolve();
        expect(invalidatedUndo.undo()).toBe(true);
        const invalidatedFrames = createFrameHost();
        const disposeInvalidated = startVaultMaintenanceScheduler({
            doc: invalidated.doc,
            host: invalidatedFrames.host,
            store: invalidated.mirror
        });
        invalidatedFrames.runAll();
        expect(invalidated.mirror.getState().descriptionAliases.source).toBeDefined();
        invalidatedUndo.runUserAction("edit", (origin) =>
            invalidated.mirror.setState(
                (state: VaultState) => {
                    state.preferences.name = "Invalidates redo";
                },
                { origin }
            )
        );
        await Promise.resolve();
        invalidatedFrames.runAll();
        expect(invalidated.mirror.getState().descriptionAliases.source).toBeUndefined();
        disposeInvalidated();
        invalidatedUndo.dispose();
        invalidated.mirror.dispose();

        for (const release of ["trim", "dispose"] as const) {
            const vault = createAliasGarbage();
            const coordinator = new VaultUndoCoordinator(vault.doc);
            coordinator.runUserAction("alias", (origin) =>
                vault.mirror.setState(
                    (state: VaultState) => {
                        state.descriptionAliases.source.name = `Release by ${release}`;
                    },
                    { origin }
                )
            );
            await Promise.resolve();
            const frames = createFrameHost();
            const disposeScheduler = startVaultMaintenanceScheduler({
                doc: vault.doc,
                host: frames.host,
                store: vault.mirror
            });
            frames.runAll();
            expect(vault.mirror.getState().descriptionAliases.source).toBeDefined();
            if (release === "trim") coordinator.setMaxUndoSteps(0);
            else coordinator.dispose();
            frames.runAll();
            expect(vault.mirror.getState().descriptionAliases.source).toBeUndefined();
            disposeScheduler();
            coordinator.dispose();
            vault.mirror.dispose();
        }
    });

    it("finishes every phase despite continuous relevant user edits", () => {
        const vault = createAliasGarbage();
        const frames = createFrameHost();
        const dispose = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: vault.doc,
            host: frames.host,
            store: vault.mirror
        });

        for (let index = 0; index < 200; index += 1) {
            expect(frames.runOne()).toBe(true);
            vault.mirror.setState(
                (state: VaultState) => {
                    state.transactions.account.years[0].months[0].days[0].transactions[0].notes = `continuous-${index}`;
                },
                { origin: "user:edit" }
            );
            if (!vault.mirror.getState().descriptionAliases.source) break;
        }

        expect(vault.mirror.getState().descriptionAliases.source).toBeUndefined();
        dispose();
        vault.mirror.dispose();
    });

    it("pauses while hidden, resumes once, ignores its own origin, and disposes exactly", () => {
        const vault = createAliasGarbage();
        const frames = createFrameHost();
        const origins: Array<string | undefined> = [];
        const unsubscribe = vault.doc.subscribe((event) => origins.push(event.origin));
        const dispose = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: vault.doc,
            host: frames.host,
            store: vault.mirror
        });

        expect(frames.pending()).toBe(1);
        frames.setVisible(false);
        expect(frames.pending()).toBe(0);
        expect(frames.cancelled).toHaveLength(1);
        frames.setVisible(true);
        expect(frames.pending()).toBe(1);
        frames.runAll();

        const state = vault.mirror.getState();
        expect(state.descriptionAliases.source).toBeUndefined();
        expect(
            state.transactions.account.years[0].months[0].days[0].transactions[0].descriptionAliasId
        ).toBe("target");
        expect(new Set(origins)).toEqual(new Set(["system:gc"]));
        expect(frames.pending()).toBe(0);

        vault.mirror.setState((draft: VaultState) => {
            createDescriptionAlias(draft, { aliasId: "session-source", name: "Session source" });
            createDescriptionAlias(draft, { aliasId: "session-target", name: "Session target" });
            changeAllDescriptionAliases(draft, {
                sourceAliasId: "session-source",
                target: { kind: "existing", aliasId: "session-target" }
            });
        });
        frames.runAll();
        expect(vault.mirror.getState().descriptionAliases["session-source"]).toBeDefined();

        dispose();
        const remountedFrames = createFrameHost();
        const disposeRemounted = startVaultMaintenanceScheduler({
            doc: vault.doc,
            host: remountedFrames.host,
            store: vault.mirror
        });
        remountedFrames.runAll();
        expect(vault.mirror.getState().descriptionAliases["session-source"]).toBeUndefined();
        disposeRemounted();
        vault.mirror.setState((draft: VaultState) => {
            draft.transactions.account.years[0].months[0].days[0].transactions[0].notes = "later";
        });
        expect(frames.pending()).toBe(0);
        unsubscribe();
        vault.mirror.dispose();
    });

    it("binds one frame loop to the current provider document and cleans up replacement/unmount", () => {
        const first = createVaultMirror();
        const second = createVaultMirror();
        first.mirror.dispose();
        second.mirror.dispose();
        let visibility = "visible";
        let nextId = 0;
        const callbacks = new Map<number, FrameRequestCallback>();
        const request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
            nextId += 1;
            callbacks.set(nextId, callback);
            return nextId;
        });
        const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
            callbacks.delete(id);
        });
        vi.spyOn(document, "visibilityState", "get").mockImplementation(
            () => visibility as DocumentVisibilityState
        );

        const view = render(createElement(VaultProvider, { doc: first.doc }, null));
        expect(request).toHaveBeenCalledOnce();
        visibility = "hidden";
        document.dispatchEvent(new Event("visibilitychange"));
        expect(cancel).toHaveBeenCalledOnce();
        visibility = "visible";
        document.dispatchEvent(new Event("visibilitychange"));
        expect(request).toHaveBeenCalledTimes(2);

        view.rerender(createElement(VaultProvider, { doc: second.doc }, null));
        expect(cancel).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenCalledTimes(3);
        view.unmount();
        expect(cancel).toHaveBeenCalledTimes(3);
        expect(callbacks.size).toBe(0);
    });

    it("keeps partial relocation private across edits and resumes it after snapshot reload", async () => {
        const edited = createRelocationGarbage();
        expect(
            accountTransactions(edited.mirror.getState())
                .map(({ id }) => id)
                .sort()
        ).toEqual(["a-target", "newest", "z-source"]);
        const editedFrames = createFrameHost();
        const observations: string[][] = [];
        const unsubscribe = edited.doc.subscribe(() => {
            observations.push(
                getAccountTransactions(edited.mirror.getState().transactions, "account").map(
                    ({ id }) => id
                )
            );
        });
        const disposeEdited = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: edited.doc,
            host: editedFrames.host,
            store: edited.mirror
        });
        runUntilTransactionShadow(editedFrames, () => edited.mirror.getState());
        await Promise.resolve();
        const originalEpoch = maintenanceEpoch(edited.doc);
        expect(
            getAccountTransactions(edited.mirror.getState().transactions, "account").map(
                ({ id }) => id
            )
        ).toEqual(["newest", "a-target", "z-source"]);

        edited.mirror.setState(
            (state: VaultState) => {
                const newest = accountTransactions(state).find(({ id }) => id === "newest");
                if (!newest) throw new Error("Missing editable transaction");
                newest.notes = "edited while private shadow existed";
            },
            { origin: "user:edit" }
        );
        await Promise.resolve();
        editedFrames.runAll();
        expect(maintenanceEpoch(edited.doc)).not.toBe(originalEpoch);
        expect(hasTransactionShadow(edited.mirror.getState())).toBe(false);
        expect(
            getAccountTransactions(edited.mirror.getState().transactions, "account").find(
                ({ id }) => id === "newest"
            )?.notes
        ).toBe("edited while private shadow existed");
        expect(observations.every((ids) => ids.length === new Set(ids).size)).toBe(true);
        unsubscribe();
        disposeEdited();
        edited.mirror.dispose();

        const interrupted = createRelocationGarbage();
        const interruptedFrames = createFrameHost();
        const disposeInterrupted = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: interrupted.doc,
            host: interruptedFrames.host,
            store: interrupted.mirror
        });
        runUntilTransactionShadow(interruptedFrames, () => interrupted.mirror.getState());
        expect(Object.keys(interrupted.mirror.getState().transactions)).not.toContain(
            "__moneyflow_gc_metadata__"
        );
        const partialSnapshot = interrupted.doc.export({ mode: "snapshot" });
        disposeInterrupted();
        interrupted.mirror.dispose();

        const reloaded = createVaultMirrorFromSnapshot(partialSnapshot);
        const reloadedFrames = createFrameHost();
        const disposeReloaded = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: reloaded.doc,
            host: reloadedFrames.host,
            store: reloaded.mirror
        });
        reloadedFrames.runAll();
        expect(Object.keys(reloaded.mirror.getState().transactions)).not.toContain(
            "__moneyflow_gc_metadata__"
        );
        expect(hasTransactionShadow(reloaded.mirror.getState())).toBe(false);
        expect(
            getAccountTransactions(reloaded.mirror.getState().transactions, "account").filter(
                ({ id }) => id === "z-source"
            )
        ).toHaveLength(1);
        disposeReloaded();
        reloaded.mirror.dispose();
    });

    it.each(["root-tag", "root-allocation", "nested-tag", "nested-allocation"] as const)(
        "rejects a disposed same-document shadow after an equal-cardinality %s edit",
        (value) => {
            const vault = createRelocationGarbage();
            const frames = createFrameHost();
            const dispose = startVaultMaintenanceScheduler({
                budget: { maxItems: 1, maxMilliseconds: 4 },
                doc: vault.doc,
                host: frames.host,
                store: vault.mirror
            });
            runUntilConsumedShadowValue(frames, () => vault.mirror.getState(), value);
            const staleEpoch = maintenanceEpoch(vault.doc);

            dispose();
            const edited = editConsumedSourceValue(vault, value);
            const remountedFrames = createFrameHost();
            const disposeRemounted = startVaultMaintenanceScheduler({
                budget: { maxItems: 1, maxMilliseconds: 4 },
                doc: vault.doc,
                host: remountedFrames.host,
                store: vault.mirror
            });
            remountedFrames.runAll();

            expect(hasTransactionShadow(vault.mirror.getState())).toBe(false);
            expect(maintenanceEpoch(vault.doc)).not.toBe(staleEpoch);
            const relocated = getAccountTransactions(
                vault.mirror.getState().transactions,
                "account"
            ).find(({ id }) => id === edited.publicId);
            if (value === "root-tag") {
                expect(relocated?.tagIds[0]).toBe(edited.replacement);
            } else if (value === "root-allocation") {
                expect(relocated?.allocations["root-one"]).toBe(edited.replacement);
            } else if (value === "nested-tag") {
                expect(relocated?.suspectedDuplicates[0]?.tagIds[0]).toBe(edited.replacement);
            } else {
                expect(relocated?.suspectedDuplicates[0]?.allocations["nested-one"]).toBe(
                    edited.replacement
                );
            }

            disposeRemounted();
            vault.mirror.dispose();
        }
    );

    it.each(["marker-only", "marker-plus-domain"] as const)(
        "cleans a late legacy metadata %s import before raw hooks can expose it",
        async (delivery) => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                insertTransaction(state.transactions, {
                    transaction: relocationTransaction("visible", 10)
                });
            });
            const frames = createFrameHost();
            const undoCoordinator = new VaultUndoCoordinator(vault.doc);
            vi.spyOn(window, "requestAnimationFrame").mockImplementation(frames.host.requestFrame);
            vi.spyOn(window, "cancelAnimationFrame").mockImplementation(frames.host.cancelFrame);
            const observedKeys: string[][] = [];
            const genericSelectorInputKeys: string[][] = [];
            const observedWholeStateKeys: string[][] = [];
            const observedReservedValues: unknown[] = [];
            const observedNamedGenericIdentity: boolean[] = [];
            let unrelatedRenderCount = 0;
            let unrelatedIdentities:
                | {
                      readonly accounts: VaultState["accounts"];
                      readonly people: VaultState["people"];
                      readonly statuses: VaultState["statuses"];
                      readonly tags: VaultState["tags"];
                  }
                | undefined;

            function CaptureTransactions() {
                const named = useTransactions();
                const generic = useVaultSelector((state) => {
                    genericSelectorInputKeys.push(Object.keys(state.transactions));
                    return state.transactions;
                });
                const wholeState = useVaultSelector((state) => state);
                const spreadTransactions = useVaultSelector((state) => ({ ...state }).transactions);
                const describedTransactions = useVaultSelector(
                    (state) => Reflect.getOwnPropertyDescriptor(state, "transactions")?.value
                );
                const reserved = useVaultSelector(
                    (state) => state.transactions[LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY]
                );
                observedKeys.push(
                    Object.keys(named),
                    Object.keys(generic),
                    Object.keys(spreadTransactions)
                );
                if (typeof describedTransactions === "object" && describedTransactions != null) {
                    observedKeys.push(Object.keys(describedTransactions));
                }
                observedWholeStateKeys.push(Object.keys(wholeState.transactions));
                observedReservedValues.push(reserved);
                observedNamedGenericIdentity.push(named === generic);
                return null;
            }

            function CaptureUnrelatedState() {
                unrelatedRenderCount += 1;
                unrelatedIdentities = {
                    accounts: useVaultSelector((state) => state.accounts),
                    people: useVaultSelector((state) => state.people),
                    statuses: useVaultSelector((state) => state.statuses),
                    tags: useVaultSelector((state) => state.tags)
                };
                return null;
            }

            const view = render(
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator: undoCoordinator,
                    children: createElement(
                        VaultProvider,
                        { doc: vault.doc },
                        createElement(
                            Fragment,
                            null,
                            createElement(CaptureTransactions),
                            createElement(CaptureUnrelatedState)
                        )
                    )
                })
            );
            frames.runAll();
            const initialUnrelatedRenderCount = unrelatedRenderCount;
            const initialUnrelatedIdentities = unrelatedIdentities;
            const visibleCid = accountTransactions(vault.mirror.getState()).find(
                ({ id }) => id === "visible"
            )?.$cid;
            if (!visibleCid || !isContainerId(visibleCid)) {
                throw new Error("Missing visible transaction identity");
            }
            const peer = createVaultMirrorFromSnapshot(vault.doc.export({ mode: "snapshot" }));
            const peerBase = VersionVector.decode(peer.doc.version().encode());
            if (delivery === "marker-plus-domain") {
                const container = peer.doc.getContainerById(visibleCid);
                if (!(container instanceof LoroMap)) throw new Error("Missing visible map");
                container.set("notes", "late domain edit");
                peer.doc.commit({ origin: "user:edit" });
            }
            installLegacyMetadata(peer.doc);
            const cleanupUpdates: Uint8Array[] = [];
            const stopUpdates = vault.doc.subscribeLocalUpdates((update) =>
                cleanupUpdates.push(update)
            );

            await act(async () => {
                vault.doc.import(peer.doc.export({ mode: "update", from: peerBase }));
                await Promise.resolve();
            });

            expect(
                vault.doc.getMap("transactions").get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
            ).toBeInstanceOf(LoroMap);
            expect(
                observedKeys.every(
                    (keys) => !keys.includes(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
                )
            ).toBe(true);
            expect(
                genericSelectorInputKeys.every(
                    (keys) => !keys.includes(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
                )
            ).toBe(true);
            expect(
                observedWholeStateKeys.every(
                    (keys) => !keys.includes(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
                )
            ).toBe(true);
            expect(observedReservedValues).not.toContainEqual(expect.anything());
            expect(observedNamedGenericIdentity).not.toContain(false);
            expect(unrelatedRenderCount).toBe(initialUnrelatedRenderCount);
            expect(unrelatedIdentities?.accounts).toBe(initialUnrelatedIdentities?.accounts);
            expect(unrelatedIdentities?.people).toBe(initialUnrelatedIdentities?.people);
            expect(unrelatedIdentities?.statuses).toBe(initialUnrelatedIdentities?.statuses);
            expect(unrelatedIdentities?.tags).toBe(initialUnrelatedIdentities?.tags);
            await act(async () => {
                frames.runAll();
                await Promise.resolve();
            });
            expect(
                vault.doc.getMap("transactions").get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
            ).toBeUndefined();
            expect(cleanupUpdates).toHaveLength(1);
            expect(
                accountTransactions(vault.mirror.getState()).find(({ id }) => id === "visible")
                    ?.notes
            ).toBe(delivery === "marker-plus-domain" ? "late domain edit" : "before");

            await act(async () => {
                vault.doc.import(peer.doc.export({ mode: "update", from: peerBase }));
                frames.runAll();
                await Promise.resolve();
            });
            expect(cleanupUpdates).toHaveLength(1);
            expect(
                vault.doc.getMap("transactions").get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
            ).toBeUndefined();

            stopUpdates();
            view.unmount();
            undoCoordinator.dispose();
            peer.mirror.dispose();
            vault.mirror.dispose();
        }
    );

    it.each([
        ["PeopleTable", () => createElement(PeopleTable, { vaultId: "selector-consumer" })],
        ["StatusesTable", () => createElement(StatusesTable)],
        ["TagsTable", () => createElement(TagsTable)]
    ] as const)("sanitizes generic transaction state used by %s", async (_name, consumer) => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            Reflect.set(state.people, "consumer", {
                id: "consumer",
                name: "Consumer",
                linkedUserId: undefined,
                deletedAt: undefined
            });
            Reflect.set(state.tags, "consumer", {
                id: "consumer",
                name: "Consumer",
                color: undefined,
                parentTagId: undefined,
                isTransfer: false,
                deletedAt: undefined
            });
        });
        const frames = createFrameHost();
        const undoCoordinator = new VaultUndoCoordinator(vault.doc);
        vi.spyOn(window, "requestAnimationFrame").mockImplementation(frames.host.requestFrame);
        vi.spyOn(window, "cancelAnimationFrame").mockImplementation(frames.host.cancelFrame);
        const consumerStores: VaultState["transactions"][] = [];
        const getAllTransactions = transactionQueries.getAllTransactions;
        vi.spyOn(transactionQueries, "getAllTransactions").mockImplementation((transactions) => {
            consumerStores.push(transactions);
            return getAllTransactions(transactions);
        });
        const view = render(
            // createElement's required-children type needs the child in the typed props object.
            // eslint-disable-next-line react/no-children-prop
            createElement(VaultUndoProvider, {
                coordinator: undoCoordinator,
                children: createElement(VaultProvider, { doc: vault.doc }, consumer())
            })
        );
        frames.runAll();
        const initialConsumerCallCount = consumerStores.length;
        const peer = createVaultMirrorFromSnapshot(vault.doc.export({ mode: "snapshot" }));
        const peerBase = VersionVector.decode(peer.doc.version().encode());
        installLegacyMetadata(peer.doc);

        await act(async () => {
            vault.doc.import(peer.doc.export({ mode: "update", from: peerBase }));
            await Promise.resolve();
        });

        expect(
            vault.doc.getMap("transactions").get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY)
        ).toBeInstanceOf(LoroMap);
        expect(consumerStores.length).toBeGreaterThan(initialConsumerCallCount);
        expect(
            consumerStores.every(
                (transactions) => !(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY in transactions)
            )
        ).toBe(true);

        view.unmount();
        undoCoordinator.dispose();
        peer.mirror.dispose();
        vault.mirror.dispose();
    });

    it("classifies synced shadow batches as maintenance and converges without local echo", () => {
        const source = createRelocationGarbage();
        const malformedSnapshot = source.doc.export({ mode: "snapshot" });
        const sourceBase = source.doc.version();
        const peer = createVaultMirrorFromSnapshot(malformedSnapshot);
        const peerFrames = createFrameHost();
        peerFrames.setVisible(false);
        const disposePeer = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: peer.doc,
            host: peerFrames.host,
            store: peer.mirror
        });
        const echoed: Uint8Array[] = [];
        const stopEcho = peer.doc.subscribeLocalUpdates((update) => echoed.push(update));
        const peerObservations: string[][] = [];
        const stopPeer = peer.doc.subscribe(() => {
            peerObservations.push(
                getAccountTransactions(peer.mirror.getState().transactions, "account").map(
                    ({ id }) => id
                )
            );
        });

        const sourceFrames = createFrameHost();
        const disposeSource = startVaultMaintenanceScheduler({
            budget: { maxItems: 1, maxMilliseconds: 4 },
            doc: source.doc,
            host: sourceFrames.host,
            store: source.mirror
        });
        runUntilTransactionShadow(sourceFrames, () => source.mirror.getState());
        peer.doc.import(source.doc.export({ mode: "update", from: sourceBase }));
        expect(hasTransactionShadow(peer.mirror.getState())).toBe(true);
        expect(maintenanceEpoch(peer.doc)).toBe(maintenanceEpoch(source.doc));
        expect(
            getAccountTransactions(peer.mirror.getState().transactions, "account").map(
                ({ id }) => id
            )
        ).toEqual(["newest", "a-target", "z-source"]);

        sourceFrames.runAll();
        peer.doc.import(source.doc.export({ mode: "update", from: sourceBase }));
        expect(maintenanceEpoch(peer.doc)).toBe(maintenanceEpoch(source.doc));
        peerFrames.setVisible(true);
        peerFrames.runAll();
        expect(hasTransactionShadow(peer.mirror.getState())).toBe(false);
        expect(echoed).toEqual([]);
        expect(peerObservations.every((ids) => ids.length === new Set(ids).size)).toBe(true);
        expect(getAccountTransactions(peer.mirror.getState().transactions, "account")).toEqual(
            getAccountTransactions(source.mirror.getState().transactions, "account")
        );

        stopPeer();
        stopEcho();
        disposeSource();
        disposePeer();
        source.mirror.dispose();
        peer.mirror.dispose();
    });

    it.each(["maintenance-before-edit", "edit-before-maintenance", "dependency-delayed"] as const)(
        "invalidates an active receiver shadow for a mixed %s import",
        (delivery) => {
            const source = createRelocationGarbage();
            const sourceFrames = createFrameHost();
            const disposeSource = startVaultMaintenanceScheduler({
                budget: { maxItems: 1, maxMilliseconds: 4 },
                doc: source.doc,
                host: sourceFrames.host,
                store: source.mirror
            });
            runUntilTransactionShadow(sourceFrames, () => source.mirror.getState());
            const receiver = createVaultMirrorFromSnapshot(source.doc.export({ mode: "snapshot" }));
            const receiverFrames = createFrameHost();
            receiverFrames.setVisible(false);
            const disposeReceiver = startVaultMaintenanceScheduler({
                budget: { maxItems: 1, maxMilliseconds: 4 },
                doc: receiver.doc,
                host: receiverFrames.host,
                store: receiver.mirror
            });
            const importedEvents: unknown[] = [];
            const stopImportedEvents = receiver.doc.subscribe((event) => {
                if (event.by === "import") {
                    importedEvents.push(event.events.map(({ diff, path }) => ({ diff, path })));
                }
            });
            const editSource = () => {
                const transaction = accountTransactions(source.mirror.getState()).find(
                    ({ id }) => id === "z-source"
                );
                if (!transaction?.$cid || !isContainerId(transaction.$cid)) {
                    throw new Error("Missing relocation source container");
                }
                const container = source.doc.getContainerById(transaction.$cid);
                if (!(container instanceof LoroMap)) {
                    throw new Error("Missing relocation source map");
                }
                container.set("notes", `mixed ${delivery}`);
                source.doc.commit({ origin: "user:edit" });
                expect(
                    accountTransactions(source.mirror.getState()).find(
                        ({ id }) => id === "z-source"
                    )?.notes
                ).toBe(`mixed ${delivery}`);
            };
            const sourceVersion = () => VersionVector.decode(source.doc.version().encode());
            const captureMaintenanceUpdate = () => {
                const base = sourceVersion();
                for (let frame = 0; frame < 1_000; frame += 1) {
                    if (!sourceFrames.runOne()) break;
                    if (source.doc.version().compare(base) !== 0) {
                        return source.doc.export({ mode: "update", from: base });
                    }
                }
                throw new Error("Expected a maintenance update");
            };

            let maintenanceUpdate: Uint8Array;
            let userUpdate: Uint8Array;
            if (delivery === "edit-before-maintenance") {
                const userBase = sourceVersion();
                editSource();
                userUpdate = source.doc.export({ mode: "update", from: userBase });
                maintenanceUpdate = captureMaintenanceUpdate();
            } else {
                maintenanceUpdate = captureMaintenanceUpdate();
                const userBase = sourceVersion();
                editSource();
                userUpdate = source.doc.export({ mode: "update", from: userBase });
            }

            if (delivery === "dependency-delayed") {
                receiver.doc.import(userUpdate);
                expect(
                    accountTransactions(receiver.mirror.getState()).find(
                        ({ id }) => id === "z-source"
                    )?.notes
                ).toBe("before");
                receiver.doc.import(maintenanceUpdate);
            } else if (delivery === "edit-before-maintenance") {
                receiver.doc.import(userUpdate);
                receiver.doc.import(maintenanceUpdate);
            } else {
                receiver.doc.importBatch([maintenanceUpdate, userUpdate]);
            }
            expect(
                accountTransactions(receiver.mirror.getState()).find(({ id }) => id === "z-source")
                    ?.notes,
                JSON.stringify(importedEvents)
            ).toBe(`mixed ${delivery}`);
            receiverFrames.setVisible(true);
            receiverFrames.runAll();

            const edited = getAccountTransactions(
                receiver.mirror.getState().transactions,
                "account"
            ).find(({ id }) => id === "z-source");
            expect(edited?.notes, JSON.stringify(importedEvents)).toBe(`mixed ${delivery}`);
            expect(hasTransactionShadow(receiver.mirror.getState())).toBe(false);
            expect(Object.keys(receiver.mirror.getState().transactions)).not.toContain(
                "__moneyflow_gc_metadata__"
            );

            stopImportedEvents();
            disposeReceiver();
            disposeSource();
            receiver.mirror.dispose();
            source.mirror.dispose();
        }
    );

    it("persists and encrypts GC, exchanges without echo, and leaves user undo intact", async () => {
        const source = createAliasGarbage();
        const malformedSnapshot = source.doc.export({ mode: "snapshot" });
        source.mirror.dispose();
        const local = createVaultMirrorFromSnapshot(malformedSnapshot);
        const coordinator = new VaultUndoCoordinator(local.doc);
        const key = new Uint8Array(32);
        vaultCounter += 1;
        const vaultId = `maintenance-${vaultCounter}-${Date.now()}`;
        const pushOps = vi
            .fn<NonNullable<SyncManagerOptions["trpc"]>["sync"]["pushOps"]["mutate"]>()
            .mockImplementation(async (input) => ({
                insertedIds: input.ops.map((operation) => operation.id)
            }));
        const manager = new SyncManager({
            vaultId,
            pubkeyHash: "maintenance-user",
            vaultKey: key,
            doc: local.doc,
            trpc: createTrpc({ mutate: pushOps })
        });
        await manager.initialize();
        const frames = createFrameHost();
        const dispose = startVaultMaintenanceScheduler({
            doc: local.doc,
            host: frames.host,
            store: local.mirror
        });
        frames.runAll();
        await manager.awaitLocalPersistence();
        await manager.forceSync();

        expect(coordinator.getSnapshot().canUndo).toBe(false);
        expect(pushOps).toHaveBeenCalledOnce();
        expect(await getUnpushedOps(vaultId)).toEqual([]);
        const pushed = pushOps.mock.calls[0][0].ops;
        expect(pushed.length).toBeGreaterThan(0);
        expect(
            pushed.every((operation) => !operation.encryptedData.includes("Source plaintext"))
        ).toBe(true);

        const peerDoc = createVaultMirrorFromSnapshot(malformedSnapshot);
        const echoed: Uint8Array[] = [];
        const unsubscribeEcho = peerDoc.doc.subscribeLocalUpdates((update) => echoed.push(update));
        for (const operation of pushed) {
            peerDoc.doc.import(await decryptUpdate(operation, key));
        }
        const peerFrames = createFrameHost();
        const disposePeer = startVaultMaintenanceScheduler({
            doc: peerDoc.doc,
            host: peerFrames.host,
            store: peerDoc.mirror
        });
        peerFrames.runAll();
        expect(echoed).toEqual([]);
        expect(peerDoc.mirror.getState().descriptionAliases.source).toBeUndefined();

        coordinator.runUserAction("edit", (origin) =>
            local.mirror.setState(
                (state: VaultState) => {
                    state.transactions.account.years[0].months[0].days[0].transactions[0].notes =
                        "after";
                },
                { origin }
            )
        );
        await Promise.resolve();
        expect(coordinator.undo()).toBe(true);
        expect(
            local.mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0]
                .notes
        ).toBe("before");
        expect(local.mirror.getState().descriptionAliases.source).toBeUndefined();

        disposePeer();
        unsubscribeEcho();
        peerDoc.mirror.dispose();
        dispose();
        coordinator.dispose();
        await manager.disconnect();
        local.mirror.dispose();
    });
});
