# Research: Transaction Storage Optimization

**Date**: 2026-01-10  
**Feature**: 006-transaction-storage-optimization

## Overview

This document captures research findings and design decisions for restructuring transaction storage from flat to hierarchical.

---

## 1. Loro CRDT Container Selection

### Decision: Use LoroList (not LoroMovableList) for bucket storage

### Rationale

- **LoroMovableList** is for user-reorderable lists where items need stable identity during moves
- Our buckets are sorted by date/creationInstant - never user-reordered
- We only insert at correct sorted position, delete, and update in place
- **LoroList** provides same insert/delete/update with less overhead

### Alternatives Considered

| Option                  | Pros                              | Cons                                                     | Verdict      |
| ----------------------- | --------------------------------- | -------------------------------------------------------- | ------------ |
| LoroMovableList         | Stable identity on reorder        | Overhead for unused feature                              | Rejected     |
| LoroList                | Simpler, sufficient for our needs | None for our use case                                    | **Selected** |
| LoroMap (keyed by date) | Unique keys, no duplicates        | No ordering, concurrent creation = overwrite (data loss) | Rejected     |

### Reference

- https://loro.dev/docs/tutorial/list

---

## 2. Concurrent Bucket Creation Handling

### Decision: Union same-date buckets on read

### Rationale

When two devices concurrently create a bucket for the same date:

- LoroList allows both entries (no overwrite)
- We get duplicate year/month/day entries
- Handle by treating multiple same-date buckets as one logical bucket
- Lookup helpers scan for all matching buckets and union transactions

### Implementation Approach

```typescript
// Pseudocode for day bucket lookup
function getDayBuckets(month: MonthBucket, day: number): DayBucket[] {
    return month.days.filter((d) => d.day === day);
}

function getTransactionsForDay(month: MonthBucket, day: number): Transaction[] {
    const buckets = getDayBuckets(month, day);
    return buckets.flatMap((b) => b.transactions);
}
```

### Alternatives Considered

| Option             | Pros                                                 | Cons                                    | Verdict      |
| ------------------ | ---------------------------------------------------- | --------------------------------------- | ------------ |
| Union on read      | No special merge logic, handles edge case gracefully | Slight read overhead                    | **Selected** |
| Merge on detection | Clean up duplicates                                  | Complex write logic, CRDT complications | Rejected     |
| LoroMap (keyed)    | Prevents duplicates                                  | Concurrent = overwrite = data loss      | Rejected     |

---

## 3. Transaction Ordering Strategy

### Decision: date desc → creationInstant desc → importRowIndex asc

### Rationale

- **Date descending**: Newest transactions first (user expectation)
- **creationInstant descending**: Within same day, newest import first (most relevant to review)
- **importRowIndex ascending**: Within same import, preserve source file order (matches bank statement)

### New Fields Required

| Field             | Type                | Description                                   |
| ----------------- | ------------------- | --------------------------------------------- |
| `creationInstant` | `number` (epoch ms) | When transaction entered system               |
| `importRowIndex`  | `number \| null`    | Row position in source file (null for manual) |

### Sorting Implementation

```typescript
transactions.sort((a, b) => {
    // 1. Date descending
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;

    // 2. creationInstant descending
    const instantCompare = b.creationInstant - a.creationInstant;
    if (instantCompare !== 0) return instantCompare;

    // 3. importRowIndex ascending (nulls sort last)
    const aIdx = a.importRowIndex ?? Infinity;
    const bIdx = b.importRowIndex ?? Infinity;
    return aIdx - bIdx;
});
```

---

## 4. Duplicate Detection Algorithm

### Decision: Linear merge-scan with sorted lists

### Rationale

Current approach (monthly bucketing) is O(n × m/12). New hierarchical structure enables true O(n + m):

1. Sort import transactions by date
2. Iterate through existing transactions in date order (already sorted in structure)
3. For each import transaction, only compare against existing within ±3 day window
4. Window slides forward as we advance through sorted lists

### Complexity Analysis

| Approach                 | Complexity  | Notes                 |
| ------------------------ | ----------- | --------------------- |
| Current (monthly bucket) | O(n × m/12) | ~8% of quadratic      |
| New (linear merge)       | O(n + m)    | True linear           |
| Naive (all pairs)        | O(n × m)    | Unacceptable at scale |

### Implementation Approach

```typescript
function detectDuplicates(
    newTxs: Transaction[], // sorted by date
    existingTxs: Transaction[], // already sorted in hierarchical structure
    config: DuplicateConfig
): DuplicateMatch[] {
    // Two-pointer merge scan
    let existingIdx = 0;
    const matches: DuplicateMatch[] = [];

    for (const newTx of newTxs) {
        // Advance existingIdx to start of date window
        while (
            existingIdx < existingTxs.length &&
            dateDiff(existingTxs[existingIdx].date, newTx.date) > config.maxDateDiffDays
        ) {
            existingIdx++;
        }

        // Check all existing within window
        let windowIdx = existingIdx;
        while (
            windowIdx < existingTxs.length &&
            dateDiff(existingTxs[windowIdx].date, newTx.date) <= config.maxDateDiffDays
        ) {
            const match = checkDuplicate(newTx, existingTxs[windowIdx], config);
            if (match) matches.push(match);
            windowIdx++;
        }
    }

    return matches;
}
```

---

## 5. Nested Duplicates vs Reference-Based

### Decision: Nested full transactions in `suspectedDuplicates` list

### Rationale

- **Grouping**: Duplicates display with parent - no separate lookup needed
- **Full data**: Nested transactions have all fields for comparison and swap
- **Swap operation**: User can mark duplicate as "original" - becomes parent, old parent becomes duplicate
- **Cascade delete**: Delete parent → delete all nested duplicates
- **One level only**: Duplicates cannot have their own duplicates

### Alternatives Considered

| Option                         | Pros                                  | Cons                                                 | Verdict      |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------- | ------------ |
| Nested full transactions       | Natural grouping, swap easy, no joins | Schema slightly larger                               | **Selected** |
| `duplicateOf` reference        | Simpler schema                        | Requires join for display, swap complex, no grouping | Rejected     |
| Separate duplicates collection | Clean separation                      | Complex queries, hard to cascade                     | Rejected     |

### Swap Operation Flow

1. User marks duplicate B as "original"
2. B moves to its own day bucket as standalone
3. Former parent A moves into B's `suspectedDuplicates`
4. Other duplicates C, D also move into B's `suspectedDuplicates`
5. User can now delete A without cascade-deleting C, D

---

## 6. Aggregate Computation Strategy

### Decision: On-demand via useVaultSelector (no stored aggregates)

### Rationale

- Storing aggregates creates CRDT conflict risk (two devices add transactions → aggregate conflicts)
- `useVaultSelector` provides fine-grained reactivity - only recomputes when selected subtree changes
- Hierarchical structure enables efficient computation - sum year totals instead of scanning all transactions

### Caching Approach

```typescript
// Fine-grained selector - only recomputes if account subtree changes
const accountBalance = useVaultSelector((state) =>
    computeBalance(state.transactions.accounts[accountId])
);

// Month-level caching via selector
const monthlyTotals = useVaultSelector((state) => {
    const account = state.transactions.accounts[accountId];
    return Object.entries(account.years)
        .map(([year, yearBucket]) =>
            Object.entries(yearBucket.months).map(([month, monthBucket]) => ({
                year: parseInt(year),
                month: parseInt(month),
                total: sumTransactions(monthBucket),
            }))
        )
        .flat();
});
```

---

## 7. Schema Migration

### Decision: No migration needed

### Rationale

- No persisted data exists yet
- This is greenfield implementation
- All test data is generated fresh

---

## Summary of Key Decisions

| Topic               | Decision                                              |
| ------------------- | ----------------------------------------------------- |
| Container type      | LoroList (not LoroMovableList)                        |
| Concurrent buckets  | Union on read                                         |
| Ordering            | date desc → creationInstant desc → importRowIndex asc |
| New fields          | `creationInstant`, `importRowIndex` on Transaction    |
| Duplicate detection | Linear merge-scan O(n + m)                            |
| Duplicate storage   | Nested in `suspectedDuplicates` list                  |
| Aggregates          | On-demand via useVaultSelector                        |
| Migration           | Not needed (no existing data)                         |
