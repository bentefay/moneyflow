/**
 * Vault Zod Schemas
 *
 * Input/output schemas for vault-related tRPC procedures.
 * These schemas are used for:
 * - Runtime validation of API inputs
 * - TypeScript type inference
 * - Client-side form validation (shared schemas)
 */

import { z } from "zod";

// ============================================================================
// Base Schemas (reusable primitives)
// ============================================================================

/**
 * UUID v4 format for vault IDs
 */
export const vaultIdSchema = z.string().uuid("Must be a valid UUID");

/**
 * Base64-encoded encrypted vault key
 */
export const encryptedVaultKeySchema = z
  .string()
  .min(1, "Encrypted vault key cannot be empty")
  .refine(
    (val) => {
      try {
        atob(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be valid base64" }
  );

/**
 * Vault role enum
 */
export const vaultRoleSchema = z.enum(["owner", "member"]);

export type VaultRole = z.infer<typeof vaultRoleSchema>;

// ============================================================================
// Vault Creation
// ============================================================================

/**
 * Base64-encoded X25519 public key
 */
export const encPublicKeySchema = z
  .string()
  .min(1, "Encryption public key cannot be empty")
  .refine(
    (val) => {
      try {
        atob(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be valid base64" }
  );

/**
 * Create a new vault.
 *
 * The encrypted_vault_key is the vault's symmetric key wrapped with
 * the creator's X25519 public key for key exchange.
 */
export const vaultCreateInput = z.object({
  /**
   * Vault key encrypted/wrapped with creator's X25519 public key.
   * This key is used to encrypt/decrypt all vault CRDT data.
   */
  encryptedVaultKey: encryptedVaultKeySchema,
  /**
   * Creator's X25519 public key for vault re-keying operations.
   * When a member is removed, the vault key can be re-encrypted
   * for all remaining members using their stored enc_public_key.
   */
  encPublicKey: encPublicKeySchema,
});

export type VaultCreateInput = z.infer<typeof vaultCreateInput>;

export const vaultCreateOutput = z.object({
  vaultId: vaultIdSchema,
});

export type VaultCreateOutput = z.infer<typeof vaultCreateOutput>;

// ============================================================================
// Vault Get
// ============================================================================

export const vaultGetInput = z.object({
  vaultId: vaultIdSchema,
});

export type VaultGetInput = z.infer<typeof vaultGetInput>;

export const vaultGetOutput = z.object({
  vault: z.object({
    id: vaultIdSchema,
    createdAt: z.string(),
  }),
  role: vaultRoleSchema,
  encryptedVaultKey: encryptedVaultKeySchema,
});

export type VaultGetOutput = z.infer<typeof vaultGetOutput>;

// ============================================================================
// Vault List
// ============================================================================

/**
 * List all vaults the user is a member of.
 * No input required - uses pubkey_hash from auth context.
 */
export const vaultListInput = z.object({}).optional();

export type VaultListInput = z.infer<typeof vaultListInput>;

export const vaultListOutput = z.object({
  vaults: z.array(
    z.object({
      id: vaultIdSchema,
      role: vaultRoleSchema,
      encryptedVaultKey: encryptedVaultKeySchema,
      createdAt: z.string(),
    })
  ),
});

export type VaultListOutput = z.infer<typeof vaultListOutput>;

// ============================================================================
// Vault Delete
// ============================================================================

export const vaultDeleteInput = z.object({
  vaultId: vaultIdSchema,
});

export type VaultDeleteInput = z.infer<typeof vaultDeleteInput>;

export const vaultDeleteOutput = z.object({
  success: z.boolean(),
});

export type VaultDeleteOutput = z.infer<typeof vaultDeleteOutput>;

// ============================================================================
// Vault Leave
// ============================================================================

export const vaultLeaveInput = z.object({
  vaultId: vaultIdSchema,
});

export type VaultLeaveInput = z.infer<typeof vaultLeaveInput>;

export const vaultLeaveOutput = z.object({
  success: z.boolean(),
});

export type VaultLeaveOutput = z.infer<typeof vaultLeaveOutput>;

// ============================================================================
// Vault Members
// ============================================================================

export const vaultMembersInput = z.object({
  vaultId: vaultIdSchema,
});

export type VaultMembersInput = z.infer<typeof vaultMembersInput>;

export const vaultMemberSchema = z.object({
  pubkeyHash: z.string(),
  role: vaultRoleSchema,
  createdAt: z.string(),
});

export type VaultMember = z.infer<typeof vaultMemberSchema>;

export const vaultMembersOutput = z.object({
  members: z.array(vaultMemberSchema),
});

export type VaultMembersOutput = z.infer<typeof vaultMembersOutput>;
