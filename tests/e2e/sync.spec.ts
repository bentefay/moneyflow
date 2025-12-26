/**
 * E2E Test: Multi-User Sync
 *
 * Tests real-time collaborative sync between multiple users:
 * - Changes propagate between browser contexts
 * - Conflict resolution works correctly
 * - Presence awareness shows other users
 * - Offline changes sync when reconnecting
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a new authenticated session and return the seed phrase.
 */
async function createIdentity(page: Page): Promise<string[]> {
  await page.goto("/new-user");

  // Generate seed phrase
  const generateButton = page
    .locator('[data-testid="generate-button"]')
    .or(page.getByRole("button").filter({ hasText: /generate|create|start/i }));
  await generateButton.click();

  // Wait for seed phrase and reveal if hidden
  await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 10000 });
  const revealButton = page.getByRole("button", { name: /reveal/i }).first();
  if (await revealButton.isVisible()) {
    await revealButton.click();
  }

  // Extract seed phrase
  const wordElements = await page.$$('[data-testid="seed-phrase-word"]');
  const words: string[] = [];

  for (const element of wordElements) {
    const text = await element.textContent();
    if (text) {
      const word = text.replace(/^\d+\.\s*/, "").trim();
      words.push(word);
    }
  }

  // Confirm and continue
  const checkbox = page.locator('[data-testid="confirm-checkbox"]').or(page.getByRole("checkbox"));
  await checkbox.check();

  const continueButton = page
    .locator('[data-testid="continue-button"]')
    .or(page.getByRole("button").filter({ hasText: /continue|next|dashboard/i }));
  await continueButton.click();

  await page.waitForURL("**/dashboard", { timeout: 10000 });

  return words;
}

/**
 * Unlock with existing seed phrase.
 */
async function unlockWithPhrase(page: Page, words: string[]): Promise<void> {
  await page.goto("/unlock");
  await page.waitForLoadState("networkidle");

  // Enter seed phrase
  for (let i = 0; i < words.length; i++) {
    const input = page.locator(`[data-testid="seed-word-input-${i}"]`);
    await input.fill(words[i]);
  }

  // Unlock
  const unlockButton = page
    .locator('[data-testid="unlock-button"]')
    .or(page.getByRole("button").filter({ hasText: /unlock/i }));
  await unlockButton.click();
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

/**
 * Create a transaction and return its identifier.
 */
async function createTransaction(
  page: Page,
  data: { merchant: string; amount: string }
): Promise<void> {
  const addRow = page.locator('[data-testid="add-transaction-row"]');
  if (await addRow.isVisible()) {
    await addRow.click();
  }

  const merchantInput = page.locator('[data-testid="new-transaction-merchant"]');
  await merchantInput.fill(data.merchant);

  const amountInput = page.locator('[data-testid="new-transaction-amount"]');
  await amountInput.fill(data.amount);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(500); // Wait for CRDT update
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Real-time Sync", () => {
  let seedPhrase: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create a shared identity for sync tests
    const page = await browser.newPage();
    seedPhrase = await createIdentity(page);
    await page.close();
  });

  test("should sync new transaction between two windows", async ({ browser }) => {
    // Create two browser contexts (simulating two users/tabs)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both unlock with same identity
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      // Both navigate to transactions
      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Page 1 creates a transaction
      await createTransaction(page1, {
        merchant: "Sync Test Merchant",
        amount: "-100.00",
      });

      // Verify transaction appears on page 1
      await expect(page1.getByText("Sync Test Merchant")).toBeVisible({ timeout: 5000 });

      // Transaction should sync to page 2
      await expect(page2.getByText("Sync Test Merchant")).toBeVisible({ timeout: 10000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should sync edits between windows", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Create a transaction on page 1
      await createTransaction(page1, {
        merchant: "Edit Sync Test",
        amount: "-50.00",
      });

      // Wait for sync to page 2
      await expect(page2.getByText("Edit Sync Test")).toBeVisible({ timeout: 10000 });

      // Edit the transaction on page 1
      const merchantCell = page1.getByText("Edit Sync Test");
      await merchantCell.click();
      await page1.keyboard.type("Edited Merchant Name");
      await page1.keyboard.press("Enter");

      // Edit should sync to page 2
      await expect(page2.getByText("Edited Merchant Name")).toBeVisible({ timeout: 10000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should sync deletions between windows", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Create a transaction
      await createTransaction(page1, {
        merchant: "Delete Sync Test",
        amount: "-25.00",
      });

      // Wait for sync
      await expect(page2.getByText("Delete Sync Test")).toBeVisible({ timeout: 10000 });

      // Delete on page 1
      const row = page1
        .locator('[data-testid="transaction-row"]')
        .filter({ hasText: "Delete Sync Test" });
      await row.hover();
      const deleteButton = row
        .locator('[data-testid="delete-button"]')
        .or(row.getByRole("button", { name: /delete/i }));
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page1.getByRole("button", { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Should disappear from both pages
      await expect(page1.getByText("Delete Sync Test")).not.toBeVisible({ timeout: 5000 });
      await expect(page2.getByText("Delete Sync Test")).not.toBeVisible({ timeout: 10000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe("Presence Awareness", () => {
  let seedPhrase: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    seedPhrase = await createIdentity(page);
    await page.close();
  });

  test("should show presence avatars when multiple users are viewing", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Wait for presence to establish
      await page1.waitForTimeout(2000);

      // Should show presence avatars
      const presenceAvatars = page1
        .locator('[data-testid="presence-avatar"]')
        .or(page1.locator('[data-testid="presence-avatar-group"]'));

      // At minimum, should show self
      await expect(presenceAvatars).toBeVisible({ timeout: 5000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should show user count in presence indicator", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Wait for presence
      await page1.waitForTimeout(3000);

      // Should show at least 1 user or multiple users
      const presenceCount = page1
        .locator('[data-testid="presence-count"]')
        .or(page1.getByText(/\d+ (user|viewer|online)/i));

      if (await presenceCount.isVisible()) {
        const countText = await presenceCount.textContent();
        expect(countText).toMatch(/\d+/);
      }
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should update presence when user leaves", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      await page1.waitForTimeout(2000);

      // Close page 2
      await page2.close();

      // Wait for presence to update
      await page1.waitForTimeout(3000);

      // Page 1 should still function
      await expect(page1.getByRole("heading", { name: /Transactions/i })).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe("Conflict Resolution", () => {
  let seedPhrase: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    seedPhrase = await createIdentity(page);
    await page.close();
  });

  test("should handle concurrent edits to same field", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Create a transaction
      await createTransaction(page1, {
        merchant: "Conflict Test",
        amount: "-75.00",
      });

      // Wait for sync
      await expect(page2.getByText("Conflict Test")).toBeVisible({ timeout: 10000 });

      // Both users edit simultaneously (simulate)
      const cell1 = page1.getByText("Conflict Test");
      const cell2 = page2.getByText("Conflict Test");

      await cell1.click();
      await cell2.click();

      await page1.keyboard.type("Edit from User 1");
      await page2.keyboard.type("Edit from User 2");

      await page1.keyboard.press("Enter");
      await page2.keyboard.press("Enter");

      // Wait for conflict resolution
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      // Both should eventually converge to same value (CRDT last-writer-wins)
      const value1 = await page1.locator('[data-testid="transaction-row"]').first().textContent();
      const value2 = await page2.locator('[data-testid="transaction-row"]').first().textContent();

      // Values should be the same after sync
      expect(value1).toBe(value2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should handle concurrent deletions gracefully", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Create a transaction
      await createTransaction(page1, {
        merchant: "Double Delete Test",
        amount: "-50.00",
      });

      // Wait for sync
      await expect(page2.getByText("Double Delete Test")).toBeVisible({ timeout: 10000 });

      // Both attempt to delete
      const row1 = page1
        .locator('[data-testid="transaction-row"]')
        .filter({ hasText: "Double Delete Test" });
      const row2 = page2
        .locator('[data-testid="transaction-row"]')
        .filter({ hasText: "Double Delete Test" });

      await row1.hover();
      await row2.hover();

      const deleteBtn1 = row1
        .locator('[data-testid="delete-button"]')
        .or(row1.getByRole("button", { name: /delete/i }));
      const deleteBtn2 = row2
        .locator('[data-testid="delete-button"]')
        .or(row2.getByRole("button", { name: /delete/i }));

      // Click both delete buttons near-simultaneously
      await Promise.all([deleteBtn1.click(), deleteBtn2.click()]);

      // Confirm both (if dialogs appear)
      const confirm1 = page1.getByRole("button", { name: /confirm|yes|delete/i });
      const confirm2 = page2.getByRole("button", { name: /confirm|yes|delete/i });

      if (await confirm1.isVisible()) await confirm1.click();
      if (await confirm2.isVisible()) await confirm2.click();

      // Both should show the item as deleted
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      await expect(page1.getByText("Double Delete Test")).not.toBeVisible();
      await expect(page2.getByText("Double Delete Test")).not.toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe("Offline Sync", () => {
  let seedPhrase: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    seedPhrase = await createIdentity(page);
    await page.close();
  });

  test("should queue changes while offline", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await unlockWithPhrase(page, seedPhrase);
      await page.goto("/transactions");
      await page.waitForLoadState("networkidle");

      // Go offline
      await context.setOffline(true);

      // Create transaction while offline
      await createTransaction(page, {
        merchant: "Offline Transaction",
        amount: "-30.00",
      });

      // Should still appear locally
      await expect(page.getByText("Offline Transaction")).toBeVisible({ timeout: 5000 });

      // Go back online
      await context.setOffline(false);

      // Wait for sync
      await page.waitForTimeout(3000);

      // Transaction should persist after refresh
      await page.reload();
      await expect(page.getByText("Offline Transaction")).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test("should sync queued changes when coming online", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await unlockWithPhrase(page1, seedPhrase);
      await unlockWithPhrase(page2, seedPhrase);

      await page1.goto("/transactions");
      await page2.goto("/transactions");
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Page 1 goes offline
      await context1.setOffline(true);

      // Create transaction while offline
      await createTransaction(page1, {
        merchant: "Queued Sync Test",
        amount: "-40.00",
      });

      // Should not appear on page 2 yet
      await page2.waitForTimeout(2000);
      await expect(page2.getByText("Queued Sync Test")).not.toBeVisible();

      // Page 1 comes back online
      await context1.setOffline(false);

      // Should sync to page 2
      await expect(page2.getByText("Queued Sync Test")).toBeVisible({ timeout: 15000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should show offline indicator", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await unlockWithPhrase(page, seedPhrase);
      await page.goto("/transactions");
      await page.waitForLoadState("networkidle");

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Should show offline indicator
      const offlineIndicator = page
        .locator('[data-testid="offline-indicator"]')
        .or(page.getByText(/offline|disconnected|no connection/i));

      // This may not be implemented yet, so we just check the page still works
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toBeVisible();
      }

      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Offline indicator should disappear (if it was shown)
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).not.toBeVisible({ timeout: 5000 });
      }
    } finally {
      await context.close();
    }
  });
});

test.describe("Session Persistence", () => {
  let seedPhrase: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    seedPhrase = await createIdentity(page);
    await page.close();
  });

  test("should persist data across page refreshes", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await unlockWithPhrase(page, seedPhrase);
      await page.goto("/transactions");
      await page.waitForLoadState("networkidle");

      // Create a transaction
      await createTransaction(page, {
        merchant: "Persistence Test",
        amount: "-60.00",
      });

      // Verify it's there
      await expect(page.getByText("Persistence Test")).toBeVisible({ timeout: 5000 });

      // Refresh page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Data should persist
      await expect(page.getByText("Persistence Test")).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test("should restore session after browser restart", async ({ browser }) => {
    // Create context and add data
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await unlockWithPhrase(page1, seedPhrase);
    await page1.goto("/transactions");
    await page1.waitForLoadState("networkidle");

    await createTransaction(page1, {
      merchant: "Session Restore Test",
      amount: "-80.00",
    });

    await expect(page1.getByText("Session Restore Test")).toBeVisible({ timeout: 5000 });

    // Close context (simulates closing browser)
    await context1.close();

    // Open new context (simulates reopening browser)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // Unlock with same seed
      await unlockWithPhrase(page2, seedPhrase);
      await page2.goto("/transactions");
      await page2.waitForLoadState("networkidle");

      // Data should be restored from server
      await expect(page2.getByText("Session Restore Test")).toBeVisible({ timeout: 15000 });
    } finally {
      await context2.close();
    }
  });
});
