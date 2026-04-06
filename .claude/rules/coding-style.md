---
description: General coding style principles that apply across all languages
paths:
    - "**/*"
---

# General Coding Style

## Reuse & Simplicity

- Before writing new code, search for existing patterns to reuse or extend
- Extract reusable patterns early — future agent sessions benefit from discoverable abstractions
- Never duplicate code unless there is a very good reason
- Don't add features, configurability, or error handling beyond what's needed for the current task

## Naming

- Descriptive, domain-specific names: `headlinePrice` not `hp`, `AppointmentStatus` not `StringEnum`
- Don't abbreviate unless the binding fits on a single line
- Comments explain WHY, not WHAT

## Domain Modelling

- Make illegal states unrepresentable through the type system
- Tiny types / branded types for domain identifiers — never pass raw strings where a domain concept
  exists
- Separate domain types from serialisation concerns
- Types are extension points — a union with one case today is trivial to extend tomorrow

## Immutability & Purity

- Favour immutable data and pure functions
- Contain mutation and side effects in small, well-typed helpers

## Error Handling

- Typed error values (`Result`, custom error types) for expected failures — not exceptions
- Exceptions are fine for bugs, but never for business logic control flow
- Validate at system boundaries (user input, external APIs), trust internal code

## Consistency

- Match the conventions of the file and module you're working in
