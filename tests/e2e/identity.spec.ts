/**
 * E2E Test: Identity & Authentication Journeys
 *
 * Journey-style tests covering the complete identity creation and unlock flows.
 * Uses test.step() to break complex flows into logical sections.
 */

import { expect, type Page, test } from "@playwright/test";

import { waitForUnlockHydration } from "./helpers";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Extract seed phrase words from the display component.
 * Automatically reveals the phrase if hidden.
 */
async function extractSeedPhrase(page: Page): Promise<string[]> {
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

    // Check if words are hidden and reveal if needed
    const revealOverlay = page.locator("text=Click to reveal your recovery phrase");
    if (await revealOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await revealOverlay.click();
        // Wait for reveal animation to complete by checking first word is visible
        await page
            .locator('[data-testid="seed-phrase-word"]')
            .first()
            .waitFor({ state: "visible" });
    }

    const wordElements = await page.$$('[data-testid="seed-phrase-word"]');
    const words: string[] = [];

    for (const element of wordElements) {
        const text = await element.textContent();
        if (text) {
            const word = text.replace(/^\d+\.\s*/, "").trim();
            words.push(word);
        }
    }

    return words;
}

/**
 * Enter seed phrase into the unlock inputs.
 */
async function enterSeedPhrase(page: Page, words: string[]): Promise<void> {
    // The slots are controlled inputs with no hydration gate of their own, so a fill that lands
    // before hydration is dropped and the next render clears it. See waitForUnlockHydration.
    await waitForUnlockHydration(page);

    for (let i = 0; i < words.length; i++) {
        const input = page.locator(`[data-testid="seed-word-input-${i}"]`);
        await input.fill(words[i]);
    }
}

/** Complete account creation from the new-user intro and return the selected vault ID. */
async function createAccountFromIntro(page: Page): Promise<string> {
    await page.getByTestId("generate-button").click();
    await page.getByTestId("seed-phrase-word").first().waitFor({ state: "visible" });
    await page.getByTestId("confirm-checkbox").check();
    await page.getByTestId("continue-button").click();

    await page.waitForURL("**/settings", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Vault Settings", level: 1 })).toBeVisible({
        timeout: 15000
    });

    return page.evaluate(() => {
        const stored = localStorage.getItem("moneyflow_active_vault");
        if (!stored) throw new Error("No active vault was stored after onboarding");
        return (JSON.parse(stored) as { id: string }).id;
    });
}

// ============================================================================
// Journey Tests
// ============================================================================

test.describe("Identity", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            sessionStorage.clear();
            localStorage.clear();
        });
    });

    test("new user journey: generate seed phrase, confirm, and access settings", async ({
        page,
        context
    }) => {
        // Grant clipboard permissions for copy test
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);

        let seedPhrase: string[] = [];

        await test.step("navigate to new user page and see intro", async () => {
            await page.goto("/new-user");

            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
            await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();
            await expect(
                page.getByRole("link", { name: /unlock|sign in|existing/i })
            ).toBeVisible();
        });

        await test.step("generate 12-word seed phrase", async () => {
            const generateButton = page.locator('[data-testid="generate-button"]');

            // Button is disabled until React hydration completes (via useIsHydrated hook).
            // Playwright's click() auto-waits for enabled state.
            await generateButton.click();

            // Wait for the step to change: seed phrase appears
            await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 20000 });

            seedPhrase = await extractSeedPhrase(page);
            expect(seedPhrase.length).toBe(12);

            // Each word should be a valid BIP39 word (at least 3 chars)
            for (const word of seedPhrase) {
                expect(word.length).toBeGreaterThanOrEqual(3);
            }
        });

        await test.step("copy seed phrase to clipboard", async () => {
            const copyButton = page.locator('[data-testid="copy-button"]');
            await copyButton.click();

            const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
            const clipboardWords = clipboardText.trim().split(/\s+/);
            expect(clipboardWords.length).toBe(12);
        });

        await test.step("require confirmation before continuing", async () => {
            const continueButton = page.locator('[data-testid="continue-button"]');
            await expect(continueButton).toBeDisabled();

            const checkbox = page.locator('[data-testid="confirm-checkbox"]');
            await checkbox.check();

            await expect(continueButton).toBeEnabled();
        });

        await test.step("complete creation and redirect to settings", async () => {
            const continueButton = page.locator('[data-testid="continue-button"]');
            await continueButton.click();

            // New users land on settings page after vault creation
            await page.waitForURL("**/settings", { timeout: 15000 });
        });
    });

    test("creating another account in the same tab does not reuse the previous vault", async ({
        page
    }) => {
        const consoleErrors: string[] = [];
        page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
        });

        await page.goto("/new-user");
        const firstVaultId = await createAccountFromIntro(page);

        // Start another onboarding flow in the same tab without clearing browser storage.
        // The next identity must not receive the first keypair's persisted vault selection.
        await page.goto("/new-user");
        await expect(page.getByTestId("generate-button")).toBeVisible();
        const secondVaultId = await createAccountFromIntro(page);

        expect(secondVaultId).not.toBe(firstVaultId);
        expect(consoleErrors.some((message) => message.includes("Key unwrap failed"))).toBe(false);
    });

    test("stale active-vault storage is repaired for the current identity", async ({ page }) => {
        await page.goto("/new-user");
        const expectedVaultId = await createAccountFromIntro(page);

        await page.evaluate(() => {
            localStorage.setItem(
                "moneyflow_active_vault",
                JSON.stringify({ id: "vault-from-a-different-identity" })
            );
        });
        await page.reload();

        await expect(page.getByRole("heading", { name: "Vault Settings", level: 1 })).toBeVisible({
            timeout: 15000
        });
        const repairedVaultId = await page.evaluate(() => {
            const stored = localStorage.getItem("moneyflow_active_vault");
            return stored ? (JSON.parse(stored) as { id: string }).id : null;
        });
        expect(repairedVaultId).toBe(expectedVaultId);
    });

    test("onboarding loads from the server when IndexedDB is blocked", async ({
        page,
        context
    }) => {
        const blocker = await context.newPage();
        const deleter = await context.newPage();
        let vaultListResponseAt: number | undefined;
        let snapshotRequestAt: number | undefined;

        page.on("response", (response) => {
            if (response.url().includes("/api/trpc/vault.list")) {
                vaultListResponseAt = Date.now();
            }
        });
        page.on("request", (request) => {
            if (request.url().includes("/api/trpc/sync.getSnapshot")) {
                snapshotRequestAt ??= Date.now();
            }
        });

        try {
            await blocker.goto("/");
            await blocker.evaluate(
                () =>
                    new Promise<void>((resolve, reject) => {
                        const request = indexedDB.open("moneyflow-vault", 1);
                        request.onupgradeneeded = () => {
                            const db = request.result;
                            const ops = db.createObjectStore("ops", { keyPath: "id" });
                            ops.createIndex("by-vault", "vault_id");
                            ops.createIndex("by-vault-pushed", ["vault_id", "pushed"]);
                            ops.createIndex("by-vault-created", ["vault_id", "created_at"]);
                            db.createObjectStore("snapshots", { keyPath: "vault_id" });
                            db.createObjectStore("sync_meta", { keyPath: "key" });
                        };
                        request.onsuccess = () => {
                            (
                                globalThis as typeof globalThis & { blockingDb?: IDBDatabase }
                            ).blockingDb = request.result;
                            resolve();
                        };
                        request.onerror = () => reject(request.error);
                    })
            );

            // Queue a deletion behind the open connection. Further database opens now wait
            // indefinitely unless the app bounds local-cache startup and falls back to Supabase.
            await deleter.goto("/");
            await deleter.evaluate(() => {
                (
                    globalThis as typeof globalThis & { pendingDelete?: IDBOpenDBRequest }
                ).pendingDelete = indexedDB.deleteDatabase("moneyflow-vault");
            });

            await page.goto("/new-user");
            await createAccountFromIntro(page);
            await expect(
                page.getByRole("heading", { name: "Vault Settings", level: 1 })
            ).toBeVisible();

            expect(vaultListResponseAt).toBeDefined();
            expect(snapshotRequestAt).toBeDefined();
            expect(snapshotRequestAt! - vaultListResponseAt!).toBeLessThan(1000);

            // Degraded mode must remain writable: when IndexedDB is unavailable, CRDT updates
            // are retained in memory and sent directly to the server.
            const pushedUpdate = page.waitForResponse(
                (response) => response.url().includes("/api/trpc/sync.pushOps") && response.ok(),
                { timeout: 10000 }
            );
            await page.getByRole("textbox", { name: "Vault Name" }).fill("Server-backed vault");
            await pushedUpdate;
        } finally {
            await blocker
                .evaluate(() => {
                    (
                        globalThis as typeof globalThis & { blockingDb?: IDBDatabase }
                    ).blockingDb?.close();
                })
                .catch(() => {});
            await blocker.close();
            await deleter.close();
        }
    });

    test("unlock journey: enter seed phrase and access transactions", async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);

        let savedSeedPhrase: string[] = [];
        const userRequests: Array<{ path: string; body: string | null }> = [];
        page.on("request", (request) => {
            const url = new URL(request.url());
            if (url.pathname.includes("/api/trpc/user.")) {
                userRequests.push({ path: url.pathname, body: request.postData() });
            }
        });

        await test.step("create identity first (setup)", async () => {
            await page.goto("/new-user");

            const generateButton = page.locator('[data-testid="generate-button"]');

            // Button is disabled until React hydration completes (via useIsHydrated hook).
            // Playwright's click() auto-waits for enabled state.
            await generateButton.click();

            // Wait for the step to change: seed phrase appears
            await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 20000 });

            // Reveal seed phrase (it's hidden by default)
            const revealButton = page.getByRole("button", { name: /click to reveal/i });
            await revealButton.waitFor({ state: "visible", timeout: 15_000 });
            await revealButton.click();
            // Wait for reveal animation to complete
            await page
                .locator('[data-testid="seed-phrase-word"]')
                .first()
                .waitFor({ state: "visible" });

            // Now extract the visible seed phrase
            savedSeedPhrase = await extractSeedPhrase(page);

            const checkbox = page.locator('[data-testid="confirm-checkbox"]');
            await checkbox.check();

            const continueButton = page.locator('[data-testid="continue-button"]');
            await continueButton.click();
            // New users land on settings page
            await page.waitForURL("**/settings", { timeout: 15000 });

            // Clear session to simulate returning user
            await page.evaluate(() => sessionStorage.clear());
        });

        await test.step("unlock page shows 12 seed phrase inputs", async () => {
            await page.goto("/unlock");

            const inputs = page.locator('[data-testid^="seed-word-input-"]');
            await expect(inputs.first()).toBeVisible({ timeout: 10000 });
            expect(await inputs.count()).toBe(12);

            // Should have link to create new identity
            await expect(
                page.getByRole("link").filter({ hasText: /new|create|sign up/i })
            ).toBeVisible();
        });

        await test.step("validate BIP39 words with visual feedback", async () => {
            const firstInput = page.locator('[data-testid="seed-word-input-0"]');

            // The word inputs are controlled React inputs with no hydration gate of their own, so
            // toBeEditable/toHaveValue prove nothing here: a fill landing before hydration sets
            // the DOM value without ever running onChange, and the next render clears it, leaving
            // the validity class permanently unset. Gate on the passkey branch instead - it cannot
            // render at all until the page's effects have flushed. See waitForUnlockHydration.
            await waitForUnlockHydration(page);

            await firstInput.fill("abandon");
            // The class is the post-propagation signal: it can only appear once onChange ran and
            // React re-rendered from its own state, so it also confirms the fill was not dropped.
            await expect(firstInput).toHaveClass(/border-green-500/, { timeout: 15_000 });
            const validClasses = await firstInput.getAttribute("class");

            await firstInput.clear();
            await firstInput.fill("invalidword123");
            await expect(firstInput).toHaveClass(/border-destructive/, { timeout: 15_000 });
            const invalidClasses = await firstInput.getAttribute("class");

            // A BIP39 word and a non-word must render differently, otherwise there is no feedback.
            expect(validClasses).not.toBe(invalidClasses);
        });

        await test.step("support paste functionality", async () => {
            const testPhrase =
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
            await page.evaluate((phrase) => navigator.clipboard.writeText(phrase), testPhrase);

            const firstInput = page.locator('[data-testid="seed-word-input-0"]');
            await expect(firstInput).toBeEditable();
            await firstInput.focus();
            await page.keyboard.press("ControlOrMeta+v");

            for (let i = 0; i < 11; i++) {
                await expect(page.locator(`[data-testid="seed-word-input-${i}"]`)).toHaveValue(
                    "abandon"
                );
            }
            await expect(page.locator('[data-testid="seed-word-input-11"]')).toHaveValue("about");
        });

        await test.step("reject invalid seed phrase", async () => {
            // Clear inputs and enter invalid phrase
            for (let i = 0; i < 12; i++) {
                await page.locator(`[data-testid="seed-word-input-${i}"]`).clear();
            }

            const invalidPhrase = [
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "abandon",
                "wrong"
            ];
            await enterSeedPhrase(page, invalidPhrase);

            const unlockButton = page.locator('[data-testid="unlock-button"]');
            if (await unlockButton.isEnabled()) {
                await unlockButton.click();
                // Wait for error feedback or URL to stabilize - should stay on unlock page
                await expect(page).toHaveURL(/\/unlock/, { timeout: 5000 });
            }
        });

        await test.step("unlock with valid seed phrase", async () => {
            // Clear and enter saved phrase
            for (let i = 0; i < 12; i++) {
                await page.locator(`[data-testid="seed-word-input-${i}"]`).clear();
            }
            await enterSeedPhrase(page, savedSeedPhrase);

            const unlockButton = page.locator('[data-testid="unlock-button"]');
            // Enablement trails the React commit for all twelve words, so this is the same
            // post-propagation wait as the validity assertions above and gets the same slack.
            await expect(unlockButton).toBeEnabled({ timeout: 15_000 });
            await unlockButton.click();

            // Existing users (unlock) land on transactions
            await page.waitForURL("**/transactions", { timeout: 15000 });
        });

        await test.step("use only empty signed identity registration inputs", async () => {
            expect(userRequests.some((request) => request.path.includes("user.register"))).toBe(
                true
            );
            const getOrCreateRequest = userRequests.find((request) =>
                request.path.includes("user.getOrCreate")
            );
            expect(getOrCreateRequest?.body).toBeTruthy();
            expect(getOrCreateRequest?.body).not.toContain("pubkeyHash");
            expect(getOrCreateRequest?.body).not.toContain("encryptedData");
            expect(
                userRequests.filter((request) =>
                    /user\.(?:exists|getData|upsertData)/.test(request.path)
                )
            ).toEqual([]);
        });
    });

    test("creation presents the recovery phrase as one savable credential", async ({ page }) => {
        await page.goto("/new-user");
        await page.getByTestId("generate-button").click();
        await page.getByTestId("seed-phrase-word").first().waitFor({ state: "visible" });

        const credential = page.getByTestId("recovery-phrase-credential");

        await test.step("exactly one password field, marked as a new password", async () => {
            expect(await page.locator('input[type="password"]').count()).toBe(1);
            await expect(credential).toHaveAttribute("autocomplete", "new-password");
            await expect(credential).toHaveJSProperty("type", "password");
        });

        await test.step("accompanied by exactly one non-secret account identifier", async () => {
            const identifier = page.locator('input[autocomplete="username"]');
            expect(await identifier.count()).toBe(1);
            expect(await identifier.inputValue()).not.toBe("");
        });

        await test.step("credential sits in a form with a submit control", async () => {
            const formInfo = await credential.evaluate((element) => {
                const form = (element as HTMLInputElement).form;
                return form
                    ? {
                          method: form.method,
                          hasSubmit: !!form.querySelector(
                              'button[type="submit"], input[type="submit"]'
                          )
                      }
                    : null;
            });
            expect(formInfo).not.toBeNull();
            expect(formInfo!.method).toBe("post");
            expect(formInfo!.hasSubmit).toBe(true);
        });

        await test.step("credential is focusable and large enough for fill heuristics", async () => {
            // Chromium requires >= 10px in each dimension and a focusable element before it
            // treats a password field as a real credential target.
            const geometry = await credential.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return {
                    width: rect.width,
                    height: rect.height,
                    display: style.display,
                    visibility: style.visibility
                };
            });
            expect(geometry.width).toBeGreaterThanOrEqual(10);
            expect(geometry.height).toBeGreaterThanOrEqual(10);
            expect(geometry.display).not.toBe("none");
            expect(geometry.visibility).not.toBe("hidden");
        });

        await test.step("credential value matches the displayed phrase", async () => {
            const revealButton = page.getByRole("button", { name: /click to reveal/i });
            await revealButton.click();
            const displayed = (await extractSeedPhrase(page)).join(" ");

            expect(await credential.inputValue()).toBe(displayed);
        });

        await test.step("phrase never reaches the URL", async () => {
            const credentialValue = await credential.inputValue();
            expect(credentialValue).not.toBe("");

            expect(page.url()).not.toContain(credentialValue);
            expect(new URL(page.url()).search).toBe("");
            expect(new URL(page.url()).hash).toBe("");
        });
    });

    test("unlock presents the recovery phrase entry as a fillable login credential", async ({
        page
    }) => {
        await page.goto("/unlock");
        const credential = page.getByTestId("recovery-phrase-credential");
        await credential.waitFor();

        await test.step("exactly one password field, marked as the current password", async () => {
            expect(await page.locator('input[type="password"]').count()).toBe(1);
            await expect(credential).toHaveAttribute("autocomplete", "current-password");
        });

        await test.step("word inputs never advertise themselves as passwords", async () => {
            const wordInputs = page.locator('[data-testid^="seed-word-input-"]');
            expect(await wordInputs.count()).toBe(12);
            const attributes = await wordInputs.evaluateAll((elements) =>
                elements.map((element) => ({
                    type: (element as HTMLInputElement).type,
                    autocomplete: element.getAttribute("autocomplete")
                }))
            );
            for (const attribute of attributes) {
                expect(attribute.type).toBe("text");
                expect(attribute.autocomplete).toBe("off");
            }
        });

        await test.step("a manager-style fill distributes into all twelve inputs", async () => {
            const testVector =
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
            // Distribution is driven by the credential's onChange, so the fill must land after
            // hydration or it is silently discarded. See waitForUnlockHydration.
            await waitForUnlockHydration(page);
            await credential.fill(testVector);

            for (let index = 0; index < 11; index++) {
                await expect(page.getByTestId(`seed-word-input-${index}`)).toHaveValue("abandon");
            }
            await expect(page.getByTestId("seed-word-input-11")).toHaveValue("about");
            await expect(page.getByText("Valid recovery phrase")).toBeVisible();
        });

        await test.step("typing a word mirrors back into the canonical credential", async () => {
            await page.getByTestId("seed-word-input-11").fill("abandon");

            await expect(credential).toHaveValue(
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"
            );
        });

        await test.step("an invalid canonical fill is refused, not normalized", async () => {
            const invalid =
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon notaword";
            await credential.fill(invalid);

            await expect(page.getByTestId("seed-word-input-11")).toHaveValue("notaword");
            await expect(page.getByText("Invalid phrase")).toBeVisible();
            await expect(page.getByTestId("unlock-button")).toBeDisabled();
        });
    });

    test("unlock via canonical credential fill signs in and leaks no phrase", async ({ page }) => {
        const requestTraces: string[] = [];
        page.on("request", (request) => {
            requestTraces.push(`${request.url()} ${request.postData() ?? ""}`);
        });
        const consoleMessages: string[] = [];
        page.on("console", (message) => consoleMessages.push(message.text()));

        await page.goto("/new-user");
        await page.getByTestId("generate-button").click();
        await page.getByTestId("seed-phrase-word").first().waitFor({ state: "visible" });
        await page.getByRole("button", { name: /click to reveal/i }).click();
        const savedPhrase = (await extractSeedPhrase(page)).join(" ");
        await page.getByTestId("confirm-checkbox").check();
        await page.getByTestId("continue-button").click();
        await page.waitForURL("**/settings", { timeout: 15000 });
        await page.evaluate(() => sessionStorage.clear());

        await test.step("a fill landing before hydration still reaches the word grid", async () => {
            // Browsers and password managers autofill as soon as the markup exists, which can beat
            // React hydration. The phrase must not be stranded in the credential field.
            await page.goto("/unlock", { waitUntil: "commit" });
            const credential = page.getByTestId("recovery-phrase-credential");
            await credential.waitFor({ state: "attached" });
            await credential.fill(savedPhrase);

            await expect(page.getByTestId("seed-word-input-0")).not.toHaveValue("", {
                timeout: 15000
            });
            await expect(page.getByTestId("unlock-button")).toBeEnabled({ timeout: 15000 });
        });

        await test.step("fill the canonical credential only, then unlock", async () => {
            await page.goto("/unlock");
            const credential = page.getByTestId("recovery-phrase-credential");

            // The credential is a controlled React input, so a fill that lands before hydration
            // is dropped: the DOM value is overwritten by the next render and onChange never
            // fires, leaving the word grid empty and the button disabled forever. The preceding
            // step deliberately tests the pre-hydration race; this one tests the ordinary path,
            // so gate on hydration first rather than racing it. toBeEditable would not do -
            // an ungated input is editable from first paint. See waitForUnlockHydration.
            await waitForUnlockHydration(page);
            await credential.fill(savedPhrase);
            await expect(page.getByTestId("seed-word-input-0")).not.toHaveValue("", {
                timeout: 15_000
            });

            const unlockButton = page.getByTestId("unlock-button");
            await expect(unlockButton).toBeEnabled({ timeout: 15000 });
            await unlockButton.click();

            await page.waitForURL("**/transactions", { timeout: 15000 });
        });

        await test.step("the phrase never appears in a request, URL or console message", () => {
            const firstWord = savedPhrase.split(" ")[0];
            expect(firstWord).toBeTruthy();

            for (const trace of requestTraces) {
                expect(trace).not.toContain(savedPhrase);
            }
            for (const message of consoleMessages) {
                expect(message).not.toContain(savedPhrase);
            }
            expect(page.url()).not.toContain(savedPhrase);
        });

        await test.step("the phrase is never persisted to local or session storage", async () => {
            const persisted = await page.evaluate(() => {
                const dump = (storage: Storage) =>
                    Object.keys(storage)
                        .map((key) => `${key}=${storage.getItem(key) ?? ""}`)
                        .join("\n");
                return `${dump(localStorage)}\n${dump(sessionStorage)}`;
            });

            expect(persisted).not.toContain(savedPhrase);
        });
    });

    test("auth guard: protected routes redirect to unlock", async ({ page }) => {
        await test.step("dashboard redirects to unlock", async () => {
            await page.goto("/dashboard");
            // The guard redirect is client-side, so it cannot fire until the route has compiled
            // and hydrated - both of which stretch well past 5s under full-suite parallel load.
            await page.waitForURL("**/unlock", { timeout: 15_000 });
        });

        await test.step("transactions redirects to unlock", async () => {
            await page.goto("/transactions");
            await page.waitForURL("**/unlock", { timeout: 15_000 });
        });

        await test.step("marketing pages accessible without auth", async () => {
            await page.goto("/");
            await expect(page).toHaveURL("/");
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        });
    });
});
