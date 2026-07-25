/**
 * Passkey Zod Schemas
 *
 * Wire validation for the WebAuthn ceremony procedures.
 *
 * Note what is deliberately absent: no schema here accepts a `pubkeyHash`, and none accepts a
 * `prf` extension result. Identity comes from verified signature middleware, and the PRF output
 * must never reach the server at all - a request carrying one is rejected rather than ignored.
 */

import { z } from "zod";

/** Base64url, the encoding WebAuthn uses for credential ids and ceremony payloads. */
const base64Url = z.string().regex(/^[A-Za-z0-9_-]+$/, "Must be base64url encoded");

/** Standard base64, used for the client-encrypted wrapped secret and stored public key. */
const base64Standard = z.string().regex(/^[A-Za-z0-9+/]+=*$/, "Must be base64 encoded");

export const credentialIdSchema = base64Url.min(16).max(1023);

/**
 * Client extension results, with `prf` explicitly forbidden.
 *
 * W3C WebAuthn Level 3 §10.1.4 warns that a serialized credential carries the raw PRF output. The
 * client strips it; this schema makes a failure of that stripping a loud validation error rather
 * than a silent secret leak into server logs or storage.
 */
const clientExtensionResultsSchema = z
    .looseObject({})
    .refine((results) => !("prf" in results), {
        message: "PRF extension results must never be transmitted to the server"
    })
    // The browser package's own output type has no index signature, so the inferred loose-object
    // type would not accept a real ceremony response. Validation is unchanged; only the inferred
    // shape is widened back to what callers actually hold.
    .transform((results) => results as Record<string, unknown>);

const registrationResponseSchema = z.object({
    id: credentialIdSchema,
    rawId: credentialIdSchema,
    type: z.literal("public-key"),
    authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
    response: z.object({
        clientDataJSON: base64Url,
        attestationObject: base64Url,
        transports: z.array(z.string().max(32)).max(8).optional(),
        publicKeyAlgorithm: z.number().optional(),
        publicKey: base64Url.optional(),
        authenticatorData: base64Url.optional()
    }),
    clientExtensionResults: clientExtensionResultsSchema
});

const authenticationResponseSchema = z.object({
    id: credentialIdSchema,
    rawId: credentialIdSchema,
    type: z.literal("public-key"),
    authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
    response: z.object({
        clientDataJSON: base64Url,
        authenticatorData: base64Url,
        signature: base64Url,
        userHandle: base64Url.nullish()
    }),
    clientExtensionResults: clientExtensionResultsSchema
});

export const passkeyStartRegistrationInput = z.object({}).strict();

export const passkeyFinishRegistrationInput = z
    .object({
        challengeId: z.uuid(),
        response: registrationResponseSchema,
        /** Client-side ciphertext. The server stores it opaquely and can never open it. */
        wrappedSecret: base64Standard.min(32).max(4096),
        label: z.string().max(64).default("")
    })
    .strict();

export const passkeyStartAuthenticationInput = z.object({}).strict();

export const passkeyFinishAuthenticationInput = z
    .object({
        challengeId: z.uuid(),
        response: authenticationResponseSchema
    })
    .strict();

export const passkeyFinishAuthenticationOutput = z.object({
    wrappedSecret: z.string(),
    wrapVersion: z.number().int().positive(),
    pubkeyHash: z.string().regex(/^[0-9a-f]{64}$/)
});

export const passkeyRevokeCredentialInput = z.object({ credentialId: credentialIdSchema }).strict();

export const passkeyRevokeCredentialOutput = z.object({ revoked: z.boolean() });

/** Non-secret credential metadata. The wrapped secret is never part of this projection. */
export const passkeyCredentialSummarySchema = z.object({
    credentialId: z.string(),
    label: z.string(),
    createdAt: z.string(),
    lastUsedAt: z.string().nullable(),
    transports: z.array(z.string()),
    backedUp: z.boolean()
});

export type PasskeyCredentialSummary = z.infer<typeof passkeyCredentialSummarySchema>;
