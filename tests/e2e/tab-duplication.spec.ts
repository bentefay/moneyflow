import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, chromium, test } from "@playwright/test";

import { readActiveVaultId } from "./helpers";

function countFixtureVaultOps(vaultId: string): number {
    if (
        !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            vaultId
        )
    ) {
        throw new Error("Duplicate-tab fixture vault ID is invalid");
    }
    let output: string;
    try {
        output = execFileSync(
            "docker",
            [
                "exec",
                "supabase_db_moneyflow",
                "psql",
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-X",
                "-q",
                "-A",
                "-t",
                "-c",
                `SELECT count(*)::integer FROM public.vault_ops WHERE vault_id = '${vaultId}'::uuid;`
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
        );
    } catch {
        throw new Error("Duplicate-tab fixture operation query failed");
    }
    const count = Number(output.trim());
    if (!Number.isInteger(count)) {
        throw new Error("Duplicate-tab fixture operation count is invalid");
    }
    return count;
}

test("a browser-duplicated tab hydrates onboarding and an authenticated vault", async () => {
    test.setTimeout(60000);

    const profilePath = await mkdtemp(path.join(tmpdir(), "moneyflow-tab-duplication-"));
    const extensionPath = path.resolve("tests/fixtures/tab-duplicator");
    const context = await chromium.launchPersistentContext(profilePath, {
        headless: true,
        channel: "chromium",
        args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
    });

    const duplicateTab = async (source: import("@playwright/test").Page) => {
        const opened = context.waitForEvent("page");
        await source.evaluate(() => window.postMessage({ type: "moneyflow:duplicate-tab" }, "*"));
        const duplicate = await opened;
        await duplicate.waitForLoadState("load");
        return duplicate;
    };

    const expectCachedDuplicate = async (page: import("@playwright/test").Page) => {
        await expect
            .poll(() =>
                page.evaluate(() => {
                    const navigation = performance.getEntriesByType(
                        "navigation"
                    )[0] as PerformanceNavigationTiming & { deliveryType: string };
                    return {
                        type: navigation.type,
                        deliveryType: navigation.deliveryType,
                        transferSize: navigation.transferSize
                    };
                })
            )
            .toEqual({ type: "back_forward", deliveryType: "cache", transferSize: 0 });
    };

    try {
        const original = context.pages()[0] ?? (await context.newPage());
        await original.goto("http://localhost:3000/new-user");
        await expect(original.getByTestId("generate-button")).toBeEnabled();

        // This invokes chrome.tabs.duplicate(), the same browser operation as Duplicate Tab.
        // window.open() is not equivalent: it performs a fresh navigation and did not reproduce
        // the cached Next.js development bootstrap that originally lost hydration.
        const onboardingDuplicate = await duplicateTab(original);
        await expectCachedDuplicate(onboardingDuplicate);
        await expect(onboardingDuplicate.getByTestId("generate-button")).toBeEnabled();

        await onboardingDuplicate.getByTestId("generate-button").click();
        await expect(onboardingDuplicate.getByTestId("seed-phrase-word").first()).toBeVisible();
        await onboardingDuplicate.getByTestId("confirm-checkbox").check();
        await onboardingDuplicate.getByTestId("continue-button").click();
        await onboardingDuplicate.waitForURL("**/settings", { timeout: 15000 });
        await expect(
            onboardingDuplicate.getByRole("heading", { name: "Vault Settings", level: 1 })
        ).toBeVisible({ timeout: 15000 });

        const authenticatedDuplicate = await duplicateTab(onboardingDuplicate);
        await expectCachedDuplicate(authenticatedDuplicate);
        await expect(
            authenticatedDuplicate.getByRole("heading", { name: "Vault Settings", level: 1 })
        ).toBeVisible({ timeout: 15000 });
        await expect(
            authenticatedDuplicate.getByRole("textbox", { name: "Vault Name" })
        ).toBeEnabled();

        const browserErrors: string[] = [];
        for (const page of [onboardingDuplicate, authenticatedDuplicate]) {
            page.on("console", (message) => {
                if (message.type() === "error") browserErrors.push(message.text());
            });
            page.on("pageerror", (error) => browserErrors.push(error.message));
        }
        let receiverPushOps = 0;
        onboardingDuplicate.on("request", (request) => {
            if (new URL(request.url()).pathname.includes("/api/trpc/sync.pushOps")) {
                receiverPushOps += 1;
            }
        });

        await onboardingDuplicate.goto("http://localhost:3000/transactions");
        await authenticatedDuplicate.goto("http://localhost:3000/transactions");
        await expect(onboardingDuplicate.getByTestId("transaction-table-toolbar")).toBeVisible({
            timeout: 15_000
        });
        await expect(authenticatedDuplicate.getByTestId("transaction-table-toolbar")).toBeVisible({
            timeout: 15_000
        });
        await expect(onboardingDuplicate.getByRole("status", { name: "Saved" })).toBeVisible({
            timeout: 15_000
        });
        await expect(authenticatedDuplicate.getByRole("status", { name: "Saved" })).toBeVisible({
            timeout: 15_000
        });

        const vaultId = await readActiveVaultId(onboardingDuplicate);
        expect(countFixtureVaultOps(vaultId)).toBe(0);
        const receiverPushBaseline = receiverPushOps;
        const description = "Duplicate tab live sync";

        await authenticatedDuplicate.getByTestId("add-transaction-button").click();
        const addedRow = authenticatedDuplicate.getByRole("row", { selected: true });
        const descriptionInput = addedRow.getByTestId("description-editable");
        await descriptionInput.fill(description);
        await descriptionInput.press("Enter");
        const amountInput = addedRow.getByTestId("amount-editable");
        await amountInput.fill("12.34");
        await amountInput.press("Enter");

        const matchingRows = (page: import("@playwright/test").Page) =>
            page.getByTestId("transaction-row").filter({
                has: page.locator(`[data-testid="description-editable"][value="${description}"]`)
            });
        await expect(matchingRows(authenticatedDuplicate)).toHaveCount(1, { timeout: 15_000 });
        await expect(matchingRows(onboardingDuplicate)).toHaveCount(1, { timeout: 15_000 });
        await expect(authenticatedDuplicate.getByRole("status", { name: "Saved" })).toBeVisible({
            timeout: 15_000
        });
        await expect(onboardingDuplicate.getByRole("status", { name: "Saved" })).toBeVisible({
            timeout: 15_000
        });
        // Persisted Add, description-alias edit and amount edit are three ordinary user actions.
        expect(countFixtureVaultOps(vaultId)).toBe(3);
        expect(receiverPushOps - receiverPushBaseline).toBe(0);
        expect(browserErrors).toEqual([]);
    } finally {
        await context.close();
        await rm(profilePath, { recursive: true, force: true });
    }
});
