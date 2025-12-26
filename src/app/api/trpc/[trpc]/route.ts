/**
 * tRPC API Route Handler
 *
 * Next.js App Router handler for tRPC requests.
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { TRPCError } from "@trpc/server";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/trpc";

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
  const timestamp = new Date().toISOString();

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
    onError: ({ path, error }) => {
      logError(path, error);
    },
  });
}

export { handler as GET, handler as POST };
