"use client";

/**
 * Vault Selector
 *
 * Dropdown component to select the active vault.
 *
 * The currentVaultName prop should come from CRDT preferences for real-time
 * updates when the vault name is edited. The vault list names come from the
 * server and are used for non-active vaults in the dropdown.
 *
 * Supports two modes:
 * - Default: Full button with vault name and role badge
 * - Icon mode: Compact circle with first letter of vault name (for collapsed sidebar)
 */

import { Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveVault } from "@/hooks/use-active-vault";
import { cn } from "@/lib/utils";

export interface VaultOption {
	id: string;
	name: string;
	role: "owner" | "admin" | "member";
}

export interface VaultSelectorProps {
	/** Available vaults to select from */
	vaults: VaultOption[];
	/**
	 * Name of the current vault from CRDT preferences.
	 * This takes precedence over the vault list name for the active vault.
	 */
	currentVaultName?: string;
	/** Whether vaults are loading */
	isLoading?: boolean;
	/** Called when user wants to create a new vault */
	onCreateVault?: () => void;
	/** Additional CSS classes */
	className?: string;
	/** Use icon mode (compact circle with first letter) */
	iconMode?: boolean;
	/** Show avatar circle alongside vault name in expanded mode */
	showAvatar?: boolean;
}

/**
 * Dropdown selector for vaults.
 */
export function VaultSelector({
	vaults,
	currentVaultName,
	isLoading = false,
	onCreateVault,
	className,
	iconMode = false,
	showAvatar = false,
}: VaultSelectorProps) {
	const { activeVault, setActiveVault } = useActiveVault();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close on escape key
	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		}

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, []);

	// Auto-select first vault if none selected
	useEffect(() => {
		if (!activeVault && vaults.length > 0) {
			setActiveVault({ id: vaults[0].id });
		}
	}, [activeVault, vaults, setActiveVault]);

	const handleSelect = (vault: VaultOption) => {
		setActiveVault({ id: vault.id });
		setIsOpen(false);
	};

	const selectedVault = vaults.find((v) => v.id === activeVault?.id);
	// Use CRDT name for active vault, fall back to server name
	const displayName = currentVaultName ?? selectedVault?.name ?? "Vault";

	// Get first letter for icon mode
	const firstLetter = displayName.charAt(0).toUpperCase();

	// Generate a consistent color based on vault name
	const vaultColor = getVaultColor(displayName);

	// Icon mode: compact circle button
	if (iconMode) {
		const iconButton = (
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm transition-all",
					"hover:ring-2 hover:ring-ring hover:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					vaultColor.bg,
					vaultColor.text,
					isLoading && "cursor-wait opacity-50"
				)}
				disabled={isLoading}
				aria-label={`Select vault: ${displayName}`}
			>
				{isLoading ? "..." : firstLetter}
			</button>
		);

		return (
			<div ref={dropdownRef} className={cn("relative", className)}>
				<Tooltip>
					<TooltipTrigger asChild>{iconButton}</TooltipTrigger>
					<TooltipContent side="right">{displayName}</TooltipContent>
				</Tooltip>

				{/* Dropdown Menu */}
				{isOpen && (
					<VaultDropdownMenu
						vaults={vaults}
						activeVault={activeVault}
						currentVaultName={currentVaultName}
						onSelect={handleSelect}
						onCreateVault={onCreateVault}
						onClose={() => setIsOpen(false)}
					/>
				)}
			</div>
		);
	}

	return (
		<div ref={dropdownRef} className={cn("relative", className)}>
			{/* Trigger Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"flex items-center gap-2 rounded-md border px-3 py-2 font-medium text-sm",
					"hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					isLoading && "cursor-wait opacity-50"
				)}
				disabled={isLoading}
			>
				{isLoading ? (
					<span className="text-muted-foreground">Loading...</span>
				) : selectedVault ? (
					<>
						{showAvatar && (
							<span
								className={cn(
									"flex h-6 w-6 items-center justify-center rounded-full font-semibold text-xs",
									vaultColor.bg,
									vaultColor.text
								)}
							>
								{firstLetter}
							</span>
						)}
						<span className="flex-1 text-left">{displayName}</span>
						<RoleBadge role={selectedVault.role} />
					</>
				) : (
					<span className="text-muted-foreground">Select vault</span>
				)}
				<ChevronDown
					className={cn(
						"h-4 w-4 text-muted-foreground transition-transform",
						isOpen && "rotate-180"
					)}
				/>
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<VaultDropdownMenu
					vaults={vaults}
					activeVault={activeVault}
					currentVaultName={currentVaultName}
					onSelect={handleSelect}
					onCreateVault={onCreateVault}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</div>
	);
}

/**
 * Small badge showing the user's role in a vault.
 */
function RoleBadge({ role }: { role: VaultOption["role"] }) {
	const colors = {
		owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
		admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
		member: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
	};

	return (
		<span className={cn("rounded px-1.5 py-0.5 font-medium text-xs capitalize", colors[role])}>
			{role}
		</span>
	);
}

/**
 * Dropdown menu for vault selection (shared between icon and full modes).
 */
function VaultDropdownMenu({
	vaults,
	activeVault,
	currentVaultName,
	onSelect,
	onCreateVault,
	onClose,
}: {
	vaults: VaultOption[];
	activeVault: { id: string } | null;
	currentVaultName?: string;
	onSelect: (vault: VaultOption) => void;
	onCreateVault?: () => void;
	onClose: () => void;
}) {
	return (
		<div className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-1 shadow-lg">
			{vaults.length === 0 ? (
				<div className="px-3 py-2 text-muted-foreground text-sm">No vaults available</div>
			) : (
				<div className="max-h-[300px] overflow-auto">
					{vaults.map((vault) => {
						const isActive = vault.id === activeVault?.id;
						// Use CRDT name for active vault in dropdown too
						const vaultDisplayName = isActive && currentVaultName ? currentVaultName : vault.name;
						return (
							<button
								key={vault.id}
								onClick={() => onSelect(vault)}
								className={cn(
									"flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm",
									"hover:bg-accent focus:bg-accent focus:outline-none",
									isActive && "bg-accent"
								)}
							>
								<span className="flex-1 text-left">{vaultDisplayName}</span>
								<RoleBadge role={vault.role} />
								{isActive && <Check className="h-4 w-4 text-primary" />}
							</button>
						);
					})}
				</div>
			)}

			{/* Create Vault Option */}
			{onCreateVault && (
				<>
					<div className="my-1 h-px bg-border" />
					<button
						onClick={() => {
							onCreateVault();
							onClose();
						}}
						className={cn(
							"flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm",
							"hover:bg-accent focus:bg-accent focus:outline-none"
						)}
					>
						<Plus className="h-4 w-4" />
						<span>Create new vault</span>
					</button>
				</>
			)}
		</div>
	);
}

/**
 * Generate a consistent color based on vault name.
 * Uses a simple hash to pick from a predefined palette.
 */
function getVaultColor(name: string): { bg: string; text: string } {
	const colors = [
		{ bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300" },
		{ bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300" },
		{ bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300" },
		{ bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300" },
		{ bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300" },
		{ bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300" },
		{ bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300" },
		{ bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300" },
	];

	// Simple hash function
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}

	return colors[Math.abs(hash) % colors.length];
}
