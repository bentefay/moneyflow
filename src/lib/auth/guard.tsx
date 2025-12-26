/**
 * Auth Guard
 *
 * Client-side authentication guard that redirects unauthenticated
 * users to the unlock page.
 *
 * Features:
 * - HOC pattern for wrapping protected pages/layouts
 * - Hook for conditional rendering
 * - Loading state while checking authentication
 * - Automatic redirect to /unlock
 */

"use client";

import { useEffect, type ComponentType, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasSession, getSession } from "@/lib/crypto/session";

// ============================================================================
// Constants
// ============================================================================

/** Routes that don't require authentication */
export const PUBLIC_ROUTES = ["/", "/unlock", "/new-user", "/invite"] as const;

/** Route to redirect unauthenticated users to */
export const UNLOCK_ROUTE = "/unlock";

/** Route to redirect authenticated users to (from auth pages) */
export const DASHBOARD_ROUTE = "/dashboard";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a path is public (doesn't require auth).
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === path) return true;
    // Handle dynamic routes like /invite/[token]
    if (route === "/invite" && path.startsWith("/invite/")) return true;
    return false;
  });
}

/**
 * Synchronously check if user is authenticated.
 * Uses sessionStorage, so only works client-side.
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return hasSession();
}

/**
 * Get the current user's pubkey hash.
 * Returns null if not authenticated.
 */
export function getCurrentPubkeyHash(): string | null {
  const session = getSession();
  return session?.pubkeyHash ?? null;
}

// ============================================================================
// useAuthGuard Hook
// ============================================================================

export interface UseAuthGuardOptions {
  /** Whether to redirect if not authenticated */
  redirect?: boolean;
  /** Custom redirect path */
  redirectTo?: string;
}

export interface UseAuthGuardReturn {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether we're still checking auth status */
  isLoading: boolean;
  /** The current user's pubkey hash (null if not authenticated) */
  pubkeyHash: string | null;
}

/**
 * Hook to check authentication status and optionally redirect.
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}): UseAuthGuardReturn {
  const { redirect = true, redirectTo = UNLOCK_ROUTE } = options;
  const router = useRouter();
  const pathname = usePathname();

  // Check auth status
  const authenticated = isAuthenticated();
  const pubkeyHash = authenticated ? getCurrentPubkeyHash() : null;

  // Handle redirect
  useEffect(() => {
    if (!redirect) return;

    // Don't redirect on public routes
    if (isPublicRoute(pathname)) return;

    // Redirect if not authenticated
    if (!authenticated) {
      router.replace(redirectTo);
    }
  }, [authenticated, redirect, redirectTo, pathname, router]);

  return {
    isAuthenticated: authenticated,
    isLoading: false, // Synchronous check, no loading state
    pubkeyHash,
  };
}

// ============================================================================
// withAuthGuard HOC
// ============================================================================

export interface WithAuthGuardOptions {
  /** Loading component to show while checking auth */
  LoadingComponent?: ComponentType;
  /** Where to redirect unauthenticated users */
  redirectTo?: string;
}

/**
 * HOC that wraps a component with authentication protection.
 * Redirects to unlock page if not authenticated.
 */
export function withAuthGuard<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthGuardOptions = {}
): ComponentType<P> {
  const { LoadingComponent = DefaultLoadingComponent, redirectTo = UNLOCK_ROUTE } = options;

  function AuthGuardedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthGuard({
      redirect: true,
      redirectTo,
    });

    if (isLoading) {
      return <LoadingComponent />;
    }

    if (!isAuthenticated) {
      // Return loading while redirect happens
      return <LoadingComponent />;
    }

    return <WrappedComponent {...props} />;
  }

  AuthGuardedComponent.displayName = `withAuthGuard(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return AuthGuardedComponent;
}

// ============================================================================
// AuthGuard Component
// ============================================================================

export interface AuthGuardProps {
  /** Children to render when authenticated */
  children: ReactNode;
  /** Loading component/element while checking auth */
  fallback?: ReactNode;
  /** Where to redirect unauthenticated users */
  redirectTo?: string;
}

/**
 * Component that protects its children with authentication.
 * Use this in layouts or wrap around protected content.
 */
export function AuthGuard({
  children,
  fallback,
  redirectTo = UNLOCK_ROUTE,
}: AuthGuardProps): ReactNode {
  const { isAuthenticated, isLoading } = useAuthGuard({
    redirect: true,
    redirectTo,
  });

  if (isLoading) {
    return fallback ?? <DefaultLoadingComponent />;
  }

  if (!isAuthenticated) {
    // Return fallback while redirect happens
    return fallback ?? <DefaultLoadingComponent />;
  }

  return children;
}

// ============================================================================
// Default Loading Component
// ============================================================================

function DefaultLoadingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}
