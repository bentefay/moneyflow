import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AccountCombobox } from "@/components/features/accounts/AccountCombobox";
import { AccountTab, type AccountTabAccount } from "@/components/features/import/tabs/AccountTab";
import {
    TransactionGridEditorLifecycleProvider,
    type TransactionGridEditorLifecycle
} from "@/components/features/transactions/cells/editor-lifecycle";

vi.mock("@/components/features/accounts/CreateAccountDialog", () => ({
    CreateAccountDialog: () => null
}));

const accounts = [
    { id: "checking", name: "Checking" },
    { id: "savings", name: "Savings" },
    { id: "credit", name: "Credit" }
] as const;

const importAccounts = [
    {
        id: "checking",
        name: "Checking",
        accountNumber: undefined,
        currency: "USD",
        deletedAt: undefined
    },
    {
        id: "savings",
        name: "Savings",
        accountNumber: undefined,
        currency: "USD",
        deletedAt: undefined
    }
] satisfies AccountTabAccount[];

beforeAll(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

afterAll(() => vi.unstubAllGlobals());

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

async function selectAccount(name: string): Promise<void> {
    fireEvent.click(screen.getByRole("combobox", { name: "Select account" }));
    fireEvent.click(await screen.findByRole("option", { name }));
}

describe("AccountCombobox commit ownership", () => {
    it("publishes an existing option through the import Account parent", async () => {
        const onSelectAccount = vi.fn();
        render(
            <AccountTab
                accounts={importAccounts}
                selectedAccountId="checking"
                onSelectAccount={onSelectAccount}
            />
        );

        await selectAccount("Savings");

        expect(onSelectAccount).toHaveBeenCalledOnce();
        expect(onSelectAccount).toHaveBeenCalledWith("savings");
    });

    it("publishes an existing option immediately for a standalone consumer", async () => {
        const onChange = vi.fn();
        render(
            <AccountCombobox
                commitMode="immediate"
                value="checking"
                accounts={accounts}
                onChange={onChange}
            />
        );

        await selectAccount("Savings");

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith("savings");
    });

    it("adopts an external controlled value before a deferred editor can commit stale state", () => {
        const onChange = vi.fn();
        let lifecycle: TransactionGridEditorLifecycle | null = null;
        const register = (nextLifecycle: TransactionGridEditorLifecycle) => {
            lifecycle = nextLifecycle;
            return () => {
                if (lifecycle === nextLifecycle) lifecycle = null;
            };
        };
        const renderPicker = (value: string) => (
            <TransactionGridEditorLifecycleProvider
                register={register}
                registerPortal={() => undefined}
                isPortalTargetOwned={() => false}
            >
                <AccountCombobox
                    commitMode="deferred"
                    value={value}
                    accounts={accounts}
                    onChange={onChange}
                />
            </TransactionGridEditorLifecycleProvider>
        );
        const { rerender } = render(renderPicker("checking"));

        rerender(renderPicker("savings"));
        act(() => {
            lifecycle?.commit();
        });

        expect(screen.getByRole("combobox", { name: "Select account" })).toHaveTextContent(
            "Savings"
        );
        expect(onChange).not.toHaveBeenCalled();
    });

    it("preserves a genuinely dirty deferred draft across an external value change", async () => {
        const onChange = vi.fn();
        let lifecycle: TransactionGridEditorLifecycle | null = null;
        const register = (nextLifecycle: TransactionGridEditorLifecycle) => {
            lifecycle = nextLifecycle;
            return () => {
                if (lifecycle === nextLifecycle) lifecycle = null;
            };
        };
        const renderPicker = (value: string) => (
            <TransactionGridEditorLifecycleProvider
                register={register}
                registerPortal={() => undefined}
                isPortalTargetOwned={() => false}
            >
                <AccountCombobox
                    commitMode="deferred"
                    value={value}
                    accounts={accounts}
                    onChange={onChange}
                />
            </TransactionGridEditorLifecycleProvider>
        );
        const { rerender } = render(renderPicker("checking"));
        await selectAccount("Savings");
        expect(onChange).not.toHaveBeenCalled();

        rerender(renderPicker("credit"));
        act(() => {
            lifecycle?.commit();
        });

        expect(screen.getByRole("combobox", { name: "Select account" })).toHaveTextContent(
            "Savings"
        );
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith("savings");
    });

    it("cancels a dirty deferred draft back to the latest controlled value", async () => {
        const onChange = vi.fn();
        let lifecycle: TransactionGridEditorLifecycle | null = null;
        const register = (nextLifecycle: TransactionGridEditorLifecycle) => {
            lifecycle = nextLifecycle;
            return () => {
                if (lifecycle === nextLifecycle) lifecycle = null;
            };
        };
        const renderPicker = (value: string) => (
            <TransactionGridEditorLifecycleProvider
                register={register}
                registerPortal={() => undefined}
                isPortalTargetOwned={() => false}
            >
                <AccountCombobox
                    commitMode="deferred"
                    value={value}
                    accounts={accounts}
                    onChange={onChange}
                />
            </TransactionGridEditorLifecycleProvider>
        );
        const { rerender } = render(renderPicker("checking"));
        await selectAccount("Savings");
        rerender(renderPicker("credit"));

        act(() => lifecycle?.cancel());

        expect(screen.getByRole("combobox", { name: "Select account" })).toHaveTextContent(
            "Credit"
        );
        expect(onChange).not.toHaveBeenCalled();
    });
});
