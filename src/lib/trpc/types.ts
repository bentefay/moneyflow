/**
 * tRPC Client Types
 *
 * Type definitions for tRPC client used in non-React contexts.
 */

import type { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

/**
 * Type for the tRPC React client.
 * This is a subset of what createTRPCReact returns.
 */
export type TRPCClientType = ReturnType<typeof createTRPCReact<AppRouter>>;
