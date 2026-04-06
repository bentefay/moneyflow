# Data Model: Transaction Storage Optimization

**Date**: 2026-01-10  
**Feature**: 006-transaction-storage-optimization

## Overview

This document defines the hierarchical transaction storage schema and entity relationships.

---

## Entity Diagram

```
Vault
└── transactions: TransactionStore
    └── accounts: LoroMap<accountId, AccountTransactionTree>
        └── years: LoroList<YearBucket>
            └── months: LoroList<MonthBucket>
                └── days: LoroList<DayBucket>
                    └── transactions: LoroList<Transaction>
                        └── suspectedDuplicates: LoroList<Transaction>
```

---

## Entities

### TransactionStore

Root container for all transactions, partitioned by account.

| Field    | Type                                      | Description                                   |
| -------- | ----------------------------------------- | --------------------------------------------- |
| accounts | `LoroMap<string, AccountTransactionTree>` | Map of accountId → account's transaction tree |

### AccountTransactionTree

All transactions for a single account, organized by year.

| Field     | Type                   | Description                                     |
| --------- | ---------------------- | ----------------------------------------------- |
| accountId | `string`               | Reference to the account                        |
| years     | `LoroList<YearBucket>` | List of year buckets, sorted by year descending |

### YearBucket

Transactions for a single year within an account.

| Field  | Type                    | Description                                       |
| ------ | ----------------------- | ------------------------------------------------- |
| year   | `number`                | Year (e.g., 2024)                                 |
| months | `LoroList<MonthBucket>` | List of month buckets, sorted by month descending |

### MonthBucket

Transactions for a single month within a year.

| Field | Type                  | Description                                   |
| ----- | --------------------- | --------------------------------------------- |
| month | `number`              | Month (1-12)                                  |
| days  | `LoroList<DayBucket>` | List of day buckets, sorted by day descending |

### DayBucket

Transactions for a single day within a month.

| Field        | Type                    | Description                                                              |
| ------------ | ----------------------- | ------------------------------------------------------------------------ |
| day          | `number`                | Day of month (1-31)                                                      |
| transactions | `LoroList<Transaction>` | List of transactions, sorted by creationInstant desc, importRowIndex asc |

### Transaction

A single financial transaction.

| Field               | Type                      | Required | Description                                   |
| ------------------- | ------------------------- | -------- | --------------------------------------------- |
| id                  | `string`                  | Yes      | Unique identifier                             |
| date                | `string`                  | Yes      | ISO date (YYYY-MM-DD)                         |
| description         | `string`                  | No       | Bank-provided description                     |
| notes               | `string`                  | No       | User notes                                    |
| amount              | `number`                  | Yes      | Amount in minor units (cents)                 |
| accountId           | `string`                  | Yes      | Reference to account                          |
| tagIds              | `LoroList<string>`        | No       | List of tag IDs                               |
| statusId            | `string`                  | Yes      | Reference to status                           |
| importId            | `string`                  | No       | Reference to import batch                     |
| allocations         | `LoroMap<string, number>` | No       | personId → percentage                         |
| creationInstant     | `number`                  | Yes      | Epoch milliseconds when entered system        |
| importRowIndex      | `number`                  | No       | Row position in source file (null for manual) |
| suspectedDuplicates | `LoroList<Transaction>`   | No       | Nested duplicate transactions                 |
| deletedAt           | `number`                  | No       | Soft delete timestamp                         |

---

## Field Changes from Current Schema

### New Fields

| Field                 | Type                    | Description                                         |
| --------------------- | ----------------------- | --------------------------------------------------- |
| `creationInstant`     | `number`                | Epoch ms - import timestamp or manual creation time |
| `importRowIndex`      | `number \| null`        | Source file row position                            |
| `suspectedDuplicates` | `LoroList<Transaction>` | Nested duplicates (replaces `duplicateOf`)          |

### Removed Fields

| Field         | Replacement                                 |
| ------------- | ------------------------------------------- |
| `duplicateOf` | `suspectedDuplicates` on parent transaction |

---

## Validation Rules

### Transaction

1. `id` must be unique across entire vault
2. `date` must be valid ISO date (YYYY-MM-DD)
3. `amount` must be integer (minor units)
4. `accountId` must reference existing account
5. `statusId` must reference existing status
6. `creationInstant` must be positive integer
7. `importRowIndex` if present, must be non-negative integer
8. `suspectedDuplicates` must contain only one level (no nested duplicates of duplicates)

### Bucket Ordering

1. Years sorted descending (newest first)
2. Months sorted descending within year
3. Days sorted descending within month
4. Transactions within day sorted by: creationInstant desc, importRowIndex asc

### Bucket Invariants

1. Empty buckets must be pruned
2. Buckets created lazily on first transaction
3. Multiple buckets for same date allowed (CRDT conflict) - union on read

---

## State Transitions

### Transaction Lifecycle

```
[Import/Create] → Active → [Soft Delete] → Deleted
                    ↓
              [Mark as Duplicate] → Nested in Parent
                    ↓
              [Unnest / Swap] → Active (standalone)
```

### Duplicate State Transitions

```
                                    ┌─────────────────┐
                                    │  Detected as    │
                                    │  Duplicate      │
                                    └────────┬────────┘
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │  Nested in parent's          │
                              │  suspectedDuplicates         │
                              └──────────────┬───────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
    ┌─────────────────┐          ┌─────────────────┐            ┌─────────────────┐
    │  "Not a         │          │  "Mark as       │            │  Delete         │
    │  Duplicate"     │          │  Original"      │            │  Duplicate      │
    └────────┬────────┘          └────────┬────────┘            └────────┬────────┘
             │                            │                              │
             ▼                            ▼                              ▼
    ┌─────────────────┐          ┌─────────────────┐            ┌─────────────────┐
    │  Unnested to    │          │  Swap: becomes  │            │  Removed from   │
    │  own day bucket │          │  new parent,    │            │  parent's list  │
    │  as standalone  │          │  old parent     │            │                 │
    └─────────────────┘          │  becomes dup    │            └─────────────────┘
                                 └─────────────────┘
```

### Delete Cascade

```
Delete Parent Transaction
         │
         ├──► Delete all suspectedDuplicates
         │
         └──► Prune empty day bucket (if last transaction)
                      │
                      └──► Prune empty month bucket (if last day)
                                   │
                                   └──► Prune empty year bucket (if last month)
```

---

## Loro Schema Definition

```typescript
// New hierarchical transaction schema
export const transactionSchema = schema.LoroMap({
    id: schema.String({ required: true }),
    date: schema.String({ required: true }),
    description: schema.String({ defaultValue: "" }),
    notes: schema.String({ defaultValue: "" }),
    amount: schema.Number({ required: true }),
    accountId: schema.String({ required: true }),
    tagIds: schema.LoroList(schema.String()),
    statusId: schema.String({ required: true }),
    importId: schema.String(),
    allocations: schema.LoroMapRecord(schema.Number()),
    creationInstant: schema.Number({ required: true }),
    importRowIndex: schema.Number(),
    suspectedDuplicates: schema.LoroList(/* recursive - see note */),
    deletedAt: schema.Number()
});

export const dayBucketSchema = schema.LoroMap({
    day: schema.Number({ required: true }),
    transactions: schema.LoroList(transactionSchema)
});

export const monthBucketSchema = schema.LoroMap({
    month: schema.Number({ required: true }),
    days: schema.LoroList(dayBucketSchema)
});

export const yearBucketSchema = schema.LoroMap({
    year: schema.Number({ required: true }),
    months: schema.LoroList(monthBucketSchema)
});

export const accountTransactionTreeSchema = schema.LoroMap({
    accountId: schema.String({ required: true }),
    years: schema.LoroList(yearBucketSchema)
});

export const transactionStoreSchema = schema.LoroMapRecord(accountTransactionTreeSchema);

// In vault schema, replace:
// transactions: schema.LoroMapRecord(transactionSchema),
// With:
// transactions: transactionStoreSchema,
```

**Note**: `suspectedDuplicates` is a LoroList of the same transaction schema, but limited to one
level (duplicates cannot have their own duplicates - enforced at application level).

---

## Query Patterns

### Get all transactions for account (sorted)

```typescript
function getAccountTransactions(store: TransactionStore, accountId: string): Transaction[] {
    const tree = store.accounts[accountId];
    if (!tree) return [];

    const result: Transaction[] = [];
    for (const year of tree.years) {
        for (const month of year.months) {
            // Handle potential duplicate day buckets (CRDT conflict)
            const dayGroups = groupBy(month.days, (d) => d.day);
            for (const [, days] of Object.entries(dayGroups).sort((a, b) => b[0] - a[0])) {
                for (const day of days) {
                    result.push(...day.transactions);
                }
            }
        }
    }
    return result; // Already sorted by structure
}
```

### Find transaction by date + id

```typescript
function findTransaction(
    store: TransactionStore,
    accountId: string,
    date: string, // YYYY-MM-DD
    transactionId: string
): Transaction | undefined {
    const [year, month, day] = parseDate(date);
    const tree = store.accounts[accountId];
    if (!tree) return undefined;

    const yearBucket = tree.years.find((y) => y.year === year);
    if (!yearBucket) return undefined;

    const monthBucket = yearBucket.months.find((m) => m.month === month);
    if (!monthBucket) return undefined;

    // Handle potential duplicate day buckets
    const dayBuckets = monthBucket.days.filter((d) => d.day === day);
    for (const dayBucket of dayBuckets) {
        const tx = dayBucket.transactions.find((t) => t.id === transactionId);
        if (tx) return tx;

        // Also check nested duplicates
        for (const t of dayBucket.transactions) {
            const dup = t.suspectedDuplicates?.find((d) => d.id === transactionId);
            if (dup) return dup;
        }
    }

    return undefined;
}
```

### Get transactions with duplicates (for filter)

```typescript
function getTransactionsWithDuplicates(store: TransactionStore, accountId?: string): Transaction[] {
    const accounts = accountId
        ? [store.accounts[accountId]].filter(Boolean)
        : Object.values(store.accounts);

    const result: Transaction[] = [];
    for (const tree of accounts) {
        for (const year of tree.years) {
            for (const month of year.months) {
                for (const day of month.days) {
                    for (const tx of day.transactions) {
                        if (tx.suspectedDuplicates?.length > 0) {
                            result.push(tx);
                        }
                    }
                }
            }
        }
    }
    return result;
}
```
