"use client";

/**
 * tRPC Provider
 *
 * Wraps the app with QueryClientProvider and tRPC context.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { trpc, createTRPCClient } from "@/lib/trpc/client";

interface TRPCProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that sets up tRPC and React Query.
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  // Create stable instances using useState lazy initialization
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error) => {
              // Don't retry on auth errors
              if (
                error &&
                typeof error === "object" &&
                "data" in error &&
                error.data &&
                typeof error.data === "object" &&
                "code" in error.data
              ) {
                const code = (error.data as { code?: string }).code;
                if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
                  return false;
                }
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
