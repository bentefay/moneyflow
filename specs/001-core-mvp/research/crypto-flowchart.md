# Cryptographic Architecture Flowchart

**Date**: 2025-12-26  
**Purpose**: Visual summary of all cryptographic flows in MoneyFlow

---

## Source Code Locations

| Component           | File                           | Description                             |
| ------------------- | ------------------------------ | --------------------------------------- |
| Seed phrase         | `src/lib/crypto/seed.ts`       | BIP39 generation and validation         |
| Keypair derivation  | `src/lib/crypto/keypair.ts`    | HKDF + Ed25519/X25519 key generation    |
| Identity management | `src/lib/crypto/identity.ts`   | createIdentity(), unlockWithSeed()      |
| Session storage     | `src/lib/crypto/session.ts`    | Store/retrieve keys from sessionStorage |
| Request signing     | `src/lib/crypto/signing.ts`    | Ed25519 signatures for API auth         |
| Data encryption     | `src/lib/crypto/encryption.ts` | XChaCha20-Poly1305 encrypt/decrypt      |
| Key wrapping        | `src/lib/crypto/keywrap.ts`    | X25519 key exchange for multi-user      |
| Re-keying           | `src/lib/crypto/rekey.ts`      | Vault re-keying on member removal       |

---

## Master Flowchart: From Seed Phrase to Encrypted Data

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IDENTITY CREATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  128 bits of randomness (crypto.getRandomValues)                     │   │
│  │  └── "Flip a perfectly fair coin 128 times"                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  BIP39 ENCODING (Bitcoin Improvement Proposal 39)                    │   │
│  │                                                                      │   │
│  │  What is BIP39?                                                      │   │
│  │  A standard created for Bitcoin wallets to convert random bytes      │   │
│  │  into human-readable words. Now used widely in crypto.               │   │
│  │                                                                      │   │
│  │  Steps:                                                              │   │
│  │  ├── Add 4-bit checksum (SHA-256 of entropy, first 4 bits)           │   │
│  │  ├── Split 132 bits into 12 groups of 11 bits                        │   │
│  │  └── Map each 11-bit number (0-2047) to word in 2048-word list       │   │
│  │                                                                      │   │
│  │  Output: 12 English words                                            │   │
│  │  Example: "abandon typical forest ocean bright museum grape..."      │   │
│  │                                                                      │   │
│  │  Source: src/lib/crypto/seed.ts → generateSeedPhrase()               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              │  User writes down these 12 words             │
│                              │  (This IS their identity - nothing else)     │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  PBKDF2 (Password-Based Key Derivation Function 2)                   │   │
│  │                                                                      │   │
│  │  Full name: Password-Based Key Derivation Function version 2         │   │
│  │  Defined in: RFC 8018 (PKCS #5 v2.1)                                 │   │
│  │                                                                      │   │
│  │  What it does:                                                       │   │
│  │  • Takes the mnemonic words as a "password"                          │   │
│  │  • Runs HMAC-SHA512 in a loop 2048 times                             │   │
│  │  • Each iteration feeds into the next (key stretching)               │   │
│  │                                                                      │   │
│  │  Why 2048 iterations?                                                │   │
│  │  • Makes brute-forcing slow (can't try billions of guesses/sec)      │   │
│  │  • BIP39 standard - ensures compatibility with Bitcoin wallets       │   │
│  │                                                                      │   │
│  │  Output: 64-byte MASTER SEED (512 bits of keying material)           │   │
│  │  ⚠️  This is NOT a private key - just raw bytes for deriving keys    │   │
│  │                                                                      │   │
│  │  Source: src/lib/crypto/seed.ts → mnemonicToMasterSeed()             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│              ┌───────────────┴───────────────┐                              │
│              ▼                               ▼                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  HKDF (Extract-Expand)  │    │  HKDF (Extract-Expand)  │                 │
│  │                         │    │                         │                 │
│  │  Full name: HMAC-based  │    │  Full name: HMAC-based  │                 │
│  │  Key Derivation Function│    │  Key Derivation Function│                 │
│  │  Defined in: RFC 5869   │    │  Defined in: RFC 5869   │                 │
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
│  │  • "Domain separation"  │    │  • "Domain separation"  │                 │
│  │    means one key can't  │    │    means one key can't  │                 │
│  │    be used to derive    │    │    be used to derive    │                 │
│  │    another              │    │    another              │                 │
│  │                         │    │                         │                 │
│  │  Output: 32-byte seed   │    │  Output: 32-byte seed   │                 │
│  │  for Ed25519            │    │  for X25519             │                 │
│  │                         │    │                         │                 │
│  │  Source:                │    │  Source:                │                 │
│  │  src/lib/crypto/        │    │  src/lib/crypto/        │                 │
│  │  keypair.ts             │    │  keypair.ts             │                 │
│  └─────────────────────────┘    └─────────────────────────┘                 │
│              │                               │                               │
│              ▼                               ▼                               │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │  Ed25519 Key Generation │    │  X25519 Key Generation  │                 │
│  │                         │    │                         │                 │
│  │  Full name: Edwards-    │    │  Full name: X25519      │                 │
│  │  curve Digital Signature│    │  (Montgomery curve for  │                 │
│  │  Algorithm              │    │  Diffie-Hellman)        │                 │
│  │                         │    │                         │                 │
│  │  Named after: Daniel J. │    │  Named after: The       │                 │
│  │  Bernstein (djb) &      │    │  underlying Curve25519  │                 │
│  │  Harold Edwards (curve) │    │  by djb                 │                 │
│  │                         │    │                         │                 │
│  │  • Elliptic curve math  │    │  • Elliptic curve math  │                 │
│  │  • Same Curve25519 base │    │  • Same Curve25519 base │                 │
│  │  • Optimized for signing│    │  • Optimized for ECDH   │                 │
│  │    (fast verify)        │    │    (key exchange)       │                 │
│  │                         │    │                         │                 │
│  │  Output:                │    │  Output:                │                 │
│  │  • Private key (64 B)   │    │  • Private key (32 B)   │                 │
│  │  • Public key (32 B)    │    │  • Public key (32 B)    │                 │
│  │                         │    │                         │                 │
│  │  Source:                │    │  Source:                │                 │
│  │  src/lib/crypto/        │    │  src/lib/crypto/        │                 │
│  │  keypair.ts             │    │  keypair.ts             │                 │
│  │  deriveKeysFromSeed()   │    │  deriveKeysFromSeed()   │                 │
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
│  │  Full name: BLAKE2b (successor to BLAKE, SHA-3 finalist)             │   │
│  │  Defined in: RFC 7693                                                │   │
│  │                                                                      │   │
│  │  What it does:                                                       │   │
│  │  • Modern hash function (faster than SHA-256, equally secure)        │   │
│  │  • One-way: cannot reverse hash to get public key                    │   │
│  │  • Deterministic: same input always gives same output                │   │
│  │  • "b" suffix = optimized for 64-bit platforms                       │   │
│  │                                                                      │   │
│  │  Why not SHA-256?                                                    │   │
│  │  • BLAKE2b is faster in software                                     │   │
│  │  • Same security level (256-bit)                                     │   │
│  │  • libsodium uses BLAKE2b throughout                                 │   │
│  │                                                                      │   │
│  │  Output: 32-byte hash (base64 encoded for storage)                   │   │
│  │                                                                      │   │
│  │  Source: src/lib/crypto/identity.ts → computePubkeyHash()            │   │
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
│  │  Ed25519 SIGNATURE (Edwards-curve Digital Signature Algorithm)       │   │
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
│  │  • ~15,000 signatures/second on modern CPU                           │   │
│  │                                                                      │   │
│  │  Source: src/lib/crypto/signing.ts → signRequest()                   │   │
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
│  │  XChaCha20-Poly1305 ENCRYPTION (Authenticated Encryption)            │   │
│  │                                                                      │   │
│  │  Full names:                                                         │   │
│  │  • XChaCha20: eXtended ChaCha20 stream cipher                        │   │
│  │  • Poly1305: Polynomial MAC (Message Authentication Code)            │   │
│  │  • Together: AEAD (Authenticated Encryption with Associated Data)    │   │
│  │                                                                      │   │
│  │  ChaCha20 named after: The Cha-Cha dance (fast quarter-round ops)    │   │
│  │  "X" prefix: Extended nonce version (192-bit vs 96-bit)              │   │
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
│  │                                                                      │   │
│  │  Source: src/lib/crypto/encryption.ts → encrypt(), decrypt()         │   │
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
│  │  X25519 ECDH (Elliptic Curve Diffie-Hellman Key Exchange)            │   │
│  │                                                                      │   │
│  │  Full name: X25519 Elliptic Curve Diffie-Hellman                     │   │
│  │  Named after: Curve25519 by Daniel J. Bernstein                      │   │
│  │  Diffie-Hellman: Named after Whitfield Diffie & Martin Hellman (1976)│   │
│  │                                                                      │   │
│  │  Alice has: Alice_private, Alice_public                              │   │
│  │  Bob has:   Bob_private, Bob_public                                  │   │
│  │                                                                      │   │
│  │  Magic property:                                                     │   │
│  │  X25519(Alice_private, Bob_public) = X25519(Bob_private, Alice_public)│   │
│  │                                                                      │   │
│  │  Both compute the SAME shared secret without ever sending private    │   │
│  │  keys! This is the Diffie-Hellman key exchange.                      │   │
│  │                                                                      │   │
│  │  Source: src/lib/crypto/keywrap.ts → wrapKey(), unwrapKey()          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  crypto_box (X25519 + XSalsa20-Poly1305)                             │   │
│  │                                                                      │   │
│  │  Full names:                                                         │   │
│  │  • XSalsa20: eXtended Salsa20 stream cipher (predecessor to ChaCha)  │   │
│  │  • Poly1305: Polynomial MAC (same as in XChaCha20-Poly1305)          │   │
│  │  • crypto_box: libsodium's public-key authenticated encryption       │   │
│  │                                                                      │   │
│  │  What it does:                                                       │   │
│  │  1. Compute shared secret via X25519 ECDH                            │   │
│  │  2. Derive encryption key from shared secret (HSalsa20)              │   │
│  │  3. Encrypt vault key with XSalsa20-Poly1305                         │   │
│  │                                                                      │   │
│  │  Input: 32-byte vault key                                            │   │
│  │  Output: Wrapped key blob (nonce || ciphertext)                      │   │
│  │                                                                      │   │
│  │  Source: src/lib/crypto/keywrap.ts                                   │   │
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
│                         ADD PERSON TO VAULT (Invite Flow)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO: Alice invites Bob to her vault                                   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 1: Alice creates invite (src/server/routers/invite.ts)                │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  1. Generate random invite_secret (32 bytes)                         │   │
│  │     invite_secret = crypto.getRandomValues(new Uint8Array(32))       │   │
│  │                                                                      │   │
│  │  2. Derive ephemeral keypair from invite_secret                      │   │
│  │     invite_seed = BLAKE2b(invite_secret)                             │   │
│  │     invite_keypair = X25519(invite_seed)                             │   │
│  │                                                                      │   │
│  │  3. Wrap vault key for the invite (not for Bob yet - we don't know   │   │
│  │     Bob's keys!)                                                     │   │
│  │     wrapped_for_invite = crypto_box(                                 │   │
│  │       vault_key,                                                     │   │
│  │       invite_keypair.publicKey,    ← ephemeral public key            │   │
│  │       Alice_private_key                                              │   │
│  │     )                                                                │   │
│  │                                                                      │   │
│  │  4. Store invite in database:                                        │   │
│  │     vault_invites: {                                                 │   │
│  │       vault_id,                                                      │   │
│  │       invite_pubkey: invite_keypair.publicKey,                       │   │
│  │       encrypted_vault_key: wrapped_for_invite,                       │   │
│  │       expires_at: now + 24 hours,                                    │   │
│  │       created_by: Alice_pubkey_hash                                  │   │
│  │     }                                                                │   │
│  │                                                                      │   │
│  │  5. Generate invite URL (SECRET IN FRAGMENT - never sent to server!) │   │
│  │     https://app.com/join#secret=<base64(invite_secret)>              │   │
│  │                        ↑                                             │   │
│  │                        URL fragment (#) is NOT sent in HTTP requests │   │
│  │                                                                      │   │
│  │  6. Send URL to Bob out-of-band (email, Signal, text, etc.)          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  STEP 2: Bob redeems invite (src/server/routers/invite.ts)                  │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  1. Bob clicks link, app extracts invite_secret from URL fragment    │   │
│  │     (Server never sees the secret!)                                  │   │
│  │                                                                      │   │
│  │  2. If Bob is new: Generate seed phrase, derive keypairs             │   │
│  │     If Bob exists: Enter seed phrase, derive keypairs                │   │
│  │     → Bob now has: Bob_signing_keypair, Bob_encryption_keypair       │   │
│  │                                                                      │   │
│  │  3. Derive the SAME ephemeral keypair Alice created:                 │   │
│  │     invite_seed = BLAKE2b(invite_secret)                             │   │
│  │     invite_keypair = X25519(invite_seed)                             │   │
│  │     (Same secret → same keypair!)                                    │   │
│  │                                                                      │   │
│  │  4. Fetch invite from database by invite_pubkey                      │   │
│  │     SELECT * FROM vault_invites WHERE invite_pubkey = ?              │   │
│  │                                                                      │   │
│  │  5. Unwrap vault key using invite_private_key:                       │   │
│  │     vault_key = crypto_box_open(                                     │   │
│  │       encrypted_vault_key,                                           │   │
│  │       Alice_enc_public_key,     ← need to fetch this                 │   │
│  │       invite_keypair.privateKey  ← derived from secret               │   │
│  │     )                                                                │   │
│  │                                                                      │   │
│  │  6. Re-wrap vault key for Bob's own keypair:                         │   │
│  │     bob_wrapped = crypto_box(                                        │   │
│  │       vault_key,                                                     │   │
│  │       Bob_enc_public_key,                                            │   │
│  │       Bob_enc_private_key                                            │   │
│  │     )                                                                │   │
│  │                                                                      │   │
│  │  7. Create membership record:                                        │   │
│  │     INSERT INTO vault_memberships (                                  │   │
│  │       vault_id,                                                      │   │
│  │       pubkey_hash: Bob_pubkey_hash,                                  │   │
│  │       enc_public_key: Bob_enc_public_key,  ← stored for re-keying!   │   │
│  │       encrypted_vault_key: bob_wrapped,                              │   │
│  │       role: 'member'                                                 │   │
│  │     )                                                                │   │
│  │                                                                      │   │
│  │  8. Delete the invite (single-use)                                   │   │
│  │     DELETE FROM vault_invites WHERE id = ?                           │   │
│  │                                                                      │   │
│  │  9. Bob can now access the vault!                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  SECURITY PROPERTIES:                                                │   │
│  │                                                                      │   │
│  │  • invite_secret in URL fragment = never sent to server              │   │
│  │  • Server only sees invite_pubkey (ephemeral, unlinkable to Bob)     │   │
│  │  • Bob's real pubkey_hash only revealed when he redeems              │   │
│  │  • Single-use: invite deleted after redemption                       │   │
│  │  • Time-limited: expires after 24 hours                              │   │
│  │  • Alice cannot see Bob's seed phrase or private keys                │   │
│  │  • Bob's enc_public_key stored for future re-keying operations       │   │
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

| Algorithm              | Full Name                                 | Type         | Purpose in MoneyFlow                           | Source File     |
| ---------------------- | ----------------------------------------- | ------------ | ---------------------------------------------- | --------------- |
| **BIP39**              | Bitcoin Improvement Proposal 39           | Encoding     | Convert random bytes to memorable words        | `seed.ts`       |
| **PBKDF2**             | Password-Based Key Derivation Function 2  | KDF (slow)   | Stretch mnemonic into master seed              | `seed.ts`       |
| **HKDF**               | HMAC-based Key Derivation Function        | KDF (fast)   | Derive multiple independent keys from one seed | `keypair.ts`    |
| **Ed25519**            | Edwards-curve Digital Signature Algorithm | Signature    | Sign API requests, prove identity              | `signing.ts`    |
| **X25519**             | Curve25519 Diffie-Hellman                 | Key Exchange | Compute shared secrets for key wrapping        | `keywrap.ts`    |
| **XChaCha20-Poly1305** | eXtended ChaCha20 + Polynomial MAC        | AEAD         | Encrypt vault data with authentication         | `encryption.ts` |
| **XSalsa20-Poly1305**  | eXtended Salsa20 + Polynomial MAC         | AEAD         | Encrypt wrapped keys (via crypto_box)          | `keywrap.ts`    |
| **BLAKE2b**            | BLAKE2 optimized for 64-bit               | Hash         | Create pubkeyHash for server identity          | `identity.ts`   |

---

## Key Storage Summary

| Key                 | Size | Generated From             | Stored Where                          | File            |
| ------------------- | ---- | -------------------------- | ------------------------------------- | --------------- |
| **Master Seed**     | 64 B | PBKDF2(mnemonic)           | Nowhere (derived each session)        | `seed.ts`       |
| **Ed25519 Private** | 64 B | HKDF(master, "signing")    | `sessionStorage` only                 | `session.ts`    |
| **Ed25519 Public**  | 32 B | Ed25519(private)           | Sent in headers, NOT stored on server | `signing.ts`    |
| **X25519 Private**  | 32 B | HKDF(master, "encryption") | `sessionStorage` only                 | `session.ts`    |
| **X25519 Public**   | 32 B | X25519(private)            | `vault_memberships.enc_public_key`    | `keywrap.ts`    |
| **pubkeyHash**      | 32 B | BLAKE2b(Ed25519 public)    | `vault_memberships.pubkey_hash`       | `identity.ts`   |
| **Vault Key**       | 32 B | Random generation          | Wrapped in `encrypted_vault_key`      | `encryption.ts` |

---

## Security Properties

| Property                       | How It's Achieved                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------- |
| **Zero-knowledge server**      | All data encrypted client-side; server stores only ciphertext and hashes          |
| **No stored secrets**          | Keys derived from seed phrase each session; sessionStorage cleared on tab close   |
| **Forward secrecy on removal** | Re-keying generates new vault key; removed users can't decrypt new data           |
| **Replay attack prevention**   | Request signatures include timestamp; rejected if >5 minutes old                  |
| **Tampering detection**        | Poly1305 auth tag fails if any bit of ciphertext is modified                      |
| **Key independence**           | HKDF domain separation ensures signing key compromise doesn't leak encryption key |
| **Safe random nonces**         | 192-bit nonces allow random generation without collision risk                     |

---

## What Each Party Knows

| Entity                            | Knows                                             | Doesn't Know                                                   |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| **User**                          | Seed phrase, all keys, plaintext data             | Other users' private keys                                      |
| **Server**                        | pubkeyHash, encrypted blobs, X25519 public keys   | Plaintext data, Ed25519 public key (only hashed), seed phrases |
| **Other vault members**           | Shared vault key, each other's X25519 public keys | Each other's private keys, seed phrases                        |
| **Attacker with database access** | All encrypted blobs, all hashes, all public keys  | Any plaintext, any private keys                                |
