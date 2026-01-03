# Implementation Plan: Enhanced Import Flow

**Branch**: `005-enhanced-import-flow` | **Date**: 3 January 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-enhanced-import-flow/spec.md`

## Summary

Redesign the import flow to replace the sequential wizard with a tabbed configuration panel alongside a unified raw/preview table. Add configurable duplicate detection (date tolerance, description similarity), old transaction filtering with three modes, account selection for both CSV and OFX, and whitespace normalization. Settings are persisted per-template in the vault CRDT.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: Next.js 15 (App Router), React 19, loro-mirror, shadcn/ui, animate-ui tabs  
**Storage**: Loro CRDT (client-side), Supabase (server sync), IndexedDB (persistence)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web (desktop-first, mobile-responsive)  
**Project Type**: Web application (monorepo with single Next.js app)  
**Performance Goals**: <500ms preview update on setting change, <100ms tab switch  
**Constraints**: Offline-capable, client-side encryption for all vault data  
**Scale/Scope**: Individual users importing 50-500 transactions per file

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security & Privacy First | ✅ PASS | No changes to encryption; import processing remains client-side |
| II. Multi-Party Financial Integrity | ✅ PASS | Allocations unchanged; new transactions get default allocation |
| III. Data Portability & Import Flexibility | ✅ PASS | Enhances import with better duplicate detection, more formats |
| IV. Auditability & Transparency | ✅ PASS | Import templates provide audit trail of settings used |
| V. User-Owned Data Architecture | ✅ PASS | Templates stored in vault CRDT, exportable with other data |
| VI. Performance, Beauty & Craft | ✅ PASS | Instant preview updates, animated tabs, polished UX |
| VII. Robustness & Reliability | ✅ PASS | Requires unit tests for duplicate detection, E2E for import flow |
| VIII. LLM-Agent Friendly | ✅ PASS | Adding import.instructions.md for domain guidance |
| IX. Code Clarity | ✅ PASS | Pure functions for duplicate/filter logic; loro-mirror for state |

**Gate Status**: PASS - No violations, proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-enhanced-import-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # Internal API contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── import/
│       ├── duplicates.ts      # MODIFY: Add configurable date/description matching
│       ├── filter.ts          # NEW: Old transaction filtering logic
│       ├── processor.ts       # MODIFY: Add account scoping, filter integration
│       └── index.ts           # MODIFY: Export new functions
├── components/
│   └── features/
│       └── import/
│           ├── ImportPanel.tsx        # NEW: Replace ImportWizard.tsx
│           ├── ImportTable.tsx        # NEW: Split raw/preview table
│           ├── ConfigTabs.tsx         # NEW: Tabbed configuration
│           ├── TemplateTab.tsx        # MODIFY: From TemplateSelector
│           ├── MappingTab.tsx         # MODIFY: From ColumnMappingStep
│           ├── FormattingTab.tsx      # MODIFY: From FormattingStep
│           ├── DuplicatesTab.tsx      # NEW: Duplicate detection settings
│           ├── AccountTab.tsx         # NEW: Account selection
│           └── ImportSummary.tsx      # NEW: Summary stats component
└── hooks/
    └── use-import-state.ts    # NEW: Centralized import session state

tests/
├── unit/
│   └── import/
│       ├── duplicates.test.ts # MODIFY: Add tests for configurable matching
│       └── filter.test.ts     # NEW: Old transaction filtering tests
└── e2e/
    └── import.spec.ts         # MODIFY: Add tests for new UI flow
```

**Structure Decision**: Follows existing monorepo structure. Import components reorganized from wizard steps to tab-based panels. Core logic in `src/lib/import/`, UI in `src/components/features/import/`.

## Complexity Tracking

No constitution violations requiring justification.
