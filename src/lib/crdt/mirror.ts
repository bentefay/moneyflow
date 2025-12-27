/**
 * Loro Mirror Instance
 *
 * Creates and manages the loro-mirror Mirror instance for vault state management.
 * The Mirror provides bidirectional sync between app state and the underlying LoroDoc.
 */

import { LoroDoc } from "loro-crdt";
import { Mirror } from "loro-mirror";
import { vaultSchema, type VaultState } from "./schema";

/**
 * Options for creating a vault mirror
 */
export interface CreateVaultMirrorOptions {
  /** Existing LoroDoc to sync with (optional - creates new if not provided) */
  doc?: LoroDoc;
  /** Initial state to populate the vault with */
  initialState?: Partial<VaultState>;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable state consistency checks (slower, for development) */
  checkStateConsistency?: boolean;
}

/**
 * Default initial state for a new vault
 * Note: $cid fields are automatically managed by loro-mirror
 */
export const DEFAULT_VAULT_STATE = {
  people: {},
  accounts: {},
  tags: {},
  statuses: {},
  transactions: {},
  imports: {},
  importTemplates: {},
  automations: {},
  preferences: {
    automationCreationPreference: "manual",
    defaultCurrency: "USD",
  },
} as const;

/**
 * Creates a new vault Mirror instance.
 *
 * The Mirror provides:
 * - Type-safe state access via `getState()`
 * - Reactive updates via `setState()` with draft-style mutations
 * - Automatic sync to the underlying LoroDoc
 * - Schema validation
 *
 * @example
 * ```typescript
 * const { mirror, doc } = createVaultMirror();
 *
 * // Read state
 * const state = mirror.getState();
 * console.log(state.people);
 *
 * // Update state (draft-style mutation - REQUIRED)
 * mirror.setState((draft) => {
 *   draft.people["person-1"] = {
 *     id: "person-1",
 *     name: "Alice"
 *   };
 * });
 * ```
 */
export function createVaultMirror(options: CreateVaultMirrorOptions = {}): {
  mirror: Mirror<typeof vaultSchema>;
  doc: LoroDoc;
} {
  const {
    doc = new LoroDoc(),
    initialState = DEFAULT_VAULT_STATE,
    debug = false,
    checkStateConsistency = false,
  } = options;

  const mirror = new Mirror({
    doc,
    schema: vaultSchema,
    initialState,
    validateUpdates: true,
    throwOnValidationError: true,
    debug,
    checkStateConsistency,
  });

  return { mirror, doc };
}

/**
 * Creates a vault mirror from an existing snapshot.
 *
 * Used when loading a vault from the server.
 *
 * @param snapshot - Loro snapshot bytes (decrypted)
 * @param options - Mirror options
 */
export function createVaultMirrorFromSnapshot(
  snapshot: Uint8Array,
  options: Omit<CreateVaultMirrorOptions, "doc" | "initialState"> = {}
): { mirror: Mirror<typeof vaultSchema>; doc: LoroDoc } {
  const doc = new LoroDoc();
  doc.import(snapshot);

  const mirror = new Mirror({
    doc,
    schema: vaultSchema,
    validateUpdates: true,
    throwOnValidationError: true,
    debug: options.debug ?? false,
    checkStateConsistency: options.checkStateConsistency ?? false,
  });

  return { mirror, doc };
}

/**
 * Applies updates to an existing vault mirror.
 *
 * Used when receiving sync updates from other clients.
 *
 * @param doc - The LoroDoc to update
 * @param updates - Array of Loro update bytes (decrypted)
 */
export function applyUpdates(doc: LoroDoc, updates: Uint8Array[]): void {
  for (const update of updates) {
    doc.import(update);
  }
}

/**
 * Type alias for vault Mirror
 */
export type VaultMirror = Mirror<typeof vaultSchema>;
