/**
 * Vault Module
 *
 * Utilities for vault management, including automatic default vault creation.
 */

export {
	DEFAULT_VAULT_NAME,
	type EnsureDefaultVaultOptions,
	type EnsureVaultResult,
	ensureDefaultVault,
	setActiveVaultStorage,
	type VaultApiMethods,
} from "./ensure-default";
