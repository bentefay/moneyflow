---
applyTo: "src/lib/crypto/**"
---

# Cryptography Module Guidelines

This module handles all cryptographic operations for MoneyFlow. Security is non-negotiable.

## Architecture Overview

All crypto operations MUST occur client-side. The server NEVER sees plaintext financial data.

```
Identity Creation:
  seed phrase (128-bit) → Ed25519 keypair → X25519 keypair (for encryption)
                       → pubkey hash (for server auth)

Vault Encryption:
  vault key (random 256-bit) → wrapped with user's X25519 public key
  transaction data → encrypted with vault key (XChaCha20-Poly1305)

Authentication:
  challenge → signed with Ed25519 private key → server verifies with pubkey hash
```

## Key Files

- `seed.ts` - BIP39 seed phrase generation and derivation
- `keypair.ts` - Ed25519 signing keypair generation
- `encryption.ts` - X25519 keypair and XChaCha20-Poly1305 encryption
- `signing.ts` - Ed25519 message signing/verification
- `keywrap.ts` - Vault key wrapping for multi-user access
- `identity.ts` - High-level identity management (create, unlock, store)
- `session.ts` - Session key derivation and management

## Critical Rules

1. **Never log keys or sensitive data** - Not even in development
2. **Use libsodium** - Don't implement crypto primitives
3. **Async everywhere** - All crypto functions are async (libsodium-wrappers)
4. **Constant-time comparisons** - Use sodium.compare for secrets
5. **Zeroize secrets** - Use sodium.memzero when done with sensitive data
6. **Type-safe keys** - Use branded types (VaultKey, SigningKey) to prevent misuse

## Testing Patterns

Use property-based tests for roundtrip verification:

```typescript
import * as fc from "fast-check";

it("encrypts and decrypts arbitrary data", async () => {
  await fc.assert(
    fc.asyncProperty(fc.uint8Array({ maxLength: 10000 }), async (plaintext) => {
      const key = await generateVaultKey();
      const ciphertext = await encryptForStorage(plaintext, key);
      const decrypted = await decryptFromStorage(ciphertext, key);
      expect(decrypted).toEqual(plaintext);
    })
  );
});
```

## Common Pitfalls

- Don't use `crypto.randomBytes` - Use `sodium.randombytes_buf`
- Don't concatenate key material manually - Use proper KDFs
- Don't store keys in localStorage without encryption
- Don't forget to await sodium.ready before operations
