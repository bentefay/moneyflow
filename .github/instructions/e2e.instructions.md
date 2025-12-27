---
applyTo: "tests/e2e/**"
---

# E2E Test Guidelines

Playwright tests implementing Constitution VII: high-level tests with harnesses over excessive mocking.

## Core Principles

### 1. Assert Behaviour, Not Text

Test **what the app does**, not exact text (which changes with copy edits/i18n).

```typescript
// ❌ Bad: Brittle text assertions
await expect(page.getByText("Welcome to MoneyFlow!")).toBeVisible();

// ✅ Good: Semantic selectors
await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
await expect(page.getByRole("alert")).toBeVisible(); // error state
```

**Selector priority**: `getByRole()` > `getByTestId()` > `getByLabel()` > `getByText(/regex/i)`

### 2. Functional Style with Harnesses

Extract page interactions into helper functions. Tests should read like specifications.

```typescript
// ❌ Bad: Imperative steps repeated across tests
test("import flow", async ({ page }) => {
  await page.goto("/new-user");
  await page.locator('[data-testid="generate-button"]').click();
  // ... 10 more lines of setup
});

// ✅ Good: Composable helpers
test("import flow", async ({ page }) => {
  await setupAuthenticatedSession(page);
  await uploadFile(page, await createTestCSV(sampleData));
  await expectImportSuccess(page);
});
```

## File Structure

```typescript
/**
 * E2E Test: [Feature Name]
 */
import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Test Fixtures & Data
// ============================================================================

const sampleData = `Date,Description,Amount\n2024-01-15,"Coffee",-5.50`;

// ============================================================================
// Page Helpers (Harness)
// ============================================================================

/** Authenticate and reach dashboard. */
async function setupAuthenticatedSession(page: Page): Promise<void> { /* ... */ }

/** Upload file and wait for processing. */
async function uploadFile(page: Page, path: string): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles(path);
  await page.waitForLoadState("networkidle");
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Feature", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test("should [behaviour]", async ({ page }) => {
    // Arrange → Act → Assert
  });
});
```

## Quick Reference

| Do | Don't |
|----|-------|
| `await expect(elem).toBeEnabled()` | `await page.waitForTimeout(2000)` |
| `getByRole("button", { name: /submit/i })` | `getByText("Submit Button")` |
| Harness helpers with waits encapsulated | Raw locator chains in tests |
| Independent tests with `beforeEach` setup | Tests that depend on prior test state |
