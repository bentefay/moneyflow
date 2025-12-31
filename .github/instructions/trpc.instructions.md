---
applyTo: "src/server/**"
---

# tRPC Server Guidelines

API layer using tRPC v11 with Zod validation and Ed25519 signature verification.

## Architecture Overview

```
Client Request
  ↓
tRPC Router (src/server/routers/_app.ts)
  ↓
Procedure (query/mutation)
  ↓
Zod Schema Validation (src/server/schemas/)
  ↓
Ed25519 Signature Verification (authedProcedure)
  ↓
Business Logic
  ↓
Supabase Database
```

## Key Files

- `trpc.ts` - tRPC instance and procedure definitions
- `routers/_app.ts` - Root router combining all sub-routers
- `routers/vault.ts` - Vault CRUD operations
- `routers/sync.ts` - CRDT sync operations
- `routers/user.ts` - User profile operations
- `routers/invite.ts` - Vault invitation management
- `schemas/*.ts` - Zod schemas for input validation

## Authentication Pattern

All authenticated procedures verify Ed25519 signatures:

```typescript
// In trpc.ts
export const authedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const { pubkeyHash, signature, timestamp, message } = ctx.auth;

  // Verify signature matches pubkeyHash
  // Verify timestamp is recent (prevent replay)
  // Verify message matches request

  return next({ ctx: { ...ctx, pubkeyHash } });
});
```

## Router Pattern

```typescript
// src/server/routers/vault.ts
import { z } from "zod";
import { router, authedProcedure } from "../trpc";
import { createVaultSchema, updateVaultSchema } from "../schemas/vault";

export const vaultRouter = router({
  create: authedProcedure.input(createVaultSchema).mutation(async ({ ctx, input }) => {
    // Implementation
  }),

  list: authedProcedure.query(async ({ ctx }) => {
    // Implementation
  }),
});
```

## Schema Pattern

```typescript
// src/server/schemas/vault.ts
import { z } from "zod";

export const createVaultSchema = z.object({
  name: z.string().min(1).max(100),
  encryptedSnapshot: z.string(), // Base64 encrypted data
  wrappedKey: z.string(), // Wrapped vault key for creator
});

export type CreateVaultInput = z.infer<typeof createVaultSchema>;
```

## Critical Rules

1. **Never trust client data** - Always validate with Zod
2. **Never store unencrypted data** - All sensitive data comes pre-encrypted
3. **Verify signatures** - Every mutation must be signed
4. **Check permissions** - Verify user has access to vault
5. **Use transactions** - Wrap multi-step operations in DB transactions
6. **Write tests** - Every router needs integration tests for happy path + error cases

## Error Handling

Use TRPCError for consistent error responses:

```typescript
import { TRPCError } from "@trpc/server";

if (!vault) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Vault not found",
  });
}

if (!hasAccess) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You don't have access to this vault",
  });
}
```

## Testing

Test routers with integration tests:

```typescript
import { createCaller } from "../routers/_app";

const caller = createCaller({ db: testDb, pubkeyHash: "test-user" });

it("creates vault", async () => {
  const result = await caller.vault.create({
    name: "Test Vault",
    encryptedSnapshot: "...",
    wrappedKey: "...",
  });
  expect(result.id).toBeDefined();
});
```
