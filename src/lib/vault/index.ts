/**
 * Vault Module
 *
 * Utilities for vault management, including automatic default vault creation.
 */

export {
  ensureDefaultVault,
  setActiveVaultStorage,
  DEFAULT_VAULT_NAME,
  type EnsureVaultResult,
  type EnsureDefaultVaultOptions,
  type VaultApiMethods,
} from "./ensure-default";
