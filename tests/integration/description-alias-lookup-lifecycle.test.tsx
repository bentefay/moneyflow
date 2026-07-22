import { act, render, waitFor } from "@testing-library/react";
import { createElement, Fragment, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

const lifecycleCounts = vi.hoisted(() => ({
    conversions: 0,
    dependentOptionBuilds: 0,
    lookupBuilds: 0
}));

vi.mock("@/lib/domain/description-aliases", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/domain/description-aliases")>();
    return {
        ...actual,
        createDescriptionAliasLookup: (
            ...args: Parameters<typeof actual.createDescriptionAliasLookup>
        ): ReturnType<typeof actual.createDescriptionAliasLookup> => {
            lifecycleCounts.lookupBuilds += 1;
            return actual.createDescriptionAliasLookup(...args);
        },
        toDescriptionAliasCollection: (
            ...args: Parameters<typeof actual.toDescriptionAliasCollection>
        ): ReturnType<typeof actual.toDescriptionAliasCollection> => {
            lifecycleCounts.conversions += 1;
            return actual.toDescriptionAliasCollection(...args);
        }
    };
});

// This suite isolates alias revision/consumer lifecycle. Real provider-owned GC lifecycle is
// covered by vault-maintenance.test.tsx and would intentionally collect this suite's symlink graph.
vi.mock("@/lib/crdt/maintenance", () => ({
    startVaultMaintenanceScheduler: () => () => undefined
}));

import { useDescriptionAliasLookup } from "@/components/features/description-aliases/useDescriptionAliasLookup";
import {
    useDescriptionAliases,
    useDescriptionAliasActions,
    useTransaction,
    useTransactionActions,
    VaultProvider
} from "@/lib/crdt/context";
import { getDefaultVaultState } from "@/lib/crdt/defaults";
import {
    assignDescriptionAlias,
    changeAllDescriptionAliases,
    createDescriptionAlias
} from "@/lib/crdt/description-aliases";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import { insertTransaction, type TransactionLocation } from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { VaultUndoCoordinator, VaultUndoProvider } from "@/lib/crdt/undo";
import { asMinorUnits } from "@/lib/domain/currency";
import type {
    DescriptionAliasCollection,
    DescriptionAliasLookup
} from "@/lib/domain/description-aliases";

const DATE = Temporal.PlainDate.from("2026-07-21");
const REAL_ALIAS_COUNT = 500;

function location(transactionId: string): TransactionLocation {
    return { accountId: "account", date: DATE, transactionId };
}

function seedLargeLegalGraph(state: VaultState): void {
    for (let index = 0; index < REAL_ALIAS_COUNT; index += 1) {
        const suffix = index.toString().padStart(5, "0");
        const realId = `real-${suffix}`;
        const symlinkId = `link-${suffix}`;
        createDescriptionAlias(state, {
            aliasId: realId,
            name: index === 42 ? " Cafe\u0301 " : `Alias ${index}`
        });
        createDescriptionAlias(state, { aliasId: symlinkId, name: `Recovery ${index}` });
        changeAllDescriptionAliases(state, {
            sourceAliasId: symlinkId,
            target: { kind: "existing", aliasId: realId }
        });
    }

    insertTransaction(state.transactions, {
        transaction: {
            id: "editable",
            date: DATE,
            description: "Imported raw",
            descriptionAliasId: undefined,
            notes: "",
            amount: asMinorUnits(100),
            accountId: "account",
            tagIds: [],
            statusId: "status",
            importId: "initial-import",
            allocations: {},
            creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
            importRowIndex: 0,
            deletedAt: undefined
        }
    });
    for (const [transactionId, descriptionAliasId] of [
        ["real-transaction-42", "real-00042"],
        ["linked-transaction-42", "link-00042"]
    ]) {
        insertTransaction(state.transactions, {
            transaction: {
                id: transactionId,
                date: DATE,
                description: `Raw ${transactionId}`,
                descriptionAliasId,
                notes: "",
                amount: asMinorUnits(100),
                accountId: "account",
                tagIds: [],
                statusId: "status",
                importId: "initial-import",
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                importRowIndex: 0,
                deletedAt: undefined
            }
        });
        assignDescriptionAlias(state, {
            location: location(transactionId),
            aliasId: "real-00042"
        });
    }
}

function resetLifecycleCounts(): void {
    lifecycleCounts.conversions = 0;
    lifecycleCounts.dependentOptionBuilds = 0;
    lifecycleCounts.lookupBuilds = 0;
}

function expectNoAliasLifecycleWork(): void {
    expect(lifecycleCounts).toEqual({
        conversions: 0,
        dependentOptionBuilds: 0,
        lookupBuilds: 0
    });
}

function expectOneAliasLifecycleBuild(): void {
    expect(lifecycleCounts).toEqual({
        conversions: 1,
        dependentOptionBuilds: 1,
        lookupBuilds: 1
    });
}

describe("production description alias lookup lifecycle", () => {
    it("publishes the first alias inserted into an empty provider", async () => {
        const empty = createVaultMirror();
        empty.mirror.dispose();
        const coordinator = new VaultUndoCoordinator(empty.doc);
        let aliasActions: ReturnType<typeof useDescriptionAliasActions> | undefined;
        let aliases: DescriptionAliasCollection | undefined;
        let lookup: DescriptionAliasLookup | undefined;

        function CaptureEmptyLifecycle() {
            const currentAliases = useDescriptionAliases();
            const currentLookup = useDescriptionAliasLookup(currentAliases);
            const currentActions = useDescriptionAliasActions();
            useEffect(() => {
                aliasActions = currentActions;
                aliases = currentAliases;
                lookup = currentLookup;
            }, [currentActions, currentAliases, currentLookup]);
            return null;
        }

        const view = render(
            createElement(
                VaultProvider,
                { doc: empty.doc, initialState: getDefaultVaultState(), debug: true },
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator,
                    children: createElement(CaptureEmptyLifecycle)
                })
            )
        );
        await waitFor(() => expect(aliases).toEqual({}));
        const initialAliases = aliases;
        const initialLookup = lookup;
        resetLifecycleCounts();

        act(() => {
            aliasActions?.createDescriptionAlias({ aliasId: "first", name: "First alias" });
        });
        await waitFor(() => expect(lookup?.findExactAliasId("First alias")).toBe("first"));
        expect(lifecycleCounts).toEqual({
            conversions: 1,
            dependentOptionBuilds: 0,
            lookupBuilds: 1
        });
        expect(aliases).not.toBe(initialAliases);
        expect(lookup).not.toBe(initialLookup);

        view.unmount();
        coordinator.dispose();
    });

    it("publishes local and remote aliases committed while every alias consumer is unmounted", async () => {
        const seeded = createVaultMirror();
        seeded.mirror.setState((state: VaultState) => seedLargeLegalGraph(state));
        seeded.mirror.dispose();
        const coordinator = new VaultUndoCoordinator(seeded.doc);
        coordinator.clear();
        let aliasActions: ReturnType<typeof useDescriptionAliasActions> | undefined;
        let currentAliases: DescriptionAliasCollection | undefined;
        let transactionActions: ReturnType<typeof useTransactionActions> | undefined;

        function PersistentActions() {
            aliasActions = useDescriptionAliasActions();
            transactionActions = useTransactionActions();
            return null;
        }

        function AliasConsumer() {
            const aliases = useDescriptionAliases();
            currentAliases = aliases;
            const lookup = useDescriptionAliasLookup(aliases);
            const options = useMemo(() => {
                lifecycleCounts.dependentOptionBuilds += 1;
                return lookup.activeRealAliases.map((alias) => alias.name);
            }, [lookup]);
            return createElement(
                "output",
                { "data-testid": "gap-alias-state" },
                JSON.stringify({
                    exactLocal: lookup.findExactAliasId("Local During Gap"),
                    exactRemote: lookup.findExactAliasId("Remote During Gap"),
                    options
                })
            );
        }

        function Harness({ showConsumer }: { readonly showConsumer: boolean }) {
            return createElement(
                VaultProvider,
                { doc: seeded.doc },
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator,
                    children: createElement(
                        Fragment,
                        null,
                        createElement(PersistentActions),
                        showConsumer ? createElement(AliasConsumer) : null
                    )
                })
            );
        }

        const view = render(createElement(Harness, { showConsumer: true }));
        await waitFor(() =>
            expect(view.getByTestId("gap-alias-state").textContent).toContain("Alias 499")
        );
        const initialAliases = currentAliases;

        view.rerender(createElement(Harness, { showConsumer: false }));
        resetLifecycleCounts();
        for (const notes of ["gap one", "gap two", "gap three"]) {
            act(() => {
                transactionActions?.updateTransaction({
                    location: location("editable"),
                    updates: { notes }
                });
            });
        }
        const remoteTransactions = createVaultMirrorFromSnapshot(
            seeded.doc.export({ mode: "snapshot" })
        );
        const remoteTransactionBase = seeded.doc.version();
        remoteTransactions.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: {
                    id: "gap-remote-transaction",
                    date: DATE,
                    description: "Gap remote raw",
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(400),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    importId: "gap-remote-import",
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(4),
                    importRowIndex: 3,
                    deletedAt: undefined
                }
            });
        });
        act(() =>
            seeded.doc.import(
                remoteTransactions.doc.export({
                    mode: "update",
                    from: remoteTransactionBase
                })
            )
        );
        expectNoAliasLifecycleWork();

        view.rerender(createElement(Harness, { showConsumer: true }));
        await waitFor(() =>
            expect(view.getByTestId("gap-alias-state").textContent).toContain("Alias 499")
        );
        expect(currentAliases).toBe(initialAliases);
        expect(lifecycleCounts).toEqual({
            conversions: 0,
            dependentOptionBuilds: 1,
            lookupBuilds: 1
        });
        remoteTransactions.mirror.dispose();

        view.rerender(createElement(Harness, { showConsumer: false }));
        expect(view.queryByTestId("gap-alias-state")).toBeNull();
        resetLifecycleCounts();
        act(() => {
            aliasActions?.renameDescriptionAlias({
                aliasId: "real-00042",
                name: "Local During Gap"
            });
        });
        expectNoAliasLifecycleWork();

        view.rerender(createElement(Harness, { showConsumer: true }));
        await waitFor(() =>
            expect(view.getByTestId("gap-alias-state").textContent).toContain(
                '"exactLocal":"real-00042"'
            )
        );
        expectOneAliasLifecycleBuild();

        view.rerender(createElement(Harness, { showConsumer: false }));
        resetLifecycleCounts();
        const remote = createVaultMirrorFromSnapshot(seeded.doc.export({ mode: "snapshot" }));
        const remoteBase = seeded.doc.version();
        remote.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, {
                aliasId: "remote-during-gap",
                name: "Remote During Gap"
            });
        });
        const remoteUpdate = remote.doc.export({ mode: "update", from: remoteBase });
        act(() => seeded.doc.import(remoteUpdate));
        expectNoAliasLifecycleWork();

        view.rerender(createElement(Harness, { showConsumer: true }));
        await waitFor(() =>
            expect(view.getByTestId("gap-alias-state").textContent).toContain(
                '"exactRemote":"remote-during-gap"'
            )
        );
        expectOneAliasLifecycleBuild();

        remote.mirror.dispose();
        view.unmount();
        coordinator.dispose();
    });

    it("observes one alias mutation between initial render and subscription setup", async () => {
        const seeded = createVaultMirror();
        seeded.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "setup-race", name: "Before Setup Race" });
        });
        seeded.mirror.dispose();
        const coordinator = new VaultUndoCoordinator(seeded.doc);
        coordinator.clear();

        function MutateBeforeConsumerSubscription() {
            const actions = useDescriptionAliasActions();
            const mutated = useRef(false);
            useLayoutEffect(() => {
                if (mutated.current) return;
                mutated.current = true;
                actions.renameDescriptionAlias({
                    aliasId: "setup-race",
                    name: "During Setup Race"
                });
            }, [actions]);
            return null;
        }

        function SetupRaceConsumer() {
            const aliases = useDescriptionAliases();
            const lookup = useDescriptionAliasLookup(aliases);
            const options = useMemo(() => {
                lifecycleCounts.dependentOptionBuilds += 1;
                return lookup.activeRealAliases.map((alias) => alias.name);
            }, [lookup]);
            return createElement(
                "output",
                { "data-testid": "setup-race-state" },
                JSON.stringify({
                    exact: lookup.findExactAliasId("During Setup Race"),
                    options
                })
            );
        }

        resetLifecycleCounts();
        const view = render(
            createElement(
                VaultProvider,
                { doc: seeded.doc },
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator,
                    children: createElement(
                        Fragment,
                        null,
                        createElement(MutateBeforeConsumerSubscription),
                        createElement(SetupRaceConsumer)
                    )
                })
            )
        );

        await waitFor(() =>
            expect(view.getByTestId("setup-race-state").textContent).toContain(
                '"exact":"setup-race"'
            )
        );
        expect(lifecycleCounts).toEqual({
            conversions: 2,
            dependentOptionBuilds: 2,
            lookupBuilds: 2
        });

        view.unmount();
        coordinator.dispose();
    });

    it("retains one observer across consumer churn and releases it on provider or document cleanup", async () => {
        const first = createVaultMirror();
        const second = createVaultMirror();
        first.mirror.dispose();
        second.mirror.dispose();
        const firstCoordinator = new VaultUndoCoordinator(first.doc);
        const secondCoordinator = new VaultUndoCoordinator(second.doc);
        const observe = (doc: typeof first.doc) => {
            const originalSubscribe = doc.subscribe.bind(doc);
            const callbackCounts: number[] = [];
            const counts = { active: 0, released: 0, subscribed: 0 };
            const spy = vi.spyOn(doc, "subscribe").mockImplementation((listener) => {
                const subscriptionIndex = callbackCounts.length;
                callbackCounts.push(0);
                counts.active += 1;
                counts.subscribed += 1;
                const unsubscribe = originalSubscribe((event) => {
                    callbackCounts[subscriptionIndex] += 1;
                    listener(event);
                });
                let released = false;
                return () => {
                    if (released) return;
                    released = true;
                    counts.active -= 1;
                    counts.released += 1;
                    unsubscribe();
                };
            });
            return { callbackCounts, counts, spy };
        };
        const firstObservation = observe(first.doc);
        const secondObservation = observe(second.doc);

        function Consumer() {
            useDescriptionAliases();
            return null;
        }

        function Harness({
            coordinator,
            doc,
            showConsumer
        }: {
            readonly coordinator: VaultUndoCoordinator;
            readonly doc: typeof first.doc;
            readonly showConsumer: boolean;
        }) {
            return createElement(
                VaultProvider,
                { doc },
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator,
                    children: showConsumer ? createElement(Consumer) : null
                })
            );
        }

        const view = render(
            createElement(Harness, {
                coordinator: firstCoordinator,
                doc: first.doc,
                showConsumer: true
            })
        );
        expect(firstObservation.counts).toEqual({ active: 2, released: 0, subscribed: 2 });

        for (const showConsumer of [false, true, false, true]) {
            view.rerender(
                createElement(Harness, {
                    coordinator: firstCoordinator,
                    doc: first.doc,
                    showConsumer
                })
            );
            expect(firstObservation.counts).toEqual({ active: 2, released: 0, subscribed: 2 });
        }

        view.rerender(
            createElement(Harness, {
                coordinator: secondCoordinator,
                doc: second.doc,
                showConsumer: true
            })
        );
        expect(firstObservation.counts).toEqual({ active: 1, released: 1, subscribed: 2 });
        expect(secondObservation.counts).toEqual({ active: 2, released: 0, subscribed: 2 });

        view.unmount();
        expect(firstObservation.counts).toEqual({ active: 1, released: 1, subscribed: 2 });
        expect(secondObservation.counts).toEqual({ active: 1, released: 1, subscribed: 2 });
        const taskObserverCallbacksBeforeLateUpdate = secondObservation.callbackCounts[1];
        resetLifecycleCounts();
        const afterDisposal = createVaultMirrorFromSnapshot(
            second.doc.export({ mode: "snapshot" })
        );
        const afterDisposalBase = second.doc.version();
        afterDisposal.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "late", name: "Late" });
        });
        second.doc.import(afterDisposal.doc.export({ mode: "update", from: afterDisposalBase }));
        expectNoAliasLifecycleWork();
        expect(secondObservation.callbackCounts[1]).toBe(taskObserverCallbacksBeforeLateUpdate);

        afterDisposal.mirror.dispose();
        firstObservation.spy.mockRestore();
        secondObservation.spy.mockRestore();
        firstCoordinator.dispose();
        secondCoordinator.dispose();
    });

    it("preserves legal collection and lookup identity across non-alias Mirror notifications", async () => {
        const seeded = createVaultMirror();
        seeded.mirror.setState((state: VaultState) => seedLargeLegalGraph(state));
        seeded.mirror.dispose();

        const coordinator = new VaultUndoCoordinator(seeded.doc);
        coordinator.clear();
        let captured:
            | {
                  aliases: DescriptionAliasCollection;
                  aliasActions: ReturnType<typeof useDescriptionAliasActions>;
                  lookup: DescriptionAliasLookup;
                  options: readonly { readonly id: string; readonly name: string }[];
                  remoteTransactionDescription: string | undefined;
                  transactionActions: ReturnType<typeof useTransactionActions>;
                  transactionNotes: string | undefined;
              }
            | undefined;

        function CaptureLifecycle() {
            const aliases = useDescriptionAliases();
            const lookup = useDescriptionAliasLookup(aliases);
            const aliasActions = useDescriptionAliasActions();
            const remoteTransaction = useTransaction("remote-imported");
            const transaction = useTransaction("editable");
            const transactionActions = useTransactionActions();
            const options = useMemo(() => {
                lifecycleCounts.dependentOptionBuilds += 1;
                return lookup.activeRealAliases.map((alias) => ({
                    id: alias.id,
                    name: alias.name
                }));
            }, [lookup]);
            useEffect(() => {
                captured = {
                    aliases,
                    aliasActions,
                    lookup,
                    options,
                    remoteTransactionDescription: remoteTransaction?.description,
                    transactionActions,
                    transactionNotes: transaction?.notes
                };
            }, [
                aliases,
                aliasActions,
                lookup,
                options,
                remoteTransaction,
                transaction,
                transactionActions
            ]);
            return null;
        }

        const view = render(
            createElement(
                VaultProvider,
                { doc: seeded.doc },
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator,
                    children: createElement(CaptureLifecycle)
                })
            )
        );
        await waitFor(() => expect(captured?.options).toHaveLength(REAL_ALIAS_COUNT));
        if (!captured) throw new Error("Alias lifecycle was not captured");

        const initialAliases = captured.aliases;
        const initialLookup = captured.lookup;
        expect(initialLookup.statistics).toEqual({
            sourceEntryCount: REAL_ALIAS_COUNT * 2,
            activeAliasCount: REAL_ALIAS_COUNT * 2,
            activeRealAliasCount: REAL_ALIAS_COUNT,
            backlinkVisitCount: REAL_ALIAS_COUNT
        });
        expect(initialLookup.resolve("link-00042")?.id).toBe("real-00042");
        expect(initialLookup.findExactAliasId("Café")).toBe("real-00042");
        expect(initialLookup.getTotalTransactionCount("link-00042")).toBe(2);
        resetLifecycleCounts();

        for (const notes of ["first edit", "second edit", "third edit"]) {
            act(() => {
                captured?.transactionActions.updateTransaction({
                    location: location("editable"),
                    updates: { notes }
                });
            });
        }
        act(() => {
            captured?.transactionActions.insertTransaction({
                transaction: {
                    id: "imported-later",
                    date: DATE,
                    description: "Later import raw",
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(200),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    importId: "later-import",
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(2),
                    importRowIndex: 1,
                    deletedAt: undefined
                }
            });
        });
        expectNoAliasLifecycleWork();
        expect(captured.transactionNotes).toBe("third edit");
        expect(captured.aliases).toBe(initialAliases);
        expect(captured.lookup).toBe(initialLookup);

        const remoteTransactions = createVaultMirrorFromSnapshot(
            seeded.doc.export({ mode: "snapshot" })
        );
        expect(remoteTransactions.doc.peerIdStr).not.toBe(seeded.doc.peerIdStr);
        const postRemoteSetupAliases = captured.aliases;
        const postRemoteSetupLookup = captured.lookup;
        expect(postRemoteSetupLookup.statistics.activeAliasCount).toBe(REAL_ALIAS_COUNT * 2);

        const remoteTransactionBase = seeded.doc.version();
        const remoteTransactionUpdates: Uint8Array[] = [];
        const stopRemoteTransactions = remoteTransactions.doc.subscribeLocalUpdates((update) =>
            remoteTransactionUpdates.push(update)
        );
        remoteTransactions.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: {
                    id: "remote-imported",
                    date: DATE,
                    description: "Remote import-style raw",
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(300),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    importId: "remote-import",
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(3),
                    importRowIndex: 2,
                    deletedAt: undefined
                }
            });
        });
        expect(remoteTransactionUpdates).toHaveLength(1);
        const remoteTransactionUpdate = remoteTransactions.doc.export({
            mode: "update",
            from: remoteTransactionBase
        });
        const remoteTransactionEventPaths: Array<readonly (number | string)[]> = [];
        const stopRemoteTransactionEvents = seeded.doc.subscribe((event) => {
            for (const item of event.events) remoteTransactionEventPaths.push(item.path);
        });
        act(() => seeded.doc.import(remoteTransactionUpdate));
        stopRemoteTransactionEvents();
        await waitFor(() =>
            expect(captured?.remoteTransactionDescription).toBe("Remote import-style raw")
        );
        expect(remoteTransactionEventPaths.length).toBeGreaterThan(0);
        expect(remoteTransactionEventPaths.every((path) => path[0] === "transactions")).toBe(true);
        expectNoAliasLifecycleWork();
        expect(captured.aliases).toBe(postRemoteSetupAliases);
        expect(captured.lookup).toBe(postRemoteSetupLookup);
        stopRemoteTransactions();

        act(() => {
            captured?.aliasActions.renameDescriptionAlias({
                aliasId: "real-00042",
                name: " Local Cafe\u0301 "
            });
        });
        expectOneAliasLifecycleBuild();
        expect(captured.aliases).not.toBe(initialAliases);
        expect(captured.lookup).not.toBe(initialLookup);
        expect(captured.lookup.resolve("link-00042")?.name).toBe("Local Café");
        expect(captured.lookup.findExactAliasId("Local Café")).toBe("real-00042");
        expect(captured.lookup.getTotalTransactionCount("real-00042")).toBe(2);

        resetLifecycleCounts();
        act(() => expect(coordinator.undo()).toBe(true));
        expectOneAliasLifecycleBuild();
        expect(captured.lookup.findExactAliasId("Café")).toBe("real-00042");

        resetLifecycleCounts();
        act(() => expect(coordinator.redo()).toBe(true));
        expectOneAliasLifecycleBuild();
        expect(captured.lookup.findExactAliasId("Local Café")).toBe("real-00042");

        resetLifecycleCounts();
        const remoteAliasBase = seeded.doc.version();
        const remoteAliasUpdates: Uint8Array[] = [];
        const stopRemoteAliases = remoteTransactions.doc.subscribeLocalUpdates((update) =>
            remoteAliasUpdates.push(update)
        );
        remoteTransactions.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, {
                aliasId: "remote-added",
                name: " Remote Added "
            });
        });
        expect(remoteAliasUpdates).toHaveLength(1);
        const remoteAliasUpdate = remoteTransactions.doc.export({
            mode: "update",
            from: remoteAliasBase
        });
        act(() => seeded.doc.import(remoteAliasUpdate));
        await waitFor(() => expect(captured?.options).toHaveLength(REAL_ALIAS_COUNT + 1));
        expectOneAliasLifecycleBuild();
        expect(captured.options).toHaveLength(REAL_ALIAS_COUNT + 1);
        expect(captured.lookup.resolve("remote-added")?.name).toBe("Remote Added");
        expect(captured.lookup.findExactAliasId("Remote Added")).toBe("remote-added");
        expect(captured.lookup.getTotalTransactionCount("remote-added")).toBe(0);

        stopRemoteAliases();
        remoteTransactions.mirror.dispose();
        view.unmount();
        coordinator.dispose();
    });
});
