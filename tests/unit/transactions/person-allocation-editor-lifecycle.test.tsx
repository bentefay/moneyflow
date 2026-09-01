import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    TransactionGridEditorLifecycleProvider,
    type TransactionGridEditorLifecycle
} from "@/components/features/transactions/cells/editor-lifecycle";
import {
    PersonAllocationCell,
    type PersonAllocationCellProps
} from "@/components/features/transactions/cells/PersonAllocationCell";

function renderAllocationEditor(props: PersonAllocationCellProps): {
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
            <PersonAllocationCell {...props} />
        </TransactionGridEditorLifecycleProvider>
    );
    return {
        lifecycle: () => {
            if (registeredLifecycle == null) {
                throw new Error("Allocation editor lifecycle is missing");
            }
            return registeredLifecycle;
        }
    };
}

const baseProps = {
    allocations: { "person-a": 25, "person-b": 75 },
    explicitValue: 25,
    personId: "person-a",
    personLabel: "Alex",
    startEditing: true
} satisfies PersonAllocationCellProps;

describe("PersonAllocationCell editor lifecycle", () => {
    it("publishes the full allocation context and changed commit result", () => {
        const onCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderAllocationEditor({ ...baseProps, onCommit });
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "40" }
        });

        expect(editor.lifecycle().automation).toEqual({
            draft: { personId: "person-a", text: "40" },
            field: "allocation",
            originalAllocations: { "person-a": 25, "person-b": 75 }
        });
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "changed" });
        expect(onCommit).toHaveBeenCalledOnce();
        expect(onCommit).toHaveBeenCalledWith("person-a", 40);
    });

    it("retains a valid changed draft when the persistence boundary rejects", () => {
        const onCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_FAILURE);
        const editor = renderAllocationEditor({ ...baseProps, onCommit });
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "40" }
        });

        expect(editor.lifecycle().commit()).toEqual({ ok: false, status: "rejected" });
        expect(onCommit).toHaveBeenCalledWith("person-a", 40);
        expect(editor.lifecycle().automation).toEqual({
            draft: { personId: "person-a", text: "40" },
            field: "allocation",
            originalAllocations: { "person-a": 25, "person-b": 75 }
        });
    });

    it("rejects a changed allocation when no persistence callback exists", () => {
        const editor = renderAllocationEditor(baseProps);
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "40" }
        });

        expect(editor.lifecycle().commit()).toEqual({ ok: false, status: "rejected" });
    });

    it("sends zero to persistence when repairing a malformed stored allocation", () => {
        const onCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderAllocationEditor({
            ...baseProps,
            allocations: { "person-a": "malformed", "person-b": 75 },
            explicitValue: "malformed",
            onCommit
        });
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "0" }
        });

        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "changed" });
        expect(onCommit).toHaveBeenCalledOnce();
        expect(onCommit).toHaveBeenCalledWith("person-a", 0);
    });

    it("suppresses an unchanged allocation write", () => {
        const onCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderAllocationEditor({ ...baseProps, onCommit });

        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
        expect(onCommit).not.toHaveBeenCalled();
    });

    it("rejects an invalid allocation before mutation and retains the raw draft", () => {
        const onCommit = vi.fn(() => TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS);
        const editor = renderAllocationEditor({ ...baseProps, onCommit });
        fireEvent.change(screen.getByRole("textbox", { name: "Alex allocation percentage" }), {
            target: { value: "101" }
        });

        expect(editor.lifecycle().automation).toEqual({
            draft: { personId: "person-a", text: "101" },
            field: "allocation",
            originalAllocations: { "person-a": 25, "person-b": 75 }
        });
        act(() => {
            expect(editor.lifecycle().commit()).toEqual({ ok: false, status: "rejected" });
        });
        expect(onCommit).not.toHaveBeenCalled();
        expect(screen.getByRole("textbox", { name: "Alex allocation percentage" })).toHaveAttribute(
            "aria-invalid",
            "true"
        );
    });
});
