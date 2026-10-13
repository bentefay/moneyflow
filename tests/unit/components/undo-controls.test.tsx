import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoroDoc } from "loro-crdt";
import { describe, expect, it } from "vitest";

import { CommandRegistryProvider } from "@/components/features/commands";
import { UndoCommands, UndoControls } from "@/components/features/undo/UndoControls";
import {
    useVaultAction,
    useVaultPreferences,
    VaultProvider as MirrorVaultProvider
} from "@/lib/crdt/context";
import { getDefaultVaultState } from "@/lib/crdt/defaults";
import { VaultUndoCoordinator, VaultUndoProvider } from "@/lib/crdt/undo";

function UndoHarness() {
    const preferences = useVaultPreferences();
    const setVaultName = useVaultAction(
        (state, name: string) => {
            state.preferences.name = name;
        },
        [],
        "edit"
    );

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setVaultName("Intermediate name");
                    setVaultName("Grouped name");
                }}
            >
                Change vault
            </button>
            <output aria-label="Vault name">{preferences.name}</output>
            <input aria-label="Editable value" defaultValue="native text" />
            <UndoControls />
            <UndoCommands />
        </>
    );
}

describe("UndoControls", () => {
    it("keeps button states truthful and leaves input undo to the browser", async () => {
        const doc = new LoroDoc();
        const coordinator = new VaultUndoCoordinator(doc);
        render(
            <MirrorVaultProvider doc={doc} initialState={getDefaultVaultState()}>
                <VaultUndoProvider coordinator={coordinator}>
                    <CommandRegistryProvider>
                        <UndoHarness />
                    </CommandRegistryProvider>
                </VaultUndoProvider>
            </MirrorVaultProvider>
        );

        const undo = await screen.findByRole("button", { name: "Undo" });
        const redo = screen.getByRole("button", { name: "Redo" });
        expect(undo).toBeDisabled();
        expect(redo).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Change vault" }));
        await waitFor(() => expect(undo).toBeEnabled());
        expect(screen.getByRole("status", { name: "Vault name" })).toHaveTextContent(
            "Grouped name"
        );

        const input = screen.getByRole("textbox", { name: "Editable value" });
        fireEvent.keyDown(input, { code: "KeyZ", ctrlKey: true, key: "z" });
        expect(screen.getByRole("status", { name: "Vault name" })).toHaveTextContent(
            "Grouped name"
        );

        fireEvent.keyDown(document.body, { code: "KeyZ", ctrlKey: true, key: "z" });
        await waitFor(() => expect(redo).toBeEnabled());
        expect(screen.getByRole("status", { name: "Vault name" })).not.toHaveTextContent(
            "Grouped name"
        );

        fireEvent.keyDown(document.body, { code: "KeyY", ctrlKey: true, key: "y" });
        await waitFor(() =>
            expect(screen.getByRole("status", { name: "Vault name" })).toHaveTextContent(
                "Grouped name"
            )
        );
        fireEvent.keyDown(document.body, { code: "KeyZ", ctrlKey: true, key: "z" });
        await waitFor(() => expect(redo).toBeEnabled());

        fireEvent.click(redo);
        await waitFor(() => expect(undo).toBeEnabled());
        expect(screen.getByRole("status", { name: "Vault name" })).toHaveTextContent(
            "Grouped name"
        );
        coordinator.dispose();
    });
});
