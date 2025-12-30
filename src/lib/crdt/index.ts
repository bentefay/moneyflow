/**
 * CRDT Module
 *
 * Loro CRDT integration for MoneyFlow vault state management.
 */

// React context and hooks
export {
	useAccount,
	useAccounts,
	useActiveAccounts,
	useActiveImports,
	useActivePeople,
	useActiveStatuses,
	useActiveTags,
	useActiveTransactions,
	useAutomations,
	useImports,
	useImportTemplates,
	usePeople,
	usePerson,
	useStatuses,
	useTag,
	useTags,
	useTransaction,
	useTransactions,
	useVaultAction,
	useVaultContext,
	useVaultPreferences,
	useVaultSelector,
	useVaultState,
	VaultContext,
	VaultProvider,
} from "./context";
// Vault defaults initialization
export {
	DEFAULT_STATUS_IDS,
	DEFAULT_STATUSES,
	getDefaultVaultState,
	hasVaultDefaults,
	initializeVaultDefaults,
} from "./defaults";
// Mirror instance creation
export {
	applyUpdates,
	type CreateVaultMirrorOptions,
	createVaultMirror,
	createVaultMirrorFromSnapshot,
	DEFAULT_VAULT_STATE,
	type VaultMirror,
} from "./mirror";
// Schema and types
export {
	type Account,
	type AccountInput,
	type Automation,
	type AutomationAction,
	type AutomationCondition,
	type AutomationInput,
	accountSchema,
	automationActionSchema,
	automationConditionSchema,
	automationSchema,
	type Import,
	type ImportInput,
	type ImportTemplate,
	type ImportTemplateInput,
	importSchema,
	importTemplateSchema,
	type Person,
	type PersonInput,
	personSchema,
	type Status,
	type StatusInput,
	statusSchema,
	type Tag,
	type TagInput,
	type Transaction,
	type TransactionInput,
	tagSchema,
	transactionSchema,
	type VaultInput,
	type VaultPreferences,
	type VaultState,
	vaultPreferencesSchema,
	vaultSchema,
} from "./schema";
// Encrypted snapshot serialization
export {
	applyEncryptedUpdate,
	applyEncryptedUpdates,
	createEncryptedSnapshot,
	createEncryptedUpdate,
	decryptUserData,
	type EncryptedSnapshot,
	type EncryptedUpdate,
	encryptUserData,
	loadEncryptedSnapshot,
	type SnapshotMetadata,
} from "./snapshot";
// Binary sync utilities
export {
	exportSnapshot,
	exportUpdates,
	exportUpdatesSafe,
	getOplogVersion,
	getVersion,
	getVersionEncoded,
	hasChangesSince,
	importData,
	importUpdates,
	LoroDoc,
	type VersionState,
	type VersionVector,
} from "./sync";
