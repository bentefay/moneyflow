export { SyncManager, createSyncManager } from "./manager";
export type { SyncManagerOptions, SyncState } from "./manager";

export { EphemeralPresenceManager, createEphemeralPresenceManager } from "./presence";
export type { PresenceData, OnPresenceStateChange } from "./presence";

// Persistence layer for IndexedDB
export {
  appendOp,
  getUnpushedOps,
  hasUnpushedOps,
  markOpsPushed,
  countOpsSinceSnapshot,
  saveLocalSnapshot,
  loadLocalSnapshot,
  clearVaultData,
} from "./persistence";
export type { LocalOp, LocalSnapshot, SyncMeta } from "./persistence";
