# Architecture Analysis: Local-First Encrypted Financial App

**Date**: 2025-12-23  
**Context**: Detailed analysis of proposed MoneyFlow architecture with recommendations for each concern

---

## Executive Summary

The proposed architecture is **fundamentally sound** but requires refinement in several areas:

| Aspect                                  | Assessment           | Recommendation                             |
| --------------------------------------- | -------------------- | ------------------------------------------ |
| Ordering (Vector Clock vs alternatives) | ⚠️ Overcomplicated   | Use Hybrid Logical Clocks (HLC)            |
| Conflict Resolution                     | ✅ Well-suited       | LWW-Map per field + OR-Set for collections |
| Key Derivation                          | 🔴 Critical decision | Argon2id (memory-hard, modern)             |
| Key Rotation                            | ⚠️ Complex           | Re-encrypt vault key, not content          |
| Multi-user Key Sharing                  | ⚠️ Complex           | Key wrapping with asymmetric crypto        |
| Event Batching                          | ✅ Good approach     | 1-second debounce is reasonable            |
| Snapshot Compaction                     | ⚠️ Needs strategy    | Periodic full snapshots + event pruning    |

---

## 1. Vector Clock vs Alternatives

### Your Question

> Is vector clock the right choice, or should we use something simpler (Lamport timestamp, Hybrid Logical Clock)?

### Analysis

**Vector Clocks**:

- Track causal history from ALL participants
- Space complexity: O(n) per event where n = number of users
- Required when you need to detect concurrent edits (not just order them)
- Overkill for LWW-semantics where you just need total ordering

**Lamport Timestamps**:

- Simple counter, incremented on each event
- Space complexity: O(1)
- Only provides total order, not causal relationships
- Problem: Can diverge significantly with network partitions
- Problem: Counter drift between devices

**Hybrid Logical Clocks (HLC)**:

- Combines physical wall-clock time + logical counter
- Space complexity: O(1)
- Provides causally-consistent ordering
- Handles clock skew gracefully
- Better semantics for "last write wins" (closer to real time)

### Recommendation: **Hybrid Logical Clocks (HLC)**

For MoneyFlow's use case (LWW-Map, LWW-Register, OR-Set), HLC is the sweet spot:

```typescript
interface HLCTimestamp {
  // Physical time (milliseconds since epoch)
  wallTime: number;
  // Logical counter for same wallTime
  logical: number;
  // Node identifier for deterministic tiebreaking
  nodeId: string;
}

function createHLC(nodeId: string, previous?: HLCTimestamp): HLCTimestamp {
  const now = Date.now();

  if (!previous || now > previous.wallTime) {
    return { wallTime: now, logical: 0, nodeId };
  }

  // Wall clock hasn't advanced, increment logical
  return {
    wallTime: previous.wallTime,
    logical: previous.logical + 1,
    nodeId,
  };
}

function compareHLC(a: HLCTimestamp, b: HLCTimestamp): number {
  if (a.wallTime !== b.wallTime) return a.wallTime - b.wallTime;
  if (a.logical !== b.logical) return a.logical - b.logical;
  return a.nodeId.localeCompare(b.nodeId); // Deterministic tiebreak
}
```

**Why not Vector Clocks?**

- You don't need to detect "concurrent" edits—you just want a winner
- Vector clocks grow with user count (wasteful for encrypted blobs)
- Financial data semantics are naturally LWW (latest transaction edit wins)

---

## 2. Conflict Resolution for Transaction Edits

### Your Question

> How should conflict resolution work when two users edit the same transaction?

### Analysis

The key insight: **different fields have different conflict semantics**.

| Field         | Conflict Type       | Resolution Strategy |
| ------------- | ------------------- | ------------------- |
| `amount`      | Scalar              | LWW-Register        |
| `date`        | Scalar              | LWW-Register        |
| `merchant`    | Scalar              | LWW-Register        |
| `description` | Scalar (short text) | LWW-Register        |
| `tags`        | Collection          | OR-Set (add-wins)   |
| `allocations` | Map of percentages  | LWW-Map per person  |
| `status`      | Scalar              | LWW-Register        |
| `accountId`   | Scalar              | LWW-Register        |

### Recommended Approach: Field-Level LWW-Map

Each transaction is an **LWW-Map** where each field is independently versioned:

```typescript
interface Transaction {
  id: string;
  // Each field has its own timestamp
  fields: {
    amount: { value: number; hlc: HLCTimestamp };
    date: { value: string; hlc: HLCTimestamp };
    merchant: { value: string; hlc: HLCTimestamp };
    description: { value: string; hlc: HLCTimestamp };
    status: { value: string; hlc: HLCTimestamp };
    accountId: { value: string; hlc: HLCTimestamp };
  };
  // Tags use OR-Set semantics
  tags: ORSet<string>;
  // Allocations per person (each person's % is LWW)
  allocations: { [personId: string]: { value: number; hlc: HLCTimestamp } };
}
```

### Conflict Scenario Example

**User A** (offline, edits at T=1000):

- Sets `amount` to `-50.00`
- Adds tag `"Groceries"`

**User B** (online, edits at T=1001):

- Sets `description` to `"Weekly shopping"`
- Adds tag `"Food"`
- Removes tag `"Groceries"`

**After sync, merged state**:

- `amount`: `-50.00` (from A, only A edited this)
- `description`: `"Weekly shopping"` (from B, only B edited this)
- `tags`: `["Food"]` (B's remove of "Groceries" wins because it came after A's add)

### Edge Case: Same Field, Same Timestamp

When two users edit the same field at exactly the same HLC timestamp:

1. Compare logical counter (higher wins)
2. If still tied, compare nodeId lexicographically (deterministic)

This ensures **all clients converge to the same state** without coordination.

---

## 3. Key Derivation from Username/Password

### Your Question

> What's the best way to derive encryption keys from username/password securely?

### Analysis

| Algorithm    | Memory Cost  | Time Cost       | Side-Channel Resistance   | Recommendation |
| ------------ | ------------ | --------------- | ------------------------- | -------------- |
| PBKDF2       | None         | High iterations | Poor (GPU-acceleratable)  | ❌ Outdated    |
| bcrypt       | 4KB fixed    | Configurable    | Moderate                  | ⚠️ Acceptable  |
| scrypt       | Configurable | Configurable    | Good (memory-hard)        | ✅ Good        |
| **Argon2id** | Configurable | Configurable    | Excellent (winner of PHC) | ✅ **Best**    |

### Recommendation: **Argon2id**

Argon2id is the Password Hashing Competition winner and combines:

- **Argon2i**: Side-channel resistant (constant-time)
- **Argon2d**: GPU-resistant (data-dependent memory access)

```typescript
import { hash, verify } from "@node-rs/argon2";

// For key derivation (not hashing)
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array, // Random 16+ bytes, stored with user document
  keyLength: number = 32 // 256-bit key
): Promise<Uint8Array> {
  // Parameters tuned for ~500ms on modern hardware
  const params = {
    memoryCost: 65536, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 4, // 4 threads
    hashLength: keyLength,
    type: 2, // Argon2id
  };

  return argon2.hash(password, salt, params);
}
```

### Browser Compatibility

For client-side (browser), use `argon2-browser` or `hash-wasm`:

```typescript
import { argon2id } from "hash-wasm";

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const hash = await argon2id({
    password,
    salt,
    parallelism: 4,
    iterations: 3,
    memorySize: 65536, // 64 MB
    hashLength: 32,
    outputType: "binary",
  });
  return hash;
}
```

### Security Parameters

| Parameter   | Minimum  | Recommended | Notes                          |
| ----------- | -------- | ----------- | ------------------------------ |
| Memory      | 19 MB    | 64+ MB      | Higher = more GPU resistant    |
| Iterations  | 2        | 3+          | More = slower brute force      |
| Parallelism | 1        | 4           | Match typical client CPU cores |
| Salt Length | 16 bytes | 16 bytes    | Random per user                |

### What You're Deriving

From password, derive TWO keys:

1. **Authentication Key**: Used to prove identity to server (never decrypt anything)
2. **Master Key Encryption Key (KEK)**: Used to decrypt the user's master key

```
Password + Salt → Argon2id → 64 bytes
                            ├─ 32 bytes: Auth Key (sent to server as hash)
                            └─ 32 bytes: KEK (never leaves client)
```

---

## 4. Key Rotation on Password Change

### Your Question

> How do you handle key rotation when a user changes their password?

### Analysis

There are two approaches:

**Option A: Re-encrypt All Data** ❌

- When password changes, re-encrypt entire vault
- Problems:
  - Very slow for large vaults
  - Race conditions with concurrent edits
  - What if user goes offline mid-rotation?

**Option B: Key Wrapping Hierarchy** ✅

- Password derives KEK (Key Encryption Key)
- KEK encrypts the actual vault key
- Only re-encrypt the vault key, not the data

### Recommended Approach: Key Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ User Password                                                │
│       │                                                      │
│       ▼                                                      │
│ ┌─────────────────┐                                         │
│ │ Argon2id + Salt │ ──────► KEK (Key Encryption Key)        │
│ └─────────────────┘         │                               │
│                              ▼                               │
│                   ┌───────────────────────┐                  │
│                   │ Encrypted Vault Key   │ (stored on server)
│                   │ (wrapped with KEK)    │                  │
│                   └───────────────────────┘                  │
│                              │                               │
│                    Decrypt   │                               │
│                              ▼                               │
│                   ┌───────────────────────┐                  │
│                   │ Vault Key (DEK)       │ (in memory only) │
│                   │ (Data Encryption Key) │                  │
│                   └───────────────────────┘                  │
│                              │                               │
│                   Encrypts   │                               │
│                              ▼                               │
│                   ┌───────────────────────┐                  │
│                   │ All Event Data        │                  │
│                   └───────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Password Change Flow

```typescript
async function changePassword(oldPassword: string, newPassword: string) {
  // 1. Derive old KEK
  const oldKEK = await deriveKEK(oldPassword, user.salt);

  // 2. Decrypt vault key using old KEK
  const vaultKey = await decrypt(user.encryptedVaultKey, oldKEK);

  // 3. Generate new salt (IMPORTANT: salt must change!)
  const newSalt = crypto.getRandomValues(new Uint8Array(16));

  // 4. Derive new KEK from new password
  const newKEK = await deriveKEK(newPassword, newSalt);

  // 5. Re-encrypt vault key with new KEK
  const newEncryptedVaultKey = await encrypt(vaultKey, newKEK);

  // 6. Update user document atomically
  await updateUser({
    salt: newSalt,
    encryptedVaultKey: newEncryptedVaultKey,
    // Optionally: invalidate other sessions
  });

  // Vault data remains unchanged - only the wrapper key changed
}
```

### Security Considerations

1. **Salt MUST change** on password change (prevents precomputation attacks)
2. **Invalidate sessions** on password change (optional but recommended)
3. **Keep old KEK derivation parameters** if you change Argon2 params later (migration)

---

## 5. Multi-User Key Sharing (New User Joins Vault)

### Your Question

> What happens when a new user joins a vault - how do they get access to the encryption keys?

### Analysis

This is the most complex part of encrypted multi-user systems. Options:

| Approach                       | Complexity | Security        | UX            |
| ------------------------------ | ---------- | --------------- | ------------- |
| Share password directly        | Low        | 🔴 Terrible     | Simple        |
| Key escrow (server holds keys) | Low        | 🔴 Defeats E2EE | Simple        |
| Out-of-band secret sharing     | Medium     | ✅ Good         | 🟡 Extra step |
| **Asymmetric key wrapping**    | Medium     | ✅ Good         | ✅ Seamless   |

### Recommended Approach: Asymmetric Key Wrapping

Each user has a **key pair** (public/private). The vault key is wrapped (encrypted) separately for each user who has access.

```
┌─────────────────────────────────────────────────────────────┐
│ Vault Access Model                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐                                          │
│  │  Vault Key    │◄────── The actual DEK for vault data     │
│  │  (symmetric)  │                                          │
│  └───────┬───────┘                                          │
│          │                                                  │
│          │ Wrapped (encrypted) for each user:               │
│          │                                                  │
│  ┌───────▼───────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ User A's copy │  │ User B's copy │  │ User C's copy │   │
│  │ (encrypted w/ │  │ (encrypted w/ │  │ (encrypted w/ │   │
│  │  A's pubkey)  │  │  B's pubkey)  │  │  C's pubkey)  │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Setup During User Registration

```typescript
async function registerUser(email: string, password: string) {
  // 1. Generate asymmetric key pair for this user
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  // 2. Derive KEK from password
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const kek = await deriveKEK(password, salt);

  // 3. Encrypt private key with KEK (so it can be stored on server)
  const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const encryptedPrivateKey = await encryptAES(exportedPrivateKey, kek);

  // 4. Export public key (stored unencrypted, it's public)
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);

  // 5. Store user document
  await createUser({
    email,
    salt,
    encryptedPrivateKey,
    publicKey,
    // No vault access yet
  });
}
```

### Inviting a User to a Vault

```typescript
async function inviteUserToVault(inviteeEmail: string, vaultId: string) {
  // 1. Current user must have vault access
  const vaultKey = await getVaultKey(vaultId);

  // 2. Get invitee's public key
  const invitee = await getUser(inviteeEmail);
  const inviteePublicKey = await crypto.subtle.importKey(
    "spki",
    invitee.publicKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  // 3. Wrap (encrypt) vault key with invitee's public key
  const wrappedVaultKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    inviteePublicKey,
    vaultKey
  );

  // 4. Store the wrapped key for the invitee
  await addVaultAccess({
    vaultId,
    userId: invitee.id,
    wrappedVaultKey,
  });

  // Invitee can now decrypt vault using their private key
}
```

### New User Login Flow

```typescript
async function loginAndAccessVault(password: string, vaultId: string) {
  // 1. Derive KEK from password
  const kek = await deriveKEK(password, user.salt);

  // 2. Decrypt private key
  const privateKey = await decryptAES(user.encryptedPrivateKey, kek);
  const cryptoPrivateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );

  // 3. Get wrapped vault key for this user
  const vaultAccess = await getVaultAccess(vaultId, user.id);

  // 4. Unwrap (decrypt) vault key using private key
  const vaultKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    cryptoPrivateKey,
    vaultAccess.wrappedVaultKey
  );

  // 5. Now can decrypt vault data
  return vaultKey;
}
```

### Revoking Access

```typescript
async function revokeUserAccess(userId: string, vaultId: string) {
  // 1. Delete the wrapped key for this user
  await deleteVaultAccess(vaultId, userId);

  // 2. Generate new vault key
  const newVaultKey = crypto.getRandomValues(new Uint8Array(32));

  // 3. Re-wrap for all remaining users
  const remainingUsers = await getVaultUsers(vaultId);
  for (const user of remainingUsers) {
    const wrappedKey = await wrapKeyForUser(newVaultKey, user.publicKey);
    await updateVaultAccess(vaultId, user.id, wrappedKey);
  }

  // 4. Re-encrypt all vault data with new key
  // (This is expensive but necessary for true revocation)
  await reEncryptVault(vaultId, oldVaultKey, newVaultKey);
}
```

### Security Note on Revocation

True revocation requires re-encrypting all data because:

- The revoked user may have cached the old vault key
- The revoked user may have downloaded encrypted events

For practical purposes, you might:

- Only re-encrypt data created AFTER revocation (new vault key for new events)
- Accept that historical data may be compromised
- Re-encrypt lazily over time

---

## 6. Event Batching Strategy

### Your Question

> What's the best batching strategy for events?

### Analysis

Batching serves multiple purposes:

1. **Reduce network overhead**: Fewer round-trips
2. **Reduce storage overhead**: Fewer document writes
3. **Improve UX**: Don't spam server on every keystroke
4. **Atomic operations**: Batch related changes together

### Recommended Strategy: Debounced Time-Based + Size-Based

```typescript
interface BatchConfig {
  debounceMs: number; // Wait for inactivity
  maxWaitMs: number; // Maximum time before forced flush
  maxEvents: number; // Maximum events before forced flush
  maxSizeBytes: number; // Maximum batch size before forced flush
}

const defaultConfig: BatchConfig = {
  debounceMs: 1000, // 1 second of inactivity triggers flush
  maxWaitMs: 5000, // Never wait more than 5 seconds
  maxEvents: 100, // Flush if 100 events queued
  maxSizeBytes: 64 * 1024, // Flush if batch exceeds 64KB
};

class EventBatcher {
  private queue: CRDTEvent[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private maxWaitTimer: NodeJS.Timeout | null = null;
  private firstEventTime: number | null = null;

  constructor(
    private config: BatchConfig,
    private onFlush: (events: CRDTEvent[]) => Promise<void>
  ) {}

  add(event: CRDTEvent) {
    this.queue.push(event);

    // Start max wait timer on first event
    if (!this.firstEventTime) {
      this.firstEventTime = Date.now();
      this.maxWaitTimer = setTimeout(() => this.flush(), this.config.maxWaitMs);
    }

    // Check size limits
    if (
      this.queue.length >= this.config.maxEvents ||
      this.estimateSize() >= this.config.maxSizeBytes
    ) {
      this.flush();
      return;
    }

    // Reset debounce timer
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), this.config.debounceMs);
  }

  async flush() {
    if (this.queue.length === 0) return;

    // Clear timers
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer);
    this.debounceTimer = null;
    this.maxWaitTimer = null;
    this.firstEventTime = null;

    // Take all events and clear queue
    const events = this.queue;
    this.queue = [];

    await this.onFlush(events);
  }

  private estimateSize(): number {
    return JSON.stringify(this.queue).length;
  }
}
```

### UI-Aware Batching

Consider triggering flushes on user actions:

```typescript
// Flush when user finishes editing a field
input.addEventListener("blur", () => batcher.flush());

// Flush when user navigates away
window.addEventListener("beforeunload", () => batcher.flush());

// Flush on explicit save
saveButton.addEventListener("click", () => batcher.flush());
```

### Batch Document Structure

Each batch becomes one encrypted document:

```typescript
interface EventBatch {
  id: string; // Batch UUID
  vaultId: string;
  events: CRDTEvent[]; // The actual events
  minHLC: HLCTimestamp; // Earliest event in batch
  maxHLC: HLCTimestamp; // Latest event in batch
  createdBy: string; // Node that created batch
  createdAt: number; // Wall clock (for debugging)
}

// Stored as encrypted blob
const encryptedBatch = await encrypt(JSON.stringify(batch), vaultKey);
```

---

## 7. Snapshot Compaction Strategy

### Your Question

> How should snapshot compaction work to prevent unbounded event log growth?

### Analysis

Without compaction:

- Event log grows forever
- New clients must replay ALL history
- Storage costs grow unbounded
- Sync time increases linearly

### Multi-Layer Compaction Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ Compaction Layers                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Event Batches (hot, recent)                       │
│  └── Last 24 hours of event batches                         │
│  └── Enables incremental sync for active users              │
│                                                             │
│  Layer 2: Recent Snapshot (warm)                            │
│  └── Full materialized state as of last compaction          │
│  └── Updated every N hours or M events                      │
│  └── Includes HLC of last included event                    │
│                                                             │
│  Layer 3: Archived Snapshots (cold, optional)               │
│  └── Historical snapshots for audit/recovery                │
│  └── Stored less frequently (weekly/monthly)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Snapshot Structure

```typescript
interface VaultSnapshot {
  id: string;
  vaultId: string;

  // Version tracking
  hlc: HLCTimestamp; // HLC of last included event
  eventBatchIds: string[]; // Which batches are included

  // Materialized state (encrypted)
  state: {
    transactions: Map<string, Transaction>;
    accounts: Map<string, Account>;
    people: Map<string, Person>;
    tags: Map<string, Tag>;
    statuses: Map<string, Status>;
    automations: Map<string, Automation>;
    imports: Map<string, Import>;
  };

  // Metadata
  createdAt: number;
  createdBy: string;
}
```

### Compaction Algorithm

```typescript
async function compactVault(vaultId: string) {
  // 1. Get current snapshot
  const currentSnapshot = await getLatestSnapshot(vaultId);

  // 2. Get all event batches since snapshot
  const newBatches = await getEventBatchesSince(vaultId, currentSnapshot.hlc);

  if (newBatches.length === 0) return; // Nothing to compact

  // 3. Apply events to snapshot state
  let state = currentSnapshot.state;
  let lastHLC = currentSnapshot.hlc;

  for (const batch of newBatches) {
    for (const event of batch.events) {
      state = applyEvent(state, event);
      if (compareHLC(event.hlc, lastHLC) > 0) {
        lastHLC = event.hlc;
      }
    }
  }

  // 4. Create new snapshot
  const newSnapshot: VaultSnapshot = {
    id: crypto.randomUUID(),
    vaultId,
    hlc: lastHLC,
    eventBatchIds: [
      ...currentSnapshot.eventBatchIds,
      ...newBatches.map(b => b.id),
    ],
    state,
    createdAt: Date.now(),
    createdBy: getCurrentNodeId(),
  };

  // 5. Store encrypted snapshot
  await storeSnapshot(newSnapshot);

  // 6. Optionally delete old event batches
  // (Keep some for incremental sync)
  await pruneOldEventBatches(vaultId, keepLastN: 100);
}
```

### Client Sync Flow

```typescript
async function syncVault(vaultId: string) {
  // 1. Check local state
  const localHLC = getLocalLastHLC(vaultId);

  // 2. Get server's latest snapshot
  const serverSnapshot = await fetchLatestSnapshot(vaultId);

  if (!localHLC || compareHLC(serverSnapshot.hlc, localHLC) > 0) {
    // 3a. We're behind - load snapshot first
    if (shouldUseSnapshot(localHLC, serverSnapshot.hlc)) {
      await loadSnapshot(serverSnapshot);
    }

    // 3b. Get event batches since our state
    const syncFromHLC = localHLC ?? serverSnapshot.hlc;
    const batches = await fetchEventBatchesSince(vaultId, syncFromHLC);

    for (const batch of batches) {
      await applyEventBatch(batch);
    }
  }

  // 4. Subscribe to real-time updates
  subscribeToEvents(vaultId, (event) => applyEvent(event));
}

function shouldUseSnapshot(localHLC: HLCTimestamp | null, snapshotHLC: HLCTimestamp): boolean {
  if (!localHLC) return true; // First sync

  // Use snapshot if we're very far behind (heuristic)
  const hoursBehind = (snapshotHLC.wallTime - localHLC.wallTime) / (1000 * 60 * 60);
  return hoursBehind > 24; // More than 24 hours behind
}
```

### When to Trigger Compaction

```typescript
const compactionTriggers = {
  // Time-based
  maxHoursSinceLastCompaction: 24,

  // Size-based
  maxEventBatchesSinceSnapshot: 100,
  maxEventsSinceSnapshot: 10000,

  // On-demand
  onClientRequest: true, // Client can request compaction
  onUserIdle: true, // Compact when vault has no active users
};
```

---

## 8. Security Concerns

### 🔴 Critical Issues

1. **Password Strength Enforcement**
   - 20-character minimum mentioned in spec is good
   - Consider: passphrase suggestions, breached password checking
   - Recommendation: Use zxcvbn for strength estimation

2. **Authentication Key Separation**
   - Never use the same key for auth and encryption
   - Server should only see authentication proof, never KEK
   - Recommendation: Derive auth key and KEK separately from password

3. **Client-Side Key Storage**
   - Never persist decrypted keys to localStorage
   - Use session-only memory or Web Crypto non-extractable keys
   - Recommendation: Clear keys on tab close, re-derive on session resume

### 🟡 Important Considerations

4. **Metadata Leakage**
   - Server can see: when users sync, document sizes, access patterns
   - Timestamps reveal activity patterns
   - Recommendation: Consider padding documents, batching queries

5. **Nonce/IV Reuse**
   - AES-GCM requires unique nonce per encryption
   - Reusing nonce = catastrophic key recovery
   - Recommendation: Use random 12-byte nonce, never counter-based

6. **Forward Secrecy**
   - If vault key is compromised, all historical data is exposed
   - True forward secrecy is complex in async systems
   - Recommendation: Document the tradeoff, consider periodic key rotation

### 🟢 Good Practices to Maintain

7. **Server Knows Nothing**
   - Server stores only encrypted blobs
   - No server-side queries on plaintext
   - RLS based on vault membership, not data content

8. **Audit Trail**
   - Event sourcing naturally provides audit trail
   - Consider: signed events, tamper detection

---

## 9. Additional Recommendations

### Architecture Improvements

1. **Use Supabase Realtime (not Vercel Blob)**
   - Real-time WebSocket is essential for collaboration
   - Vercel Blob's 60s cache makes it unsuitable
   - Supabase's free tier is generous

2. **Consider PowerSync as Alternative**
   - Documented E2EE support
   - Better offline handling
   - More batteries-included

3. **Separate Auth from Encryption**
   - Use Supabase Auth for session management
   - Derive encryption keys client-side only
   - Server never sees encryption keys

### Implementation Priorities

1. **Phase 1**: Single-user encrypted vault (simplest case)
2. **Phase 2**: Multi-device sync for single user
3. **Phase 3**: Multi-user vault sharing
4. **Phase 4**: Key rotation and revocation

### Testing Strategy

1. **Conflict Resolution Tests**: Simulate concurrent edits, verify convergence
2. **Encryption Tests**: Verify server never sees plaintext
3. **Key Derivation Tests**: Verify parameters meet security targets
4. **Sync Tests**: Simulate offline/online transitions
5. **Compaction Tests**: Verify snapshot + events produce correct state

---

## Summary Recommendations

| Question                         | Recommendation                                        |
| -------------------------------- | ----------------------------------------------------- |
| 1. Vector clock vs alternatives? | **Use HLC** - simpler, sufficient for LWW semantics   |
| 2. Conflict resolution?          | **Field-level LWW-Map** + **OR-Set** for collections  |
| 3. Key derivation?               | **Argon2id** with 64MB memory, 3 iterations           |
| 4. Key rotation?                 | **Key hierarchy** - only re-encrypt vault key wrapper |
| 5. Multi-user key sharing?       | **Asymmetric key wrapping** per user                  |
| 6. Batching strategy?            | **1s debounce** + 5s max wait + 100 event cap         |
| 7. Snapshot compaction?          | **Periodic snapshots** + event pruning after 24h      |

The architecture is sound. Focus implementation effort on:

1. Getting the key hierarchy right (security-critical)
2. Thorough testing of conflict resolution
3. Graceful offline handling
