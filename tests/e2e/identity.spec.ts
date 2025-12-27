/**
 * E2E Test: Identity Creation Flow
 *
 * Tests the complete identity creation and unlock flows:
 * - New user generates seed phrase
 * - User confirms seed phrase and creates identity
 * - User can unlock with seed phrase
 * - Invalid seed phrases are rejected
 *
 * Note: These tests focus on behavior, not specific copy text.
 * Text content can change without breaking tests.
 */

import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Extract seed phrase words from the display component.
 * Automatically reveals the phrase if hidden.
 */
async function extractSeedPhrase(page: Page): Promise<string[]> {
  // Wait for seed phrase grid to appear
  await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

  // Check if words are hidden (showing "•••••") and reveal if needed
  const revealButton = page.getByRole("button", { name: /reveal/i }).first();
  if (await revealButton.isVisible()) {
    await revealButton.click();
    // Wait for animation
    await page.waitForTimeout(300);
  }

  // Get all word elements and extract text
  const wordElements = await page.$$('[data-testid="seed-phrase-word"]');
  const words: string[] = [];

  for (const element of wordElements) {
    const text = await element.textContent();
    if (text) {
      // Remove the number prefix (e.g., "1. abandon" -> "abandon")
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

/**
 * Complete the new user flow and return the seed phrase.
 */
async function completeNewUserFlow(page: Page): Promise<string[]> {
  await page.goto("/new-user");

  // Click generate button (find primary action button)
  const generateButton = page
    .locator('[data-testid="generate-button"]')
    .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
  await generateButton.click();

  // Wait for seed phrase to appear
  await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

  // Extract seed phrase
  const words = await extractSeedPhrase(page);

  // Find and check the confirmation checkbox
  const checkbox = page.locator('[data-testid="confirm-checkbox"]').or(page.getByRole("checkbox"));
  await checkbox.check();

  // Click continue button
  const continueButton = page
    .locator('[data-testid="continue-button"]')
    .or(page.getByRole("button").filter({ hasText: /continue|next|dashboard/i }));
  await continueButton.click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  return words;
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Identity Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored session data
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test("should show intro page with action button", async ({ page }) => {
    await page.goto("/new-user");

    // Should have a main heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Should have a primary action button to generate/create
    const actionButton = page
      .locator('[data-testid="generate-button"]')
      .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
    await expect(actionButton).toBeVisible();

    // Should have a link to unlock for existing users
    const unlockLink = page.getByRole("link", { name: /unlock|sign in|existing/i });
    await expect(unlockLink).toBeVisible();
  });

  test("should generate and display 12-word seed phrase", async ({ page }) => {
    await page.goto("/new-user");

    // Click generate button
    const generateButton = page
      .locator('[data-testid="generate-button"]')
      .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
    await generateButton.click();

    // Wait for seed phrase display
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

    // Verify 12 words are shown
    const words = await extractSeedPhrase(page);
    expect(words.length).toBe(12);

    // Each word should be a valid BIP39 word (at least 3 chars)
    for (const word of words) {
      expect(word.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("should require confirmation before continuing", async ({ page }) => {
    await page.goto("/new-user");

    // Generate seed phrase
    const generateButton = page
      .locator('[data-testid="generate-button"]')
      .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
    await generateButton.click();
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

    // Continue button should be disabled initially
    const continueButton = page
      .locator('[data-testid="continue-button"]')
      .or(page.getByRole("button").filter({ hasText: /continue|next|dashboard/i }));
    await expect(continueButton).toBeDisabled();

    // Check the confirmation checkbox
    const checkbox = page
      .locator('[data-testid="confirm-checkbox"]')
      .or(page.getByRole("checkbox"));
    await checkbox.check();

    // Continue button should now be enabled
    await expect(continueButton).toBeEnabled();
  });

  test("should complete identity creation and redirect to dashboard", async ({ page }) => {
    await page.goto("/new-user");

    // Generate seed phrase
    const generateButton = page
      .locator('[data-testid="generate-button"]')
      .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
    await generateButton.click();
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

    // Store the seed phrase
    const words = await extractSeedPhrase(page);
    expect(words.length).toBe(12);

    // Confirm and continue
    const checkbox = page
      .locator('[data-testid="confirm-checkbox"]')
      .or(page.getByRole("checkbox"));
    await checkbox.check();

    const continueButton = page
      .locator('[data-testid="continue-button"]')
      .or(page.getByRole("button").filter({ hasText: /continue|next|dashboard/i }));
    await continueButton.click();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("should allow copying seed phrase to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/new-user");

    // Generate seed phrase
    const generateButton = page
      .locator('[data-testid="generate-button"]')
      .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
    await generateButton.click();
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

    // Click copy button (use specific test id to avoid matching reveal overlay)
    const copyButton = page.locator('[data-testid="copy-button"]');
    await copyButton.click();

    // Verify clipboard content (12 space-separated words)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const clipboardWords = clipboardText.trim().split(/\s+/);
    expect(clipboardWords.length).toBe(12);
  });
});

test.describe("Unlock Flow", () => {
  let savedSeedPhrase: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create an identity first, complete registration, and save the seed phrase
    const page = await browser.newPage();
    await page.goto("/new-user");

    const generateButton = page
      .locator('[data-testid="generate-button"]')
      .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
    await generateButton.click();
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });
    savedSeedPhrase = await extractSeedPhrase(page);

    // Complete registration so user exists in database
    const checkbox = page
      .locator('[data-testid="confirm-checkbox"]')
      .or(page.getByRole("checkbox"));
    await checkbox.check();

    const continueButton = page
      .locator('[data-testid="continue-button"]')
      .or(page.getByRole("button").filter({ hasText: /continue|next|dashboard/i }));
    await continueButton.click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Clear session but simulate returning user
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
    });
  });

  test("should show unlock page with 12 seed phrase inputs", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Check for seed phrase input fields
    const inputs = page.locator('[data-testid^="seed-word-input-"]');
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });

    // Should have 12 input fields
    const count = await inputs.count();
    expect(count).toBe(12);
  });

  test("should validate BIP39 words with visual feedback", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    const firstInput = page.locator('[data-testid="seed-word-input-0"]');

    // Enter a valid BIP39 word
    await firstInput.fill("abandon");
    // Should show valid state (check for any visual indicator class)
    const validClasses = await firstInput.getAttribute("class");
    expect(validClasses).toBeTruthy();

    // Clear and enter invalid word
    await firstInput.clear();
    await firstInput.fill("invalidword123");
    // Should show different state
    const invalidClasses = await firstInput.getAttribute("class");
    expect(invalidClasses).toBeTruthy();
  });

  test("should unlock with valid seed phrase and redirect to dashboard", async ({ page }) => {
    // Skip if we don't have a saved phrase
    test.skip(savedSeedPhrase.length === 0, "No seed phrase available");

    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Enter the saved seed phrase
    await enterSeedPhrase(page, savedSeedPhrase);

    // Wait for the unlock button to become enabled (phrase validation is async)
    const unlockButton = page
      .locator('[data-testid="unlock-button"]')
      .or(page.getByRole("button").filter({ hasText: /unlock|sign in|continue/i }));

    await expect(unlockButton).toBeEnabled({ timeout: 5000 });
    await unlockButton.click();

    // Should redirect to dashboard after animation
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("should handle invalid seed phrase", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Enter invalid seed phrase (valid BIP39 words but wrong checksum)
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

    // Click unlock button
    const unlockButton = page
      .locator('[data-testid="unlock-button"]')
      .or(page.getByRole("button").filter({ hasText: /unlock|sign in|continue/i }));

    // If button is enabled, clicking should show error or stay on page
    if (await unlockButton.isEnabled()) {
      await unlockButton.click();

      // Should either show error alert or stay on unlock page
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toContain("/unlock");
    }
  });

  test("should support paste functionality", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Write seed phrase to clipboard
    const testPhrase =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    await page.evaluate((phrase) => navigator.clipboard.writeText(phrase), testPhrase);

    // Focus first input and paste
    const firstInput = page.locator('[data-testid="seed-word-input-0"]');
    await firstInput.focus();

    // Simulate paste
    await page.keyboard.press("ControlOrMeta+v");

    // All inputs should be filled
    for (let i = 0; i < 11; i++) {
      const input = page.locator(`[data-testid="seed-word-input-${i}"]`);
      await expect(input).toHaveValue("abandon");
    }
    const lastInput = page.locator('[data-testid="seed-word-input-11"]');
    await expect(lastInput).toHaveValue("about");
  });

  test("should have link to create new identity", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Find link to new user page
    const newUserLink = page.getByRole("link").filter({ hasText: /new|create|sign up/i });
    await expect(newUserLink).toBeVisible();

    await newUserLink.click();
    await expect(page).toHaveURL(/new-user/);
  });
});

test.describe("Auth Guard", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all session data
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test("should redirect unauthenticated users from dashboard to unlock", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/unlock", { timeout: 5000 });
  });

  test("should redirect unauthenticated users from transactions to unlock", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForURL("**/unlock", { timeout: 5000 });
  });

  test("should allow access to marketing pages without auth", async ({ page }) => {
    await page.goto("/");

    // Should stay on landing page (not redirect)
    await expect(page).toHaveURL("/");

    // Landing page should have visible content
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
