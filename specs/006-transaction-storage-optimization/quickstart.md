# Quickstart: Transaction Storage Optimization

**Date**: 2026-01-10  
**Feature**: 006-transaction-storage-optimization

## Overview

This guide explains how to work with the new hierarchical transaction storage structure.

---

## Key Concepts

### Hierarchical Structure

Transactions are organized as:

```
Account → Year → Month → Day → Transactions
```

This replaces the flat `transactions: LoroMapRecord<Transaction>` with a nested structure that enables:

- O(1) account filtering
- Fine-grained memoization
- Efficient sorted iteration

### Transaction Ordering

Transactions are stored sorted within each day bucket:

1. **creationInstant** descending (newest import first)
2. **importRowIndex** ascending (source file order within import)

The overall view is sorted by date descending, then by the above.

### Nested Duplicates

Suspected duplicates are stored inside the parent transaction's `suspectedDuplicates` list, not as standalone transactions with a reference.

---

## Common Operations

### Reading Transactions

```typescript
import { useVaultSelector } from "@/lib/crdt/context";
import { getAccountTransactions, getAllTransactions } from "@/lib/crdt/queries";

// All transactions for an account (already sorted)
const transactions = useVaultSelector((state) =>
    getAccountTransactions(state.transactions, accountId)
);

// All transactions across all accounts
const allTransactions = useVaultSelector((state) => getAllTransactions(state.transactions));
```

### Finding a Transaction

```typescript
import { findTransaction } from "@/lib/crdt/queries";

// Fast lookup with location (O(log n) to day bucket, then linear within day)
const tx = findTransaction(store, {
    accountId: "acc-123",
    date: "2024-01-15",
    transactionId: "tx-456",
});
```

### Inserting a Transaction

```typescript
import { useVaultAction } from "@/lib/crdt/context";

const { insertTransaction } = useVaultAction();

// Insert standalone transaction
insertTransaction({
    transaction: {
        id: generateId(),
        date: "2024-01-15",
        description: "Coffee",
        amount: -450, // $4.50 in cents
        accountId: "acc-123",
        statusId: "status-for-review",
        creationInstant: Date.now(),
        importRowIndex: null, // manual transaction
        // ... other fields
    },
});

// Insert as suspected duplicate
insertTransaction({
    transaction: {
        /* ... */
    },
    suspectedDuplicateOf: {
        accountId: "acc-123",
        date: "2024-01-15",
        transactionId: "tx-original",
    },
});
```

### Updating a Transaction

```typescript
const { updateTransaction } = useVaultAction();

// Update in place (does not move)
updateTransaction({
    location: {
        accountId: "acc-123",
        date: "2024-01-15",
        transactionId: "tx-456",
    },
    updates: {
        description: "Updated description",
        amount: -500,
    },
});
```

### Changing Transaction Date

```typescript
const { moveTransaction } = useVaultAction();

// Move to different date (removes from old bucket, inserts into new)
moveTransaction({
    location: {
        accountId: "acc-123",
        date: "2024-01-15",
        transactionId: "tx-456",
    },
    newDate: "2024-01-14",
});
```

### Deleting a Transaction

```typescript
const { deleteTransaction } = useVaultAction();

// Delete parent (cascades to duplicates by default)
deleteTransaction({
    location: {
        accountId: "acc-123",
        date: "2024-01-15",
        transactionId: "tx-parent",
    },
});

// Delete duplicate only (from within parent's list)
deleteTransaction({
    location: {
        accountId: "acc-123",
        date: "2024-01-15",
        transactionId: "tx-duplicate",
    },
});
```

### Managing Duplicates

```typescript
const { unnestDuplicate, swapDuplicate } = useVaultAction();

// "Not a duplicate" - unnest to standalone
unnestDuplicate({
    parentLocation: {
        accountId: "acc-123",
        date: "2024-01-15",
        transactionId: "tx-parent",
    },
    duplicateId: "tx-duplicate",
});

// "Mark as original" - swap parent and duplicate
swapDuplicate({
    parentLocation: {
        accountId: "acc-123",
        date: "2024-01-15",
        transactionId: "tx-parent",
    },
    duplicateId: "tx-duplicate",
});
```

---

## Filtering with Duplicates

```typescript
import { getTransactionsWithDuplicates } from "@/lib/crdt/queries";

// "Show Duplicates" filter - shows parents that have duplicates
const transactionsWithDuplicates = useVaultSelector((state) =>
    getTransactionsWithDuplicates(state.transactions, accountId)
);
```

---

## Handling CRDT Conflicts

### Duplicate Day Buckets

If two devices create the same day bucket concurrently, both entries exist in the LoroList. Query helpers automatically union transactions from same-date buckets:

```typescript
// This is handled internally - you don't need to worry about it
function getDayBuckets(month: MonthBucket, day: number): DayBucket[] {
    return month.days.filter((d) => d.day === day);
}
```

### Concurrent Imports

If two devices import the same file simultaneously, duplicates won't be detected (both run against pre-import state). This is a known limitation - future enhancement will add post-import duplicate scanning.

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { insertTransaction, findTransaction } from "@/lib/crdt/mutations";

describe("hierarchical transaction storage", () => {
    it("creates intermediate buckets on insert", () => {
        const store = createEmptyStore();

        insertTransaction(store, {
            transaction: createTransaction({ date: "2024-03-15" }),
        });

        expect(store.accounts["acc-1"].years).toHaveLength(1);
        expect(store.accounts["acc-1"].years[0].year).toBe(2024);
        expect(store.accounts["acc-1"].years[0].months[0].month).toBe(3);
        expect(store.accounts["acc-1"].years[0].months[0].days[0].day).toBe(15);
    });

    it("prunes empty buckets on delete", () => {
        // ...
    });
});
```

### Property-Based Tests

```typescript
import { fc } from "fast-check";

// Ordering invariant
fc.assert(
    fc.property(fc.array(transactionArbitrary), (transactions) => {
        const store = createStoreWithTransactions(transactions);
        const result = getAllTransactions(store);

        // Verify sorted by date desc, creationInstant desc, importRowIndex asc
        for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1];
            const curr = result[i];

            expect(prev.date >= curr.date).toBe(true);
            if (prev.date === curr.date) {
                expect(prev.creationInstant >= curr.creationInstant).toBe(true);
                if (prev.creationInstant === curr.creationInstant) {
                    expect((prev.importRowIndex ?? -1) <= (curr.importRowIndex ?? -1)).toBe(true);
                }
            }
        }
    })
);
```

---

## Performance Expectations

| Operation               | Target  | Notes                                       |
| ----------------------- | ------- | ------------------------------------------- |
| First render (100k txs) | <500ms  | Hierarchical enables lazy loading           |
| Scroll (60fps)          | No jank | Virtual scrolling + fine-grained reactivity |
| Single edit             | <100ms  | Only affected day bucket updates            |
| Import 500 txs          | <3s     | Linear duplicate detection                  |
| Account filter          | <50ms   | O(1) subtree selection                      |
