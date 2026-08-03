// `./local-persistence-seam` is deliberately absent from this barrel: it is a harness-only surface
// with a single install site, and re-exporting it invites application code to depend on it.
export type { SyncManagerOptions, SyncState } from "./manager";
export { createSyncManager, SyncManager } from "./manager";
export type { LocalOp, LocalSnapshot, SyncMeta } from "./persistence";
// Persistence layer for IndexedDB
export {
    appendOp,
    clearVaultData,
    countOpsSinceSnapshot,
    getUnpushedOps,
    hasUnpushedOps,
    loadLocalSnapshot,
    markOpsPushed,
    saveLocalSnapshot
} from "./persistence";
// Loro ephemeral presence (HS-003)
export type { OnPresenceSnapshot, PresenceManagerOptions, PresenceSnapshot } from "./presence";
export {
    createEphemeralPresenceManager,
    EMPTY_PRESENCE_SNAPSHOT,
    EphemeralPresenceManager
} from "./presence";
export type {
    PresenceEntry,
    PresenceEnvelope,
    PresenceRejectionReason,
    PresenceSession,
    PresenceState,
    TransactionPresence
} from "./presence-protocol";
export {
    applyPresenceUpdate,
    buildTransactionPresence,
    createPresenceEntry,
    IDLE_PRESENCE_STATE,
    isSamePresenceState,
    openPresenceEnvelope,
    PRESENCE_PROTOCOL_VERSION,
    PRESENCE_REFRESH_MS,
    PRESENCE_TIMEOUT_MS,
    readOnlineIdentities,
    readPresenceSessions,
    sealPresenceUpdate
} from "./presence-protocol";
