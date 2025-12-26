---
applyTo: "src/lib/crdt/**"
---

# CRDT Module Guidelines

This module manages the Loro CRDT document that stores all vault data locally.

## Architecture Overview

```
Loro Document (local)
  ├── accounts: LoroMap<accountId, Account>
  ├── transactions: LoroMap<transactionId, Transaction>
  ├── tags: LoroMap<tagId, Tag>
  ├── statuses: LoroMap<statusId, Status>
  ├── people: LoroMap<personId, Person>
  ├── automations: LoroMap<automationId, Automation>
  ├── imports: LoroMap<importId, Import>
  └── importTemplates: LoroMap<templateId, ImportTemplate>

Sync Flow:
  Local Loro Doc ↔ Encrypted Updates ↔ Supabase Realtime ↔ Other Clients
```

## Key Files

- `schema.ts` - Loro schema definitions using loro-mirror
- `context.tsx` - React context provider for vault state
- `mirror.ts` - loro-mirror document setup and configuration
- `sync.ts` - Sync utilities for Supabase integration
- `snapshot.ts` - Snapshot encryption/decryption utilities

## Critical Rules

1. **Draft-style mutations ONLY** with loro-mirror setState():
   ```typescript
   // ✅ CORRECT - mutate in place
   setState((state) => {
     state.transactions[id] = transaction;
   });
   
   // ❌ WRONG - returning new objects breaks change tracking
   setState((state) => ({
     ...state,
     transactions: { ...state.transactions, [id]: transaction }
   }));
   ```

2. **Use schema types** - Import types from schema.ts, don't redeclare

3. **Soft deletes** - Set `deletedAt` timestamp, don't remove from document

4. **ID generation** - Use `crypto.randomUUID()` for all entity IDs

5. **Timestamps** - Use `Date.now()` for createdAt/updatedAt/deletedAt

## Schema Patterns

Entities follow this pattern:
```typescript
export const entitySchema = schema.LoroMap({
  id: schema.String({ required: true }),
  // ... entity fields
  deletedAt: schema.Number(), // 0 = not deleted, >0 = timestamp
});
```

Use `LoroMapRecord` for dynamic key-value maps:
```typescript
allocations: schema.LoroMapRecord(schema.Number()), // personId -> percentage
```

## React Integration

Use the provided hooks from context.tsx:
```typescript
// Read data
const transactions = useActiveTransactions(); // excludes soft-deleted
const allTransactions = useTransactions(); // includes soft-deleted

// Write data
const setTransaction = useVaultAction((state, id, data) => {
  state.transactions[id] = data;
});
```

## Sync Considerations

- Updates are encrypted before leaving the client
- Each update has an HLC timestamp for ordering
- Snapshot versions track sync progress
- Conflicts are resolved by Loro's CRDT semantics (last-write-wins per field)
