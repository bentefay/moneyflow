# Data Model: Vault Settings & Navigation Improvements

**Feature**: 002-vault-settings  
**Date**: 31 December 2025

## Overview

This feature primarily uses existing data structures. The vault preferences entity already exists in the CRDT schema—no schema changes required.

## Existing Entities (No Changes)

### VaultPreferences

Already defined in `src/lib/crdt/schema.ts`:

```typescript
export const vaultPreferencesSchema = schema.LoroMap({
  /** Automation creation preference */
  automationCreationPreference: schema.String({ defaultValue: "manual" }),
  /** Default currency for new accounts and imports (ISO 4217 code) */
  defaultCurrency: schema.String({ defaultValue: "USD" }),
});
```

**Location in Vault Document**: `vault.preferences`

**Fields**:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `automationCreationPreference` | string | "manual" | Whether to auto-create automations |
| `defaultCurrency` | string | "USD" | ISO 4217 currency code for new accounts |

### Currency (Reference Data)

Not stored in vault—defined in `src/lib/domain/currencies.ts`:

```typescript
interface Currency {
  symbol: string;       // Display symbol (e.g., "$", "€")
  name: string;         // Full name (e.g., "US Dollar")
  symbol_native: string; // Native symbol
  decimal_digits: number; // Minor unit precision (e.g., 2 for cents)
  rounding: number;     // Rounding increment
  code: string;         // ISO 4217 code (e.g., "USD")
  name_plural: string;  // Plural form
}
```

**Usage**: Currency selector displays `code` and `name`, stores `code` in preferences.

## State Access Patterns

### Reading Preferences

```typescript
import { useVaultPreferences } from "@/lib/crdt/context";

function MyComponent() {
  const preferences = useVaultPreferences();
  const defaultCurrency = preferences?.defaultCurrency ?? "USD";
}
```

### Updating Preferences

```typescript
import { useVaultAction } from "@/lib/crdt/context";

function SettingsForm() {
  const setDefaultCurrency = useVaultAction((state, currency: string) => {
    state.preferences.defaultCurrency = currency;
  });

  const handleChange = (currency: string) => {
    setDefaultCurrency(currency);
  };
}
```

## Account Creation Integration

When creating a new account, use vault's default currency:

```typescript
import { useVaultPreferences, useVaultAction } from "@/lib/crdt/context";

function useCreateAccount() {
  const preferences = useVaultPreferences();
  const defaultCurrency = preferences?.defaultCurrency ?? "USD";

  const addAccount = useVaultAction((state, data: AccountInput) => {
    state.accounts[data.id] = {
      ...data,
      currency: data.currency ?? defaultCurrency, // Use vault default
    };
  });

  return addAccount;
}
```

## Validation Rules

| Field | Validation |
|-------|------------|
| `defaultCurrency` | Must be valid ISO 4217 code from `Currencies` object |

## No Database Migrations

All data changes are within the encrypted CRDT vault document. No Supabase schema changes required.

## Entity Relationship Summary

```
Vault Document
├── preferences
│   ├── automationCreationPreference: string
│   └── defaultCurrency: string ─────────────┐
├── accounts                                  │
│   └── [id]                                  │
│       └── currency: string ◄────────────────┘ (uses as default)
└── ...other collections
```
