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
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PresenceAvatarGroup } from "@/components/features/presence/PresenceAvatarGroup";
import { VaultSelector } from "@/components/features/vault/VaultSelector";
import { ActiveVaultProvider } from "@/components/providers/active-vault-provider";
import { VaultProvider } from "@/components/providers/vault-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SyncStatus } from "@/components/ui/sync-status";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveVault } from "@/hooks/use-active-vault";
import { SyncStatusProvider, usePollUnsavedChanges, useSyncStatus } from "@/hooks/use-sync-status";
import { useVaultPresence } from "@/hooks/use-vault-presence";
import { AuthGuard, useAuthGuard } from "@/lib/auth";
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
	{ href: "/statuses", label: "Statuses", icon: CheckCircle2 },
	{ href: "/automations", label: "Automations", icon: Bot },
	{ href: "/imports", label: "Imports", icon: FileDown },
];

const bottomNavItems: NavItem[] = [{ href: "/settings", label: "Vault Settings", icon: Settings }];

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<AuthGuard
			fallback={
				<div className="flex h-screen items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			}
		>
			<ActiveVaultProvider>
				<VaultProvider>
					<SyncStatusProvider>
						<AppLayoutContent>{children}</AppLayoutContent>
					</SyncStatusProvider>
				</VaultProvider>
			</ActiveVaultProvider>
		</AuthGuard>
	);
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { pubkeyHash } = useAuthGuard({ redirect: false });
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

	// Track presence in active vault
	const { onlineUsers, isConnected } = useVaultPresence(activeVault?.id ?? null, pubkeyHash);

	// Get sync status from context
	const { state: syncState } = useSyncStatus();

	// Poll for unsaved changes (until SyncManager is fully integrated)
	const hasUnsavedChanges = usePollUnsavedChanges(activeVault?.id ?? null, 2000);

	const isVaultsLoading = vaultListQuery.isLoading;

	const handleLogout = () => {
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
						"w-full justify-start font-medium text-muted-foreground hover:text-accent-foreground",
						!isMobile && isCollapsed && "justify-center"
					)}
				>
					<LogOut className="h-4 w-4" />
					{(isMobile || !isCollapsed) && <span>Lock</span>}
				</Button>
			</nav>
		</>
	);

	return (
		<div className="flex h-screen flex-col md:flex-row">
			{/* Mobile Top Bar */}
			<header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
				{/* Logo */}
				<Link href="/transactions" className="font-semibold text-lg">
					MoneyFlow
				</Link>

				{/* Right side: Presence + Menu */}
				<div className="flex items-center gap-2">
					{isConnected && onlineUsers.length > 0 && (
						<PresenceAvatarGroup
							users={onlineUsers.map((u) => ({
								userId: u.userId,
								isOnline: true,
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
							onCreateVault={() => {
								console.log("Create vault");
								setIsMobileMenuOpen(false);
							}}
						/>
						<SyncStatus state={syncState} hasUnsavedChanges={hasUnsavedChanges} showLabel />
					</div>

					{navigationContent(true)}
				</SheetContent>
			</Sheet>

			{/* Desktop Sidebar */}
			<aside
				className={cn(
					"hidden flex-col border-r bg-card transition-all duration-300 md:flex",
					isCollapsed ? "w-16" : "w-64"
				)}
			>
				{/* Logo & Collapse Toggle */}
				<div className="flex h-12 items-center justify-between border-b px-4">
					{!isCollapsed && (
						<Link href="/transactions" className="font-semibold text-lg">
							MoneyFlow
						</Link>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setIsCollapsed(!isCollapsed)}
								aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
							>
								{isCollapsed ? (
									<ChevronRight className="h-4 w-4" />
								) : (
									<ChevronLeft className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						{isCollapsed && <TooltipContent side="right">Expand sidebar</TooltipContent>}
					</Tooltip>
				</div>

				{/* Vault Selector & Status - Collapsed Mode */}
				{isCollapsed && (
					<div className="flex flex-col items-center gap-2 border-b py-3">
						<VaultSelector
							vaults={vaultOptions}
							currentVaultName={currentVaultName}
							isLoading={isVaultsLoading}
							onCreateVault={() => {
								console.log("Create vault");
							}}
							iconMode
						/>
						<SyncStatus
							state={syncState}
							hasUnsavedChanges={hasUnsavedChanges}
							iconMode
							showLabel={false}
						/>
					</div>
				)}

				{/* Vault Selector & Status - Expanded Mode */}
				{!isCollapsed && (
					<div className="space-y-2 border-b p-3">
						<VaultSelector
							vaults={vaultOptions}
							currentVaultName={currentVaultName}
							isLoading={isVaultsLoading}
							onCreateVault={() => {
								console.log("Create vault");
							}}
							showAvatar
						/>
						<div className="flex items-center justify-between">
							<SyncStatus
								state={syncState}
								hasUnsavedChanges={hasUnsavedChanges}
								iconMode
								showLabel
							/>
							{isConnected && onlineUsers.length > 0 && (
								<PresenceAvatarGroup
									users={onlineUsers.map((u) => ({
										userId: u.userId,
										isOnline: true,
									}))}
									size="sm"
								/>
							)}
						</div>
					</div>
				)}

				{navigationContent(false)}
			</aside>

			{/* Main Content Area - no header, full height for virtualization */}
			<main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
		</div>
	);
}

function NavLink({
	item,
	isCollapsed,
	onClick,
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
				"flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
				isCollapsed && "justify-center",
				isActive
					? "bg-accent font-semibold text-accent-foreground"
					: "font-medium text-muted-foreground"
			)}
		>
			<Icon className="h-4 w-4" />
			{!isCollapsed && <span>{item.label}</span>}
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
