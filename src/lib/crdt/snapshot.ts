/**
 * Encrypted Snapshot Serialization
 *
 * Handles encryption and decryption of Loro snapshots and updates
 * for server storage and sync.
 */

import type { LoroDoc, VersionVector } from "loro-crdt";
import {
  encryptForStorage,
  decryptFromStorage,
  encryptJSON,
  decryptJSON,
} from "../crypto/encryption";
import { exportSnapshot, exportShallowSnapshot, exportUpdates, getVersionEncoded } from "./sync";
import { Temporal } from "temporal-polyfill";

/**
 * Metadata stored alongside encrypted snapshots
 */
export interface SnapshotMetadata {
  /** Version number (monotonic) */
  version: number;
  /** Encoded version vector from Loro */
  versionVector: string; // base64
  /** Timestamp when snapshot was created */
  createdAt: number;
}

/**
 * Encrypted snapshot ready for server storage
 */
export interface EncryptedSnapshot {
  /** Encrypted Loro snapshot bytes (base64) */
  encryptedData: string;
  /** Snapshot metadata */
  metadata: SnapshotMetadata;
}

/**
 * Encrypted update ready for server storage
 */
export interface EncryptedUpdate {
  /** Encrypted Loro update bytes (base64) */
  encryptedData: string;
  /** Base snapshot version this update applies to */
  baseSnapshotVersion: number;
  /** HLC timestamp for ordering */
  hlcTimestamp: string;
}

/**
 * Exports and encrypts a Loro document as a snapshot.
 *
 * @param doc - The LoroDoc to snapshot
 * @param vaultKey - 32-byte vault encryption key
 * @param version - Snapshot version number
 * @returns Encrypted snapshot with metadata
 */
export async function createEncryptedSnapshot(
  doc: LoroDoc,
  vaultKey: Uint8Array,
  version: number
): Promise<EncryptedSnapshot> {
  // Export full snapshot
  const snapshot = exportSnapshot(doc);

  // Encrypt snapshot bytes
  const encrypted = await encryptForStorage(snapshot, vaultKey);

  // Get version vector for metadata (encoded as bytes for storage)
  const versionVectorBytes = getVersionEncoded(doc);

  // Convert to base64 for JSON storage
  const encryptedData = btoa(String.fromCharCode(...encrypted));
  const versionVectorBase64 = btoa(String.fromCharCode(...versionVectorBytes));

  return {
    encryptedData,
    metadata: {
      version,
      versionVector: versionVectorBase64,
      createdAt: Temporal.Now.instant().epochMilliseconds,
    },
  };
}

/**
 * Exports and encrypts a Loro document as a shallow snapshot.
 *
 * Shallow snapshots are smaller as they don't include historical
 * operations. Used for fast cold start - new clients download the
 * snapshot then apply ops newer than its version vector.
 *
 * @param doc - The LoroDoc to snapshot
 * @param vaultKey - 32-byte vault encryption key
 * @param version - Snapshot version number
 * @returns Encrypted shallow snapshot with metadata
 */
export async function createEncryptedShallowSnapshot(
  doc: LoroDoc,
  vaultKey: Uint8Array,
  version: number
): Promise<EncryptedSnapshot> {
  // Export shallow snapshot (current state only, no history)
  const snapshot = exportShallowSnapshot(doc);

  // Encrypt snapshot bytes
  const encrypted = await encryptForStorage(snapshot, vaultKey);

  // Get version vector for metadata
  const versionVectorBytes = getVersionEncoded(doc);

  // Convert to base64 for JSON storage
  const encryptedData = btoa(String.fromCharCode(...encrypted));
  const versionVectorBase64 = btoa(String.fromCharCode(...versionVectorBytes));

  return {
    encryptedData,
    metadata: {
      version,
      versionVector: versionVectorBase64,
      createdAt: Temporal.Now.instant().epochMilliseconds,
    },
  };
}

/**
 * Decrypts and imports a snapshot into a new LoroDoc.
 *
 * @param encryptedSnapshot - Encrypted snapshot from server
 * @param vaultKey - 32-byte vault encryption key
 * @returns New LoroDoc with imported snapshot
 */
export async function loadEncryptedSnapshot(
  encryptedSnapshot: EncryptedSnapshot,
  vaultKey: Uint8Array
): Promise<LoroDoc> {
  const { LoroDoc } = await import("loro-crdt");

  // Decode base64
  const encrypted = Uint8Array.from(atob(encryptedSnapshot.encryptedData), (c) => c.charCodeAt(0));

  // Decrypt
  const snapshot = await decryptFromStorage(encrypted, vaultKey);

  // Create new doc and import
  const doc = new LoroDoc();
  doc.import(snapshot);

  return doc;
}

/**
 * Exports and encrypts updates from a LoroDoc.
 *
 * @param doc - The LoroDoc to export from
 * @param vaultKey - 32-byte vault encryption key
 * @param baseSnapshotVersion - Version of the base snapshot
 * @param since - VersionVector to export updates from (optional)
 * @returns Encrypted update
 */
export async function createEncryptedUpdate(
  doc: LoroDoc,
  vaultKey: Uint8Array,
  baseSnapshotVersion: number,
  since?: VersionVector
): Promise<EncryptedUpdate> {
  // Export updates
  const updates = exportUpdates(doc, since);

  // Encrypt
  const encrypted = await encryptForStorage(updates, vaultKey);
  const encryptedData = btoa(String.fromCharCode(...encrypted));

  // Create HLC timestamp (simplified - just using wall clock + counter)
  const hlcTimestamp = `${Temporal.Now.instant().epochMilliseconds}-0`;

  return {
    encryptedData,
    baseSnapshotVersion,
    hlcTimestamp,
  };
}

/**
 * Decrypts an encrypted update and returns the raw bytes.
 *
 * @param encryptedUpdate - Encrypted update from server (can have minimal fields)
 * @param vaultKey - 32-byte vault encryption key
 * @returns Decrypted update bytes
 */
export async function decryptUpdate(
  encryptedUpdate: Pick<EncryptedUpdate, "encryptedData">,
  vaultKey: Uint8Array
): Promise<Uint8Array> {
  // Decode base64
  const encrypted = Uint8Array.from(atob(encryptedUpdate.encryptedData), (c) => c.charCodeAt(0));

  // Decrypt and return raw bytes
  return decryptFromStorage(encrypted, vaultKey);
}

/**
 * Decrypts and imports an update into an existing LoroDoc.
 *
 * @param doc - The LoroDoc to update
 * @param encryptedUpdate - Encrypted update from server
 * @param vaultKey - 32-byte vault encryption key
 */
export async function applyEncryptedUpdate(
  doc: LoroDoc,
  encryptedUpdate: EncryptedUpdate,
  vaultKey: Uint8Array
): Promise<void> {
  // Decode base64
  const encrypted = Uint8Array.from(atob(encryptedUpdate.encryptedData), (c) => c.charCodeAt(0));

  // Decrypt
  const updates = await decryptFromStorage(encrypted, vaultKey);

  // Import
  doc.import(updates);
}

/**
 * Decrypts and imports multiple updates into a LoroDoc.
 *
 * @param doc - The LoroDoc to update
 * @param encryptedUpdates - Array of encrypted updates from server
 * @param vaultKey - 32-byte vault encryption key
 */
export async function applyEncryptedUpdates(
  doc: LoroDoc,
  encryptedUpdates: EncryptedUpdate[],
  vaultKey: Uint8Array
): Promise<void> {
  // Sort by HLC timestamp to ensure correct order
  const sorted = [...encryptedUpdates].sort((a, b) => a.hlcTimestamp.localeCompare(b.hlcTimestamp));

  for (const update of sorted) {
    await applyEncryptedUpdate(doc, update, vaultKey);
  }
}

/**
 * Encrypts user data (vault list, settings) for server storage.
 *
 * This is stored in user_data.encrypted_data and contains
 * the list of vaults the user belongs to.
 *
 * @param userData - User data object
 * @param userKey - User's encryption key (derived from seed)
 * @returns Base64-encoded encrypted data
 */
export async function encryptUserData<T>(userData: T, userKey: Uint8Array): Promise<string> {
  return encryptJSON(userData, userKey);
}

/**
 * Decrypts user data from server storage.
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @param userKey - User's encryption key
 * @returns Decrypted user data
 */
export async function decryptUserData<T>(encryptedData: string, userKey: Uint8Array): Promise<T> {
  return decryptJSON<T>(encryptedData, userKey);
}
