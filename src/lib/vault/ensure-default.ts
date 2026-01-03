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

import sodium from "libsodium-wrappers";
import { LoroDoc } from "loro-crdt";
import { Mirror } from "loro-mirror";
import { getDefaultVaultState } from "@/lib/crdt/defaults";
import { vaultSchema } from "@/lib/crdt/schema";
import { generateVaultKey } from "@/lib/crypto/encryption";
import { initCrypto } from "@/lib/crypto/keypair";
import { wrapKey } from "@/lib/crypto/keywrap";
import { getSession } from "@/lib/crypto/session";
import { detectDefaultCurrency } from "@/lib/domain/detect-currency";

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
		versionVector: string;
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
	const encPublicKey = sodium.from_base64(session.encPublicKey, sodium.base64_variants.ORIGINAL);
	const encSecretKey = sodium.from_base64(session.encSecretKey, sodium.base64_variants.ORIGINAL);
	const wrappedKey = await wrapKey(vaultKey, encPublicKey, encSecretKey);

	// 3. Create vault on server
	const { vaultId } = await api.createVault({
		encryptedVaultKey: sodium.to_base64(wrappedKey, sodium.base64_variants.ORIGINAL),
		encPublicKey: session.encPublicKey,
	});

	// 4. Initialize LoroDoc with default state
	// Detect user's preferred currency from browser locale
	const detectedCurrency = detectDefaultCurrency();
	console.log(`Detected default currency from locale: ${detectedCurrency}`);

	const doc = new LoroDoc();
	const defaultState = getDefaultVaultState({ defaultCurrency: detectedCurrency });

	const mirror = new Mirror({
		doc,
		schema: vaultSchema,
		validateUpdates: true,
		throwOnValidationError: true,
	});

	// new Mirror({ initialState }) doesn't appear to sync to the doc, so we use setState
	mirror.setState(() => {
		return defaultState;
	});

	console.log(doc.toJSON());

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
	// Get version vector from doc for server-side filtering
	const versionVector = JSON.stringify(doc.version().toJSON());

	await api.saveSnapshot({
		vaultId,
		version: 1,
		hlcTimestamp: generateHlcTimestamp(),
		encryptedData: sodium.to_base64(encryptedData, sodium.base64_variants.ORIGINAL),
		versionVector,
	});

	console.log(`Created default vault: ${vaultId}`);

	return {
		vaultId,
		name: DEFAULT_VAULT_NAME,
		created: true,
		vaultKey,
	};
}

// Re-export setActiveVaultStorage from the provider for backwards compatibility
export { setActiveVaultStorage } from "@/components/providers/active-vault-provider";
