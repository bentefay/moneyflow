# Tasks: Transaction Table UX Improvements

**Input**: Design documents from `/specs/004-transaction-table-ux/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included per copilot-instructions.md requirement ("Tests are not optional")

**Organization**: Tasks grouped by user story (9 stories from spec.md, priorities P1-P3)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US9)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Project dependencies and shared infrastructure

- [X] T001 Install Temporal polyfill: `pnpm add temporal-polyfill`
- [X] T002 [P] Create date formatting utility in src/lib/utils/date-format.ts
- [X] T003 [P] Create column configuration constants in src/components/features/transactions/column-config.ts
- [X] T004 [P] Create unit tests for date formatting in tests/unit/transactions/date-format.test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and base components that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create useTableSelection hook in src/components/features/transactions/hooks/useTableSelection.ts
- [X] T006 [P] Create unit tests for selection hook in tests/unit/transactions/selection.test.ts
- [X] T007 Create useKeyboardNavigation hook in src/components/features/transactions/hooks/useKeyboardNavigation.ts
- [X] T008 [P] Create unit tests for keyboard navigation in tests/unit/transactions/keyboard-navigation.test.ts
- [X] T009 Create useBulkEdit hook in src/components/features/transactions/hooks/useBulkEdit.ts
- [X] T009a [P] Create unit tests for useBulkEdit hook in tests/unit/transactions/bulk-edit.test.ts
- [X] T010 Create EditableCell base component in src/components/features/transactions/cells/EditableCell.tsx
- [X] T011 Create CheckboxCell component in src/components/features/transactions/cells/CheckboxCell.tsx

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Inline Cell Editing (Priority: P1) 🎯 MVP

**Goal**: Users can edit any cell with single-click (spreadsheet-style), no mode switch, no layout shift

**Independent Test**: Click any cell → edit value → verify persistence and sync

### Tests for User Story 1

- [x] T012 [P] [US1] Add inline edit E2E test in tests/e2e/transactions.spec.ts (click to focus, Enter saves, Escape reverts)
- [x] T013 [P] [US1] Add Tab navigation E2E test in tests/e2e/transactions.spec.ts (Tab saves and moves to next cell)
- [x] T014a [P] [US1] Add date cell edit E2E test in tests/e2e/transactions.spec.ts
- [x] T015 [P] [US1] Add amount cell edit E2E test in tests/e2e/transactions.spec.ts
- [x] T016 [P] [US1] Add status cell edit E2E test in tests/e2e/transactions.spec.ts
- [x] T017 [P] [US1] Add tags cell edit E2E test in tests/e2e/transactions.spec.ts

### Implementation for User Story 1

- [x] T014 [US1] Create InlineEditableText component (spreadsheet-style) in src/components/features/transactions/cells/InlineEditableText.tsx
- [x] T014b [US1] Create InlineEditableDate component in src/components/features/transactions/cells/InlineEditableDate.tsx
- [x] T014c [US1] Create InlineEditableAmount component in src/components/features/transactions/cells/InlineEditableAmount.tsx
- [x] T014d [US1] Create InlineEditableStatus component in src/components/features/transactions/cells/InlineEditableStatus.tsx
- [x] T014e [US1] Create InlineEditableTags component in src/components/features/transactions/cells/InlineEditableTags.tsx
- [x] T018 [US1] Update TransactionRow to use InlineEditable* components for all cells in src/components/features/transactions/TransactionRow.tsx
- [x] T018a [US1] Wire onFieldUpdate callback through TransactionTable to page-level handler
- [ ] T019 [US1] Integrate useKeyboardNavigation into TransactionTable in src/components/features/transactions/TransactionTable.tsx (Arrow key navigation between rows)

**Checkpoint**: All cells are spreadsheet-style editable (click to focus, Enter saves, Escape reverts, Tab moves to next cell) ✅

---

## Phase 4: User Story 2 - Checkbox Selection Column (Priority: P1) 🎯 MVP

**Goal**: Leftmost checkbox column with select-all and shift-click range selection

**Independent Test**: Check individual checkboxes, use header checkbox, verify selection state persists through scroll

### Tests for User Story 2

- [ ] T020 [P] [US2] Add checkbox selection E2E test in tests/e2e/transactions.spec.ts (individual, header, range)
- [ ] T021 [P] [US2] Add header checkbox indeterminate state E2E test in tests/e2e/transactions.spec.ts

### Implementation for User Story 2

- [ ] T022 [US2] Create TransactionTableHeader component in src/components/features/transactions/TransactionTableHeader.tsx
- [ ] T023 [US2] Add checkbox column to TransactionRow in src/components/features/transactions/TransactionRow.tsx
- [ ] T024 [US2] Integrate useTableSelection into TransactionTable in src/components/features/transactions/TransactionTable.tsx
- [ ] T025 [US2] Wire header checkbox to select-all-filtered logic in TransactionTable
- [ ] T025a [US2] Add warning toast when select-all exceeds 500 transactions

**Checkpoint**: Checkbox column visible, header checkbox selects all filtered, shift-click range works

---

## Phase 5: User Story 3 - Bulk Edit Operations (Priority: P1) 🎯 MVP

**Goal**: Bulk edit toolbar with tags/description/amount buttons for 2+ selected transactions

**Independent Test**: Select multiple transactions, use bulk toolbar, verify all selected are updated

### Tests for User Story 3

- [ ] T026 [P] [US3] Add bulk edit tags E2E test in tests/e2e/transactions.spec.ts
- [ ] T027 [P] [US3] Add bulk edit description E2E test in tests/e2e/transactions.spec.ts
- [ ] T028 [P] [US3] Add bulk edit amount E2E test in tests/e2e/transactions.spec.ts

### Implementation for User Story 3

- [ ] T029 [US3] Add Set Description button to BulkEditToolbar in src/components/features/transactions/BulkEditToolbar.tsx
- [ ] T030 [US3] Add Set Amount button to BulkEditToolbar in src/components/features/transactions/BulkEditToolbar.tsx
- [ ] T031 [US3] Add progress indicator to BulkEditToolbar for large operations
- [ ] T032 [US3] Connect BulkEditToolbar to useBulkEdit hook in TransactionTable

**Checkpoint**: Bulk toolbar appears with 2+ selected, tags/description/amount buttons work

---

## Phase 6: User Story 4 - Inline Tag Creation (Priority: P2)

**Goal**: Always-visible "Create" button in tag dropdown

**Independent Test**: Open tag editor, type new name, verify Create button visible even with matches

### Tests for User Story 4

- [ ] T033 [P] [US4] Add inline tag creation E2E test in tests/e2e/transactions.spec.ts (Create button always visible)

### Implementation for User Story 4

- [ ] T034 [US4] Update InlineTagEditor to always show Create button in src/components/features/transactions/InlineTagEditor.tsx
- [ ] T035 [US4] Wire Create action to vault tags in InlineTagEditor

**Checkpoint**: Create button visible in tag dropdown regardless of matches

---

## Phase 7: User Story 5 - Merchant/Description Separation (Priority: P2)

**Goal**: Merchant as primary column, description as expandable row below

**Independent Test**: View merchant in main row, click "add description", verify expanded row appears

### Tests for User Story 5

- [ ] T036 [P] [US5] Add merchant/description separation E2E test in tests/e2e/transactions.spec.ts

### Implementation for User Story 5

- [ ] T037 [US5] Create MerchantCell component in src/components/features/transactions/cells/MerchantCell.tsx
- [ ] T038 [US5] Create TransactionDescriptionRow component in src/components/features/transactions/TransactionDescriptionRow.tsx
- [ ] T039 [US5] Add expanded description state management to TransactionTable
- [ ] T040 [US5] Update TransactionRow to support description expansion in src/components/features/transactions/TransactionRow.tsx
- [ ] T041 [US5] Update search/filter to search both merchant and description fields

**Checkpoint**: Merchant shows in main row, description expands below, search hits both

---

## Phase 8: User Story 6 - Account Column (Priority: P2)

**Goal**: Dedicated Account column with dropdown selector

**Independent Test**: View Account column, click to edit, verify dropdown works

### Tests for User Story 6

- [ ] T042 [P] [US6] Add account column E2E test in tests/e2e/transactions.spec.ts

### Implementation for User Story 6

- [ ] T043 [US6] Refactor AccountCell to use EditableCell with dropdown in src/components/features/transactions/cells/AccountCell.tsx
- [ ] T044 [US6] Add Account column to TransactionRow and TransactionTableHeader

**Checkpoint**: Account column visible, editable via dropdown

---

## Phase 9: User Story 7 - Column Alignment (Priority: P2)

**Goal**: Headers align with cell content (left/center/right consistency)

**Independent Test**: Visual inspection of column alignment

### Tests for User Story 7

- [ ] T045 [P] [US7] Add column alignment visual regression test in tests/e2e/transactions.spec.ts

### Implementation for User Story 7

- [ ] T046 [US7] Update TransactionTableHeader to use alignment from column-config.ts
- [ ] T047 [US7] Update all cell components to use alignment from column-config.ts
- [ ] T048 [US7] Verify column order: Checkbox → Date → Merchant → Account → Tags → Status → Amount → Balance → Actions

**Checkpoint**: All headers and cells align consistently per column type

---

## Phase 10: User Story 8 - Date Formatting with Temporal API (Priority: P3)

**Goal**: Dates formatted per browser locale using Temporal API

**Independent Test**: View dates in different locales, verify correct formatting

### Tests for User Story 8

- [ ] T049 [P] [US8] Extend date-format.test.ts with locale-specific edge cases (de-DE, ja-JP, ar-SA)

### Implementation for User Story 8

- [ ] T050 [US8] Integrate Temporal-based date formatting into DateCell
- [ ] T051 [US8] Update date picker to respect locale settings

**Checkpoint**: Dates display per browser locale (US: Dec 31, 2025; UK: 31 Dec 2025)

---

## Phase 11: User Story 9 - Actions Column (Priority: P3)

**Goal**: Rightmost Actions column with add description, delete buttons

**Independent Test**: Click action buttons, verify corresponding actions execute

### Tests for User Story 9

- [ ] T052 [P] [US9] Add actions column E2E test in tests/e2e/transactions.spec.ts (add description, delete with confirm)

### Implementation for User Story 9

- [ ] T053 [US9] Create ActionsCell component in src/components/features/transactions/cells/ActionsCell.tsx
- [ ] T054 [US9] Add delete confirmation dialog to ActionsCell
- [ ] T055 [US9] Wire ActionsCell to TransactionRow
- [ ] T056 [US9] Add tooltips to action buttons

**Checkpoint**: Actions column visible, buttons work with tooltips and confirmation

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Integration, documentation, and final validation

- [ ] T057 Update useTransactionSelection hook to delegate to useTableSelection in src/hooks/useTransactionSelection.ts
- [ ] T058 [P] Run full E2E test suite to verify all user stories integrate correctly
- [ ] T059 [P] Update copilot-instructions.md with new component patterns
- [ ] T060 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────────────────────────────────────────────────┐
│                     USER STORY PHASES                          │
│                                                                │
│  Phase 3 (US1: Inline Edit) ───────────────────────┐          │
│  Phase 4 (US2: Checkbox) ──────────────────────────┤ MVP      │
│  Phase 5 (US3: Bulk Edit) ─────────────────────────┘          │
│       ↓                                                       │
│  Phase 6 (US4: Tag Create) ────────────────────────┐          │
│  Phase 7 (US5: Merchant/Desc) ─────────────────────┤ P2       │
│  Phase 8 (US6: Account) ───────────────────────────┤          │
│  Phase 9 (US7: Alignment) ─────────────────────────┘          │
│       ↓                                                       │
│  Phase 10 (US8: Date Format) ──────────────────────┐ P3       │
│  Phase 11 (US9: Actions) ──────────────────────────┘          │
│                                                                │
└───────────────────────────────────────────────────────────────┘
    ↓
Phase 12 (Polish)
```

### User Story Dependencies

- **US1 (Inline Edit)**: Depends on Phase 2 (EditableCell, useKeyboardNavigation)
- **US2 (Checkbox)**: Depends on Phase 2 (CheckboxCell, useTableSelection)
- **US3 (Bulk Edit)**: Depends on US2 for selection state, Phase 2 (useBulkEdit)
- **US4 (Tag Create)**: Independent after Phase 2
- **US5 (Merchant/Desc)**: Independent after Phase 2
- **US6 (Account)**: Independent after Phase 2
- **US7 (Alignment)**: Depends on US5, US6, US9 for all columns to exist
- **US8 (Date Format)**: Independent after Phase 1 (uses date-format.ts)
- **US9 (Actions)**: Depends on US5 for description toggle button

### Parallel Opportunities Per Phase

**Phase 1 (Setup)**:
```
T002, T003, T004 can all run in parallel
```

**Phase 2 (Foundational)**:
```
After T005: T006 in parallel
After T007: T008 in parallel
T010, T011 can run in parallel after T005 completes
```

**Phase 3 (US1 MVP)**:
```
T012, T013 can run in parallel (tests)
T015, T016, T017 can run in parallel (cell refactors)
```

**Phase 4 (US2 MVP)**:
```
T020, T021 can run in parallel (tests)
```

**Phase 5 (US3 MVP)**:
```
T026, T027, T028 can run in parallel (tests)
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (hooks + base components)
3. Complete Phase 3: User Story 1 - Inline Editing
4. Complete Phase 4: User Story 2 - Checkbox Selection
5. Complete Phase 5: User Story 3 - Bulk Edit
6. **STOP and VALIDATE**: Test all 3 MVP stories
7. Demo/merge if ready

### Incremental Delivery

| Milestone | User Stories | Value Delivered |
|-----------|--------------|-----------------|
| MVP | US1, US2, US3 | Core editing and bulk operations |
| P2 Release | US4, US5, US6, US7 | Tag creation, merchant/description split, account column, alignment |
| P3 Release | US8, US9 | Date localization, actions column |

### Suggested MVP Scope

**Total Tasks**: 62  
**MVP Tasks (US1-3)**: 34 (Phases 1-5)  
**Parallel Opportunities**: 25 tasks marked [P]

---

## Notes

- CRDT schema unchanged - `merchant` and `description` fields already exist
- All new state is React-only (selection, expanded, focus)
- loro-mirror draft mutations for bulk edits
- Column order: Checkbox → Date → Merchant → Account → Tags → Status → Amount → Balance → Actions
