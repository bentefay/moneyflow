---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Style

## Type Safety

- **Never use `as` or `any`.** When unavoidable, isolate in a small helper function with a type
  guard. Always iterate on a type-safe approach first.
- **Model types richly.** Use discriminated unions, branded tiny types (`TinyType<Value, Tag>`), and
  `as const` literals. Types are natural extension points — add them early.
- **Leverage the type system fully.** Mapped types, conditional types, `satisfies`, generic
  constraints. If the compiler can catch it, it should.
- **Validate at boundaries with Zod.** Derive types via `z.infer<typeof Schema>`. Use `safeParse()`,
  not `parse()`.
- **Exhaustive matching.** Use `ts-pattern` `.exhaustive()` — never leave unhandled cases.

## Domain Modelling

- **Make illegal states unrepresentable.** Use discriminated unions so invalid combinations are
  compile errors, not runtime bugs.
- **Branded tiny types for domain identifiers.** `SessionId`, `CallId`, `ErrorId` — never pass a raw
  `string` where a domain concept exists.
- **Name types after the domain, not the shape.** `AppointmentStatus`, not `StringEnum`. Types are
  documentation.
- **Types are extension points — add them early.** A union with one case today is trivial to extend
  tomorrow; a raw string is not.
- **Separate domain types from serialisation.** Zod schemas handle the wire format; domain types
  model the business rules. Don't let one dictate the other.

## Immutability & Purity

- **Favour immutable data.** `as const`, `readonly`, const arrays. Create new values rather than
  mutating.
- **Favour pure functions.** Side-effect-free utilities that transform and return. See
  `cli/lib/collections/` for canonical examples.
- **No global mutable state.** Module-level values must be read-only after initialisation (unless
  absolutely necessary).
- **Contain unsafe work.** When mutation or type coercion is needed for performance or interop,
  isolate it in a small helper function with a clean, typed interface.

## Patterns

- **Result types for errors.** `Result<T, E>` with `Ok`/`Err` discriminated union — not thrown
  exceptions for expected failures.
- **Type guards with `is` predicates.** `isNotNull`, `isDefined`, `isOk` — prefer narrowing over
  casting.
- **Null checks via loose equality.** `x == null` / `x != null` (catches both `null` and
  `undefined`).
- **`import type` for type-only imports.** Keep runtime and type imports separate.
- **Named exports.** Prefer over default exports.
