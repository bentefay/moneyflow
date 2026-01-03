# MoneyFlow Development Guidelines

## Critical Points

- **Read "Commands" before running shell commands** - Environment-specific gotchas that cause hangs.
- Favour a functional programming style with pure functions and immutable data structures.
- **Tests are not optional**: Write unit tests for pure functions, E2E tests for user flows. A feature is not complete without tests.
- **Don't reinvent the wheel**: Use established libraries for well-known algorithms (e.g., Levenshtein distance, CSV parsing, date handling). Custom implementations are bugs waiting to happen.
- .github/copilot-instructions.md must be updated alongside code changes to keep instructions current.
- .github/instructions/\* must be created/updated as new folders/domains are added.

## Before Completing Any Task

1. Run ALL checks: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`
2. Fix any issues found
3. **Commit the changes** - this is required, not optional

A task is not complete until committed.

## Quick Reference

- **Constitution**: `.specify/memory/constitution.md` - Non-negotiable principles
- **Feature Specs**: `specs/001-core-mvp/` - Current MVP specification
- **Path-Specific Guides**: `.github/instructions/` - Domain-specific instructions

## Active Technologies

- TypeScript 5.x, Node.js 20.x
- Next.js 15 (App Router), React 19
- Supabase (Postgres, Auth, Realtime)
- loro-crdt + loro-mirror (CRDT state management)
- shadcn/ui + Tailwind CSS
- tRPC v11 + Zod
- libsodium (client-side crypto)
- Vitest + fast-check + Playwright

## Project Structure

```text
src/
├── app/              # Next.js App Router pages
│   ├── (app)/        # Authenticated app pages
│   ├── (marketing)/  # Public landing pages
│   └── (onboarding)/ # Identity creation/unlock
├── components/
│   ├── ui/           # shadcn/ui primitives
│   ├── features/     # Feature-specific components
│   └── providers/    # React context providers
├── lib/
│   ├── crypto/       # Encryption, signing, keys
│   ├── crdt/         # Loro document, schema, sync
│   ├── import/       # CSV/OFX parsing, duplicates
│   ├── sync/         # Real-time sync manager
│   └── supabase/     # Supabase client utilities
├── server/
│   ├── routers/      # tRPC routers
│   └── schemas/      # Zod validation schemas
└── hooks/            # React hooks
tests/
├── unit/             # Unit tests (Vitest)
├── integration/      # Integration tests
└── e2e/              # E2E tests (Playwright)
specs/
└── 001-core-mvp/     # Current feature spec
```

## Commands

Keep this section updated with commands for this environment:

- Run `pnpm dev` to start dev server
- Run `pnpm build` to production build
- Run `pnpm test` to run all tests
- Run `pnpm lint` to ESLint (Next.js rules)
- Run `pnpm format` to run biome format + class sorting
- Run `pnpm format:check` to check formatting (CI)
- Run `pnpm typecheck` to type checking
- Run `bat -P` rather than `cat` (which is aliased to bat with a pager for large files).
- Do not run `playwright` with the `--debug` flag as it opens the GUI and will block forever.
- Use `pwd` before `cd` (as I'll need to approve it).
- Never use parentheses in commit messages (as I'll need to approve it).

## Key Architecture Decisions

### 1. Client-Side Encryption

All financial data is encrypted on the client before storage. The server never sees plaintext.
See: `.github/instructions/crypto.instructions.md`

### 2. CRDT State Management

Vault state is a Loro CRDT document. Use loro-mirror's draft-style mutations.
See: `.github/instructions/crdt.instructions.md`

### 3. Real-Time Sync

Changes sync via Supabase Realtime with encrypted CRDT updates.
See: `.github/instructions/sync.instructions.md`

### 3a. Persistence Architecture (Phase 6a)

Vault sync uses a tiered persistence model for reliability and performance:

1. **IndexedDB (Immediate)**: Every local change is immediately encrypted and stored in IndexedDB with `pushed: 0`. This provides crash safety.

2. **Server Sync (Throttled)**: A 2-second throttled sync pushes unpushed ops to `vault_ops` table. Uses `lodash-es` throttle with `{ leading: false, trailing: true }`.

3. **Shallow Snapshots**: When op count exceeds 500 or bytes exceed 5MB, a shallow snapshot is created and pushed. Shallow snapshots contain only current state (no history) for fast cold starts.

4. **Browser Handlers**: `visibilitychange` flushes pending sync, `beforeunload` warns if unpushed ops exist.

Key files:

- `src/lib/sync/persistence.ts` - IndexedDB operations
- `src/lib/sync/manager.ts` - SyncManager orchestration
- `src/components/ui/sync-status.tsx` - UI indicator

Database tables:

- `vault_ops` - Encrypted ops stored forever (immutable append-only)
- `vault_snapshots` - Latest shallow snapshot per vault

See: `specs/001-core-mvp/plan.md` Phase 6a

### 4. Ed25519 Authentication

API requests are signed with Ed25519 keys derived from seed phrase. No passwords.
See: `.github/instructions/trpc.instructions.md`

### 5. Automatic Vault Creation on First Login

When a user creates their identity or unlocks for the first time, the system **automatically creates a default "My Vault"** so they never see an empty state. This happens:

- After confirming seed phrase on `/new-user`
- After unlocking on `/unlock` if user has no vaults (edge case)

The vault is initialized with:

- Default statuses ("For Review", "Paid")
- Default "Me" person with 100% ownership of the default account
- Default account with currency inherited from vault settings
- Default currency inferred from browser locale (e.g., "en-GB" → GBP, "de-DE" → EUR)

See: `src/lib/vault/ensure-default.ts`, `src/lib/crdt/defaults.ts`, `src/lib/domain/detect-currency.ts`

### 6. Money as Integer Minor Units

All monetary amounts are stored as integers in minor units (cents for USD, yen for JPY).
Use `toMinorUnitsForCurrency()` for conversion based on currency's decimal places.
Currency resolution: OFX CURDEF → Account currency → User default → Vault default → USD.
See: `src/lib/domain/currency.ts`

### 7. Use Established Libraries

Do NOT write custom implementations of well-known algorithms. Use battle-tested npm packages:

- **String distance**: `fastest-levenshtein`, `string-similarity`
- **CSV parsing**: `papaparse` (sync), `csv-parse` (stream)
- **OFX parsing**: `@f-o-t/ofx`
- **Date handling**: `date-fns` or native `Temporal` (when available)
- **UUID generation**: `crypto.randomUUID()` (native)

Custom algorithm implementations introduce subtle bugs, lack edge case handling, and waste time on solved problems. If you need functionality that seems algorithmic, search npm first.

## Testing Requirements

Tests MUST be written alongside features. See Constitution VII for philosophy. Always load .github/instructions/e2e.instructions.md when writing e2e tests. Do NOT use playwright with the --debug flag, as it blocks forever and doesn't work for agents.

| Type        | Location               | Style                                                                       |
| ----------- | ---------------------- | --------------------------------------------------------------------------- |
| Unit        | `tests/unit/{module}/` | Table-driven for pure functions; property-based (fast-check) for invariants |
| Integration | `tests/integration/`   | Happy path + error cases                                                    |
| E2E         | `tests/e2e/`           | Harness functions, assert behaviour not text                                |

## Recent Changes

- 004-transaction-table-ux: Added TypeScript 5.x, Node.js 20.x + Next.js 15 (App Router), React 19, loro-mirror, TanStack Virtual, shadcn/ui, Tailwind CSS
