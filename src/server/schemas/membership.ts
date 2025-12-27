/**
 * Membership Zod Schemas
 *
 * Input/output schemas for vault membership management procedures.
 *
 * Memberships track who has access to a vault and store:
 * - encrypted_vault_key: The vault key wrapped for this member's X25519 key
 * - enc_public_key: Member's X25519 public key for re-keying operations
 * - role: "owner" or "member"
 */

import { z } from "zod";
import {
  vaultIdSchema,
  vaultRoleSchema,
  encryptedVaultKeySchema,
  encPublicKeySchema,
} from "./vault";

// ============================================================================
// Member Schema
// ============================================================================

/**
 * Vault member details
 */
export const memberSchema = z.object({
  /** User's pubkey hash (opaque identifier) */
  pubkeyHash: z.string(),
  /** Role in the vault */
  role: vaultRoleSchema,
  /** X25519 public key for re-keying (needed when removing other members) */
  encPublicKey: encPublicKeySchema.nullable(),
  /** When this member joined */
  createdAt: z.string(),
});

export type Member = z.infer<typeof memberSchema>;

// ============================================================================
// Membership List
// ============================================================================

/**
 * List all members of a vault.
 */
export const membershipListInput = z.object({
  vaultId: vaultIdSchema,
});

export type MembershipListInput = z.infer<typeof membershipListInput>;

export const membershipListOutput = z.object({
  members: z.array(memberSchema),
});

export type MembershipListOutput = z.infer<typeof membershipListOutput>;

// ============================================================================
// Membership Remove
// ============================================================================

/**
 * Remove a member from a vault (owner only).
 *
 * After removal, the vault must be re-keyed to prevent the removed
 * member from accessing future updates:
 * 1. Generate new vault key
 * 2. Re-encrypt vault snapshot with new key
 * 3. Wrap new key for all remaining members using their enc_public_key
 * 4. Push re-key update to server
 */
export const membershipRemoveInput = z.object({
  vaultId: vaultIdSchema,
  /** pubkey_hash of the member to remove */
  pubkeyHash: z.string().min(1, "pubkeyHash is required"),
});

export type MembershipRemoveInput = z.infer<typeof membershipRemoveInput>;

export const membershipRemoveOutput = z.object({
  success: z.boolean(),
  /** Remaining members who need new vault keys */
  remainingMembers: z.array(
    z.object({
      pubkeyHash: z.string(),
      encPublicKey: z.string(),
    })
  ),
});

export type MembershipRemoveOutput = z.infer<typeof membershipRemoveOutput>;

// ============================================================================
// Membership Re-key
// ============================================================================

/**
 * Update vault keys after re-keying.
 *
 * After removing a member, the client must:
 * 1. Generate new vault key
 * 2. Re-encrypt CRDT snapshot with new key
 * 3. Wrap new key for each remaining member
 * 4. Submit wrapped keys via this procedure
 */
export const membershipRekeyInput = z.object({
  vaultId: vaultIdSchema,
  /** New wrapped vault keys for each remaining member */
  memberKeys: z.array(
    z.object({
      pubkeyHash: z.string(),
      encryptedVaultKey: encryptedVaultKeySchema,
    })
  ),
});

export type MembershipRekeyInput = z.infer<typeof membershipRekeyInput>;

export const membershipRekeyOutput = z.object({
  success: z.boolean(),
});

export type MembershipRekeyOutput = z.infer<typeof membershipRekeyOutput>;
