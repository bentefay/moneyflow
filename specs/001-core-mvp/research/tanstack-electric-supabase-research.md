# TanStack DB + ElectricSQL + Supabase Research

**Date**: December 2025  
**Context**: Evaluating sync stack for MoneyFlow local-first financial app with client-side encryption

---

## Executive Summary

This stack is **partially viable** for MoneyFlow's encrypted local-first sync use case, but requires careful architectural decisions around encryption and conflict handling.

| Component   | Production Ready  | Encryption Compatible |
| ----------- | ----------------- | --------------------- |
| TanStack DB | ⚠️ BETA           | ✅ Yes (at app layer) |
| ElectricSQL | ✅ Yes (v1.0+ GA) | ✅ Yes (documented)   |
| Supabase    | ✅ Yes            | ✅ Yes                |

---

## 1. What is TanStack DB?

### Overview

TanStack DB is a **reactive client-first store** for building fast, modern web/mobile apps. It extends TanStack Query with:

- **Collections**: Typed sets of objects populated via sync/fetch
- **Live Queries**: Sub-millisecond reactive queries using differential dataflow (d2ts)
- **Optimistic Mutations**: Transactional local writes with automatic rollback

### Key Features

- Normalized data storage avoiding endpoint sprawl
- Cross-collection joins in the client
- Framework adapters (React, etc.)
- Works with multiple data sources (REST APIs, sync engines)

### Production Readiness

- **Status**: BETA (as of December 2025)
- **Version**: 0.2.x
- **GitHub Stars**: ~3,500
- **Contributors**: 58
- **Maturity**: Young project, actively developed, API may change

### What It Does NOT Do

- NOT a database - it's an in-memory reactive store
- Does NOT handle persistence directly (relies on sync engines or APIs)
- Does NOT implement CRDTs natively (relies on backend/sync layer)

---

## 2. What is ElectricSQL?

### Overview

ElectricSQL is a **Postgres sync engine** that handles:

- **Partial replication** via "Shapes" (filtered table subsets)
- **Fan-out** to millions of concurrent clients via CDN
- **Real-time data delivery** from Postgres to clients

### How It Works

```
Postgres → Electric Sync Service → HTTP/JSON → Client
```

1. Electric connects to Postgres via logical replication
2. Clients subscribe to "Shapes" (filtered views on tables)
3. Changes stream in real-time to all subscribed clients
4. Electric handles the complexity of partial replication

### Key Features

- **Shapes**: Define what data to sync per client
  ```typescript
  const stream = new ShapeStream({
    url: "http://electric:3000/v1/shape",
    params: {
      table: "todos",
      where: `user_id = '${userId}'`,
    },
  });
  ```
- **Read-path sync only**: Electric syncs FROM Postgres TO clients
- **Writes handled separately**: Via your API, not Electric
- **Scales to millions**: Uses CDN infrastructure for fan-out

### Production Readiness

- **Status**: GA (v1.0+ released March 2025)
- **Stability**: Stable APIs with no breaking changes policy
- **Production Users**: Trigger.dev, Otto, IP.world (millions of updates/day)
- **Tested**: Antithesis testing, 200+ bug-fix PRs post-1.0

---

## 3. How They Work Together

### Architecture Stack

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT                               │
├─────────────────────────────────────────────────────────┤
│  TanStack DB (Reactive Store)                           │
│  ├── Collections (data containers)                      │
│  ├── Live Queries (reactive reads)                      │
│  └── Optimistic Mutations (local writes)                │
├─────────────────────────────────────────────────────────┤
│  Electric Collection Adapter                             │
│  └── Syncs data into TanStack DB collections            │
├─────────────────────────────────────────────────────────┤
│  Electric Client                                         │
│  └── HTTP streaming from Electric service               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     SERVER                               │
├─────────────────────────────────────────────────────────┤
│  Electric Sync Service                                   │
│  └── Postgres logical replication → Shape streams       │
├─────────────────────────────────────────────────────────┤
│  Supabase Postgres                                       │
│  └── Primary database with logical replication enabled  │
├─────────────────────────────────────────────────────────┤
│  Your API (for writes)                                   │
│  └── Handles mutations, validation, business logic      │
└─────────────────────────────────────────────────────────┘
```

### Code Example

```typescript
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";

// Create a collection synced via Electric
const vaultCollection = createCollection(
  electricCollectionOptions({
    id: "vaults",
    shapeOptions: {
      url: "https://electric.your-app.com/v1/shape",
      params: {
        table: "vaults",
        where: `user_id = '${userId}'`,
      },
    },
    getKey: (item) => item.id,
    schema: vaultSchema,
    onInsert: async ({ transaction }) => {
      // Handle write via your API
      await api.vaults.create(transaction.mutations[0].changes);
    },
  })
);

// Use in components with live queries
const { data } = useLiveQuery((q) =>
  q.from({ vault: vaultCollection }).where(({ vault }) => eq(vault.active, true))
);
```

---

## 4. Encryption Support

### ✅ Client-Side Encryption IS Supported

Electric explicitly documents end-to-end encryption as a valid pattern:

> "Electric syncs ciphertext as well as it syncs plaintext. You can encrypt and decrypt data in HTTP middleware or in the local client."

### Implementation Pattern

```typescript
// Encrypt before sending to server
async function createEncryptedVault(data: VaultData) {
  const encrypted = await encryptWithKey(JSON.stringify(data), vaultKey);

  await api.vaults.create({
    id: crypto.randomUUID(),
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
  });
}

// Decrypt after receiving from Electric
function useDecryptedVaults() {
  const { data: encryptedVaults } = useShape({
    url: `${ELECTRIC_URL}/v1/shape`,
    params: { table: "encrypted_vaults" },
  });

  const [decryptedVaults, setDecrypted] = useState([]);

  useEffect(() => {
    Promise.all(
      encryptedVaults.map(async (row) => {
        const plaintext = await decryptWithKey(row.ciphertext, row.iv, vaultKey);
        return JSON.parse(plaintext);
      })
    ).then(setDecrypted);
  }, [encryptedVaults]);

  return decryptedVaults;
}
```

### Key Management Considerations

- Electric can sync encryption keys between users via shapes
- You control the key management strategy
- Keys can be stored in a separate secure database

### Schema for Encrypted Data

```sql
CREATE TABLE encrypted_vaults (
  id UUID PRIMARY KEY,
  ciphertext TEXT NOT NULL,     -- Encrypted JSON blob
  iv TEXT NOT NULL,             -- Initialization vector
  vault_id UUID NOT NULL,       -- For access control/filtering
  user_id UUID NOT NULL,        -- Owner
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Limitations for MoneyFlow Use Case

### 🔴 Critical Limitations

#### 1. **No Built-in CRDTs**

- Electric does **read-path sync only**
- CRDT conflict resolution must happen at your API/application layer
- MoneyFlow's event-sourced model needs custom conflict handling

#### 2. **Single-Table Shapes**

- Current limitation: shapes are single-table only
- No include trees for related data
- **Workaround**: Multiple shapes + client-side joins via TanStack DB

#### 3. **TanStack DB is BETA**

- API may change
- Not battle-tested at scale
- Consider risk tolerance for financial app

### 🟡 Moderate Limitations

#### 4. **Write-Path Complexity**

- You must implement your own write-path sync
- Electric does NOT sync writes back to server
- Must handle optimistic state lifecycle manually

#### 5. **Encryption Performance**

- Decrypting large datasets on every sync update has overhead
- Need efficient diffing to avoid re-decrypting unchanged rows

#### 6. **Real-time Multi-User Editing**

- For concurrent edits, you need presence/awareness (not provided)
- Consider adding Yjs or similar for collaborative features

### 🟢 Minor Limitations

#### 7. **IPv6 for Supabase**

- Supabase direct connect requires IPv6 or paid IPv4 add-on
- Electric supports IPv6 configuration

---

## 6. Production Readiness Assessment

| Component          | Status        | Risk Level | Notes                              |
| ------------------ | ------------- | ---------- | ---------------------------------- |
| **ElectricSQL**    | ✅ GA (v1.0+) | Low        | Stable, production-proven          |
| **TanStack DB**    | ⚠️ BETA       | Medium     | Active development, API may change |
| **Supabase**       | ✅ GA         | Low        | Mature platform                    |
| **Combined Stack** | ⚠️            | Medium     | TanStack DB is the risk factor     |

### Recommendation

- **ElectricSQL alone**: Ready for production
- **TanStack DB + Electric**: Suitable for new projects accepting BETA risk
- **For MoneyFlow**: Consider starting with Electric + simpler state management, migrate to TanStack DB when stable

---

## 7. Alternative Considerations

For encrypted, event-sourced, multi-user sync, also evaluate:

| Alternative          | Pros                                 | Cons                        |
| -------------------- | ------------------------------------ | --------------------------- |
| **Yjs + Electric**   | Mature CRDT, real-time collaboration | More complex setup          |
| **PowerSync**        | Built-in offline + sync              | Less flexible than Electric |
| **RxDB**             | Full local-first database            | More complex, heavier       |
| **Custom Event Log** | Full control, fits event-sourcing    | More work to build          |

---

## 8. Recommendations for MoneyFlow

### Architecture Suggestion

```
┌─────────────────────────────────────────────────┐
│ Client                                          │
├─────────────────────────────────────────────────┤
│ 1. Decrypt incoming encrypted events           │
│ 2. Apply to local event log (IndexedDB/PGlite) │
│ 3. Materialize views via TanStack DB/queries   │
│ 4. Encrypt & send new events to API            │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│ Electric Sync Service                           │
│ └── Streams encrypted_events table changes     │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│ Supabase Postgres                               │
│ └── encrypted_events (ciphertext, iv, vault_id)│
└─────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Store encrypted event blobs**, not encrypted domain objects
2. **Server sees only**: event ID, vault ID, timestamps, encrypted blob
3. **Client handles**: decryption, event sourcing, CRDT merge logic
4. **Use Electric for**: efficient sync of encrypted event log
5. **Consider**: Starting simpler, adding TanStack DB as it matures

### Viability Verdict

**✅ VIABLE with caveats:**

- Encryption: Supported and documented
- Sync: Production-ready (Electric 1.0+)
- Client state: BETA risk (TanStack DB)
- CRDTs: You must implement conflict resolution
- Event sourcing: Compatible, but not built-in

The stack works for encrypted local-first sync, but MoneyFlow's CRDT/event-sourcing requirements need custom implementation on top of this infrastructure.

---

## References

- [TanStack DB Docs](https://tanstack.com/db)
- [TanStack DB GitHub](https://github.com/TanStack/db)
- [ElectricSQL Docs](https://electric-sql.com/docs)
- [Electric Security Guide](https://electric-sql.com/docs/guides/security)
- [Electric Encryption Example](https://electric-sql.com/demos/encryption)
- [Electric + Supabase Integration](https://electric-sql.com/docs/integrations/supabase)
- [Electric 1.0 Release](https://electric-sql.com/blog/2025/03/17/electricsql-1.0-released)
