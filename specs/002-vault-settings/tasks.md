# Tasks: Vault Settings & Navigation Improvements

**Input**: Design documents from `/specs/002-vault-settings/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Included - E2E tests for navigation flows and settings persistence.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create base components and directory structure

- [x] T001 Create vault features directory at `src/components/features/vault/`
- [x] T002 [P] Create settings page directory at `src/app/(app)/settings/`

---

## Phase 2: Foundational (Navigation Infrastructure)

**Purpose**: Core navigation changes that affect multiple user stories - MUST complete before user stories

**⚠️ CRITICAL**: These tasks change shared navigation and routing that all user stories depend on

- [x] T003 Rename "Settings" to "Vault Settings" in sidebar navigation in `src/app/(app)/layout.tsx`
- [x] T004 Remove Dashboard from main navigation items in `src/app/(app)/layout.tsx`
- [x] T005 Update logo link from `/dashboard` to `/transactions` in `src/app/(app)/layout.tsx`
- [x] T006 Add `cursor-pointer` to Lock button in `src/app/(app)/layout.tsx`
- [x] T007 Add redirect from `/dashboard` to `/transactions` in `src/app/(app)/dashboard/page.tsx`

**Checkpoint**: Navigation structure updated - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure Vault Default Currency (Priority: P1) 🎯 MVP

**Goal**: Users can set a default currency on the Vault Settings page that persists and is used for new accounts

**Independent Test**: Open settings page, change currency to EUR, refresh page, verify EUR is still selected

### Implementation for User Story 1

- [x] T008 [P] [US1] Create CurrencySelector component with search in `src/components/features/vault/CurrencySelector.tsx`
- [x] T009 [P] [US1] Create VaultSettingsForm component in `src/components/features/vault/VaultSettingsForm.tsx`
- [x] T010 [US1] Create Vault Settings page in `src/app/(app)/settings/page.tsx`
- [x] T011 [US1] Update AccountsTable to use vault default currency for new accounts in `src/components/features/accounts/AccountsTable.tsx`

**Checkpoint**: User Story 1 complete - users can configure and use vault default currency

---

## Phase 4: User Story 2 - Access Vault Settings from Navigation (Priority: P1)

**Goal**: Settings navigation item correctly links to settings page and shows current preferences

**Independent Test**: Click "Vault Settings" in sidebar, verify page loads with current currency displayed

### Implementation for User Story 2

- [x] T012 [US2] Verify settings page accessible via `/settings` route (covered by T010)

**Note**: This user story is primarily satisfied by Phase 2 navigation changes (T003) and US1 implementation (T010). No additional tasks needed.

**Checkpoint**: User Story 2 complete - settings accessible from navigation

---

## Phase 5: User Story 3 - Navigate to Transactions on Existing Vault Open (Priority: P2)

**Goal**: Returning users land on Transactions page instead of Dashboard

**Independent Test**: Log in with existing vault, verify URL is `/transactions` not `/dashboard`

### Implementation for User Story 3

- [x] T013 [US3] Update unlock page to redirect to `/transactions` in `src/app/(onboarding)/unlock/page.tsx`
- [x] T014 [P] [US3] Update invite accept page to redirect to `/transactions` in `src/app/(onboarding)/invite/[token]/page.tsx`

**Checkpoint**: User Story 3 complete - existing vault users land on transactions

---

## Phase 6: User Story 4 - View Account Details Clearly (Priority: P2)

**Goal**: Accounts table has properly aligned columns and shows placeholder for missing account numbers

**Independent Test**: View accounts page, verify columns are aligned and accounts without numbers show "No account number yet"

### Implementation for User Story 4

- [x] T015 [US4] Add "No account number yet" placeholder in `src/components/features/accounts/AccountRow.tsx`
- [x] T016 [P] [US4] Fix column alignment in AccountsTable header in `src/components/features/accounts/AccountsTable.tsx`
- [x] T017 [US4] Ensure actions column has explicit width in AccountRow in `src/components/features/accounts/AccountRow.tsx`

**Checkpoint**: User Story 4 complete - accounts table is properly aligned with placeholders

---

## Phase 7: User Story 5 - Consistent Interactive Menu Styling (Priority: P3)

**Goal**: All sidebar navigation items have consistent pointer cursor and hover states

**Independent Test**: Hover over each nav item including Lock, verify cursor changes to pointer

### Implementation for User Story 5

- [x] T018 [US5] Audit all navigation items for consistent styling in `src/app/(app)/layout.tsx`

**Note**: Primary fix (cursor-pointer on Lock) is in T006. This task verifies consistency across all items.

**Checkpoint**: User Story 5 complete - all nav items have consistent interaction cues

---

## Phase 8: User Story 1a - New Vault Landing Page (Priority: P1)

**Goal**: New vault creation navigates to settings page instead of dashboard

**Independent Test**: Create new identity, verify landing page is `/settings`

### Implementation for User Story 1a

- [x] T019 [US1] Update new-user page to redirect to `/settings` in `src/app/(onboarding)/new-user/page.tsx`

**Checkpoint**: New users land on settings page after vault creation

---

## Phase 9: Polish & Testing

**Purpose**: E2E tests and final validation

- [x] T020 [P] Create E2E test for new user settings flow in `tests/e2e/vault-settings.spec.ts`
- [x] T021 [P] Create E2E test for existing user transactions landing in `tests/e2e/vault-settings.spec.ts`
- [x] T022 [P] Create E2E test for currency selection persistence in `tests/e2e/vault-settings.spec.ts`
- [x] T023 Run quickstart.md verification checklist
- [x] T024 Run `pnpm lint && pnpm format && pnpm typecheck && pnpm test && pnpm test:e2e`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-8 (User Stories)**: All depend on Phase 2 completion
- **Phase 9 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Depends On | Files Modified |
|-------|----------|------------|----------------|
| US1 (Currency Settings) | P1 | Phase 2 | New files in `vault/`, `settings/` |
| US2 (Settings Navigation) | P1 | Phase 2, US1 | None (satisfied by T003, T010) |
| US3 (Transactions Landing) | P2 | Phase 2 | `unlock/page.tsx`, `invite/[token]/page.tsx` |
| US4 (Accounts Alignment) | P2 | Phase 2 | `AccountRow.tsx`, `AccountsTable.tsx` |
| US5 (Menu Styling) | P3 | Phase 2 | `layout.tsx` (mostly done in T006) |
| US1a (New Vault Landing) | P1 | Phase 2 | `new-user/page.tsx` |

### Parallel Opportunities

```bash
# After Phase 2 completes, these can run in parallel:
- US1 tasks (T008-T011) - new vault/ components
- US3 tasks (T013-T014) - onboarding pages
- US4 tasks (T015-T017) - accounts components
- US1a task (T019) - new-user page

# Within US1, these can run in parallel:
- T008 (CurrencySelector) - new file
- T009 (VaultSettingsForm) - new file

# All E2E tests can run in parallel:
- T020, T021, T022
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 1a)

1. Complete Phase 1: Setup
2. Complete Phase 2: Navigation infrastructure
3. Complete Phase 3: Currency settings (US1)
4. Complete Phase 8: New vault landing (US1a)
5. **STOP and VALIDATE**: New users can set currency, existing users go to transactions
6. Deploy/demo MVP

### Full Feature

1. MVP + US3 (Transactions landing for existing users)
2. + US4 (Accounts page fixes)
3. + US5 (Menu styling polish)
4. + E2E tests
5. Final validation

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T001-T002 | Setup directories |
| 2 | T003-T007 | Navigation infrastructure |
| 3 | T008-T011 | Currency settings (US1) |
| 4 | - | Settings navigation (US2) - no tasks needed |
| 5 | T013-T014 | Transactions landing (US3) |
| 6 | T015-T017 | Accounts alignment (US4) |
| 7 | T018 | Menu styling (US5) |
| 8 | T019 | New vault landing (US1a) |
| 9 | T020-T024 | E2E tests & validation |

**Total**: 24 tasks
**Parallel opportunities**: 10 tasks marked [P]
**MVP scope**: Phases 1-3, 8 (T001-T011, T019) = 13 tasks
