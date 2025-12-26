# MoneyFlow Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-23

## Active Technologies

- TypeScript 5.x, Node.js 20.x + Next.js 15, React 19, Supabase, shadcn/ui, Remeda, libsodium (001-core-mvp)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x, Node.js 20.x: Follow standard conventions

## Recent Changes

- 001-core-mvp: Added TypeScript 5.x, Node.js 20.x + Next.js 15, React 19, Supabase, shadcn/ui, Remeda, libsodium

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
