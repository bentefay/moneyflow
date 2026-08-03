/**
 * E2E Test: Onboarding Creates + Selects Vault
 */

import { type Browser, type Page, expect, test } from "@playwright/test";

import { createNewIdentity, goToAccounts, goToSettings, goToTags, reloadPage } from "./helpers";

test.describe("Onboarding", () => {
    test("creates and selects a vault as part of onboarding", async ({ page }) => {
        const trpcRequests: Array<{ method: string; url: string; body: string | null }> = [];
        page.on("request", (request) => {
            if (request.url().includes("/api/trpc/")) {
                trpcRequests.push({
                    method: request.method(),
                    url: request.url(),
                    body: request.postData()
                });
            }
        });

        await test.step("create identity with automatic vault creation", async () => {
            await createNewIdentity(page);
        });

        await test.step("verify vault is created and selected", async () => {
            // If a vault is created+selected correctly, Tags should render the table (not the empty state)
            await goToTags(page);

            await expect(page.getByRole("button", { name: /add tag/i })).toBeVisible();
            await expect(page.getByText(/no vault selected/i)).not.toBeVisible();

            // The vault selector should no longer show the placeholder label.
            await expect(page.getByRole("button", { name: /select vault/i })).not.toBeVisible();
        });

        await test.step("verify authenticated input uses signed POST bodies, never URLs", async () => {
            expect(trpcRequests.length).toBeGreaterThan(0);
            for (const request of trpcRequests) {
                const url = new URL(request.url);
                expect(request.method).toBe("POST");
                expect(url.searchParams.has("input")).toBe(false);
                expect(url.href).not.toContain("pubkeyHash");
                expect(url.href).not.toContain("vaultId");
                expect(url.href).not.toContain("versionVector");
                expect(url.href).not.toContain("hasUnpushed");
            }

            const registration = trpcRequests.find((request) =>
                new URL(request.url).pathname.includes("user.register")
            );
            expect(registration?.body).toBeTruthy();
            expect(registration?.body).not.toContain("pubkeyHash");
            expect(registration?.body).not.toContain("encryptedData");

            const removedUserStateRequests = trpcRequests.filter((request) =>
                /user\.(?:exists|getData|upsertData)/.test(new URL(request.url).pathname)
            );
            expect(removedUserStateRequests).toEqual([]);
        });
    });

    test("failed registration leaves no signing session, selected vault, or unlocked state", async ({
        page
    }) => {
        await page.route("**/api/trpc/user.register?*", async (route) => {
            await route.abort("connectionfailed");
        });

        await page.goto("/new-user");
        await page.getByTestId("generate-button").click();
        await page.getByTestId("seed-phrase-word").first().waitFor({ state: "visible" });
        await page.getByTestId("confirm-checkbox").check();
        await page.getByTestId("continue-button").click();

        await expect(
            page.getByRole("alert").filter({ hasText: "Unable to create account" })
        ).toBeVisible();
        await expect(page.getByTestId("continue-button")).toBeEnabled();
        await expect(page).toHaveURL(/\/new-user$/);

        const retainedIdentityState = await page.evaluate(() => ({
            signingSession: sessionStorage.getItem("moneyflow_session"),
            activeVault: localStorage.getItem("moneyflow_active_vault")
        }));
        expect(retainedIdentityState).toEqual({ signingSession: null, activeVault: null });

        await page.goto("/settings");
        await expect(page).toHaveURL(/\/unlock$/);
    });

    test("account creation submits the recovery credential so a manager can offer to save it", async ({
        page
    }) => {
        const requestTraces: string[] = [];
        page.on("request", (request) => {
            requestTraces.push(`${request.url()} ${request.postData() ?? ""}`);
        });

        await page.goto("/new-user");
        await page.getByTestId("generate-button").click();
        await page.getByTestId("seed-phrase-word").first().waitFor({ state: "visible" });

        const credential = page.getByTestId("recovery-phrase-credential");
        const generatedPhrase = await credential.inputValue();
        expect(generatedPhrase.split(" ")).toHaveLength(12);

        await test.step("the create-account control submits the credential form", async () => {
            const submitsCredentialForm = await page
                .getByTestId("continue-button")
                .evaluate((button, credentialTestId) => {
                    const element = button as HTMLButtonElement;
                    const credentialField = document.querySelector<HTMLInputElement>(
                        `[data-testid="${credentialTestId}"]`
                    );
                    return (
                        element.type === "submit" &&
                        !!element.form &&
                        element.form === credentialField?.form
                    );
                }, "recovery-phrase-credential");

            expect(submitsCredentialForm).toBe(true);
        });

        await test.step("explicit confirmation is still required", async () => {
            await expect(page.getByTestId("continue-button")).toBeDisabled();
            await page.getByTestId("confirm-checkbox").check();
            await expect(page.getByTestId("continue-button")).toBeEnabled();
        });

        await test.step("submitting completes registration without a page reload", async () => {
            await page.getByTestId("continue-button").click();
            await page.waitForURL("**/settings", { timeout: 15000 });
        });

        await test.step("the generated phrase never left the client", () => {
            for (const trace of requestTraces) {
                expect(trace).not.toContain(generatedPhrase);
            }
        });

        await test.step("the credential form is gone once creation succeeds", async () => {
            // Chromium arms its save prompt when the interacted form becomes unreachable after a
            // successful request, so the credential form must not survive onto the next screen.
            await expect(page.getByTestId("recovery-phrase-credential")).toHaveCount(0);
        });
    });

    test("new vault has default person and account with ownership", async ({ page }) => {
        await test.step("create identity with automatic vault creation", async () => {
            await createNewIdentity(page);
        });

        await test.step("verify default account has Me as 100% owner", async () => {
            await goToAccounts(page);

            // Default account should exist and show "Me (100%)" as owner
            await expect(page.getByText("Default", { exact: true })).toBeVisible();
            await expect(page.getByText("Me (100%)")).toBeVisible();
        });
    });
});

test.describe("Currency Detection", () => {
    /**
     * Reads the currency code shown in the vault settings currency selector.
     * The button renders the code and the name; the code is the font-mono span.
     */
    async function readDefaultCurrency(page: Page): Promise<string> {
        const currencySelector = page.getByRole("combobox", { name: "Default currency" });
        await expect(currencySelector).toBeVisible();
        return (await currencySelector.locator(".font-mono").textContent())?.trim() ?? "";
    }

    /**
     * Creates an identity in a context with the given time zone and locale, then
     * returns the default currency the new vault was created with.
     */
    async function detectedCurrencyFor(
        browser: Browser,
        options: { timezoneId: string; locale: string }
    ): Promise<string> {
        const context = await browser.newContext(options);
        const page = await context.newPage();
        try {
            await createNewIdentity(page);
            await goToSettings(page);
            return await readDefaultCurrency(page);
        } finally {
            await context.close();
        }
    }

    test("time zone decides the default currency, overriding a conflicting locale", async ({
        browser
    }) => {
        // The reported defect: LANG=en_US.UTF-8 is the default on most Linux
        // installs and container images, so a user in Brisbane was defaulted to USD.
        const detected = await detectedCurrencyFor(browser, {
            timezoneId: "Australia/Brisbane",
            locale: "en-US"
        });

        expect(detected).toBe("AUD");
    });

    test("a country-less time zone falls back to the locale", async ({ browser }) => {
        // Containers and VMs commonly report UTC, which belongs to no country.
        const detected = await detectedCurrencyFor(browser, {
            timezoneId: "UTC",
            locale: "en-GB"
        });

        expect(detected).toBe("GBP");
    });

    test("neither signal resolving falls back to the default currency", async ({ browser }) => {
        // UTC yields no country and a region-less locale yields no region.
        const detected = await detectedCurrencyFor(browser, {
            timezoneId: "UTC",
            locale: "en"
        });

        expect(detected).toBe("USD");
    });

    test("the inferred currency is a default the user can change, and the change persists", async ({
        browser
    }) => {
        const context = await browser.newContext({
            timezoneId: "Australia/Brisbane",
            locale: "en-US"
        });
        const page = await context.newPage();

        try {
            await test.step("the inferred default is presented after vault creation", async () => {
                await createNewIdentity(page);
                await goToSettings(page);
                expect(await readDefaultCurrency(page)).toBe("AUD");
            });

            await test.step("the user can change it to something else", async () => {
                await page.getByRole("combobox", { name: "Default currency" }).click();

                const search = page.getByPlaceholder(/search currencies/i);
                await search.waitFor({ state: "visible" });
                await search.fill("JPY");
                await page.getByRole("option", { name: /JPY/ }).first().click();
                await expect(search).not.toBeVisible();

                expect(await readDefaultCurrency(page)).toBe("JPY");
            });

            await test.step("the change survives a reload, so it is not silently relocked", async () => {
                await reloadPage(page);
                expect(await readDefaultCurrency(page)).toBe("JPY");
            });
        } finally {
            await context.close();
        }
    });
});
