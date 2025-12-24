/**
 * tRPC API Route Handler
 *
 * Next.js App Router handler for tRPC requests.
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/trpc";

/**
 * Handle tRPC requests.
 */
async function handler(req: Request) {
  // Parse request body for context
  let body: unknown = undefined;
  if (req.method === "POST") {
    try {
      body = await req.clone().json();
    } catch {
      // Body might not be JSON, that's okay
    }
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () =>
      createContext({
        headers: req.headers,
        method: req.method,
        path: new URL(req.url).pathname,
        body,
      }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
          }
        : undefined,
  });
}

export { handler as GET, handler as POST };
