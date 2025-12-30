"use client";

/**
 * Active Vault Hook
 *
 * Re-export of useActiveVaultContext for backward compatibility.
 * New code should import directly from the provider.
 */

export { useActiveVaultContext as useActiveVault } from "@/components/providers/active-vault-provider";
export type { ActiveVault } from "@/components/providers/active-vault-provider";
