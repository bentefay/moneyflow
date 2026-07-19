---
applyTo: "tests/e2e/**"
---

# E2E Test Guidelines

Playwright tests implementing Constitution VII: high-level tests with harnesses over excessive
mocking.

Favour creating journey style e2e tests that cover critical user flows end-to-end, including backend
integration, over e2e tests that repetitively run slow initialization flows to test small units of
functionality.

Use Playwright's test.step() to break complex flows into logical sections for readability and
debugging.

Use the repository-installed `playwright-cli` for manual browser debugging; do not use Playwright
MCP, `npx`, ad-hoc scripts, or temporary tests. Assume the next.js server is already running
(`pnpm dev`). The server automatically picks up changes. NEVER assume it is running with old code.
Always fix flaky tests when you discover them. It doesn't matter if they were flaky before your
change. Fix them now.

## Auto-Approved Terminal Commands

- `pnpm exec playwright test --retries=0 --reporter=line --max-failures=1 2>&1` - Run with fail-fast
- `pnpm exec playwright test --retries=0 --reporter=json --max-failures=1 2>&1` - Use json reporter
  if you need structured output
- `pnpm exec playwright test --retries=0 --workers=4 --repeat-each=5 --reporter=line 2>&1` - Use
  --repeat-each for flaky tests
- `pnpm exec playwright-cli -s=<session> open http://localhost:3000` - Start a manual session
- `pnpm exec playwright-cli -s=<session> snapshot` - Inspect the current page and element refs
- `pnpm exec playwright-cli -s=<session> console error` - Check browser errors
- `pnpm exec playwright-cli -s=<session> requests` - Check failed or pending requests
- Do NOT use `--debug`, `--ui`, `--headed`, or `show`; they open a GUI and can block forever.

## Shared Helpers

Domain-specific helpers live in `tests/e2e/helpers/`:

```
tests/e2e/helpers/
├── index.ts      # Re-exports all helpers
├── auth.ts       # Identity creation, unlock, session management
└── nav.ts        # Page navigation helpers
```

Import from the barrel:

```typescript
import { createNewIdentity, goToTags } from "./helpers";
```

### Available Helpers

**Auth (`helpers/auth.ts`)**:

- `createNewIdentity(page)` - Full new user flow, returns seed phrase
- `extractSeedPhrase(page)` - Get words from seed display
- `enterSeedPhrase(page, words)` - Fill unlock inputs
- `clearSession(page)` - Clear storage

**Nav (`helpers/nav.ts`)**:

- `goToDashboard(page)`, `goToTransactions(page)`, `goToTags(page)`
- `goToAccounts(page)`, `goToPeople(page)`, `goToImports(page)`

### When to Create Helpers

Create helpers for **multi-step flows** that are reused across tests:

- Authentication flows
- Complex form submissions with file uploads
- Navigation with loading waits

**Do NOT create helpers** that just wrap Playwright's API:

```typescript
// ❌ Bad: Unnecessary indirection
async function clickButton(page, name) {
    await page.getByRole("button", { name }).click();
}

// ✅ Good: Just use Playwright directly
await page.getByRole("button", { name: /submit/i }).click();
```

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

### 2. Composable Test Setup

Tests should read like specifications using shared helpers.

```typescript
import { createNewIdentity, goToTags } from "./helpers";

test.describe("Tags", () => {
    test.beforeEach(async ({ page }) => {
        await createNewIdentity(page);
        await goToTags(page);
    });

    test("should create a tag", async ({ page }) => {
        await page.getByRole("button", { name: /add tag/i }).click();
        await page.getByPlaceholder(/tag name/i).fill("Food");
        await page.getByRole("button", { name: /^add tag$/i }).click();

        await expect(page.getByText("Food", { exact: true })).toBeVisible();
    });
});
```

## File Structure

```typescript
/**
 * E2E Test: [Feature Name]
 */
import { test, expect, type Page } from "@playwright/test";
import { createNewIdentity, goToFeature } from "./helpers";

// ============================================================================
// Feature-Specific Helpers (if complex flows are reused within this file - or in helpers if reused across files)
// ============================================================================

async function createItem(page: Page, data: { name: string }): Promise<void> {
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByPlaceholder(/name/i).fill(data.name);
    await page.getByRole("button", { name: /save/i }).click();
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Feature", () => {
    test.beforeEach(async ({ page }) => {
        await createNewIdentity(page);
        await goToFeature(page);
    });

    test("should [behaviour]", async ({ page }) => {
        // Arrange → Act → Assert
    });
});
```

## Quick Reference

| Do                                         | Don't                                 |
| ------------------------------------------ | ------------------------------------- |
| `await expect(elem).toBeEnabled()`         | `await page.waitForTimeout(2000)`     |
| `getByRole("button", { name: /submit/i })` | `getByText("Submit Button")`          |
| Harness helpers with waits encapsulated    | Raw locator chains in tests           |
| Independent tests with `beforeEach` setup  | Tests that depend on prior test state |
