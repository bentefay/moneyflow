/**
 * Authentication E2E Helpers
 *
 * Helpers for identity creation, unlock, and session management.
 */

import { type Page } from "@playwright/test";

/**
 * Complete the new user flow: generate seed phrase, confirm, and continue to dashboard.
 * Returns the seed phrase words for potential later use (e.g., unlock tests).
 */
export async function createNewIdentity(page: Page): Promise<string[]> {
	await page.goto("/new-user");

	// Wait for network to be idle (all JS loaded and hydration typically complete)
	await page.waitForLoadState("networkidle");

	// Wait for page to be fully loaded and generate button to be ready
	const generateButton = page.locator('[data-testid="generate-button"]');
	await generateButton.waitFor({ state: "visible", timeout: 10000 });

	// Button is disabled until React hydration completes (via useIsHydrated hook).
	// Playwright's click() auto-waits for enabled state, so this just works.
	await generateButton.click();

	// Wait for seed phrase to be displayed
	await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 20000 });

	// Reveal seed phrase if hidden (click the overlay)
	const revealOverlay = page.locator("text=Click to reveal your recovery phrase");
	if (await revealOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
		await revealOverlay.click();
		await page.waitForTimeout(300);
	}

	// Extract seed phrase
	const words = await extractSeedPhrase(page);

	// Check confirm checkbox and continue
	const checkbox = page.locator('[data-testid="confirm-checkbox"]');
	await checkbox.waitFor({ state: "visible", timeout: 5000 });
	await checkbox.check();

	const continueButton = page.locator('[data-testid="continue-button"]');
	await continueButton.waitFor({ state: "visible", timeout: 5000 });

	// Ensure continue button is enabled
	await page.waitForFunction(
		() => {
			const btn = document.querySelector('[data-testid="continue-button"]') as HTMLButtonElement;
			return btn && !btn.disabled;
		},
		{ timeout: 5000 }
	);

	await continueButton.click();

	await page.waitForURL("**/dashboard", { timeout: 15000 });

	// Onboarding must create + select a vault (persisted via localStorage)
	await page.waitForFunction(
		() => {
			try {
				return !!localStorage.getItem("moneyflow_active_vault");
			} catch {
				return false;
			}
		},
		undefined,
		{ timeout: 20000 }
	);

	return words;
}

/**
 * Extract seed phrase words from the display component.
 */
export async function extractSeedPhrase(page: Page): Promise<string[]> {
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
export async function enterSeedPhrase(page: Page, words: string[]): Promise<void> {
	for (let i = 0; i < words.length; i++) {
		const input = page.locator(`[data-testid="seed-word-input-${i}"]`);
		await input.fill(words[i]);
	}
}

/**
 * Clear session storage and local storage for a fresh start.
 */
export async function clearSession(page: Page): Promise<void> {
	await page.evaluate(() => {
		sessionStorage.clear();
		localStorage.clear();
	});
}
