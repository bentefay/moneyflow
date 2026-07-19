/**
 * tRPC Client Configuration
 *
 * Creates the tRPC client for React with signature authentication.
 */

import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import { getSession } from "@/lib/crypto/session";
import { signRequest } from "@/lib/crypto/signing";
import type { AppRouter } from "@/server/routers/_app";

/**
 * tRPC React hooks.
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Get the base URL for tRPC requests.
 */
function getBaseUrl() {
    if (typeof window !== "undefined") {
        // Browser should use relative path
        return "";
    }
    // SSR should use absolute URL
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    // Assume localhost for development
    return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Create tRPC client with signature authentication.
 */
export function createTRPCClient() {
    return trpc.createClient({
        links: [
            httpBatchLink({
                url: `${getBaseUrl()}/api/trpc`,
                transformer: superjson,
                // Queries must never put their serialized input in URLs. Using POST for every
                // operation also gives client and server one exact signed wire representation.
                methodOverride: "POST",
                async headers({ opList }) {
                    const session = getSession();

                    // If no session, return empty headers (unauthenticated request)
                    if (!session) {
                        return {};
                    }

                    const path = "/api/trpc";

                    // Bind exactly the ordered procedure list and the same SuperJSON wire inputs
                    // that httpBatchLink writes into its POST body.
                    const body = opList.map((op) => ({
                        path: op.path,
                        input: superjson.serialize(op.input)
                    }));

                    // signRequest returns headers directly and gets session internally
                    const signedHeaders = await signRequest("POST", path, body);

                    return signedHeaders;
                }
            })
        ]
    });
}
