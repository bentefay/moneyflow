/**
 * CRDT Module
 *
 * Loro CRDT integration for MoneyFlow vault state management.
 */

// Schema and types
export {
  vaultSchema,
  personSchema,
  accountSchema,
  tagSchema,
  statusSchema,
  transactionSchema,
  importSchema,
  importTemplateSchema,
  automationSchema,
  automationConditionSchema,
  automationActionSchema,
  vaultPreferencesSchema,
  type VaultState,
  type VaultInput,
  type Person,
  type Account,
  type Tag,
  type Status,
  type Transaction,
  type Import,
  type ImportTemplate,
  type Automation,
  type AutomationCondition,
  type AutomationAction,
  type VaultPreferences,
  type PersonInput,
  type AccountInput,
  type TagInput,
  type StatusInput,
  type TransactionInput,
  type ImportInput,
  type ImportTemplateInput,
  type AutomationInput,
} from "./schema";

// Mirror instance creation
export {
  createVaultMirror,
  createVaultMirrorFromSnapshot,
  applyUpdates,
  DEFAULT_VAULT_STATE,
  type CreateVaultMirrorOptions,
  type VaultMirror,
} from "./mirror";

// React context and hooks
export {
  VaultContext,
  VaultProvider,
  useVaultContext,
  useVaultState,
  useVaultSelector,
  useVaultAction,
  usePeople,
  useAccounts,
  useTags,
  useStatuses,
  useTransactions,
  useImports,
  useImportTemplates,
  useAutomations,
  useVaultPreferences,
  usePerson,
  useAccount,
  useTag,
  useTransaction,
  useActivePeople,
  useActiveAccounts,
  useActiveTags,
  useActiveTransactions,
} from "./context";

// Binary sync utilities
export {
  exportSnapshot,
  exportUpdates,
  exportUpdatesSafe,
  importData,
  importUpdates,
  getVersion,
  getVersionEncoded,
  getOplogVersion,
  hasChangesSince,
  LoroDoc,
  type VersionVector,
  type VersionState,
} from "./sync";

// Encrypted snapshot serialization
export {
  createEncryptedSnapshot,
  loadEncryptedSnapshot,
  createEncryptedUpdate,
  applyEncryptedUpdate,
  applyEncryptedUpdates,
  encryptUserData,
  decryptUserData,
  type SnapshotMetadata,
  type EncryptedSnapshot,
  type EncryptedUpdate,
} from "./snapshot";
