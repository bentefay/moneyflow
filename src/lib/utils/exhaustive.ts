/**
 * Compile-time exhaustiveness guard.
 *
 * Typing the parameter as `never` makes an unhandled union member a compile error at the call
 * site; the throw only fires if a value reaches it from outside the type system — a decoded
 * payload, a widened cast, or a stale persisted record.
 *
 * `typescript-style.md` prescribes ts-pattern `.exhaustive()`, but ts-pattern is not a dependency
 * of this package. This is the single shared stand-in; do not re-declare it per module.
 *
 * @param value - The value the compiler proved unreachable
 * @param label - Domain noun for the error message, e.g. "field-rule action"
 */
export function assertNever(value: never, label = "value"): never {
    throw new Error(`Unexpected ${label}: ${JSON.stringify(value)}`);
}
