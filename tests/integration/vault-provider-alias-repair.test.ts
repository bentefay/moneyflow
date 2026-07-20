import { LoroDoc, LoroMap } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";

import { hydrateAndRepairVaultDocument } from "@/components/providers/vault-provider";
import { createDescriptionAlias } from "@/lib/crdt/description-aliases";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import type { VaultState } from "@/lib/crdt/schema";
import { VaultUndoCoordinator } from "@/lib/crdt/undo";

describe("production vault hydration alias repair", () => {
    it("repairs and flushes before first read, exchanges the repair, and reopens idempotently", async () => {
        const source = createVaultMirror();
        source.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "root", name: "Root" });
            createDescriptionAlias(state, { aliasId: "chain", name: "Chain" });
            createDescriptionAlias(state, { aliasId: "broken", name: "Broken" });
            state.descriptionAliases.chain.kind = "symlink";
            state.descriptionAliases.chain.targetAliasId = "broken";
            state.descriptionAliases.broken.kind = "symlink";
            state.descriptionAliases.broken.targetAliasId = "root";
            state.descriptionAliases.root.symlinkIds.stale = true;
        });
        const malformedSnapshot = source.doc.export({ mode: "snapshot" });
        const hydrated = new LoroDoc();
        let hydratedBase = hydrated.version();
        let repairUpdate: Uint8Array<ArrayBufferLike> = new Uint8Array();
        const order: string[] = [];
        const manager = {
            initialize: vi.fn(async () => {
                order.push("initialize");
                hydrated.import(malformedSnapshot);
                hydratedBase = hydrated.version();
            }),
            forceSync: vi.fn(async () => {
                order.push("forceSync");
                repairUpdate = hydrated.export({ mode: "update", from: hydratedBase });
            })
        };

        expect(await hydrateAndRepairVaultDocument(hydrated, manager)).toBe(true);
        expect(order).toEqual(["initialize", "forceSync"]);
        const repairedVersion = hydrated.version().encode();
        const firstConsumer = createVaultMirror({ doc: hydrated });
        expect(firstConsumer.mirror.getState().descriptionAliases.chain).toMatchObject({
            kind: "symlink",
            targetAliasId: "root"
        });
        expect(firstConsumer.mirror.getState().descriptionAliases.broken).toMatchObject({
            kind: "symlink",
            targetAliasId: "root"
        });
        expect(hydrated.version().encode()).toEqual(repairedVersion);

        const coordinator = new VaultUndoCoordinator(hydrated);
        expect(coordinator.getSnapshot().canUndo).toBe(false);
        coordinator.dispose();

        const peer = new LoroDoc();
        peer.import(malformedSnapshot);
        peer.import(repairUpdate);
        const reopenManager = {
            initialize: vi.fn(async () => undefined),
            forceSync: vi.fn(async () => undefined)
        };
        expect(await hydrateAndRepairVaultDocument(peer, reopenManager)).toBe(false);
        expect(reopenManager.forceSync).not.toHaveBeenCalled();
        expect(createVaultMirror({ doc: peer }).mirror.getState().descriptionAliases).toEqual(
            firstConsumer.mirror.getState().descriptionAliases
        );
    });

    it("creates and durably flushes missing root maps before exposure", async () => {
        const source = createVaultMirror();
        source.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "partial", name: "Partial" });
        });
        const doc = new LoroDoc();
        doc.import(source.doc.export({ mode: "snapshot" }));
        const alias = doc.getMap("descriptionAliases").get("partial");
        if (!(alias instanceof LoroMap)) throw new Error("Expected alias map");
        alias.delete("symlinkIds");
        alias.delete("transactionIds");
        doc.commit({ origin: "system:hydration" });
        const manager = {
            initialize: vi.fn(async () => undefined),
            forceSync: vi.fn(async () => undefined)
        };
        expect(await hydrateAndRepairVaultDocument(doc, manager)).toBe(true);
        expect(manager.forceSync).toHaveBeenCalledOnce();
        const reopened = createVaultMirrorFromSnapshot(doc.export({ mode: "snapshot" }));
        expect(reopened.mirror.getState().descriptionAliases.partial).toMatchObject({
            kind: "real",
            name: "Partial",
            symlinkIds: {},
            transactionIds: {}
        });
    });
});
