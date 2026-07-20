import { act, render, screen, waitFor } from "@testing-library/react";
import { LoroDoc } from "loro-crdt";
import { StrictMode, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import {
    type ApplicationVaultState,
    useVaultEditAction,
    VaultProvider as VaultStateProvider
} from "@/lib/crdt/context";
import { createVaultMirror } from "@/lib/crdt/mirror";
import {
    getVaultSystemOrigin,
    type VaultSystemOriginKind,
    type VaultUndoCoordinator,
    VaultUndoCoordinator as UndoCoordinator,
    VaultUndoProvider,
    useVaultUndoCoordinator
} from "@/lib/crdt/undo";

async function finishAction(): Promise<void> {
    await Promise.resolve();
}

function setUserValue(
    coordinator: VaultUndoCoordinator,
    doc: LoroDoc,
    key: string,
    value: string
): void {
    coordinator.runUserAction("edit", (origin) => {
        doc.getMap("values").set(key, value);
        doc.commit({ origin });
    });
}

function updateVaultName(state: ApplicationVaultState, name: string): void {
    state.preferences.name = name;
}

describe("VaultUndoCoordinator", () => {
    it("groups all commits from one logical action and keeps separate actions distinct", async () => {
        const doc = new LoroDoc();
        const coordinator = new UndoCoordinator(doc);

        setUserValue(coordinator, doc, "first", "one");
        setUserValue(coordinator, doc, "second", "two");
        await finishAction();

        expect(coordinator.getSnapshot()).toEqual({ canRedo: false, canUndo: true });
        expect(coordinator.undo()).toBe(true);
        expect(doc.getMap("values").get("first")).toBeUndefined();
        expect(doc.getMap("values").get("second")).toBeUndefined();

        expect(coordinator.redo()).toBe(true);
        await finishAction();
        setUserValue(coordinator, doc, "third", "three");
        await finishAction();

        expect(coordinator.undo()).toBe(true);
        expect(doc.getMap("values").get("third")).toBeUndefined();
        expect(doc.getMap("values").get("first")).toBe("one");
        expect(coordinator.undo()).toBe(true);
        expect(doc.getMap("values").get("first")).toBeUndefined();

        coordinator.dispose();
    });

    it("groups separate input-event turns into one explicit edit session", async () => {
        const doc = new LoroDoc();
        doc.getMap("values").set("name", "Before edit");
        doc.commit({ origin: getVaultSystemOrigin("hydration") });
        const coordinator = new UndoCoordinator(doc);
        const localUpdates = vi.fn();
        const unsubscribe = doc.subscribeLocalUpdates(localUpdates);
        const session = coordinator.beginEditSession();

        for (const value of ["D", "Dr", "Dra", "Draft", "Draf"]) {
            session.update((origin) => {
                doc.getMap("values").set("name", value);
                doc.commit({ origin });
            });
            await finishAction();
        }
        session.commit();

        expect(localUpdates).toHaveBeenCalledTimes(5);
        expect(doc.getMap("values").get("name")).toBe("Draf");
        expect(coordinator.undo()).toBe(true);
        expect(doc.getMap("values").get("name")).toBe("Before edit");
        expect(coordinator.undo()).toBe(false);
        expect(coordinator.redo()).toBe(true);
        expect(doc.getMap("values").get("name")).toBe("Draf");

        unsubscribe();
        coordinator.dispose();
    });

    it("closes edit sessions before unrelated actions and on cancel or disposal", async () => {
        const firstDoc = new LoroDoc();
        const coordinator = new UndoCoordinator(firstDoc);
        const firstEdit = coordinator.beginEditSession();
        firstEdit.update((origin) => {
            firstDoc.getMap("values").set("name", "first edit");
            firstDoc.commit({ origin });
        });
        await finishAction();

        setUserValue(coordinator, firstDoc, "other", "separate action");
        await finishAction();
        firstEdit.commit();

        expect(coordinator.undo()).toBe(true);
        expect(firstDoc.getMap("values").get("other")).toBeUndefined();
        expect(firstDoc.getMap("values").get("name")).toBe("first edit");
        expect(coordinator.undo()).toBe(true);
        expect(firstDoc.getMap("values").get("name")).toBeUndefined();

        const cancelledEdit = coordinator.beginEditSession();
        cancelledEdit.update((origin) => {
            firstDoc.getMap("values").set("cancelled", "kept immediately");
            firstDoc.commit({ origin });
        });
        cancelledEdit.cancel();
        expect(() =>
            cancelledEdit.update((origin) => {
                firstDoc.getMap("values").set("late", "invalid");
                firstDoc.commit({ origin });
            })
        ).toThrow("closed vault edit session");
        expect(coordinator.undo()).toBe(true);
        expect(firstDoc.getMap("values").get("cancelled")).toBeUndefined();

        const activeDuringReplacement = coordinator.beginEditSession();
        activeDuringReplacement.update((origin) => {
            firstDoc.getMap("values").set("replacement", "closed");
            firstDoc.commit({ origin });
        });
        coordinator.dispose();

        expect(() =>
            activeDuringReplacement.update((origin) => {
                firstDoc.getMap("values").set("late", "invalid");
                firstDoc.commit({ origin });
            })
        ).toThrow("disposed vault undo coordinator");
        const replacementCoordinator = new UndoCoordinator(new LoroDoc());
        expect(replacementCoordinator.getSnapshot()).toEqual({ canRedo: false, canUndo: false });
        replacementCoordinator.dispose();
    });

    it("excludes typed system commits and updates imported from another peer", async () => {
        const local = new LoroDoc();
        const coordinator = new UndoCoordinator(local);

        const systemOrigins: VaultSystemOriginKind[] = [
            "gc",
            "hydration",
            "maintenance",
            "migration",
            "remote",
            "sync"
        ];
        for (const originKind of systemOrigins) {
            local.getMap("values").set(originKind, "kept");
            local.commit({ origin: getVaultSystemOrigin(originKind) });
        }

        const remote = new LoroDoc();
        remote.getMap("values").set("remote", "kept");
        remote.commit({ origin: getVaultSystemOrigin("remote") });
        local.import(remote.export({ mode: "update" }));
        await finishAction();

        expect(coordinator.getSnapshot().canUndo).toBe(false);
        setUserValue(coordinator, local, "local", "undo me");
        await finishAction();
        expect(coordinator.undo()).toBe(true);
        expect(local.getMap("values").get("local")).toBeUndefined();
        for (const originKind of systemOrigins) {
            expect(local.getMap("values").get(originKind)).toBe("kept");
        }
        expect(local.getMap("values").get("remote")).toBe("kept");

        coordinator.dispose();
    });

    it("clears redo after a new user edit and emits undo/redo as local sync updates", async () => {
        const doc = new LoroDoc();
        const coordinator = new UndoCoordinator(doc);
        const localUpdates = vi.fn();
        const unsubscribe = doc.subscribeLocalUpdates(localUpdates);

        setUserValue(coordinator, doc, "first", "one");
        await finishAction();
        expect(coordinator.undo()).toBe(true);
        expect(coordinator.getSnapshot().canRedo).toBe(true);

        setUserValue(coordinator, doc, "second", "two");
        await finishAction();
        expect(coordinator.getSnapshot().canRedo).toBe(false);
        expect(localUpdates).toHaveBeenCalledTimes(3);

        unsubscribe();
        coordinator.dispose();
    });

    it("resets and becomes inert when disposed", async () => {
        const doc = new LoroDoc();
        const coordinator = new UndoCoordinator(doc);
        setUserValue(coordinator, doc, "first", "one");
        await finishAction();

        coordinator.dispose();

        expect(coordinator.getSnapshot()).toEqual({ canRedo: false, canUndo: false });
        expect(coordinator.undo()).toBe(false);
        expect(coordinator.redo()).toBe(false);
        expect(() => setUserValue(coordinator, doc, "second", "two")).toThrow(
            "disposed vault undo coordinator"
        );
    });
});

function CaptureCoordinator({
    onCoordinator
}: {
    onCoordinator: (coordinator: VaultUndoCoordinator) => void;
}) {
    const coordinator = useVaultUndoCoordinator();
    useEffect(() => onCoordinator(coordinator), [coordinator, onCoordinator]);
    return <span>ready</span>;
}

describe("VaultUndoProvider", () => {
    it("switches context history without leaking the disposed coordinator", async () => {
        const firstDoc = new LoroDoc();
        const secondDoc = new LoroDoc();
        const firstProvidedCoordinator = new UndoCoordinator(firstDoc);
        const secondProvidedCoordinator = new UndoCoordinator(secondDoc);
        const seen: VaultUndoCoordinator[] = [];
        const capture = (coordinator: VaultUndoCoordinator) => {
            seen.push(coordinator);
        };
        const view = render(
            <StrictMode>
                <VaultUndoProvider coordinator={firstProvidedCoordinator}>
                    <CaptureCoordinator onCoordinator={capture} />
                </VaultUndoProvider>
            </StrictMode>
        );

        await screen.findByText("ready");
        const firstCoordinator = seen.at(-1);
        expect(firstCoordinator).toBeDefined();
        if (!firstCoordinator) return;
        setUserValue(firstCoordinator, firstDoc, "first", "one");
        await finishAction();
        expect(firstCoordinator.getSnapshot().canUndo).toBe(true);
        firstCoordinator.dispose();
        firstCoordinator.dispose();

        view.rerender(
            <StrictMode>
                <VaultUndoProvider coordinator={secondProvidedCoordinator}>
                    <CaptureCoordinator onCoordinator={capture} />
                </VaultUndoProvider>
            </StrictMode>
        );

        await waitFor(() => expect(seen.at(-1)).not.toBe(firstCoordinator));
        const secondCoordinator = seen.at(-1);
        expect(secondCoordinator?.getSnapshot()).toEqual({ canRedo: false, canUndo: false });
        expect(firstCoordinator.undo()).toBe(false);

        act(() => view.unmount());
        secondCoordinator?.dispose();
        expect(secondCoordinator?.undo()).toBe(false);
    });

    it("closes an active hook edit session when its field unmounts", async () => {
        const { doc, mirror } = createVaultMirror();
        doc.getMap("preferences").set("name", "Before unmount");
        doc.commit({ origin: getVaultSystemOrigin("hydration") });
        const coordinator = new UndoCoordinator(doc);

        function ActiveEdit() {
            const { begin, commit, update } = useVaultEditAction(updateVaultName);
            useEffect(() => {
                begin();
                update("Unmounted edit");
                return commit;
            }, [begin, commit, update]);
            return <span>editing</span>;
        }

        const view = render(
            <VaultStateProvider doc={doc}>
                <VaultUndoProvider coordinator={coordinator}>
                    <ActiveEdit />
                </VaultUndoProvider>
            </VaultStateProvider>
        );
        await screen.findByText("editing");
        await waitFor(() => expect(mirror.getState().preferences.name).toBe("Unmounted edit"));

        view.unmount();

        expect(coordinator.undo()).toBe(true);
        expect(mirror.getState().preferences.name).toBe("Before unmount");
        coordinator.dispose();
    });
});
