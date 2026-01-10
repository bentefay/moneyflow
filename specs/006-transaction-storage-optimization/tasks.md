# Tasks: Transaction Storage Optimization

**Input**: Design documents from `/specs/006-transaction-storage-optimization/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Source: `src/`
- Tests: `tests/`
- Components: `src/components/features/transactions/`
- CRDT lib: `src/lib/crdt/`
- Import lib: `src/lib/import/`

---

## Phase 1: Setup

**Purpose**: Schema changes and foundational type definitions

- [ ] T001 Add `creationInstant` field to transaction schema in src/lib/crdt/schema.ts
- [ ] T002 Add `importRowIndex` field to transaction schema in src/lib/crdt/schema.ts
- [ ] T003 Add `suspectedDuplicates` LoroList field to transaction schema in src/lib/crdt/schema.ts
- [ ] T004 Remove `duplicateOf` field from transaction schema in src/lib/crdt/schema.ts
- [ ] T005 Define dayBucketSchema in src/lib/crdt/schema.ts
- [ ] T006 Define monthBucketSchema in src/lib/crdt/schema.ts
- [ ] T007 Define yearBucketSchema in src/lib/crdt/schema.ts
- [ ] T008 Define accountTransactionTreeSchema in src/lib/crdt/schema.ts
- [ ] T009 Define transactionStoreSchema in src/lib/crdt/schema.ts
- [ ] T010 Update vaultSchema to use new hierarchical transactionStoreSchema in src/lib/crdt/schema.ts
- [ ] T011 Export new types (DayBucket, MonthBucket, YearBucket, AccountTransactionTree, TransactionStore) from src/lib/crdt/schema.ts

---

## Phase 2: Foundational (Core Query & Mutation Helpers)

**Purpose**: Core infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T012 Create src/lib/crdt/mutations.ts with insertTransaction function (creates buckets lazily, inserts at sorted position)
- [ ] T013 Add updateTransaction function to src/lib/crdt/mutations.ts (lookup by date+id, mutate in place)
- [ ] T014 Add moveTransaction function to src/lib/crdt/mutations.ts (delete from old bucket, insert into new)
- [ ] T015 Add deleteTransaction function to src/lib/crdt/mutations.ts (with cascade for suspectedDuplicates, prune empty buckets)
- [ ] T016 Add pruneBucket helper to src/lib/crdt/mutations.ts (remove empty day/month/year buckets up the tree)
- [ ] T017 Add getOrCreateDayBucket helper to src/lib/crdt/mutations.ts (handles CRDT duplicate bucket lookup)
- [ ] T018 Create getAccountTransactions query in src/lib/crdt/queries.ts (returns sorted transactions for account)
- [ ] T019 Create getAllTransactions query in src/lib/crdt/queries.ts (merges all accounts, maintains sort)
- [ ] T020 Create findTransaction query in src/lib/crdt/queries.ts (lookup by accountId + date + id)
- [ ] T021 Create findTransactionById query in src/lib/crdt/queries.ts (fallback O(n) scan when location unknown)
- [ ] T022 Create filterTransactions helper in src/lib/crdt/queries.ts (date range, tags, status, search, duplicates filter)
- [ ] T023 Create getTransactionsWithDuplicates query in src/lib/crdt/queries.ts (for "Show Duplicates" filter)
- [ ] T024 Create getTransactionsInDateRange query in src/lib/crdt/queries.ts (for duplicate detection)
- [ ] T025 Add handleDuplicateBuckets helper in src/lib/crdt/queries.ts (union transactions from same-date buckets for CRDT conflicts)
- [ ] T026 Wire mutation functions to useVaultAction in src/lib/crdt/context.tsx
- [ ] T027 Create unit tests for hierarchical schema in tests/unit/crdt/hierarchical-schema.test.ts
- [ ] T028 Create unit tests for mutation functions in tests/unit/crdt/transaction-mutations.test.ts
- [ ] T029 Create unit tests for query functions in tests/unit/crdt/transaction-queries.test.ts
- [ ] T030 Add property-based tests for ordering invariants (date desc, creationInstant desc, importRowIndex asc) in tests/unit/crdt/transaction-ordering.test.ts

**Checkpoint**: Core mutations and queries working. All user story work can now begin.

---

## Phase 3: User Story 1 - View Transactions at Scale (Priority: P1) 🎯 MVP

**Goal**: Users with 100k+ transactions can view and scroll without delay, filter by account instantly.

**Independent Test**: Load 100k transactions, open transactions view, measure render time <500ms, scroll at 60fps, account filter <100ms.

### Implementation for User Story 1

- [ ] T031 [US1] Update transactions page to use getAccountTransactions/getAllTransactions in src/app/(app)/transactions/page.tsx
- [ ] T032 [US1] Remove sorting logic from transactions page (already sorted by structure) in src/app/(app)/transactions/page.tsx
- [ ] T033 [US1] Update TransactionTable to receive pre-sorted data in src/components/features/transactions/TransactionTable.tsx
- [ ] T034 [US1] Update useVaultSelector calls to use new query structure in src/app/(app)/transactions/page.tsx
- [ ] T035 [US1] Verify virtual scrolling still works with hierarchical data in src/components/features/transactions/TransactionTable.tsx
- [ ] T036 [US1] Update account filter to select subtree instead of filtering in src/app/(app)/transactions/page.tsx
- [ ] T037 [US1] Add performance benchmark test for 100k transactions in tests/integration/transaction-performance.test.ts

**Checkpoint**: Transaction viewing works at scale with hierarchical structure.

---

## Phase 4: User Story 2 - Import Large Statement (Priority: P1)

**Goal**: Import 500 transactions into 50k existing in <3s, only affected months re-render.

**Independent Test**: Import 500 transactions, measure completion time, verify unchanged months don't recompute.

### Implementation for User Story 2

- [ ] T038 [US2] Update import processor to set creationInstant from import timestamp in src/lib/import/processor.ts
- [ ] T039 [US2] Update import processor to set importRowIndex from row position in src/lib/import/processor.ts
- [ ] T040 [US2] Update import processor to use insertTransaction mutation in src/lib/import/processor.ts
- [ ] T041 [US2] Implement linear duplicate detection algorithm in src/lib/import/duplicates.ts
- [ ] T042 [US2] Update detectDuplicates to use sorted merge-scan with date window in src/lib/import/duplicates.ts
- [ ] T043 [US2] Update detectDuplicates to only compare within target account in src/lib/import/duplicates.ts
- [ ] T044 [US2] When duplicate detected, nest in parent's suspectedDuplicates instead of setting duplicateOf in src/lib/import/processor.ts
- [ ] T045 [US2] Update import completion to use new hierarchical structure in src/app/(app)/imports/new/page.tsx
- [ ] T046 [US2] Add unit tests for linear duplicate detection in tests/unit/import/duplicates.test.ts
- [ ] T047 [US2] Add property-based test for O(n+m) complexity in tests/unit/import/duplicates.test.ts

**Checkpoint**: Imports complete quickly with linear duplicate detection.

---

## Phase 5: User Story 3 - Edit Transaction (Priority: P2)

**Goal**: Single edit completes in <100ms, only affected day recomputes.

**Independent Test**: Edit transaction description in 100k vault, verify <100ms, verify only day bucket touched.

### Implementation for User Story 3

- [ ] T048 [US3] Update transaction edit handler to use updateTransaction mutation in src/app/(app)/transactions/page.tsx
- [ ] T049 [US3] Ensure edit passes date+id for efficient lookup in src/components/features/transactions/TransactionRow.tsx
- [ ] T050 [US3] Verify fine-grained reactivity (only day bucket subscribers update) in src/app/(app)/transactions/page.tsx

**Checkpoint**: Edits are instant with fine-grained reactivity.

---

## Phase 6: User Story 4 - Change Transaction Date (Priority: P2)

**Goal**: Date changes move transaction to correct bucket, prune empty old bucket.

**Independent Test**: Change transaction date, verify it moves, verify old bucket pruned if empty.

### Implementation for User Story 4

- [ ] T051 [US4] Update date edit handler to use moveTransaction mutation in src/app/(app)/transactions/page.tsx
- [ ] T052 [US4] Verify transaction appears in new position sorted by creationInstant in src/components/features/transactions/TransactionTable.tsx
- [ ] T053 [US4] Add integration test for date change with bucket pruning in tests/integration/transaction-operations.test.ts

**Checkpoint**: Date edits work correctly with bucket management.

---

## Phase 7: User Story 5 - Delete Import (Priority: P3)

**Goal**: Deleting import removes all its transactions and prunes empty buckets.

**Independent Test**: Delete import with 100 transactions across 30 days, verify all removed, empty buckets pruned.

### Implementation for User Story 5

- [ ] T054 [US5] Create deleteTransactionsByImport mutation in src/lib/crdt/mutations.ts
- [ ] T055 [US5] Update import deletion handler to use new mutation in src/hooks/use-import-state.ts
- [ ] T056 [US5] Verify cascade includes suspectedDuplicates for deleted transactions in src/lib/crdt/mutations.ts
- [ ] T057 [US5] Add integration test for import deletion with bucket pruning in tests/integration/transaction-operations.test.ts

**Checkpoint**: Import deletion cleans up properly.

---

## Phase 8: User Story 6 - Calculate Account Balance (Priority: P2)

**Goal**: Balance computes in <200ms first load, <50ms cached, unchanged months don't recompute.

**Independent Test**: View balance after editing one transaction, verify only affected month recomputes.

### Implementation for User Story 6

- [ ] T058 [US6] Update balance calculation to use hierarchical structure in src/lib/domain/balance.ts
- [ ] T059 [US6] Leverage useVaultSelector for month-level memoization in balance computations in src/lib/domain/balance.ts
- [ ] T060 [US6] Update any components displaying balances to use new selectors in src/app/(app)/transactions/page.tsx
- [ ] T061 [US6] Add performance test for balance calculation in tests/integration/transaction-performance.test.ts

**Checkpoint**: Aggregates compute efficiently with fine-grained caching.

---

## Phase 9: User Story 7 - Review Suspected Duplicates (Priority: P2)

**Goal**: Duplicates displayed grouped with parent, user can unnest, swap, or delete.

**Independent Test**: Import with duplicates, verify grouped display, test unnest/swap/delete actions.

### Implementation for User Story 7

- [ ] T062 [US7] Add unnestDuplicate mutation to src/lib/crdt/mutations.ts
- [ ] T063 [US7] Add swapDuplicate mutation to src/lib/crdt/mutations.ts
- [ ] T064 [US7] Update TransactionRow to render nested suspectedDuplicates in src/components/features/transactions/TransactionRow.tsx
- [ ] T065 [US7] Add visual distinction (yellow badge/formatting) for nested duplicates in src/components/features/transactions/TransactionRow.tsx
- [ ] T066 [US7] Update DuplicateBadge with "Not a duplicate" action (calls unnestDuplicate) in src/components/features/transactions/DuplicateBadge.tsx
- [ ] T067 [US7] Add "Mark as original" action to DuplicateBadge (calls swapDuplicate) in src/components/features/transactions/DuplicateBadge.tsx
- [ ] T068 [US7] Update "Show Duplicates" filter to use getTransactionsWithDuplicates in src/components/features/transactions/TransactionFilters.tsx
- [ ] T069 [US7] Update delete handlers for parent (cascade) vs duplicate (single) in src/app/(app)/transactions/page.tsx
- [ ] T070 [US7] Add E2E test for duplicate review flow in tests/e2e/transactions.spec.ts
- [ ] T071 [US7] Add unit tests for unnest and swap mutations in tests/unit/crdt/duplicate-mutations.test.ts

**Checkpoint**: Full duplicate management UX working.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, edge cases, and validation

- [ ] T072 [P] Handle edge case: year boundary imports (Dec 31 to Jan 1) in src/lib/import/processor.ts
- [ ] T073 [P] Handle edge case: date edit across month/year boundaries in src/lib/crdt/mutations.ts
- [ ] T074 [P] Handle edge case: swap duplicate with different date than parent in src/lib/crdt/mutations.ts
- [ ] T075 [P] Add CRDT conflict handling tests (concurrent bucket creation) in tests/unit/crdt/crdt-conflicts.test.ts
- [ ] T076 Run all checks: pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e
- [ ] T077 Verify quickstart.md examples work correctly
- [ ] T078 Commit all changes with descriptive message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-9 (User Stories)**: All depend on Phase 2 completion
- **Phase 10 (Polish)**: Depends on all user stories

### User Story Dependencies

| Story               | Depends On                    | Can Parallel With       |
| ------------------- | ----------------------------- | ----------------------- |
| US1 (View)          | Phase 2 only                  | US2, US3, US4, US5, US6 |
| US2 (Import)        | Phase 2 only                  | US1, US3, US4, US5, US6 |
| US3 (Edit)          | Phase 2 only                  | US1, US2, US4, US5, US6 |
| US4 (Date Change)   | Phase 2 only                  | US1, US2, US3, US5, US6 |
| US5 (Delete Import) | Phase 2 only                  | US1, US2, US3, US4, US6 |
| US6 (Balance)       | Phase 2 only                  | US1, US2, US3, US4, US5 |
| US7 (Duplicates)    | US2 (needs nested duplicates) | -                       |

### Parallel Opportunities

**Phase 1 (Setup)**:

- T001-T004 (transaction schema fields) must be sequential
- T005-T009 (bucket schemas) can be parallel

**Phase 2 (Foundational)**:

- T012-T017 (mutations) must be mostly sequential (dependencies)
- T018-T025 (queries) can be parallel
- T027-T030 (tests) can be parallel after implementations

**User Stories**:

- US1-US6 can all run in parallel (different files, no cross-dependencies)
- US7 should follow US2 (needs import to create nested duplicates)

---

## Parallel Example: Foundational Queries

```bash
# These can run in parallel (different query functions, same file but no dependencies):
Task: "Create getAccountTransactions query in src/lib/crdt/queries.ts"
Task: "Create getAllTransactions query in src/lib/crdt/queries.ts"
Task: "Create findTransaction query in src/lib/crdt/queries.ts"
Task: "Create getTransactionsWithDuplicates query in src/lib/crdt/queries.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (schema changes)
2. Complete Phase 2: Foundational (core mutations/queries)
3. Complete Phase 3: User Story 1 (viewing at scale)
4. Complete Phase 4: User Story 2 (import with linear detection)
5. **STOP and VALIDATE**: Test viewing and importing work correctly
6. Deploy/demo MVP

### Incremental Delivery

1. MVP (US1 + US2) → Core performance gains realized
2. Add US3 + US4 → Full edit capability
3. Add US5 + US6 → Import management + aggregates
4. Add US7 → Complete duplicate UX
5. Polish → Edge cases, final cleanup

---

## Test Specifications

### New Unit Tests to Create

#### tests/unit/crdt/hierarchical-schema.test.ts (T027)

- Test dayBucketSchema validates day field (1-31)
- Test monthBucketSchema validates month field (1-12)
- Test yearBucketSchema validates year field
- Test transactionSchema includes new fields (creationInstant, importRowIndex, suspectedDuplicates)
- Test suspectedDuplicates only allows one level of nesting

#### tests/unit/crdt/transaction-mutations.test.ts (T028)

- Test insertTransaction creates buckets lazily (year → month → day)
- Test insertTransaction inserts at correct sorted position (creationInstant desc, importRowIndex asc)
- Test updateTransaction finds transaction by date+id and mutates in place
- Test moveTransaction removes from old bucket and inserts into new
- Test deleteTransaction with cascade=true deletes all suspectedDuplicates
- Test deleteTransaction with cascade=false (for duplicates) removes only target
- Test pruneBucket removes empty day → month → year buckets up the tree
- Test getOrCreateDayBucket handles CRDT duplicate buckets (multiple same-date)

#### tests/unit/crdt/transaction-queries.test.ts (T029)

- Test getAccountTransactions returns transactions sorted by date desc
- Test getAccountTransactions handles CRDT duplicate buckets (unions them)
- Test getAllTransactions merges all accounts maintaining global sort
- Test findTransaction locates by accountId + date + id
- Test findTransaction searches within suspectedDuplicates
- Test findTransactionById scans all when location unknown
- Test getTransactionsWithDuplicates returns only parents with non-empty suspectedDuplicates
- Test getTransactionsInDateRange returns transactions within bounds (for duplicate detection)
- Test filterTransactions applies all filter criteria correctly

#### tests/unit/crdt/transaction-ordering.test.ts (T030) - Property-Based

- Property: all transactions sorted by date descending
- Property: within same date, sorted by creationInstant descending
- Property: within same date+creationInstant, sorted by importRowIndex ascending
- Property: manual transactions (null importRowIndex) sort correctly relative to imports
- Property: inserting transactions maintains sorted invariant
- Property: after any mutation, ordering invariants still hold

#### tests/unit/crdt/duplicate-mutations.test.ts (T071)

- Test unnestDuplicate removes from parent's suspectedDuplicates
- Test unnestDuplicate inserts into correct day bucket based on duplicate's date
- Test unnestDuplicate maintains sort order in target bucket
- Test swapDuplicate: duplicate becomes standalone at its own date
- Test swapDuplicate: former parent moves to new parent's suspectedDuplicates
- Test swapDuplicate: other duplicates transfer to new parent
- Test swapDuplicate with different dates (parent Jan 15, duplicate Jan 14)

#### tests/unit/crdt/crdt-conflicts.test.ts (T075)

- Test concurrent bucket creation results in duplicate entries (not overwrite)
- Test queries union transactions from same-date buckets
- Test mutations find correct bucket when duplicates exist
- Test insert into existing bucket (doesn't create duplicate)

### Existing Unit Tests to Update

#### tests/unit/import/duplicates.test.ts (T046, T047)

**Add new tests:**

- Test linear merge-scan algorithm with sorted inputs
- Test detection only within target account (cross-account ignored)
- Test date window constraint (±3 days)
- Test detected duplicates include parent reference info

**Add property-based tests (T047):**

- Property: complexity is O(n+m) - measure actual comparisons vs n×m
- Property: all duplicates within date window are detected
- Property: no false negatives within window

#### tests/unit/domain/balance.test.ts (T061)

**Add performance-related tests:**

- Test balance calculation with hierarchical transaction structure
- Test fine-grained memoization (edit one month, others cached)
- Test running balance calculation traverses in correct order

### New Integration Tests to Create

#### tests/integration/transaction-performance.test.ts (T037, T061)

- Benchmark: generate 100k transactions, measure first render time (<500ms target)
- Benchmark: measure account filter time (<100ms target)
- Benchmark: measure single edit time (<100ms target)
- Benchmark: measure balance calculation time (<200ms first, <50ms cached)
- Benchmark: import 500 into 50k, measure time (<3s target)

#### tests/integration/transaction-operations.test.ts (T053, T057)

- Test date change moves transaction to correct bucket
- Test date change prunes empty source bucket
- Test date change across month boundary creates new month bucket
- Test date change across year boundary creates new year bucket
- Test import deletion removes all transactions with importId
- Test import deletion prunes empty buckets
- Test import deletion cascades to suspectedDuplicates

### E2E Tests to Update

#### tests/e2e/transactions.spec.ts (T070)

**Add duplicate review flow tests:**

- Test import with duplicates shows grouped display
- Test clicking "Not a duplicate" unnests transaction (appears as standalone)
- Test clicking "Mark as original" swaps parent/duplicate
- Test "Show Duplicates" filter shows only transactions with duplicates
- Test deleting parent cascades to all duplicates
- Test deleting single duplicate leaves parent and siblings
- Test yellow badge/formatting visible on nested duplicates

### Test File Summary

| File                                              | Status | Task IDs   |
| ------------------------------------------------- | ------ | ---------- |
| tests/unit/crdt/hierarchical-schema.test.ts       | New    | T027       |
| tests/unit/crdt/transaction-mutations.test.ts     | New    | T028       |
| tests/unit/crdt/transaction-queries.test.ts       | New    | T029       |
| tests/unit/crdt/transaction-ordering.test.ts      | New    | T030       |
| tests/unit/crdt/duplicate-mutations.test.ts       | New    | T071       |
| tests/unit/crdt/crdt-conflicts.test.ts            | New    | T075       |
| tests/unit/import/duplicates.test.ts              | Update | T046, T047 |
| tests/unit/domain/balance.test.ts                 | Update | T061       |
| tests/integration/transaction-performance.test.ts | New    | T037, T061 |
| tests/integration/transaction-operations.test.ts  | New    | T053, T057 |
| tests/e2e/transactions.spec.ts                    | Update | T070       |

---

## Notes

- All user stories share the foundational Phase 2 - this is the critical path
- US7 (Duplicates) has slight dependency on US2 (needs imports to create duplicates to test)
- Property-based tests (T030, T047) are important for ordering and complexity invariants
- Run checks after each phase to catch issues early
