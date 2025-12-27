# MoneyFlow Development Guidelines

## Critical Points

- **Read "Terminal Command Notes" before running shell commands** - Environment-specific gotchas that cause hangs.
- Favour a functional programming style with pure functions and immutable data structures.
- **Tests are not optional**: Write unit tests for pure functions, E2E tests for user flows. A feature is not complete without tests.
- **Don't reinvent the wheel**: Use established libraries for well-known algorithms (e.g., Levenshtein distance, CSV parsing, date handling). Custom implementations are bugs waiting to happen.
- .github/agents/copilot-instructions.md must be updated alongside code changes to keep instructions current.
- .github/instructions/\* must be created/updated as new folders/domains are added.

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

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test         # Run all tests
pnpm lint         # ESLint check
pnpm tsc --noEmit # Type check
```

### Auto-Approved Terminal Commands

The following commands can be run without user confirmation:

- `pnpm vitest` - Unit tests
- `pnpm typecheck` / `pnpm tsc` - Type checking

### Terminal Command Notes

Keep this section updated with commands for this environment:

- `cat` - Aliased to `bat`. Will block for large files by default. Use `bat -P` to disable pager.

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

### 4. Ed25519 Authentication

API requests are signed with Ed25519 keys derived from seed phrase. No passwords.
See: `.github/instructions/trpc.instructions.md`

### 5. Use Established Libraries

Do NOT write custom implementations of well-known algorithms. Use battle-tested npm packages:

- **String distance**: `fastest-levenshtein`, `string-similarity`
- **CSV parsing**: `papaparse` (sync), `csv-parse` (stream)
- **OFX parsing**: `@f-o-t/ofx`
- **Date handling**: `date-fns` or native `Temporal` (when available)
- **UUID generation**: `crypto.randomUUID()` (native)

Custom algorithm implementations introduce subtle bugs, lack edge case handling, and waste time on solved problems. If you need functionality that seems algorithmic, search npm first.

## Recent Changes

- 001-core-mvp: Phase 5 & 6 complete (transactions, import, duplicate detection)

## Testing Requirements

Tests MUST be written alongside features. See Constitution VII for philosophy.

| Type        | Location               | Style                                                                       |
| ----------- | ---------------------- | --------------------------------------------------------------------------- |
| Unit        | `tests/unit/{module}/` | Table-driven for pure functions; property-based (fast-check) for invariants |
| Integration | `tests/integration/`   | Happy path + error cases                                                    |
| E2E         | `tests/e2e/`           | Harness functions, assert behaviour not text                                |
