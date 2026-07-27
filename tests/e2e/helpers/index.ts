/**
 * E2E Test Helpers
 *
 * Re-exports all helper modules for convenience.
 */

export { clearSession, createNewIdentity, enterSeedPhrase, extractSeedPhrase } from "./auth";
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
    goToDashboard,
    goToImportNew,
    goToImports,
    goToPeople,
    goToSettings,
    goToTags,
    goToTransactions,
    goToTxDescriptions
} from "./nav";
