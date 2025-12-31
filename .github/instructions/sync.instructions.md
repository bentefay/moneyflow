---
applyTo: "src/lib/sync/**"
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

- **Saved** ✓ - All local ops pushed to server
- **Saving...** - Pending ops in throttle buffer
- **Offline** - Can't reach server, continuing local-only

**Tab Close Warning:** `beforeunload` confirmation if unpushed ops exist.

### Key Implementation Details

- **loro-mirror auto-commits** on `setState()` - no manual commit debouncing needed
- **`subscribeLocalUpdates`** fires after each commit with binary update bytes
- **`has_unpushed` flag is critical** - server must send ops (not snapshot) if client has local changes to merge
- **Use `lodash-es` throttle** - don't roll custom timing utilities
- **Version vector stored plaintext** - enables server-side filtering without decryption

---

## Architecture Overview

```
                          ┌─────────────────────────────────────────┐
                          │              Server (Supabase)          │
                          │  ┌─────────────┐  ┌─────────────────┐   │
                          │  │ vault_ops   │  │ vault_snapshots │   │
                          │  │ (forever)   │  │ (latest only)   │   │
                          │  └─────────────┘  └─────────────────┘   │
                          └──────────┬────────────────┬─────────────┘
                                     │                │
                          ┌──────────▼────────────────▼─────────────┐
                          │            Supabase Realtime            │
                          └──────────┬────────────────┬─────────────┘
                                     │                │
              ┌──────────────────────▼──┐          ┌──▼──────────────────────┐
              │        Client A         │          │        Client B         │
              │  ┌───────────────────┐  │          │  ┌───────────────────┐  │
              │  │    IndexedDB      │  │          │  │    IndexedDB      │  │
              │  │  (local cache)    │  │          │  │  (local cache)    │  │
              │  │  - ops (pushed?)  │  │          │  │  - ops (pushed?)  │  │
              │  │  - snapshot       │  │          │  │  - snapshot       │  │
              │  └───────────────────┘  │          │  └───────────────────┘  │
              │           │             │          │           │             │
              │  ┌────────▼──────────┐  │          │  ┌────────▼──────────┐  │
              │  │    LoroDoc +      │  │          │  │    LoroDoc +      │  │
              │  │    loro-mirror    │  │          │  │    loro-mirror    │  │
              │  └───────────────────┘  │          │  └───────────────────┘  │
              └─────────────────────────┘          └─────────────────────────┘
```

## Storage Schema

### Server Tables

| Table             | Purpose                           | Key Fields                                                                             |
| ----------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `vault_ops`       | ALL operations forever            | `vault_id`, `version_vector` (plaintext), `encrypted_data`, `created_at` (server time) |
| `vault_snapshots` | Latest shallow snapshot per vault | `vault_id`, `version_vector` (plaintext), `encrypted_snapshot`, `updated_at`           |

### Client IndexedDB

Mirrors server structure with additional local tracking:

```typescript
interface LocalOp {
  id: string;
  vault_id: string;
  version_vector: string; // Plaintext for filtering
  encrypted_data: string;
  pushed: boolean; // Has this been sent to server?
  created_at: number; // Local timestamp
}

interface LocalSnapshot {
  vault_id: string;
  version_vector: string;
  encrypted_data: string;
  updated_at: number;
}
```

## Key Files

- `manager.ts` - SyncManager class coordinating sync operations
- `persistence.ts` - IndexedDB read/write operations
- `presence.ts` - User presence tracking (who's online, what they're editing)
- `index.ts` - Public API exports

## Persistence Flow

### Local Changes

```typescript
import { throttle } from "lodash-es";

// loro-mirror auto-commits on setState()
// subscribeLocalUpdates fires after each commit

let pendingServerOps: Uint8Array[] = [];

const flushToServer = throttle(
  async () => {
    if (pendingServerOps.length === 0) return;
    const merged = mergeUpdates(pendingServerOps);
    pendingServerOps = [];
    await pushToServer(merged);
    // Mark ops as pushed in IndexedDB
  },
  2000,
  { trailing: true }
);

doc.subscribeLocalUpdates((update) => {
  // 1. Immediate IndexedDB write (crash safety)
  await appendToIndexedDB(update, { pushed: false });

  // 2. Accumulate for throttled server push
  pendingServerOps.push(update);
  flushToServer();
});

// Flush on visibility change / beforeunload
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushToServer.flush();
  }
});

window.addEventListener("beforeunload", (e) => {
  if (pendingServerOps.length > 0) {
    e.preventDefault();
    flushToServer.flush();
  }
});
```

### Cold Start

```typescript
async function coldStart(vaultId: string): Promise<LoroDoc> {
  // 1. Load local snapshot → app immediately usable
  const localSnapshot = await loadLocalSnapshot(vaultId);
  const doc = new LoroDoc();

  if (localSnapshot) {
    doc.import(decrypt(localSnapshot.encrypted_data));
  }

  // 2. Return doc immediately, sync in background
  backgroundSync(doc, vaultId);
  return doc;
}

async function backgroundSync(doc: LoroDoc, vaultId: string) {
  const localVersion = doc.version();
  const hasUnpushed = await hasUnpushedOps(vaultId);

  // 3. Ask server what to do
  const response = await trpc.sync.getUpdates({
    vault_id: vaultId,
    version_vector: encodeVersion(localVersion),
    has_unpushed: hasUnpushed,
  });

  if (response.type === "use_snapshot") {
    // Server says: too many ops, just use fresh snapshot
    const snapshot = await trpc.sync.getSnapshot({ vault_id: vaultId });
    doc.import(decrypt(snapshot.encrypted_data));
    await saveLocalSnapshot(vaultId, snapshot);
  } else {
    // Apply ops incrementally
    for (const op of response.ops) {
      doc.import(decrypt(op.encrypted_data));
    }
  }

  // 4. Push any local unpushed ops
  if (hasUnpushed) {
    const unpushed = await getUnpushedOps(vaultId);
    await pushToServer(mergeUpdates(unpushed));
    await markOpsPushed(unpushed);
  }
}
```

### Server Decision Logic

```typescript
// Server-side (tRPC router)
async function getUpdates({ vault_id, version_vector, has_unpushed }) {
  const stats = await db.query(
    `
    SELECT COUNT(*) as count, SUM(LENGTH(encrypted_data)) as bytes
    FROM vault_ops
    WHERE vault_id = $1 AND version > $2
  `,
    [vault_id, version_vector]
  );

  const OP_COUNT_THRESHOLD = 500;
  const BYTES_THRESHOLD = 500_000; // 500KB

  if (!has_unpushed && (stats.count > OP_COUNT_THRESHOLD || stats.bytes > BYTES_THRESHOLD)) {
    return { type: "use_snapshot", snapshot_version: latestSnapshotVersion };
  }

  const ops = await db.query(
    `
    SELECT * FROM vault_ops
    WHERE vault_id = $1 AND version > $2
    ORDER BY created_at
  `,
    [vault_id, version_vector]
  );

  return { type: "ops", ops };
}
```

### Snapshot Refresh

Checked on op insert:

```typescript
async function maybeRefreshSnapshot(vaultId: string) {
  const stats = await db.query(
    `
    SELECT 
      COUNT(*) as ops_since_snapshot,
      SUM(LENGTH(encrypted_data)) as bytes_since_snapshot
    FROM vault_ops
    WHERE vault_id = $1 AND created_at > (
      SELECT updated_at FROM vault_snapshots WHERE vault_id = $1
    )
  `,
    [vaultId]
  );

  const REFRESH_OP_COUNT = 1000;
  const REFRESH_BYTES = 1_000_000; // 1MB

  if (stats.ops_since_snapshot > REFRESH_OP_COUNT || stats.bytes_since_snapshot > REFRESH_BYTES) {
    await createNewSnapshot(vaultId);
  }
}
```

## Loro Configuration

```typescript
const doc = new LoroDoc();

// Enable timestamp mode for wall-clock ordering
doc.setRecordTimestamp(true);

// Use shallow snapshots (exclude historical ops)
const snapshot = doc.export({ mode: "shallow-snapshot" });
```

## Saving Indicator

Track sync state for UI:

```typescript
type SyncStatus = "saved" | "saving" | "offline";

function getSyncStatus(): SyncStatus {
  if (!navigator.onLine) return "offline";
  if (pendingServerOps.length > 0) return "saving";
  return "saved";
}
```

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

## Testing

Test sync with simulated offline/online transitions:

```typescript
it('persists changes while offline and syncs on reconnect', async () => {
  const manager = new SyncManager({ ... });
  await manager.start();

  // Go offline
  await manager.setOffline(true);

  // Make local changes
  store.setState((s) => { s.accounts.push(newAccount); });

  // Verify in IndexedDB but not pushed
  const localOps = await getLocalOps(vaultId);
  expect(localOps.some(op => !op.pushed)).toBe(true);

  // Go online
  await manager.setOffline(false);
  await waitFor(() => manager.getSyncStatus() === 'saved');

  // Verify all pushed
  const updatedOps = await getLocalOps(vaultId);
  expect(updatedOps.every(op => op.pushed)).toBe(true);
});
```
