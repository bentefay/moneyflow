# API Contracts: Vault Settings & Navigation Improvements

**Feature**: 002-vault-settings  
**Date**: 31 December 2025

## Overview

**No new API endpoints required.** This feature operates entirely through:

1. **Client-side CRDT mutations** via loro-mirror
2. **Existing tRPC routes** for vault sync (already implemented in 001-core-mvp)

## State Mutations (Client-Side)

All preference changes are made through loro-mirror's `useVaultAction` hook, which:
1. Mutates the local CRDT state
2. Generates CRDT operations
3. Persists to IndexedDB
4. Syncs to server via existing `vault_ops` table

### Set Default Currency

```typescript
// No API call - direct CRDT mutation
const setDefaultCurrency = useVaultAction((state, currency: string) => {
  state.preferences.defaultCurrency = currency;
});

// Usage
setDefaultCurrency("EUR");
```

**Sync Flow**:
```
Client                          Server
  │                               │
  ├─ setState() ──────────────────┤
  │  (loro-mirror mutation)       │
  │                               │
  ├─ IndexedDB persist ───────────┤
  │                               │
  ├─ vault.ops.push() ────────────►
  │  (encrypted CRDT op)          │
  │                               ├─ vault_ops INSERT
  │                               │
  ◄────── Realtime broadcast ─────┤
  │                               │
```

## Existing Routes Used

These routes from 001-core-mvp handle all persistence:

| Route | Purpose |
|-------|---------|
| `vault.ops.push` | Push encrypted CRDT operations to server |
| `vault.ops.pull` | Pull operations from other clients |
| `vault.snapshot.save` | Save shallow snapshot when threshold exceeded |
| `vault.snapshot.load` | Load latest snapshot on cold start |

## Navigation (No API)

Route changes are purely client-side Next.js routing:

| From | To | Trigger |
|------|-----|---------|
| `/dashboard` | `/transactions` | Direct URL or link click |
| After vault creation | `/settings` | `router.push("/settings")` |
| After unlock | `/transactions` | `router.replace("/transactions")` |

## No New Contracts Needed

This feature adds:
- ✅ UI pages (client-side only)
- ✅ CRDT state mutations (existing infrastructure)
- ✅ Navigation changes (client-side routing)
- ❌ No new API endpoints
- ❌ No new database tables
- ❌ No new tRPC procedures
