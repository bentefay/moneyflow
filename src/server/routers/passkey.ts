/**
 * Passkey Router
 *
 * Server half of the WebAuthn PRF passkey protocol.
 *
 * The server's job is narrow and deliberately so: mint single-use challenges, verify ceremonies
 * with a vetted library, and store opaque ciphertext. It never sees the PRF output, never sees the
 * master identity secret, and cannot open a wrapped secret it stores.
 *
 * Registration is protected - only an already-unlocked identity may bind a new credential to
 * itself. Authentication is necessarily public, because the caller has no identity to sign with
 * yet; it fails closed and releases the wrapped secret only after a fully verified assertion.
 */

import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse
} from "@simplewebauthn/server";
import { TRPCError } from "@trpc/server";

import { PASSKEY_PRF_SALT } from "@/lib/crypto/passkeyWrap";
import { createSupabaseClient } from "@/lib/supabase/server";

import {
    passkeyCredentialSummarySchema,
    passkeyFinishAuthenticationInput,
    passkeyFinishAuthenticationOutput,
    passkeyFinishRegistrationInput,
    passkeyRevokeCredentialInput,
    passkeyRevokeCredentialOutput,
    passkeyStartAuthenticationInput,
    passkeyStartRegistrationInput
} from "../schemas/passkey";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const RP_NAME = "MoneyFlow";
const CHALLENGE_TTL_SECONDS = 300;

/**
 * Resolves the expected origin and RP ID from server configuration.
 *
 * These are deliberately NOT read from request headers. `Host`/`Origin` are attacker-controlled,
 * and trusting them would let a phishing origin have its own ceremony verified as legitimate -
 * exactly the binding WebAuthn exists to provide.
 */
function resolveRelyingParty(): { origin: string; rpId: string } {
    const configured =
        process.env.NEXT_PUBLIC_APP_ORIGIN ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
        `http://localhost:${process.env.PORT ?? 3000}`;

    let parsed: URL;
    try {
        parsed = new URL(configured);
    } catch {
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Passkey support is unavailable"
        });
    }

    return { origin: parsed.origin, rpId: parsed.hostname };
}

/** Fresh 32-byte challenge, base64url encoded for storage and comparison. */
function createChallenge(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

/**
 * Fails every ceremony error the same way.
 *
 * A caller must not be able to distinguish "unknown credential" from "bad signature" from
 * "expired challenge", since those differences are exactly what an attacker would probe to
 * enumerate registered identities.
 */
function rejectCeremony(): never {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Passkey authentication failed" });
}

function handleDatabaseError(operation: string): never {
    console.error(`[${operation}] Passkey database operation failed`);
    throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Passkey support is unavailable"
    });
}

interface ClaimedChallenge {
    challenge: string;
    pubkeyHash: string | null;
}

/**
 * Consumes a challenge exactly once.
 *
 * The single-use guarantee lives in the database, not here: the RPC deletes the row as it reads
 * it, so a replay is a no-row result regardless of concurrency.
 */
async function claimChallenge(
    challengeId: string,
    ceremony: "registration" | "authentication"
): Promise<ClaimedChallenge> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.rpc("claim_passkey_challenge", {
        p_challenge_id: challengeId,
        p_ceremony: ceremony
    });

    const claimed = data?.[0];
    if (error || !claimed) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Passkey challenge is invalid or already used"
        });
    }

    return { challenge: claimed.challenge, pubkeyHash: claimed.pubkey_hash };
}

async function mintChallenge(
    ceremony: "registration" | "authentication",
    pubkeyHash: string | null
): Promise<{ challengeId: string; challenge: string }> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.rpc("create_passkey_challenge", {
        p_challenge: createChallenge(),
        p_ceremony: ceremony,
        p_ttl_seconds: CHALLENGE_TTL_SECONDS,
        // Omitted entirely for authentication: there is no identity to bind the challenge to yet.
        ...(pubkeyHash === null ? {} : { p_pubkey_hash: pubkeyHash })
    });

    const minted = data?.[0];
    if (error || !minted) {
        handleDatabaseError(`passkey.${ceremony}:challenge`);
    }

    return { challengeId: minted.challenge_id, challenge: minted.challenge };
}

export const passkeyRouter = router({
    /**
     * Begin registering a new passkey for the already-unlocked identity.
     */
    startRegistration: protectedProcedure
        .input(passkeyStartRegistrationInput)
        .mutation(async ({ ctx }) => {
            const { rpId } = resolveRelyingParty();
            const supabase = await createSupabaseClient();

            const { data: existing, error } = await supabase
                .from("passkey_credentials")
                .select("credential_id, transports")
                .eq("pubkey_hash", ctx.pubkeyHash)
                .order("created_at", { ascending: true });

            if (error) {
                handleDatabaseError("passkey.startRegistration:list");
            }

            const { challengeId, challenge } = await mintChallenge("registration", ctx.pubkeyHash);

            const options = await generateRegistrationOptions({
                rpName: RP_NAME,
                rpID: rpId,
                userName: RP_NAME,
                // The identity is the pubkey hash. It is already a hash, so it discloses nothing
                // that the server does not necessarily hold.
                userID: new TextEncoder().encode(ctx.pubkeyHash),
                challenge: Buffer.from(challenge, "base64url"),
                attestationType: "none",
                excludeCredentials: (existing ?? []).map((credential) => ({
                    id: credential.credential_id,
                    transports: credential.transports as never
                })),
                authenticatorSelection: {
                    residentKey: "required",
                    userVerification: "required"
                },
                // Probe only. Create-time PRF results are optional per spec and differ from
                // assertion-time output on some authenticators, so the key is always derived
                // from a subsequent assertion instead.
                extensions: { prf: {} }
            });

            return { challengeId, options };
        }),

    /**
     * Complete registration, storing verified credential metadata and the wrapped secret.
     */
    finishRegistration: protectedProcedure
        .input(passkeyFinishRegistrationInput)
        .mutation(async ({ ctx, input }) => {
            const { origin, rpId } = resolveRelyingParty();
            const claimed = await claimChallenge(input.challengeId, "registration");

            // A challenge minted for one identity must never complete registration for another.
            if (claimed.pubkeyHash !== ctx.pubkeyHash) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Passkey challenge mismatch" });
            }

            const verification = await verifyRegistrationResponse({
                response: input.response as never,
                expectedChallenge: claimed.challenge,
                expectedOrigin: origin,
                expectedRPID: rpId,
                requireUserVerification: true
            }).catch(() => null);

            if (!verification?.verified || !verification.registrationInfo) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Passkey registration could not be verified"
                });
            }

            const { credential, aaguid, credentialBackedUp, credentialDeviceType } =
                verification.registrationInfo;

            const supabase = await createSupabaseClient();
            const { data: registered, error } = await supabase.rpc("register_passkey_credential", {
                p_pubkey_hash: ctx.pubkeyHash,
                p_credential_id: credential.id,
                p_public_key: Buffer.from(credential.publicKey).toString("base64"),
                p_counter: credential.counter,
                p_transports: credential.transports ?? [],
                p_aaguid: aaguid,
                p_backed_up: credentialBackedUp,
                p_device_type: credentialDeviceType,
                p_wrapped_secret: input.wrappedSecret,
                p_wrap_version: 1,
                p_label: input.label
            });

            if (error) {
                handleDatabaseError("passkey.finishRegistration:store");
            }

            return { registered: registered === true, credentialId: credential.id };
        }),

    /**
     * Begin a passkey unlock. Public: the caller has no identity to sign with yet.
     */
    startAuthentication: publicProcedure
        .input(passkeyStartAuthenticationInput)
        .mutation(async () => {
            const { rpId } = resolveRelyingParty();
            const { challengeId, challenge } = await mintChallenge("authentication", null);

            const options = await generateAuthenticationOptions({
                rpID: rpId,
                challenge: Buffer.from(challenge, "base64url"),
                userVerification: "required",
                // allowCredentials is deliberately omitted. Listing credentials would disclose
                // which identities exist to any anonymous caller; discoverable credentials let the
                // authenticator choose without the server naming anyone.
                extensions: { prf: { eval: { first: PASSKEY_PRF_SALT } } }
            });

            return { challengeId, options };
        }),

    /**
     * Complete a passkey unlock, releasing the wrapped secret only on a verified assertion.
     */
    finishAuthentication: publicProcedure
        .input(passkeyFinishAuthenticationInput)
        .output(passkeyFinishAuthenticationOutput)
        .mutation(async ({ input }) => {
            const { origin, rpId } = resolveRelyingParty();
            const claimed = await claimChallenge(input.challengeId, "authentication");

            const supabase = await createSupabaseClient();
            const { data: stored, error } = await supabase
                .from("passkey_credentials")
                .select(
                    "credential_id, public_key, counter, transports, wrapped_secret, wrap_version, pubkey_hash"
                )
                .eq("credential_id", input.response.id)
                .maybeSingle();

            if (error) {
                handleDatabaseError("passkey.finishAuthentication:lookup");
            }
            if (!stored) {
                rejectCeremony();
            }

            const verification = await verifyAuthenticationResponse({
                response: input.response as never,
                expectedChallenge: claimed.challenge,
                expectedOrigin: origin,
                expectedRPID: rpId,
                requireUserVerification: true,
                credential: {
                    id: stored.credential_id,
                    publicKey: new Uint8Array(Buffer.from(stored.public_key, "base64")),
                    counter: stored.counter,
                    transports: stored.transports as never
                }
            }).catch(() => null);

            if (!verification?.verified) {
                rejectCeremony();
            }

            const { error: recordError } = await supabase.rpc("record_passkey_authentication", {
                p_credential_id: stored.credential_id,
                p_counter: verification.authenticationInfo.newCounter
            });

            if (recordError) {
                handleDatabaseError("passkey.finishAuthentication:record");
            }

            return {
                wrappedSecret: stored.wrapped_secret,
                wrapVersion: stored.wrap_version,
                pubkeyHash: stored.pubkey_hash
            };
        }),

    /**
     * List the caller's credentials. Non-secret metadata only.
     */
    listCredentials: protectedProcedure
        .output(passkeyCredentialSummarySchema.array())
        .query(async ({ ctx }) => {
            const supabase = await createSupabaseClient();
            const { data, error } = await supabase
                .from("passkey_credentials")
                .select("credential_id, label, created_at, last_used_at, transports, backed_up")
                .eq("pubkey_hash", ctx.pubkeyHash)
                .order("created_at", { ascending: true });

            if (error) {
                handleDatabaseError("passkey.listCredentials:query");
            }

            return (data ?? []).map((credential) => ({
                credentialId: credential.credential_id,
                label: credential.label,
                createdAt: credential.created_at,
                lastUsedAt: credential.last_used_at,
                transports: credential.transports,
                backedUp: credential.backed_up
            }));
        }),

    /**
     * Revoke one of the caller's credentials, destroying its wrapped secret with it.
     */
    revokeCredential: protectedProcedure
        .input(passkeyRevokeCredentialInput)
        .output(passkeyRevokeCredentialOutput)
        .mutation(async ({ ctx, input }) => {
            const supabase = await createSupabaseClient();
            const { data, error } = await supabase.rpc("revoke_passkey_credential", {
                p_pubkey_hash: ctx.pubkeyHash,
                p_credential_id: input.credentialId
            });

            if (error) {
                handleDatabaseError("passkey.revokeCredential:delete");
            }

            return { revoked: data === true };
        })
});
