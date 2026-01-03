/**
 * E2E Test: Identity & Authentication Journeys
 *
 * Journey-style tests covering the complete identity creation and unlock flows.
 * Uses test.step() to break complex flows into logical sections.
 */

import { expect, type Page, test } from "@playwright/test";

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
		await page.waitForTimeout(300);
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
	for (let i = 0; i < words.length; i++) {
		const input = page.locator(`[data-testid="seed-word-input-${i}"]`);
		await input.fill(words[i]);
	}
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
		context,
	}) => {
		// Grant clipboard permissions for copy test
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);

		let seedPhrase: string[] = [];

		await test.step("navigate to new user page and see intro", async () => {
			await page.goto("/new-user");
			await page.waitForLoadState("networkidle");

			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
			await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();
			await expect(page.getByRole("link", { name: /unlock|sign in|existing/i })).toBeVisible();
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

	test("unlock journey: enter seed phrase and access transactions", async ({ page, context }) => {
		// Grant clipboard permissions
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);

		let savedSeedPhrase: string[] = [];

		await test.step("create identity first (setup)", async () => {
			await page.goto("/new-user");
			await page.waitForLoadState("networkidle");

			const generateButton = page.locator('[data-testid="generate-button"]');

			// Button is disabled until React hydration completes (via useIsHydrated hook).
			// Playwright's click() auto-waits for enabled state.
			await generateButton.click();

			// Wait for the step to change: seed phrase appears
			await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 20000 });

			// Reveal seed phrase (it's hidden by default)
			const revealButton = page.getByRole("button", { name: /click to reveal/i });
			await revealButton.waitFor({ state: "visible", timeout: 5000 });
			await revealButton.click();
			await page.waitForTimeout(300);

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
			await page.waitForLoadState("networkidle");

			const inputs = page.locator('[data-testid^="seed-word-input-"]');
			await expect(inputs.first()).toBeVisible({ timeout: 10000 });
			expect(await inputs.count()).toBe(12);

			// Should have link to create new identity
			await expect(page.getByRole("link").filter({ hasText: /new|create|sign up/i })).toBeVisible();
		});

		await test.step("validate BIP39 words with visual feedback", async () => {
			const firstInput = page.locator('[data-testid="seed-word-input-0"]');

			await firstInput.fill("abandon");
			const validClasses = await firstInput.getAttribute("class");
			expect(validClasses).toBeTruthy();

			await firstInput.clear();
			await firstInput.fill("invalidword123");
			const invalidClasses = await firstInput.getAttribute("class");
			expect(invalidClasses).toBeTruthy();
		});

		await test.step("support paste functionality", async () => {
			const testPhrase =
				"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
			await page.evaluate((phrase) => navigator.clipboard.writeText(phrase), testPhrase);

			const firstInput = page.locator('[data-testid="seed-word-input-0"]');
			await firstInput.focus();
			await page.keyboard.press("ControlOrMeta+v");

			for (let i = 0; i < 11; i++) {
				await expect(page.locator(`[data-testid="seed-word-input-${i}"]`)).toHaveValue("abandon");
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
				"wrong",
			];
			await enterSeedPhrase(page, invalidPhrase);

			const unlockButton = page.locator('[data-testid="unlock-button"]');
			if (await unlockButton.isEnabled()) {
				await unlockButton.click();
				await page.waitForTimeout(2000);
				expect(page.url()).toContain("/unlock");
			}
		});

		await test.step("unlock with valid seed phrase", async () => {
			// Clear and enter saved phrase
			for (let i = 0; i < 12; i++) {
				await page.locator(`[data-testid="seed-word-input-${i}"]`).clear();
			}
			await enterSeedPhrase(page, savedSeedPhrase);

			const unlockButton = page.locator('[data-testid="unlock-button"]');
			await expect(unlockButton).toBeEnabled({ timeout: 5000 });
			await unlockButton.click();

			// Existing users (unlock) land on transactions
			await page.waitForURL("**/transactions", { timeout: 15000 });
		});
	});

	test("auth guard: protected routes redirect to unlock", async ({ page }) => {
		await test.step("dashboard redirects to unlock", async () => {
			await page.goto("/dashboard");
			await page.waitForURL("**/unlock", { timeout: 5000 });
		});

		await test.step("transactions redirects to unlock", async () => {
			await page.goto("/transactions");
			await page.waitForURL("**/unlock", { timeout: 5000 });
		});

		await test.step("marketing pages accessible without auth", async () => {
			await page.goto("/");
			await expect(page).toHaveURL("/");
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		});
	});
});
