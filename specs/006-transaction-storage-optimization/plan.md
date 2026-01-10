# Implementation Plan: Transaction Storage Optimization

**Branch**: `006-transaction-storage-optimization` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-transaction-storage-optimization/spec.md`

## Summary

Restructure transaction storage from a flat `LoroMapRecord<Transaction>` to a hierarchical `Account → Year → Month → Day → LoroList<Transaction>` structure to enable:

- O(1) account filtering (select subtree instead of scanning all)
- Fine-grained memoization (unchanged months don't recompute)
- Efficient imports without full re-sort
- Linear-time duplicate detection via sorted merge

Additionally, refactor duplicate handling from `duplicateOf` reference to nested `suspectedDuplicates` list for better UX (grouped display, swap/unnest operations).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x, React 19  
**Primary Dependencies**: Loro CRDT (loro-mirror), Next.js 15, shadcn/ui, Tailwind CSS  
**Storage**: Loro CRDT document → IndexedDB (client), Supabase (server sync)  
**Testing**: Vitest (unit), fast-check (property-based), Playwright (E2E)  
**Target Platform**: Web (Next.js App Router), mobile-responsive  
**Project Type**: Web application (Next.js full-stack)  
**Performance Goals**:

- First render <500ms for 100k transactions
- 60fps scrolling
- <100ms for single transaction edit
- <3s for 500-transaction import into 50k existing  
  **Constraints**:
- Client-side encryption (no plaintext on server)
- Offline-first (IndexedDB immediate, server sync throttled)
- CRDT consistency (handle concurrent bucket creation)  
  **Scale/Scope**: 100,000+ transactions per vault, 5+ accounts, 10+ years of data

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                  | Status  | Notes                                                                      |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------- |
| I. Security & Privacy First                | ✅ PASS | No changes to encryption model - transactions remain encrypted             |
| II. Multi-Party Financial Integrity        | ✅ PASS | Allocation sums preserved; storage restructure doesn't affect calculations |
| III. Data Portability & Import Flexibility | ✅ PASS | Import flow enhanced with better duplicate detection                       |
| IV. Auditability & Transparency            | ✅ PASS | Transaction linkage preserved; nested duplicates improve traceability      |
| V. User-Owned Data Architecture            | ✅ PASS | No server-side changes; offline-capable maintained                         |
| VI. Performance, Beauty & Craft            | ✅ PASS | Primary goal is performance; duplicate UX improved                         |
| VII. Robustness & Reliability              | ✅ PASS | Property-based tests for ordering invariants; edge cases documented        |
| VIII. LLM-Agent Friendly Codebase          | ✅ PASS | Clear hierarchical structure; explicit helpers                             |
| IX. Code Clarity                           | ✅ PASS | loro-mirror draft mutations; pure lookup helpers                           |

**Gate Result**: PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/006-transaction-storage-optimization/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── crdt/
│   │   ├── schema.ts           # Update: hierarchical transaction schema
│   │   ├── queries.ts          # Update: hierarchical query helpers
│   │   ├── mutations.ts        # New: transaction mutation helpers
│   │   └── context.tsx         # Existing: useVaultSelector, useVaultAction
│   ├── import/
│   │   ├── duplicates.ts       # Update: linear duplicate detection
│   │   └── processor.ts        # Update: set creationInstant, importRowIndex
│   └── domain/
│       └── balance.ts          # Update: use hierarchical structure for aggregates
├── components/
│   └── features/
│       └── transactions/
│           ├── TransactionTable.tsx    # Update: render from hierarchical data
│           ├── TransactionRow.tsx      # Update: nested duplicate display
│           └── DuplicateBadge.tsx      # Update: swap/unnest actions
└── app/
    └── (app)/
        └── transactions/
            └── page.tsx        # Update: use new query structure

tests/
├── unit/
│   ├── crdt/
│   │   ├── hierarchical-schema.test.ts  # New: schema tests
│   │   └── transaction-queries.test.ts  # New: lookup/mutation tests
│   └── import/
│       └── duplicates.test.ts           # Update: linear detection tests
├── integration/
│   └── transaction-operations.test.ts   # New: full flow tests
└── e2e/
    └── transactions.spec.ts             # Update: E2E for new duplicate UX
```

**Structure Decision**: Web application structure - all code in `src/` with feature-organized components. Tests mirror source structure in `tests/`.

## Complexity Tracking

No constitution violations to justify.
