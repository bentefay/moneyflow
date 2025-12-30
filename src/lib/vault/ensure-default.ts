/**
 * Ensure Default Vault
 *
 * Creates a default "My Vault" when a user has no vaults.
 * This ensures users never see an empty state after authentication.
 *
 * Called from:
 * - registerIdentity() in useIdentity hook (new user flow)
 * - unlock() in useIdentity hook (returning user edge case)
 */

import { LoroDoc } from "loro-crdt";
import { Mirror } from "loro-mirror";
import sodium from "libsodium-wrappers";
import { initCrypto } from "@/lib/crypto/keypair";
import { generateVaultKey } from "@/lib/crypto/encryption";
import { wrapKey } from "@/lib/crypto/keywrap";
import { getSession } from "@/lib/crypto/session";
import { vaultSchema, type VaultInput } from "@/lib/crdt/schema";
import { getDefaultVaultState, DEFAULT_STATUS_IDS } from "@/lib/crdt/defaults";

/**
 * Result of vault creation
 */
export interface EnsureVaultResult {
  /** The vault ID (either existing or newly created) */
  vaultId: string;
  /** The vault name */
  name: string;
  /** Whether a new vault was created */
  created: boolean;
  /** The vault encryption key (only for newly created vaults) */
  vaultKey?: Uint8Array;
}

/**
 * API functions needed by ensureDefaultVault
 */
export interface VaultApiMethods {
  /** List user's vaults */
  listVaults: () => Promise<{
    vaults: Array<{ id: string; role: string; encryptedVaultKey: string }>;
  }>;
  /** Create a new vault */
  createVault: (input: {
    encryptedVaultKey: string;
    encPublicKey: string;
  }) => Promise<{ vaultId: string }>;
  /** Save a vault snapshot */
  saveSnapshot: (input: {
    vaultId: string;
    version: number;
    hlcTimestamp: string;
    encryptedData: string;
  }) => Promise<{ snapshotId: string }>;
}

/**
 * Options for ensureDefaultVault
 */
export interface EnsureDefaultVaultOptions {
  /** API methods for vault operations */
  api: VaultApiMethods;
  /** Force creation even if user has vaults (for testing) */
  force?: boolean;
}

/**
 * The default vault name for new users
 */
export const DEFAULT_VAULT_NAME = "My Vault";

/**
 * Generates the HLC timestamp for sync operations.
 * Format: {unix_ms}:{counter}:{node_id}
 */
function generateHlcTimestamp(): string {
  const timestamp = Date.now();
  const counter = 0;
  const nodeId = crypto.randomUUID().slice(0, 8);
  return `${timestamp}:${counter}:${nodeId}`;
}

/**
 * Ensures the user has at least one vault.
 * If no vaults exist, creates a default "My Vault".
 *
 * This function:
 * 1. Lists the user's vaults via API
 * 2. If vaults exist, returns the first one
 * 3. If no vaults exist:
 *    a. Generates a new vault encryption key
 *    b. Creates the vault on the server
 *    c. Initializes a LoroDoc with default state
 *    d. Saves the initial snapshot
 *    e. Returns the new vault info
 *
 * @param options - Configuration options including API methods
 * @returns The vault ID and whether it was newly created
 */
export async function ensureDefaultVault(
  options: EnsureDefaultVaultOptions
): Promise<EnsureVaultResult> {
  const { api, force = false } = options;
  await initCrypto();

  // Get session for encryption keys
  const session = getSession();
  if (!session) {
    throw new Error("No session - user must be authenticated");
  }

  // Check if user already has vaults
  if (!force) {
    const { vaults } = await api.listVaults();
    if (vaults.length > 0) {
      // User already has vaults, return the first one
      return {
        vaultId: vaults[0].id,
        name: DEFAULT_VAULT_NAME, // We don't have the name from server
        created: false,
      };
    }
  }

  // No vaults - create a default one
  console.log("Creating default vault for new user...");

  // 1. Generate vault encryption key
  const vaultKey = await generateVaultKey();

  // 2. Wrap key for the user (wrap with own public key)
  const encPublicKey = sodium.from_base64(session.encPublicKey);
  const encSecretKey = sodium.from_base64(session.encSecretKey);
  const wrappedKey = await wrapKey(vaultKey, encPublicKey, encSecretKey);

  // 3. Create vault on server
  const { vaultId } = await api.createVault({
    encryptedVaultKey: sodium.to_base64(wrappedKey),
    encPublicKey: session.encPublicKey,
  });

  // 4. Initialize LoroDoc with default state
  const doc = new LoroDoc();
  const defaultState = getDefaultVaultState();

  const mirror = new Mirror({
    doc,
    schema: vaultSchema,
    initialState: defaultState,
    validateUpdates: true,
    throwOnValidationError: true,
  });

  // The mirror.getState() will have the initial state
  // We need to commit it to the doc
  mirror.setState((draft: VaultInput) => {
    // Ensure statuses are set (should already be from initialState)
    if (!draft.statuses[DEFAULT_STATUS_IDS.FOR_REVIEW]) {
      draft.statuses[DEFAULT_STATUS_IDS.FOR_REVIEW] =
        defaultState.statuses[DEFAULT_STATUS_IDS.FOR_REVIEW];
    }
    if (!draft.statuses[DEFAULT_STATUS_IDS.PAID]) {
      draft.statuses[DEFAULT_STATUS_IDS.PAID] = defaultState.statuses[DEFAULT_STATUS_IDS.PAID];
    }
  });

  // 5. Export snapshot and encrypt
  const snapshot = doc.export({ mode: "snapshot" });

  // Encrypt the snapshot
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(snapshot, nonce, vaultKey);

  // Combine nonce + ciphertext
  const encryptedData = new Uint8Array(nonce.length + ciphertext.length);
  encryptedData.set(nonce);
  encryptedData.set(ciphertext, nonce.length);

  // 6. Save initial snapshot
  await api.saveSnapshot({
    vaultId,
    version: 1,
    hlcTimestamp: generateHlcTimestamp(),
    encryptedData: sodium.to_base64(encryptedData),
  });

  console.log(`Created default vault: ${vaultId}`);

  return {
    vaultId,
    name: DEFAULT_VAULT_NAME,
    created: true,
    vaultKey,
  };
}

/**
 * Sets the active vault in localStorage.
 * This is a helper to avoid importing the hook.
 */
export function setActiveVaultStorage(vault: { id: string; name?: string } | null): void {
  const STORAGE_KEY = "moneyflow_active_vault";

  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    if (vault) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to persist active vault:", error);
  }
}
