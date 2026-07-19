---
name: e2e
description: Playwright E2E testing patterns. Use when working on files in tests/e2e/.
---

# E2E Test Guidelines

## Philosophy

- Journey-style tests covering critical flows end-to-end
- **Strongly prefer adding `test.step()` to existing tests** over creating new tests - keeps suite
  fast and avoids duplicating slow setup flows
- Fix flaky tests immediately, regardless of when introduced

## Commands

`@playwright/test` is the automated test runner:

```bash
pnpm exec playwright test --retries=0 --reporter=line --max-failures=1 2>&1
pnpm exec playwright test --retries=0 --workers=4 --repeat-each=5 --reporter=line 2>&1
```

`@playwright/cli` is the separate manual/agent browser CLI. Use the repository-installed binary, not
Playwright MCP, `npx`, an ad-hoc Node script, or a temporary test file:

```bash
pnpm exec playwright-cli --help
pnpm exec playwright-cli -s=<unique-session> open http://localhost:3000
pnpm exec playwright-cli -s=<unique-session> snapshot
pnpm exec playwright-cli -s=<unique-session> console error
pnpm exec playwright-cli -s=<unique-session> requests
pnpm exec playwright-cli -s=<unique-session> close
pnpm exec playwright-cli -s=<unique-session> delete-data
```

Use a uniquely named, non-persistent session for each smoke test. Exercise the UI through CLI
commands, verify persistence with `reload`, inspect console and failed network requests, then close
the session, delete its data, and remove generated `.playwright-cli/` artifacts. Manual CLI smoke
coverage complements the automated suite; neither substitutes for the other.

**NEVER use `--debug`, `--ui`, `--headed`, or `show`** - they open a GUI and can block agents.

## Selectors (priority order)

1. `getByRole()`
2. `getByTestId()`
3. `getByLabel()`
4. `getByText(/regex/i)`

## Critical Rules

- **Assert behaviour, not text** - text changes with copy edits/i18n
- **Independent tests** - use `beforeEach`, don't depend on prior test state
- **No arbitrary waits** - use `toBeEnabled()`, not `waitForTimeout()`

## Helpers

Import from `tests/e2e/helpers/`:

- `createNewIdentity(page)` - full new user flow
- `goToTransactions(page)`, `goToTags(page)`, etc.

Create helpers for multi-step reused flows. Don't wrap single Playwright calls.

## Pattern

```typescript
test.describe("Feature", () => {
    test.beforeEach(async ({ page }) => {
        await createNewIdentity(page);
        await goToFeature(page);
    });

    test("should do thing", async ({ page }) => {
        // Arrange → Act → Assert
    });
});
```
