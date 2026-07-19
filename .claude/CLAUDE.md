# MoneyFlow Development Guidelines

## Critical Rules

- Favour functional programming with pure functions and immutable data.
- **Tests are not optional**: Unit tests for pure functions, E2E tests for user flows.
- **Use established libraries** for algorithms (Levenshtein, CSV parsing, dates). Custom
  implementations are bugs waiting to happen.
- Keep `.claude/` files updated alongside code changes.
- Fix all lint, typecheck, formatting, and test issues before committing, even if you didn't create
  them.

## Before Completing Any Task

1. Run ALL checks: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`
2. Fix any issues found
3. **Commit the changes**

## Commands

- `pnpm dev` - dev server
- `pnpm build` - production build
- `pnpm test` - unit tests
- `pnpm test:e2e` - E2E tests
- `pnpm typecheck` - type checking
- `pnpm lint` - ESLint
- `pnpm format` / `pnpm format:check` - oxfmt formatting
- `pnpm exec playwright-cli -s=<session> open http://localhost:3000` - manual browser testing
- Use `bat -P` rather than `cat` (aliased to bat with pager)
- Never run Playwright with `--debug`, `--ui`, `--headed`, or `show` (opens a GUI and can block)
- Never use parentheses in commit messages

## Tech Stack

- TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router), React 19
- Loro CRDT + loro-mirror (client state), Supabase (server sync), IndexedDB (persistence)
- shadcn/ui + Tailwind CSS
- tRPC v11 + Zod
- libsodium (client-side crypto)
- Vitest + fast-check + Playwright

## Architecture Principles

1. **Client-Side Encryption**: All financial data encrypted before storage. Server never sees
   plaintext.

2. **CRDT State**: Vault state is a Loro document. Use loro-mirror's draft-style mutations (mutate
   in place, don't return new objects).

3. **Money as Integers**: All amounts stored as minor units (cents for USD, yen for JPY). Use
   `toMinorUnitsForCurrency()`.

4. **Ed25519 Auth**: API requests signed with keys derived from seed phrase. No passwords.

5. **Sync**: IndexedDB writes immediate (crash safety), server pushes throttled (~2s). Shallow
   snapshots for cold starts.

## Testing

| Type        | Location             | Style                                        |
| ----------- | -------------------- | -------------------------------------------- |
| Unit        | `tests/unit/`        | Table-driven; property-based with fast-check |
| Integration | `tests/integration/` | Happy path + error cases                     |
| E2E         | `tests/e2e/`         | Harness functions, assert behaviour not text |
