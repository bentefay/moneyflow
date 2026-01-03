# Quickstart: Enhanced Import Flow

**Feature**: 005-enhanced-import-flow  
**Date**: 3 January 2026

## Overview

This feature replaces the existing wizard-based import flow with a redesigned interface featuring:
- Side-by-side raw data and preview table
- Tabbed configuration panel (no "Next" buttons)
- Enhanced duplicate detection with configurable matching
- Old transaction filtering with three modes
- Automatic template selection and persistence

## Prerequisites

1. **Working development environment** - `pnpm dev` runs without errors
2. **Understanding of existing import code** - Read through `src/lib/import/` and `src/components/features/import/`
3. **Familiarity with loro-mirror** - Know how to read/write CRDT data

## Quick Setup

```bash
# Install animate-ui tabs component
npx shadcn@latest add @animate-ui/components-radix-tabs

# Run tests to ensure baseline is green
pnpm test
pnpm test:e2e
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/lib/import/duplicates.ts` | Duplicate detection algorithm |
| `src/lib/import/csv.ts` | CSV parsing and format detection |
| `src/lib/import/ofx.ts` | OFX parsing |
| `src/lib/crdt/schema.ts` | CRDT schema including `importTemplateSchema` |
| `src/components/features/import/ImportWizard.tsx` | Current wizard implementation (to be replaced) |
| `tests/e2e/import.spec.ts` | E2E tests for import flow |

## Implementation Order

### Phase 1: Data Layer (1-2 days)

1. **Extend CRDT schema** (`src/lib/crdt/schema.ts`)
   - Add `duplicateDetection` map to `importTemplateSchema`
   - Add `oldTransactionFilter` map
   - Add `collapseWhitespace` to formatting
   - Add `lastUsedAt` timestamp

2. **Create filter module** (`src/lib/import/filter.ts`)
   - Implement `filterOldTransactions()` pure function
   - Write unit tests in `tests/unit/import/filter.test.ts`

3. **Extend duplicate detection** (`src/lib/import/duplicates.ts`)
   - Add `dateMatchMode` and `descriptionMatchMode`
   - Update `checkDuplicate()` to respect modes
   - Add unit tests for new modes

### Phase 2: State Management (1 day)

1. **Create import state hook** (`src/hooks/use-import-state.ts`)
   - Consolidate all import session state
   - Reactive preview computation
   - Template auto-selection logic

### Phase 3: UI Components (2-3 days)

1. **Create ImportTable** (`src/components/features/import/ImportTable.tsx`)
   - Side-by-side raw/preview layout
   - Row highlighting for duplicates/filtered
   - Virtual scrolling for large files

2. **Create ConfigTabs** (`src/components/features/import/ConfigTabs.tsx`)
   - Template tab (template selection, save)
   - Mapping tab (column assignments)
   - Formatting tab (separators, date format, whitespace)
   - Duplicates tab (detection settings)
   - Account tab (account selection)

3. **Create ImportPanel** (`src/components/features/import/ImportPanel.tsx`)
   - Compose ImportTable + ConfigTabs
   - Import/Cancel actions

### Phase 4: Integration (1 day)

1. **Replace ImportWizard with ImportPanel**
2. **Update existing import button/dialog to use new component**
3. **Ensure template persistence works**

### Phase 5: Testing (1 day)

1. **E2E tests** - All 6 user stories
2. **Unit tests** - Filter, duplicate detection modes
3. **Manual testing** - Edge cases, large files

## Testing Commands

```bash
# Run all tests
pnpm test && pnpm test:e2e

# Run specific test file
pnpm test tests/unit/import/filter.test.ts

# Run E2E import tests
pnpm exec playwright test tests/e2e/import.spec.ts

# Run with UI (for debugging)
pnpm exec playwright test tests/e2e/import.spec.ts --ui
```

## Common Pitfalls

### 1. CRDT Defaults
New schema fields use `defaultValue` - existing templates will have defaults, not `undefined`.

### 2. Integer Money
All amounts are in **minor units** (cents). Use `toMinorUnitsForCurrency()` for conversion.

### 3. Date Handling
Dates are ISO 8601 strings. Use `date-fns` for parsing/comparison, not native Date.

### 4. OFX Account Matching
OFX `<ACCTID>` maps to `Account.accountNumber`, not `Account.id`.

### 5. Template Auto-Selection
Templates are selected by `lastUsedAt` (most recent first), not by name match.

## Architecture Decisions

See [research.md](./research.md) for detailed rationale on:
- animate-ui tabs selection
- Duplicate detection algorithm
- Filter implementation approach
- Split table layout strategy

## API Reference

See [contracts/api.md](./contracts/api.md) for full TypeScript interfaces.
