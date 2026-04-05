/**
 * CRDT Utilities
 *
 * Helper functions for working with loro-mirror CRDT structures.
 */

/**
 * Base type for loro-mirror entity with CRDT tracking field.
 * All loro-mirror entities include a $cid field.
 */
export type WithCid<T> = T & { readonly $cid: string };

/**
 * Gets entries from a loro-mirror map record, filtering out the internal $cid key.
 *
 * Loro-mirror adds a $cid key to map records at runtime for CRDT tracking.
 * This function filters it out when iterating over record entries.
 *
 * The type parameter T should be the entity type (e.g., Person, Account).
 * The function properly narrows the return type to exclude the string $cid value.
 *
 * @example
 * ```ts
 * const activeAccounts = getEntriesOfLoroMap(accounts)
 *   .filter(([, account]) => !account.deletedAt)
 *   .map(([id, account]) => ({ ...account, id }));
 * ```
 */
export function getEntriesOfLoroMap<T extends object>(
    record: Record<string, T | string>
): Array<[string, T]> {
    return Object.entries(record).filter(
        (entry): entry is [string, T] => entry[0] !== "$cid" && typeof entry[1] === "object"
    );
}

/**
 * Gets entries from a loro-mirror map record with primitive values (numbers, booleans).
 *
 * Use this for LoroMapRecord of primitive types like `schema.LoroMapRecord(schema.Number())`.
 * For object types, use `getEntriesOfLoroMap` instead.
 */
export function getEntriesOfLoroPrimitiveMap<T extends number | boolean>(
    record: Record<string, T | string>
): Array<[string, T]> {
    return Object.entries(record).filter(
        (entry): entry is [string, T] => entry[0] !== "$cid"
    ) as Array<[string, T]>;
}
