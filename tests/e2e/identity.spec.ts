/**
 * E2E Test: Identity Creation Flow
 *
 * Tests the complete identity creation and unlock flows:
 * - New user generates seed phrase
 * - User confirms seed phrase and creates identity
 * - User can unlock with seed phrase
 * - Invalid seed phrases are rejected
 */

import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Extract seed phrase words from the display component.
 */
async function extractSeedPhrase(page: Page): Promise<string[]> {
  // Wait for seed phrase grid to appear
  await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });

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

  test("should show intro page with create identity button", async ({ page }) => {
    await page.goto("/new-user");

    // Check intro content
    await expect(page.getByRole("heading", { name: /Create Your Identity/i })).toBeVisible();
    await expect(page.getByText(/recovery phrase to secure your account/i)).toBeVisible();

    // Check info cards
    await expect(page.getByText(/Your data stays yours/i)).toBeVisible();
    await expect(page.getByText(/Write down your phrase/i)).toBeVisible();

    // Check CTA button
    await expect(page.getByRole("button", { name: /Generate Recovery Phrase/i })).toBeVisible();

    // Check unlock link
    await expect(page.getByText(/Already have an account/i)).toBeVisible();
  });

  test("should generate and display seed phrase", async ({ page }) => {
    await page.goto("/new-user");

    // Click generate button
    await page.getByRole("button", { name: /Generate Recovery Phrase/i }).click();

    // Wait for seed phrase display
    await expect(page.getByRole("heading", { name: /Your Recovery Phrase/i })).toBeVisible({
      timeout: 10000,
    });

    // Verify 12 words are shown
    const words = await extractSeedPhrase(page);
    expect(words.length).toBe(12);

    // Each word should be a valid BIP39 word (at least 3 chars)
    for (const word of words) {
      expect(word.length).toBeGreaterThanOrEqual(3);
    }

    // Warning should be visible
    await expect(page.getByText(/Write these 12 words down in order/i)).toBeVisible();
  });

  test("should require confirmation before continuing", async ({ page }) => {
    await page.goto("/new-user");

    // Generate seed phrase
    await page.getByRole("button", { name: /Generate Recovery Phrase/i }).click();
    await expect(page.getByRole("heading", { name: /Your Recovery Phrase/i })).toBeVisible({
      timeout: 10000,
    });

    // Continue button should be disabled initially
    const continueButton = page.getByRole("button", { name: /Continue to Dashboard/i });
    await expect(continueButton).toBeDisabled();

    // Check the confirmation checkbox
    await page.getByLabel(/I have written down my recovery phrase/i).check();

    // Continue button should now be enabled
    await expect(continueButton).toBeEnabled();
  });

  test("should complete identity creation and redirect to dashboard", async ({ page }) => {
    await page.goto("/new-user");

    // Generate seed phrase
    await page.getByRole("button", { name: /Generate Recovery Phrase/i }).click();
    await expect(page.getByRole("heading", { name: /Your Recovery Phrase/i })).toBeVisible({
      timeout: 10000,
    });

    // Store the seed phrase
    const words = await extractSeedPhrase(page);
    expect(words.length).toBe(12);

    // Confirm and continue
    await page.getByLabel(/I have written down my recovery phrase/i).check();
    await page.getByRole("button", { name: /Continue to Dashboard/i }).click();

    // Should show completion message
    await expect(page.getByRole("heading", { name: /You're all set/i })).toBeVisible();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 5000 });
  });

  test("should allow copying seed phrase to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/new-user");

    // Generate seed phrase
    await page.getByRole("button", { name: /Generate Recovery Phrase/i }).click();
    await expect(page.getByRole("heading", { name: /Your Recovery Phrase/i })).toBeVisible({
      timeout: 10000,
    });

    // Click copy button
    const copyButton = page.getByRole("button", { name: /copy/i });
    await copyButton.click();

    // Verify copy feedback
    await expect(page.getByText(/copied/i)).toBeVisible({ timeout: 2000 });

    // Verify clipboard content (12 space-separated words)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const clipboardWords = clipboardText.trim().split(/\s+/);
    expect(clipboardWords.length).toBe(12);
  });
});

test.describe("Unlock Flow", () => {
  let savedSeedPhrase: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create an identity first and save the seed phrase
    const page = await browser.newPage();
    await page.goto("/new-user");
    await page.getByRole("button", { name: /Generate Recovery Phrase/i }).click();
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });
    savedSeedPhrase = await extractSeedPhrase(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Clear session but simulate returning user
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.clear();
    });
  });

  test("should show unlock page with seed phrase input", async ({ page }) => {
    await page.goto("/unlock");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check for seed phrase input fields
    const inputs = page.locator('input[type="text"]');
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });

    // Should have 12 input fields
    const count = await inputs.count();
    expect(count).toBe(12);
  });

  test("should highlight valid BIP39 words", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Enter a valid BIP39 word
    const firstInput = page.locator('[data-testid="seed-word-input-0"]');
    await firstInput.fill("abandon");

    // Should show valid indicator (green border or checkmark)
    await expect(firstInput).toHaveClass(/border-green|valid/i);
  });

  test("should reject invalid BIP39 words", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Enter an invalid word
    const firstInput = page.locator('[data-testid="seed-word-input-0"]');
    await firstInput.fill("invalidword123");

    // Should show invalid indicator (red border or x icon)
    await expect(firstInput).toHaveClass(/border-red|invalid/i);
  });

  test("should unlock with valid seed phrase", async ({ page }) => {
    // Skip if we don't have a saved phrase
    test.skip(savedSeedPhrase.length === 0, "No seed phrase available");

    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Enter the saved seed phrase
    await enterSeedPhrase(page, savedSeedPhrase);

    // Click unlock button
    await page.getByRole("button", { name: /unlock/i }).click();

    // Should redirect to dashboard after animation
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("should show error for invalid seed phrase", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Enter invalid seed phrase (valid BIP39 words but wrong phrase)
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

    // Click unlock button (may be disabled due to validation)
    const unlockButton = page.getByRole("button", { name: /unlock/i });

    // If button is enabled, click it and expect error
    if (await unlockButton.isEnabled()) {
      await unlockButton.click();

      // Should show error message
      await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 5000 });
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

  test("should navigate from unlock to new-user", async ({ page }) => {
    await page.goto("/unlock");
    await page.waitForLoadState("networkidle");

    // Find link to new user page
    const newUserLink = page.getByRole("link", { name: /new|create|sign up/i });
    if (await newUserLink.isVisible()) {
      await newUserLink.click();
      await expect(page).toHaveURL(/new-user/);
    }
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

  test("should redirect unauthenticated users to unlock", async ({ page }) => {
    // Try to access protected route
    await page.goto("/dashboard");

    // Should redirect to unlock
    await page.waitForURL("**/unlock", { timeout: 5000 });
  });

  test("should redirect unauthenticated users from transactions", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForURL("**/unlock", { timeout: 5000 });
  });

  test("should allow access to marketing pages without auth", async ({ page }) => {
    await page.goto("/");

    // Should stay on landing page
    await expect(page).toHaveURL("/");

    // Landing page content should be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
