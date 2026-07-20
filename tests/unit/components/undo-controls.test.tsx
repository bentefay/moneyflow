import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoroDoc } from "loro-crdt";
import { describe, expect, it } from "vitest";

import {
    getUndoKeyboardAction,
    isEditableUndoTarget,
    UndoControls,
    UndoKeyboardShortcuts
} from "@/components/features/undo/UndoControls";
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
            <UndoKeyboardShortcuts />
        </>
    );
}

describe("undo keyboard guards", () => {
    it("recognizes every Ctrl and Meta undo/redo form", () => {
        const target = document.body;
        const event = {
            altKey: false,
            ctrlKey: true,
            defaultPrevented: false,
            key: "z",
            metaKey: false,
            shiftKey: false,
            target
        };

        expect(getUndoKeyboardAction(event)).toBe("undo");
        expect(getUndoKeyboardAction({ ...event, shiftKey: true })).toBe("redo");
        expect(getUndoKeyboardAction({ ...event, key: "y" })).toBe("redo");
        expect(getUndoKeyboardAction({ ...event, ctrlKey: false, metaKey: true })).toBe("undo");
        expect(
            getUndoKeyboardAction({ ...event, ctrlKey: false, metaKey: true, shiftKey: true })
        ).toBe("redo");
        expect(getUndoKeyboardAction({ ...event, ctrlKey: false, key: "y", metaKey: true })).toBe(
            "redo"
        );
    });

    it("ignores native editable controls, modified commands and unrelated keys", () => {
        const input = document.createElement("input");
        const editable = document.createElement("div");
        editable.setAttribute("contenteditable", "true");
        const child = document.createElement("span");
        editable.append(child);
        const plaintext = document.createElement("div");
        plaintext.setAttribute("contenteditable", "plaintext-only");
        document.body.append(input, editable, plaintext);

        expect(isEditableUndoTarget(input)).toBe(true);
        expect(isEditableUndoTarget(child)).toBe(true);
        expect(isEditableUndoTarget(plaintext)).toBe(true);

        const event = {
            altKey: false,
            ctrlKey: true,
            defaultPrevented: false,
            key: "z",
            metaKey: false,
            shiftKey: false,
            target: input
        };
        expect(getUndoKeyboardAction(event)).toBeNull();
        expect(getUndoKeyboardAction({ ...event, target: document.body, altKey: true })).toBeNull();
        expect(
            getUndoKeyboardAction({ ...event, target: document.body, ctrlKey: false })
        ).toBeNull();
        expect(getUndoKeyboardAction({ ...event, target: document.body, key: "x" })).toBeNull();

        input.remove();
        editable.remove();
        plaintext.remove();
    });
});

describe("UndoControls", () => {
    it("keeps button states truthful and leaves input undo to the browser", async () => {
        const doc = new LoroDoc();
        const coordinator = new VaultUndoCoordinator(doc);
        render(
            <MirrorVaultProvider doc={doc} initialState={getDefaultVaultState()}>
                <VaultUndoProvider coordinator={coordinator}>
                    <UndoHarness />
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
        fireEvent.keyDown(input, { ctrlKey: true, key: "z" });
        expect(screen.getByRole("status", { name: "Vault name" })).toHaveTextContent(
            "Grouped name"
        );

        fireEvent.keyDown(window, { ctrlKey: true, key: "z" });
        await waitFor(() => expect(redo).toBeEnabled());
        expect(screen.getByRole("status", { name: "Vault name" })).not.toHaveTextContent(
            "Grouped name"
        );

        fireEvent.click(redo);
        await waitFor(() => expect(undo).toBeEnabled());
        expect(screen.getByRole("status", { name: "Vault name" })).toHaveTextContent(
            "Grouped name"
        );
        coordinator.dispose();
    });
});
