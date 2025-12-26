---
applyTo: "src/lib/sync/**"
---

# Sync Module Guidelines

Real-time synchronization between clients using Supabase Realtime and Loro CRDT.

## Architecture Overview

```
Client A                    Supabase                    Client B
   │                           │                           │
   │──── Local Loro Edit ────▶│                           │
   │                           │                           │
   │──── Encrypt Update ─────▶│                           │
   │                           │                           │
   │──── Broadcast ──────────▶│──── Broadcast ──────────▶│
   │                           │                           │
   │                           │◀──── Acknowledge ────────│
   │                           │                           │
   │                           │                           │──── Decrypt Update
   │                           │                           │
   │                           │                           │──── Apply to Loro Doc
```

## Key Files

- `manager.ts` - SyncManager class coordinating sync operations
- `presence.ts` - User presence tracking (who's online, what they're editing)
- `index.ts` - Public API exports

## SyncManager

The SyncManager handles:
1. Subscribing to Supabase Realtime channels
2. Encrypting/decrypting CRDT updates
3. Broadcasting local changes
4. Applying remote changes
5. Snapshot management

```typescript
const syncManager = new SyncManager({
  vaultId: "vault-123",
  doc: loroDoc,
  vaultKey: decryptedVaultKey,
  trpc: trpcClient,
});

await syncManager.start();
// ... make local changes, they auto-sync
await syncManager.stop();
```

## Presence Tracking

Track which users are online and what they're viewing/editing:

```typescript
interface VaultPresence {
  odinal: string;
  joinedAt: string;
  lastSeen: string;
  isOnline: boolean;
  // Optional: what transaction/field they're editing
  focusedTransactionId?: string;
  editingField?: string;
}
```

## Critical Rules

1. **Encrypt before broadcast** - Never send plaintext over Realtime
2. **Verify signatures** - Each update must be signed by author
3. **Handle offline** - Queue updates when offline, sync when back
4. **Idempotent applies** - Same update applied twice = no change (CRDT property)
5. **Order by HLC** - Use Hybrid Logical Clocks for causality

## HLC (Hybrid Logical Clock)

Each update has an HLC timestamp for ordering:

```typescript
interface HLCTimestamp {
  wallTime: number;  // Unix timestamp
  logical: number;   // Logical counter
  nodeId: string;    // Unique node identifier
}
```

## Conflict Resolution

Loro CRDT handles conflicts automatically:
- Last-Write-Wins for scalar values (same field edited by two users)
- Set union for arrays (tags added by two users = both tags present)
- No conflicts for independent edits (different fields)

## Error Handling

```typescript
syncManager.on("error", (error) => {
  if (error.code === "DISCONNECTED") {
    // Show offline indicator
  } else if (error.code === "DECRYPT_FAILED") {
    // Key mismatch - re-fetch wrapped key
  } else if (error.code === "VERSION_MISMATCH") {
    // Need to re-sync from snapshot
  }
});
```

## Testing

Test sync with two simulated clients:

```typescript
it("syncs changes between clients", async () => {
  const clientA = new SyncManager({ ... });
  const clientB = new SyncManager({ ... });
  
  await clientA.start();
  await clientB.start();
  
  // Client A makes a change
  clientA.doc.getMap("transactions").set("tx1", { amount: 100 });
  
  // Wait for sync
  await waitFor(() => {
    const tx = clientB.doc.getMap("transactions").get("tx1");
    expect(tx?.amount).toBe(100);
  });
});
```
