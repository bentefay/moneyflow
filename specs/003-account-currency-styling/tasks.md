# Tasks: Optional Account Currency & Accounts Page Improvements

**Input**: Design documents from `/specs/003-account-currency-styling/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new setup required—project already configured

- [x] T001 Verify feature branch `003-account-currency-styling` is active

**Checkpoint**: Branch ready for implementation ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema and domain logic changes that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Make currency field optional in accountSchema in src/lib/crdt/schema.ts
- [x] T003 [P] Add DEFAULT_PERSON_ID constant and DEFAULT_PERSON object in src/lib/crdt/defaults.ts
- [x] T004 [P] Add resolveAccountCurrency() helper function in src/lib/domain/currency.ts
- [x] T005 Modify DEFAULT_ACCOUNT to use undefined currency and reference DEFAULT_PERSON_ID for 100% ownership in src/lib/crdt/defaults.ts
- [x] T006 Update getDefaultVaultState() to include default person in people collection in src/lib/crdt/defaults.ts
- [x] T007 Update initializeVaultDefaults() to add default person if missing in src/lib/crdt/defaults.ts
- [x] T008 [P] Add unit tests for resolveAccountCurrency() in tests/unit/domain/currency.test.ts
- [x] T009 [P] Add unit tests for default person and account ownership in tests/unit/crdt/defaults.test.ts

**Checkpoint**: Foundation ready—schema updated, default person exists, currency resolution works ✅

---

## Phase 3: User Story 1 - View Accounts with Clear Currency Display (Priority: P1) 🎯 MVP

**Goal**: Display currency with visual distinction for inherited vs explicit values

**Independent Test**: View Accounts page, verify inherited currencies show "(default)" indicator

### Implementation for User Story 1

- [x] T010 [US1] Add vaultDefaultCurrency prop to AccountRow component in src/components/features/accounts/AccountRow.tsx
- [x] T011 [US1] Import and use resolveAccountCurrency() for currency display in src/components/features/accounts/AccountRow.tsx
- [x] T012 [US1] Add visual indicator (muted text + "(default)") for inherited currency in src/components/features/accounts/AccountRow.tsx
- [x] T013 [US1] Pass vault default currency from AccountsTable to AccountRow in src/components/features/accounts/AccountsTable.tsx
- [x] T014 [P] [US1] Add E2E test for currency display with inheritance indicator in tests/e2e/accounts.spec.ts

**Checkpoint**: Accounts page shows currency with clear inherited/explicit distinction ✅

---

## Phase 4: User Story 2 - Default "Me" Person and Account Owner (Priority: P1) 🎯 MVP

**Goal**: New vaults include "Me" person as 100% owner of default account

**Independent Test**: Complete onboarding, verify default account shows "Me (100%)" owner

### Implementation for User Story 2

- [x] T015 [US2] Verify ensure-default.ts uses updated getDefaultVaultState() with person in src/lib/vault/ensure-default.ts
- [x] T016 [P] [US2] Add E2E test for new vault creation with default person and ownership in tests/e2e/onboarding-vault.spec.ts

**Checkpoint**: New users see "Me (100%)" on default account—no "missing owner" errors ✅

---

## Phase 5: User Story 3 - Properly Aligned Accounts Page Columns (Priority: P2)

**Goal**: Fix cramped column spacing between Currency, Owners, and Balance

**Independent Test**: View Accounts page, verify columns are visually well-spaced and aligned

### Implementation for User Story 3

- [x] T017 [US3] Adjust column widths in AccountsTable header (Currency: w-12 → w-20) in src/components/features/accounts/AccountsTable.tsx
- [x] T018 [US3] Adjust corresponding column widths in AccountRow to match header in src/components/features/accounts/AccountRow.tsx
- [x] T019 [P] [US3] ~~Add visual regression test snapshot~~ SKIPPED - No visual testing infrastructure in project; functional E2E tests cover the behavior

**Checkpoint**: Accounts page columns are properly spaced and aligned ✅

---

## Phase 6: User Story 4 - Create Account with Optional Currency (Priority: P2)

**Goal**: New accounts can omit currency to inherit from vault default

**Independent Test**: Create account without selecting currency, verify it displays with "(default)"

### Implementation for User Story 4

- [x] T020 [US4] Update account creation logic to allow undefined currency in src/components/features/accounts/AccountsTable.tsx
- [x] T021 [P] [US4] Add E2E test for creating account without explicit currency in tests/e2e/accounts.spec.ts

**Checkpoint**: New accounts can be created with inherited currency ✅

---

## Phase 7: User Story 5 - Inline Edit All Account Settings (Priority: P2)

**Goal**: All account fields editable inline (name, number, type, currency)

**Independent Test**: Click each field, verify inline editing works with keyboard shortcuts

### Implementation for User Story 5

- [x] T022 [US5] Create CurrencySelect component with "Use vault default" option in src/components/features/accounts/CurrencySelect.tsx
- [x] T023 [US5] Refactor AccountRow to use per-field editing state instead of global isEditing in src/components/features/accounts/AccountRow.tsx
- [x] T024 [US5] Add inline currency editing using CurrencySelect in src/components/features/accounts/AccountRow.tsx
- [x] T025 [US5] Ensure Enter saves, Escape cancels for all inline editors in src/components/features/accounts/AccountRow.tsx
- [x] T026 [P] [US5] Add E2E test for inline editing all account fields in tests/e2e/accounts.spec.ts

**Checkpoint**: All account fields editable inline with proper keyboard handling ✅

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T027 [P] Run pnpm typecheck to verify no type errors
- [x] T028 [P] Run pnpm lint and fix any issues
- [x] T029 [P] Run pnpm format to ensure consistent formatting
- [x] T030 Run full test suite (pnpm test && pnpm playwright test)
- [x] T031 Manual validation of quickstart.md scenarios (covered by E2E tests)
- [x] T032 Update .github/copilot-instructions.md if new patterns introduced (no new patterns)

**Checkpoint**: All tests pass, code is clean, documentation updated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies—verify branch
- **Phase 2 (Foundational)**: Depends on Phase 1—BLOCKS all user stories
- **Phase 3-7 (User Stories)**: All depend on Phase 2 completion
  - US1 and US2 are both P1 priority—can run in parallel
  - US3, US4, US5 are P2 priority—can run in parallel after US1/US2
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Currency Display)**: Depends only on Foundational phase
- **US2 (Default Person)**: Depends only on Foundational phase
- **US3 (Column Alignment)**: Depends only on Foundational phase, benefits from US1
- **US4 (Create Account)**: Depends on Foundational phase, benefits from US1 for display
- **US5 (Inline Editing)**: Depends on Foundational phase, requires US1 for currency display

### Parallel Opportunities

```text
After Phase 2 completes:

┌─────────────────────────────────────────────────────┐
│                     Phase 2 Complete                │
└─────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   US1    │    │   US2    │    │   US3    │
    │ Currency │    │ Default  │    │ Column   │
    │ Display  │    │ Person   │    │ Alignment│
    └──────────┘    └──────────┘    └──────────┘
          │                │
          └────────┬───────┘
                   ▼
          ┌──────────────────┐
          │ US4 & US5        │
          │ (benefit from    │
          │  US1 completion) │
          └──────────────────┘
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 (Currency Display)
4. Complete Phase 4: US2 (Default Person)
5. **STOP and VALIDATE**: Test MVP independently
6. Deploy/demo if ready

### Full Feature

Continue with:
7. Complete Phase 5: US3 (Column Alignment)
8. Complete Phase 6: US4 (Create Account Currency)
9. Complete Phase 7: US5 (Inline Editing)
10. Complete Phase 8: Polish

---

## Task Summary

| Phase | Tasks | Parallel Tasks |
|-------|-------|----------------|
| Setup | 1 | 0 |
| Foundational | 8 | 4 |
| US1 - Currency Display | 5 | 1 |
| US2 - Default Person | 2 | 1 |
| US3 - Column Alignment | 3 | 1 |
| US4 - Create Account | 2 | 1 |
| US5 - Inline Editing | 5 | 1 |
| Polish | 6 | 3 |
| **Total** | **32** | **12** |

---

## Notes

- All E2E tests go in tests/e2e/accounts.spec.ts (except onboarding which uses existing file)
- TypeScript type changes from currency being optional will surface during T027 typecheck
- US1 and US2 together form the MVP—both are P1 priority
- Column alignment (US3) is a quick win that improves all other stories visually
