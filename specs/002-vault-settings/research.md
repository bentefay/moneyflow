# Research: Vault Settings & Navigation Improvements

**Feature**: 002-vault-settings  
**Date**: 31 December 2025

## Research Summary

This feature is largely straightforward as it builds on existing infrastructure. Research confirms no new technologies or patterns are needed—all components exist in the codebase.

## Findings

### 1. Vault Preferences Schema (EXISTS)

**Decision**: Use existing `vaultPreferencesSchema` from `src/lib/crdt/schema.ts`

**Rationale**: The schema already defines `defaultCurrency` with a default value of "USD":

```typescript
export const vaultPreferencesSchema = schema.LoroMap({
  automationCreationPreference: schema.String({ defaultValue: "manual" }),
  defaultCurrency: schema.String({ defaultValue: "USD" }),
});
```

**Alternatives considered**: 
- Create a separate settings document → Rejected: Unnecessary complexity, preferences belong in vault
- Store in Supabase directly → Rejected: Violates client-side encryption principle

### 2. Currency List Source (EXISTS)

**Decision**: Use existing `Currencies` object from `src/lib/domain/currencies.ts`

**Rationale**: Comprehensive list of 160+ currencies with proper ISO 4217 codes, symbols, and decimal digit configuration. Already used throughout the app.

**Alternatives considered**:
- Fetch from external API → Rejected: Offline-first requirement
- Subset of common currencies → Could be done for UX, but full list provides flexibility

### 3. State Access Pattern (EXISTS)

**Decision**: Use existing `useVaultPreferences()` hook from `src/lib/crdt/context.tsx`

**Rationale**: Hook already exists and returns `state.preferences`. For mutations, use `useVaultAction()`:

```typescript
const setDefaultCurrency = useVaultAction((state, currency: string) => {
  state.preferences.defaultCurrency = currency;
});
```

**Alternatives considered**: None—this is the established pattern.

### 4. Navigation Redirect Pattern (EXISTS)

**Decision**: Use Next.js `redirect()` function in page component for /dashboard → /transactions

**Rationale**: Standard Next.js App Router pattern. The redirect happens server-side for direct URL access.

**Implementation**:
```typescript
// src/app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
export default function DashboardPage() {
  redirect("/transactions");
}
```

**Alternatives considered**:
- Middleware redirect → Overkill for single route
- Remove dashboard folder entirely → Keep for potential future use

### 5. New Vault Landing Page Flow

**Decision**: Navigate to `/settings` after vault creation, `/transactions` for existing vaults

**Rationale**: New vaults should configure default currency first. Existing vaults go straight to work.

**Implementation locations**:
- `src/app/(onboarding)/new-user/page.tsx` → Change `/dashboard` to `/settings`
- `src/app/(onboarding)/unlock/page.tsx` → Change `/dashboard` to `/transactions`
- `src/app/(onboarding)/invite/[token]/page.tsx` → Change `/dashboard` to `/transactions`

### 6. Accounts Table Column Structure (NEEDS FIX)

**Decision**: Adjust column widths and ensure consistent alignment in header and rows

**Issue**: Current header and row structures have width mismatches causing visual "mashing":
- Header: `w-5, flex-1, w-28, w-12, w-40, w-28, w-20`
- Row: `w-5, flex-1, w-28, w-12, w-40, w-28, (no explicit width on actions)`

**Fix**: 
1. Add explicit `w-20` to actions column in rows
2. Add "No account number yet" placeholder in AccountRow when `accountNumber` is empty

### 7. Sidebar Menu Styling Consistency

**Decision**: Add `cursor-pointer` to Lock button and ensure all nav items use same component pattern

**Issue**: Lock button is a `<button>` while other nav items are `<Link>`. Button doesn't have cursor-pointer.

**Fix**: Add `cursor-pointer` to the Lock button's className. Both use same hover styles already.

### 8. Currency Selector Component

**Decision**: Use shadcn/ui `<Select>` component with searchable combobox pattern

**Rationale**: 160+ currencies need search/filter. shadcn's combobox pattern provides this.

**Implementation**: Create `CurrencySelector.tsx` in `src/components/features/vault/` using the existing cmdk package (already installed).

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Should settings page show vault name? | Yes, read-only display for context |
| How to handle existing accounts when default currency changes? | No change—only affects new accounts |
| Should currency selector be searchable? | Yes, 160+ options requires search |

## Dependencies

All dependencies are already installed:
- `loro-crdt`, `loro-mirror` - CRDT state management
- `cmdk` - Command palette/combobox for currency search
- `@radix-ui/react-select` - Base select primitive
- shadcn/ui components - Form primitives

## No Further Research Needed

This feature uses established patterns with no new technologies. Ready for Phase 1 design.
