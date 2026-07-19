import { createHmac } from "node:crypto";

import { TRPCError } from "@trpc/server";

import { createSupabaseClient } from "@/lib/supabase/server";

import {
    realtimeAuthorizeInput,
    realtimeCredentialSchema,
    realtimeGrantRowSchema,
    realtimeRevokeInput,
    realtimeRevokeOutput
} from "../schemas/realtime";
import { protectedProcedure, router } from "../trpc";

const REALTIME_TOKEN_TTL_SECONDS = 60;
const REALTIME_REFRESH_LEAD_SECONDS = 20;
const REALTIME_CLOCK_SKEW_SECONDS = 5;
const NO_PREVIOUS_GRANT_ID = "00000000-0000-0000-0000-000000000000";

function base64UrlJson(value: Readonly<Record<string, unknown>>): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function requireRealtimeJwtSecret(): string {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Realtime authorization is unavailable"
        });
    }
    return secret;
}

function createRealtimeToken(input: {
    grantId: string;
    vaultId: string;
    purpose: "sync" | "presence";
    vaultRole: "owner" | "member";
    expiresAt: string;
}): { token: string; refreshAt: string } {
    const secret = requireRealtimeJwtSecret();
    const expiresAtMilliseconds = Date.parse(input.expiresAt);
    if (!Number.isFinite(expiresAtMilliseconds)) {
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Realtime authorization is unavailable"
        });
    }

    const expiresAtSeconds = Math.floor(expiresAtMilliseconds / 1000);
    const issuedAtSeconds = expiresAtSeconds - REALTIME_TOKEN_TTL_SECONDS;
    const encodedHeader = base64UrlJson({ alg: "HS256", typ: "JWT" });
    const encodedPayload = base64UrlJson({
        iss: "moneyflow",
        aud: "authenticated",
        sub: input.grantId,
        jti: input.grantId,
        role: "authenticated",
        iat: issuedAtSeconds,
        nbf: issuedAtSeconds - REALTIME_CLOCK_SKEW_SECONDS,
        exp: expiresAtSeconds,
        vault_id: input.vaultId,
        realtime_table: "vault_ops",
        realtime_purpose: input.purpose,
        realtime_topic: `vault:${input.vaultId}:${input.purpose}`,
        vault_role: input.vaultRole
    });
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");

    return {
        token: `${unsignedToken}.${signature}`,
        refreshAt: new Date(
            expiresAtMilliseconds - REALTIME_REFRESH_LEAD_SECONDS * 1000
        ).toISOString()
    };
}

export const realtimeRouter = router({
    authorize: protectedProcedure
        .input(realtimeAuthorizeInput)
        .output(realtimeCredentialSchema)
        .mutation(async ({ ctx, input }) => {
            requireRealtimeJwtSecret();
            const supabase = await createSupabaseClient();
            const { data, error } = await supabase.rpc("rotate_realtime_grant", {
                p_pubkey_hash: ctx.pubkeyHash,
                p_vault_id: input.vaultId,
                p_purpose: input.purpose,
                p_previous_grant_id: input.previousGrantId ?? NO_PREVIOUS_GRANT_ID,
                p_ttl_seconds: REALTIME_TOKEN_TTL_SECONDS
            });
            const grant = realtimeGrantRowSchema.safeParse(data?.[0]);

            if (error || !grant.success) {
                throw new TRPCError({
                    code: error?.code === "42501" ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
                    message:
                        error?.code === "42501"
                            ? "Vault access denied"
                            : "Realtime authorization is unavailable"
                });
            }

            const signed = createRealtimeToken({
                grantId: grant.data.grant_id,
                vaultId: input.vaultId,
                purpose: input.purpose,
                vaultRole: grant.data.vault_role,
                expiresAt: grant.data.expires_at
            });

            return {
                ...signed,
                grantId: grant.data.grant_id,
                expiresAt: grant.data.expires_at,
                vaultId: input.vaultId,
                purpose: input.purpose
            };
        }),

    revoke: protectedProcedure
        .input(realtimeRevokeInput)
        .output(realtimeRevokeOutput)
        .mutation(async ({ ctx, input }) => {
            const supabase = await createSupabaseClient();
            const { data, error } = await supabase.rpc("revoke_realtime_grant", {
                p_pubkey_hash: ctx.pubkeyHash,
                p_vault_id: input.vaultId,
                p_purpose: input.purpose,
                p_grant_id: input.grantId
            });

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Realtime authorization is unavailable"
                });
            }

            return { revoked: data === true };
        })
});
