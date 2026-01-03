# Implementation Plan: Transaction Table UX Improvements

**Branch**: `004-transaction-table-ux` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-transaction-table-ux/spec.md`

## Summary

Comprehensive UX overhaul of the transaction table to enable seamless inline editing, checkbox-based bulk selection, and improved visual hierarchy. Key changes: always-editable cell appearance, leftmost checkbox column with select-all-filtered, bulk edit for tags/description/amount, merchant/description field separation with expandable description rows, dedicated Account column, column alignment fixes, Temporal API date formatting, and Actions column.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: Next.js 15 (App Router), React 19, loro-mirror, TanStack Virtual, shadcn/ui, Tailwind CSS  
**Storage**: Loro CRDT via loro-mirror (client-side), Supabase (encrypted sync)  
**Testing**: Vitest (unit), Playwright (E2E), fast-check (property-based)  
**Target Platform**: Web (responsive, not mobile-first)  
**Project Type**: Web application (Next.js monorepo)  
**Performance Goals**: <100ms perceived latency for cell edits, bulk select 500 txns in <100ms, bulk edit 100 txns in <2s  
**Constraints**: Offline-capable, <500ms sync latency, virtualized rendering for 10k+ rows  
**Scale/Scope**: 10k+ transactions per vault, multi-user concurrent editing

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security & Privacy | ✅ Pass | No new server-side data; all edits remain client-encrypted |
| II. Multi-Party Integrity | ✅ Pass | Bulk edits use CRDT; allocations unchanged |
| III. Data Portability | ✅ Pass | No changes to import/export |
| IV. Auditability | ✅ Pass | Loro tracks all changes |
| V. User-Owned Data | ✅ Pass | No new vendor dependencies |
| VI. Performance & Beauty | ✅ Pass | Always-editable cells eliminate jitter; targets defined |
| VII. Robustness | ✅ Pass | Unit tests for hooks; E2E for user flows |
| VIII. LLM-Agent Friendly | ✅ Pass | Components follow existing patterns |
| IX. Code Clarity | ✅ Pass | Pure functions, immutable patterns, clear naming |

**Gate Status**: ✅ PASSED (Pre-Phase 0 and Post-Phase 1)

## Project Structure

### Documentation (this feature)

```text
specs/004-transaction-table-ux/
├── plan.md              # This file
├── research.md          # Phase 0: Temporal API, virtualization patterns
├── data-model.md        # Phase 1: Transaction.merchant, Transaction.description
├── quickstart.md        # Phase 1: Implementation guide
├── contracts/           # Phase 1: Component prop interfaces
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (files to create/modify)

```text
src/
├── components/
│   └── features/
│       └── transactions/
│           ├── TransactionTable.tsx         # MODIFY: Add checkbox column, keyboard nav
│           ├── TransactionTableHeader.tsx   # NEW: Extract header with select-all checkbox
│           ├── TransactionRow.tsx           # MODIFY: Add checkbox, editable cells
│           ├── TransactionDescriptionRow.tsx # NEW: Expandable description row
│           ├── BulkEditToolbar.tsx          # MODIFY: Add description/amount buttons
│           ├── InlineTagEditor.tsx          # MODIFY: Always-visible create button
│           ├── cells/
│           │   ├── EditableCell.tsx         # NEW: Base component for all editable cells
│           │   ├── CheckboxCell.tsx         # NEW: Selection checkbox
│           │   ├── MerchantCell.tsx         # NEW: Renamed from description handling
│           │   ├── DateCell.tsx             # MODIFY: Use Temporal API
│           │   ├── AccountCell.tsx          # MODIFY: Dropdown selector
│           │   ├── TagsCell.tsx             # MODIFY: Connect to new InlineTagEditor
│           │   ├── StatusCell.tsx           # MODIFY: Editable styling
│           │   ├── AmountCell.tsx           # MODIFY: Editable styling
│           │   ├── BalanceCell.tsx          # Minor: Alignment only
│           │   └── ActionsCell.tsx          # NEW: Action buttons column
│           └── hooks/
│               ├── useTableSelection.ts     # NEW: Selection state with virtualization support
│               ├── useKeyboardNavigation.ts # NEW: Arrow key cell navigation
│               └── useBulkEdit.ts           # NEW: Bulk operation logic
├── lib/
│   └── utils/
│       └── date-format.ts                   # NEW: Temporal API date formatting
└── hooks/
    └── useTransactionSelection.ts           # MODIFY: Support virtualized selection

tests/
├── unit/
│   └── transactions/
│       ├── date-format.test.ts              # NEW: Temporal API formatting
│       └── selection.test.ts                # NEW: Selection state logic
├── e2e/
│   └── transactions.spec.ts                 # MODIFY: Add inline edit, bulk edit tests
```

**Structure Decision**: Follows existing Next.js App Router structure. New components co-located with existing transaction components. Hooks extracted for testability and reuse.

## Complexity Tracking

No constitution violations requiring justification.

---

# Phase 0: Research

## Research Tasks

1. **Temporal API browser support & polyfill strategy**
2. **TanStack Virtual selection tracking for non-rendered rows**
3. **Always-editable cell patterns (no mode switch)**
4. **Bulk CRDT operations with loro-mirror**

See [research.md](./research.md) for detailed findings.

---

# Phase 1: Design & Contracts

## Data Model Changes

See [data-model.md](./data-model.md) for complete entity definitions.

**Summary of CRDT schema changes**:

```typescript
// Transaction schema already has merchant + description fields
// No schema changes required - fields already exist:
// - merchant: schema.String({ defaultValue: "" })
// - description: schema.String({ defaultValue: "" })
```

**New UI State** (not persisted to CRDT):

```typescript
// Selection state - managed in React
interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  isAllSelected: boolean; // True when header checkbox is checked
}

// Expanded descriptions - managed in React
interface ExpandedState {
  expandedIds: Set<string>; // Transaction IDs with description row visible
}

// Keyboard focus - managed in React
interface FocusState {
  focusedCell: { rowId: string; column: string } | null;
  isEditing: boolean;
}
```

## Component Contracts

See [contracts/](./contracts/) for TypeScript interfaces.

**Key New Components**:

1. **EditableCell** - Base wrapper providing always-editable appearance
2. **CheckboxCell** - Individual row checkbox with shift-click support
3. **TransactionTableHeader** - Extracted header with select-all logic
4. **TransactionDescriptionRow** - Expandable row for memo/notes
5. **ActionsCell** - Action buttons (add description, delete, etc.)
6. **useTableSelection** - Hook managing selection across virtualized rows
7. **useKeyboardNavigation** - Arrow key navigation between cells

## Quickstart Guide

See [quickstart.md](./quickstart.md) for implementation order and patterns.
