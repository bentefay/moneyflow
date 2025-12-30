/**
 * tRPC API Route Handler
 *
 * Next.js App Router handler for tRPC requests.
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { TRPCError } from "@trpc/server";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/trpc";
import { Temporal } from "temporal-polyfill";
import superjson from "superjson";

/**
 * Transform a tRPC batch request body into the simplified format used for signing.
 *
 * The client signs a simplified body: [{ path: 'procedure.name', input: {...} }]
 * But tRPC sends: { "0": { "json": {...}, "meta": {...} }, ... } with procedure names in URL
 *
 * We need to reconstruct the signed format from the URL and body.
 */
function normalizeBodyForSigning(
  rawBody: unknown,
  url: URL
): Array<{ path: string; input: unknown }> | undefined {
  if (!rawBody || typeof rawBody !== "object") {
    return undefined;
  }

  // Extract procedure names from URL query param "batch"
  // URL format: /api/trpc/vault.create,sync.saveSnapshot?batch=1&input={...}
  // Or: /api/trpc/vault.create?input={...}
  const pathname = url.pathname;
  const procedurePart = pathname.replace("/api/trpc/", "");
  const procedureNames = procedurePart ? procedurePart.split(",") : [];

  // Handle batch format: { "0": { "json": ... }, "1": { "json": ... } }
  const body = rawBody as Record<string, unknown>;

  // Check if it's a batch request (keys are numeric strings)
  const keys = Object.keys(body);
  const isBatch = keys.every((k) => /^\d+$/.test(k));

  if (isBatch) {
    // Batch request
    return keys.map((key, index) => {
      const item = body[key] as { json?: unknown; meta?: unknown } | undefined;
      const procedureName = procedureNames[index] || procedureNames[0] || "";

      // Deserialize with superjson if meta is present
      let input: unknown = item?.json;
      if (item?.meta && item?.json) {
        try {
          // Cast to SuperJSONResult - superjson expects specific shape
          input = superjson.deserialize({
            json: item.json as Parameters<typeof superjson.deserialize>[0]["json"],
            meta: item.meta as Parameters<typeof superjson.deserialize>[0]["meta"],
          });
        } catch {
          input = item.json;
        }
      }

      return { path: procedureName, input };
    });
  }

  // Single request format: { "json": ..., "meta": ... }
  if ("json" in body) {
    const procedureName = procedureNames[0] || "";
    let input: unknown = body.json;
    if (body.meta && body.json) {
      try {
        // Cast to SuperJSONResult - superjson expects specific shape
        input = superjson.deserialize({
          json: body.json as Parameters<typeof superjson.deserialize>[0]["json"],
          meta: body.meta as Parameters<typeof superjson.deserialize>[0]["meta"],
        });
      } catch {
        input = body.json;
      }
    }
    return [{ path: procedureName, input }];
  }

  return undefined;
}

/**
 * Categorize errors for logging and monitoring.
 */
function categorizeError(error: TRPCError): {
  level: "error" | "warn" | "info";
  category: string;
  isOperational: boolean;
} {
  const message = error.message.toLowerCase();
  const cause = error.cause instanceof Error ? error.cause.message.toLowerCase() : "";

  // Connection errors - infrastructure issue, needs attention
  if (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    cause.includes("fetch failed") ||
    cause.includes("econnrefused")
  ) {
    return { level: "error", category: "database_connection", isOperational: false };
  }

  // Client errors - expected, don't need urgent attention
  if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
    return { level: "warn", category: "auth", isOperational: true };
  }

  if (error.code === "BAD_REQUEST" || error.code === "PARSE_ERROR") {
    return { level: "warn", category: "validation", isOperational: true };
  }

  if (error.code === "NOT_FOUND") {
    return { level: "info", category: "not_found", isOperational: true };
  }

  // Internal errors - unexpected, needs investigation
  return { level: "error", category: "internal", isOperational: false };
}

/**
 * Log errors with appropriate detail for the environment.
 */
function logError(path: string | undefined, error: TRPCError) {
  const { level, category, isOperational } = categorizeError(error);
  const timestamp = Temporal.Now.instant().toString();

  const logData = {
    timestamp,
    path: path ?? "<no-path>",
    code: error.code,
    category,
    message: error.message,
    isOperational,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      cause: error.cause instanceof Error ? error.cause.message : undefined,
    }),
  };

  // Always log errors, adjust format based on environment
  if (process.env.NODE_ENV === "production") {
    // Structured JSON for log aggregation
    console[level](JSON.stringify(logData));
  } else {
    // Human-readable for development
    const emoji = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
    console[level](`${emoji} tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
    if (error.cause instanceof Error) {
      console[level](`   Cause: ${error.cause.message}`);
    }
  }
}

/**
 * Handle tRPC requests.
 */
async function handler(req: Request) {
  const url = new URL(req.url);

  // Parse request body for context
  let body: unknown = undefined;
  let normalizedBody: unknown = undefined;
  if (req.method === "POST") {
    try {
      body = await req.clone().json();
      // Normalize to the format used for signing
      normalizedBody = normalizeBodyForSigning(body, url);
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
        // Use the endpoint path for signature verification (must match what client signs)
        path: "/api/trpc",
        // Use normalized body for signature verification (must match what client signs)
        body: normalizedBody,
      }),
    onError: ({ path, error }) => {
      logError(path, error);
    },
  });
}

export { handler as GET, handler as POST };
