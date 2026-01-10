---
name: sync
description: Real-time sync with Supabase, Loro CRDT, and IndexedDB persistence. Use when working on files in src/lib/sync/.
---

# Sync Module Guidelines

Real-time synchronization between clients using Supabase Realtime, Loro CRDT, and IndexedDB local caching.

## Design Decisions

### Core Principles

1. **Server is source of truth** - IndexedDB is a cache that mirrors server state
2. **All ops kept forever** - No pruning; storage is cheap, enables full audit trail and any-point sync
3. **Shallow snapshots for fast start** - Performance optimization only, not a compaction mechanism
4. **Encryption at rest** - Server sees encrypted blobs + unencrypted version metadata for filtering

### Storage Strategy

| Storage                    | Purpose         | Contents                                |
| -------------------------- | --------------- | --------------------------------------- |
| `vault_ops` (server)       | Source of truth | ALL ops, forever                        |
| `vault_snapshots` (server) | Fast cold start | Latest shallow snapshot per vault       |
| IndexedDB (client)         | Local cache     | Mirrors server + tracks `pushed` status |

### Persistence Flow

| Event            | IndexedDB                          | Server                            |
| ---------------- | ---------------------------------- | --------------------------------- |
| Local change     | **Immediate** (crash safety)       | **Throttled** (~2s via lodash-es) |
| Tab hidden/close | Immediate                          | Flush pending                     |
| Cold start       | Load snapshot → usable immediately | Background sync                   |

### Cold Start Logic

```
1. Load local snapshot → app immediately usable
2. Background sync:
   a. Send version_vector + has_unpushed flag to server
   b. Server decides:
      - Few ops (< 500 count OR < 500KB) → return ops
      - Many ops + no unpushed → return { use_snapshot }
   c. Client applies ops OR downloads fresh snapshot
   d. Push any local unpushed ops
```

**Key insight:** If client has no unpushed ops and server snapshot is newer, download fresh snapshot instead of applying many ops.

### Snapshot Refresh

In background, client creates new shallow snapshot and updates server when (checked on op insert):

- Ops count since last snapshot > 1000, OR
- Bytes since last snapshot > 1MB

**NOT time-based** - no point refreshing if nothing changed.

### Timestamps

| Field                    | Source                                 | Purpose                               |
| ------------------------ | -------------------------------------- | ------------------------------------- |
| `created_at` (ops table) | Server (`DEFAULT now()`)               | Consistent ordering, can't be spoofed |
| Loro commit timestamp    | Client (via `setState({ timestamp })`) | User's wall clock for UX display      |

### UI Indicators

**Sync Status:** Three states shown in header

- **Saved** - All local ops pushed to server
- **Saving...** - Pending ops in throttle buffer
- **Offline** - Can't reach server, continuing local-only

**Tab Close Warning:** `beforeunload` confirmation if unpushed ops exist.

### Key Implementation Details

- **loro-mirror auto-commits** on `setState()` - no manual commit debouncing needed
- **`subscribeLocalUpdates`** fires after each commit with binary update bytes
- **`has_unpushed` flag is critical** - server must send ops (not snapshot) if client has local changes to merge
- **Use `lodash-es` throttle** - don't roll custom timing utilities
- **Version vector stored plaintext** - enables server-side filtering without decryption

## Key Files

- `manager.ts` - SyncManager class coordinating sync operations
- `persistence.ts` - IndexedDB read/write operations
- `presence.ts` - User presence tracking (who's online, what they're editing)
- `index.ts` - Public API exports

## Critical Rules

1. **IndexedDB writes are immediate** - Every local change persists instantly
2. **Server pushes are throttled** - Use lodash-es throttle, ~2s interval
3. **Encrypt before storage** - Never store plaintext in IndexedDB or server
4. **Version vector is plaintext** - Enables server-side filtering without decryption
5. **All ops kept forever** - No pruning; storage is cheap, enables full audit trail
6. **Server decides ops vs snapshot** - Has the data to make efficient choice
7. **`has_unpushed` flag is critical** - Must send ops if client has local changes to merge
8. **Flush on visibility change** - Don't lose data when user switches tabs

## Conflict Resolution

Loro CRDT handles conflicts automatically:

- Last-Write-Wins for scalar values (same field edited by two users)
- Set union for arrays (tags added by two users = both tags present)
- No conflicts for independent edits (different fields)

## Error Handling

```typescript
syncManager.on("error", (error) => {
  if (error.code === "DISCONNECTED") {
    // Show offline indicator, continue local-only
  } else if (error.code === "DECRYPT_FAILED") {
    // Key mismatch - re-fetch wrapped key
  } else if (error.code === "PUSH_FAILED") {
    // Keep in pending queue, retry with backoff
  }
});
```

## Presence Tracking

Track which users are online and what they're viewing/editing:

```typescript
interface VaultPresence {
  ordinal: string;
  joinedAt: string;
  lastSeen: string;
  isOnline: boolean;
  focusedTransactionId?: string;
  editingField?: string;
}
```
