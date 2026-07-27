/**
 * Loro Mirror Instance
 *
 * Creates and manages the loro-mirror Mirror instance for vault state management.
 * The Mirror provides bidirectional sync between app state and the underlying LoroDoc.
 */

import { LoroDoc, LoroMap } from "loro-crdt";
import { Mirror } from "loro-mirror";

import {
    DEFAULT_AUTOMATION_CREATION_PREFERENCE,
    DEFAULT_CURRENCY,
    DEFAULT_VAULT_NAME
} from "./defaults";
import { migrateVaultAutomationsToFieldRules } from "./field-rules";
import { migrateVaultSentinels } from "./migration";
import { ensureMemberPerson } from "./person";
import { type VaultState, vaultSchema } from "./schema";
import { getVaultSystemOrigin } from "./undo";

const LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY = "__moneyflow_gc_metadata__";

/** Remove the revision-04 account-shaped marker before Mirror can enumerate transactions. */
function cleanupLegacyVaultMaintenanceMetadata(doc: LoroDoc): boolean {
    const transactions = doc.getMap("transactions");
    if (!(transactions.get(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY) instanceof LoroMap)) {
        return false;
    }
    transactions.delete(LEGACY_MAINTENANCE_METADATA_ACCOUNT_KEY);
    doc.commit({ origin: "system:gc", message: "__moneyflow_gc_commit_v1__" });
    return true;
}

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
    descriptionAliases: {},
    imports: {},
    importTemplates: {},
    automations: {},
    fieldRules: {},
    userAutomationPreferences: {},
    preferences: {
        name: DEFAULT_VAULT_NAME,
        automationCreationPreference: DEFAULT_AUTOMATION_CREATION_PREFERENCE,
        defaultCurrency: DEFAULT_CURRENCY,
        automationRulesMigrationVersion: 0
    }
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
        checkStateConsistency = false
    } = options;

    // Enable timestamp recording for version vectors
    // This allows server-side filtering of ops by timestamp
    doc.setRecordTimestamp(true);
    cleanupLegacyVaultMaintenanceMetadata(doc);

    const mirror = new Mirror({
        doc,
        schema: vaultSchema,
        initialState,
        validateUpdates: true,

        debug,
        checkStateConsistency
    });

    migrateVaultSentinels(mirror);
    migrateVaultAutomations(mirror);

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
    cleanupLegacyVaultMaintenanceMetadata(doc);

    // Enable timestamp recording for version vectors
    // This allows server-side filtering of ops by timestamp
    doc.setRecordTimestamp(true);

    const mirror = new Mirror({
        doc,
        schema: vaultSchema,
        validateUpdates: true,

        debug: options.debug ?? false,
        checkStateConsistency: options.checkStateConsistency ?? false
    });

    // Migrate legacy sentinel values (deletedAt: 0, behavior: "", currency: "")
    // to undefined before any consumers read state
    migrateVaultSentinels(mirror);
    migrateVaultAutomations(mirror);

    return { mirror, doc };
}

/**
 * Run the one-shot legacy-automation -> field-rule migration (HS-007 / P17A) at hydration.
 *
 * Idempotent (guarded by a version marker in vault preferences) and deterministic (derived rule
 * ids converge across devices), so it is safe to invoke on every vault open. Runs under a
 * system:migration origin so it is excluded from the user undo history, matching sentinel repair.
 */
export function migrateVaultAutomations(mirror: VaultMirror): void {
    mirror.setState(
        (draft: VaultState) => {
            migrateVaultAutomationsToFieldRules(draft);
        },
        { origin: getVaultSystemOrigin("migration") }
    );
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Repair a fully hydrated production document before React consumers or UndoManager observe it.
 * The temporary Mirror is disposed immediately; only system-origin Loro operations remain.
 */
export function repairHydratedVaultDocument(doc: LoroDoc): boolean {
    const before = doc.version().encode();
    cleanupLegacyVaultMaintenanceMetadata(doc);
    const mirror = new Mirror({
        doc,
        schema: vaultSchema,
        initialState: DEFAULT_VAULT_STATE,
        validateUpdates: true
    });
    try {
        migrateVaultSentinels(mirror);
        migrateVaultAutomations(mirror);
    } finally {
        mirror.dispose();
    }
    return !bytesEqual(before, doc.version().encode());
}

/**
 * Ensure the current member has a linked {@link Person} in the hydrated vault
 * document (HS-012). Idempotent and deterministic, so it is safe to run on every
 * vault open and converges across concurrent devices.
 *
 * @param doc - The fully hydrated vault document.
 * @param pubkeyHash - The current member's stable identity.
 * @param adoptDefaultPerson - When true (vault owner), adopt the seeded "Me"
 *   person if it is still unlinked instead of creating a new person.
 * @returns true if the document changed (caller should persist/sync).
 */
export function ensureMemberPersonLinked(
    doc: LoroDoc,
    pubkeyHash: string,
    adoptDefaultPerson: boolean
): boolean {
    const before = doc.version().encode();
    const mirror = new Mirror({
        doc,
        schema: vaultSchema,
        initialState: DEFAULT_VAULT_STATE,
        validateUpdates: true
    });
    try {
        mirror.setState((draft) => {
            ensureMemberPerson(draft, pubkeyHash, { adoptDefaultPerson });
        });
    } finally {
        mirror.dispose();
    }
    return !bytesEqual(before, doc.version().encode());
}

/**
 * Type alias for vault Mirror
 */
export type VaultMirror = Mirror<typeof vaultSchema>;
