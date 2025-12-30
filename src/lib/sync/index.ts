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
	saveLocalSnapshot,
} from "./persistence";
export type { OnPresenceStateChange, PresenceData } from "./presence";
export { createEphemeralPresenceManager, EphemeralPresenceManager } from "./presence";
