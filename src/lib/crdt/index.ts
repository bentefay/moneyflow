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
    type ApplyFieldRuleActions,
    type FieldRuleActions,
    useAccount,
    useAccounts,
    useActiveAccounts,
    useActiveDescriptionAliases,
    useActiveFieldRules,
    useActiveImports,
    useActivePeople,
    useActiveStatuses,
    useActiveTags,
    useActiveTransactions,
    useApplyFieldRules,
    useApplyFieldRulesToTransaction,
    useAutomations,
    useCommitImportBatch,
    useDescriptionAliasActions,
    useDescriptionAliases,
    useFieldRuleActions,
    useImports,
    useImportTemplates,
    usePeople,
    usePersistAutomationPreference,
    usePersistDateFormat,
    usePersistTransactionInspectorOpen,
    usePerson,
    useStatuses,
    useTag,
    useTags,
    useTransaction,
    useTransactionActions,
    useTransactionIndex,
    useTransactions,
    useUserAutomationChoice,
    useUserDateFormat,
    useUserTransactionInspectorOpen,
    useVaultAction,
    useVaultPreferences,
    useVaultSelector,
    VaultProvider
} from "./context";
// Field-rule CRUD + remembered-preference persistence (HS-007 / P17B shared editor)
export {
    type CreateFieldRuleInput,
    createFieldRule,
    type DeleteFieldRuleInput,
    deleteFieldRule,
    type FieldRuleActionInput,
    type FieldRuleMutationError,
    type FieldRuleMutationResult,
    persistUserAutomationPreference,
    type PersistUserAutomationPreferenceInput,
    readUserAutomationChoice,
    type UpdateFieldRuleInput,
    updateFieldRule
} from "./field-rule-mutations";
export {
    type DescriptionAlias,
    type DescriptionAliasCollection,
    type RealDescriptionAlias,
    type SymlinkDescriptionAlias
} from "../domain/description-aliases";
// Field-rule engine wiring (HS-007 / P17A)
export {
    type AppliedFieldRuleOutcome,
    applyFieldRulesToAllTransactions,
    applyFieldRulesToImport,
    applyFieldRulesToNewerTransactions,
    applyFieldRulesToTransaction,
    AUTOMATION_RULES_MIGRATION_VERSION,
    type AutomationMigrationSummary,
    type BulkFieldRuleEntry,
    migrateVaultAutomationsToFieldRules,
    readActiveFieldRules
} from "./field-rules";
// Apply active field rules to a single transaction (HS-007 / P17C "apply to this transaction")
export {
    applyFieldRulesToSingleTransaction,
    type ApplyFieldRulesToTransactionResult
} from "./apply-field-rule-to-transaction";
// Production import commit (P14 batch insert + P17A field-rule application)
export {
    commitImportBatch,
    type CommitImportBatchInput,
    type ImportBatchTransactionInput
} from "./import-commit";
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
    filterTransactions,
    getAccountTransactions,
    getActiveItems,
    type PaginatedResult,
    type PaginationOptions,
    queryTransactions,
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
