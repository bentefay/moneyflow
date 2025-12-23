# Quickstart: MoneyFlow Development

**Date**: 2025-12-23

## Prerequisites

| Tool         | Version  | Installation                                                                         |
| ------------ | -------- | ------------------------------------------------------------------------------------ |
| Node.js      | 20.x LTS | [nodejs.org](https://nodejs.org) or `nvm install 20`                                 |
| pnpm         | 8.x+     | `npm install -g pnpm`                                                                |
| Supabase CLI | Latest   | `brew install supabase/tap/supabase` or [docs](https://supabase.com/docs/guides/cli) |

## 1. Clone & Install

```bash
# Clone repository
git clone <repo-url>
cd MoneyFlow

# Install dependencies
pnpm install
```

## 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase (get from Supabase dashboard or local dev)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# CAPTCHA (get from hCaptcha or Turnstile dashboard)
NEXT_PUBLIC_CAPTCHA_SITE_KEY=your-site-key
CAPTCHA_SECRET_KEY=your-secret-key
```

## 3. Supabase Local Development

```bash
# Start local Supabase (Postgres, Realtime, Auth)
supabase start

# This outputs your local credentials:
# - API URL: http://localhost:54321
# - anon key: eyJ...
# - service_role key: eyJ...

# Apply database migrations
supabase db reset
```

**First-time setup**: The migrations create all tables, indexes, and RLS policies.

## 4. Run Development Server

```bash
# Start Next.js dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## 5. Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth pages (login, register)
│   ├── (marketing)/          # Landing page
│   ├── (app)/                # Main app (requires auth)
│   └── api/                  # API routes
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── features/             # Feature components
├── lib/
│   ├── crypto/               # Encryption utilities
│   ├── crdt/                 # HLC, event handling
│   ├── sync/                 # Supabase sync
│   └── domain/               # Business logic
├── hooks/                    # React hooks
└── types/                    # TypeScript types

tests/
├── unit/                     # Vitest unit tests
├── integration/              # Integration tests
└── e2e/                      # Playwright e2e tests
```

## 6. Common Commands

```bash
# Development
pnpm dev                      # Start dev server
pnpm build                    # Build for production
pnpm start                    # Start production server

# Testing
pnpm test                     # Run unit tests (Vitest)
pnpm test:watch               # Watch mode
pnpm test:e2e                 # Run Playwright e2e tests
pnpm test:e2e:ui              # Playwright with UI

# Code Quality
pnpm lint                     # ESLint
pnpm typecheck                # TypeScript check
pnpm format                   # Prettier

# Database
supabase db reset             # Reset DB and apply migrations
supabase db diff              # Generate migration from changes
supabase migration new <name> # Create new migration
```

## 7. Adding shadcn/ui Components

```bash
# Initialize (first time only)
pnpm dlx shadcn@latest init

# Add components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add dialog
# etc.
```

## 8. Key Conventions

### TypeScript

- **Strict mode enabled** - no `any` unless absolutely necessary
- **Zod for validation** - all external data validated with Zod schemas
- **Remeda for FP** - prefer `pipe`, `map`, `filter` over imperative loops

### React

- **Server Components by default** - use `'use client'` only when needed
- **Hooks for client state** - use Context sparingly
- **Error boundaries** - wrap feature sections

### File Naming

- **Components**: `PascalCase.tsx` (e.g., `TransactionTable.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatCurrency.ts`)
- **Types**: `types.ts` in relevant directory
- **Tests**: `*.test.ts` or `*.spec.ts`

### Git

- **Branch naming**: `###-feature-name` (e.g., `001-core-mvp`)
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **PRs**: Include constitution compliance statement

## 9. Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/crypto/encryption.test.ts
import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("encryption", () => {
  it("should round-trip data", async () => {
    const key = await generateKey();
    const plaintext = "sensitive data";
    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });
});
```

### Property-Based Tests (fast-check)

```typescript
// tests/unit/domain/allocations.test.ts
import { fc } from "@fast-check/vitest";
import { describe, it } from "vitest";

describe("allocation math", () => {
  it.prop([fc.array(fc.integer({ min: -100, max: 100 }))])(
    "should sum correctly",
    (percentages) => {
      const result = calculateAllocations(percentages);
      // Invariant: should not lose or gain money
      expect(result.total).toBe(percentages.reduce((a, b) => a + b, 0));
    }
  );
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/transactions.spec.ts
import { test, expect } from "@playwright/test";

test("user can create a transaction", async ({ page }) => {
  await page.goto("/transactions");
  await page.click('button:has-text("Add Transaction")');
  await page.fill('[data-testid="merchant"]', "Grocery Store");
  await page.fill('[data-testid="amount"]', "-50.00");
  await page.click('button:has-text("Save")');
  await expect(page.locator("text=Grocery Store")).toBeVisible();
});
```

## 10. Debugging Tips

### Supabase

```bash
# View logs
supabase logs

# Open Supabase Studio (local)
open http://localhost:54323

# Check Realtime status
supabase status
```

### Crypto

```typescript
// Debug encryption
console.log("Encrypted length:", encrypted.length);
console.log("IV:", encrypted.slice(0, 24)); // First 12 bytes hex

// Verify key derivation
const testKey = await deriveKey("password", salt);
console.log("Key fingerprint:", await hashKey(testKey));
```

### CRDT

```typescript
// Log event application
console.log("Applying event:", event.type, event.hlc);
console.log("State before:", JSON.stringify(state, null, 2));
const newState = applyEvent(state, event);
console.log("State after:", JSON.stringify(newState, null, 2));
```

## 11. Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod
```

**Environment Variables** (set in Vercel dashboard):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
- `CAPTCHA_SECRET_KEY`

## 12. Troubleshooting

| Issue                | Solution                                           |
| -------------------- | -------------------------------------------------- |
| Supabase won't start | `supabase stop && supabase start`                  |
| Auth not working     | Check anon key matches `.env.local`                |
| Realtime not syncing | Verify RLS policies; check `supabase logs`         |
| Crypto errors        | Ensure HTTPS (or localhost); check browser support |
| Build fails          | `rm -rf .next && pnpm build`                       |

## 13. Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Remeda](https://remedajs.com/)
- [libsodium.js](https://github.com/nickt/libsodium.js)
- [@noble/hashes](https://github.com/paulmillr/noble-hashes) - HKDF for domain-separated key derivation
- [Temporal API Polyfill](https://github.com/tc39/proposal-temporal)
