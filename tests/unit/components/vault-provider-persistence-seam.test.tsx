/**
 * `VaultProvider` must publish the durability seam the E2E harness navigates behind.
 *
 * The seam has exactly one install site — a single `useEffect` in `VaultProvider` — and no
 * application code reads it, so before this test an unrelated refactor could drop that line with
 * every gate still green while the harness barrier degraded to a no-op and the measured lost-write
 * class returned. This asserts the invariant the harness depends on: mounting the provider publishes
 * the seam, unmounting removes it, and the published seam is wired to the provider's own manager
 * rather than to a stub — before a vault exists it reports `no-active-vault` rather than claiming it
 * waited.
 *
 * The render deliberately stops at the provider's loading state. The install effect is declared
 * ahead of the initialization effect precisely so that it does not depend on a vault, and a test
 * that needed a decrypted vault to reach it would be testing something weaker.
 */

import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActiveVaultProvider } from "@/components/providers/active-vault-provider";
import { VaultProvider } from "@/components/providers/vault-provider";
import { SyncStatusProvider } from "@/hooks/use-sync-status";

vi.mock("next/navigation", () => ({
    usePathname: () => "/transactions",
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() })
}));

// The provider fetches the vault list on mount. Nothing here needs a vault — the seam is published
// before that query can resolve — but the query must not reach the network.
vi.mock("@/lib/trpc/client", () => ({
    createTRPCClient: vi.fn(),
    trpc: {
        useUtils: () => ({ client: { sync: {} } }),
        vault: { list: { useQuery: () => ({ data: undefined, error: null }) } }
    }
}));

afterEach(() => {
    delete window.__moneyflowLocalPersistence;
});

function renderVaultProvider() {
    return render(
        <ActiveVaultProvider>
            <SyncStatusProvider>
                <VaultProvider>
                    <div />
                </VaultProvider>
            </SyncStatusProvider>
        </ActiveVaultProvider>
    );
}

describe("VaultProvider local-persistence seam", () => {
    it("publishes the seam on mount and removes it on unmount", () => {
        const { unmount } = renderVaultProvider();

        expect(window.__moneyflowLocalPersistence).toBeDefined();

        unmount();
        expect(window.__moneyflowLocalPersistence).toBeUndefined();
    });

    it("wires the published seam to the provider's own manager", async () => {
        renderVaultProvider();

        const seam = window.__moneyflowLocalPersistence;
        expect(seam).toBeDefined();
        await expect(seam?.awaitLocalPersistence()).resolves.toBe("no-active-vault");
    });
});
