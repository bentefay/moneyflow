# API Contracts: MoneyFlow Core MVP

**Date**: 2025-12-24  
**Status**: Draft  
**Stack**: tRPC v11 + Zod + Next.js App Router

## Overview

MoneyFlow's API uses **tRPC** for end-to-end type safety. The server only handles:

1. **Encrypted Blob Storage** - Store/retrieve encrypted vault data
2. **Real-time Notifications** - Supabase Realtime for sync
3. **Invite Management** - Create and redeem vault invitations

**Authentication**: Key-only auth via Ed25519 signatures. No email, no passwords, no Supabase Auth. Every request is signed with the user's private key.

**Important**: The server never sees decrypted financial data. All encryption/decryption happens client-side.

---

## 1. tRPC Setup

### 1.1 Router Structure

```
src/
├── server/
│   ├── trpc.ts              # tRPC instance, context, middleware
│   ├── routers/
│   │   ├── _app.ts          # Root router (merges all routers)
│   │   ├── user.ts          # user.* procedures (user_data CRUD)
│   │   ├── vault.ts         # vault.* procedures
│   │   ├── sync.ts          # sync.* procedures (snapshots, updates)
│   │   ├── invite.ts        # invite.* procedures
│   │   └── membership.ts    # membership.* procedures
│   └── schemas/
│       ├── user.ts          # Zod schemas for user
│       ├── vault.ts         # Zod schemas for vault
│       ├── sync.ts          # Zod schemas for sync
│       └── invite.ts        # Zod schemas for invites
├── app/
│   └── api/
│       └── trpc/
│           └── [trpc]/
│               └── route.ts # Next.js route handler
└── lib/
    └── trpc/
        ├── client.ts        # tRPC client for React
        └── server.ts        # Server-side caller
```

### 1.2 Context & Middleware (Key-Only Auth)

```typescript
// server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import { createClient } from "@supabase/supabase-js";
import superjson from "superjson";
import sodium from "libsodium-wrappers";

// Context available to all procedures
export interface Context {
  supabase: SupabaseClient;
  pubkeyHash: string | null; // Verified user identity
  publicKey: Uint8Array | null;
  headers: Headers;
}

export async function createContext(opts: { headers: Headers }): Promise<Context> {
  await sodium.ready;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for RLS bypass, we handle auth
  );

  // Verify Ed25519 signature from headers
  const pubkeyB64 = opts.headers.get("X-Pubkey");
  const timestamp = opts.headers.get("X-Timestamp");
  const signatureB64 = opts.headers.get("X-Signature");
  const method = opts.headers.get("X-Method") ?? "GET";
  const path = opts.headers.get("X-Path") ?? "/";
  const bodyHash = opts.headers.get("X-Body-Hash") ?? "";

  let pubkeyHash: string | null = null;
  let publicKey: Uint8Array | null = null;

  if (pubkeyB64 && timestamp && signatureB64) {
    try {
      publicKey = sodium.from_base64(pubkeyB64);
      const signature = sodium.from_base64(signatureB64);

      // Verify timestamp is within 5 minutes
      const ts = parseInt(timestamp, 10);
      if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
        throw new Error("Timestamp too old");
      }

      // Verify signature
      const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
      const valid = sodium.crypto_sign_verify_detached(
        signature,
        sodium.from_string(message),
        publicKey
      );

      if (valid) {
        pubkeyHash = sodium.to_base64(sodium.crypto_generichash(32, publicKey));

        // Set pubkey_hash for RLS policies
        await supabase.rpc("set_config", {
          setting: "request.pubkey_hash",
          value: pubkeyHash,
        });
      }
    } catch (e) {
      // Invalid signature, proceed as unauthenticated
      pubkeyHash = null;
      publicKey = null;
    }
  }

  return {
    supabase,
    pubkeyHash,
    publicKey,
    headers: opts.headers,
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware: require valid signature
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.pubkeyHash) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or missing signature",
    });
  }
  return next({
    ctx: { ...ctx, pubkeyHash: ctx.pubkeyHash, publicKey: ctx.publicKey! },
  });
});

export const authedProcedure = t.procedure.use(isAuthed);

// Middleware: require vault membership
const isVaultMember = t.middleware(async ({ ctx, input, next }) => {
  const { vaultId } = input as { vaultId: string };

  const { data: membership } = await ctx.supabase
    .from("vault_memberships")
    .select("role")
    .eq("vault_id", vaultId)
    .eq("pubkey_hash", ctx.pubkeyHash)
    .single();

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this vault",
    });
  }

  return next({
    ctx: { ...ctx, vaultRole: membership.role as "owner" | "member" },
  });
});

export const vaultProcedure = authedProcedure.use(isVaultMember);

// Middleware: require vault owner
const isVaultOwner = t.middleware(({ ctx, next }) => {
  if (ctx.vaultRole !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only owners can perform this action",
    });
  }
  return next();
});

export const ownerProcedure = vaultProcedure.use(isVaultOwner);
```

---

## 2. Zod Schemas (Shared)

```typescript
// server/schemas/user.ts
import { z } from "zod";

export const getUserDataInput = z.object({}); // Uses pubkeyHash from context

export const upsertUserDataInput = z.object({
  encryptedData: z.string(), // Encrypted: { vaults, settings }
});

// server/schemas/vault.ts
export const createVaultInput = z.object({
  encryptedVaultKey: z.string(), // Vault key wrapped with user's X25519 pubkey
  encPublicKey: z.string(), // User's X25519 public key (base64) for re-keying operations
});

export const vaultIdInput = z.object({
  vaultId: z.string().uuid(),
});

// server/schemas/sync.ts
export const createSnapshotInput = z.object({
  vaultId: z.string().uuid(),
  version: z.number().int().positive(),
  hlcTimestamp: z.string(),
  encryptedData: z.string(),
});

export const createUpdateInput = z.object({
  vaultId: z.string().uuid(),
  baseSnapshotVersion: z.number().int().nonnegative(),
  hlcTimestamp: z.string(),
  encryptedData: z.string(),
});

export const getUpdatesInput = z.object({
  vaultId: z.string().uuid(),
  afterSnapshotVersion: z.number().int().nonnegative(),
});

// server/schemas/invite.ts
export const createInviteInput = z.object({
  vaultId: z.string().uuid(),
  invitePubkey: z.string(), // Derived from invite secret
  encryptedVaultKey: z.string(), // Vault key wrapped with invite pubkey
  role: z.enum(["owner", "member"]),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const getInviteInput = z.object({
  invitePubkey: z.string(),
});

export const redeemInviteInput = z.object({
  invitePubkey: z.string(),
  encryptedVaultKey: z.string(), // Re-wrapped with user's own pubkey
  encPublicKey: z.string(), // User's X25519 public key (base64) for re-keying operations
});

// server/schemas/membership.ts
export const removeMemberInput = z.object({
  vaultId: z.string().uuid(),
  pubkeyHash: z.string(),
});
```

---

## 3. Router Definitions

### 3.1 User Router

```typescript
// server/routers/user.ts
import { router, authedProcedure, publicProcedure } from "../trpc";
import { upsertUserDataInput } from "../schemas/user";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  /**
   * Check if a user exists (for new device setup)
   */
  exists: publicProcedure
    .input(z.object({ pubkeyHash: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("user_data")
        .select("pubkey_hash")
        .eq("pubkey_hash", input.pubkeyHash)
        .single();

      return { exists: !!data };
    }),

  /**
   * Get user's encrypted data (vault references, settings)
   */
  getData: authedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("user_data")
      .select("encrypted_data, updated_at")
      .eq("pubkey_hash", ctx.pubkeyHash)
      .single();

    if (!data) return { data: null };

    return {
      data: {
        encryptedData: data.encrypted_data,
        updatedAt: data.updated_at,
      },
    };
  }),

  /**
   * Create or update user's encrypted data
   */
  upsertData: authedProcedure.input(upsertUserDataInput).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.supabase.from("user_data").upsert({
      pubkey_hash: ctx.pubkeyHash,
      encrypted_data: input.encryptedData,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return { success: true };
  }),
});
```

### 3.2 Vault Router

```typescript
// server/routers/vault.ts
import { router, authedProcedure, vaultProcedure } from "../trpc";
import { createVaultInput, vaultIdInput } from "../schemas/vault";

export const vaultRouter = router({
  /**
   * Create a new vault
   * - Client generates vault key, wraps with their X25519 pubkey
   * - Creates vault and owner membership atomically
   * - Stores enc_public_key for future re-keying operations
   */
  create: authedProcedure.input(createVaultInput).mutation(async ({ ctx, input }) => {
    // Create vault
    const { data: vault, error: vaultError } = await ctx.supabase
      .from("vaults")
      .insert({})
      .select()
      .single();

    if (vaultError) throw vaultError;

    // Create owner membership with enc_public_key for re-keying
    const { error: memberError } = await ctx.supabase.from("vault_memberships").insert({
      vault_id: vault.id,
      pubkey_hash: ctx.pubkeyHash,
      role: "owner",
      encrypted_vault_key: input.encryptedVaultKey,
      enc_public_key: input.encPublicKey,
    });

    if (memberError) {
      // Rollback vault creation
      await ctx.supabase.from("vaults").delete().eq("id", vault.id);
      throw memberError;
    }

    return { vault: { id: vault.id, createdAt: vault.created_at } };
  }),

  /**
   * Get vault details (requires membership)
   */
  get: vaultProcedure.input(vaultIdInput).query(async ({ ctx, input }) => {
    const { data: vault } = await ctx.supabase
      .from("vaults")
      .select("*")
      .eq("id", input.vaultId)
      .single();

    const { data: membership } = await ctx.supabase
      .from("vault_memberships")
      .select("encrypted_vault_key, role")
      .eq("vault_id", input.vaultId)
      .eq("pubkey_hash", ctx.pubkeyHash)
      .single();

    return {
      vault: {
        ...vault,
        encryptedVaultKey: membership?.encrypted_vault_key,
        role: membership?.role,
      },
    };
  }),
});
```

### 3.3 Sync Router

```typescript
// server/routers/sync.ts
import { router, vaultProcedure } from "../trpc";
import {
  createSnapshotInput,
  createUpdateInput,
  getUpdatesInput,
  vaultIdInput,
} from "../schemas/sync";
import { TRPCError } from "@trpc/server";

export const syncRouter = router({
  /**
   * Get the latest snapshot for a vault
   */
  getLatestSnapshot: vaultProcedure.input(vaultIdInput).query(async ({ ctx, input }) => {
    const { data: snapshot } = await ctx.supabase
      .from("vault_snapshots")
      .select("*")
      .eq("vault_id", input.vaultId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (!snapshot) return { snapshot: null };

    return {
      snapshot: {
        id: snapshot.id,
        version: snapshot.version,
        hlcTimestamp: snapshot.hlc_timestamp,
        encryptedData: snapshot.encrypted_data,
        createdAt: snapshot.created_at,
      },
    };
  }),

  /**
   * Create a new snapshot (periodic compaction)
   */
  createSnapshot: vaultProcedure.input(createSnapshotInput).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from("vault_snapshots")
      .insert({
        vault_id: input.vaultId,
        version: input.version,
        hlc_timestamp: input.hlcTimestamp,
        encrypted_data: input.encryptedData,
      })
      .select()
      .single();

    if (error?.code === "23505") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Snapshot version already exists",
      });
    }
    if (error) throw error;

    return {
      snapshot: {
        id: data.id,
        version: data.version,
        createdAt: data.created_at,
      },
    };
  }),

  /**
   * Get updates since a snapshot version
   */
  getUpdates: vaultProcedure.input(getUpdatesInput).query(async ({ ctx, input }) => {
    const { data: updates } = await ctx.supabase
      .from("vault_updates")
      .select("*")
      .eq("vault_id", input.vaultId)
      .gt("base_snapshot_version", input.afterSnapshotVersion)
      .order("created_at", { ascending: true });

    return {
      updates:
        updates?.map((u) => ({
          id: u.id,
          baseSnapshotVersion: u.base_snapshot_version,
          hlcTimestamp: u.hlc_timestamp,
          encryptedData: u.encrypted_data,
          createdAt: u.created_at,
        })) ?? [],
    };
  }),

  /**
   * Push an update (triggers Realtime broadcast)
   */
  pushUpdate: vaultProcedure.input(createUpdateInput).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from("vault_updates")
      .insert({
        vault_id: input.vaultId,
        base_snapshot_version: input.baseSnapshotVersion,
        hlc_timestamp: input.hlcTimestamp,
        encrypted_data: input.encryptedData,
        author_pubkey_hash: ctx.pubkeyHash,
      })
      .select()
      .single();

    if (error) throw error;

    return { update: { id: data.id, createdAt: data.created_at } };
  }),
});
```

### 3.4 Invite Router

```typescript
// server/routers/invite.ts
import { router, publicProcedure, authedProcedure, ownerProcedure } from "../trpc";
import { createInviteInput, getInviteInput, redeemInviteInput } from "../schemas/invite";
import { TRPCError } from "@trpc/server";

export const inviteRouter = router({
  /**
   * Create an invite (owner only)
   * - Client generates invite_secret, derives invite_keypair
   * - Wraps vault key with invite_pubkey
   */
  create: ownerProcedure.input(createInviteInput).mutation(async ({ ctx, input }) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

    const { data, error } = await ctx.supabase
      .from("vault_invites")
      .insert({
        vault_id: input.vaultId,
        invite_pubkey: input.invitePubkey,
        encrypted_vault_key: input.encryptedVaultKey,
        role: input.role,
        created_by: ctx.pubkeyHash,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error?.code === "23505") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Invite already exists",
      });
    }
    if (error) throw error;

    return {
      invite: {
        id: data.id,
        vaultId: data.vault_id,
        expiresAt: data.expires_at,
      },
    };
  }),

  /**
   * Get invite details (public - anyone with invite_pubkey can fetch)
   */
  get: publicProcedure.input(getInviteInput).query(async ({ ctx, input }) => {
    const { data: invite } = await ctx.supabase
      .from("vault_invites")
      .select("*")
      .eq("invite_pubkey", input.invitePubkey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite not found or expired",
      });
    }

    return {
      invite: {
        id: invite.id,
        vaultId: invite.vault_id,
        encryptedVaultKey: invite.encrypted_vault_key,
        role: invite.role,
        expiresAt: invite.expires_at,
      },
    };
  }),

  /**
   * Redeem an invite
   * - Client decrypts vault key with invite_privkey
   * - Re-wraps with their own X25519 pubkey
   * - Creates membership and deletes invite
   */
  redeem: authedProcedure.input(redeemInviteInput).mutation(async ({ ctx, input }) => {
    // Fetch invite
    const { data: invite } = await ctx.supabase
      .from("vault_invites")
      .select("*")
      .eq("invite_pubkey", input.invitePubkey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite not found or expired",
      });
    }

    // Check if already a member
    const { data: existing } = await ctx.supabase
      .from("vault_memberships")
      .select("id")
      .eq("vault_id", invite.vault_id)
      .eq("pubkey_hash", ctx.pubkeyHash)
      .single();

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Already a member of this vault",
      });
    }

    // Create membership
    const { error: memberError } = await ctx.supabase.from("vault_memberships").insert({
      vault_id: invite.vault_id,
      pubkey_hash: ctx.pubkeyHash,
      role: invite.role,
      encrypted_vault_key: input.encryptedVaultKey,
    });

    if (memberError) throw memberError;

    // Delete invite (single-use)
    await ctx.supabase.from("vault_invites").delete().eq("id", invite.id);

    return {
      membership: {
        vaultId: invite.vault_id,
        role: invite.role,
      },
    };
  }),
});
```

### 3.5 Membership Router

```typescript
// server/routers/membership.ts
import { router, vaultProcedure, ownerProcedure } from "../trpc";
import { removeMemberInput, vaultIdInput } from "../schemas/membership";
import { TRPCError } from "@trpc/server";

export const membershipRouter = router({
  /**
   * List members of a vault
   * Returns enc_public_key for each member to enable re-keying operations
   */
  list: vaultProcedure.input(vaultIdInput).query(async ({ ctx, input }) => {
    const { data: members } = await ctx.supabase
      .from("vault_memberships")
      .select("pubkey_hash, enc_public_key, role, created_at")
      .eq("vault_id", input.vaultId);

    return {
      members:
        members?.map((m) => ({
          pubkeyHash: m.pubkey_hash,
          encPublicKey: m.enc_public_key, // X25519 key for re-keying
          role: m.role,
          joinedAt: m.created_at,
        })) ?? [],
    };
  }),

  /**
   * Remove a member (owner only, or self-removal)
   *
   * IMPORTANT: After removing a member, the client MUST perform vault re-keying:
   * 1. Generate a new vault key
   * 2. Re-encrypt all vault data with new key
   * 3. Wrap new key for each remaining member using their enc_public_key
   * 4. Update all encrypted_vault_key values via sync.rekey procedure
   *
   * This ensures the removed member cannot decrypt future vault data.
   */
  remove: vaultProcedure.input(removeMemberInput).mutation(async ({ ctx, input }) => {
    // Self-removal is always allowed
    const isSelfRemoval = input.pubkeyHash === ctx.pubkeyHash;

    if (!isSelfRemoval && ctx.vaultRole !== "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners can remove other members",
      });
    }

    // Can't remove the last owner
    if (ctx.vaultRole === "owner") {
      const { count } = await ctx.supabase
        .from("vault_memberships")
        .select("id", { count: "exact" })
        .eq("vault_id", input.vaultId)
        .eq("role", "owner");

      if (count === 1 && isSelfRemoval) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the only owner. Transfer ownership first.",
        });
      }
    }

    await ctx.supabase
      .from("vault_memberships")
      .delete()
      .eq("vault_id", input.vaultId)
      .eq("pubkey_hash", input.pubkeyHash);

    return { success: true };
  }),
});
```

### 3.6 Root Router

```typescript
// server/routers/_app.ts
import { router } from "../trpc";
import { userRouter } from "./user";
import { vaultRouter } from "./vault";
import { syncRouter } from "./sync";
import { inviteRouter } from "./invite";
import { membershipRouter } from "./membership";

export const appRouter = router({
  user: userRouter,
  vault: vaultRouter,
  sync: syncRouter,
  invite: inviteRouter,
  membership: membershipRouter,
});

export type AppRouter = typeof appRouter;
```

---

## 4. Client Usage

### 4.1 Signed tRPC Client

```typescript
// lib/trpc/client.ts
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";
import sodium from "libsodium-wrappers";

export const trpc = createTRPCReact<AppRouter>();

// Create client with request signing
export function createTRPCClient(getSession: () => SessionData | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        async headers({ op }) {
          const session = getSession();
          if (!session) return {};

          await sodium.ready;
          const secretKey = sodium.from_base64(session.secretKey);
          const publicKey = sodium.from_base64(session.publicKey);

          const timestamp = Date.now().toString();
          const method = op.type === "query" ? "GET" : "POST";
          const path = `/api/trpc/${op.path}`;
          const bodyHash = op.input
            ? sodium.to_base64(sodium.crypto_generichash(32, JSON.stringify(op.input)))
            : "";

          const message = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
          const signature = sodium.crypto_sign_detached(sodium.from_string(message), secretKey);

          return {
            "X-Pubkey": sodium.to_base64(publicKey),
            "X-Timestamp": timestamp,
            "X-Signature": sodium.to_base64(signature),
            "X-Method": method,
            "X-Path": path,
            "X-Body-Hash": bodyHash,
          };
        },
      }),
    ],
  });
}
```

### 4.2 React Component Examples

```typescript
// Example: Create vault
function CreateVaultButton() {
  const utils = trpc.useUtils();
  const createVault = trpc.vault.create.useMutation({
    onSuccess: () => {
      utils.user.getData.invalidate();
    },
  });

  const handleCreate = async () => {
    const vaultKey = sodium.crypto_secretbox_keygen();
    const encryptedVaultKey = await wrapKeyWithUserPubkey(vaultKey);
    createVault.mutate({ encryptedVaultKey });
  };

  return <button onClick={handleCreate}>Create Vault</button>;
}

// Example: Share vault via invite link
function ShareVaultButton({
  vaultId,
  vaultKey,
}: {
  vaultId: string;
  vaultKey: Uint8Array;
}) {
  const createInvite = trpc.invite.create.useMutation();

  const handleShare = async () => {
    // Generate invite secret (32 bytes)
    const inviteSecret = sodium.randombytes_buf(32);

    // Derive invite keypair
    const inviteSeed = sodium.crypto_generichash(32, inviteSecret);
    const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSeed);

    // Wrap vault key with invite pubkey
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    const encryptedVaultKey = sodium.crypto_box_easy(
      vaultKey,
      nonce,
      inviteKeypair.publicKey,
      inviteKeypair.privateKey // Sealed box would be better
    );

    const result = await createInvite.mutateAsync({
      vaultId,
      invitePubkey: sodium.to_base64(inviteKeypair.publicKey),
      encryptedVaultKey: sodium.to_base64(
        new Uint8Array([...nonce, ...encryptedVaultKey])
      ),
      role: "member",
    });

    // Generate share URL (secret in fragment, never sent to server)
    const shareUrl = `${window.location.origin}/join#secret=${sodium.to_base64(
      inviteSecret
    )}`;
    await navigator.clipboard.writeText(shareUrl);
    alert("Invite link copied!");
  };

  return <button onClick={handleShare}>Share Vault</button>;
}

// Example: First-time user onboarding (automatic vault creation)
async function completeOnboarding(identity: {
  signingKeypair: sodium.KeyPair;
  encryptionKeypair: { publicKey: Uint8Array; privateKey: Uint8Array };
  pubkeyHash: string;
}) {
  // 1. Store session
  storeIdentitySession(identity);

  // 2. Check if user already exists (returning user on new device)
  const existsResult = await trpc.user.exists.query({ pubkeyHash: identity.pubkeyHash });

  if (existsResult.exists) {
    // Returning user - fetch their data
    const userData = await trpc.user.getData.query();
    if (userData.data) {
      const decrypted = decryptUserData(userData.data.encryptedData);
      if (decrypted.vaults.length > 0) {
        // User has vaults, select the active one or first
        setActiveVault(decrypted.globalSettings.activeVaultId ?? decrypted.vaults[0].id);
        return;
      }
    }
  }

  // 3. New user OR user with no vaults - create default vault
  const vaultKey = sodium.crypto_secretbox_keygen();

  // Wrap vault key with user's X25519 public key
  const encryptedVaultKey = wrapKeyForUser(vaultKey, identity.encryptionKeypair.publicKey);

  // Create vault on server
  const result = await trpc.vault.create.mutate({
    encryptedVaultKey: sodium.to_base64(encryptedVaultKey),
    encPublicKey: sodium.to_base64(identity.encryptionKeypair.publicKey),
  });

  // 4. Initialize local LoroDoc with default state
  const doc = new LoroDoc();
  initializeVaultDefaults(doc); // Creates default statuses, empty collections

  // 5. Store user data with new vault reference
  const userData: UserData = {
    vaults: [{
      id: result.vault.id,
      wrappedKey: sodium.to_base64(encryptedVaultKey),
      name: "My Vault",
    }],
    globalSettings: {
      activeVaultId: result.vault.id,
      theme: "system",
      defaultCurrency: "USD",
    },
  };

  const encryptedUserData = encryptUserData(userData, identity);
  await trpc.user.upsertData.mutate({ encryptedData: encryptedUserData });

  // 6. Create initial snapshot
  const snapshot = doc.export({ mode: "snapshot" });
  const encryptedSnapshot = encryptVaultData(snapshot, vaultKey);
  await trpc.sync.createSnapshot.mutate({
    vaultId: result.vault.id,
    version: 1,
    hlcTimestamp: generateHlc(),
    encryptedData: sodium.to_base64(encryptedSnapshot),
  });

  // 7. Set active vault and navigate
  setActiveVault(result.vault.id);
}
```

**Key points for automatic vault creation**:

1. **Always check first** - User might be returning on a new device
2. **Atomic creation** - Vault + membership + snapshot created together
3. **Default initialization** - LoroDoc initialized with default statuses
4. **User data updated** - Vault reference stored in encrypted user_data
5. **No empty states** - User never sees "No vault selected" after onboarding

## 5. Real-time Subscriptions (Supabase Realtime)

Real-time sync uses **Supabase Realtime** directly (not tRPC) for WebSocket efficiency:

```typescript
// hooks/useVaultSync.ts
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useVaultSync(vaultId: string, onUpdate: (update: EncryptedUpdate) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`vault:${vaultId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vault_updates",
          filter: `vault_id=eq.${vaultId}`,
        },
        (payload) => {
          onUpdate(payload.new as EncryptedUpdate);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [vaultId, onUpdate]);
}
```

**Notes**:

- Uses Supabase Realtime Postgres Changes
- Filtered to specific vault
- RLS ensures users only receive updates for vaults they're members of

---

## 6. Error Handling

tRPC provides typed errors with codes:

| tRPC Code               | HTTP Status | Description                    |
| ----------------------- | ----------- | ------------------------------ |
| `BAD_REQUEST`           | 400         | Input validation failed        |
| `UNAUTHORIZED`          | 401         | Invalid or missing signature   |
| `FORBIDDEN`             | 403         | Not a vault member / not owner |
| `NOT_FOUND`             | 404         | Resource not found             |
| `CONFLICT`              | 409         | Version conflict / duplicate   |
| `TOO_MANY_REQUESTS`     | 429         | Rate limited                   |
| `INTERNAL_SERVER_ERROR` | 500         | Server error                   |

---

## 7. Rate Limits

Implemented via middleware (rate limit by pubkeyHash or IP):

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "15 m"),
});

const rateLimited = t.middleware(async ({ ctx, next, path }) => {
  const identifier = ctx.pubkeyHash ?? ctx.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await ratelimit.limit(`${path}:${identifier}`);

  if (!success) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Rate limited" });
  }

  return next();
});
```

| Procedure         | Limit | Window     |
| ----------------- | ----- | ---------- |
| `invite.create`   | 10    | 1 hour     |
| `invite.redeem`   | 10    | 15 minutes |
| `sync.pushUpdate` | 60    | 1 minute   |
