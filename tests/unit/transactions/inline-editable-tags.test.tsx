import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    TransactionGridEditorLifecycleProvider,
    type TransactionGridEditorLifecycle
} from "@/components/features/transactions/cells/editor-lifecycle";
import {
    InlineEditableTags,
    type InlineEditableTagsProps
} from "@/components/features/transactions/cells/InlineEditableTags";

class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeAll(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn()
    });
});
afterAll(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

function renderTagsEditor(props: InlineEditableTagsProps): {
    readonly lifecycle: () => TransactionGridEditorLifecycle;
} {
    let registeredLifecycle: TransactionGridEditorLifecycle | null = null;
    render(
        <TransactionGridEditorLifecycleProvider
            isPortalTargetOwned={() => false}
            register={(lifecycle) => {
                registeredLifecycle = lifecycle;
                return () => {
                    if (registeredLifecycle === lifecycle) registeredLifecycle = null;
                };
            }}
            registerPortal={() => undefined}
        >
            <InlineEditableTags {...props} />
        </TransactionGridEditorLifecycleProvider>
    );
    return {
        lifecycle: () => {
            if (registeredLifecycle == null) throw new Error("Tag editor lifecycle is missing");
            return registeredLifecycle;
        }
    };
}

const workTag = { id: "work", name: "Work", color: "#2563eb" };

describe("InlineEditableTags draft commit", () => {
    it("keeps toggles local and writes the changed value once on commit", () => {
        const onSave = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderTagsEditor({
            availableTags: [workTag],
            onSave,
            startOpen: true,
            tags: [],
            value: []
        });

        fireEvent.click(screen.getByText("Work"));

        expect(onSave).not.toHaveBeenCalled();
        expect(editor.lifecycle().automation).toEqual({
            draftTagIds: ["work"],
            field: "tags",
            originalTagIds: []
        });
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "changed" });
        expect(onSave).toHaveBeenCalledOnce();
        expect(onSave).toHaveBeenCalledWith(["work"], []);
    });

    it("retains a changed draft when the persistence boundary rejects", () => {
        const onSave = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_FAILURE);
        const editor = renderTagsEditor({
            availableTags: [workTag],
            onSave,
            startOpen: true,
            tags: [],
            value: []
        });
        fireEvent.click(screen.getByText("Work"));

        expect(editor.lifecycle().commit()).toEqual({ ok: false, status: "rejected" });
        expect(onSave).toHaveBeenCalledWith(["work"], []);
        expect(editor.lifecycle().automation).toEqual({
            draftTagIds: ["work"],
            field: "tags",
            originalTagIds: []
        });
    });

    it("writes nothing when the committed set is unchanged", () => {
        const onSave = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderTagsEditor({
            availableTags: [workTag],
            onSave,
            tags: [workTag],
            value: ["work"]
        });

        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
        expect(onSave).not.toHaveBeenCalled();
    });

    it("discards toggles on cancellation without mutating", () => {
        const onSave = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderTagsEditor({
            availableTags: [workTag],
            onSave,
            startOpen: true,
            tags: [],
            value: []
        });
        fireEvent.click(screen.getByText("Work"));

        act(() => editor.lifecycle().cancel());

        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
        expect(onSave).not.toHaveBeenCalled();
    });

    it("defers a created tag and its assignment until the same commit", async () => {
        const createdTag = { id: "created", name: "Created", color: "#16a34a" };
        const onCreateTag = vi.fn(async () => createdTag);
        const onSave = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderTagsEditor({
            availableTags: [],
            onCreateTag,
            onSave,
            startOpen: true,
            tags: [],
            value: []
        });

        fireEvent.change(screen.getByPlaceholderText("Search tags..."), {
            target: { value: "Created" }
        });
        fireEvent.click(await screen.findByTestId("create-tag-button"));
        await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith("Created"));
        await waitFor(() =>
            expect(editor.lifecycle().automation).toEqual({
                draftTagIds: ["created"],
                field: "tags",
                originalTagIds: []
            })
        );

        fireEvent.change(screen.getByPlaceholderText("Search tags..."), {
            target: { value: " created " }
        });
        expect(screen.queryByTestId("create-tag-button")).not.toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Created" })).toBeVisible();
        expect(onCreateTag).toHaveBeenCalledOnce();

        expect(onSave).not.toHaveBeenCalled();
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "changed" });
        expect(onSave).toHaveBeenCalledWith(["created"], [createdTag]);
    });

    it.each(["Work", "work", " Work "])(
        "suppresses exact creation for the available tag query %j",
        (query) => {
            renderTagsEditor({
                availableTags: [workTag],
                onCreateTag: vi.fn(async () => ({ id: "duplicate", name: query })),
                onSave: vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS),
                startOpen: true,
                tags: [],
                value: []
            });

            fireEvent.change(screen.getByPlaceholderText("Search tags..."), {
                target: { value: query }
            });

            expect(screen.queryByTestId("create-tag-button")).not.toBeInTheDocument();
            expect(screen.getByRole("option", { name: "Work" })).toBeVisible();
        }
    );

    it("toggles a normalized exact option on Enter without creating a duplicate", () => {
        const onCreateTag = vi.fn(async () => ({ id: "duplicate", name: "WORK" }));
        const editor = renderTagsEditor({
            availableTags: [workTag],
            onCreateTag,
            onSave: vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS),
            startOpen: true,
            tags: [],
            value: []
        });
        const search = screen.getByPlaceholderText("Search tags...");

        fireEvent.change(search, { target: { value: " WORK " } });
        fireEvent.keyDown(search, { key: "Enter" });

        expect(onCreateTag).not.toHaveBeenCalled();
        expect(editor.lifecycle().automation).toEqual({
            draftTagIds: [workTag.id],
            field: "tags",
            originalTagIds: []
        });
    });

    it("suppresses exact creation after remount when the selected tag projection leads availability", () => {
        renderTagsEditor({
            availableTags: [],
            onCreateTag: vi.fn(async () => ({ id: "duplicate", name: "Work" })),
            onSave: vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS),
            startOpen: true,
            tags: [workTag],
            value: [workTag.id]
        });

        fireEvent.change(screen.getByPlaceholderText("Search tags..."), {
            target: { value: " work " }
        });

        expect(screen.queryByTestId("create-tag-button")).not.toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Work" })).toBeVisible();
    });
});
