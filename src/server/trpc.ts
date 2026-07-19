/**
 * tRPC Server Instance
 *
 * Creates the tRPC instance with context and Ed25519 signature verification middleware.
 * All API requests must be signed with the user's Ed25519 key.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { isSignedTRPCOperationList, verifyRequest } from "@/lib/crypto/signing";
import { createSupabaseClient } from "@/lib/supabase/server";

/**
 * Context available to all tRPC procedures.
 */
export interface TRPCContext {
    /** The authenticated user's pubkey hash (after signature verification) */
    pubkeyHash: string | null;
    /** The user's public key (base64) */
    publicKey: string | null;
    /** Request headers for signature verification */
    headers: {
        "x-pubkey"?: string;
        "x-timestamp"?: string;
        "x-nonce"?: string;
        "x-signature"?: string;
    };
    /** HTTP request info */
    req: {
        method: string;
        path: string;
        body?: unknown;
    };
}

/**
 * Creates the tRPC context from a Next.js request.
 * This is called for every tRPC request.
 */
export async function createContext(opts: {
    headers: Headers;
    method: string;
    path: string;
    body?: unknown;
}): Promise<TRPCContext> {
    const { headers, method, path, body } = opts;

    // Extract auth headers
    const authHeaders = {
        "x-pubkey": headers.get("x-pubkey") ?? undefined,
        "x-timestamp": headers.get("x-timestamp") ?? undefined,
        "x-nonce": headers.get("x-nonce") ?? undefined,
        "x-signature": headers.get("x-signature") ?? undefined
    };

    return {
        pubkeyHash: null, // Set by auth middleware after verification
        publicKey: authHeaders["x-pubkey"] ?? null,
        headers: authHeaders,
        req: { method, path, body }
    };
}

/**
 * Initialize tRPC with context type and superjson transformer.
 */
const t = initTRPC.context<TRPCContext>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                // Include additional error info in development
                ...(process.env.NODE_ENV === "development" && {
                    stack: error.cause instanceof Error ? error.cause.stack : undefined
                })
            }
        };
    }
});

/**
 * Export reusable router and procedure helpers.
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Middleware that verifies Ed25519 signatures on requests.
 *
 * Extracts pubkey_hash from verified signatures and adds to context.
 * Rejects requests with invalid or missing signatures.
 */
export const authMiddleware = middleware(async ({ ctx, next }) => {
    const { headers, req } = ctx;

    if (req.method !== "POST") {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authenticated requests must use POST"
        });
    }

    if (!isSignedTRPCOperationList(req.body)) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Request authentication failed"
        });
    }

    // Check for required auth headers
    if (
        !headers["x-pubkey"] ||
        !headers["x-timestamp"] ||
        !headers["x-nonce"] ||
        !headers["x-signature"]
    ) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Missing authentication headers"
        });
    }

    // Verify signature
    const result = await verifyRequest(
        req.method,
        req.path,
        req.body,
        {
            "X-Pubkey": headers["x-pubkey"],
            "X-Timestamp": headers["x-timestamp"],
            "X-Nonce": headers["x-nonce"],
            "X-Signature": headers["x-signature"]
        },
        5 * 60 * 1000 // 5 minute max age
    );

    if (!result.verified) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: result.error ?? "Signature verification failed"
        });
    }

    const supabase = await createSupabaseClient();
    const { data: nonceAccepted, error: nonceError } = await supabase.rpc("claim_request_nonce", {
        p_pubkey_hash: result.pubkeyHash,
        p_nonce: result.nonce,
        p_request_timestamp_ms: result.requestTimestampMs
    });

    if (nonceError || nonceAccepted !== true) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Request authentication failed"
        });
    }

    // Continue with authenticated context
    return next({
        ctx: {
            ...ctx,
            pubkeyHash: result.pubkeyHash,
            publicKey: headers["x-pubkey"]
        }
    });
});

/**
 * Protected procedure that requires authentication.
 *
 * Use this for any procedure that needs the user's identity.
 */
export const protectedProcedure = t.procedure.use(authMiddleware);

/**
 * Type exports for router inference
 */
export type Router = typeof router;
export type ProtectedContext = TRPCContext & {
    pubkeyHash: string;
    publicKey: string;
};
