# Data Model: Optional Account Currency & Accounts Page Improvements

**Feature**: 003-account-currency-styling  
**Date**: 2024-12-31

## Entity Changes

### Account (Modified)

**File**: `src/lib/crdt/schema.ts`

| Field | Type | Required | Default | Change |
|-------|------|----------|---------|--------|
| id | string | ✅ | - | No change |
| name | string | ✅ | - | No change |
| accountNumber | string | ❌ | - | No change |
| **currency** | string | **❌** | **-** | **MODIFIED: Remove defaultValue, allow undefined** |
| accountType | string | ❌ | "checking" | No change |
| balance | number | ❌ | 0 | No change |
| ownerships | Record<string, number> | ❌ | {} | No change |
| deletedAt | number | ❌ | - | No change |

**Currency Resolution Logic**:
```
account.currency → vault.preferences.defaultCurrency → "USD"
```

### Person (New Default Entity)

**File**: `src/lib/crdt/defaults.ts`

| Field | Value |
|-------|-------|
| id | `"person-default-me"` |
| name | `"Me"` |
| linkedUserId | `undefined` |
| deletedAt | `0` |

**Rationale**: Every new vault starts with a "Me" person so the default account can have valid ownership.

### Default Account (Modified)

**File**: `src/lib/crdt/defaults.ts`

| Field | Before | After |
|-------|--------|-------|
| currency | `"USD"` | `undefined` |
| ownerships | `{}` | `{ "person-default-me": 100 }` |

## Constants

**File**: `src/lib/crdt/defaults.ts`

```typescript
// New constant
export const DEFAULT_PERSON_ID = "person-default-me";

// Existing constants (unchanged)
export const DEFAULT_ACCOUNT_ID = "account-default";
export const DEFAULT_STATUS_IDS = { FOR_REVIEW: "...", PAID: "..." };
```

## Type Changes

**File**: `src/lib/crdt/schema.ts`

```typescript
// Account type inference changes
// Before: currency: string (always defined due to defaultValue)
// After: currency: string | undefined
```

**Impact**: Code accessing `account.currency` must handle `undefined`. Use:
- `account.currency ?? vaultDefault` for display
- `resolveAccountCurrency(account.currency, vault.defaultCurrency)` helper

## Domain Logic

**File**: `src/lib/domain/currency.ts` (ADD)

```typescript
/**
 * Resolves the effective currency for an account.
 * 
 * Resolution order:
 * 1. Explicit account currency (if set)
 * 2. Vault default currency (if set)
 * 3. "USD" (ultimate fallback)
 * 
 * @returns Object with resolved code and whether it's inherited
 */
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

## Validation Rules

| Rule | Enforcement |
|------|-------------|
| Account currency must be valid ISO 4217 code if set | Existing: `Currencies` lookup |
| Account must have at least one owner | UI warning (existing); default "Me" prevents empty state |
| Ownership percentages must sum to 100% | Existing: `isValidOwnership()` |

## Migration

**Required**: None

**Rationale**: 
- Existing accounts have explicit `currency` values set → continue working
- New accounts can omit `currency` → inherit from vault
- Existing vaults without default person → backward compatible (no runtime error)
- Schema change is additive (removing `defaultValue` constraint)

## State Diagram: Currency Resolution

```
┌─────────────────────────────────────────────────────────┐
│                    Account Record                        │
│  currency: string | undefined                           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ account.currency set?  │
              └────────────────────────┘
                    │           │
                   YES          NO
                    │           │
                    ▼           ▼
        ┌──────────────┐  ┌─────────────────────┐
        │ Use explicit │  │ vault.defaultCurrency│
        │ currency     │  │ set?                 │
        │ isInherited: │  └─────────────────────┘
        │ false        │       │           │
        └──────────────┘      YES          NO
                               │           │
                               ▼           ▼
                   ┌──────────────┐  ┌──────────────┐
                   │ Use vault    │  │ Use "USD"    │
                   │ default      │  │ isInherited: │
                   │ isInherited: │  │ true         │
                   │ true         │  └──────────────┘
                   └──────────────┘
```
