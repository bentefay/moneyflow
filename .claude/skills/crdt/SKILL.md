---
name: crdt
description: Loro CRDT state management with loro-mirror. Use when working on files in src/lib/crdt/.
---

# CRDT Guidelines

## Critical: Draft-Style Mutations Only

```typescript
// CORRECT - mutate in place
setState((state) => {
    state.transactions[id] = transaction;
});

// WRONG - returning new objects breaks change tracking
setState((state) => ({
    ...state,
    transactions: { ...state.transactions, [id]: transaction },
}));
```

## Rules

- Import types from `schema.ts`, don't redeclare
- **Soft deletes**: Set `deletedAt = Temporal.Now.instant()`, never remove from document
- `undefined` deletedAt means "not deleted" (falsy check: `if (!entity.deletedAt)`)
- Use `crypto.randomUUID()` for IDs, `Temporal.Now.instant()` for timestamps

## Rich Domain Types (via `rich-schema.ts` transforms)

Schema fields use `richSchema.*` helpers that apply bidirectional transforms between
CRDT primitives and domain types. The `richSchema` factory methods must be generic over
`O extends SchemaOptions` to preserve `required: false` optionality.

| richSchema helper               | CRDT primitive | Domain type          |
| ------------------------------- | -------------- | -------------------- |
| `richSchema.PlainDate()`        | `string`       | `Temporal.PlainDate` |
| `richSchema.Instant()`          | `number`       | `Temporal.Instant`   |
| `richSchema.MoneyMinorUnits()`  | `number`       | `MoneyMinorUnits`    |
| `richSchema.Percentage()`       | `number`       | `Percentage`         |
| `richSchema.CurrencyCode()`     | `string`       | `CurrencyCode`       |
| `richSchema.StringEnum(values)` | `string`       | Union literal type   |

## Schema Pattern

```typescript
export const entitySchema = schema.LoroMap({
    id: schema.String({ required: true }),
    name: schema.String({ required: true }),
    // Optional fields use { required: false } — value type becomes T | undefined
    deletedAt: richSchema.Instant({ required: false }),
});
```

## React Hooks

- `useActiveTransactions()` - excludes soft-deleted
- `useTransactions()` - includes soft-deleted
- `useVaultAction()` - for mutations

## Sync

- Updates encrypted before leaving client
- Loro handles versioning via version vectors
- Conflicts: last-write-wins per field
