import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { DescriptionAliasChangeModal } from "@/components/features/description-aliases/DescriptionAliasChangeModal";
import { planDescriptionAliasCommit } from "@/components/features/description-aliases/descriptionAliasInteraction";
import { useDescriptionAliasLookup } from "@/components/features/description-aliases/useDescriptionAliasLookup";
import { TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS } from "@/components/features/transactions/cells/editor-lifecycle";
import {
    DescriptionAliasDisplay,
    InlineEditableDescriptionAlias,
    restoreDescriptionAliasEditOrigin
} from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import type {
    DescriptionAliasEditOrigin,
    InlineEditableDescriptionAliasProps
} from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import {
    createDescriptionAliasLookup,
    type DescriptionAliasCollection
} from "@/lib/domain/description-aliases";

const aliases: DescriptionAliasCollection = {
    shared: {
        kind: "real",
        id: "shared",
        name: "Shared café",
        symlinkIds: { sharedLink: true },
        transactionIds: { one: true, two: true }
    },
    target: {
        kind: "real",
        id: "target",
        name: "Target",
        symlinkIds: {},
        transactionIds: {}
    },
    single: {
        kind: "real",
        id: "single",
        name: "Single",
        symlinkIds: {},
        transactionIds: { three: true }
    },
    sharedLink: {
        kind: "symlink",
        id: "sharedLink",
        targetAliasId: "shared",
        transactionIds: { four: true }
    }
};
const lookup = createDescriptionAliasLookup(aliases);

class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeAll(() => vi.stubGlobal("ResizeObserver", ResizeObserverMock));
afterAll(() => vi.unstubAllGlobals());

describe("description alias commit planning", () => {
    it("plans exact, novel, seamless single-use, shared change and removal paths", () => {
        expect(planDescriptionAliasCommit({ lookup, text: "  Target  " })).toEqual({
            kind: "assign",
            target: { kind: "existing", aliasId: "target" }
        });
        expect(planDescriptionAliasCommit({ lookup, text: "New name" })).toEqual({
            kind: "assign",
            target: { kind: "new", name: "New name" }
        });
        expect(
            planDescriptionAliasCommit({ lookup, currentAliasId: "single", text: "Renamed" })
        ).toEqual({ kind: "rename-one", aliasId: "single", name: "Renamed" });
        expect(
            planDescriptionAliasCommit({ lookup, currentAliasId: "single", text: "Target" })
        ).toEqual({
            kind: "change-one",
            target: { kind: "existing", aliasId: "target" }
        });
        expect(
            planDescriptionAliasCommit({ lookup, currentAliasId: "shared", text: "Target" })
        ).toEqual({
            kind: "confirm-change",
            target: { kind: "existing", aliasId: "target" }
        });
        expect(
            planDescriptionAliasCommit({ lookup, currentAliasId: "shared", text: "Novel" })
        ).toEqual({ kind: "confirm-change", target: { kind: "new", name: "Novel" } });
        expect(
            planDescriptionAliasCommit({ lookup, currentAliasId: "sharedLink", text: "Novel" })
        ).toEqual({ kind: "confirm-change", target: { kind: "new", name: "Novel" } });
        expect(planDescriptionAliasCommit({ lookup, currentAliasId: "single", text: " " })).toEqual(
            { kind: "remove-one" }
        );
        expect(planDescriptionAliasCommit({ lookup, currentAliasId: "shared", text: " " })).toEqual(
            { kind: "confirm-remove" }
        );
        expect(
            planDescriptionAliasCommit({
                lookup,
                currentAliasId: "shared",
                text: "Shared café"
            })
        ).toEqual({ kind: "none" });
    });

    it("reuses one lookup identity until the alias collection changes", () => {
        const { result, rerender } = renderHook(
            ({ collection }: { readonly collection: DescriptionAliasCollection }) =>
                useDescriptionAliasLookup(collection),
            { initialProps: { collection: aliases } }
        );
        const initial = result.current;

        rerender({ collection: aliases });
        expect(result.current).toBe(initial);

        rerender({ collection: { ...aliases } });
        expect(result.current).not.toBe(initial);
    });
});

describe("InlineEditableDescriptionAlias", () => {
    const options = [
        { id: "cafe", name: "Café" },
        { id: "canteen", name: "Canteen" }
    ];

    it("keeps native click caret and lazily opens with no selected option", () => {
        const commit = vi.fn<InlineEditableDescriptionAliasProps["onCommitText"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );
        const select = vi.fn<InlineEditableDescriptionAliasProps["onSelectAlias"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );
        const gridKey = vi.fn();
        render(
            <div onKeyDown={gridKey}>
                <InlineEditableDescriptionAlias
                    value="Ca"
                    availableAliases={options}
                    onCommitText={commit}
                    onSelectAlias={select}
                    data-testid="first-description"
                />
                <InlineEditableDescriptionAlias
                    value="Ca"
                    availableAliases={options}
                    onCommitText={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                    onSelectAlias={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                    data-testid="second-description"
                />
            </div>
        );

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        const input = screen.getByTestId("first-description");
        if (!(input instanceof HTMLInputElement))
            throw new Error("Description control is not an input");
        input.setSelectionRange(1, 1);
        fireEvent.click(input);
        fireEvent.focus(input);
        expect(input.selectionStart).toBe(1);
        fireEvent.change(input, { target: { value: "C" } });
        expect(screen.getAllByRole("listbox")).toHaveLength(1);
        expect(screen.getAllByRole("option")).toHaveLength(2);
        expect(
            screen.getAllByRole("option").every((option) => option.ariaSelected === "false")
        ).toBe(true);

        fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
        expect(gridKey).not.toHaveBeenCalled();
        fireEvent.keyDown(input, { key: "Escape" });
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(gridKey).toHaveBeenCalledOnce();
    });

    it("publishes popup ownership in the same commit that mounts the listbox", () => {
        const ownershipObservedAtLayout: boolean[] = [];
        let popupOwned = false;

        function PopupOwnershipProbe() {
            const [inputRevision, setInputRevision] = useState(0);
            useLayoutEffect(() => {
                if (document.querySelector('[role="listbox"]') != null) {
                    ownershipObservedAtLayout.push(popupOwned);
                }
            }, [inputRevision]);
            return (
                <div onInput={() => setInputRevision((current) => current + 1)}>
                    <InlineEditableDescriptionAlias
                        value="Ca"
                        availableAliases={options}
                        onCommitText={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                        onSelectAlias={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                        onPopupOpenChange={(popup, open) => {
                            if (popup === "listbox") popupOwned = open;
                        }}
                    />
                </div>
            );
        }

        render(<PopupOwnershipProbe />);
        const input = screen.getByRole("textbox", { name: "Transaction description" });
        fireEvent.focus(input);
        fireEvent.input(input, { target: { value: "C" } });

        expect(screen.getByRole("listbox", { name: "Description aliases" })).toBeInTheDocument();
        expect(ownershipObservedAtLayout).toEqual([true]);
    });

    it("accepts keyboard and pointer options without a blur commit", () => {
        const keyboardCommit = vi.fn<InlineEditableDescriptionAliasProps["onCommitText"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );
        const keyboardSelect = vi.fn<InlineEditableDescriptionAliasProps["onSelectAlias"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );
        const view = render(
            <InlineEditableDescriptionAlias
                value="Ca"
                availableAliases={options}
                onCommitText={keyboardCommit}
                onSelectAlias={keyboardSelect}
            />
        );
        const input = screen.getByRole("textbox", { name: "Transaction description" });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "C" } });
        fireEvent.keyDown(input, { key: "ArrowDown" });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(keyboardSelect).toHaveBeenCalledOnce();
        expect(keyboardSelect.mock.calls[0][0]).toBe("cafe");
        expect(keyboardCommit).not.toHaveBeenCalled();

        view.unmount();
        const pointerCommit = vi.fn<InlineEditableDescriptionAliasProps["onCommitText"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );
        const pointerSelect = vi.fn<InlineEditableDescriptionAliasProps["onSelectAlias"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );
        render(
            <InlineEditableDescriptionAlias
                value="Ca"
                availableAliases={options}
                onCommitText={pointerCommit}
                onSelectAlias={pointerSelect}
            />
        );
        const pointerInput = screen.getByRole("textbox", { name: "Transaction description" });
        fireEvent.focus(pointerInput);
        fireEvent.change(pointerInput, { target: { value: "C" } });
        const option = screen.getByRole("option", { name: "Canteen" });
        fireEvent.pointerDown(option);
        fireEvent.click(option);
        expect(pointerSelect).toHaveBeenCalledOnce();
        expect(pointerSelect.mock.calls[0][0]).toBe("canteen");
        expect(pointerCommit).not.toHaveBeenCalled();
    });

    it("exposes differing imported provenance on the resting description", () => {
        const view = render(
            <DescriptionAliasDisplay
                value="Friendly café"
                descriptionAliasId="alias"
                originalDescription="Imported raw"
                data-testid="resting-description"
            />
        );
        const display = screen.getByTestId("resting-description");
        expect(display).toHaveAttribute(
            "aria-description",
            "Original imported description: Imported raw"
        );
        expect(display).toHaveAttribute("data-state", "closed");

        view.rerender(
            <DescriptionAliasDisplay
                value="Imported raw"
                descriptionAliasId="alias"
                originalDescription="Imported raw"
                data-testid="resting-description"
            />
        );
        expect(screen.getByTestId("resting-description")).not.toHaveAttribute("data-state");
        expect(screen.getByTestId("resting-description")).not.toHaveAttribute("aria-description");
    });

    it("commits Enter and blur once and retains its input when provenance disappears", () => {
        const commit = vi.fn<InlineEditableDescriptionAliasProps["onCommitText"]>(
            () => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS
        );
        const view = render(
            <InlineEditableDescriptionAlias
                value="Raw"
                descriptionAliasId="alias"
                originalDescription="Imported raw"
                availableAliases={[]}
                onCommitText={commit}
                onSelectAlias={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
            />
        );
        const input = screen.getByRole("textbox", { name: "Transaction description" });
        expect(input).toHaveAttribute("data-state", "closed");
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "Novel" } });
        fireEvent.keyDown(input, { key: "Enter" });
        fireEvent.blur(input);
        expect(commit).toHaveBeenCalledOnce();
        expect(commit.mock.calls[0][0]).toBe("Novel");

        view.rerender(
            <InlineEditableDescriptionAlias
                value="Same"
                originalDescription="Same"
                availableAliases={[]}
                onCommitText={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                onSelectAlias={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
            />
        );
        const retainedInput = screen.getByRole("textbox", {
            name: "Transaction description"
        });
        expect(retainedInput).toBe(input);
        fireEvent.focus(retainedInput);
        expect(retainedInput).toHaveValue("Same");
        expect(retainedInput).toHaveAttribute("data-state", "closed");
    });

    it("closes its popup ownership before reporting a blur-finished edit", () => {
        const lifecycleEvents: string[] = [];
        render(
            <InlineEditableDescriptionAlias
                value="Ca"
                availableAliases={options}
                onCommitText={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                onSelectAlias={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                onEditingChange={(editing) => {
                    lifecycleEvents.push(editing ? "editing-open" : "editing-closed");
                }}
                onPopupOpenChange={(popup, open) => {
                    lifecycleEvents.push(`${popup}-${open ? "open" : "closed"}`);
                }}
            />
        );
        const input = screen.getByRole("textbox", { name: "Transaction description" });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "C" } });
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        lifecycleEvents.length = 0;

        fireEvent.blur(input);

        expect(lifecycleEvents.slice(0, 2)).toEqual(["listbox-closed", "editing-closed"]);
    });

    it("does no alias filtering for inactive virtual rows and filters only the edited cell", () => {
        let filterCalls = 0;
        const manyOptions = new Proxy(
            Array.from({ length: 2_000 }, (_, index) => ({
                id: `alias-${index}`,
                name: `Alias ${index}`
            })),
            {
                get(target, property, receiver) {
                    if (property === "filter") filterCalls += 1;
                    return Reflect.get(target, property, receiver);
                }
            }
        );

        render(
            <>
                {Array.from({ length: 20 }, (_, index) => (
                    <InlineEditableDescriptionAlias
                        key={index}
                        value={`Raw ${index}`}
                        availableAliases={manyOptions}
                        onCommitText={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                        onSelectAlias={vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS)}
                        data-testid={`large-description-${index}`}
                    />
                ))}
            </>
        );

        expect(filterCalls).toBe(0);
        const activeInput = screen.getByTestId("large-description-7");
        fireEvent.focus(activeInput);
        expect(filterCalls).toBe(0);
        fireEvent.change(activeInput, { target: { value: "Alias 1999" } });
        expect(filterCalls).toBe(1);
        expect(screen.getAllByRole("listbox")).toHaveLength(1);
        expect(screen.getAllByRole("option")).toHaveLength(1);
    });
});

describe("DescriptionAliasChangeModal", () => {
    it("returns focus to the outer gridcell after the editor unmounts", () => {
        const gridcell = document.createElement("div");
        gridcell.setAttribute("role", "gridcell");
        gridcell.tabIndex = 0;
        const container = document.createElement("div");
        const input = document.createElement("input");
        container.append(input);
        gridcell.append(container);
        document.body.append(gridcell);
        const origin: DescriptionAliasEditOrigin = {
            container,
            element: input,
            gridcell,
            selectionEnd: 2,
            selectionStart: 2
        };

        container.remove();
        restoreDescriptionAliasEditOrigin(origin);

        expect(gridcell).toHaveFocus();
        gridcell.remove();
    });

    it("restores a registered replacement editor before falling back to its gridcell", () => {
        const gridcell = document.createElement("div");
        gridcell.setAttribute("role", "gridcell");
        gridcell.tabIndex = 0;
        const originalContainer = document.createElement("div");
        const originalInput = document.createElement("input");
        originalContainer.append(originalInput);
        gridcell.append(originalContainer);
        document.body.append(gridcell);
        const origin: DescriptionAliasEditOrigin = {
            container: originalContainer,
            element: originalInput,
            gridcell,
            selectionEnd: 4,
            selectionStart: 1
        };
        originalContainer.remove();
        const replacementContainer = document.createElement("div");
        const replacementInput = document.createElement("input");
        replacementInput.setAttribute("aria-label", "Transaction description");
        replacementInput.value = "Target";
        replacementContainer.append(replacementInput);
        gridcell.append(replacementContainer);

        restoreDescriptionAliasEditOrigin(origin);

        expect(replacementInput).toHaveFocus();
        expect(replacementInput.selectionStart).toBe(1);
        expect(replacementInput.selectionEnd).toBe(4);
        gridcell.remove();
    });

    it("uses exact choices, focuses the first action and suppresses double submission", async () => {
        const onDecision = vi.fn();
        render(
            <DescriptionAliasChangeModal
                open
                mode="change"
                onClose={vi.fn()}
                onDecision={onDecision}
                onRestoreFocus={vi.fn()}
            />
        );
        const first = screen.getByRole("button", { name: "Change just this one" });
        await waitFor(() => expect(first).toHaveFocus());
        expect(screen.getByRole("button", { name: "Change all" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
        fireEvent.click(first);
        fireEvent.click(first);
        expect(onDecision).toHaveBeenCalledOnce();
        expect(onDecision).toHaveBeenCalledWith("one");
    });

    it("cancels without an action and restores the originating focus", async () => {
        const onDecision = vi.fn();

        function Harness() {
            const [open, setOpen] = useState(true);
            return (
                <>
                    <input aria-label="Origin" />
                    <DescriptionAliasChangeModal
                        open={open}
                        mode="remove"
                        onClose={() => setOpen(false)}
                        onDecision={onDecision}
                        onRestoreFocus={() =>
                            screen.getByRole("textbox", { name: "Origin" }).focus()
                        }
                    />
                </>
            );
        }

        render(<Harness />);
        expect(screen.getByRole("button", { name: "Remove from just this one" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Remove from all" })).toBeVisible();
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(screen.getByRole("textbox", { name: "Origin" })).toHaveFocus();
        expect(onDecision).not.toHaveBeenCalled();
    });
});
