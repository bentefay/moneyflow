import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
    TransactionGridEditorLifecycleProvider,
    type TransactionGridEditorLifecycle
} from "@/components/features/transactions/cells/editor-lifecycle";
import { InlineEditableAmount } from "@/components/features/transactions/cells/InlineEditableAmount";
import { InlineEditableDate } from "@/components/features/transactions/cells/InlineEditableDate";

function renderWithCapturedLifecycle(children: ReactNode): {
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
            {children}
        </TransactionGridEditorLifecycleProvider>
    );
    return {
        lifecycle: () => {
            if (registeredLifecycle == null) {
                throw new Error("Editor lifecycle is missing");
            }
            return registeredLifecycle;
        }
    };
}

describe("InlineEditableAmount editor lifecycle", () => {
    it("publishes changed and unchanged typed commit results", () => {
        const onSave = vi.fn();
        const editor = renderWithCapturedLifecycle(
            <InlineEditableAmount currency="USD" onSave={onSave} value={1_250} />
        );
        const input = screen.getByRole("textbox", { name: "Transaction amount in USD" });
        fireEvent.focus(input);

        expect(editor.lifecycle().externalExitValidation).toBe("blur");
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
        expect(onSave).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: "15.75" } });
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "changed" });
        expect(onSave).toHaveBeenCalledOnce();
        expect(onSave).toHaveBeenCalledWith(1_575);
    });

    it("rejects malformed drafts before mutation and cancellation restores the value", () => {
        const onSave = vi.fn();
        const editor = renderWithCapturedLifecycle(
            <InlineEditableAmount currency="USD" onSave={onSave} value={1_250} />
        );
        const input = screen.getByRole("textbox", { name: "Transaction amount in USD" });
        fireEvent.focus(input);

        fireEvent.change(input, { target: { value: "invalid" } });
        act(() => {
            expect(editor.lifecycle().commit()).toEqual({ ok: false, status: "rejected" });
        });
        expect(onSave).not.toHaveBeenCalled();
        expect(input).toHaveAttribute("aria-invalid", "true");

        act(() => editor.lifecycle().cancel());
        expect(input).toHaveValue("12.50");
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
    });

    it("captures the result of the exact native blur validation", () => {
        const editor = renderWithCapturedLifecycle(
            <InlineEditableAmount currency="USD" onSave={() => undefined} value={1_250} />
        );
        const lifecycle = editor.lifecycle();
        if (lifecycle.externalExitValidation !== "blur") {
            throw new Error("Amount editor must use blur validation");
        }
        const input = screen.getByRole("textbox", { name: "Transaction amount in USD" });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "invalid" } });

        lifecycle.beginExternalExitValidation();
        expect(lifecycle.readExternalExitValidation()).toBeNull();
        fireEvent.blur(input);
        expect(editor.lifecycle().externalExitValidation).toBe("blur");
        const currentLifecycle = editor.lifecycle();
        if (currentLifecycle.externalExitValidation !== "blur") {
            throw new Error("Amount editor must retain blur validation");
        }
        expect(currentLifecycle.readExternalExitValidation()).toEqual({
            ok: false,
            status: "rejected"
        });
    });
});

describe("InlineEditableDate editor lifecycle", () => {
    it("publishes changed and unchanged typed commit results", () => {
        const onSave = vi.fn();
        const editor = renderWithCapturedLifecycle(
            <InlineEditableDate onSave={onSave} value="2026-01-15" />
        );
        const input = screen.getByRole("textbox");
        fireEvent.focus(input);

        expect(editor.lifecycle().externalExitValidation).toBe("blur");
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
        expect(onSave).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: "1/16/2026" } });
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "changed" });
        expect(onSave).toHaveBeenCalledOnce();
        expect(onSave).toHaveBeenCalledWith("2026-01-16");
    });

    it("rejects malformed drafts before mutation and cancellation restores the value", () => {
        const onSave = vi.fn();
        const editor = renderWithCapturedLifecycle(
            <InlineEditableDate onSave={onSave} value="2026-01-15" />
        );
        const input = screen.getByRole("textbox");
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "not a date" } });

        act(() => {
            expect(editor.lifecycle().commit()).toEqual({ ok: false, status: "rejected" });
        });
        expect(onSave).not.toHaveBeenCalled();
        expect(input).toHaveAttribute("aria-invalid", "true");

        act(() => editor.lifecycle().cancel());
        expect(input).toHaveValue("1/15/2026");
        expect(editor.lifecycle().commit()).toEqual({ ok: true, status: "unchanged" });
    });

    it("captures the result of the exact native blur validation", () => {
        const editor = renderWithCapturedLifecycle(
            <InlineEditableDate onSave={() => undefined} value="2026-01-15" />
        );
        const lifecycle = editor.lifecycle();
        if (lifecycle.externalExitValidation !== "blur") {
            throw new Error("Date editor must use blur validation");
        }
        const input = screen.getByRole("textbox");
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "not a date" } });

        lifecycle.beginExternalExitValidation();
        expect(lifecycle.readExternalExitValidation()).toBeNull();
        fireEvent.blur(input);
        const currentLifecycle = editor.lifecycle();
        if (currentLifecycle.externalExitValidation !== "blur") {
            throw new Error("Date editor must retain blur validation");
        }
        expect(currentLifecycle.readExternalExitValidation()).toEqual({
            ok: false,
            status: "rejected"
        });
    });
});
