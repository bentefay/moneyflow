# Quickstart: Optional Account Currency & Accounts Page Improvements

**Feature**: 003-account-currency-styling  
**Date**: 2024-12-31

## Overview

This feature makes account currency optional (falls back to vault default), adds a default "Me" person on vault creation, improves Accounts page column alignment, and enables inline editing for all account fields.

## Prerequisites

- Node.js 20.x
- pnpm
- Supabase CLI (for local development)

## Quick Setup

```bash
# Ensure you're on the feature branch
git checkout 003-account-currency-styling

# Install dependencies
pnpm install

# Start Supabase (if not running)
pnpm supabase start

# Start dev server
pnpm dev
```

## Key Files to Modify

### 1. Schema Changes

**`src/lib/crdt/schema.ts`**
```typescript
// Line ~47: Change currency field
currency: schema.String(), // Remove { defaultValue: "USD" }
```

### 2. Default Person & Account

**`src/lib/crdt/defaults.ts`**
```typescript
// Add after DEFAULT_ACCOUNT_ID constant
export const DEFAULT_PERSON_ID = "person-default-me";

export const DEFAULT_PERSON: PersonInput = {
  id: DEFAULT_PERSON_ID,
  name: "Me",
  deletedAt: 0,
};

// Modify DEFAULT_ACCOUNT
export const DEFAULT_ACCOUNT: AccountInput = {
  id: DEFAULT_ACCOUNT_ID,
  name: "Default",
  accountNumber: "",
  currency: undefined, // Changed from "USD"
  accountType: "checking",
  balance: 0,
  ownerships: { [DEFAULT_PERSON_ID]: 100 }, // Changed from {}
  deletedAt: 0,
};

// Modify getDefaultVaultState()
export function getDefaultVaultState(): VaultInput {
  return {
    people: { [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } }, // Added
    accounts: { [DEFAULT_ACCOUNT_ID]: { ...DEFAULT_ACCOUNT } },
    // ... rest unchanged
  };
}
```

### 3. Currency Resolution Helper

**`src/lib/domain/currency.ts`** (ADD function)
```typescript
export function resolveAccountCurrency(
  accountCurrency: string | undefined,
  vaultDefaultCurrency: string | undefined
): { code: string; isInherited: boolean } {
  if (accountCurrency) {
    return { code: accountCurrency, isInherited: false };
  }
  if (vaultDefaultCurrency) {
    return { code: vaultDefaultCurrency, isInherited: true };
  }
  return { code: "USD", isInherited: true };
}
```

### 4. AccountRow Currency Display

**`src/components/features/accounts/AccountRow.tsx`**
```tsx
// Import the resolver
import { resolveAccountCurrency } from "@/lib/domain/currency";

// In component, resolve currency
const { code: resolvedCurrency, isInherited } = resolveAccountCurrency(
  account.currency,
  vaultDefaultCurrency // Pass from parent via props
);

// Display with inheritance indicator
<div className="w-16 shrink-0 text-center text-sm">
  <span className={isInherited ? "text-muted-foreground italic" : ""}>
    {resolvedCurrency}
  </span>
  {isInherited && <span className="text-muted-foreground/60 text-xs"> (default)</span>}
</div>
```

### 5. Column Width Adjustments

**`src/components/features/accounts/AccountsTable.tsx`** (header)
```tsx
<div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2 font-medium text-sm">
  <div className="w-5 shrink-0" />
  <div className="flex-1">Account</div>
  <div className="w-28 shrink-0">Type</div>
  <div className="w-24 shrink-0">Currency</div>       {/* Was w-12 */}
  <div className="hidden w-40 shrink-0 md:block">Owners</div>
  <div className="w-28 shrink-0 text-right">Balance</div>
  <div className="w-20 shrink-0" />
</div>
```

**`src/components/features/accounts/AccountRow.tsx`** (data row)
```tsx
{/* Currency - adjust width to match header */}
<div className="w-24 shrink-0 text-sm">
  {/* ... currency display ... */}
</div>
```

## Testing the Changes

### Manual Testing

1. **New vault creation**:
   - Create a new identity (clear localStorage, go to `/new-user`)
   - Verify vault has "Me" person in People page
   - Verify default account shows "Me (100%)" as owner
   - Verify default account shows "(default)" next to currency

2. **Inline currency editing**:
   - Go to Accounts page
   - Click on currency value
   - Select "Use vault default" → should show with "(default)" indicator
   - Select explicit currency (EUR) → should show without indicator

3. **Column alignment**:
   - View Accounts page with multiple accounts
   - Verify columns are visually aligned with headers
   - Verify no cramped spacing between Currency and Owners

### Automated Tests

```bash
# Unit tests for currency resolution
pnpm test -- src/lib/domain/currency.test.ts

# Unit tests for defaults
pnpm test -- src/lib/crdt/defaults.test.ts

# E2E tests for accounts
pnpm playwright test accounts.spec.ts
```

## Common Issues

### TypeScript errors about `currency` being possibly undefined

Update code to handle undefined:
```typescript
// Before
const currency = account.currency;

// After
const { code: currency } = resolveAccountCurrency(account.currency, vaultDefault);
```

### Existing tests failing

Tests that assert `account.currency === "USD"` may fail if the account was created without explicit currency. Update to use resolution logic.

## Next Steps

After implementation:
1. Run `pnpm typecheck` to catch type errors
2. Run `pnpm test` for unit tests
3. Run `pnpm playwright test` for E2E tests
4. Run `pnpm lint && pnpm format` before committing
