import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    assignDescriptionAlias,
    changeAllDescriptionAliases,
    changeOneDescriptionAlias,
    createDescriptionAlias,
    insertManualDescriptionAliasedTransaction,
    removeAllDescriptionAliases,
    removeOneDescriptionAlias,
    renameDescriptionAlias
} from "@/lib/crdt/description-aliases";
import { migrateVaultSentinels, repairDescriptionAliases } from "@/lib/crdt/migration";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import { findTransactionInStore, insertTransaction } from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { getVaultUserOrigin, VaultUndoCoordinator } from "@/lib/crdt/undo";
import { asMinorUnits } from "@/lib/domain/currency";

const INTEGRATED_DATE = Temporal.PlainDate.from("2026-07-20");

function integratedLocation(transactionId: string) {
    return { accountId: "account", date: INTEGRATED_DATE, transactionId };
}

function seedIntegratedTransaction(state: VaultState, id: string, description: string): void {
    insertTransaction(state.transactions, {
        transaction: {
            id,
            date: INTEGRATED_DATE,
            description,
            descriptionAliasId: undefined,
            notes: "",
            amount: asMinorUnits(100),
            accountId: "account",
            tagIds: [],
            statusId: "status",
            importId: "integrated-import",
            allocations: {},
            creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
            importRowIndex: 0,
            deletedAt: undefined
        }
    });
}

function repairAndConverge(
    peerOne: ReturnType<typeof createVaultMirrorFromSnapshot>,
    peerTwo: ReturnType<typeof createVaultMirrorFromSnapshot>
): void {
    const peerOneBeforeRepair = peerOne.doc.version();
    peerOne.mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
        origin: "system:migration"
    });
    peerTwo.doc.import(peerOne.doc.export({ mode: "update", from: peerOneBeforeRepair }));

    const peerTwoBeforeRepair = peerTwo.doc.version();
    peerTwo.mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
        origin: "system:migration"
    });
    peerOne.doc.import(peerTwo.doc.export({ mode: "update", from: peerTwoBeforeRepair }));
    peerOne.mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
        origin: "system:migration"
    });
}

function expectIntegratedGraphIsLegal(state: VaultState): void {
    for (const alias of Object.values(state.descriptionAliases)) {
        if (typeof alias !== "object" || alias == null || alias.deletedAt) continue;
        if (alias.kind === "real") continue;
        const target = state.descriptionAliases[alias.targetAliasId ?? ""];
        expect(target).toMatchObject({ kind: "real", deletedAt: undefined });
        if (typeof target !== "object" || target == null) continue;
        expect(target.symlinkIds[alias.id]).toBe(true);
    }
    for (const transactionId of ["one", "two", "single", "manual"]) {
        const transaction = findTransactionInStore(
            state.transactions,
            integratedLocation(transactionId)
        );
        if (!transaction?.descriptionAliasId) continue;
        const alias = state.descriptionAliases[transaction.descriptionAliasId];
        expect(alias).toBeDefined();
        if (typeof alias !== "object" || alias == null) continue;
        expect(alias.deletedAt).toBeUndefined();
    }
}

function aliasGraph(state: VaultState): Record<string, object> {
    const entries: Array<[string, object]> = [];
    for (const [id, alias] of Object.entries(state.descriptionAliases)) {
        if (typeof alias !== "object" || alias == null) continue;
        entries.push([
            id,
            {
                id: alias.id,
                kind: alias.kind,
                name: alias.name,
                targetAliasId: alias.targetAliasId,
                deleted: alias.deletedAt != null,
                symlinkIds: Object.keys(alias.symlinkIds)
                    .filter((key) => key !== "$cid")
                    .sort(),
                transactionIds: Object.keys(alias.transactionIds)
                    .filter((key) => key !== "$cid")
                    .sort()
            }
        ]);
    }
    return Object.fromEntries(entries);
}

function applyConcurrentPlan(
    state: VaultState,
    operations: readonly number[],
    peer: "one" | "two"
): void {
    operations.forEach((operation, index) => {
        if (operation === 0) {
            changeAllDescriptionAliases(state, {
                sourceAliasId: "d",
                target: { kind: "existing", aliasId: "a" }
            });
        } else if (operation === 1) {
            removeAllDescriptionAliases(state, "a");
        } else if (operation === 2) {
            changeAllDescriptionAliases(state, {
                sourceAliasId: "a",
                target: { kind: "existing", aliasId: "b" }
            });
        } else if (operation === 3) {
            renameDescriptionAlias(state, {
                aliasId: "c",
                name: `${peer} rename ${index}`
            });
        } else {
            createDescriptionAlias(state, {
                aliasId: `${peer}-created-${index}`,
                name: `${peer} created ${index}`
            });
        }
    });
}

describe("description alias migration and CRDT behavior", () => {
    it("repairs partial maps, chains, cycles, stale references, and deleted targets idempotently", () => {
        const { doc, mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            for (const [aliasId, name] of [
                ["a", "Alpha"],
                ["b", "Beta"],
                ["chain", "Chain"],
                ["broken", "Recovered"],
                ["deleted", "Deleted"]
            ]) {
                createDescriptionAlias(state, { aliasId, name });
            }
            state.descriptionAliases.a.kind = "symlink";
            state.descriptionAliases.a.name = "";
            state.descriptionAliases.a.targetAliasId = "b";
            state.descriptionAliases.b.kind = "symlink";
            state.descriptionAliases.b.targetAliasId = "a";
            state.descriptionAliases.chain.kind = "symlink";
            state.descriptionAliases.chain.targetAliasId = "b";
            state.descriptionAliases.broken.kind = "symlink";
            state.descriptionAliases.broken.targetAliasId = "missing";
            state.descriptionAliases.deleted.deletedAt = Temporal.Now.instant();
            state.descriptionAliases.a.symlinkIds.stale = true;
            state.descriptionAliases.a.transactionIds.stale = true;
        });

        mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
            origin: "system:migration"
        });
        const firstGraph = aliasGraph(mirror.getState());
        const firstVersion = doc.version().encode();
        mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
            origin: "system:migration"
        });

        expect(aliasGraph(mirror.getState())).toEqual(firstGraph);
        expect(doc.version().encode()).toEqual(firstVersion);
        expect(firstGraph).toMatchObject({
            a: { kind: "real", name: "Beta", targetAliasId: undefined },
            b: { kind: "symlink", targetAliasId: "a" },
            chain: { kind: "symlink", targetAliasId: "a" },
            broken: { kind: "real", name: "Recovered", targetAliasId: undefined },
            deleted: { kind: "real", targetAliasId: undefined }
        });
        expect(firstGraph.a).toMatchObject({ symlinkIds: ["b", "chain"], transactionIds: [] });
    });

    it("converges after opposing peer change-all operations and preserves a recovery name", () => {
        const base = createVaultMirror();
        base.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "a", name: "Alpha" });
            createDescriptionAlias(state, { aliasId: "b", name: "Beta" });
        });
        const snapshot = base.doc.export({ mode: "snapshot" });
        const peerOne = createVaultMirrorFromSnapshot(snapshot);
        const peerTwo = createVaultMirrorFromSnapshot(snapshot);
        const peerOneBase = peerOne.doc.version();
        const peerTwoBase = peerTwo.doc.version();

        peerOne.mirror.setState(
            (state: VaultState) => {
                changeAllDescriptionAliases(state, {
                    sourceAliasId: "a",
                    target: { kind: "existing", aliasId: "b" }
                });
            },
            { origin: getVaultUserOrigin("alias") }
        );
        peerTwo.mirror.setState(
            (state: VaultState) => {
                changeAllDescriptionAliases(state, {
                    sourceAliasId: "b",
                    target: { kind: "existing", aliasId: "a" }
                });
            },
            { origin: getVaultUserOrigin("alias") }
        );

        const updateOne = peerOne.doc.export({ mode: "update", from: peerOneBase });
        const updateTwo = peerTwo.doc.export({ mode: "update", from: peerTwoBase });
        peerOne.doc.import(updateTwo);
        peerTwo.doc.import(updateOne);
        peerOne.mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
            origin: "system:migration"
        });
        peerTwo.mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
            origin: "system:migration"
        });

        const graphOne = aliasGraph(peerOne.mirror.getState());
        expect(aliasGraph(peerTwo.mirror.getState())).toEqual(graphOne);
        expect(graphOne.a).toMatchObject({ kind: "real", name: "Alpha" });
        expect(graphOne.b).toMatchObject({ kind: "symlink", targetAliasId: "a" });
    });

    it("commits change-all as one real Mirror/Loro undo step and excludes migration", () => {
        const { doc, mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "source", name: "Source" });
            createDescriptionAlias(state, { aliasId: "inbound", name: "Inbound" });
            createDescriptionAlias(state, { aliasId: "target", name: "Target" });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "inbound",
                target: { kind: "existing", aliasId: "source" }
            });
        });
        const coordinator = new VaultUndoCoordinator(doc);
        coordinator.clear();

        coordinator.runUserAction("alias", (origin) => {
            mirror.setState(
                (state: VaultState) => {
                    changeAllDescriptionAliases(state, {
                        sourceAliasId: "source",
                        target: { kind: "existing", aliasId: "target" }
                    });
                },
                { origin }
            );
        });
        expect(mirror.getState().descriptionAliases.inbound.targetAliasId).toBe("target");
        expect(coordinator.undo()).toBe(true);
        expect(mirror.getState().descriptionAliases.source.kind).toBe("real");
        expect(mirror.getState().descriptionAliases.inbound.targetAliasId).toBe("source");
        expect(coordinator.undo()).toBe(false);

        mirror.setState(
            (state: VaultState) => {
                state.descriptionAliases.inbound.targetAliasId = "missing";
            },
            { origin: "system:maintenance" }
        );
        coordinator.clear();
        migrateVaultSentinels(mirror);
        expect(coordinator.getSnapshot().canUndo).toBe(false);
        coordinator.dispose();
    });

    it("converges fixed-seed concurrent plans after exchanging deterministic repair updates and reopening", () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 20 }),
                    fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 20 })
                ),
                ([planOne, planTwo]) => {
                    const base = createVaultMirror();
                    base.mirror.setState((state: VaultState) => {
                        for (const aliasId of ["a", "b", "c", "d"]) {
                            createDescriptionAlias(state, { aliasId, name: aliasId.toUpperCase() });
                        }
                    });
                    const snapshot = base.doc.export({ mode: "snapshot" });
                    const peerOne = createVaultMirrorFromSnapshot(snapshot);
                    const peerTwo = createVaultMirrorFromSnapshot(snapshot);
                    const peerOneBase = peerOne.doc.version();
                    const peerTwoBase = peerTwo.doc.version();

                    peerOne.mirror.setState((state: VaultState) => {
                        applyConcurrentPlan(state, planOne, "one");
                    });
                    peerTwo.mirror.setState((state: VaultState) => {
                        applyConcurrentPlan(state, planTwo, "two");
                    });
                    const updateOne = peerOne.doc.export({ mode: "update", from: peerOneBase });
                    const updateTwo = peerTwo.doc.export({ mode: "update", from: peerTwoBase });
                    peerOne.doc.import(updateTwo);
                    peerTwo.doc.import(updateOne);

                    const mergedOne = peerOne.doc.version();
                    peerOne.mirror.setState(
                        (state: VaultState) => repairDescriptionAliases(state),
                        { origin: "system:migration" }
                    );
                    peerTwo.doc.import(peerOne.doc.export({ mode: "update", from: mergedOne }));

                    const afterFirstRepair = peerTwo.doc.version();
                    peerTwo.mirror.setState(
                        (state: VaultState) => repairDescriptionAliases(state),
                        { origin: "system:migration" }
                    );
                    peerOne.doc.import(
                        peerTwo.doc.export({ mode: "update", from: afterFirstRepair })
                    );
                    peerOne.mirror.setState(
                        (state: VaultState) => repairDescriptionAliases(state),
                        { origin: "system:migration" }
                    );

                    const reopenedOne = createVaultMirrorFromSnapshot(
                        peerOne.doc.export({ mode: "snapshot" })
                    );
                    const reopenedTwo = createVaultMirrorFromSnapshot(
                        peerTwo.doc.export({ mode: "snapshot" })
                    );
                    expect(aliasGraph(reopenedOne.mirror.getState())).toEqual(
                        aliasGraph(reopenedTwo.mirror.getState())
                    );
                }
            ),
            { seed: 17_032_026, numRuns: 30 }
        );
    });

    it("converges management and cell conflict matrices while undo excludes remote work", () => {
        const scenarios = [
            {
                name: "rename against exact change-one",
                management: (state: VaultState) =>
                    renameDescriptionAlias(state, { aliasId: "shared", name: "Managed rename" }),
                cell: (state: VaultState) =>
                    changeOneDescriptionAlias(state, {
                        location: integratedLocation("one"),
                        expectedAliasId: "shared",
                        target: { kind: "existing", aliasId: "target" }
                    }),
                redoAfterRepair: true
            },
            {
                name: "rename against novel change-one",
                management: (state: VaultState) =>
                    renameDescriptionAlias(state, { aliasId: "shared", name: "Managed rename" }),
                cell: (state: VaultState) =>
                    changeOneDescriptionAlias(state, {
                        location: integratedLocation("one"),
                        expectedAliasId: "shared",
                        target: { kind: "new", aliasId: "novel", name: "Novel cell" }
                    }),
                redoAfterRepair: true
            },
            {
                name: "delete against remove-one",
                management: (state: VaultState) => removeAllDescriptionAliases(state, "shared"),
                cell: (state: VaultState) =>
                    removeOneDescriptionAlias(state, {
                        location: integratedLocation("one"),
                        expectedAliasId: "shared"
                    }),
                redoAfterRepair: true
            },
            {
                name: "delete against shared change-all",
                management: (state: VaultState) => removeAllDescriptionAliases(state, "shared"),
                cell: (state: VaultState) =>
                    changeAllDescriptionAliases(state, {
                        sourceAliasId: "shared",
                        target: { kind: "existing", aliasId: "target" }
                    }),
                redoAfterRepair: false
            }
        ];

        for (const scenario of scenarios) {
            const base = createVaultMirror();
            base.mirror.setState((state: VaultState) => {
                seedIntegratedTransaction(state, "one", "Immutable imported one");
                seedIntegratedTransaction(state, "two", "Immutable imported two");
                seedIntegratedTransaction(state, "single", "Immutable imported single");
                createDescriptionAlias(state, { aliasId: "shared", name: "Shared" });
                createDescriptionAlias(state, { aliasId: "target", name: "Target" });
                createDescriptionAlias(state, { aliasId: "single-alias", name: "Single" });
                assignDescriptionAlias(state, {
                    location: integratedLocation("one"),
                    aliasId: "shared"
                });
                assignDescriptionAlias(state, {
                    location: integratedLocation("two"),
                    aliasId: "shared"
                });
                assignDescriptionAlias(state, {
                    location: integratedLocation("single"),
                    aliasId: "single-alias"
                });
                insertManualDescriptionAliasedTransaction(state, {
                    transaction: {
                        id: "manual",
                        date: INTEGRATED_DATE,
                        notes: "",
                        amount: asMinorUnits(100),
                        accountId: "account",
                        tagIds: [],
                        statusId: "status",
                        allocations: {},
                        creationInstant: Temporal.Instant.fromEpochMilliseconds(2),
                        importRowIndex: 1,
                        deletedAt: undefined
                    },
                    newAliasId: "manual-alias",
                    name: "Manual only"
                });
                for (let index = 0; index < 250; index += 1) {
                    createDescriptionAlias(state, {
                        aliasId: `large-${index}`,
                        name: `Large ${index}`
                    });
                }
            });

            const snapshot = base.doc.export({ mode: "snapshot" });
            const peerOne = createVaultMirrorFromSnapshot(snapshot);
            const peerTwo = createVaultMirrorFromSnapshot(snapshot);
            const peerOneBase = peerOne.doc.version();
            const peerTwoBase = peerTwo.doc.version();
            const peerOneUpdates: Uint8Array[] = [];
            const peerTwoUpdates: Uint8Array[] = [];
            const stopPeerOne = peerOne.doc.subscribeLocalUpdates((update) =>
                peerOneUpdates.push(update)
            );
            const stopPeerTwo = peerTwo.doc.subscribeLocalUpdates((update) =>
                peerTwoUpdates.push(update)
            );
            const peerTwoUndo = new VaultUndoCoordinator(peerTwo.doc);
            peerTwoUndo.clear();

            peerOne.mirror.setState(
                (state: VaultState) => {
                    expect(scenario.management(state).ok).toBe(true);
                },
                { origin: getVaultUserOrigin("alias") }
            );
            peerTwoUndo.runUserAction("alias", (origin) => {
                peerTwo.mirror.setState(
                    (state: VaultState) => {
                        expect(scenario.cell(state).ok).toBe(true);
                    },
                    { origin }
                );
            });
            expect(peerOneUpdates).toHaveLength(1);
            expect(peerTwoUpdates).toHaveLength(1);

            peerOne.doc.import(peerTwo.doc.export({ mode: "update", from: peerTwoBase }));
            peerTwo.doc.import(peerOne.doc.export({ mode: "update", from: peerOneBase }));
            repairAndConverge(peerOne, peerTwo);

            expect(aliasGraph(peerTwo.mirror.getState()), scenario.name).toEqual(
                aliasGraph(peerOne.mirror.getState())
            );
            expectIntegratedGraphIsLegal(peerOne.mirror.getState());
            expectIntegratedGraphIsLegal(peerTwo.mirror.getState());
            for (const peer of [peerOne, peerTwo]) {
                expect(
                    findTransactionInStore(
                        peer.mirror.getState().transactions,
                        integratedLocation("one")
                    )?.description
                ).toBe("Immutable imported one");
                const manualTransaction = findTransactionInStore(
                    peer.mirror.getState().transactions,
                    integratedLocation("manual")
                );
                expect(manualTransaction?.description).toBe("");
                expect(manualTransaction?.importId).toBeUndefined();
            }

            const expectRemoteManagementIsRetained = () => {
                const shared = peerTwo.mirror.getState().descriptionAliases.shared;
                expect(shared).toBeTypeOf("object");
                if (typeof shared !== "object" || shared == null) return;
                if (scenario.name.startsWith("rename")) {
                    expect(shared.name).toBe("Managed rename");
                    expect(shared.deletedAt).toBeUndefined();
                } else {
                    expect(shared.deletedAt).toBeDefined();
                }
            };
            const repairPeerTwo = () => {
                peerTwo.mirror.setState((state: VaultState) => repairDescriptionAliases(state), {
                    origin: "system:migration"
                });
            };
            const peerOneBeforeHistory = peerOne.doc.version();
            const peerTwoBeforeHistory = peerTwo.doc.version();

            expectRemoteManagementIsRetained();
            expect(peerTwoUndo.undo()).toBe(true);
            repairPeerTwo();
            expectRemoteManagementIsRetained();
            expect(peerTwoUndo.redo(), scenario.name).toBe(scenario.redoAfterRepair);
            if (scenario.redoAfterRepair) repairPeerTwo();
            expectRemoteManagementIsRetained();

            peerOne.doc.import(peerTwo.doc.export({ mode: "update", from: peerTwoBeforeHistory }));
            peerTwo.doc.import(peerOne.doc.export({ mode: "update", from: peerOneBeforeHistory }));
            repairAndConverge(peerOne, peerTwo);
            expect(aliasGraph(peerTwo.mirror.getState()), `${scenario.name} after history`).toEqual(
                aliasGraph(peerOne.mirror.getState())
            );

            const reopenedOne = createVaultMirrorFromSnapshot(
                peerOne.doc.export({ mode: "snapshot" })
            );
            const reopenedTwo = createVaultMirrorFromSnapshot(
                peerTwo.doc.export({ mode: "snapshot" })
            );
            expectIntegratedGraphIsLegal(reopenedOne.mirror.getState());
            expectIntegratedGraphIsLegal(reopenedTwo.mirror.getState());

            stopPeerOne();
            stopPeerTwo();
            peerTwoUndo.dispose();
        }
    });
});
