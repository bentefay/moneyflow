/**
 * Ed25519 Request Signing
 *
 * Signs API requests with Ed25519 for authentication.
 * The server verifies signatures using the user's public key.
 */

import sodium from "libsodium-wrappers";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

import { initCrypto } from "./keypair";
import { getSession } from "./session";

/**
 * Headers required for signed requests.
 */
export interface SignedRequestHeaders {
    "X-Pubkey": string;
    "X-Timestamp": string;
    "X-Nonce": string;
    "X-Signature": string;
}

interface RequestVerificationSuccess {
    verified: true;
    pubkeyHash: string;
    nonce: string;
    requestTimestampMs: number;
    error?: never;
}

interface RequestVerificationFailure {
    verified: false;
    error: string;
    pubkeyHash?: never;
    nonce?: never;
    requestTimestampMs?: never;
}

export type RequestVerificationResult = RequestVerificationSuccess | RequestVerificationFailure;

export interface SignedTRPCOperation {
    readonly path: string;
    readonly input: unknown;
}

/**
 * Wire schema for one signed operation.
 *
 * `input` is deliberately checked for key *presence* rather than a value type: an operation that
 * omits it entirely is not bound to any serialized payload, while an explicit `undefined` input is
 * a legitimate no-argument procedure call.
 */
const signedTRPCOperationSchema = z
    .looseObject({ path: z.string().min(1).max(200) })
    .refine((operation) => "input" in operation);

/**
 * Protect authenticated middleware from accepting a generic or malformed signed body.
 * Every operation must bind an exact procedure path and serialized wire input.
 */
const signedTRPCOperationListSchema = z.array(signedTRPCOperationSchema).min(1);

export function isSignedTRPCOperationList(body: unknown): body is readonly SignedTRPCOperation[] {
    return signedTRPCOperationListSchema.safeParse(body).success;
}

function hashRequestBody(body: unknown): string {
    if (body === undefined) {
        return "";
    }

    return sodium.to_base64(
        sodium.crypto_generichash(32, JSON.stringify(body), null),
        sodium.base64_variants.ORIGINAL
    );
}

/**
 * Signs an API request for authentication.
 *
 * The message format is:
 *   {method}\n{path}\n{timestamp}\n{nonce}\n{bodyHash}
 *
 * Where bodyHash is BLAKE2b-256 of the JSON body (empty string if no body).
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path (e.g., /api/trpc/vault.create)
 * @param body - Request body (optional)
 * @returns Headers to include with the request
 * @throws Error if no session exists
 */
export async function signRequest(
    method: string,
    path: string,
    body?: unknown
): Promise<SignedRequestHeaders> {
    await initCrypto();

    const session = getSession();
    if (!session) {
        throw new Error("No session - user must be unlocked");
    }

    const timestamp = Temporal.Now.instant().epochMilliseconds.toString();
    const nonceBytes = sodium.randombytes_buf(32);
    const nonce = sodium.to_base64(nonceBytes, sodium.base64_variants.ORIGINAL);
    const bodyHash = hashRequestBody(body);

    // Create message to sign
    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;

    const messageBytes = Uint8Array.from(new TextEncoder().encode(message));
    const secretKey = sodium.from_base64(session.secretKey, sodium.base64_variants.ORIGINAL);

    try {
        const signature = sodium.crypto_sign_detached(messageBytes, secretKey);

        return {
            "X-Pubkey": session.publicKey,
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": sodium.to_base64(signature, sodium.base64_variants.ORIGINAL)
        };
    } finally {
        sodium.memzero(secretKey);
        sodium.memzero(nonceBytes);
    }
}

/**
 * Verifies a signed request.
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param body - Request body (optional)
 * @param headers - Headers from the request
 * @param maxAgeMs - Maximum age of request in milliseconds (default: 5 minutes)
 * @returns Object with verified: boolean and pubkeyHash if verified
 */
export async function verifyRequest(
    method: string,
    path: string,
    body: unknown,
    headers: {
        "X-Pubkey"?: string;
        "X-Timestamp"?: string;
        "X-Nonce"?: string;
        "X-Signature"?: string;
    },
    maxAgeMs: number = 5 * 60 * 1000
): Promise<RequestVerificationResult> {
    await initCrypto();

    const {
        "X-Pubkey": pubkey,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature
    } = headers;

    // Check required headers
    if (!pubkey || !timestamp || !nonce || !signature) {
        return { verified: false, error: "Missing authentication headers" };
    }

    // Check timestamp freshness
    if (!/^\d{13}$/.test(timestamp)) {
        return { verified: false, error: "Invalid timestamp" };
    }

    const requestTime = Number(timestamp);
    const now = Temporal.Now.instant().epochMilliseconds;
    if (Math.abs(now - requestTime) > maxAgeMs) {
        return { verified: false, error: "Request expired" };
    }

    try {
        const publicKey = sodium.from_base64(pubkey, sodium.base64_variants.ORIGINAL);
        const sig = sodium.from_base64(signature, sodium.base64_variants.ORIGINAL);
        const nonceBytes = sodium.from_base64(nonce, sodium.base64_variants.ORIGINAL);

        if (
            publicKey.length !== sodium.crypto_sign_PUBLICKEYBYTES ||
            sig.length !== sodium.crypto_sign_BYTES ||
            nonceBytes.length !== 32
        ) {
            return { verified: false, error: "Invalid authentication headers" };
        }

        const bodyHash = hashRequestBody(body);

        // Recreate message
        const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;

        // Verify signature
        // Ensure we have native Uint8Arrays (needed for libsodium in jsdom environments)
        const sigNative = Uint8Array.from(sig);
        const messageBytes = Uint8Array.from(new TextEncoder().encode(message));
        const publicKeyNative = Uint8Array.from(publicKey);
        const verified = sodium.crypto_sign_verify_detached(
            sigNative,
            messageBytes,
            publicKeyNative
        );

        if (!verified) {
            return { verified: false, error: "Invalid signature" };
        }

        // Compute pubkeyHash (hex-encoded to match computePubkeyHash in identity.ts)
        const pubkeyHash = sodium.to_hex(sodium.crypto_generichash(32, publicKey, null));

        return { verified: true, pubkeyHash, nonce, requestTimestampMs: requestTime };
    } catch {
        return { verified: false, error: "Invalid authentication headers" };
    }
}

/**
 * Signs arbitrary data with Ed25519.
 * Useful for signing non-request data like invite tokens.
 *
 * @param data - Data to sign
 * @returns Detached signature
 * @throws Error if no session exists
 */
export async function signData(data: Uint8Array): Promise<Uint8Array> {
    await initCrypto();

    const session = getSession();
    if (!session) {
        throw new Error("No session - user must be unlocked");
    }

    const secretKey = sodium.from_base64(session.secretKey, sodium.base64_variants.ORIGINAL);

    // Ensure we have native Uint8Arrays (needed for libsodium in jsdom environments)
    const dataNative = Uint8Array.from(data);
    const secretKeyNative = Uint8Array.from(secretKey);

    try {
        return sodium.crypto_sign_detached(dataNative, secretKeyNative);
    } finally {
        // Both the decoded key and its native copy hold the Ed25519 secret; zeroize both.
        sodium.memzero(secretKeyNative);
        sodium.memzero(secretKey);
    }
}

/**
 * Verifies a signature on arbitrary data.
 *
 * @param data - Original data
 * @param signature - Detached signature
 * @param publicKeyBase64 - Signer's public key (base64)
 * @returns true if signature is valid
 */
export async function verifySignature(
    data: Uint8Array,
    signature: Uint8Array,
    publicKeyBase64: string
): Promise<boolean> {
    await initCrypto();

    try {
        const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
        // Ensure we have native Uint8Arrays (needed for libsodium in jsdom environments)
        const signatureNative = Uint8Array.from(signature);
        const dataNative = Uint8Array.from(data);
        const publicKeyNative = Uint8Array.from(publicKey);
        return sodium.crypto_sign_verify_detached(signatureNative, dataNative, publicKeyNative);
    } catch {
        return false;
    }
}

/**
 * Verifies a string signature.
 *
 * @param text - Original string
 * @param signatureBase64 - Base64-encoded signature
 * @param publicKeyBase64 - Signer's public key (base64)
 * @returns true if signature is valid
 */
export async function verifyStringSignature(
    text: string,
    signatureBase64: string,
    publicKeyBase64: string
): Promise<boolean> {
    await initCrypto();

    try {
        const data = new TextEncoder().encode(text);
        const signature = sodium.from_base64(signatureBase64, sodium.base64_variants.ORIGINAL);
        return verifySignature(data, signature, publicKeyBase64);
    } catch {
        return false;
    }
}
