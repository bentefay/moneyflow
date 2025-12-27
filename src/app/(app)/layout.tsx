"use client";

/**
 * App Shell Layout
 *
 * Authenticated app layout with sidebar navigation.
 * Protected by AuthGuard - redirects unauthenticated users to /unlock.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/crypto/session";
import { AuthGuard, useAuthGuard } from "@/lib/auth";
import { useVaultPresence } from "@/hooks/use-vault-presence";
import { useActiveVault } from "@/hooks/use-active-vault";
import { VaultSelector } from "@/components/features/vault/VaultSelector";
import { PresenceAvatarGroup } from "@/components/features/presence/PresenceAvatarGroup";
import { VaultProvider } from "@/components/providers/vault-provider";
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Users,
  Tags,
  CheckCircle2,
  Bot,
  FileDown,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/people", label: "People", icon: Users },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/statuses", label: "Statuses", icon: CheckCircle2 },
  { href: "/automations", label: "Automations", icon: Bot },
  { href: "/imports", label: "Imports", icon: FileDown },
];

const bottomNavItems: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <VaultProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </VaultProvider>
    </AuthGuard>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { pubkeyHash } = useAuthGuard({ redirect: false });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { activeVault } = useActiveVault();

  // Track presence in active vault
  const { onlineUsers, isConnected } = useVaultPresence(activeVault?.id ?? null, pubkeyHash);

  // Mock vaults for now - will be fetched from tRPC
  const mockVaults = activeVault
    ? [{ id: activeVault.id, name: activeVault.name ?? "My Vault", role: "owner" as const }]
    : [];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card flex flex-col border-r transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <Link href="/dashboard" className="text-lg font-semibold">
              MoneyFlow
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-accent rounded-md p-2"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <nav className="space-y-1 border-t p-2">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
          <button
            onClick={() => {
              // Clear session and redirect to unlock
              clearSession();
              router.replace("/unlock");
            }}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Lock</span>}
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div>{/* Breadcrumb or page title goes here */}</div>
          <div className="flex items-center gap-4">
            {/* Online users */}
            {isConnected && onlineUsers.length > 0 && (
              <PresenceAvatarGroup
                users={onlineUsers.map((u) => ({
                  userId: u.userId,
                  isOnline: true,
                }))}
                size="sm"
              />
            )}
            {/* Vault selector */}
            <VaultSelector
              vaults={mockVaults}
              onCreateVault={() => {
                // TODO: Open create vault dialog
                console.log("Create vault");
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
        isCollapsed && "justify-center"
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4" />
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );
}
