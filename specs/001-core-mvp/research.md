# Research: MoneyFlow Core MVP

**Date**: 2025-12-23  
**Feature**: Core MVP  
**Status**: Complete

## Executive Summary

After evaluating multiple sync technologies and CRDT libraries, the **recommended approach** is:

| Component         | Choice                         | Rationale                                     |
| ----------------- | ------------------------------ | --------------------------------------------- |
| **Framework**     | Next.js 15 on Vercel           | User specified; excellent DX                  |
| **CRDT Library**  | Loro v1.0+                     | Tested algorithms, TypeScript support, ~150KB |
| **Sync/Realtime** | Supabase Realtime              | WebSocket, perfect for encrypted blob relay   |
| **Storage**       | Supabase (Postgres + Storage)  | Real-time subscriptions, free tier            |
| **Encryption**    | Client-side XChaCha20-Poly1305 | Server never sees plaintext; 192-bit nonces   |

See [crdt-research.md](research/crdt-research.md) for detailed CRDT analysis.

---

## 1. Sync Technology Evaluation

### TanStack DB + ElectricSQL + Supabase

| Aspect                 | Assessment                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **TanStack DB**        | ⚠️ BETA - Collections, live queries, optimistic mutations. API unstable.                                             |
| **ElectricSQL**        | ✅ GA v1.0+ - Real-time Postgres sync via "Shapes". Supports encrypted blobs.                                        |
| **Integration**        | Electric syncs encrypted blobs from Postgres → clients. TanStack DB manages client state.                            |
| **Encryption Support** | ✅ Explicit support - "syncs ciphertext as well as plaintext". [Example](https://electric-sql.com/demos/encryption). |

**Verdict**: Viable but adds complexity. Since we're using Loro for CRDT, we just need a simple blob relay - Supabase Realtime is sufficient.

### Alternatives Evaluated

| Technology                | Real-time    | Encryption    | Offline   | Production    | Fit                     |
| ------------------------- | ------------ | ------------- | --------- | ------------- | ----------------------- |
| **Vercel Blob + Polling** | ❌ 60s cache | ✅            | ⚠️        | ✅            | ❌ Not suitable         |
| **Supabase Realtime**     | ✅ WebSocket | ✅ Perfect    | ⚠️ Manual | ✅            | ✅ **Recommended**      |
| **PowerSync**             | ✅           | ✅ E2EE docs  | ✅        | ✅ SOC2       | ✅ Strong alt ($49+/mo) |
| **Zero**                  | ✅           | ❌ Needs data | ✅        | ⚠️ Alpha      | ❌ Incompatible         |
| **Replicache**            | ✅           | ⚠️            | ✅        | ❌ Deprecated | ❌ Dead end             |
| **Liveblocks**            | ✅           | ❌ Needs data | ⚠️        | ✅            | ❌ Incompatible         |

### Decision: Loro CRDT + Supabase Realtime

**Rationale**:

- Loro handles all CRDT complexity (versioning, merging, conflict resolution)
- Loro's `export()` returns `Uint8Array`, perfect for encryption
- Supabase Realtime relays encrypted blobs between clients
- Server only stores ciphertext (never sees plaintext)
- Native support for event-sourcing pattern
- Real-time subscriptions via WebSocket
- Free tier sufficient for MVP
- Full control over sync logic
- No vendor lock-in to proprietary CRDT formats

---

## 2. Architecture Decisions

### 2.1 Clock Strategy: Hybrid Logical Clocks (HLC)

**Decision**: Use HLC instead of vector clocks

**Rationale**:

- Vector clocks require O(n) space per event (n = users)
- HLC provides causal ordering with O(1) space
- Better "last write wins" semantics tied to real time
- Simpler implementation and debugging

**Implementation**:

```typescript
interface HLC {
  wallTime: number; // milliseconds since epoch
  logical: number; // logical counter for same-wallTime events
  nodeId: string; // unique client identifier
}
```

### 2.2 Conflict Resolution: Field-Level LWW-Map

**Decision**: Treat each field as independent LWW register

**Rationale**:

- Two users editing different fields = no conflict
- Simple mental model: "latest write wins per field"
- Tags use OR-Set (add-wins semantics)

**Example**:

```typescript
interface TransactionEvent {
  id: string;
  field: 'merchant' | 'amount' | 'tags' | 'allocations' | ...;
  value: EncryptedJSON;
  hlc: HLC;
}
```

### 2.3 Key Derivation: Argon2id

**Decision**: Use Argon2id for password → key derivation

**Rationale**:

- PBKDF2 is GPU-acceleratable (weak against modern attacks)
- Argon2id won Password Hashing Competition (PHC)
- Memory-hard: 64MB cost defeats GPU parallelism
- Side-channel resistant variant

**Parameters**:

```typescript
const argon2Params = {
  memory: 65536, // 64 MB
  iterations: 3,
  parallelism: 4,
  hashLength: 32, // 256 bits
};
```

### 2.4 Key Hierarchy

**Decision**: 3-layer key hierarchy for password changes

```
Password + Salt → Argon2id → KEK (Key Encryption Key)
                                    ↓
                            [Encrypted Vault Key]
                                    ↓
                              Vault Key
                                    ↓
                            [Encrypted Events]
```

**Rationale**:

- Password change only re-encrypts vault key wrapper (~1KB)
- Does NOT require re-encrypting entire vault
- Enables future key rotation without data migration

### 2.5 Multi-User Key Sharing

**Decision**: Asymmetric key wrapping with X25519

**How it works**:

1. Each user has X25519 keypair (stored encrypted in their user document)
2. Vault key is wrapped (encrypted) for each user with their public key
3. Inviting user = wrapping vault key with their public key
4. Revoking user = re-key vault + remove their wrapped key

**Data model**:

```typescript
interface Vault {
  id: string;
  wrappedKeys: {
    [userId: string]: EncryptedVaultKey; // encrypted with user's public key
  };
  // ... events stored separately
}
```

### 2.6 Event Batching Strategy

**Decision**: 1-second debounce with caps

```typescript
const batchConfig = {
  debounceMs: 1000, // Wait 1s after last edit
  maxWaitMs: 5000, // Force flush after 5s
  maxEvents: 100, // Force flush after 100 events
};
```

**Rationale**:

- Reduces write frequency (cost + bandwidth)
- Prevents unbounded queuing during rapid edits
- 1s feels responsive for collaboration

### 2.7 Snapshot Compaction

**Decision**: Periodic snapshots + event pruning

**Strategy**:

1. Store full encrypted snapshot every 24 hours (or every 100 event batches)
2. New clients load: snapshot → then recent events since snapshot
3. Prune event batches older than 7 days (if in snapshot)

**Data model**:

```typescript
interface VaultSnapshot {
  vaultId: string;
  version: number; // Monotonic snapshot version
  hlc: HLC; // HLC at snapshot time
  encryptedState: string; // Full hydrated state, encrypted
  createdAt: Date;
}

interface EventBatch {
  vaultId: string;
  batchId: string;
  afterSnapshotVersion: number; // Which snapshot this follows
  encryptedEvents: string; // Array of events, encrypted
  hlc: HLC;
  createdAt: Date;
}
```

---

## 3. Security Considerations

### Critical Requirements

| Requirement                           | Implementation                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| **Separate auth and encryption keys** | Derive two keys from password: `authKey` for login, `encryptionKey` for vault |
| **Never persist decrypted keys**      | Session memory only; clear on tab close                                       |
| **Random nonces**                     | 12-byte random (never counter-based) - nonce reuse = catastrophic             |
| **Server blindness**                  | All encryption/decryption client-side; server only sees ciphertext            |

### Encryption Spec

```typescript
const encryptionSpec = {
  algorithm: "XChaCha20-Poly1305",
  keySize: 256,
  nonceSize: 192, // 24 bytes - safe for random generation
  tagSize: 128, // 16 bytes
  kdf: "HKDF-SHA256", // Domain-separated key derivation from BIP39 seed
  keyWrapping: "X25519 + XSalsa20-Poly1305", // libsodium sealed box
};
```

### Key Derivation Flow

```
Password + Salt₁ → Argon2id → authKey    (for authentication hash)
Password + Salt₂ → Argon2id → kekKey     (for key encryption key)
                                  ↓
                          [Encrypted keypair]
                                  ↓
                          X25519 Keypair
                                  ↓
                          [Unwrap vault key]
```

---

## 4. Technology Stack Summary

### Confirmed Stack

| Layer                | Technology                             | Version               |
| -------------------- | -------------------------------------- | --------------------- |
| **Framework**        | Next.js                                | 15.x                  |
| **Deployment**       | Vercel                                 | -                     |
| **UI**               | Tailwind CSS + shadcn/ui               | Latest                |
| **State**            | React hooks + Context                  | -                     |
| **Forms/Validation** | React Hook Form + Zod                  | -                     |
| **FP Utilities**     | Remeda                                 | Latest                |
| **Date/Time**        | Temporal API polyfill                  | @js-temporal/polyfill |
| **Crypto**           | Web Crypto API + libsodium-wrappers    | -                     |
| **Database**         | Supabase (Postgres)                    | -                     |
| **Realtime**         | Supabase Realtime                      | -                     |
| **Storage**          | Supabase Storage (for encrypted blobs) | -                     |
| **Testing**          | Vitest + Playwright                    | -                     |

### NPM Packages

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.x",
    "@js-temporal/polyfill": "^0.4.x",
    "remeda": "^2.x",
    "libsodium-wrappers": "^0.7.x",
    "zod": "^3.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^2.x",
    "@playwright/test": "^1.x",
    "tailwindcss": "^3.x",
    "@shadcn/ui": "latest"
  }
}
```

---

## 5. Rejected Alternatives

### Vercel Blob Storage

**Why rejected**: 60-second minimum cache makes real-time collaboration impossible. FR-073 requires <500ms propagation.

### Zero (zero.ms)

**Why rejected**: Requires server-side data access for sync features. Incompatible with client-side-only encryption requirement (Constitution Principle I).

### Liveblocks

**Why rejected**: Similar to Zero - requires server to process data for conflict resolution. Cannot work with encrypted blobs.

### Replicache

**Why rejected**: In maintenance mode with no active development. Migration path leads to Zero (incompatible).

### Full CRDT Libraries (Yjs/Automerge)

**Why rejected**:

- Designed for fine-grained text/document collaboration
- Overkill for entity-based financial data
- Would require custom encryption layer anyway
- Adds complexity without proportional benefit

---

## 6. Open Questions (Resolved)

| Question                  | Resolution                                  |
| ------------------------- | ------------------------------------------- |
| Vector clock vs simpler?  | **HLC** - O(1) space, causal ordering       |
| Conflict resolution?      | **Field-level LWW** with HLC timestamps     |
| Key derivation?           | **Argon2id** with 64MB memory cost          |
| Password change handling? | **Key hierarchy** - only re-encrypt wrapper |
| Multi-user key sharing?   | **X25519 key wrapping** per user            |
| Event batching?           | **1s debounce, 5s max, 100 event cap**      |
| Snapshot compaction?      | **24h snapshots, 7-day event retention**    |

---

## 7. Risk Assessment

| Risk                       | Likelihood | Impact   | Mitigation                                     |
| -------------------------- | ---------- | -------- | ---------------------------------------------- |
| Supabase Realtime latency  | Low        | Medium   | Test early; have polling fallback              |
| Key management complexity  | Medium     | High     | Comprehensive unit tests; use libsodium        |
| HLC clock drift            | Low        | Low      | Use server time for initial sync               |
| Snapshot corruption        | Low        | Critical | Multiple snapshot versions; event log recovery |
| Browser crypto API support | Low        | High     | Feature detection; graceful error              |

---

## 8. Next Steps

1. ✅ Complete research.md (this document)
2. → Generate data-model.md with entity schemas
3. → Generate contracts/ with API specifications
4. → Generate quickstart.md for development setup
