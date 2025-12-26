# MoneyFlow Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-26

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

## Recent Changes

- 001-core-mvp: Phase 5 & 6 complete (transactions, import, duplicate detection)

<!-- MANUAL ADDITIONS START -->

## Testing Requirements

Tests MUST be written alongside or immediately after each feature. Do not defer tests to a later phase.

### Test Philosophy (from Constitution)

- **High-level, concise tests** over thousands of unit tests with excessive mocking
- **Table-driven tests** for pure functions—declarative, immediately obvious which cases are covered
- **Property-based tests** (fast-check) for calculations where invariants matter
- **Test harnesses** that make tests easy to understand

### Test File Locations

- Unit tests: `tests/unit/{module}/{file}.test.ts`
- Integration tests: `tests/integration/{feature}.test.ts`
- E2E tests: `tests/e2e/{flow}.spec.ts`

### Test Style

For pure functions, use table-driven tests with descriptive case names:

```typescript
import { describe, it, expect } from "vitest";

describe("functionName", () => {
  const cases = [
    { name: "handles empty input", input: "", expected: "" },
    { name: "trims whitespace", input: "  hello  ", expected: "hello" },
    { name: "handles unicode", input: "über", expected: "über" },
  ] as const;

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(functionName(input)).toBe(expected);
    });
  });
});
```

For async crypto functions, use `it.each` or similar patterns:

```typescript
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

describe("encrypt/decrypt roundtrip", () => {
  it("roundtrips arbitrary data", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 0, maxLength: 1000 }), async (data) => {
        const key = await generateVaultKey();
        const encrypted = await encryptForStorage(data, key);
        const decrypted = await decryptFromStorage(encrypted, key);
        expect(decrypted).toEqual(data);
      })
    );
  });
});
```

### When Writing Features

1. **Pure functions**: Add table-driven unit tests in `tests/unit/`
2. **Crypto operations**: Add roundtrip tests and property-based tests
3. **API endpoints**: Add integration tests for happy path + error cases
4. **User flows**: Add E2E tests for critical paths (identity, transactions, sync)

### Testing Stack

- **Vitest**: Unit and integration tests
- **fast-check**: Property-based testing for invariants
- **Playwright**: E2E browser tests
- **@testing-library/react**: Component tests (when needed)

<!-- MANUAL ADDITIONS END -->
