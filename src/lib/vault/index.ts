/**
 * Vault Module
 *
 * Utilities for vault management, including automatic default vault creation.
 */

export { DEFAULT_VAULT_NAME } from "@/lib/crdt/defaults";
export {
    type EnsureDefaultVaultOptions,
    type EnsureVaultResult,
    ensureDefaultVault,
    setActiveVaultStorage,
    type VaultApiMethods,
} from "./ensure-default";
