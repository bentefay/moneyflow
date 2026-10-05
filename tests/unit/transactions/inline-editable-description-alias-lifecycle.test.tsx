import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    TransactionGridEditorLifecycleProvider,
    type TransactionGridEditorCommitResult,
    type TransactionGridEditorLifecycle
} from "@/components/features/transactions/cells/editor-lifecycle";
import {
    InlineEditableDescriptionAlias,
    type InlineEditableDescriptionAliasProps
} from "@/components/features/transactions/cells/InlineEditableDescriptionAlias";

function renderDescriptionEditor(result: TransactionGridEditorCommitResult): {
    readonly lifecycle: () => TransactionGridEditorLifecycle;
    readonly onCommitText: InlineEditableDescriptionAliasProps["onCommitText"];
} {
    let registeredLifecycle: TransactionGridEditorLifecycle | null = null;
    const onCommitText = vi.fn(() => result);
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
            <InlineEditableDescriptionAlias
                availableAliases={[]}
                onCommitText={onCommitText}
                onSelectAlias={() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS}
                value="Original"
            />
        </TransactionGridEditorLifecycleProvider>
    );
    return {
        lifecycle: () => {
            if (registeredLifecycle == null) {
                throw new Error("Description editor lifecycle is missing");
            }
            return registeredLifecycle;
        },
        onCommitText
    };
}

describe("InlineEditableDescriptionAlias editor lifecycle", () => {
    it("publishes the original and draft text with the changed commit result", () => {
        const editor = renderDescriptionEditor(TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        fireEvent.change(screen.getByRole("textbox", { name: "Transaction description" }), {
            target: { value: "Draft" }
        });

        expect(editor.lifecycle().automation).toEqual({
            draftText: "Draft",
            field: "descriptionAlias",
            originalText: "Original"
        });
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "changed" });
        expect(editor.onCommitText).toHaveBeenCalledOnce();
        expect(editor.onCommitText).toHaveBeenCalledWith("Draft", expect.any(Object));
    });

    it("reports unchanged without invoking the mutation boundary", () => {
        const editor = renderDescriptionEditor(TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);

        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
        expect(editor.onCommitText).not.toHaveBeenCalled();
    });

    it("publishes rejection from the actual mutation boundary", () => {
        const editor = renderDescriptionEditor(TRANSACTION_GRID_EDITOR_COMMIT_FAILURE);
        fireEvent.change(screen.getByRole("textbox", { name: "Transaction description" }), {
            target: { value: "Rejected draft" }
        });

        act(() => {
            expect(editor.lifecycle().commit()).toEqual({ ok: false, status: "rejected" });
        });
        expect(editor.onCommitText).toHaveBeenCalledOnce();
        expect(editor.lifecycle().automation).toEqual({
            draftText: "Rejected draft",
            field: "descriptionAlias",
            originalText: "Original"
        });
    });

    it("cancels to the original draft without mutating", () => {
        const editor = renderDescriptionEditor(TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        fireEvent.change(screen.getByRole("textbox", { name: "Transaction description" }), {
            target: { value: "Discarded" }
        });

        act(() => editor.lifecycle().cancel());

        expect(editor.lifecycle().automation).toEqual({
            draftText: "Original",
            field: "descriptionAlias",
            originalText: "Original"
        });
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
        expect(editor.onCommitText).not.toHaveBeenCalled();
    });
});
