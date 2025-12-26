# Cryptographic Architecture Flowchart

**Date**: 2025-12-26  
**Purpose**: Visual summary of all cryptographic flows in MoneyFlow

---

## Master Flowchart: From Seed Phrase to Encrypted Data

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IDENTITY CREATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  128 bits of randomness (crypto.getRandomValues)                     │   │
│  │  └── "Flip a perfectly fair coin 128 times"                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  BIP39 ENCODING                                                      │   │
│  │  ├── Add 4-bit checksum (SHA-256 of entropy, first 4 bits)          │   │
│  │  ├── Split 132 bits into 12 groups of 11 bits                       │   │
│  │  └── Map each 11-bit number (0-2047) to word in 2048-word list      │   │
│  │                                                                      │   │
│  │  Output: 12 English words                                            │   │
│  │  Example: "abandon typical forest ocean bright museum grape..."      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              │  User writes down these 12 words             │
│                              │  (This IS their identity - nothing else)     │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  PBKDF2 (Password-Based Key Derivation Function 2)                   │   │
│  │                                                                      │   │
│  │  What it does:                                                       │   │
│  │  • Takes the mnemonic words as a "password"                          │   │
│  │  • Runs HMAC-SHA512 in a loop 2048 times                            │   │
│  │  • Each iteration feeds into the next                                │   │
│  │                                                                      │   │
│  │  Why 2048 iterations?                                                │   │
│  │  • Makes brute-forcing slow (can't try billions of guesses/sec)     │   │
│  │  • BIP39 standard - ensures compatibility with Bitcoin wallets       │   │
│  │                                                                      │   │
│  │  Output: 64-byte MASTER SEED (512 bits of keying material)          │   │
│  │  ⚠️  This is NOT a private key - just raw bytes for deriving keys   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│              ┌───────────────┴───────────────┐                              │
│              ▼                               ▼                               │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  HKDF (Extract-Expand)  │    │  HKDF (Extract-Expand)  │                 │
│  │                         │    │                         │                 │
│  │  Input:                 │    │  Input:                 │                 │
│  │  • Master seed          │    │  • Master seed          │                 │
│  │  • Domain: "moneyflow-  │    │  • Domain: "moneyflow-  │                 │
│  │    v1-ed25519-signing"  │    │    v1-x25519-encrypt"   │                 │
│  │                         │    │                         │                 │
│  │  What it does:          │    │  What it does:          │                 │
│  │  • SHA-256 based        │    │  • SHA-256 based        │                 │
│  │  • Domain string ensures│    │  • Domain string ensures│                 │
│  │    output is unique     │    │    output is unique     │                 │
│  │                         │    │                         │                 │
│  │  Output: 32-byte seed   │    │  Output: 32-byte seed   │                 │
│  │  for Ed25519            │    │  for X25519             │                 │
│  └─────────────────────────┘    └─────────────────────────┘                 │
│              │                               │                               │
│              ▼                               ▼                               │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  Ed25519 Key Generation │    │  X25519 Key Generation  │                 │
│  │                         │    │                         │                 │
│  │  • Elliptic curve math  │    │  • Elliptic curve math  │                 │
│  │  • Same Curve25519 base │    │  • Same Curve25519 base │                 │
│  │  • Optimized for signing│    │  • Optimized for ECDH   │                 │
│  │                         │    │    (key exchange)       │                 │
│  │  Output:                │    │                         │                 │
│  │  • Private key (64 B)   │    │  Output:                │                 │
│  │  • Public key (32 B)    │    │  • Private key (32 B)   │                 │
│  │                         │    │  • Public key (32 B)    │                 │
│  └─────────────────────────┘    └─────────────────────────┘                 │
│              │                               │                               │
│              │                               │                               │
│              ▼                               ▼                               │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  USED FOR:              │    │  USED FOR:              │                 │
│  │  • Request signing      │    │  • Key wrapping         │                 │
│  │  • Identity (pubkeyHash)│    │  • Multi-user sharing   │                 │
│  └─────────────────────────┘    └─────────────────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVER IDENTITY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ed25519 Public Key (32 bytes)                                              │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  BLAKE2b HASH                                                        │   │
│  │                                                                      │   │
│  │  What it does:                                                       │   │
│  │  • Modern hash function (faster than SHA-256, equally secure)        │   │
│  │  • One-way: cannot reverse hash to get public key                    │   │
│  │  • Deterministic: same input always gives same output                │   │
│  │                                                                      │   │
│  │  Output: 32-byte hash (base64 encoded for storage)                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  pubkeyHash: "kF9d2Q7xB3m..."                                        │   │
│  │                                                                      │   │
│  │  This is your identity to the server.                                │   │
│  │  Server stores this - cannot reverse it to get your actual key.      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST AUTHENTICATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Message Construction                                                │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  POST                           ← HTTP method                  │  │   │
│  │  │  /api/trpc/vault.create         ← Request path                 │  │   │
│  │  │  1703596800000                  ← Timestamp (ms since epoch)   │  │   │
│  │  │  kF9d2Q7x...                    ← BLAKE2b hash of request body │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Ed25519 SIGNATURE                                                   │   │
│  │                                                                      │   │
│  │  What it does:                                                       │   │
│  │  • Uses your Ed25519 private key                                     │   │
│  │  • Creates a 64-byte signature unique to this exact message          │   │
│  │  • Anyone with your public key can VERIFY but not FORGE              │   │
│  │                                                                      │   │
│  │  Properties:                                                         │   │
│  │  • Change one bit of message → completely different signature        │   │
│  │  • Cannot create valid signature without private key                 │   │
│  │  • Signature + public key + message = proof you signed it            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  HTTP Headers Sent:                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  X-Pubkey: abc123...     ← Your Ed25519 public key (base64)    │  │   │
│  │  │  X-Timestamp: 170359...  ← Prevents replay attacks             │  │   │
│  │  │  X-Signature: def456...  ← The 64-byte signature (base64)      │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  SERVER VERIFICATION                                                 │   │
│  │                                                                      │   │
│  │  1. Reconstruct the message from request                             │   │
│  │  2. crypto_sign_verify(signature, message, publicKey)                │   │
│  │  3. Check timestamp is within 5 minutes                              │   │
│  │  4. pubkeyHash = BLAKE2b(publicKey) → look up user                   │   │
│  │  5. Discard public key (not stored)                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA ENCRYPTION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  VAULT KEY GENERATION (one-time per vault)                           │   │
│  │                                                                      │   │
│  │  crypto_secretbox_keygen() → 32 random bytes                         │   │
│  │                                                                      │   │
│  │  This symmetric key encrypts ALL data in the vault.                  │   │
│  │  It never leaves the client unencrypted.                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  XChaCha20-Poly1305 ENCRYPTION                                       │   │
│  │                                                                      │   │
│  │  Components:                                                         │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  XChaCha20 (stream cipher)                                     │  │   │
│  │  │  • Generates a keystream from key + nonce                      │  │   │
│  │  │  • XORs plaintext with keystream → ciphertext                  │  │   │
│  │  │  • "X" = extended nonce (192-bit instead of 96-bit)            │  │   │
│  │  │                                                                │  │   │
│  │  │  Poly1305 (MAC - Message Authentication Code)                  │  │   │
│  │  │  • Creates 16-byte authentication tag                          │  │   │
│  │  │  • Detects ANY tampering with ciphertext                       │  │   │
│  │  │  • If even 1 bit changed, decryption fails                     │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  Inputs:                                                             │   │
│  │  • Plaintext: Your financial data (CRDT export bytes)                │   │
│  │  • Key: 32-byte vault key                                            │   │
│  │  • Nonce: 24 random bytes (NEVER reuse with same key!)               │   │
│  │                                                                      │   │
│  │  Output:                                                             │   │
│  │  • Ciphertext (same length as plaintext)                             │   │
│  │  • Auth tag (16 bytes, appended automatically)                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  STORAGE FORMAT                                                      │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  [Nonce: 24 bytes][Ciphertext + Auth Tag]                      │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  Nonce prepended so decryption is self-contained.                    │   │
│  │  This blob is what the server stores - completely opaque.            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  WHY 192-BIT NONCES?                                                 │   │
│  │                                                                      │   │
│  │  • Regular ChaCha20 uses 96-bit nonces                               │   │
│  │  • With 96 bits, birthday paradox = collision after ~2^48 messages   │   │
│  │  • With 192 bits, safe up to ~2^96 messages (practically infinite)   │   │
│  │  • Can safely use random nonces without counter management           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         KEY WRAPPING (Multi-User)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO: Alice wants to share vault with Bob                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  X25519 ECDH (Elliptic Curve Diffie-Hellman)                         │   │
│  │                                                                      │   │
│  │  Alice has: Alice_private, Alice_public                              │   │
│  │  Bob has:   Bob_private, Bob_public                                  │   │
│  │                                                                      │   │
│  │  Magic property:                                                     │   │
│  │  X25519(Alice_private, Bob_public) = X25519(Bob_private, Alice_public)│   │
│  │                                                                      │   │
│  │  Both compute the SAME shared secret without ever sending private    │   │
│  │  keys! This is the Diffie-Hellman key exchange.                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  crypto_box (X25519 + XSalsa20-Poly1305)                             │   │
│  │                                                                      │   │
│  │  What it does:                                                       │   │
│  │  1. Compute shared secret via X25519 ECDH                            │   │
│  │  2. Derive encryption key from shared secret (HSalsa20)              │   │
│  │  3. Encrypt vault key with XSalsa20-Poly1305                         │   │
│  │                                                                      │   │
│  │  Input: 32-byte vault key                                            │   │
│  │  Output: Wrapped key blob (nonce || ciphertext)                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  DATABASE STORAGE                                                    │   │
│  │                                                                      │   │
│  │  vault_memberships table:                                            │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  Alice:                                                        │  │   │
│  │  │    pubkey_hash: hash_alice                                     │  │   │
│  │  │    enc_public_key: Alice's X25519 public key                   │  │   │
│  │  │    encrypted_vault_key: [vault key wrapped for Alice]          │  │   │
│  │  │                                                                │  │   │
│  │  │  Bob:                                                          │  │   │
│  │  │    pubkey_hash: hash_bob                                       │  │   │
│  │  │    enc_public_key: Bob's X25519 public key  ← Stored for       │  │   │
│  │  │    encrypted_vault_key: [vault key wrapped for Bob]   re-keying│  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  Each row has the SAME vault key, wrapped differently for each user. │   │
│  │  enc_public_key is stored so anyone can wrap new keys for that user. │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         RE-KEYING (Member Removal)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO: Alice removes Carol from vault (Bob stays)                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  ALICE'S BROWSER (performs all re-keying client-side):               │   │
│  │                                                                      │   │
│  │  1. Generate NEW random vault key                                    │   │
│  │     new_vault_key = crypto_secretbox_keygen()                        │   │
│  │                                                                      │   │
│  │  2. Decrypt ALL vault data with OLD key                              │   │
│  │     plaintext = XChaCha20_decrypt(encrypted_data, old_vault_key)     │   │
│  │                                                                      │   │
│  │  3. Re-encrypt ALL vault data with NEW key                           │   │
│  │     new_encrypted = XChaCha20_encrypt(plaintext, new_vault_key)      │   │
│  │                                                                      │   │
│  │  4. Wrap NEW key for Alice (herself)                                 │   │
│  │     alice_wrapped = crypto_box(new_vault_key, Alice_keypair)         │   │
│  │                                                                      │   │
│  │  5. Wrap NEW key for Bob (using Bob's stored enc_public_key)         │   │
│  │     bob_wrapped = crypto_box(new_vault_key,                          │   │
│  │                              Bob_enc_public_key,  ← from database    │   │
│  │                              Alice_private_key)                      │   │
│  │                                                                      │   │
│  │  6. Upload: new encrypted data + new wrapped keys for Alice & Bob    │   │
│  │                                                                      │   │
│  │  7. Delete Carol's membership row                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  RESULT:                                                             │   │
│  │                                                                      │   │
│  │  • Carol still has OLD vault key (cached in her browser)             │   │
│  │  • But ALL data in database is now encrypted with NEW key            │   │
│  │  • Carol cannot decrypt anything new                                 │   │
│  │  • Bob's UX unchanged - unwraps his new wrapped key, decrypts data   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Algorithm Summary Table

| Algorithm | Type | Purpose in MoneyFlow | Input → Output |
|-----------|------|---------------------|----------------|
| **BIP39** | Encoding | Convert random bytes to memorable words | 128 bits → 12 words |
| **PBKDF2** | KDF (slow) | Stretch mnemonic into master seed | Mnemonic → 64-byte seed |
| **HKDF** | KDF (fast) | Derive multiple independent keys from one seed | Seed + domain → 32-byte key |
| **Ed25519** | Signature | Sign API requests, prove identity | Message + private key → 64-byte signature |
| **X25519** | Key Exchange | Compute shared secrets for key wrapping | Private + public → shared secret |
| **XChaCha20-Poly1305** | AEAD | Encrypt vault data with authentication | Plaintext + key + nonce → ciphertext + tag |
| **XSalsa20-Poly1305** | AEAD | Encrypt wrapped keys (via crypto_box) | Vault key + shared secret → wrapped key |
| **BLAKE2b** | Hash | Create pubkeyHash for server identity | Public key → 32-byte hash |

---

## Key Types Summary

| Key | Size | Generated From | Stored Where | Purpose |
|-----|------|---------------|--------------|---------|
| **Master Seed** | 64 bytes | PBKDF2(mnemonic) | Nowhere (derived each session) | Source for all other keys |
| **Ed25519 Private** | 64 bytes | HKDF(master, "signing") | sessionStorage only | Sign requests |
| **Ed25519 Public** | 32 bytes | Ed25519(private) | Sent in headers, NOT stored on server | Verify signatures |
| **X25519 Private** | 32 bytes | HKDF(master, "encryption") | sessionStorage only | Unwrap vault keys |
| **X25519 Public** | 32 bytes | X25519(private) | `vault_memberships.enc_public_key` | Let others wrap keys for you |
| **pubkeyHash** | 32 bytes | BLAKE2b(Ed25519 public) | `vault_memberships.pubkey_hash` | Server-side identity |
| **Vault Key** | 32 bytes | Random generation | Wrapped in `encrypted_vault_key` | Encrypt all vault data |

---

## Security Properties

| Property | How It's Achieved |
|----------|-------------------|
| **Zero-knowledge server** | All data encrypted client-side; server stores only ciphertext and hashes |
| **No stored secrets** | Keys derived from seed phrase each session; sessionStorage cleared on tab close |
| **Forward secrecy on removal** | Re-keying generates new vault key; removed users can't decrypt new data |
| **Replay attack prevention** | Request signatures include timestamp; rejected if >5 minutes old |
| **Tampering detection** | Poly1305 auth tag fails if any bit of ciphertext is modified |
| **Key independence** | HKDF domain separation ensures signing key compromise doesn't leak encryption key |
| **Safe random nonces** | 192-bit nonces allow random generation without collision risk |

---

## What Each Party Knows

| Entity | Knows | Doesn't Know |
|--------|-------|--------------|
| **User** | Seed phrase, all keys, plaintext data | Other users' private keys |
| **Server** | pubkeyHash, encrypted blobs, X25519 public keys | Plaintext data, Ed25519 public key (only hashed), seed phrases |
| **Other vault members** | Shared vault key, each other's X25519 public keys | Each other's private keys, seed phrases |
| **Attacker with database access** | All encrypted blobs, all hashes, all public keys | Any plaintext, any private keys |
