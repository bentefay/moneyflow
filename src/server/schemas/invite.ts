/**
 * Invite Zod Schemas
 *
 * Input/output schemas for vault invitation procedures.
 *
 * Zero-Knowledge Invite Flow:
 * 1. Owner creates invite: generates ephemeral keypair from random secret
 * 2. Owner shares URL with secret in fragment (never sent to server)
 * 3. Recipient derives ephemeral pubkey from secret, looks up invite
 * 4. Recipient unwraps vault key using secret, re-wraps with their own pubkey
 * 5. Recipient joins vault with re-wrapped key + their enc_public_key
 */

import { z } from "zod";
import { encPublicKeySchema, encryptedVaultKeySchema, vaultRoleSchema } from "./vault";

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Invite ID (UUID)
 */
export const inviteIdSchema = z.string().uuid("Must be a valid UUID");

/**
 * Ephemeral public key for invite (derived from invite secret)
 * Base64-encoded X25519 public key
 */
export const invitePubkeySchema = z
	.string()
	.min(1, "Invite public key cannot be empty")
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
 * Expiry duration in hours (1-168, i.e., 1 hour to 1 week)
 */
export const expiryHoursSchema = z
	.number()
	.int()
	.min(1, "Minimum expiry is 1 hour")
	.max(168, "Maximum expiry is 1 week (168 hours)")
	.default(48);

// ============================================================================
// Invite Create
// ============================================================================

/**
 * Create a new vault invite.
 *
 * The client generates an ephemeral keypair from a random invite secret:
 * - invitePubkey: X25519 public key for looking up the invite
 * - encryptedVaultKey: vault key wrapped with the ephemeral public key
 *
 * The invite secret is shared via URL fragment and never sent to server.
 */
export const inviteCreateInput = z.object({
	/** Vault to invite to */
	vaultId: z.string().uuid(),
	/** Ephemeral X25519 public key (derived from invite secret) */
	invitePubkey: invitePubkeySchema,
	/** Vault key wrapped with ephemeral invite pubkey */
	encryptedVaultKey: encryptedVaultKeySchema,
	/** Role to grant the invitee */
	role: vaultRoleSchema.default("member"),
	/** Hours until invite expires (default 48) */
	expiresInHours: expiryHoursSchema,
});

export type InviteCreateInput = z.infer<typeof inviteCreateInput>;

export const inviteCreateOutput = z.object({
	/** ID of the created invite */
	inviteId: inviteIdSchema,
	/** When the invite expires */
	expiresAt: z.string(),
});

export type InviteCreateOutput = z.infer<typeof inviteCreateOutput>;

// ============================================================================
// Invite Get by Pubkey (unauthenticated)
// ============================================================================

/**
 * Look up an invite by ephemeral public key.
 *
 * This is a public procedure - anyone with the invite secret can derive
 * the pubkey and look up the invite details.
 */
export const inviteGetByPubkeyInput = z.object({
	/** Ephemeral X25519 public key (derived from invite secret) */
	invitePubkey: invitePubkeySchema,
});

export type InviteGetByPubkeyInput = z.infer<typeof inviteGetByPubkeyInput>;

export const inviteGetByPubkeyOutput = z.object({
	/** Invite ID */
	inviteId: inviteIdSchema,
	/** Vault being invited to */
	vaultId: z.string().uuid(),
	/** Vault key wrapped with ephemeral pubkey (recipient unwraps with secret) */
	encryptedVaultKey: encryptedVaultKeySchema,
	/** Role that will be granted */
	role: vaultRoleSchema,
	/** When the invite expires */
	expiresAt: z.string(),
});

export type InviteGetByPubkeyOutput = z.infer<typeof inviteGetByPubkeyOutput>;

// ============================================================================
// Invite Accept/Redeem
// ============================================================================

/**
 * Accept an invite to join a vault.
 *
 * The client:
 * 1. Derives ephemeral keypair from invite secret
 * 2. Unwraps vault key using ephemeral private key
 * 3. Re-wraps vault key with their own X25519 public key
 * 4. Submits re-wrapped key + their enc_public_key
 */
export const inviteAcceptInput = z.object({
	/** Ephemeral pubkey to identify the invite */
	invitePubkey: invitePubkeySchema,
	/** Vault key re-wrapped for user's X25519 public key */
	encryptedVaultKey: encryptedVaultKeySchema,
	/** User's X25519 public key for future vault re-keying operations */
	encPublicKey: encPublicKeySchema,
});

export type InviteAcceptInput = z.infer<typeof inviteAcceptInput>;

export const inviteAcceptOutput = z.object({
	/** Vault that was joined */
	vaultId: z.string().uuid(),
	/** Role granted to the user */
	role: vaultRoleSchema,
});

export type InviteAcceptOutput = z.infer<typeof inviteAcceptOutput>;

// ============================================================================
// Invite List
// ============================================================================

/**
 * List active invites for a vault (owner only).
 */
export const inviteListInput = z.object({
	vaultId: z.string().uuid(),
});

export type InviteListInput = z.infer<typeof inviteListInput>;

export const inviteListItemSchema = z.object({
	id: inviteIdSchema,
	role: vaultRoleSchema,
	expiresAt: z.string(),
	createdAt: z.string(),
	isExpired: z.boolean(),
});

export type InviteListItem = z.infer<typeof inviteListItemSchema>;

export const inviteListOutput = z.array(inviteListItemSchema);

export type InviteListOutput = z.infer<typeof inviteListOutput>;

// ============================================================================
// Invite Revoke
// ============================================================================

/**
 * Revoke an invite (owner only).
 */
export const inviteRevokeInput = z.object({
	inviteId: inviteIdSchema,
});

export type InviteRevokeInput = z.infer<typeof inviteRevokeInput>;

export const inviteRevokeOutput = z.object({
	success: z.boolean(),
});

export type InviteRevokeOutput = z.infer<typeof inviteRevokeOutput>;
