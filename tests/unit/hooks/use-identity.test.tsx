import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createIdentity } from "@/lib/crypto/identity";
import { initCrypto } from "@/lib/crypto/keypair";
import { clearSession, getSession } from "@/lib/crypto/session";

const mocks = vi.hoisted(() => ({
    register: vi.fn(),
    getOrCreate: vi.fn(),
    createVault: vi.fn(),
    saveSnapshot: vi.fn(),
    listVaults: vi.fn(),
    invalidateVaultList: vi.fn(),
    ensureDefaultVault: vi.fn(),
    setActiveVaultStorage: vi.fn()
}));

vi.mock("@/lib/trpc", () => ({
    trpc: {
        user: {
            register: { useMutation: () => ({ mutateAsync: mocks.register }) },
            getOrCreate: { useMutation: () => ({ mutateAsync: mocks.getOrCreate }) }
        },
        vault: {
            create: { useMutation: () => ({ mutateAsync: mocks.createVault }) }
        },
        sync: {
            saveSnapshot: { useMutation: () => ({ mutateAsync: mocks.saveSnapshot }) }
        },
        useUtils: () => ({
            vault: { list: { invalidate: mocks.invalidateVaultList } },
            client: { vault: { list: { query: mocks.listVaults } } }
        })
    }
}));

vi.mock("@/lib/vault", () => ({
    ensureDefaultVault: mocks.ensureDefaultVault,
    setActiveVaultStorage: mocks.setActiveVaultStorage
}));

import { useIdentity } from "@/hooks/use-identity";

function createWrapper(queryClient: QueryClient) {
    return function IdentityTestWrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

beforeAll(async () => {
    await initCrypto();
});

beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    localStorage.clear();
    mocks.invalidateVaultList.mockResolvedValue(undefined);
    mocks.ensureDefaultVault.mockResolvedValue({
        vaultId: crypto.randomUUID(),
        name: "My Vault",
        created: true
    });
});

afterEach(() => {
    clearSession();
    localStorage.clear();
});

describe("useIdentity verified registration lifecycle", () => {
    it("establishes signing proof before registration and clears all identity state on failure", async () => {
        const identity = await createIdentity();
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
        });
        queryClient.setQueryData(["previous-identity-vaults"], [{ id: crypto.randomUUID() }]);
        localStorage.setItem(
            "moneyflow_active_vault",
            JSON.stringify({ id: crypto.randomUUID(), name: "Previous Vault" })
        );

        let sessionDuringMutation = null;
        mocks.register.mockImplementation(async () => {
            sessionDuringMutation = getSession();
            throw new Error("registration unavailable");
        });
        mocks.setActiveVaultStorage.mockImplementation((vault) => {
            if (vault == null) localStorage.removeItem("moneyflow_active_vault");
        });

        const { result } = renderHook(() => useIdentity(), {
            wrapper: createWrapper(queryClient)
        });
        await waitFor(() => expect(result.current.status).toBe("locked"));

        await act(async () => {
            await expect(result.current.registerIdentity(identity)).rejects.toThrow(
                "registration unavailable"
            );
        });

        expect(sessionDuringMutation).toMatchObject({ pubkeyHash: identity.pubkeyHash });
        expect(getSession()).toBeNull();
        expect(localStorage.getItem("moneyflow_active_vault")).toBeNull();
        expect(queryClient.getQueryCache().getAll()).toEqual([]);
        expect(result.current.status).toBe("locked");
        expect(result.current.session).toBeNull();
        expect(result.current.pubkeyHash).toBeNull();
        expect(result.current.isNewUser).toBe(false);
    });

    it("keeps the page-facing new-user contract after verified registration succeeds", async () => {
        const identity = await createIdentity();
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
        });
        let sessionDuringMutation = null;
        mocks.register.mockImplementation(async () => {
            sessionDuringMutation = getSession();
            return { success: true, isNew: true };
        });

        const { result } = renderHook(() => useIdentity(), {
            wrapper: createWrapper(queryClient)
        });
        await waitFor(() => expect(result.current.status).toBe("locked"));

        await act(async () => {
            await result.current.registerIdentity(identity);
        });

        expect(sessionDuringMutation).toMatchObject({ pubkeyHash: identity.pubkeyHash });
        expect(result.current.status).toBe("unlocked");
        expect(result.current.pubkeyHash).toBe(identity.pubkeyHash);
        expect(result.current.isNewUser).toBe(true);
    });

    it("gives the legacy create journey proof-before-access and the same failure cleanup", async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
        });
        queryClient.setQueryData(["previous-user"], { private: "cached" });
        let sessionDuringMutation = null;
        mocks.register.mockImplementation(async () => {
            sessionDuringMutation = getSession();
            throw new Error("legacy registration unavailable");
        });

        const { result } = renderHook(() => useIdentity(), {
            wrapper: createWrapper(queryClient)
        });
        await waitFor(() => expect(result.current.status).toBe("locked"));

        await act(async () => {
            await expect(result.current.createNew()).rejects.toThrow(
                "legacy registration unavailable"
            );
        });

        expect(sessionDuringMutation).toMatchObject({
            pubkeyHash: expect.stringMatching(/^[a-f0-9]{64}$/)
        });
        expect(getSession()).toBeNull();
        expect(queryClient.getQueryCache().getAll()).toEqual([]);
        expect(result.current.status).toBe("locked");
        expect(result.current.session).toBeNull();
        expect(result.current.isNewUser).toBe(false);
    });

    it("preserves the existing-seed unlock journey with verified self-only input", async () => {
        const identity = await createIdentity();
        clearSession();
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
        });
        let sessionDuringMutation = null;
        mocks.getOrCreate.mockImplementation(async () => {
            sessionDuringMutation = getSession();
            return {
                isNew: false,
                encryptedData: null,
                updatedAt: "2026-07-20T00:00:00.000Z"
            };
        });

        const { result } = renderHook(() => useIdentity(), {
            wrapper: createWrapper(queryClient)
        });
        await waitFor(() => expect(result.current.status).toBe("locked"));

        await act(async () => {
            await result.current.unlock(identity.mnemonic);
        });

        expect(sessionDuringMutation).toMatchObject({ pubkeyHash: identity.pubkeyHash });
        expect(mocks.getOrCreate).toHaveBeenCalledWith({});
        expect(result.current.status).toBe("unlocked");
        expect(result.current.pubkeyHash).toBe(identity.pubkeyHash);
        expect(result.current.isNewUser).toBe(false);
    });
});
