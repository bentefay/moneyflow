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

export const realtimeGrantRowSchema = z.object({
    grant_id: z.uuid(),
    vault_role: vaultRoleSchema,
    expires_at: z.iso.datetime({ offset: true })
});

export type RealtimePurpose = z.infer<typeof realtimePurposeSchema>;
export type RealtimeCredential = z.infer<typeof realtimeCredentialSchema>;
