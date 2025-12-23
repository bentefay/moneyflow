# CRDT Research for MoneyFlow

**Date**: 2025-12-23  
**Context**: Event-sourced household expense tracking with multi-user real-time collaboration and client-side encryption

---

## Executive Summary

### Decision: Use Loro CRDT Library

**Primary approach**: Use `loro-crdt` (v1.0+) for all collaborative data. Loro exports opaque binary updates that we encrypt before syncing - the server only sees ciphertext.

**Rationale**:

1. **Production-ready**: Loro 1.0 is stable with 5.2k GitHub stars and active development
2. **Perfect encryption fit**: `doc.export()` returns `Uint8Array` that can be encrypted directly
3. **Updates ARE events**: Loro's update model is functionally equivalent to event sourcing - immutable change sets that can be batched and synced
4. **Rich CRDT types**: LWW-Map, List, MovableList, Tree, Text, Counter - all battle-tested
5. **Built-in features**: Version vectors, time travel, undo/redo, efficient delta sync
6. **Less code to maintain**: 150KB of well-tested algorithms vs. custom implementations with edge cases

**Key insight**: Loro's sync model (`export({mode: "update"})`) produces opaque bytes that function exactly like events. We encrypt these bytes, store them, and sync them. The "event sourcing" happens inside Loro - we don't need to implement it ourselves.

---

## 1. CRDT Types for Financial Data

### Analysis by Entity Type

| Entity                  | Best CRDT Type                   | Rationale                                                                     |
| ----------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| Transaction             | **LWW-Map**                      | Each field (amount, date, merchant) is independently editable; last edit wins |
| Transaction.tags        | **OR-Set** (Observed-Remove Set) | Users can add/remove tags concurrently without losing additions               |
| Transaction.allocations | **LWW-Map**                      | Percentage per person; conflicts should take latest value                     |
| Account                 | **LWW-Map**                      | Simple key-value properties                                                   |
| Account.balance         | **LWW-Register**                 | Single value; latest wins                                                     |
| Person                  | **LWW-Map**                      | Simple key-value properties                                                   |
| Tag                     | **LWW-Map**                      | Properties + parent relationship                                              |
| Status                  | **LWW-Map**                      | Name + behavior flags                                                         |
| Automation              | **LWW-Map**                      | Rules are edited atomically per field                                         |
| Automation.conditions   | **OR-Set**                       | Add/remove conditions independently                                           |
| Import                  | **Immutable**                    | Once created, never modified                                                  |
| Vault (collection)      | **OR-Set**                       | Add/remove entities from collections                                          |

### Recommended CRDT Primitives for MoneyFlow

1. **LWW-Register**: Single values (balance, amounts, dates)
2. **LWW-Map**: Objects with independent fields (transactions, accounts, people)
3. **OR-Set (Add-Wins)**: Collections and tag lists
4. **Hybrid LWW-Map + OR-Set**: For entities with both scalar fields and set-valued fields

---

## 2. TypeScript CRDT Libraries Evaluation

### Library Comparison Matrix

| Library            | Bundle Size | Encryption Compatible | Sync Model             | Maturity         | Verdict         |
| ------------------ | ----------- | --------------------- | ---------------------- | ---------------- | --------------- |
| **Yjs**            | ~40KB       | ❌ Hard               | Binary doc state       | ✅ Mature        | Not recommended |
| **Automerge 2.x**  | ~200KB      | ⚠️ Possible           | Changes/patches        | ✅ Mature        | Backup option   |
| **@loro-dev/loro** | ~150KB      | ✅ Easy               | Updates (opaque bytes) | ✅ Stable (1.0+) | **Recommended** |
| **Custom CRDTs**   | ~5KB        | ✅ Perfect            | Custom events          | DIY              | Fallback option |

### Detailed Analysis

#### Loro (Recommended)

```
Pros:
- Production-ready (v1.0+ stable, 5.2k GitHub stars)
- Perfect encryption fit: export() returns opaque Uint8Array that can be encrypted
- Rich CRDT types: Map, List, MovableList, Tree, Text, Counter
- JSON-compatible schema (doc.toJSON())
- Built-in version vectors and time travel
- Efficient delta updates: export({mode: "update", from: version})
- Snapshots for fast loading: export({mode: "snapshot"})
- Event subscriptions for reactive UI
- Undo/Redo support built-in
- Well-documented with active development

Cons:
- ~150KB bundle (WASM) - acceptable for this app
- Requires Vite/Next.js WASM config (documented)

Encryption Integration:
- Export updates as Uint8Array → encrypt → store/send
- Receive encrypted bytes → decrypt → import
- Server only sees encrypted blobs
- Perfect fit for our architecture
```

**Why Loro is better than custom CRDTs:**

1. **Battle-tested algorithms**: Fugue for text, proven LWW-Map, MovableList, Tree
2. **Edge cases handled**: Clock drift, concurrent edits, partial sync - all solved
3. **Less code to maintain**: ~150KB of well-tested code vs. custom implementations
4. **Time travel built-in**: `doc.checkout(version)` for history/undo
5. **Version vectors**: Efficient sync with `export({mode: "update", from: version})`

**Loro sync model IS event-like:**

```typescript
// Loro's "updates" are essentially events - opaque change sets
const update = doc.export({ mode: "update", from: lastVersion });
// encrypt(update) → send to server → other clients decrypt → import

// This is functionally identical to event sourcing:
// - Updates are immutable
// - They can be batched
// - They're applied in order
// - Server never sees content (just encrypted bytes)
```

#### Yjs

```
Pros:
- Mature, battle-tested
- Excellent for collaborative text editing
- Good network adapters

Cons:
- Designed for document collaboration, not entity-based data
- Binary encoding assumes shared document state
- Encryption integration is difficult (encodes internal state)
- Overkill for simple financial data structures
```

#### Automerge 2.x

```
Pros:
- Clean API for nested JSON documents
- Good TypeScript support
- Supports change-based sync

Cons:
- Large bundle size (~200KB)
- Less active development than Loro
- May be overkill for simple financial records
```

#### Custom Implementation (Fallback)

```
Pros:
- Tiny bundle size (~5KB)
- Complete control over merge semantics
- Easy to understand and debug

Cons:
- Must handle all edge cases yourself
- No time travel, undo/redo built-in
- More testing burden
- Reinventing the wheel
```

### Why Loro Wins for MoneyFlow

| Requirement            | Loro Solution                                    |
| ---------------------- | ------------------------------------------------ |
| Client-side encryption | `export()` returns `Uint8Array` → encrypt → sync |
| Multi-user sync        | Built-in version vectors, delta updates          |
| Offline-first          | Full local state, sync when online               |
| Conflict resolution    | Battle-tested CRDT algorithms (Fugue, LWW-Map)   |
| Audit trail            | `doc.checkout(version)` for time travel          |
| Performance            | Rust/WASM core, efficient columnar encoding      |

---

## 3. Loro + Encryption Architecture

### How Loro Works with Client-Side Encryption

```typescript
import { LoroDoc } from "loro-crdt";
import { encrypt, decrypt } from "@/lib/crypto";

// Initialize document
const doc = new LoroDoc();
doc.setPeerId(userId); // Each user gets unique peer ID

// Model vault data using Loro containers
const transactions = doc.getMap("transactions");
const accounts = doc.getMap("accounts");
const people = doc.getMap("people");
const tags = doc.getMap("tags");

// Make changes (Loro tracks them internally)
const tx = transactions.getOrCreateContainer("tx-123", new LoroMap());
tx.set("merchant", "Grocery Store");
tx.set("amount", -50.0);
tx.set("date", "2025-12-23");

// Get tags as a List for add/remove operations
const txTags = tx.getOrCreateContainer("tags", new LoroList());
txTags.push("tag-groceries");
```

### Sync Flow with Encryption

```typescript
// === SENDING UPDATES ===

// 1. Export updates since last sync
const lastVersion = loadLastSyncedVersion(); // VersionVector
const update: Uint8Array = doc.export({
  mode: "update",
  from: lastVersion,
});

// 2. Encrypt the update (server never sees content)
const encrypted = await encrypt(update, vaultKey);

// 3. Send to server (just encrypted bytes)
await supabase.from("vault_updates").insert({
  vault_id: vaultId,
  encrypted_data: encrypted,
  version: doc.version(), // For ordering
});

// 4. Save current version for next sync
saveLastSyncedVersion(doc.version());

// === RECEIVING UPDATES ===

// 1. Receive encrypted update from server (via Realtime)
supabase
  .channel(`vault:${vaultId}`)
  .on(
    "postgres_changes",
    { event: "INSERT", table: "vault_updates" },
    async (payload) => {
      // 2. Decrypt
      const decrypted = await decrypt(payload.new.encrypted_data, vaultKey);

      // 3. Import into local doc (Loro handles merge)
      doc.import(decrypted);

      // 4. UI updates automatically via subscriptions
    }
  )
  .subscribe();
```

### Snapshots for Fast Loading

```typescript
// === SAVING SNAPSHOT ===

// 1. Export full state as snapshot
const snapshot: Uint8Array = doc.export({ mode: "snapshot" });

// 2. Encrypt and store
const encrypted = await encrypt(snapshot, vaultKey);
await supabase.from("vault_snapshots").upsert({
  vault_id: vaultId,
  encrypted_data: encrypted,
  version: doc.version(),
});

// === LOADING (Initial or Reconnect) ===

// 1. Load latest snapshot
const { data: snapshot } = await supabase
  .from("vault_snapshots")
  .select("*")
  .eq("vault_id", vaultId)
  .single();

const doc = new LoroDoc();
const decryptedSnapshot = await decrypt(snapshot.encrypted_data, vaultKey);
doc.import(decryptedSnapshot);

// 2. Load updates since snapshot
const { data: updates } = await supabase
  .from("vault_updates")
  .select("*")
  .eq("vault_id", vaultId)
  .gt("created_at", snapshot.created_at)
  .order("created_at");

for (const update of updates) {
  const decrypted = await decrypt(update.encrypted_data, vaultKey);
  doc.import(decrypted);
}

// 3. Subscribe to new updates
// ...
```

### Reactive UI with Loro Events

```typescript
// Subscribe to changes for reactive updates
transactions.subscribe((event) => {
  if (event.by === "import") {
    // Change came from another user
    console.log("Remote change:", event);
  }
  // Re-render UI
  updateTransactionList(doc.toJSON().transactions);
});

// Or subscribe at document level
doc.subscribe((event) => {
  for (const e of event.events) {
    console.log("Changed:", e.target, e.diff);
  }
});
```

### Data Model with Loro Containers

```typescript
// Vault structure using Loro containers
interface VaultDoc {
  // Each entity type is a Map of ID -> entity data
  transactions: LoroMap<string, LoroMap>; // LWW-Map semantics
  accounts: LoroMap<string, LoroMap>;
  people: LoroMap<string, LoroMap>;
  tags: LoroMap<string, LoroMap>;
  automations: LoroMap<string, LoroMap>;
  statuses: LoroMap<string, LoroMap>;
  imports: LoroMap<string, LoroMap>;
  preferences: LoroMap; // User preferences
}

// Transaction entity
interface TransactionData {
  id: string;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  accountId: string;
  statusId: string;
  tags: LoroList<string>; // List of tag IDs (add/remove friendly)
  allocations: LoroMap<string, number>; // personId -> percentage
}

// Helper to get typed data
function getTransaction(doc: LoroDoc, id: string): TransactionData | null {
  const transactions = doc.getMap("transactions");
  const tx = transactions.get(id);
  return tx ? (tx.toJSON() as TransactionData) : null;
}
```

---

## 4. Understanding Loro Internals (Reference)

> **Note**: You don't need to implement these - Loro handles all this internally.
> This section is for understanding what Loro does under the hood.

### Why Loro Uses Fugue Algorithm

Loro uses Fugue for list operations (like tag lists), which provides:

- Better interleaving behavior than RGA
- Less "spaghetti" ordering on concurrent inserts
- Academic-backed correctness proofs

### Version Vectors

Loro maintains version vectors internally:

- Each peer has a monotonically increasing counter
- Version vector = `{ peerId: counter, ... }`
- Loro's `doc.version()` returns the current version
- Used to determine "what updates do I need?"

### Timestamp Handling

Loro doesn't use wall clocks - it uses logical timestamps:

- Immune to clock skew between devices
- Operations are ordered by causal relationships
- Physical time only used for human display

### Garbage Collection (Future Consideration)

Loro supports shallow snapshots for compaction:

- `doc.export({ mode: 'shallow-snapshot', frontiers })`
- Discards history before a frontier
- For MVP: not needed (users won't have millions of operations)

---

## 5. Loro + MoneyFlow Integration Patterns

### loro-mirror + loro-mirror-react: Complete Store Abstraction

We use `loro-mirror` (core) + `loro-mirror-react` (React bindings) as our primary interface to Loro. This provides a complete store abstraction for **both reads and writes** with schema validation - no need to interact with the low-level `loro-crdt` API directly.

**Packages:**

- `loro-mirror`: Core Mirror class, schema definition, state ↔ Loro sync
- `loro-mirror-react`: React hooks and context (`useLoroStore`, `createLoroContext`)
- `loro-crdt`: Underlying CRDT engine (peer dependency)

| Operation  | Method                                 | Description                                  |
| ---------- | -------------------------------------- | -------------------------------------------- |
| **Schema** | `schema({...})`                        | Define typed schema with validation          |
| **Read**   | `useLoroSelector()` / `useLoroState()` | Subscribe to state, auto-updates on changes  |
| **Write**  | `setState()` / `useLoroAction()`       | Updates state and propagates changes to Loro |

**`setState` supports two update styles:**

1. **Immer-style mutation**: Mutate a draft directly
2. **Immutable return**: Return a new state object

This means our React code stays idiomatic - no CRDT concepts leak into components.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client A                              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          loro-mirror + loro-mirror-react             │    │
│  │  ┌───────────────────┐  ┌───────────────────────┐   │    │
│  │  │ useLoroSelector() │  │  useLoroAction()      │   │    │
│  │  │ useLoroState()    │  │  setState()           │   │    │
│  │  │   (reads)         │  │   (writes)            │   │    │
│  │  └────────▲──────────┘  └──────────┬────────────┘   │    │
│  │           │                        │                 │    │
│  │           │    ┌───────────────────▼───────────┐    │    │
│  │           └────│    Mirror + LoroDoc           │    │    │
│  │                │   (schema-validated sync)     │    │    │
│  │                └───────────────┬───────────────┘    │    │
│  └────────────────────────────────┼────────────────────┘    │
│                                   │                          │
│                          ┌────────▼────────┐                 │
│                          │  doc.export()   │                 │
│                          └────────┬────────┘                 │
│                          ┌────────▼────────┐                 │
│                          │    Encrypt      │                 │
│                          └────────┬────────┘                 │
└──────────────────────────────────┼──────────────────────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │    Supabase     │
                                         │  (encrypted     │
                                         │   blob relay)   │
                                         └────────┬────────┘
                                                  │
┌─────────────────────────────────────────────────┼───────────┐
│                        Client B                  │           │
│                                         ┌────────▼────────┐  │
│                                         │    Decrypt      │  │
│                                         └───────┬────────┘  │
│  ┌─────────────┐    ┌─────────────┐    ┌───────▼─────────┐  │
│  │   React UI  │◀───│  LoroDoc    │◀───│  doc.import()   │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                           │                                  │
│                    subscriptions trigger                     │
│                    automatic re-render                       │
└─────────────────────────────────────────────────────────────┘
```

### Core Integration Patterns

```typescript
// === schema.ts ===
import { schema } from "loro-mirror";

// Define typed schema for the entire vault
// Schema maps to Loro containers: LoroMap, LoroList, etc.
export const vaultSchema = schema({
  // Each entity collection is a LoroMap with string keys
  transactions: schema.LoroMap({}).catchall(
    schema.LoroMap({
      date: schema.String(),
      merchant: schema.String(),
      description: schema.String(),
      amount: schema.Number(),
      accountId: schema.String(),
      statusId: schema.String({ defaultValue: "for-review" }),
      // Tags as a list - supports concurrent add/remove
      tags: schema.LoroList(schema.String()),
      // Allocations: personId -> percentage
      allocations: schema.LoroMap({}).catchall(schema.Number()),
      createdAt: schema.Number(),
      updatedAt: schema.Number({ required: false }),
      deletedAt: schema.Number({ required: false }),
    })
  ),
  accounts: schema.LoroMap({}).catchall(
    schema.LoroMap({
      name: schema.String(),
      accountNumber: schema.String({ required: false }),
      currency: schema.String({ defaultValue: "USD" }),
      type: schema.String(),
      balance: schema.Number({ defaultValue: 0 }),
      // Ownership: personId -> percentage (must sum to 100)
      ownership: schema.LoroMap({}).catchall(schema.Number()),
    })
  ),
  people: schema.LoroMap({}).catchall(
    schema.LoroMap({
      name: schema.String(),
      email: schema.String({ required: false }),
    })
  ),
  tags: schema.LoroMap({}).catchall(
    schema.LoroMap({
      name: schema.String(),
      parentId: schema.String({ required: false }),
      isTransfer: schema.Boolean({ defaultValue: false }),
    })
  ),
  statuses: schema.LoroMap({}).catchall(
    schema.LoroMap({
      name: schema.String(),
      treatAsPaid: schema.Boolean({ defaultValue: false }),
    })
  ),
  automations: schema.LoroMap({}).catchall(
    schema.LoroMap({
      name: schema.String(),
      conditions: schema.LoroList(schema.Any()), // Complex condition objects
      actions: schema.LoroList(schema.Any()), // Complex action objects
      order: schema.Number({ defaultValue: 0 }),
    })
  ),
  imports: schema.LoroMap({}).catchall(
    schema.LoroMap({
      filename: schema.String(),
      createdAt: schema.Number(),
    })
  ),
});

// Infer TypeScript type from schema
export type VaultState = InferType<typeof vaultSchema>;
```

```typescript
// === vault-context.tsx ===
import { LoroDoc } from "loro-crdt";
import { createLoroContext } from "loro-mirror-react";
import { vaultSchema } from "./schema";

// Create React context with typed hooks
export const {
  LoroProvider,
  useLoroContext,
  useLoroState,
  useLoroSelector,
  useLoroAction,
} = createLoroContext(vaultSchema);

// Singleton doc for sync operations
let vaultDoc: LoroDoc | null = null;

export function getVaultDoc(): LoroDoc {
  if (!vaultDoc) throw new Error("Vault not initialized");
  return vaultDoc;
}

// === VaultProvider wrapper ===
export function VaultProvider({
  children,
  encryptedSnapshot,
  vaultKey,
}: {
  children: React.ReactNode;
  encryptedSnapshot?: Uint8Array;
  vaultKey: CryptoKey;
}) {
  const doc = useMemo(() => {
    const d = new LoroDoc();
    vaultDoc = d; // Store reference for sync
    return d;
  }, []);

  // Load encrypted snapshot on mount
  useEffect(() => {
    if (encryptedSnapshot) {
      decrypt(encryptedSnapshot, vaultKey).then((snapshot) => {
        doc.import(snapshot);
      });
    }
  }, [doc, encryptedSnapshot, vaultKey]);

  return (
    <LoroProvider
      doc={doc}
      initialState={{
        transactions: {},
        accounts: {},
        people: {},
        tags: {},
        statuses: {},
        automations: {},
        imports: {},
      }}
    >
      {children}
    </LoroProvider>
  );
}
```

### Entity Operations (CRUD) via useLoroAction

All writes go through `useLoroAction` hooks. These are synchronous - state is updated immediately.

```typescript
// === hooks/use-transaction-actions.ts ===
import { useLoroAction } from "../vault-context";

export function useTransactionActions() {
  // Create transaction - Immer-style draft mutation
  const createTransaction = useLoroAction((state, data: TransactionInput) => {
    const id = crypto.randomUUID();
    state.transactions[id] = {
      $cid: "", // Injected by loro-mirror
      date: data.date,
      merchant: data.merchant,
      description: data.description,
      amount: data.amount,
      accountId: data.accountId,
      statusId: data.statusId ?? "for-review",
      tags: data.tagIds ?? [],
      allocations: data.allocations ?? {},
      createdAt: Date.now(),
    };
    return id;
  }, []);

  // Update transaction - partial update
  const updateTransaction = useLoroAction(
    (state, id: string, updates: Partial<TransactionInput>) => {
      const tx = state.transactions[id];
      if (!tx) throw new Error(`Transaction ${id} not found`);
      Object.assign(tx, updates, { updatedAt: Date.now() });
    },
    []
  );

  // Soft delete
  const deleteTransaction = useLoroAction((state, id: string) => {
    const tx = state.transactions[id];
    if (tx) tx.deletedAt = Date.now();
  }, []);

  // Add tag to transaction
  const addTag = useLoroAction((state, txId: string, tagId: string) => {
    const tx = state.transactions[txId];
    if (tx && !tx.tags.includes(tagId)) {
      tx.tags.push(tagId);
    }
  }, []);

  // Remove tag from transaction
  const removeTag = useLoroAction((state, txId: string, tagId: string) => {
    const tx = state.transactions[txId];
    if (tx) {
      const idx = tx.tags.indexOf(tagId);
      if (idx !== -1) tx.tags.splice(idx, 1);
    }
  }, []);

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    addTag,
    removeTag,
  };
}
```

### React Integration with loro-mirror-react

Components read state via `useLoroSelector()` or `useLoroState()`. Writes go through `useLoroAction()`. Updates are synchronous and the mirror automatically re-renders subscribed components.

```typescript
// === hooks/use-transactions.ts ===
import { useLoroSelector } from "../vault-context";

export function useTransactions(): Transaction[] {
  // Subscribe to just the transactions map - efficient re-renders
  const transactions = useLoroSelector((state) => state.transactions);

  return Object.entries(transactions)
    .map(([id, tx]) => ({ id, ...tx }))
    .filter((tx) => !tx.deletedAt);
}

export function useTransaction(id: string): Transaction | null {
  return useLoroSelector((state) => {
    const tx = state.transactions[id];
    return tx && !tx.deletedAt ? { id, ...tx } : null;
  });
}

// === components/transaction-list.tsx ===
import { useTransactions } from "../hooks/use-transactions";
import { useTransactionActions } from "../hooks/use-transaction-actions";

function TransactionList() {
  const transactions = useTransactions();
  const { updateTransaction, deleteTransaction } = useTransactionActions();

  const handleMerchantChange = (id: string, merchant: string) => {
    updateTransaction(id, { merchant });
    // UI updates synchronously - no waiting
  };

  return (
    <ul>
      {transactions.map((tx) => (
        <li key={tx.$cid}>
          {" "}
          {/* Use $cid for stable React key */}
          <input
            value={tx.merchant}
            onChange={(e) => handleMerchantChange(tx.id, e.target.value)}
          />
          : ${tx.amount}
          <button onClick={() => deleteTransaction(tx.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}

// === components/add-transaction-form.tsx ===
function AddTransactionForm() {
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState(0);
  const { createTransaction } = useTransactionActions();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createTransaction({
      date: new Date().toISOString(),
      merchant,
      amount,
      accountId: "default-account",
    });
    setMerchant("");
    setAmount(0);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button type="submit">Add</button>
    </form>
  );
}
```

**Why loro-mirror + loro-mirror-react:**

1. **Schema-validated** - Define types once, get runtime validation + TypeScript inference
2. **Complete abstraction** - Handles both reads and writes via familiar React patterns
3. **Immer-style mutations** - Mutate drafts directly, or return immutable objects
4. **Automatic re-renders** - Components re-render only when their selected data changes
5. **Synchronous updates** - `setState` and `useLoroAction` apply immediately
6. **`$cid` for stable keys** - Loro container IDs are auto-injected, perfect for React keys
7. **Idiomatic React** - Works like Zustand/Redux; no CRDT concepts in component code

````

### Sync Service

The sync service accesses the underlying `LoroDoc` via `useLoroContext()` to export/import encrypted updates.

```typescript
// === sync-service.ts ===
import { getVaultDoc } from "./vault-context";
import { supabase } from "./supabase-client";

let lastSyncVersion: Uint8Array | null = null;

export async function pushChanges(): Promise<void> {
  const doc = getVaultDoc(); // Get the LoroDoc reference
  const key = getVaultKey();

  // Export only changes since last sync
  const update = lastSyncVersion
    ? doc.export({ mode: "update", from: lastSyncVersion })
    : doc.export({ mode: "update" });

  if (update.length === 0) return; // No changes

  const encrypted = await encrypt(update, key);

  await supabase.from("vault_updates").insert({
    vault_id: getVaultId(),
    encrypted_data: bytesToBase64(encrypted),
  });

  lastSyncVersion = doc.version();
}

export function subscribeToChanges(): () => void {
  const channel = supabase
    .channel(`vault:${getVaultId()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", table: "vault_updates" },
      async (payload) => {
        const encrypted = base64ToBytes(payload.new.encrypted_data);
        const update = await decrypt(encrypted, getVaultKey());

        getVaultDoc().import(update);

        // UI updates automatically via useLoroSelector subscriptions
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
}

  return () => channel.unsubscribe();
}

// Auto-sync on changes
export function enableAutoSync(): void {
  vaultStore.doc.subscribe(() => {
    // Debounce to batch rapid changes
    scheduleSync();
  });
}

const scheduleSync = debounce(pushChanges, 1000);
````

---

## 6. Snapshot & Sync Strategy

### When to Snapshot

```typescript
const SNAPSHOT_POLICIES = {
  // Create after significant changes
  changeThreshold: 100, // operations

  // Create on app close/background
  onBackground: true,

  // Create after idle period with pending changes
  idleTimeoutMs: 5 * 60 * 1000, // 5 minutes

  // Maximum time without snapshot
  maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
};
```

### Snapshot Flow

```typescript
async function saveSnapshot(): Promise<void> {
  const vault = getVault();
  const key = getVaultKey();

  // Full snapshot includes all history
  const snapshot = vault.export({ mode: "snapshot" });
  const encrypted = await encrypt(snapshot, key);

  await supabase.from("vault_snapshots").upsert({
    vault_id: getVaultId(),
    encrypted_data: bytesToBase64(encrypted),
    version: bytesToBase64(vault.version()),
  });
}

async function loadVaultFromServer(): Promise<void> {
  // 1. Load latest snapshot
  const { data: snapshot } = await supabase
    .from("vault_snapshots")
    .select("*")
    .eq("vault_id", getVaultId())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (snapshot) {
    const decrypted = await decrypt(
      base64ToBytes(snapshot.encrypted_data),
      key
    );
    vault.import(decrypted);
  }

  // 2. Load any updates after snapshot
  const { data: updates } = await supabase
    .from("vault_updates")
    .select("*")
    .eq("vault_id", getVaultId())
    .gt("created_at", snapshot?.created_at ?? "1970-01-01")
    .order("created_at");

  for (const update of updates ?? []) {
    const decrypted = await decrypt(base64ToBytes(update.encrypted_data), key);
    vault.import(decrypted);
  }
}
```

---

## 7. Alternatives Considered

### Option A: Automerge (Not Selected)

- **Pros**: Feature-complete, handles complex nested documents, mature
- **Cons**: Larger bundle (~250KB vs Loro's ~150KB), different philosophy
- **Verdict**: Loro is simpler and better documented for our use case

### Option B: Yjs (Not Selected)

- **Pros**: Excellent for text collaboration, mature ecosystem
- **Cons**: Document-centric model, harder encryption integration
- **Verdict**: Better for collaborative editors, overkill for financial records

### Option C: Custom CRDTs (Not Selected)

- **Pros**: Full control, smaller bundle, exact fit
- **Cons**: Must implement version vectors, must test edge cases, maintenance burden
- **Verdict**: Loro provides tested algorithms we'd have to implement ourselves

### Option D: Simple Last-Write-Wins (Not Selected)

- **Pros**: Trivially simple
- **Cons**: Can lose concurrent adds to collections
- **Verdict**: Loro gives us OR-Set semantics for free via LoroList

---

## 8. Implementation Checklist

Since loro-mirror handles CRDT internals and schema validation, our implementation is simpler:

```
src/
  lib/
    loro/
      schema.ts          # Vault schema definition
      vault-context.tsx  # createLoroContext, VaultProvider

    hooks/
      use-transactions.ts      # useLoroSelector for transactions
      use-transaction-actions.ts  # useLoroAction for CRUD
      use-accounts.ts
      use-people.ts
      use-tags.ts
      use-vault-sync.ts

    sync/
      supabase.ts      # Realtime subscriptions
      push.ts          # Push changes to server
      pull.ts          # Initial load from server
      encryption.ts    # AES-256-GCM wrapper
```

### Implementation Order

1. [ ] Install packages: `loro-mirror`, `loro-mirror-react`, `loro-crdt`
2. [ ] Define vault schema (schema.ts)
3. [ ] Create VaultProvider with createLoroContext (vault-context.tsx)
4. [ ] Implement encryption.ts (AES-256-GCM)
5. [ ] Create use-transactions.ts and use-transaction-actions.ts as template
6. [ ] Implement sync-service.ts for push/pull
7. [ ] Implement Supabase Realtime subscription
8. [ ] Test concurrent edits
9. [ ] Add remaining entity hooks
10. [ ] Implement snapshot strategy

---

## References

- [Loro Mirror GitHub](https://github.com/loro-dev/loro-mirror) - Schema + state management
- [Loro Mirror React](https://github.com/loro-dev/loro-mirror/tree/main/packages/react) - React hooks
- [Loro Documentation](https://loro.dev/docs) - Core CRDT docs
- [Loro GitHub](https://github.com/loro-dev/loro) - Source and examples
- [CRDTs for Mortals](https://www.youtube.com/watch?v=DEcwa68f-jY) - James Long (excellent intro)
- [A comprehensive study of CRDTs](https://hal.inria.fr/inria-00555588/document) - Shapiro et al.
