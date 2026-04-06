# Feature Specification: Transaction Storage Optimization

**Feature Branch**: `006-transaction-storage-optimization`  
**Created**: 2026-01-10  
**Status**: Draft  
**Input**: User description: "Optimize transaction storage structure for efficient lookup,
modification, and aggregation using hierarchical date-based organization"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Transactions at Scale (Priority: P1)

A user with 100,000+ transactions across multiple accounts and years opens the transactions view.
They can immediately scroll through their transactions in reverse chronological order without delay.
Switching between accounts is instant.

**Why this priority**: Core functionality - if viewing transactions is slow, the entire app feels
broken.

**Independent Test**: Load 100k transactions, open transactions view, measure time to first render
and scroll responsiveness.

**Acceptance Scenarios**:

1. **Given** a vault with 100,000 transactions across 5 accounts and 10 years, **When** the user
   opens the transactions view, **Then** the first page of transactions renders within 200ms.
2. **Given** the transactions view is open, **When** the user scrolls rapidly through the list,
   **Then** the display maintains 60fps with no jank or blank rows.
3. **Given** the user is viewing all transactions, **When** they filter to a single account,
   **Then** the filtered view renders within 100ms.

---

### User Story 2 - Import Large Statement (Priority: P1)

A user imports a bank statement with 500 transactions. The import completes quickly, and when they
return to the transactions view, only the affected date ranges re-render. Existing transactions
outside the import date range remain cached.

**Why this priority**: Imports are frequent operations. Slow imports or post-import re-renders
create friction.

**Independent Test**: Import 500 transactions into a vault with 50k existing transactions, measure
import time and re-render scope.

**Acceptance Scenarios**:

1. **Given** a vault with 50,000 existing transactions, **When** the user imports 500 new
   transactions for January 2024, **Then** the import completes within 2 seconds.
2. **Given** an import just completed for January 2024, **When** the transactions view renders,
   **Then** months outside January 2024 use cached data and do not recompute.
3. **Given** an import with transactions on dates that already have existing transactions, **When**
   viewing those dates, **Then** newly imported transactions appear before older imports (sorted by
   import time descending, then source row order ascending).

---

### User Story 3 - Edit Transaction (Priority: P2)

A user edits a transaction's description or amount. The edit saves instantly without triggering a
full re-sort of all transactions.

**Why this priority**: Editing is common but less frequent than viewing. Performance matters but P1
scenarios take precedence.

**Independent Test**: Edit a transaction in a 100k transaction vault, verify only the affected day
bucket is modified.

**Acceptance Scenarios**:

1. **Given** a transaction in a vault with 100,000 transactions, **When** the user edits the
   description, **Then** the edit persists within 50ms.
2. **Given** a transaction is edited, **When** the transactions view re-renders, **Then** only the
   affected day's transactions are recomputed.

---

### User Story 4 - Change Transaction Date (Priority: P2)

A user corrects a transaction's date from January 15 to January 14. The transaction moves to the
correct position in the list, and both the old and new day buckets update correctly.

**Why this priority**: Date edits are less common but must work correctly when they occur.

**Independent Test**: Change a transaction's date, verify it moves to the correct position and old
day bucket is pruned if empty.

**Acceptance Scenarios**:

1. **Given** a transaction dated January 15, **When** the user changes the date to January 14,
   **Then** the transaction appears in the January 14 position sorted by creationInstant.
2. **Given** a transaction is the only one on January 15, **When** its date is changed to January
   14, **Then** the January 15 day bucket is pruned from storage.

---

### User Story 5 - Delete Import (Priority: P3)

A user realizes they imported the wrong file and deletes the import. All transactions from that
import are removed, and empty date buckets are pruned.

**Why this priority**: Import deletion is rare but must clean up correctly.

**Independent Test**: Delete an import, verify all associated transactions are removed and empty
nodes pruned.

**Acceptance Scenarios**:

1. **Given** an import with 100 transactions across 30 days, **When** the user deletes the import,
   **Then** all 100 transactions are removed.
2. **Given** deleted transactions were the only transactions on some days, **When** the deletion
   completes, **Then** those empty day/month/year buckets are pruned.

---

### User Story 6 - Calculate Account Balance (Priority: P2)

A user views account balances and monthly summaries. These aggregates compute quickly using cached
subtrees - unchanged months return cached values.

**Why this priority**: Aggregates are displayed frequently and must be responsive.

**Independent Test**: View account balance after editing one transaction, verify only affected
months recompute.

**Acceptance Scenarios**:

1. **Given** a vault with 100,000 transactions, **When** the user views account balances, **Then**
   balances compute within 100ms.
2. **Given** a transaction in March 2024 is edited, **When** balances recompute, **Then** months
   other than March 2024 use cached values.

---

### User Story 7 - Review Suspected Duplicates (Priority: P2)

After importing a bank statement, a user sees that some transactions have been flagged as suspected
duplicates. They review each group and decide which to keep, which to delete, and which are not
actually duplicates.

**Why this priority**: Duplicate management is essential for data accuracy. Poor duplicate UX leads
to cluttered or missing data.

**Independent Test**: Import transactions with duplicates, verify user can mark as original, mark as
not duplicate, and delete.

**Acceptance Scenarios**:

1. **Given** a transaction with 2 suspected duplicates, **When** the user views the transaction,
   **Then** they see the duplicates grouped with the original.
2. **Given** a transaction with suspected duplicates, **When** the user clicks "Not a duplicate" on
   one, **Then** that transaction is unnested and becomes standalone.
3. **Given** a transaction with suspected duplicates, **When** the user clicks "Mark as original" on
   a duplicate, **Then** the duplicate becomes the parent and the former parent becomes a duplicate.
4. **Given** a transaction with suspected duplicates, **When** the user deletes the parent
   transaction, **Then** all its suspected duplicates are also deleted (cascade).
5. **Given** a suspected duplicate, **When** the user deletes it, **Then** only that duplicate is
   removed; the parent and other duplicates remain.

---

### Edge Cases

- What happens when importing transactions that span year boundaries (December 31 to January 1)?
- How does the system handle transactions with the same date, creationInstant, and importRowIndex
  (should be impossible but worth considering)?
- What happens when a date edit moves a transaction across month or year boundaries?
- What happens when swapping original/duplicate and they have different dates? (duplicate moves to
  its own date's day bucket as parent)
- Concurrent container creation (e.g., two devices creating the same day/month/year bucket): since
  buckets are stored in LoroList, concurrent creation results in duplicate entries for the same
  date, not overwrites. Handle by treating multiple buckets with the same date as one logical
  bucket - union their transactions on read. Helpers for lookup should account for this.
- Concurrent import of same file on two devices: duplicates won't be detected since both imports run
  against pre-import state. Future enhancement: post-import duplicate scan.

## Requirements _(mandatory)_

### Functional Requirements

#### Storage Structure

- **FR-001**: System MUST store transactions in a hierarchical structure: Account → Year → Month →
  Day → Transaction list.
- **FR-002**: Each day bucket MUST contain a list of transactions for that specific date.
- **FR-003**: System MUST prune empty day, month, and year nodes when the last transaction is
  removed.
- **FR-004**: System MUST create intermediate nodes (year, month, day) lazily when the first
  transaction for that period is added.

#### Transaction Ordering

- **FR-005**: Transactions MUST be sorted by date descending (newest first).
- **FR-006**: Within the same date, transactions MUST be sorted by creationInstant descending
  (newest import/creation first).
- **FR-007**: Within the same date and creationInstant, transactions MUST be sorted by
  importRowIndex ascending (source file order).
- **FR-008**: Each transaction MUST store a `creationInstant` field (epoch milliseconds)
  representing when it entered the system.
- **FR-009**: Each imported transaction MUST store an `importRowIndex` field representing its
  position in the source file.
- **FR-010**: Manually created transactions MUST have null `importRowIndex`.

#### Lookup and Modification

- **FR-011**: System MUST support lookup by date + transaction ID using binary search to locate the
  day bucket.
- **FR-012**: System MUST support updates by date + transaction ID, mutating the transaction in
  place.
- **FR-013**: When a transaction's date is edited, system MUST remove it from the old day bucket and
  insert it into the new day bucket.
- **FR-014**: After a date edit, system MUST prune the old day bucket if it becomes empty.

#### Suspected Duplicates

- **FR-015**: Each transaction MUST support a `suspectedDuplicates` list containing nested
  transactions.
- **FR-016**: Suspected duplicates MUST be full transactions with all fields (id, date, amount,
  importId, etc.), not references.
- **FR-030**: Nesting MUST be limited to one level - suspected duplicates cannot have their own
  suspected duplicates.
- **FR-025**: When a user marks a duplicate as "not a duplicate", system MUST unnest it to the
  appropriate day bucket as a standalone transaction.
- **FR-026**: When a user marks a duplicate as "original" (swap), system MUST swap parent and
  duplicate - the duplicate becomes standalone in its own day bucket, and the former parent moves
  into the new parent's `suspectedDuplicates` list along with any other duplicates. This enables
  deleting the former parent without cascade-deleting the remaining duplicates that still need
  review.
- **FR-027**: When a parent transaction is deleted, system MUST cascade delete all its suspected
  duplicates.
- **FR-028**: When a suspected duplicate is deleted, system MUST remove only that duplicate; parent
  and siblings remain.
- **FR-029**: Suspected duplicates MUST be displayed grouped with their parent transaction in the
  UI.
- **FR-031**: Suspected duplicates MUST be visually distinguished from regular transactions (e.g.,
  yellow badge/formatting).
- **FR-032**: The "Show Duplicates" filter MUST show transactions that have suspected duplicates
  (not transactions that are duplicates), displaying both the parent and its nested duplicates
  together.

#### Import Integration

- **FR-017**: When importing transactions, system MUST set `creationInstant` to the import's
  creation timestamp.
- **FR-018**: When importing transactions, system MUST set `importRowIndex` to the row's position in
  the source file.
- **FR-019**: When an import is deleted, system MUST remove all transactions with that importId.

#### Duplicate Detection

- **FR-022**: Duplicate detection MUST sort import transactions by date and linearly scan against
  existing transactions in date order.
- **FR-023**: Duplicate detection MUST only compare transactions within the configured date
  proximity window (e.g., ±3 days) and within the target account only.
- **FR-024**: Duplicate detection MUST scale linearly with the sum of existing and new transaction
  counts, not as a product of them.

#### Aggregates

- **FR-020**: Account balances and other aggregates MUST be computed on-demand (not pre-stored).
- **FR-021**: Aggregate computations MUST leverage the hierarchical structure for fine-grained
  reactivity (unchanged subtrees should not trigger recomputation).

### Key Entities

- **Transaction**: Financial transaction with date, amount, description, and hierarchical location
  (account/year/month/day).
- **Day Bucket**: Ordered list of transactions for a specific date within a month.
- **Month Bucket**: Collection of day buckets for a specific month within a year.
- **Year Bucket**: Collection of month buckets for a specific year within an account.
- **Account Transaction Tree**: Hierarchical structure containing all transactions for one account,
  organized by year/month/day.
- **Suspected Duplicate**: A full transaction nested inside another transaction's
  `suspectedDuplicates` list, pending user review to confirm, delete, or unnest.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can open a transactions view containing 100,000 transactions within 500ms.
- **SC-002**: Users can scroll through 100,000 transactions at 60fps without visible jank.
- **SC-003**: Importing 500 transactions into a vault with 50,000 existing transactions completes
  within 3 seconds.
- **SC-004**: Editing a single transaction completes within 100ms regardless of total transaction
  count.
- **SC-005**: After an import, only affected month subtrees recompute - unchanged months remain
  cached.
- **SC-006**: Filtering transactions by account is instantaneous (under 50ms) as it selects a
  pre-partitioned subtree.
- **SC-007**: Account balance calculations for 100,000 transactions complete within 200ms on first
  load, under 50ms on subsequent loads with caching.
- **SC-008**: Duplicate detection during import scales linearly with the number of transactions
  being compared (not exponentially).

## Clarifications

### Session 2026-01-10

- Q: How should CRDT conflicts be resolved for concurrent edits? → A: Rely on Loro's built-in CRDT
  conflict resolution (automatic). Concurrent bucket creation in LoroList results in duplicate
  entries for the same date - handle by treating multiple same-date buckets as one logical bucket,
  unioning their transactions on read.
- Q: Migration strategy for existing data? → A: No migration needed - no persisted data exists yet.
- Q: Cross-account duplicate detection? → A: Only detect duplicates within the target account being
  imported to.
- Q: Undo/redo scope? → A: Loro natively operates at the change level (grouped operations from a
  single transaction). Granularity is determined by how we batch operations into Loro transactions.
- Q: Duplicate detection timing? → A: Import time only - duplicates are detected before commit, no
  post-import scanning.

## Assumptions

- Users always view transactions in reverse chronological order (newest first). Alternative sort
  orders are not required.
- Date granularity (YYYY-MM-DD) is sufficient - sub-day timestamps are not needed for ordering
  beyond creationInstant.
- The number of transactions per day is small (typically 1-20), making linear scan within a day
  bucket acceptable.
- Manual transaction creation is less frequent than imports, so optimizing import flow takes
  priority.
- `useVaultSelector` provides sufficient memoization - no additional caching layer is needed for
  aggregates.
- No persisted data exists yet - this is a greenfield implementation with no migration required.
