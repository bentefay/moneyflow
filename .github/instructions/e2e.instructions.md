---
applyTo: "tests/e2e/**"
---

# E2E Test Guidelines

End-to-end tests for MoneyFlow using Playwright.

These guidelines implement Constitution VII (Robustness & Reliability) which emphasizes:
- High-level, concise tests over excessive unit tests with mocking
- Test harnesses that make tests easy to understand
- Property-based tests for calculations where invariants matter

## Core Principles

### 1. Assert Behaviour, Not Text Content

Tests should verify **what the application does**, not the exact text it displays. Text content changes frequently (copy edits, i18n), but behaviour should remain stable.

```typescript
// ❌ Bad: Asserting specific text content
await expect(page.getByText("Welcome to MoneyFlow!")).toBeVisible();
await expect(page.getByText("Click here to import your transactions")).toBeVisible();

// ✅ Good: Asserting behaviour and structure
await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
await expect(page.getByRole("button", { name: /import/i })).toBeEnabled();
```

```typescript
// ❌ Bad: Checking exact error message text
await expect(page.getByText("Invalid file format. Please upload a CSV or OFX file.")).toBeVisible();

// ✅ Good: Checking that an error state is displayed
await expect(page.getByRole("alert")).toBeVisible();
await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
```

Use semantic selectors:
- `getByRole()` for accessibility roles (button, heading, alert, etc.)
- `getByTestId()` for specific component states
- `locator('[data-testid="..."]')` for custom identifiers
- Case-insensitive regex (`/pattern/i`) when text matching is unavoidable

### 2. Functional Style

Write tests in a declarative, functional style. Extract reusable operations into pure helper functions.

```typescript
// ❌ Bad: Imperative, repetitive test code
test("should complete import", async ({ page }) => {
  await page.goto("/new-user");
  await page.locator('[data-testid="generate-button"]').click();
  await page.waitForSelector('[data-testid="seed-phrase-word"]');
  await page.locator('[data-testid="confirm-checkbox"]').check();
  await page.locator('[data-testid="continue-button"]').click();
  await page.waitForURL("**/dashboard");
  await page.goto("/imports/new");
  // ... more imperative steps
});

// ✅ Good: Functional composition with helper functions
test("should complete import", async ({ page }) => {
  await setupAuthenticatedSession(page);
  await navigateToImports(page);
  
  const filePath = await createTestCSV(sampleBankData);
  await uploadFile(page, filePath);
  await completeColumnMapping(page);
  
  await expectImportSuccess(page);
});
```

### 3. Test Harnesses

Create test harnesses (helper modules) to encapsulate page interactions and improve legibility.

#### Harness Structure

```typescript
// ============================================================================
// Test Fixtures & Data
// ============================================================================

const sampleBankData = `Date,Description,Amount
2024-01-15,"Coffee Shop",-5.50`;

async function createTestCSV(content: string): Promise<string> {
  // Returns path to temporary file
}

// ============================================================================
// Page Helpers (Harness)
// ============================================================================

/**
 * Authenticate user and navigate to dashboard.
 */
async function setupAuthenticatedSession(page: Page): Promise<void> {
  // Encapsulated authentication flow
}

/**
 * Upload a file to the import dropzone.
 */
async function uploadFile(page: Page, filePath: string): Promise<void> {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  await page.waitForLoadState("networkidle");
}

/**
 * Assert that import completed successfully.
 */
async function expectImportSuccess(page: Page): Promise<void> {
  await expect(page.getByRole("status")).toContainText(/success|complete/i);
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Import Flow", () => {
  // Tests use the harness functions
});
```

#### Harness Guidelines

1. **Single Responsibility**: Each helper function does one thing
2. **Descriptive Names**: Function names describe the action (`setupAuthenticatedSession`, `uploadFile`, `expectImportSuccess`)
3. **Document Intent**: Add JSDoc comments explaining what the helper does
4. **Return Useful Values**: Helpers can return data for assertions (e.g., created file paths)
5. **Handle Waits Internally**: Encapsulate `waitFor*` calls inside helpers

## File Structure

```typescript
/**
 * E2E Test: [Feature Name]
 *
 * Tests the [feature] flow:
 * - [Key scenario 1]
 * - [Key scenario 2]
 * - [Key scenario 3]
 */

import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Test Fixtures
// ============================================================================

// Test data and file creation helpers

// ============================================================================
// Page Helpers (Harness)
// ============================================================================

// Reusable page interaction functions

// ============================================================================
// Tests
// ============================================================================

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Common setup using harness
  });

  test("should [expected behaviour]", async ({ page }) => {
    // Arrange
    // Act  
    // Assert
  });
});
```

## Best Practices

### Selectors Priority

1. `getByRole()` - Most resilient, tests accessibility
2. `getByTestId()` - For specific components
3. `getByLabel()` - For form inputs
4. `locator('[data-testid="..."]')` - Custom identifiers
5. `getByText(/pattern/i)` - Last resort, use regex

### Waiting Strategies

```typescript
// ✅ Prefer explicit waits for specific conditions
await expect(page.getByRole("button")).toBeEnabled();
await page.waitForURL("**/dashboard");
await page.waitForLoadState("networkidle");

// ❌ Avoid arbitrary timeouts
await page.waitForTimeout(2000);
```

### Test Isolation

- Each test should be independent
- Use `beforeEach` for common setup via harness functions
- Clean up test artifacts (temp files, etc.) after tests

### Assertions

```typescript
// ✅ Assert behaviour
await expect(page.getByRole("button", { name: /submit/i })).toBeEnabled();
await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible();
await expect(page).toHaveURL(/\/dashboard/);

// ✅ Assert state changes
const countBefore = await page.locator('[data-testid="transaction-row"]').count();
await performAction(page);
const countAfter = await page.locator('[data-testid="transaction-row"]').count();
expect(countAfter).toBeGreaterThan(countBefore);
```
