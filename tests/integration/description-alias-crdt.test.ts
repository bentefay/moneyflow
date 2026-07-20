import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    changeAllDescriptionAliases,
    createDescriptionAlias
} from "@/lib/crdt/description-aliases";
import { migrateVaultSentinels, repairDescriptionAliases } from "@/lib/crdt/migration";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import type { VaultState } from "@/lib/crdt/schema";
import { getVaultUserOrigin, VaultUndoCoordinator } from "@/lib/crdt/undo";

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
});
