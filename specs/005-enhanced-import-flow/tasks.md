# Tasks: Enhanced Import Flow

**Input**: Design documents from `/specs/005-enhanced-import-flow/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and prepare project structure

- [X] T001 Install animate-ui tabs component via `npx shadcn@latest add @animate-ui/components-radix-tabs`
- [X] T002 [P] Create import types file at src/lib/import/types.ts with ImportSession, ImportConfig, PreviewTransaction interfaces

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Extend importTemplateSchema in src/lib/crdt/schema.ts with duplicateDetection, oldTransactionFilter, lastUsedAt fields
- [X] T004 Add collapseWhitespace field to formatting in importTemplateSchema at src/lib/crdt/schema.ts
- [X] T005 [P] Create filter module at src/lib/import/filter.ts with filterOldTransactions pure function
- [X] T006 [P] Create unit tests for filter module at tests/unit/import/filter.test.ts with table-driven tests for all three modes
- [X] T007 Extend DuplicateDetectionConfig in src/lib/import/duplicates.ts with dateMatchMode and descriptionMatchMode fields
- [X] T008 Update checkDuplicate function in src/lib/import/duplicates.ts to respect exact vs similar matching modes
- [X] T009 [P] Add unit tests for configurable duplicate detection modes at tests/unit/import/duplicates.test.ts
- [X] T010 Create useImportState hook at src/hooks/use-import-state.ts with session state, config actions, and computed preview
- [X] T011 Export new functions from src/lib/import/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Side-by-Side Import Preview (Priority: P1) 🎯 MVP

**Goal**: Display split-table with raw file data on left and parsed preview on right, updating in real-time as settings change

**Independent Test**: Drop a CSV file and verify split-table displays raw columns left, preview columns right, with summary statistics

### Implementation for User Story 1

- [X] T012 [US1] Create ImportTable component at src/components/features/import/ImportTable.tsx with CSS Grid layout for raw/preview split
- [X] T013 [US1] Add responsive stacking (mobile: vertical) to ImportTable using Tailwind breakpoints
- [X] T014 [US1] Create ImportSummary component at src/components/features/import/ImportSummary.tsx showing total rows, valid, errors, duplicates
- [X] T015 [US1] Integrate useImportState hook with ImportTable for reactive preview updates
- [X] T016 [US1] Add row status indicators (valid, invalid, duplicate, filtered) styling to ImportTable

**Checkpoint**: User Story 1 complete - can drop file and see split table with real-time preview

---

## Phase 4: User Story 2 - Tabbed Configuration Panel (Priority: P1)

**Goal**: Replace wizard with tabs allowing non-linear access to all settings while preview remains visible

**Independent Test**: Load a file, click between tabs in any order, verify settings persist and preview updates immediately

### Implementation for User Story 2

- [X] T017 [US2] Create ConfigTabs component at src/components/features/import/ConfigTabs.tsx using animate-ui tabs with TabsContents
- [X] T018 [P] [US2] Create TemplateTab component at src/components/features/import/tabs/TemplateTab.tsx for template selection/save
- [X] T019 [P] [US2] Create MappingTab component at src/components/features/import/tabs/MappingTab.tsx for column assignments
- [X] T020 [P] [US2] Create FormattingTab component at src/components/features/import/tabs/FormattingTab.tsx for separators, date format
- [X] T021 [US2] Create ImportPanel component at src/components/features/import/ImportPanel.tsx composing ImportTable + ConfigTabs
- [X] T022 [US2] Wire ConfigTabs to useImportState for bidirectional config updates
- [X] T023 [US2] Ensure auto-detection runs on file load without requiring button clicks in ImportPanel

**Checkpoint**: User Story 2 complete - can configure import via tabs with immediate preview updates

---

## Phase 5: User Story 3 - Account Selection for Import (Priority: P1)

**Goal**: Require account selection for CSV, auto-select for OFX when account ID matches existing account

**Independent Test**: Import CSV requiring account selection; import OFX with matching account ID verifying auto-selection

### Implementation for User Story 3

- [X] T024 [US3] Create AccountTab component at src/components/features/import/tabs/AccountTab.tsx with account dropdown
- [X] T025 [US3] Add account matching logic to useImportState using accountNumber field for OFX auto-selection
- [X] T026 [US3] Add validation preventing import without account selection for CSV files
- [ ] T027 [US3] Update account's accountNumber field after OFX import if account didn't have one
- [X] T028 [US3] Add FR-013 validation to prevent deletion of last account in src/lib/crdt/ or relevant domain logic

**Checkpoint**: User Story 3 complete - account selection works for both CSV and OFX

---

## Phase 6: User Story 4 - Configurable Duplicate Detection (Priority: P2)

**Goal**: Allow users to configure date tolerance (exact/within X days) and description matching (exact/similar with threshold)

**Independent Test**: Import file with near-duplicates, change detection settings, verify duplicate flagging changes accordingly

### Implementation for User Story 4

- [X] T029 [US4] Create DuplicatesTab component at src/components/features/import/tabs/DuplicatesTab.tsx with date and description settings
- [X] T030 [US4] Add date tolerance controls (exact checkbox, days slider) to DuplicatesTab
- [X] T031 [US4] Add description matching controls (exact checkbox, similarity threshold slider) to DuplicatesTab
- [X] T032 [US4] Wire DuplicatesTab to useImportState duplicateDetection config
- [X] T033 [US4] Display duplicate count and matched transaction info in ImportSummary

**Checkpoint**: User Story 4 complete - duplicate detection is configurable via UI

---

## Phase 7: User Story 5 - Old Transaction Filtering (Priority: P2)

**Goal**: Filter transactions older than cutoff with three modes: ignore all, ignore duplicates only, do not ignore

**Independent Test**: Import file spanning old and new dates, change filter mode, verify correct transactions included/excluded

### Implementation for User Story 5

- [X] T034 [US5] Add old transaction filter controls to DuplicatesTab or create FilterTab at src/components/features/import/tabs/
- [X] T035 [US5] Add cutoff days input and mode selector (radio buttons for three modes) to filter controls
- [X] T036 [US5] Integrate filterOldTransactions into useImportState preview computation
- [X] T037 [US5] Display filtered count in ImportSummary with explanation of why transactions were excluded
- [X] T038 [US5] Add visual indicator for filtered rows in ImportTable (grayed out or hidden toggle)

**Checkpoint**: User Story 5 complete - old transaction filtering works with all three modes

---

## Phase 8: User Story 6 - Whitespace Normalization (Priority: P3)

**Goal**: Optional checkbox to collapse multiple spaces in descriptions to single space

**Independent Test**: Import file with multi-space descriptions, toggle whitespace option, verify preview updates

### Implementation for User Story 6

- [X] T039 [US6] Add collapseWhitespace checkbox to FormattingTab
- [X] T040 [US6] Create normalizeWhitespace utility in src/lib/import/processor.ts or utils
- [X] T041 [US6] Apply whitespace normalization in preview computation when enabled

**Checkpoint**: User Story 6 complete - whitespace collapsing works

---

## Phase 9: Integration & Polish

**Purpose**: Replace existing wizard, ensure templates work, final testing

- [X] T042 Replace ImportWizard usage with ImportPanel in src/app/(app)/ import route or dialog
- [ ] T043 Implement auto-save template on first import when no templates exist
- [X] T044 Implement auto-select most recent template (by lastUsedAt) on new import
- [X] T045 Add template duplicate and reset functionality to TemplateTab
- [X] T046 [P] Update E2E tests at tests/e2e/import.spec.ts for new tabbed UI flow
- [X] T047 [P] Add E2E test for account selection validation
- [X] T048 [P] Add E2E test for duplicate detection with different settings
- [X] T049 Run quickstart.md validation to ensure documentation matches implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-8 (User Stories)**: All depend on Phase 2 completion
- **Phase 9 (Integration)**: Depends on at least US1-US3 (P1 stories)

### User Story Dependencies

- **US1 (Split Table)**: Foundation only - can start first
- **US2 (Tabbed Config)**: Foundation only - can run parallel with US1
- **US3 (Account Selection)**: Foundation only - can run parallel with US1/US2
- **US4 (Duplicate Config)**: Foundation + US2 tabs structure recommended
- **US5 (Old Tx Filter)**: Foundation + US4 (shares DuplicatesTab or similar)
- **US6 (Whitespace)**: Foundation + US2 FormattingTab exists

### Parallel Opportunities

Within Phase 2:
```
T003, T004 (schema) → then T005, T006, T007, T008, T009 can run in parallel
T010 depends on T005, T007 being complete
```

Within US2:
```
T018, T019, T020 (individual tabs) can run in parallel
T017, T021, T022, T023 are sequential
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Split Table)
4. Complete Phase 4: US2 (Tabbed Config)
5. Complete Phase 5: US3 (Account Selection)
6. **STOP and VALIDATE**: Core import flow works with new UI
7. Phase 9 T042: Replace wizard with new panel

### Then Add P2/P3 Features

8. Phase 6: US4 (Duplicate Config)
9. Phase 7: US5 (Old Tx Filter)
10. Phase 8: US6 (Whitespace)
11. Complete remaining Phase 9 tasks

---

## Notes

- Schema changes (T003, T004) are clean - no backwards compatibility needed
- Filter module (T005, T006) is pure functions with comprehensive unit tests
- animate-ui tabs provide smooth height animations via TabsContents wrapper
- Account matching uses existing accountNumber field - no schema migration
- Templates auto-save on first import, auto-select by lastUsedAt for future imports
