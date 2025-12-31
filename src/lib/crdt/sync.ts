/**
 * Loro Binary Sync Utilities
 *
 * Helpers for exporting and importing Loro updates as binary data.
 * These are used before encryption for server sync.
 */

import { LoroDoc, type VersionVector } from "loro-crdt";

/**
 * Version state from a LoroDoc - stores the raw VersionVector
 * for use with export operations.
 */
export interface VersionState {
	/** The VersionVector object from Loro */
	versionVector: VersionVector;
}

/**
 * Exports the full document as a snapshot.
 *
 * Snapshots contain the complete state and can be used
 * to initialize a new document.
 *
 * @param doc - The LoroDoc to export
 * @returns Snapshot bytes
 */
export function exportSnapshot(doc: LoroDoc): Uint8Array {
	return doc.export({ mode: "snapshot" });
}

/**
 * Exports a shallow snapshot of the document.
 *
 * Shallow snapshots contain only the current state without
 * historical operations. They're smaller but can't be used
 * for incremental sync (must use full updates).
 *
 * Used for fast cold start - client downloads snapshot,
 * then applies any ops newer than snapshot's version vector.
 *
 * @param doc - The LoroDoc to export
 * @returns Shallow snapshot bytes
 */
export function exportShallowSnapshot(doc: LoroDoc): Uint8Array {
	// Shallow snapshot requires frontiers - use oplogFrontiers for the full history cutoff
	return doc.export({ mode: "shallow-snapshot", frontiers: doc.oplogFrontiers() });
}

/**
 * Exports only the updates since a given version.
 *
 * Used for incremental sync - sends only changes since
 * the recipient's known version.
 *
 * @param doc - The LoroDoc to export from
 * @param since - VersionVector to export updates from (or undefined for all)
 * @returns Update bytes (may be empty if no changes)
 */
export function exportUpdates(doc: LoroDoc, since?: VersionVector): Uint8Array {
	if (since) {
		return doc.export({ mode: "update", from: since });
	}
	return doc.export({ mode: "update" });
}

/**
 * Exports updates since a given version, or falls back to snapshot
 * if the version is too old (not in local history).
 *
 * @param doc - The LoroDoc to export from
 * @param since - VersionVector to export updates from
 * @returns Object with either updates or snapshot
 */
export function exportUpdatesSafe(
	doc: LoroDoc,
	since?: VersionVector
): { type: "updates"; data: Uint8Array } | { type: "snapshot"; data: Uint8Array } {
	if (!since) {
		// No version provided, send snapshot
		return { type: "snapshot", data: exportSnapshot(doc) };
	}

	try {
		const updates = doc.export({ mode: "update", from: since });
		// If updates are very large (>100KB), consider sending snapshot instead
		if (updates.length > 100_000) {
			const snapshot = exportSnapshot(doc);
			// Only use snapshot if it's smaller
			if (snapshot.length < updates.length) {
				return { type: "snapshot", data: snapshot };
			}
		}
		return { type: "updates", data: updates };
	} catch {
		// If the version is too old, fall back to snapshot
		return { type: "snapshot", data: exportSnapshot(doc) };
	}
}

/**
 * Imports a snapshot or update into a document.
 *
 * @param doc - The LoroDoc to import into
 * @param data - Snapshot or update bytes
 */
export function importData(doc: LoroDoc, data: Uint8Array): void {
	doc.import(data);
}

/**
 * Imports multiple updates into a document.
 *
 * @param doc - The LoroDoc to import into
 * @param updates - Array of update bytes
 */
export function importUpdates(doc: LoroDoc, updates: Uint8Array[]): void {
	for (const update of updates) {
		doc.import(update);
	}
}

/**
 * Gets the current version of a document as an encoded byte array.
 *
 * The encoded version can be stored/transmitted and later decoded.
 *
 * @param doc - The LoroDoc
 * @returns Encoded version vector bytes
 */
export function getVersionEncoded(doc: LoroDoc): Uint8Array {
	return doc.version().encode();
}

/**
 * Gets the current version of a document as a VersionVector.
 *
 * Use this when you need to pass the version to export().
 *
 * @param doc - The LoroDoc
 * @returns VersionVector object
 */
export function getVersion(doc: LoroDoc): VersionVector {
	return doc.version();
}

/**
 * Gets the oplog version of a document.
 *
 * The oplog version represents all operations in the document's history,
 * including those that may have been undone or are in detached state.
 *
 * @param doc - The LoroDoc
 * @returns VersionVector object
 */
export function getOplogVersion(doc: LoroDoc): VersionVector {
	return doc.oplogVersion();
}

/**
 * Checks if a document has changes since a given version.
 *
 * @param doc - The LoroDoc to check
 * @param since - VersionVector to compare against
 * @returns true if there are changes
 */
export function hasChangesSince(doc: LoroDoc, since: VersionVector): boolean {
	const updates = doc.export({ mode: "update", from: since });
	// Empty updates have minimal size (just header)
	return updates.length > 10;
}

// Re-export LoroDoc and VersionVector for convenience
export { LoroDoc, type VersionVector } from "loro-crdt";
