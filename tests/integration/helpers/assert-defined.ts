/**
 * Shared assertion helper for integration tests.
 *
 * Replaces `!` on values loaded from IndexedDB or the server. A non-null assertion turns a missing
 * value into an opaque `TypeError: Cannot read properties of undefined`, which says nothing about
 * which load returned nothing; this throws a named failure at the point of the missing value.
 */

export function assertDefined<T>(value: T | null | undefined, description: string): T {
    if (value == null) {
        throw new Error(`Expected ${description} to be defined, got ${String(value)}`);
    }
    return value;
}
