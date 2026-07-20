import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { DescriptionAliasChangeModal } from "@/components/features/description-aliases/DescriptionAliasChangeModal";
import { planDescriptionAliasCommit } from "@/components/features/description-aliases/descriptionAliasInteraction";
import { InlineEditableDescriptionAlias } from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";
import type { DescriptionAliasCollection } from "@/lib/domain/description-aliases";

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

class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeAll(() => vi.stubGlobal("ResizeObserver", ResizeObserverMock));
afterAll(() => vi.unstubAllGlobals());

describe("description alias commit planning", () => {
    it("plans exact, novel, seamless single-use, shared change and removal paths", () => {
        expect(planDescriptionAliasCommit({ aliases, text: "  Target  " })).toEqual({
            kind: "assign",
            target: { kind: "existing", aliasId: "target" }
        });
        expect(planDescriptionAliasCommit({ aliases, text: "New name" })).toEqual({
            kind: "assign",
            target: { kind: "new", name: "New name" }
        });
        expect(
            planDescriptionAliasCommit({ aliases, currentAliasId: "single", text: "Renamed" })
        ).toEqual({ kind: "rename-one", aliasId: "single", name: "Renamed" });
        expect(
            planDescriptionAliasCommit({ aliases, currentAliasId: "single", text: "Target" })
        ).toEqual({
            kind: "change-one",
            target: { kind: "existing", aliasId: "target" }
        });
        expect(
            planDescriptionAliasCommit({ aliases, currentAliasId: "shared", text: "Target" })
        ).toEqual({
            kind: "confirm-change",
            target: { kind: "existing", aliasId: "target" }
        });
        expect(
            planDescriptionAliasCommit({ aliases, currentAliasId: "shared", text: "Novel" })
        ).toEqual({ kind: "confirm-change", target: { kind: "new", name: "Novel" } });
        expect(
            planDescriptionAliasCommit({ aliases, currentAliasId: "sharedLink", text: "Novel" })
        ).toEqual({ kind: "confirm-change", target: { kind: "new", name: "Novel" } });
        expect(
            planDescriptionAliasCommit({ aliases, currentAliasId: "single", text: " " })
        ).toEqual({ kind: "remove-one" });
        expect(
            planDescriptionAliasCommit({ aliases, currentAliasId: "shared", text: " " })
        ).toEqual({ kind: "confirm-remove" });
        expect(
            planDescriptionAliasCommit({
                aliases,
                currentAliasId: "shared",
                text: "Shared café"
            })
        ).toEqual({ kind: "none" });
    });
});

describe("InlineEditableDescriptionAlias", () => {
    const options = [
        { id: "cafe", name: "Café" },
        { id: "canteen", name: "Canteen" }
    ];

    it("keeps native click caret and lazily opens with no selected option", () => {
        const commit = vi.fn();
        const select = vi.fn();
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
                    onCommitText={vi.fn()}
                    onSelectAlias={vi.fn()}
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

    it("accepts keyboard and pointer options without a blur commit", () => {
        const keyboardCommit = vi.fn();
        const keyboardSelect = vi.fn();
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
        const pointerCommit = vi.fn();
        const pointerSelect = vi.fn();
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

    it("commits Enter and blur exactly once and exposes only differing imported provenance", () => {
        const commit = vi.fn();
        const view = render(
            <InlineEditableDescriptionAlias
                value="Raw"
                descriptionAliasId="alias"
                originalDescription="Imported raw"
                availableAliases={[]}
                onCommitText={commit}
                onSelectAlias={vi.fn()}
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
                descriptionAliasId="alias"
                originalDescription="Same"
                availableAliases={[]}
                onCommitText={vi.fn()}
                onSelectAlias={vi.fn()}
            />
        );
        expect(
            screen.getByRole("textbox", { name: "Transaction description" })
        ).not.toHaveAttribute("data-state");
    });
});

describe("DescriptionAliasChangeModal", () => {
    it("uses exact choices, focuses the first action and suppresses double submission", async () => {
        const justThis = vi.fn();
        render(
            <DescriptionAliasChangeModal
                open
                mode="change"
                onClose={vi.fn()}
                onJustThis={justThis}
                onAll={vi.fn()}
                onRestoreFocus={vi.fn()}
            />
        );
        const first = screen.getByRole("button", { name: "Change just this one" });
        await waitFor(() => expect(first).toHaveFocus());
        expect(screen.getByRole("button", { name: "Change all" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
        fireEvent.click(first);
        fireEvent.click(first);
        expect(justThis).toHaveBeenCalledOnce();
    });

    it("cancels without an action and restores the originating focus", async () => {
        const justThis = vi.fn();
        const all = vi.fn();

        function Harness() {
            const [open, setOpen] = useState(true);
            return (
                <>
                    <input aria-label="Origin" />
                    <DescriptionAliasChangeModal
                        open={open}
                        mode="remove"
                        onClose={() => setOpen(false)}
                        onJustThis={justThis}
                        onAll={all}
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
        expect(justThis).not.toHaveBeenCalled();
        expect(all).not.toHaveBeenCalled();
    });
});
