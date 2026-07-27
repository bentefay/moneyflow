import { z } from "zod";

import { vaultIdSchema, vaultRoleSchema } from "./vault";

export const realtimePurposeSchema = z.enum(["sync", "presence"]);

export const realtimeAuthorizeInput = z
    .object({
        vaultId: vaultIdSchema,
        purpose: realtimePurposeSchema,
        previousGrantId: z.uuid().optional()
    })
    .strict();

export const realtimeCredentialSchema = z.object({
    token: z.string().min(1),
    grantId: z.uuid(),
    expiresAt: z.iso.datetime({ offset: true }),
    refreshAt: z.iso.datetime({ offset: true }),
    vaultId: vaultIdSchema,
    purpose: realtimePurposeSchema
});

export const realtimeRevokeInput = z
    .object({
        vaultId: vaultIdSchema,
        purpose: realtimePurposeSchema,
        grantId: z.uuid()
    })
    .strict();

export const realtimeRevokeOutput = z.object({ revoked: z.boolean() });

/**
 * A `vault_ops` INSERT payload arriving over the Realtime socket.
 *
 * The socket is an untrusted boundary: the server-side RLS policy scopes the subscription, but the
 * frame itself is whatever reached the client. Only the columns the transport forwards are
 * required. Note that validating this shape does NOT establish vault scope - the caller must still
 * re-check `vault_id` against the subscribed vault.
 */
export const vaultOpRealtimeRowSchema = z.looseObject({
    id: z.string().min(1),
    vault_id: z.string().min(1),
    encrypted_data: z.string(),
    version_vector: z.string(),
    author_pubkey_hash: z.string()
});

export const realtimeGrantRowSchema = z.object({
    grant_id: z.uuid(),
    vault_role: vaultRoleSchema,
    expires_at: z.iso.datetime({ offset: true })
});

export type RealtimePurpose = z.infer<typeof realtimePurposeSchema>;
export type RealtimeCredential = z.infer<typeof realtimeCredentialSchema>;
