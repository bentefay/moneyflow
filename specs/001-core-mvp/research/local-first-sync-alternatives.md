# Local-First Sync Alternatives Research

**Date**: December 2025  
**Context**: MoneyFlow - Financial app requiring client-side encrypted JSON data, real-time multi-user sync, event-sourced data model with CRDTs, offline-first capability, deployed on Next.js/Vercel

---

## Executive Summary

After evaluating 8 sync solutions against MoneyFlow's unique requirements (client-side encryption where server sees only encrypted blobs), the recommended approaches are:

| Rank | Solution                                | Verdict                                                     |
| ---- | --------------------------------------- | ----------------------------------------------------------- |
| 🥇   | **Simple Custom (Supabase + Realtime)** | Best fit - full encryption control, simple architecture     |
| 🥈   | **PowerSync**                           | Strong alternative - proven E2EE support, excellent offline |
| 🥉   | **Yjs with custom storage**             | Good for CRDT needs - but more complex setup                |

**Key Finding**: Most sync solutions assume the server needs to read/query data. MoneyFlow's encrypted blob model means simpler solutions often work better.

---

## Requirements Checklist

| Requirement                                     | Priority    |
| ----------------------------------------------- | ----------- |
| Client-side encryption (server sees only blobs) | 🔴 Critical |
| Real-time sync between multiple users           | 🔴 Critical |
| Offline-first capability                        | 🔴 Critical |
| Event-sourced data model                        | 🟡 High     |
| CRDT conflict resolution                        | 🟡 High     |
| Next.js/Vercel deployment                       | 🟢 Medium   |
| Low complexity                                  | 🟢 Medium   |
| Cost-effective                                  | 🟢 Medium   |

---

## Comparison Table

| Technology                 | Real-time Sync               | Encryption Compatible               | Offline Support | Production Ready    | Complexity | Cost                  | Recommendation            |
| -------------------------- | ---------------------------- | ----------------------------------- | --------------- | ------------------- | ---------- | --------------------- | ------------------------- |
| **Vercel Blob + Polling**  | ❌ No native (60s cache min) | ✅ Perfect (blob storage)           | ⚠️ Manual       | ✅ Yes              | 🟢 Low     | $0.15/GB storage      | ❌ Not suitable           |
| **Supabase Realtime Only** | ✅ WebSocket broadcast       | ✅ Perfect (encrypted JSON columns) | ⚠️ Manual       | ✅ Yes              | 🟢 Low     | Free tier generous    | ✅ **Recommended**        |
| **Yjs/Automerge CRDTs**    | ✅ Via providers             | ⚠️ Possible (wrap updates)          | ✅ Built-in     | ✅ Yes              | 🟡 Medium  | Self-host or provider | ✅ Good option            |
| **PowerSync**              | ✅ Real-time streaming       | ✅ Documented E2EE support          | ✅ Excellent    | ✅ Yes              | 🟡 Medium  | Free-$49+/mo          | ✅ **Strong alternative** |
| **Zero (zero.ms)**         | ✅ Automatic                 | ❌ No (needs data access)           | ✅ Built-in     | ⚠️ Alpha            | 🟢 Low     | Free (open source)    | ❌ Not suitable           |
| **Replicache**             | ✅ Push/pull sync            | ⚠️ Possible (opaque blobs)          | ✅ Built-in     | ⚠️ Maintenance mode | 🟡 Medium  | Free (deprecated)     | ⚠️ Migration needed       |
| **Liveblocks**             | ✅ WebSocket rooms           | ❌ No (needs data access)           | ⚠️ Limited      | ✅ Yes              | 🟢 Low     | Free-$99+/mo          | ❌ Not suitable           |
| **Custom Event Log**       | ✅ Via Supabase/WebSocket    | ✅ Perfect (full control)           | ⚠️ Manual       | ✅ DIY              | 🟡 Medium  | Supabase costs only   | ✅ **Recommended**        |

---

## Detailed Analysis

### 1. Vercel Blob Storage + Polling

**What it is**: Simple file/blob storage on Vercel's infrastructure, backed by AWS S3.

**How real-time sync would work**:

- Store encrypted vault state as JSON blobs
- Poll for changes (minimum 60 second cache)
- No native real-time notifications

**Encryption Compatibility**: ✅ **Perfect**

- Store any encrypted blob, server never reads content
- Pure storage - no data interpretation needed

**Limitations**:

```
❌ No real-time sync (minimum 60s cache delay)
❌ No WebSocket support - polling only
❌ No conflict resolution
❌ Race conditions when multiple users edit simultaneously
```

**Verdict**: ❌ **Not suitable** - The 60-second minimum cache and lack of real-time makes this unworkable for collaborative editing.

---

### 2. Supabase Realtime Only (Without ElectricSQL)

**What it is**: Supabase's WebSocket-based realtime system for broadcasting messages and database changes.

**Components**:

- **Broadcast**: Send arbitrary messages to channel subscribers
- **Presence**: Track online users
- **Postgres Changes**: Stream database row changes

**How it works for MoneyFlow**:

```typescript
// Store encrypted events in Postgres
CREATE TABLE encrypted_events (
  id UUID PRIMARY KEY,
  vault_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  ciphertext TEXT NOT NULL,  -- Encrypted JSON
  iv TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  client_id TEXT NOT NULL    -- For CRDT ordering
);

// Subscribe to changes
const channel = supabase
  .channel('vault:' + vaultId)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'encrypted_events', filter: `vault_id=eq.${vaultId}` },
    (payload) => {
      // Decrypt and apply event locally
      const event = await decrypt(payload.new.ciphertext, payload.new.iv);
      applyEvent(event);
    }
  )
  .subscribe();
```

**Encryption Compatibility**: ✅ **Perfect**

- Server stores encrypted blobs, never reads content
- Row-level security controls access to vault's events
- Client handles all encryption/decryption

**Offline Support**: ⚠️ **Manual implementation required**

- Need to implement local event queue (IndexedDB)
- Sync pending events when reconnecting
- Track last sync timestamp for catch-up

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│ Client (Browser)                                        │
├─────────────────────────────────────────────────────────┤
│ 1. Local event store (IndexedDB)                        │
│ 2. Encrypt events before sending                        │
│ 3. Decrypt events on receive                            │
│ 4. Apply CRDT merge logic                               │
│ 5. Materialize views from events                        │
└─────────────────────────────────────────────────────────┘
                        │ WebSocket
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase                                                │
├─────────────────────────────────────────────────────────┤
│ Postgres: encrypted_events table                        │
│ Realtime: broadcasts changes to subscribers             │
│ RLS: vault access control                               │
└─────────────────────────────────────────────────────────┘
```

**Pros**:

- Simple architecture
- Full control over encryption
- Generous free tier (500MB database, 2GB bandwidth)
- Battle-tested realtime infrastructure
- Perfect for event sourcing pattern

**Cons**:

- Must implement offline queue manually
- Must implement CRDT logic yourself
- No built-in conflict resolution

**Cost**:

- Free tier: 500MB DB, 2GB realtime bandwidth
- Pro: $25/mo for 8GB DB, 50GB bandwidth

**Verdict**: ✅ **Recommended** - Best balance of simplicity, encryption compatibility, and features for MoneyFlow's architecture.

---

### 3. Yjs/Automerge CRDTs

**What they are**: JavaScript CRDT libraries for building collaborative applications.

**Yjs**:

- Modular CRDT implementation (~40KB)
- Network-agnostic (works with any transport)
- Excellent for text collaboration
- Shared types: Y.Map, Y.Array, Y.Text

**Automerge**:

- JSON-like CRDT documents (~200KB)
- Supports nested data structures
- Change-based sync (good for event sourcing)
- TypeScript support

**Encryption Compatibility**: ⚠️ **Possible but complex**

```typescript
// Yjs approach: Encrypt update messages
import * as Y from "yjs";

const ydoc = new Y.Doc();

// Intercept updates and encrypt
ydoc.on("update", async (update: Uint8Array) => {
  const encrypted = await encrypt(update, vaultKey);
  await sendToServer(encrypted);
});

// Receive and decrypt
async function onServerMessage(encrypted: EncryptedPayload) {
  const update = await decrypt(encrypted, vaultKey);
  Y.applyUpdate(ydoc, update);
}
```

**Challenges with encryption**:

1. Binary updates must be encrypted/decrypted as blobs
2. Server cannot see document structure
3. Works well for MoneyFlow since server shouldn't see content anyway
4. Awareness features (cursors, presence) may leak information

**Automerge approach**:

```typescript
import * as Automerge from "@automerge/automerge";

// Each change can be encrypted separately
let doc = Automerge.init<VaultState>();

doc = Automerge.change(doc, "Add transaction", (d) => {
  d.transactions.push(newTransaction);
});

// Get changes since last sync
const changes = Automerge.getChanges(oldDoc, doc);
const encrypted = await encrypt(changes, vaultKey);
await sendToServer(encrypted);
```

**Network Providers**:

- y-websocket: Self-hosted WebSocket server
- y-webrtc: Peer-to-peer (no server needed!)
- y-indexeddb: Local persistence
- Liveblocks: Managed Yjs hosting
- Hocuspocus: Self-hosted with features

**Offline Support**: ✅ **Excellent**

- CRDTs handle concurrent edits naturally
- y-indexeddb provides local persistence
- Automatic merge on reconnection

**Verdict for MoneyFlow**:

- **Yjs**: Good if you need real-time text collaboration (e.g., notes feature)
- **Automerge**: Good for complex nested documents
- **For basic financial data**: Custom CRDTs are simpler (as per your CRDT research)

**Verdict**: ✅ **Good option** - Consider if you need more complex CRDT semantics than LWW. Overkill for simple financial records.

---

### 4. PowerSync

**What it is**: A sync engine that replicates Postgres/MySQL/MongoDB to client-side SQLite, with real-time streaming.

**How it works**:

```
Backend DB → PowerSync Service → SQLite (client) → Your App
```

**Key Features**:

- Real-time streaming sync
- Partial replication via "Sync Rules"
- Client-side SQLite with full query capabilities
- Offline-first with persistent local storage
- Automatic conflict resolution

**Encryption Compatibility**: ✅ **Documented E2EE support**

PowerSync explicitly supports end-to-end encryption:

```typescript
// Store encrypted data in Postgres
CREATE TABLE encrypted_vaults (
  id UUID PRIMARY KEY,
  vault_id UUID NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TIMESTAMPTZ
);

// Sync Rules - sync encrypted blobs by vault_id
sync_rules:
  - table: encrypted_vaults
    filter: vault_id IN (SELECT vault_id FROM user_vaults WHERE user_id = :user_id)
```

PowerSync provides two approaches:

1. **Encrypt columns**: Sync encrypted blobs, decrypt in-memory
2. **Local-only tables**: Store decrypted data in separate local-only SQLite tables

Example from PowerSync E2EE chat app:

```typescript
// Encrypted data syncs to SQLite
// Decrypt to local-only table for querying
const decrypted = await decrypt(row.ciphertext, vaultKey);
await db.execute("INSERT INTO local_messages (id, content) VALUES (?, ?)", [row.id, decrypted]);
```

**Offline Support**: ✅ **Excellent**

- SQLite persists locally
- Upload queue for offline writes
- Automatic sync on reconnection

**Production Readiness**: ✅ **Yes**

- SOC 2 Type 2 audited
- HIPAA compliant
- Used by enterprise customers (Halliburton, Cofactr)

**Complexity**: 🟡 **Medium**

- Requires PowerSync Service (cloud or self-hosted)
- Learning curve for Sync Rules
- More moving parts than simple Supabase

**Cost**:

- Free: 2GB sync/month, 500MB storage, 50 connections
- Pro: $49/mo for 30GB sync, 10GB storage, 1000 connections
- Self-hosted: Open source

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│ Client                                                  │
├─────────────────────────────────────────────────────────┤
│ SQLite (PowerSync managed)                              │
│ ├── Synced tables (encrypted blobs)                     │
│ └── Local-only tables (decrypted data)                  │
├─────────────────────────────────────────────────────────┤
│ PowerSync SDK                                           │
│ └── Handles sync, offline queue, conflict resolution    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ PowerSync Service                                       │
│ └── Manages replication, streaming, Sync Rules          │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase/Postgres                                       │
│ └── encrypted_events table                              │
└─────────────────────────────────────────────────────────┘
```

**Verdict**: ✅ **Strong alternative** - Excellent choice if you want a more batteries-included solution with proven E2EE support.

---

### 5. Zero (zero.rocicorp.dev)

**What it is**: A sync engine from Rocicorp (makers of Replicache) that distributes queries to the client with automatic caching and syncing.

**How it works**:

```typescript
// Write queries that feel like accessing local data
const [playlist] = useQuery(
  zero.query.playlist
    .related("tracks", (track) => track.related("album").related("artist"))
    .where("id", id)
    .one()
);
```

**Key Features**:

- Query results sync to client-side persistent cache
- Automatic reactivity - updates flow to all clients
- Works with any Postgres database
- Dramatically simpler than traditional API development

**Encryption Compatibility**: ❌ **Not suitable**

Zero's architecture fundamentally requires server-side data access:

- Queries are executed on the server
- Data is cached and synced based on query results
- The sync engine needs to understand data structure for efficient syncing
- **Cannot work with opaque encrypted blobs**

**Offline Support**: ✅ **Built-in**

- Client-side persistent cache
- Automatic sync on reconnection

**Production Readiness**: ⚠️ **Alpha**

- Currently in public alpha
- Self-deployment required
- Active development, may have breaking changes

**Verdict**: ❌ **Not suitable** - Zero's query-based architecture requires the server to read and understand data, making it incompatible with client-side-only encryption.

---

### 6. Replicache

**What it is**: A client-side sync framework for building realtime, collaborative web apps with zero-latency UI.

**Status**: ⚠️ **Maintenance mode**

- After 5 years, now open-sourced and free
- No longer charging for use
- Team focused on Zero instead
- Will continue support but no new features

**How it works**:

```typescript
// Mutations are applied locally first, then synced
const rep = new Replicache({
  name: "user123",
  mutators: {
    async createTransaction(tx, args) {
      await tx.put(`tx/${args.id}`, args);
    },
  },
  push: async (mutations) => {
    // Send mutations to your backend
  },
  pull: async () => {
    // Fetch latest state from backend
  },
});
```

**Encryption Compatibility**: ⚠️ **Possible with workarounds**

- Can store encrypted blobs as mutation data
- Push/pull handlers can encrypt/decrypt
- Not a natural fit - designed for structured data

**Offline Support**: ✅ **Excellent**

- Persistent local storage
- Mutations queued during offline
- Automatic sync on reconnection

**Verdict**: ⚠️ **Viable but deprecated** - Works for encrypted data but migration to Zero is recommended. However, Zero doesn't support encryption, so this is a dead-end path.

---

### 7. Liveblocks

**What it is**: A collaboration platform providing presence, storage, and realtime features for building apps like Figma/Notion.

**Key Features**:

- Real-time presence (cursors, avatars)
- Collaborative storage (Conflict-free)
- Comments and notifications
- Pre-built React components

**How it works**:

```typescript
// Create a room for collaboration
const room = client.enter("vault-123");

// Use presence for showing who's online
room.updatePresence({ cursor: { x: 100, y: 200 } });

// Use storage for shared state
const storage = room.getStorage();
const transactions = storage.root.get("transactions");
```

**Encryption Compatibility**: ❌ **Not suitable**

Liveblocks needs to understand data for:

- Conflict resolution in storage
- Comments and mentions features
- AI copilot features
- Broadcasting presence correctly

The platform explicitly processes data on their servers for features to work.

**Offline Support**: ⚠️ **Limited**

- Presence requires connection
- Storage has some offline tolerance
- Not designed for extended offline use

**Production Readiness**: ✅ **Yes**

- SOC 2 compliant
- HIPAA compliant
- Used by major companies

**Cost**:

- Free: 1,000 MAU
- Starter: $99/mo
- Pro: Custom pricing

**Verdict**: ❌ **Not suitable** - Liveblocks is designed for collaborative features where the server understands the data. Not compatible with encrypted blob storage.

---

### 8. Simple Custom Approach (Event Log)

**What it is**: Build your own sync using Supabase/Postgres for storage, WebSocket for notifications, and IndexedDB for offline.

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│ Client                                                  │
├─────────────────────────────────────────────────────────┤
│ 1. IndexedDB: Local event store + pending queue         │
│ 2. Custom sync logic: push pending, pull missing        │
│ 3. Encryption layer: all events encrypted before send   │
│ 4. CRDT merge: apply events in correct order            │
│ 5. Materialized views: compute state from events        │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   WebSocket      HTTP REST        Supabase
  (notifications) (sync API)      (storage)
```

**Implementation sketch**:

```typescript
// Event storage schema
CREATE TABLE vault_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES vaults(id),
  sequence BIGINT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  client_id UUID NOT NULL,
  UNIQUE(vault_id, sequence)
);

// Client sync logic
class VaultSync {
  private localDb: IDBDatabase;
  private supabase: SupabaseClient;

  async sync(vaultId: string) {
    // 1. Push pending local events
    const pending = await this.getPendingEvents(vaultId);
    for (const event of pending) {
      await this.pushEvent(vaultId, event);
    }

    // 2. Pull remote events since last sync
    const lastSeq = await this.getLastSyncSequence(vaultId);
    const remote = await this.pullEvents(vaultId, lastSeq);

    // 3. Decrypt and apply
    for (const encrypted of remote) {
      const event = await this.decrypt(encrypted);
      await this.applyEvent(vaultId, event);
    }
  }

  subscribeToChanges(vaultId: string) {
    return this.supabase
      .channel(`vault:${vaultId}`)
      .on('postgres_changes',
        { event: 'INSERT', table: 'vault_events', filter: `vault_id=eq.${vaultId}` },
        (payload) => this.onRemoteEvent(payload)
      )
      .subscribe();
  }
}
```

**Encryption Compatibility**: ✅ **Perfect**

- You control everything
- Server only sees encrypted blobs
- No framework constraints

**Offline Support**: ⚠️ **Manual but straightforward**

- IndexedDB for local storage
- Pending queue for offline writes
- Sync on reconnection

**Production Readiness**: ✅ **DIY**

- Depends on your implementation
- Based on battle-tested primitives (Postgres, IndexedDB)

**Complexity**: 🟡 **Medium**

- ~500-1000 lines of sync logic
- Need to handle edge cases (conflicts, ordering)
- More control = more responsibility

**Pros**:

- Perfect encryption fit
- No vendor lock-in
- Full control over sync behavior
- Fits event sourcing naturally

**Cons**:

- Must handle edge cases yourself
- No pre-built offline queue
- Testing burden is on you

**Verdict**: ✅ **Recommended** - For MoneyFlow's specific requirements (encrypted events, CRDT merge, event sourcing), a custom implementation using Supabase primitives offers the best fit.

---

## Recommendation for MoneyFlow

### Primary Recommendation: Custom Event Log with Supabase Realtime

**Why**:

1. **Perfect encryption fit**: Server stores only encrypted blobs
2. **Event sourcing native**: Event log is the natural data structure
3. **CRDT integration**: Custom LWW/OR-Set CRDTs (from your CRDT research) fit naturally
4. **Simple architecture**: Postgres + Realtime + IndexedDB
5. **Cost effective**: Supabase free tier is generous
6. **Vercel compatible**: Works perfectly with Next.js on Vercel

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│ Next.js Client                                          │
├─────────────────────────────────────────────────────────┤
│ IndexedDB                                               │
│ ├── Encrypted events (local cache)                      │
│ ├── Pending events queue                                │
│ └── Materialized state                                  │
├─────────────────────────────────────────────────────────┤
│ Sync Service                                            │
│ ├── Push pending events → Supabase                      │
│ ├── Pull missing events ← Supabase                      │
│ └── WebSocket subscription for real-time                │
├─────────────────────────────────────────────────────────┤
│ Encryption Layer                                        │
│ ├── Encrypt events before send                          │
│ └── Decrypt events on receive                           │
├─────────────────────────────────────────────────────────┤
│ CRDT Layer                                              │
│ ├── LWW-Map for entities                                │
│ ├── OR-Set for collections                              │
│ └── Merge logic for conflicts                           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase                                                │
├─────────────────────────────────────────────────────────┤
│ Postgres: vault_events (encrypted blobs)                │
│ Realtime: WebSocket notifications                       │
│ Auth: User authentication                               │
│ RLS: Row-level security for vault access                │
└─────────────────────────────────────────────────────────┘
```

### Alternative: PowerSync (if you want batteries-included)

**When to choose PowerSync**:

- Want proven E2EE implementation
- Need SQLite query capabilities on client
- Prefer managed sync infrastructure
- Budget for $49+/month

### Not Recommended

| Solution    | Why Not                                                             |
| ----------- | ------------------------------------------------------------------- |
| Vercel Blob | No real-time sync (60s minimum cache)                               |
| Zero        | Server must read data (no E2EE possible)                            |
| Liveblocks  | Server processes data (no E2EE possible)                            |
| Replicache  | Maintenance mode, migration path leads to Zero (which doesn't work) |

---

## Implementation Checklist

If proceeding with Custom Event Log + Supabase:

- [ ] Set up Supabase project with vault_events table
- [ ] Implement encryption service (Web Crypto API)
- [ ] Implement IndexedDB storage for local events
- [ ] Implement sync service (push/pull/subscribe)
- [ ] Implement CRDT merge logic (LWW-Map, OR-Set)
- [ ] Implement materialized view computation
- [ ] Add offline detection and queue management
- [ ] Add conflict resolution UI (if needed)
- [ ] Load test with multiple concurrent users
- [ ] Implement event compaction for large vaults

---

## References

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PowerSync E2EE Example](https://github.com/powersync-community/react-supabase-chat-e2ee)
- [PowerSync Data Encryption Docs](https://docs.powersync.com/usage/use-case-examples/data-encryption)
- [Yjs Documentation](https://docs.yjs.dev/)
- [Automerge Documentation](https://automerge.org/docs/)
- [Zero Documentation](https://zero.rocicorp.dev/docs)
- [Replicache (Deprecated)](https://replicache.dev/)
- [Liveblocks Concepts](https://liveblocks.io/docs/concepts)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
