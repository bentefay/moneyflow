/**
 * E2E Test Helpers
 *
 * Re-exports all helper modules for convenience.
 */

export {
    clearSession,
    createNewIdentity,
    enterSeedPhrase,
    extractSeedPhrase,
    waitForUnlockHydration
} from "./auth";
export {
    countRealtimeGrants,
    readActiveVaultId,
    readBrowserIdentity,
    removeFixtureMember,
    shareActiveVaultWithMember
} from "./realtime";
export {
    expectPresentRows,
    observePresenceTraffic,
    openDuplicateTab,
    type PresenceTrafficReport,
    readPresentRowIds,
    readRowId,
    readRowPresenceEditing
} from "./presence";
export {
    goToAccounts,
    goToAutomations,
    goToImportNew,
    goToImports,
    goToPeople,
    goToSettings,
    goToStatuses,
    goToTags,
    goToTransactions,
    goToTxDescriptions
} from "./nav";
export { createTag, type TagSpec } from "./tags";
