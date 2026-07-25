/**
 * CRDT Module
 *
 * Loro CRDT integration for MoneyFlow vault state management.
 */

export {
    allocationPresenceField,
    type AllocationBoundaryError,
    type AllocationBoundaryResult,
    type AllocationMutationSummary,
    copyAllocationData,
    prepareAllocationReplacement,
    type ReplaceTransactionAllocationsInput,
    replaceTransactionAllocations,
    type SetTransactionAllocationInput,
    setTransactionAllocation
} from "./allocations";
// React context and hooks
export {
    type ApplicationVaultState,
    useAccount,
    useAccounts,
    useActiveAccounts,
    useActiveDescriptionAliases,
    useActiveImports,
    useActivePeople,
    useActiveStatuses,
    useActiveTags,
    useActiveTransactions,
    useAutomations,
    useDescriptionAliasActions,
    useDescriptionAliases,
    useImports,
    useImportTemplates,
    usePeople,
    usePerson,
    useStatuses,
    useTag,
    useTags,
    useTransaction,
    useTransactionActions,
    useTransactions,
    useVaultAction,
    useVaultPreferences,
    useVaultSelector,
    VaultProvider
} from "./context";
export {
    type DescriptionAlias,
    type DescriptionAliasCollection,
    type RealDescriptionAlias,
    type SymlinkDescriptionAlias
} from "../domain/description-aliases";
// Vault defaults initialization
export {
    DEFAULT_ACCOUNT,
    DEFAULT_ACCOUNT_ID,
    DEFAULT_STATUS_IDS,
    DEFAULT_STATUSES,
    getDefaultVaultState,
    hasVaultDefaults,
    initializeVaultDefaults
} from "./defaults";
// Query utilities
export {
    type CursorPaginatedResult,
    type CursorPaginationOptions,
    cursorPaginateTransactions,
    filterTransactions,
    getAccountTransactions,
    getActiveAccounts,
    getActiveItems,
    getActivePeople,
    getActiveTags,
    getItemsByIds,
    getPersonTransactions,
    getStatuses,
    getTagTransactions,
    getTagTree,
    type PaginatedResult,
    type PaginationOptions,
    paginateTransactions,
    queryTransactions,
    type TagTreeNode,
    type TransactionQueryOptions
} from "./queries";
// Rich schema transforms
export { richSchema } from "./rich-schema";
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
    type VaultPreferences,
    vaultPreferencesSchema
} from "./schema";
// Encrypted snapshot serialization
export {
    applyEncryptedUpdate,
    applyEncryptedUpdates,
    createEncryptedSnapshot,
    createEncryptedUpdate,
    type EncryptedSnapshot,
    type EncryptedUpdate,
    loadEncryptedSnapshot,
    type SnapshotMetadata
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
    type VersionVector
} from "./sync";
// Utilities
export { getEntriesOfLoroMap, type WithCid } from "./utils";
