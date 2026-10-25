---
name: temporal-global-type-is-not-runtime
description:
    TS 7 types a global `Temporal`, so a file using it without importing temporal-polyfill
    typechecks clean and then throws ReferenceError in vitest
metadata:
    type: feedback
---

A test file that references `Temporal.PlainDate.from(...)` without
`import { Temporal } from "temporal-polyfill"` passes `run tsc` (the TypeScript lib declares a
global `Temporal`) and then fails the whole file at load with
`ReferenceError: Temporal is not defined`, reported as "0 tests" for that file.

**Why:** a scripted insertion of subject fields into many test files added `Temporal` uses to one
file that had never imported it; tsc was green and only the vitest run caught it.

**How to apply:** after scripting edits that introduce `Temporal` into existing files, grep each
touched file for `from "temporal-polyfill"` rather than trusting a green typecheck. Related:
[[test-that-cannot-fail-proves-nothing]].
