# Data Model: Transaction Table UX Improvements

**Date**: 2025-12-31  
**Feature**: 004-transaction-table-ux

## Overview

This feature requires **no changes** to the persisted CRDT schema. The `Transaction` entity already has `merchant` and `description` fields. All new state is UI-only (React state).

## Existing CRDT Schema (No Changes)

```typescript
// From src/lib/crdt/schema.ts - already exists
export const transactionSchema = schema.LoroMap({
  id: schema.String({ required: true }),
  date: schema.String({ required: true }),        // ISO date string
  merchant: schema.String({ defaultValue: "" }),  // ✅ Already exists
  description: schema.String({ defaultValue: "" }), // ✅ Already exists (memo/notes)
  amount: schema.Number({ required: true }),
  accountId: schema.String({ required: true }),
  tagIds: schema.LoroList(schema.String(), (id) => id),
  statusId: schema.String({ required: true }),
  importId: schema.String(),
  allocations: schema.LoroMapRecord(schema.Number()),
  duplicateOf: schema.String(),
  deletedAt: schema.Number(),
});
```

## UI State (React Only)

These interfaces define state managed in React components, not persisted to CRDT.

### Selection State

```typescript
/**
 * Tracks which transactions are selected for bulk operations.
 * Supports virtualized selection (tracks IDs even for non-rendered rows).
 */
interface SelectionState {
  /** Set of selected transaction IDs */
  selectedIds: Set<string>;
  
  /** Last selected ID for shift-click range selection */
  lastSelectedId: string | null;
}

/**
 * Derived selection state computed from selectedIds and filteredIds
 */
interface SelectionDerived {
  /** True when all filtered transactions are selected */
  isAllSelected: boolean;
  
  /** True when at least one (but not all) filtered transactions are selected */
  isSomeSelected: boolean;
  
  /** Number of selected transactions */
  selectedCount: number;
}
```

### Expanded Descriptions State

```typescript
/**
 * Tracks which transactions have their description row expanded.
 */
interface ExpandedState {
  /** Set of transaction IDs with expanded description row */
  expandedIds: Set<string>;
}
```

### Keyboard Focus State

```typescript
/**
 * Tracks which cell has keyboard focus for arrow key navigation.
 */
interface FocusState {
  /** Currently focused cell, or null if none */
  focusedCell: {
    rowId: string;
    column: ColumnId;
  } | null;
  
  /** Whether the focused cell is in edit mode (cursor in input) */
  isEditing: boolean;
}

/** Valid column identifiers for focus navigation */
type ColumnId = 
  | "checkbox"
  | "date" 
  | "merchant"
  | "account"
  | "tags"
  | "status"
  | "amount"
  | "balance"
  | "actions";
```

## Column Configuration

```typescript
/**
 * Column definition for the transaction table.
 * Order matches FR-033a: Checkbox → Date → Merchant → Account → Tags → Status → Amount → Balance → Actions
 */
interface ColumnDef {
  id: ColumnId;
  header: string;
  width: string;           // Tailwind width class
  align: "left" | "center" | "right";
  editable: boolean;
  sortable: boolean;
}

const COLUMN_CONFIG: ColumnDef[] = [
  { id: "checkbox", header: "",        width: "w-10",  align: "center", editable: false, sortable: false },
  { id: "date",     header: "Date",    width: "w-28",  align: "left",   editable: true,  sortable: true },
  { id: "merchant", header: "Merchant", width: "flex-1", align: "left",  editable: true,  sortable: true },
  { id: "account",  header: "Account", width: "w-32",  align: "left",   editable: true,  sortable: true },
  { id: "tags",     header: "Tags",    width: "w-40",  align: "center", editable: true,  sortable: false },
  { id: "status",   header: "Status",  width: "w-28",  align: "center", editable: true,  sortable: true },
  { id: "amount",   header: "Amount",  width: "w-28",  align: "right",  editable: true,  sortable: true },
  { id: "balance",  header: "Balance", width: "w-28",  align: "right",  editable: false, sortable: false },
  { id: "actions",  header: "",        width: "w-20",  align: "center", editable: false, sortable: false },
];
```

## Type Exports

```typescript
// Re-export existing types with clearer names for this feature
export type { Transaction, TransactionInput } from "@/lib/crdt/schema";

// New UI state types
export type { SelectionState, SelectionDerived, ExpandedState, FocusState, ColumnId, ColumnDef };
```

## Validation Rules

No additional validation rules. Existing transaction validation applies:

- `date`: Required, ISO 8601 date string (YYYY-MM-DD)
- `merchant`: Optional, string (defaults to "")
- `description`: Optional, string (defaults to "")
- `amount`: Required, integer (minor units)
- `accountId`: Required, must reference existing account
- `statusId`: Required, must reference existing status
- `tagIds`: Optional array of tag IDs

## State Transitions

### Selection State Machine

```
[Empty] --click checkbox--> [Single Selected]
[Single Selected] --click same--> [Empty]
[Single Selected] --click other--> [Single Selected]
[Single Selected] --shift+click--> [Range Selected]
[Any] --click header (partial)--> [All Selected]
[All Selected] --click header--> [Empty]
```

### Focus State Machine

```
[No Focus] --click cell--> [Focused, Not Editing]
[Focused, Not Editing] --type/enter--> [Focused, Editing]
[Focused, Editing] --enter/tab/blur--> [Focused, Not Editing] + Save
[Focused, Editing] --escape--> [Focused, Not Editing] + Revert
[Focused, Not Editing] --arrow key--> [Move Focus to Adjacent Cell]
[Focused, Editing] --arrow key--> [Move Cursor in Input] (no navigation)
```
