# Implementation Plan: Optional Account Currency & Accounts Page Improvements

**Branch**: `003-account-currency-styling` | **Date**: 2024-12-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-account-currency-styling/spec.md`

## Summary

Make account currency optional with vault default fallback, add default "Me" person on vault creation as 100% owner of default account, improve Accounts page column alignment, and enable inline editing for all account fields (name, number, type, currency).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: Next.js 15, React 19, loro-crdt + loro-mirror, shadcn/ui + Tailwind CSS  
**Storage**: Supabase (Postgres) + IndexedDB (client-side persistence)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web (desktop-first, mobile-friendly)
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: <100ms perceived latency for inline edits (CRDT optimistic updates)  
**Constraints**: Offline-capable, client-side encryption for all vault data  
**Scale/Scope**: Single vault per session, real-time sync between vault members

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security & Privacy First | ✅ PASS | No changes to encryption—schema change only affects CRDT structure |
| II. Multi-Party Financial Integrity | ✅ PASS | Ownership allocations unchanged; "Me" person enables valid 100% ownership |
| III. Data Portability | ✅ PASS | Currency fallback logic documented; no import format changes |
| IV. Auditability & Transparency | ✅ PASS | Currency resolution explicit (account → vault → USD); visual distinction for inherited |
| V. User-Owned Data | ✅ PASS | No new server storage; all changes in existing CRDT document |
| VI. Performance, Beauty & Craft | ✅ PASS | Column alignment + inline editing directly addresses UI polish requirements |
| VII. Robustness & Reliability | ✅ PASS | Must add tests for currency resolution, default person creation |
| VIII. LLM-Agent Friendly | ✅ PASS | Update instructions files if patterns change |
| IX. Code Clarity | ✅ PASS | Pure functions for currency resolution; loro-mirror mutations for state changes |

**Gate Status**: ✅ ALL PASS — proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-account-currency-styling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── crdt/
│   │   ├── schema.ts           # MODIFY: Make currency optional in accountSchema
│   │   ├── defaults.ts         # MODIFY: Add DEFAULT_PERSON, assign to DEFAULT_ACCOUNT
│   │   └── context.ts          # No changes expected
│   └── domain/
│       └── currency.ts         # ADD: resolveAccountCurrency() helper
├── components/
│   └── features/
│       └── accounts/
│           ├── AccountsTable.tsx   # MODIFY: Column width adjustments
│           ├── AccountRow.tsx      # MODIFY: Currency display, inline editing for all fields
│           └── CurrencySelect.tsx  # ADD: Reusable currency selector with "Use vault default"
└── app/
    └── (app)/
        └── accounts/
            └── page.tsx        # No changes expected

tests/
├── unit/
│   ├── crdt/
│   │   └── defaults.test.ts    # ADD: Tests for default person and account ownership
│   └── domain/
│       └── currency.test.ts    # ADD: Tests for resolveAccountCurrency()
└── e2e/
    └── accounts.spec.ts        # ADD/MODIFY: E2E tests for inline editing, currency display
```

**Structure Decision**: Web application structure—all changes are frontend-only (CRDT schema, React components, domain logic). No backend/API changes required.

## Complexity Tracking

> No constitution violations to justify.

---

## Phase 0: Outline & Research

### Research Tasks

1. **loro-mirror optional fields**: How to make a schema field optional that previously had a default value? Does `defaultValue` make it required?
2. **Inline editing patterns**: Best practices for table inline editing with shadcn/ui (Input, Select, keyboard handling)
3. **Currency selector UX**: How to show "Use vault default (USD)" as first option in a dropdown

### Key Decisions

| Decision | Chosen | Rationale | Alternatives Rejected |
|----------|--------|-----------|----------------------|
| Currency field handling | Make truly optional (undefined allowed) | Cleaner than sentinel value; explicit "no currency set" semantics | Sentinel value like "" or "DEFAULT" |
| Default person ID | `person-default-me` | Stable ID for code references; follows existing pattern (`account-default`, `status-for-review`) | Random UUID |
| Inline editing trigger | Click on field value | Consistent with existing name/type editing pattern in AccountRow | Double-click or explicit edit button |
| Currency visual indicator | Muted text + "(default)" suffix | Clear visual hierarchy; unambiguous meaning | Italic only, tooltip only |

---

## Phase 1: Design & Contracts

### Data Model Changes

**File**: `src/lib/crdt/schema.ts`

```typescript
// BEFORE
export const accountSchema = schema.LoroMap({
  // ...
  currency: schema.String({ defaultValue: "USD" }),
  // ...
});

// AFTER
export const accountSchema = schema.LoroMap({
  // ...
  currency: schema.String(), // Optional - falls back to vault default if undefined
  // ...
});
```

**File**: `src/lib/crdt/defaults.ts`

```typescript
// ADD: Default person ID
export const DEFAULT_PERSON_ID = "person-default-me";

// ADD: Default person
export const DEFAULT_PERSON: PersonInput = {
  id: DEFAULT_PERSON_ID,
  name: "Me",
  deletedAt: 0,
};

// MODIFY: Default account to reference default person
export const DEFAULT_ACCOUNT: AccountInput = {
  id: DEFAULT_ACCOUNT_ID,
  name: "Default",
  accountNumber: "",
  currency: undefined, // Use vault default
  accountType: "checking",
  balance: 0,
  ownerships: { [DEFAULT_PERSON_ID]: 100 }, // Me owns 100%
  deletedAt: 0,
};

// MODIFY: getDefaultVaultState() to include default person
export function getDefaultVaultState(): VaultInput {
  return {
    people: { [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } },
    accounts: { [DEFAULT_ACCOUNT_ID]: { ...DEFAULT_ACCOUNT } },
    // ... rest unchanged
  };
}
```

**File**: `src/lib/domain/currency.ts`

```typescript
// ADD: Currency resolution helper
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
  return { code: "USD", isInherited: true }; // Ultimate fallback
}
```

### Component Changes

**File**: `src/components/features/accounts/AccountRow.tsx`

- Add inline editing for currency field (click to show Select)
- Use `resolveAccountCurrency()` for display
- Show muted text + "(default)" for inherited currency
- Adjust column widths for better alignment

**File**: `src/components/features/accounts/AccountsTable.tsx`

- Adjust header column widths to match AccountRow changes
- Pass vault default currency to AccountRow for resolution

**File**: `src/components/features/accounts/CurrencySelect.tsx` (NEW)

- Reusable currency selector component
- First option: "Use vault default ({code})"
- Remaining options: All supported currencies from `Currencies` constant

### API Contracts

No new API contracts required—all changes are CRDT schema and UI.

---

## Phase 2 Preview

Tasks will be generated by `/speckit.tasks` command. Expected task groups:

1. **Schema Changes**: Update accountSchema, add default person constants
2. **Currency Resolution**: Add `resolveAccountCurrency()` with unit tests
3. **AccountRow Updates**: Inline editing, currency display with inheritance indicator
4. **AccountsTable Updates**: Column width adjustments, pass vault preferences
5. **CurrencySelect Component**: New reusable currency selector
6. **E2E Tests**: Account creation, inline editing, currency inheritance display
