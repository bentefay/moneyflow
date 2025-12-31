# Quickstart: Vault Settings & Navigation Improvements

**Feature**: 002-vault-settings  
**Date**: 31 December 2025

## Prerequisites

- Node.js 20.x
- pnpm 9.x
- Supabase CLI (for local DB)

## Setup

```bash
# Clone and checkout feature branch
git checkout 002-vault-settings

# Install dependencies
pnpm install

# Start local Supabase
pnpm db:start

# Start dev server
pnpm dev
```

## Key Files to Implement

### 1. Vault Settings Page

**Create**: `src/app/(app)/settings/page.tsx`

```tsx
"use client";

import { VaultSettingsForm } from "@/components/features/vault/VaultSettingsForm";

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Vault Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure preferences for this vault.
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <VaultSettingsForm />
      </div>
    </div>
  );
}
```

### 2. Settings Form Component

**Create**: `src/components/features/vault/VaultSettingsForm.tsx`

```tsx
"use client";

import { useVaultAction, useVaultPreferences } from "@/lib/crdt/context";
import { CurrencySelector } from "./CurrencySelector";

export function VaultSettingsForm() {
  const preferences = useVaultPreferences();
  const defaultCurrency = preferences?.defaultCurrency ?? "USD";

  const setDefaultCurrency = useVaultAction((state, currency: string) => {
    state.preferences.defaultCurrency = currency;
  });

  return (
    <div className="max-w-md space-y-6">
      <div>
        <label className="text-sm font-medium">Default Currency</label>
        <p className="text-sm text-muted-foreground mb-2">
          New accounts will use this currency by default.
        </p>
        <CurrencySelector
          value={defaultCurrency}
          onChange={setDefaultCurrency}
        />
      </div>
    </div>
  );
}
```

### 3. Currency Selector Component

**Create**: `src/components/features/vault/CurrencySelector.tsx`

Uses shadcn Combobox pattern with cmdk for search.

### 4. Navigation Updates

**Modify**: `src/app/(app)/layout.tsx`

```diff
- const bottomNavItems: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];
+ const bottomNavItems: NavItem[] = [{ href: "/settings", label: "Vault Settings", icon: Settings }];

  const mainNavItems: NavItem[] = [
-   { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    // ...rest unchanged
  ];

  // Logo link
- <Link href="/dashboard" ...>
+ <Link href="/transactions" ...>

  // Lock button - add cursor-pointer
  <button
    onClick={...}
-   className="flex w-full items-center gap-3 ..."
+   className="flex w-full cursor-pointer items-center gap-3 ..."
  >
```

### 5. Dashboard Redirect

**Modify**: `src/app/(app)/dashboard/page.tsx`

```tsx
import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/transactions");
}
```

### 6. Onboarding Navigation Changes

**Modify**: `src/app/(onboarding)/new-user/page.tsx`
```diff
- router.push("/dashboard");
+ router.push("/settings");
```

**Modify**: `src/app/(onboarding)/unlock/page.tsx`
```diff
- router.replace("/dashboard");
+ router.replace("/transactions");
```

### 7. Accounts Page Fixes

**Modify**: `src/components/features/accounts/AccountRow.tsx`

Add placeholder for missing account number:
```tsx
{account.accountNumber ? (
  <div className="truncate text-sm text-muted-foreground">
    ···{account.accountNumber.slice(-4)}
  </div>
) : (
  <div className="text-sm text-muted-foreground/50 italic">
    No account number yet
  </div>
)}
```

**Modify**: `src/components/features/accounts/AccountsTable.tsx`

Ensure header and row column widths match exactly.

## Testing

### Unit Tests

**Create**: `tests/unit/crdt/vault-preferences.test.ts`

```typescript
import { describe, it, expect } from "vitest";
// Test preference reading and mutation

describe("vault preferences", () => {
  it("should default to USD currency", () => {
    // ...
  });

  it("should persist currency change", () => {
    // ...
  });
});
```

### E2E Tests

**Create**: `tests/e2e/vault-settings.spec.ts`

```typescript
import { test, expect } from "@playwright/test";
import { loginAsNewUser, loginAsExistingUser } from "./helpers/auth";

test("new user lands on settings page", async ({ page }) => {
  await loginAsNewUser(page);
  await expect(page).toHaveURL(/\/settings/);
});

test("existing user lands on transactions page", async ({ page }) => {
  await loginAsExistingUser(page);
  await expect(page).toHaveURL(/\/transactions/);
});

test("can change default currency", async ({ page }) => {
  await loginAsNewUser(page);
  // ... select EUR, verify persistence
});
```

## Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Verification Checklist

- [x] New vault creation navigates to /settings
- [x] Existing vault unlock navigates to /transactions
- [x] "Vault Settings" appears in sidebar (not "Settings")
- [x] Dashboard redirects to /transactions
- [x] Currency selector shows all currencies with search
- [x] Selected currency persists after page refresh
- [x] New accounts default to vault's currency
- [x] Lock button has pointer cursor
- [x] Accounts table columns are properly aligned
- [x] Missing account numbers show placeholder
