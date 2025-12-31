# Implementation Plan: Vault Settings & Navigation Improvements

**Branch**: `002-vault-settings` | **Date**: 31 December 2025 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-vault-settings/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a Vault Settings page where users can configure vault-level preferences (starting with default currency), improve navigation by renaming "Settings" → "Vault Settings" and defaulting to Transactions instead of Dashboard, fix Accounts page column alignment, and ensure consistent interactive styling across all sidebar menu items.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: Next.js 15 (App Router), React 19, loro-mirror/loro-crdt, shadcn/ui, Tailwind CSS  
**Storage**: Supabase (Postgres), loro-crdt (CRDT state in vault document)  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Web (responsive, mobile-friendly)
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: <100ms perceived latency for all interactions  
**Constraints**: Offline-capable, client-side encrypted data, CRDT sync via Supabase Realtime  
**Scale/Scope**: Single-page settings UI, navigation updates, CSS fixes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security & Privacy First | ✅ Pass | Vault settings stored in encrypted CRDT doc; no server-side plaintext |
| II. Multi-Party Financial Integrity | ✅ Pass | Default currency doesn't affect existing allocations |
| III. Data Portability | ✅ Pass | Currency preference exported with vault data |
| IV. Auditability | ✅ Pass | No audit trail needed for preferences |
| V. User-Owned Data | ✅ Pass | Settings live in user's vault document |
| VI. Performance, Beauty & Craft | ✅ Pass | Consistent styling, pointer cursors, clear visual hierarchy |
| VII. Robustness & Reliability | ✅ Pass | Must add tests for settings persistence, navigation redirects |
| VIII. LLM-Agent Friendly | ✅ Pass | Uses existing patterns (loro-mirror, shadcn/ui) |
| IX. Code Clarity | ✅ Pass | Pure functions, explicit naming, no abbreviations |

**All gates pass. No violations to justify.**

## Project Structure

### Documentation (this feature)

```text
specs/002-vault-settings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new API endpoints)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (app)/
│       ├── layout.tsx           # MODIFY: Navigation items, logo link
│       ├── dashboard/
│       │   └── page.tsx         # MODIFY: Add redirect to /transactions
│       └── settings/
│           └── page.tsx         # CREATE: Vault Settings page
├── components/
│   └── features/
│       ├── accounts/
│       │   ├── AccountsTable.tsx    # MODIFY: Fix column alignment in header
│       │   └── AccountRow.tsx       # MODIFY: Add account number placeholder
│       └── vault/
│           └── VaultSettingsForm.tsx  # CREATE: Settings form component
├── lib/
│   └── crdt/
│       ├── schema.ts            # EXISTS: vaultPreferencesSchema already has defaultCurrency
│       └── context.tsx          # EXISTS: useVaultPreferences hook already exists
└── hooks/
    └── use-vault-preferences.ts # CREATE (optional): Convenience hook for default currency

tests/
├── unit/
│   └── crdt/
│       └── vault-preferences.test.ts  # CREATE: Test preference persistence
└── e2e/
    └── vault-settings.spec.ts         # CREATE: E2E test for settings flow
```

**Structure Decision**: Uses existing Next.js App Router structure. New settings page at `src/app/(app)/settings/page.tsx`. Form component in `src/components/features/vault/`. No new API routes needed—all state changes go through loro-mirror CRDT mutations.

## Complexity Tracking

> No violations to justify. Feature uses existing patterns and infrastructure.
