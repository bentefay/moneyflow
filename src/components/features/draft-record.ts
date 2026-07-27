/**
 * Draft Record Insertion
 *
 * loro-mirror stamps every materialised map entry with a `$cid` container id, so the *read* type of
 * a `LoroMapRecord` requires `$cid` while the `*Input` type a caller constructs cannot supply one —
 * the mirror assigns it. Assigning an input directly is therefore a type error, which each table
 * previously silenced with its own `(draft.tags as any)[id] = data as TagInput`.
 *
 * This helper expresses the relationship once, so no call site needs `as` or `any`.
 */

/** Anything loro-mirror has materialised carries a container id. */
interface WithContainerId {
    $cid: string;
}

/** The shape a caller can actually construct: everything but the mirror-assigned `$cid`. */
type DraftInsert<Value extends WithContainerId> = Omit<Value, "$cid"> & { $cid?: string };

/**
 * Inserts a new entry into a loro-mirror draft record.
 *
 * @param record The draft map to write into, e.g. `draft.tags`.
 * @param id Key for the new entry.
 * @param value The entry, without a `$cid`.
 */
export function insertIntoDraftRecord<Value extends WithContainerId>(
    record: Record<string, Value>,
    id: string,
    value: DraftInsert<Value>
): void {
    Object.assign(record, { [id]: value });
}
