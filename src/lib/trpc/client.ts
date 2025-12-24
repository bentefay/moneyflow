/**
 * tRPC Client Configuration
 *
 * Creates the tRPC client for React with signature authentication.
 */

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers/_app";
import { signRequest } from "@/lib/crypto/signing";
import { getSession } from "@/lib/crypto/session";

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
        async headers({ opList }) {
          const session = getSession();

          // If no session, return empty headers (unauthenticated request)
          if (!session) {
            return {};
          }

          // For batched requests, sign the batch
          // Use POST method and the batch path
          const method = "POST";
          const path = "/api/trpc";

          // Create a simplified body for signing
          // This represents the batch of operations
          const body = opList.map((op) => ({
            path: op.path,
            input: op.input,
          }));

          // signRequest returns headers directly and gets session internally
          const signedHeaders = await signRequest(method, path, body);

          return signedHeaders;
        },
      }),
    ],
  });
}
