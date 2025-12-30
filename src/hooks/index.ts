export { useVaultPresence } from "./use-vault-presence";
export type { VaultPresence, UseVaultPresenceOptions } from "./use-vault-presence";

export { useActiveVault } from "./use-active-vault";
export type { ActiveVault } from "./use-active-vault";

export { useIdentity, useIsAuthenticated, usePubkeyHash } from "./use-identity";
export type {
  IdentityStatus,
  IdentityState,
  IdentityActions,
  UseIdentityReturn,
} from "./use-identity";

export { useIsHydrated } from "./use-is-hydrated";

export {
  useSyncStatus,
  useSyncStatusManager,
  usePollUnsavedChanges,
  SyncStatusProvider,
} from "./use-sync-status";
export type { SyncStatus, SyncStatusContextValue } from "./use-sync-status";
