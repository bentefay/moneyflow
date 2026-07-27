"use client";

/**
 * App Shell Layout
 *
 * Authenticated app layout with sidebar navigation.
 * Protected by AuthGuard - redirects unauthenticated users to /unlock.
 *
 * Features:
 * - Collapsible sidebar on desktop (md+)
 * - Collapsed mode shows vault icon and sync status with tooltips
 * - Mobile (<md) shows top bar with hamburger menu opening a full-screen drawer
 */

import {
    Bot,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FileDown,
    LogOut,
    Menu,
    Receipt,
    Settings,
    Tags,
    TextCursorInput,
    Users
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { ImportFileTransferProvider } from "@/components/features/import/ImportFileTransferProvider";
import { PresenceAvatarGroup } from "@/components/features/presence/PresenceAvatarGroup";
import { UndoControls, UndoKeyboardShortcuts } from "@/components/features/undo/UndoControls";
import { VaultSelector } from "@/components/features/vault/VaultSelector";
import { ActiveVaultProvider } from "@/components/providers/active-vault-provider";
import {
    useVaultPresenceContext,
    VaultPresenceProvider
} from "@/components/providers/vault-presence-provider";
import { VaultProvider } from "@/components/providers/vault-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SyncStatus } from "@/components/ui/sync-status";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveVault } from "@/hooks/use-active-vault";
import { SyncStatusProvider, usePollUnsavedChanges, useSyncStatus } from "@/hooks/use-sync-status";
import { AuthGuard } from "@/lib/auth";
import { useVaultPreferences } from "@/lib/crdt/context";
import { clearSession } from "@/lib/crypto/session";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/accounts", label: "Accounts", icon: Building2 },
    { href: "/people", label: "People", icon: Users },
    { href: "/tags", label: "Tags", icon: Tags },
    { href: "/tx-descriptions", label: "Tx Descriptions", icon: TextCursorInput },
    { href: "/statuses", label: "Statuses", icon: CheckCircle2 },
    { href: "/automations", label: "Automations", icon: Bot },
    { href: "/imports", label: "Imports", icon: FileDown }
];

const bottomNavItems: NavItem[] = [{ href: "/settings", label: "Vault Settings", icon: Settings }];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const vaultDisconnectRef = useRef<(() => Promise<void>) | null>(null);
    const registerVaultDisconnect = useCallback((disconnect: () => Promise<void>) => {
        vaultDisconnectRef.current = disconnect;
        return () => {
            if (vaultDisconnectRef.current === disconnect) vaultDisconnectRef.current = null;
        };
    }, []);
    const disconnectVault = useCallback(async () => {
        await vaultDisconnectRef.current?.();
    }, []);

    return (
        <AuthGuard
            fallback={
                <div className="flex h-screen items-center justify-center">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                </div>
            }
        >
            <ActiveVaultProvider>
                <SyncStatusProvider>
                    <VaultProvider registerDisconnect={registerVaultDisconnect}>
                        <VaultPresenceProvider>
                            <AppLayoutContent disconnectVault={disconnectVault}>
                                {children}
                            </AppLayoutContent>
                        </VaultPresenceProvider>
                    </VaultProvider>
                </SyncStatusProvider>
            </ActiveVaultProvider>
        </AuthGuard>
    );
}

function AppLayoutContent({
    children,
    disconnectVault
}: {
    children: React.ReactNode;
    disconnectVault: () => Promise<void>;
}) {
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { activeVault } = useActiveVault();

    // Get vault name from CRDT preferences (single source of truth)
    const preferences = useVaultPreferences();
    const currentVaultName = preferences?.name;

    const vaultListQuery = trpc.vault.list.useQuery();

    const vaultOptions = useMemo(() => {
        const vaults = vaultListQuery.data?.vaults ?? [];
        return vaults.map((v) => {
            // Server doesn't store vault names, use placeholder for non-active vaults
            return { id: v.id, name: "Vault", role: v.role };
        });
    }, [vaultListQuery.data]);

    // Presence for the active vault, shared with the transactions table via the provider.
    const {
        presentIdentities,
        isConnected,
        disconnect: disconnectPresence
    } = useVaultPresenceContext();

    // Get sync status from context
    const { state: syncState } = useSyncStatus();

    // Poll for unsaved changes (until SyncManager is fully integrated)
    const hasUnsavedChanges = usePollUnsavedChanges(activeVault?.id ?? null, 2000);

    const isVaultsLoading = vaultListQuery.isLoading;

    const handleLogout = async () => {
        await Promise.all([disconnectVault(), disconnectPresence()]);
        clearSession();
        router.replace("/unlock");
    };

    // Close mobile menu on navigation
    const handleMobileNavClick = () => {
        setIsMobileMenuOpen(false);
    };

    // Shared navigation content for both mobile drawer and desktop sidebar
    const navigationContent = (isMobile: boolean) => (
        <>
            {/* Main Navigation */}
            <nav className="flex-1 space-y-1 p-2">
                {mainNavItems.map((item) => (
                    <NavLink
                        key={item.href}
                        item={item}
                        isCollapsed={!isMobile && isCollapsed}
                        onClick={isMobile ? handleMobileNavClick : undefined}
                    />
                ))}
            </nav>

            {/* Bottom Navigation */}
            <nav className="space-y-1 border-t p-2">
                {bottomNavItems.map((item) => (
                    <NavLink
                        key={item.href}
                        item={item}
                        isCollapsed={!isMobile && isCollapsed}
                        onClick={isMobile ? handleMobileNavClick : undefined}
                    />
                ))}
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className={cn(
                        "text-muted-foreground hover:text-accent-foreground w-full min-w-0 justify-start overflow-hidden font-medium",
                        !isMobile && isCollapsed && "justify-center"
                    )}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {(isMobile || !isCollapsed) && (
                        <span className="min-w-0 overflow-hidden whitespace-nowrap">Lock</span>
                    )}
                </Button>
            </nav>
        </>
    );

    return (
        <div className="flex h-screen flex-col md:flex-row">
            <UndoKeyboardShortcuts />
            {/* Mobile Top Bar */}
            <header className="bg-card flex h-14 items-center justify-between border-b px-4 md:hidden">
                {/* Logo */}
                <Link href="/transactions" className="text-lg font-semibold">
                    MoneyFlow
                </Link>

                {/* Right side: Presence + Menu */}
                <div className="flex items-center gap-2">
                    <UndoControls />
                    {isConnected && presentIdentities.length > 0 && (
                        <PresenceAvatarGroup
                            users={presentIdentities.map((userId) => ({
                                userId,
                                isOnline: true
                            }))}
                            size="sm"
                        />
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Mobile Drawer */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="flex w-80 flex-col p-0">
                    <SheetHeader className="border-b p-4">
                        <SheetTitle className="text-left">MoneyFlow</SheetTitle>
                    </SheetHeader>

                    {/* Vault Selector & Status */}
                    <div className="space-y-3 border-b p-4">
                        <VaultSelector
                            vaults={vaultOptions}
                            currentVaultName={currentVaultName}
                            isLoading={isVaultsLoading}
                        />
                        <SyncStatus
                            state={syncState}
                            hasUnsavedChanges={hasUnsavedChanges}
                            showLabel
                        />
                    </div>

                    {navigationContent(true)}
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "bg-card hidden flex-col border-r transition-all duration-300 md:flex",
                    isCollapsed ? "w-16" : "w-64"
                )}
            >
                {/* Logo & Collapse Toggle */}
                <div className="flex h-12 items-center justify-between border-b px-4">
                    {!isCollapsed && (
                        <Link
                            href="/transactions"
                            className="min-w-0 overflow-hidden text-lg font-semibold whitespace-nowrap"
                        >
                            MoneyFlow
                        </Link>
                    )}
                    {!isCollapsed && <UndoControls className="ml-auto" />}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                className="shrink-0"
                            >
                                {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                ) : (
                                    <ChevronLeft className="h-4 w-4" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        {isCollapsed && (
                            <TooltipContent side="right">Expand sidebar</TooltipContent>
                        )}
                    </Tooltip>
                </div>

                {/* Vault Selector & Status - Collapsed Mode */}
                {isCollapsed && (
                    <div className="flex flex-col items-center gap-2 border-b py-3">
                        <VaultSelector
                            vaults={vaultOptions}
                            currentVaultName={currentVaultName}
                            isLoading={isVaultsLoading}
                            iconMode
                        />
                        <SyncStatus
                            className="-mt-3"
                            state={syncState}
                            hasUnsavedChanges={hasUnsavedChanges}
                            iconMode
                            showLabel={false}
                        />
                        <UndoControls className="flex-col" />
                    </div>
                )}

                {/* Vault Selector & Status - Expanded Mode */}
                {!isCollapsed && (
                    <div className="flex min-w-0 flex-col items-stretch border-b p-3">
                        <VaultSelector
                            classNames={{
                                button: "w-full min-w-0 overflow-hidden whitespace-nowrap"
                            }}
                            className="min-w-0"
                            vaults={vaultOptions}
                            currentVaultName={currentVaultName}
                            isLoading={isVaultsLoading}
                            showAvatar
                        />
                        <div className="border-border bg-muted ml-1 flex max-w-full min-w-0 items-center justify-between gap-4 self-start overflow-hidden rounded-b-lg border py-1 pr-4 pl-2 whitespace-nowrap">
                            <SyncStatus
                                state={syncState}
                                hasUnsavedChanges={hasUnsavedChanges}
                                iconMode
                                showLabel
                            />
                            {isConnected && presentIdentities.length > 0 && (
                                <PresenceAvatarGroup
                                    users={presentIdentities.map((userId) => ({
                                        userId,
                                        isOnline: true
                                    }))}
                                    size="sm"
                                />
                            )}
                        </div>
                    </div>
                )}

                {navigationContent(false)}
            </aside>

            {/* Main Content Area - allows vertical scrolling for non-virtualized pages */}
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                <ImportFileTransferProvider
                    key={activeVault?.id ?? "no-active-vault"}
                    scopeKey={activeVault?.id ?? null}
                >
                    {children}
                </ImportFileTransferProvider>
            </main>
        </div>
    );
}

function NavLink({
    item,
    isCollapsed,
    onClick
}: {
    item: NavItem;
    isCollapsed: boolean;
    onClick?: () => void;
}) {
    const pathname = usePathname();
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    const link = (
        <Link
            href={item.href}
            onClick={onClick}
            className={cn(
                "hover:bg-accent hover:text-accent-foreground flex min-w-0 items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-sm whitespace-nowrap",
                isCollapsed && "justify-center",
                isActive
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground font-medium"
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && (
                <span className="min-w-0 overflow-hidden whitespace-nowrap">{item.label}</span>
            )}
        </Link>
    );

    // Wrap in tooltip when collapsed
    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
        );
    }

    return link;
}
