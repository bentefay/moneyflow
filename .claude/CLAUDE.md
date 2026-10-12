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

1. Run ALL checks: `run check` (tsc, lint, format, unit, CLI and E2E tests, stopping at the first
   failure)
2. Fix any issues found
3. **Commit the changes**

## Commands

- `run --help` lists every command; `run <command> --help` shows one. See `cli/CLAUDE.md`.
- `run dev` / `run build` / `run start` - Next.js dev server, production build, serve the build
- `run check` - every pre-commit gate
- `run tsc [app|cli]` - type checking
- `run lint` - oxlint
- `run format` / `run format --check` - oxfmt formatting
- `run test unit|cli|e2e` - vitest app tests, vitest CLI tests, Playwright E2E tests
- `run db start|stop|reset|types` - local Supabase stack
- `run deps outdated` - dependency updates old enough to pass the minimum release age
- `run browser -s=<session> open http://localhost:3000` - manual browser testing
- Bun is the package manager: `bun install`, `bun add`, `bun remove`. They run through safe-chain;
  `bunx`, `bun x`, npm, pnpm and yarn are blocked.
- Use `bat -P` rather than `cat` (aliased to bat with pager)
- Never run Playwright with `--debug`, `--ui`, `--headed`, or `show` (opens a GUI and can block)
- Never use parentheses in commit messages

## Tech Stack

- TypeScript 7.x, Node.js 22.x LTS (Node.js 24.x supported), Next.js 16 (App Router), React 19
- Loro CRDT + loro-mirror (client state), Supabase (server sync), IndexedDB (persistence)
- shadcn/ui + Tailwind CSS
- tRPC v11 + Zod
- libsodium (client-side crypto)
- Vitest + fast-check + Playwright
- Bun (package manager and CLI runtime) + Optique (`cli/`)

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
