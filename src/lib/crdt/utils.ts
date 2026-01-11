/**
 * CRDT Utilities
 *
 * Helper functions for working with loro-mirror CRDT structures.
 */

/**
 * Gets entries from a loro-mirror map record, filtering out the internal $cid field.
 *
 * Loro-mirror adds a $cid field to map records for CRDT tracking. This function
 * filters it out when iterating over record entries.
 *
 * @example
 * ```ts
 * const activeAccounts = getEntriesOfLoroMap(accounts)
 *   .filter(([, account]) => !account.deletedAt)
 *   .map(([id, account]) => ({ ...account, id }));
 * ```
 */
export function getEntriesOfLoroMap<T>(record: Record<string, T>): Array<[string, T]> {
	return Object.entries(record).filter(([key]) => key !== "$cid");
}
