# Data Model: MoneyFlow Core MVP

**Date**: 2025-12-24  
**Status**: Draft  
**CRDT Library**: [Loro](https://loro.dev) v1.0+

## Overview

MoneyFlow uses **Loro CRDT** for conflict-free sync with client-side encryption. All domain data lives inside encrypted "Vault" documents stored as Loro CRDT state. The server only stores and syncs encrypted binary blobs—it never sees plaintext financial data.

**Authentication Model**: Key-only auth (no email/password). Users generate a BIP39 seed phrase which derives their identity keypair. The server has zero knowledge of user identity—only opaque `pubkey_hash` values.

### Key Architectural Decisions

| Aspect              | Decision                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **CRDT Library**    | Loro - handles versioning, merging, and conflict resolution                                 |
| **State Layer**     | `loro-mirror` - schema-validated bidirectional sync between app state and LoroDoc           |
| **React Binding**   | `loro-mirror-react` - React hooks (`useLoroSelector`, `useLoroAction`, `createLoroContext`) |
| **Data Model**      | LoroDoc with nested LoroMap/LoroList containers, defined via loro-mirror schema             |
| **Authentication**  | Key-only: BIP39 seed phrase → Ed25519 keypair; pubkey_hash as identity                      |
| **Session Storage** | Keypair held in sessionStorage; seed entered each session (no local persistence)            |
| **Encryption**      | XChaCha20-Poly1305 for vault data; X25519 for key wrapping                                  |
| **Sync Protocol**   | Export binary updates → encrypt → store/relay → decrypt → import                            |
| **Aggregate Roots** | `Vault` (LoroDoc with all financial data); user identity is just a keypair                  |

### Why Loro Instead of Custom Event Sourcing

The previous design defined explicit event types (PersonCreated, TransactionUpdated, etc.). With Loro:

1. **No explicit event types needed** - Loro tracks operations internally
2. **Built-in version vectors** - No need to implement HLC ourselves
3. **Binary updates** - `doc.export()` returns `Uint8Array`, perfect for encryption
4. **Reactive subscriptions** - Loro emits change events for UI updates
5. **Tested algorithms** - Fugue for lists, LWW for maps, all battle-tested

The "events" are now Loro's internal operation log, which we export, encrypt, and sync.

### Why loro-mirror + loro-mirror-react for React Integration

Rather than interacting with the low-level Loro API directly, we use `loro-mirror` (core) + `loro-mirror-react` (React bindings):

**loro-mirror (core):**

1. **Schema definition** - Define typed schemas with validation (`schema.LoroMap`, `schema.LoroList`, etc.)
2. **Bidirectional sync** - Mirror class syncs app state ↔ LoroDoc automatically
3. **Draft-style mutations** - `setState()` accepts Immer-style draft mutations; **ALWAYS use draft style** so loro-mirror can track exactly which fields changed and generate optimal CRDT operations
4. **`$cid` injection** - Loro container IDs auto-injected for stable React keys

**⚠️ IMPORTANT**: Always use draft-style mutations with `setState()`, never return new objects:

```typescript
// ✅ CORRECT: Draft-style mutation - loro-mirror tracks the change precisely
setState((draft) => {
  draft.transactions[id].amount = newAmount;
});

// ❌ WRONG: Returning new object - loro-mirror can't see what changed
setState((state) => ({
  ...state,
  transactions: {
    ...state.transactions,
    [id]: { ...state.transactions[id], amount: newAmount },
  },
}));
```

**loro-mirror-react (React bindings):**

1. **`createLoroContext(schema)`** - Creates typed provider and hooks
2. **`useLoroSelector(fn)`** - Subscribe to specific state slices, efficient re-renders
3. **`useLoroAction(fn, deps)`** - Create synchronous mutation actions
4. **`useLoroState()`** - Full state access with setter

This keeps React code idiomatic while loro-mirror handles CRDT complexity underneath.

---

## 1. Authentication Model (Key-Only)

MoneyFlow uses **key-only authentication**—no email, no password recovery, maximum privacy. The server never knows who users are, only opaque `pubkey_hash` identifiers.

### 1.1 Identity Derivation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FIRST TIME SETUP                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Generate BIP39 seed phrase (12 words, 128-bit entropy)               │
│  2. User writes down seed phrase (this IS their identity)                │
│  3. Derive keypair:                                                      │
│                                                                          │
│     seed phrase ──► BIP39 ──► masterSeed ──► Ed25519 keypair             │
│                                                                          │
│  4. pubkeyHash = BLAKE2b(publicKey) ── server identity                   │
│  5. Store keypair in sessionStorage until tab closes                     │
└─────────────────────────────────────────────────────────────────────────┘

EACH SESSION:
┌─────────────────────────────────────────────────────────────────────────┐
│  1. User enters 12-word seed phrase                                      │
│  2. seed phrase ──► BIP39 ──► keypair                                    │
│  3. Store keypair in sessionStorage                                      │
│  4. Ready to use - keypair cleared when tab closes                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Security model**: The seed phrase IS the identity. No local storage of secrets means nothing to exfiltrate. Users should use a password manager to store their seed phrase.

**Future enhancement**: WebAuthn PRF extension could provide hardware-backed "remember me" functionality where supported, deriving encryption keys via biometrics without storing secrets locally.

### 1.2 Session Storage Schema

```typescript
// Stored in sessionStorage (per-session, cleared on tab close)
interface SessionData {
  publicKey: string; // Ed25519 signing public key, base64
  secretKey: string; // Ed25519 signing secret key, base64
  encPublicKey: string; // X25519 encryption public key, base64
  encSecretKey: string; // X25519 encryption secret key, base64
  pubkeyHash: string; // BLAKE2b hash of signing publicKey, base64
}

// Nothing stored in localStorage - seed entered each session
```

### 1.3 Crypto Implementation

**Key Derivation Strategy**: We use HKDF with domain separation to derive multiple keys from a single master seed. This ensures that compromising one key type doesn't compromise others.

```typescript
import sodium from "libsodium-wrappers";
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

// Domain separation constants - NEVER change these after launch
const DOMAIN_ED25519_SIGNING = "moneyflow-v1-ed25519-signing";
const DOMAIN_X25519_ENCRYPTION = "moneyflow-v1-x25519-encryption";

// Derive domain-separated keys from master seed
function deriveKeys(masterSeed: Uint8Array): {
  signingKeypair: sodium.KeyPair;
  encryptionKeypair: { publicKey: Uint8Array; privateKey: Uint8Array };
} {
  // Ed25519 signing key (for request authentication)
  const signingSeed = hkdf(sha256, masterSeed, undefined, DOMAIN_ED25519_SIGNING, 32);
  const signingKeypair = sodium.crypto_sign_seed_keypair(signingSeed);

  // X25519 encryption key (for vault key wrapping)
  const encryptionSeed = hkdf(sha256, masterSeed, undefined, DOMAIN_X25519_ENCRYPTION, 32);
  const encryptionKeypair = sodium.crypto_box_seed_keypair(encryptionSeed);

  return { signingKeypair, encryptionKeypair };
}

// === FIRST TIME SETUP (generates new identity) ===
// Note: createIdentity() only generates keys. Session is stored and
// server registration happens after user confirms they saved the phrase.
async function createIdentity(): Promise<{
  mnemonic: string;
  signingKeypair: sodium.KeyPair;
  encryptionKeypair: { publicKey: Uint8Array; privateKey: Uint8Array };
  pubkeyHash: string;
}> {
  await sodium.ready;

  // 1. Generate seed phrase
  const mnemonic = bip39.generateMnemonic(wordlist, 128); // 12 words

  // 2. Derive master seed and domain-separated keys
  const masterSeed = await bip39.mnemonicToSeed(mnemonic);
  const { signingKeypair, encryptionKeypair } = deriveKeys(new Uint8Array(masterSeed));

  // 3. Hash public key for server identity (signing key is the identity)
  const pubkeyHash = sodium.to_base64(sodium.crypto_generichash(32, signingKeypair.publicKey));

  // 4. Return identity for display - DO NOT store yet!
  // Session storage and server registration happen only after
  // user confirms they've written down the seed phrase.
  return { mnemonic, signingKeypair, encryptionKeypair, pubkeyHash };
}

// === STORE SESSION (after user confirms seed phrase) ===
function storeIdentitySession(identity: {
  signingKeypair: sodium.KeyPair;
  encryptionKeypair: { publicKey: Uint8Array; privateKey: Uint8Array };
  pubkeyHash: string;
}): void {
  sessionStorage.setItem(
    "moneyflow_session",
    JSON.stringify({
      publicKey: sodium.to_base64(identity.signingKeypair.publicKey),
      secretKey: sodium.to_base64(identity.signingKeypair.privateKey),
      encPublicKey: sodium.to_base64(identity.encryptionKeypair.publicKey),
      encSecretKey: sodium.to_base64(identity.encryptionKeypair.privateKey),
      pubkeyHash: identity.pubkeyHash,
    })
  );
}

// === EACH SESSION (enter seed phrase) ===
async function unlockWithSeed(mnemonic: string): Promise<{
  signingKeypair: sodium.KeyPair;
  encryptionKeypair: { publicKey: Uint8Array; privateKey: Uint8Array };
  pubkeyHash: string;
}> {
  await sodium.ready;

  // Validate mnemonic
  if (!bip39.validateMnemonic(mnemonic, wordlist)) {
    throw new Error("Invalid recovery phrase");
  }

  // Derive master seed and domain-separated keys
  const masterSeed = await bip39.mnemonicToSeed(mnemonic);
  const { signingKeypair, encryptionKeypair } = deriveKeys(new Uint8Array(masterSeed));

  const pubkeyHash = sodium.to_base64(sodium.crypto_generichash(32, signingKeypair.publicKey));

  // Store in session only
  sessionStorage.setItem(
    "moneyflow_session",
    JSON.stringify({
      publicKey: sodium.to_base64(signingKeypair.publicKey),
      secretKey: sodium.to_base64(signingKeypair.privateKey),
      encPublicKey: sodium.to_base64(encryptionKeypair.publicKey),
      encSecretKey: sodium.to_base64(encryptionKeypair.privateKey),
      pubkeyHash,
    })
  );

  return { signingKeypair, encryptionKeypair, pubkeyHash };
}

// === LOGOUT ===
function logout(): void {
  sessionStorage.removeItem("moneyflow_session");
}
```

### 1.4 Nonce Strategy

**Critical**: XChaCha20-Poly1305 and XSalsa20-Poly1305 use 192-bit (24-byte) nonces. This allows safe random nonce generation without risk of collision.

```typescript
// ALWAYS use random nonces for XChaCha20-Poly1305 / XSalsa20-Poly1305
// The 192-bit nonce space is large enough that collisions are negligible
// (birthday bound ~2^96 encryptions before 50% collision chance)

function encryptVaultData(
  plaintext: Uint8Array,
  vaultKey: Uint8Array
): {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
} {
  // Generate random 24-byte nonce (192-bit)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES); // 24 bytes

  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, vaultKey);

  return { ciphertext, nonce };
}

function decryptVaultData(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  vaultKey: Uint8Array
): Uint8Array {
  const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, vaultKey);
  if (!plaintext) {
    throw new Error("Decryption failed - invalid key or corrupted data");
  }
  return plaintext;
}

// Storage format: nonce || ciphertext (nonce prepended for self-describing blobs)
function encryptForStorage(plaintext: Uint8Array, vaultKey: Uint8Array): Uint8Array {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, vaultKey);

  // Prepend nonce to ciphertext
  const result = new Uint8Array(nonce.length + ciphertext.length);
  result.set(nonce);
  result.set(ciphertext, nonce.length);
  return result;
}

function decryptFromStorage(blob: Uint8Array, vaultKey: Uint8Array): Uint8Array {
  const nonce = blob.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = blob.slice(sodium.crypto_secretbox_NONCEBYTES);
  return decryptVaultData(ciphertext, nonce, vaultKey);
}
```

**Nonce safety guarantees**:

- **Never reuse a nonce** with the same key (catastrophic for stream ciphers)
- **192-bit random nonces** are safe up to ~2^96 encryptions per key
- **Nonce prepended to ciphertext** so decryption is self-contained
- **No counter-based nonces** - random is simpler and safe with 192-bit space

### 1.5 Request Authentication

Every API request is signed with the user's Ed25519 key:

```typescript
async function signRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ headers: Record<string, string> }> {
  const session = JSON.parse(sessionStorage.getItem("moneyflow_session")!);
  const secretKey = sodium.from_base64(session.secretKey);
  const publicKey = sodium.from_base64(session.publicKey);

  const timestamp = Date.now().toString();
  const bodyHash = body
    ? sodium.to_base64(sodium.crypto_generichash(32, JSON.stringify(body)))
    : "";

  const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = sodium.crypto_sign_detached(sodium.from_string(message), secretKey);

  return {
    headers: {
      "X-Pubkey": sodium.to_base64(publicKey),
      "X-Timestamp": timestamp,
      "X-Signature": sodium.to_base64(signature),
    },
  };
}
```

---

## 1.6 Multi-Vault Architecture

A user can be a member of **multiple vaults**. Each vault is a completely independent data silo (like a tenant) containing its own accounts, people, tags, transactions, and settings.

### Conceptual Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER (Identity)                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  user_data.encrypted_data (stored on server, encrypted)           │  │
│  │  ├── vaults: [                                                    │  │
│  │  │    { id: "vault-1", wrappedKey: "..." },  ← vault key for user │  │
│  │  │    { id: "vault-2", wrappedKey: "..." },                       │  │
│  │  │  ]                                                             │  │
│  │  ├── globalSettings: {                                            │  │
│  │  │    activeVaultId: "vault-1",   ← last selected vault           │  │
│  │  │    theme: "dark",              ← app-wide settings             │  │
│  │  │    defaultCurrency: "USD",     ← fallback for imports          │  │
│  │  │  }                                                             │  │
│  │  └── (future: notification prefs, etc.)                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
              │
              │ User selects vault
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VAULT (Active Tenant Context)                         │
│  All UI screens below this level operate within vault context:           │
│  ├── /transactions  ──► vault's transactions                            │
│  ├── /accounts      ──► vault's accounts                                │
│  ├── /people        ──► vault's people (and presence)                   │
│  ├── /tags          ──► vault's tags                                    │
│  ├── /automations   ──► vault's automation rules                        │
│  ├── /statuses      ──► vault's statuses                                │
│  └── /imports       ──► vault's import history                          │
│                                                                          │
│  Vault-scoped settings stored IN vault CRDT:                            │
│  └── preferences: { automationCreationPreference, ... }                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### What Lives Where

| Data                                          | Location                                  | Scope                 |
| --------------------------------------------- | ----------------------------------------- | --------------------- |
| Vault list + wrapped keys                     | `user_data.encrypted_data`                | Global (user-level)   |
| Active vault selection                        | `user_data.encrypted_data.globalSettings` | Global (user-level)   |
| Theme, notifications                          | `user_data.encrypted_data.globalSettings` | Global (user-level)   |
| Default currency                              | `user_data.encrypted_data.globalSettings` | Global (user-level)   |
| Financial data (transactions, accounts, etc.) | Vault LoroDoc                             | Per-vault             |
| Automation creation preference                | Vault LoroDoc `preferences`               | Per-vault             |
| Account currency                              | Vault LoroDoc `accounts[].currency`       | Per-account           |
| Presence awareness                            | Vault EphemeralStore                      | Per-vault (ephemeral) |

### TypeScript Interface for User Data

```typescript
// Decrypted contents of user_data.encrypted_data
interface UserData {
  vaults: VaultReference[];
  globalSettings: GlobalSettings;
}

interface VaultReference {
  id: string; // Vault UUID
  wrappedKey: string; // Vault encryption key, wrapped with user's X25519 pubkey
  name?: string; // Cached vault name for selector UI (convenience)
}

interface GlobalSettings {
  activeVaultId: string | null; // Currently selected vault
  theme: "light" | "dark" | "system";
  defaultCurrency: string; // ISO 4217 code (e.g., "USD", "EUR") - used as fallback for imports
  // Future: notification preferences, etc.
}
```

### UI Architecture Implications

1. **Vault Selector** (top-right header) - Reads `globalSettings.activeVaultId`, lists `vaults[]`
2. **Vault Context Provider** - Wraps all `/app/(app)/*` routes, provides active vault's LoroDoc
3. **Route Guards** - If no vaults exist, redirect to vault creation; if no active vault, select first
4. **Presence** - Scoped to active vault; switching vaults clears presence from old vault

---

## 2. Server-Side Entities (Zero-Knowledge)

These entities are stored in Supabase Postgres. The server knows **nothing** about user identity—only opaque `pubkey_hash` values. All financial data is encrypted.

### 2.1 User Data (Encrypted)

```typescript
interface DbUserData {
  pubkey_hash: string; // BLAKE2b(publicKey) - primary key, opaque to server
  encrypted_data: string; // Encrypted: { vaults: [{id, wrappedKey}], settings }
  updated_at: Date;
}
```

**Notes**:

- No email, no name, no identifying information
- Server only sees the hash of the public key
- `encrypted_data` contains vault references and user settings, encrypted with user's key

### 2.2 Vault (Metadata Only)

```typescript
interface DbVault {
  id: string; // UUID, primary key
  created_at: Date;
}
```

### 2.3 VaultMembership

```typescript
interface DbVaultMembership {
  id: string; // UUID, primary key
  vault_id: string; // FK to Vault
  pubkey_hash: string; // User identity (hash of their signing public key)
  enc_public_key: string; // User's X25519 encryption public key (for re-keying)
  encrypted_vault_key: string; // Vault key wrapped with user's X25519 public key
  role: "owner" | "member";
  created_at: Date;
}
```

**Notes**:

- Each user gets the vault key encrypted specifically for them
- `enc_public_key` is stored so other members can wrap new keys for this user during re-keying
- Revoking access = removing membership + re-keying vault (generate new vault key, re-encrypt all data, wrap new key for each remaining member using their stored `enc_public_key`)

### 2.4 VaultInvite (Pending Invitations)

```typescript
interface DbVaultInvite {
  id: string; // UUID, primary key
  vault_id: string; // FK to Vault
  invite_pubkey: string; // Ephemeral pubkey derived from invite secret
  encrypted_vault_key: string; // Vault key wrapped with invite_pubkey
  role: "owner" | "member";
  created_by: string; // pubkey_hash of inviter
  expires_at: Date;
  created_at: Date;
}
```

**Notes**:

- `invite_pubkey` is derived from a secret shared out-of-band (URL fragment)
- Server cannot link invite to invitee until redemption
- Single-use: deleted after redemption

### 2.5 VaultSnapshot

```typescript
interface DbVaultSnapshot {
  id: string; // UUID, primary key
  vault_id: string; // FK to Vault
  version: number; // Monotonic version number
  hlc_timestamp: string; // HLC for ordering
  encrypted_data: string; // Encrypted Loro snapshot
  created_at: Date;
}
```

### 2.6 VaultUpdate

```typescript
interface DbVaultUpdate {
  id: string; // UUID, primary key
  vault_id: string; // FK to Vault
  base_snapshot_version: number;
  hlc_timestamp: string;
  encrypted_data: string; // Encrypted Loro update
  author_pubkey_hash: string; // Who pushed this update
  created_at: Date;
}
```

---

## 3. Vault Invitation Flow

Invitations work without knowing the invitee's identity until they redeem:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INVITE FLOW                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  INVITER (Alice):                                                        │
│  1. Generate random invite_secret (32 bytes)                             │
│  2. Derive invite_keypair = X25519(BLAKE2b(invite_secret))               │
│  3. Wrap vault_key with invite_pubkey                                    │
│  4. Upload: {vault_id, invite_pubkey, wrapped_key, expires_at}           │
│  5. Share URL: app.com/join#secret=<base64(invite_secret)>               │
│     └── URL fragment (#) never sent to server!                           │
│                                                                          │
│  INVITEE (Bob):                                                          │
│  1. Click link, extract invite_secret from URL fragment                  │
│  2. If no local identity: create new keypair, show seed phrase           │
│  3. Derive invite_keypair from invite_secret                             │
│  4. Fetch pending invite by invite_pubkey                                │
│  5. Decrypt vault_key using invite_privkey                               │
│  6. Re-wrap vault_key with Bob's own X25519 pubkey                       │
│  7. Create membership record (with Bob's pubkey_hash)                    │
│  8. Delete invite, update Bob's user_data                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Security properties:**

- Invite secret in URL fragment = never sent to server
- Server only sees `invite_pubkey` (ephemeral, unlinkable to invitee)
- Single-use: invite deleted on redemption
- Expiry: invites auto-expire (default 7 days)
- Invitee's real `pubkey_hash` only revealed when they redeem

---

## 4. Complete SQL Schema with RLS

```sql
-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES (Zero-Knowledge Design)
-- ============================================

-- User data: keyed by pubkey_hash, contains encrypted vault references
-- Server has NO knowledge of user identity
CREATE TABLE public.user_data (
  pubkey_hash TEXT PRIMARY KEY,           -- BLAKE2b(publicKey), opaque to server
  encrypted_data TEXT NOT NULL,           -- Encrypted: { vaults, settings }
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vaults (metadata only - no financial data)
CREATE TABLE public.vaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vault memberships (who can access which vault)
CREATE TABLE public.vault_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  pubkey_hash TEXT NOT NULL,              -- User identity (hash of signing public key)
  enc_public_key TEXT NOT NULL,           -- X25519 public key for re-keying operations
  encrypted_vault_key TEXT NOT NULL,      -- Vault key wrapped with user's X25519 pubkey
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_id, pubkey_hash)
);

-- Pending vault invitations
CREATE TABLE public.vault_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  invite_pubkey TEXT NOT NULL UNIQUE,     -- Ephemeral pubkey from invite secret
  encrypted_vault_key TEXT NOT NULL,      -- Vault key wrapped with invite_pubkey
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_by TEXT NOT NULL,               -- pubkey_hash of inviter
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup job
CREATE INDEX idx_vault_invites_expires ON public.vault_invites(expires_at);

-- Vault snapshots (encrypted Loro doc.export({ mode: 'snapshot' }))
CREATE TABLE public.vault_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  hlc_timestamp TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_id, version)
);

-- Index for loading latest snapshot
CREATE INDEX idx_vault_snapshots_vault_version
  ON public.vault_snapshots(vault_id, version DESC);

-- Vault updates (encrypted Loro doc.export({ mode: 'update' }))
CREATE TABLE public.vault_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  base_snapshot_version INTEGER NOT NULL,
  hlc_timestamp TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  author_pubkey_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for loading updates after snapshot
CREATE INDEX idx_vault_updates_vault_created
  ON public.vault_updates(vault_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_updates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's pubkey_hash from request header
-- Set via tRPC middleware after signature verification
CREATE OR REPLACE FUNCTION public.current_pubkey_hash()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.pubkey_hash', true), '');
$$ LANGUAGE sql STABLE;

-- Check if current user is a vault member
CREATE OR REPLACE FUNCTION public.is_vault_member(p_vault_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user is vault owner
CREATE OR REPLACE FUNCTION public.is_vault_owner(p_vault_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_memberships
    WHERE vault_id = p_vault_id
      AND pubkey_hash = public.current_pubkey_hash()
      AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES: user_data
-- ============================================

-- Users can only read/write their own data
CREATE POLICY "Users can access own data"
  ON public.user_data FOR ALL
  USING (pubkey_hash = public.current_pubkey_hash())
  WITH CHECK (pubkey_hash = public.current_pubkey_hash());

-- ============================================
-- RLS POLICIES: vaults
-- ============================================

-- Users can only see vaults they're members of
CREATE POLICY "Members can view vaults"
  ON public.vaults FOR SELECT
  USING (public.is_vault_member(id));

-- Authenticated users can create vaults
CREATE POLICY "Users can create vaults"
  ON public.vaults FOR INSERT
  WITH CHECK (public.current_pubkey_hash() IS NOT NULL);

-- Only owners can delete vaults
CREATE POLICY "Owners can delete vaults"
  ON public.vaults FOR DELETE
  USING (public.is_vault_owner(id));

-- ============================================
-- RLS POLICIES: vault_memberships
-- ============================================

-- Users can see memberships for vaults they belong to
CREATE POLICY "Members can view vault memberships"
  ON public.vault_memberships FOR SELECT
  USING (public.is_vault_member(vault_id));

-- Only owners can add members
CREATE POLICY "Owners can add members"
  ON public.vault_memberships FOR INSERT
  WITH CHECK (public.is_vault_owner(vault_id));

-- Users can remove themselves; owners can remove anyone
CREATE POLICY "Members can leave or owners can remove"
  ON public.vault_memberships FOR DELETE
  USING (
    pubkey_hash = public.current_pubkey_hash()
    OR public.is_vault_owner(vault_id)
  );

-- ============================================
-- RLS POLICIES: vault_invites
-- ============================================

-- Anyone can read invites by invite_pubkey (for redemption)
CREATE POLICY "Invites readable by invite_pubkey"
  ON public.vault_invites FOR SELECT
  USING (true);

-- Only vault owners can create invites
CREATE POLICY "Owners can create invites"
  ON public.vault_invites FOR INSERT
  WITH CHECK (public.is_vault_owner(vault_id));

-- Anyone can delete invites (for redemption cleanup)
CREATE POLICY "Invites deletable"
  ON public.vault_invites FOR DELETE
  USING (true);

-- ============================================
-- RLS POLICIES: vault_snapshots
-- ============================================

CREATE POLICY "Members can read snapshots"
  ON public.vault_snapshots FOR SELECT
  USING (public.is_vault_member(vault_id));

CREATE POLICY "Members can create snapshots"
  ON public.vault_snapshots FOR INSERT
  WITH CHECK (public.is_vault_member(vault_id));

CREATE POLICY "Members can delete snapshots"
  ON public.vault_snapshots FOR DELETE
  USING (public.is_vault_member(vault_id));

-- ============================================
-- RLS POLICIES: vault_updates
-- ============================================

CREATE POLICY "Members can read updates"
  ON public.vault_updates FOR SELECT
  USING (public.is_vault_member(vault_id));

CREATE POLICY "Members can create updates"
  ON public.vault_updates FOR INSERT
  WITH CHECK (public.is_vault_member(vault_id));

CREATE POLICY "Members can delete updates"
  ON public.vault_updates FOR DELETE
  USING (public.is_vault_member(vault_id));

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable Realtime for vault_updates (sync notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_updates;

-- Note: RLS automatically filters Realtime events.
-- Users only receive INSERT events for vaults they're members of.

-- ============================================
-- CLEANUP
-- ============================================

-- Function to delete expired invites (run via pg_cron or Edge Function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
RETURNS void AS $$
  DELETE FROM public.vault_invites WHERE expires_at < NOW();
$$ LANGUAGE sql;
```

### 4.1 Security Summary

| Data              | Stored As                                              | Who Can Access                               |
| ----------------- | ------------------------------------------------------ | -------------------------------------------- |
| User identity     | `pubkey_hash` (opaque hash)                            | Server sees hash only, cannot reverse        |
| User's vault list | Encrypted in `user_data.encrypted_data`                | Only the user (needs their keypair)          |
| Financial data    | Encrypted blobs in `vault_snapshots` / `vault_updates` | Only vault members (RLS) + client decryption |
| Vault key         | Wrapped per-user in `vault_memberships`                | Only the specific user (asymmetric crypto)   |
| Pending invites   | Wrapped with ephemeral key in `vault_invites`          | Only holder of invite secret                 |

**The server never sees:**

- User's real public key (only hash)
- Any identifying information (no email, name, etc.)
- Decrypted financial data
- Vault encryption keys
- Invite secrets (only derived pubkeys)

---

## 5. Client-Side Entities (Decrypted Domain Model)

These types represent the **decrypted state** that clients work with after loading and decrypting vault data. With Loro, this is accessed via `doc.toJSON()` or individual container accessors.

### 2.1 Loro Document Structure

```typescript
import { LoroDoc, LoroMap, LoroList } from "loro-crdt";

// The vault is a single LoroDoc
const vault = new LoroDoc();

// Top-level collections are LoroMaps keyed by entity ID
const people = vault.getMap("people"); // string -> LoroMap
const accounts = vault.getMap("accounts"); // string -> LoroMap
const tags = vault.getMap("tags"); // string -> LoroMap
const transactions = vault.getMap("transactions"); // string -> LoroMap
const imports = vault.getMap("imports"); // string -> LoroMap
const importTemplates = vault.getMap("importTemplates");
const statuses = vault.getMap("statuses"); // string -> LoroMap
const automations = vault.getMap("automations"); // string -> LoroMap
const preferences = vault.getMap("preferences"); // Vault-scoped preferences
```

### 2.2 Entity Schema via Loro Containers

Each entity is a nested LoroMap. For collections within entities (like tags on a transaction), we use LoroList.

```typescript
// Example: Creating a transaction
function createTransaction(vault: LoroDoc, data: TransactionInput): string {
  const id = crypto.randomUUID();
  const transactions = vault.getMap("transactions");

  const tx = transactions.setContainer(id, new LoroMap());
  tx.set("date", data.date);
  tx.set("merchant", data.merchant);
  tx.set("description", data.description);
  tx.set("amount", data.amount);
  tx.set("accountId", data.accountId);
  tx.set("statusId", data.statusId);
  tx.set("importId", data.importId ?? null);
  tx.set("createdAt", Date.now());

  // Tags are a LoroList for concurrent-safe add/remove
  const tags = tx.setContainer("tagIds", new LoroList());
  for (const tagId of data.tagIds ?? []) {
    tags.push(tagId);
  }

  // Allocations are a LoroMap (personId -> percentage)
  if (data.allocations) {
    const allocs = tx.setContainer("allocations", new LoroMap());
    for (const [personId, pct] of Object.entries(data.allocations)) {
      allocs.set(personId, pct);
    }
  }

  return id;
}
```

**Note**: Loro handles all versioning, HLC, and conflict resolution internally. We don't need to define explicit event types—Loro tracks operations in its internal log.

### 2.3 Supporting Types

```typescript
// Automation condition (stored as JSON within LoroMap)
interface AutomationCondition {
  id: string;
  column: "merchant" | "description" | "amount" | "accountId";
  operator: "contains" | "regex";
  value: string;
  caseSensitive: boolean;
}

// Automation action (stored as JSON within LoroMap)
interface AutomationAction {
  id: string;
  type: "setTags" | "setAllocation" | "setStatus";
  value: unknown; // Type depends on action type
}

// Action value types
type SetTagsValue = string[]; // Tag IDs
type SetAllocationValue = { personId: string; percentage: number }[];
type SetStatusValue = string; // Status ID
```

### 2.4 TypeScript Interfaces (Derived via toJSON())

When you call `doc.toJSON()` or `container.toJSON()`, Loro returns plain JavaScript objects. These are the shapes:

```typescript
// Full vault state (via doc.toJSON())
interface VaultState {
  people: Record<string, Person>;
  accounts: Record<string, Account>;
  tags: Record<string, Tag>;
  transactions: Record<string, Transaction>;
  imports: Record<string, Import>;
  importTemplates: Record<string, ImportTemplate>;
  statuses: Record<string, Status>;
  automations: Record<string, Automation>;
  preferences: VaultPreferences;
}

interface Person {
  id: string;
  name: string;
  linkedUserId?: string;
  deletedAt?: number; // Soft delete timestamp
}

interface Account {
  id: string;
  name: string;
  accountNumber?: string;
  currency: string;
  accountType: "checking" | "savings" | "credit" | "cash" | "loan";
  balance: number;
  ownerships: Record<string, number>; // personId -> percentage (via LoroMap.toJSON())
  deletedAt?: number;
}

interface Tag {
  id: string;
  name: string;
  parentTagId?: string;
  isTransfer: boolean;
  deletedAt?: number;
}

interface Transaction {
  id: string;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  accountId: string;
  tagIds: string[]; // LoroList.toJSON() returns array
  statusId: string;
  importId?: string;
  allocations: Record<string, number>; // personId -> percentage
  duplicateOf?: string; // ID of suspected original transaction (set on import, cleared on Keep)
  deletedAt?: number;
}

interface Import {
  id: string;
  filename: string;
  transactionCount: number;
  createdAt: number;
  deletedAt?: number;
}

interface ImportTemplate {
  id: string;
  name: string;
  columnMappings: Record<string, string>;
  formatting: {
    hasHeaders: boolean;
    thousandSeparator: string;
    decimalSeparator: string;
    dateFormat: string;
  };
  deletedAt?: number;
}

interface Status {
  id: string;
  name: string;
  behavior: "treatAsPaid" | null;
  isDefault: boolean;
  deletedAt?: number;
}

interface Automation {
  id: string;
  name: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  order: number;
  excludedTransactionIds: string[]; // LoroList of excluded transaction IDs
  deletedAt?: number;
}

// Vault-scoped preferences (stored in vault CRDT, synced across vault members)
interface VaultPreferences {
  automationCreationPreference: "createAutomatically" | "manual";
}
```

---

## 6. Loro Operations (Replaces Event Replay)

With Loro, we don't write explicit event replay logic. Loro handles state derivation internally.

### 3.1 How Loro Replaces Event Sourcing

| Custom Event Sourcing  | Loro Equivalent                            |
| ---------------------- | ------------------------------------------ |
| Define event types     | Loro tracks operations internally          |
| Apply events to state  | `doc.import(update)` merges automatically  |
| HLC for ordering       | Loro's version vectors                     |
| State reducer function | Not needed - Loro containers are the state |

### 3.2 Reading State

```typescript
// Option 1: Get full vault as JSON
const state = vault.toJSON() as VaultState;

// Option 2: Access specific containers
const transactions = vault.getMap("transactions");
const tx = transactions.get(txId) as LoroMap | undefined;
const amount = tx?.get("amount");

// Option 3: Subscribe to changes
transactions.subscribe((event) => {
  if (event.by === "import") {
    // Remote change
  }
  refreshUI();
});
```

### 3.3 Conflict Resolution

Loro handles conflicts automatically:

- **LoroMap fields**: Last-writer-wins (per-field, not per-object)
- **LoroList**: Concurrent additions preserved (Fugue algorithm)
- **Soft deletes**: We use `deletedAt` field, so "undelete" is just clearing it

---

## 7. Sync Flow (with Key-Only Auth)

### 7.1 Initial Load

```
1. User enters password → decrypt local seed → derive keypair
2. Sign request with Ed25519 key
3. Fetch user_data by pubkey_hash, decrypt
4. For each vault in user_data.vaults:
   a. Unwrap vault key with X25519 private key
   b. Create new LoroDoc
   c. Fetch latest snapshot from vault_snapshots
   d. Decrypt snapshot with vault key → doc.import(decrypted)
   e. Fetch all updates after snapshot
   f. For each update: decrypt → doc.import(decrypted)
   g. Subscribe to new updates via Realtime
```

### 7.2 Real-time Sync

```
1. User makes edit (e.g., changes transaction amount)
2. Mutate Loro container: tx.set('amount', newAmount)
3. UI updates immediately (Loro subscriptions)
4. After debounce (1s or significant changes):
   a. Export changes: doc.export({ mode: 'update', from: lastSyncVersion })
   b. Encrypt update with vault key
   c. Sign and insert into vault_updates table
   d. Save lastSyncVersion = doc.version()
5. Other clients receive via Realtime subscription:
   a. Decrypt update with vault key
   b. doc.import(decrypted) - Loro handles merge
   c. UI updates automatically via subscriptions
```

### 7.3 Snapshot Creation

```
1. Client detects snapshot needed:
   - App closing/backgrounding
   - Idle for 5+ minutes with pending changes
   - 100+ operations since last snapshot
2. Export full state: doc.export({ mode: 'snapshot' })
3. Encrypt snapshot with vault key
4. Sign and upsert into vault_snapshots
```

### 7.4 Presence Awareness (EphemeralStore)

Loro's EphemeralStore provides real-time presence awareness without persisting to the CRDT document. Presence data expires automatically after 30 seconds (configurable timeout).

**Encryption**: Presence data is encrypted using the same XChaCha20-Poly1305 cipher as vault data, but with a **single-pass HKDF** (no iterations) to minimize latency. The presence key is derived from the vault key with domain `moneyflow-v1-presence`. This ensures presence data is only readable by vault members while keeping encryption fast enough for 100ms propagation targets.

#### Presence Data Schema

```typescript
import { EphemeralStore } from "loro-crdt";

// Presence payload broadcast by each client
interface PresenceData {
  personId: string; // Person ID in vault (links to people collection)
  name: string; // Display name for avatar tooltip
  initials: string; // 2-char initials for avatar circle
  color: string; // Unique hex color per user (derived from pubkeyHash)
  activeRow?: string; // Transaction ID currently focused (optional)
  activeCell?: string; // Column name being edited (optional)
  lastSeen: number; // Unix timestamp (ms)
}

// EphemeralStore key format: pubkeyHash (unique per session)
// EphemeralStore value: JSON-encoded PresenceData
```

#### Presence Key Derivation

```typescript
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

// Derive presence key from vault key (single-pass, no iterations for speed)
function derivePresenceKey(vaultKey: Uint8Array): Uint8Array {
  return hkdf(sha256, vaultKey, undefined, "moneyflow-v1-presence", 32);
}
```

#### Presence Flow

```typescript
import { EphemeralStore } from "loro-crdt";
import { encrypt, decrypt } from "./crypto"; // Same XChaCha20-Poly1305 helpers

// Initialize ephemeral store (separate from main Loro doc)
const presence = new EphemeralStore({ timeout: 30_000 }); // 30s expiry
const presenceKey = derivePresenceKey(vaultKey);

// Broadcast own presence
function updatePresence(data: Partial<PresenceData>) {
  const myPresence: PresenceData = {
    personId: session.personId,
    name: session.displayName,
    initials: getInitials(session.displayName),
    color: hashToColor(session.pubkeyHash),
    lastSeen: Date.now(),
    ...data,
  };
  presence.set(session.pubkeyHash, JSON.stringify(myPresence));
}

// Send presence updates via Supabase Realtime broadcast (encrypted)
function syncPresence() {
  const encoded = presence.encode();
  const encrypted = encrypt(encoded, presenceKey); // XChaCha20-Poly1305
  supabaseChannel.send({
    type: "broadcast",
    event: "presence",
    payload: { data: Array.from(encrypted) },
  });
}

// Receive presence updates from other clients (decrypt first)
supabaseChannel.on("broadcast", { event: "presence" }, (msg) => {
  const encrypted = new Uint8Array(msg.payload.data);
  const decrypted = decrypt(encrypted, presenceKey);
  if (decrypted) {
    presence.apply(decrypted);
  }
});

// Subscribe to presence changes
presence.subscribe((event) => {
  const allStates = presence.getAllStates();
  const activePeers = Object.entries(allStates)
    .map(([key, value]) => ({
      key,
      ...(JSON.parse(value as string) as PresenceData),
    }))
    .filter((p) => p.key !== session.pubkeyHash); // Exclude self
  updatePresenceUI(activePeers);
});
```

#### Color Generation

```typescript
// Deterministic color from pubkey hash (for consistent avatar colors)
function hashToColor(pubkeyHash: string): string {
  // Use first 6 chars of hash as hue seed
  const hue = parseInt(pubkeyHash.slice(0, 6), 16) % 360;
  // Fixed saturation/lightness for good contrast
  return `hsl(${hue}, 70%, 60%)`;
}

// Generate initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
```

#### Presence Update Triggers

| Event                        | Update                             |
| ---------------------------- | ---------------------------------- |
| User focuses transaction row | `activeRow = transactionId`        |
| User starts editing cell     | `activeCell = columnName`          |
| User finishes editing        | `activeCell = undefined`           |
| User navigates away          | `activeRow = undefined`            |
| Heartbeat (every 10s)        | Refresh `lastSeen` timestamp       |
| Tab/window blur              | Clear `activeRow` and `activeCell` |

---

## 8. Invariants & Validation

### 8.1 Business Rules

| Entity          | Rule                                                            |
| --------------- | --------------------------------------------------------------- |
| **Account**     | `sum(ownerships.percentage) === 100`                            |
| **Transaction** | `allocations` can sum to any value (remainder → account owners) |
| **Allocation**  | Can be negative (flips credit/debit direction)                  |
| **Status**      | At least one status with `isDefault === true` must exist        |
| **Automation**  | `conditions` must be non-empty; `order` must be unique          |

### 6.2 Zod Schemas (for validation)

```typescript
import { z } from "zod";

const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  linkedUserId: z.string().uuid().optional(),
  deletedAt: z.number().optional(),
});

const AccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  accountNumber: z.string().max(50).optional(),
  currency: z.string().length(3), // ISO 4217
  accountType: z.enum(["checking", "savings", "credit", "cash", "loan"]),
  balance: z.number(),
  ownerships: z
    .record(z.string().uuid(), z.number())
    .refine((o) => Object.values(o).reduce((sum, x) => sum + x, 0) === 100, {
      message: "Ownership percentages must sum to 100",
    }),
  deletedAt: z.number().optional(),
});

const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  parentTagId: z.string().uuid().optional(),
  isTransfer: z.boolean(),
  deletedAt: z.number().optional(),
});

const TransactionSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  merchant: z.string().max(200),
  description: z.string().max(500),
  amount: z.number(),
  accountId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()),
  statusId: z.string().uuid(),
  importId: z.string().uuid().optional(),
  allocations: z.record(z.string().uuid(), z.number()),
  deletedAt: z.number().optional(),
});

// ... similar for other entities
```

---

## 9. Default Data

When a new vault is created, initialize with:

```typescript
const DEFAULT_STATUSES: Status[] = [
  {
    id: generateUUID(),
    name: "For Review",
    behavior: null,
    isDefault: true,
  },
  {
    id: generateUUID(),
    name: "Paid",
    behavior: "treatAsPaid",
    isDefault: false,
  },
];

const DEFAULT_VAULT_PREFERENCES: VaultPreferences = {
  automationCreationPreference: "createAutomatically",
};
```
