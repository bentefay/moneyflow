import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, chromium, test } from "@playwright/test";

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
    } finally {
        await context.close();
        await rm(profilePath, { recursive: true, force: true });
    }
});
