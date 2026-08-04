---
name: e2e-cannot-import-crdt-modules
description:
    Playwright specs cannot import @/lib/crdt/* — temporal-polyfill fails to resolve and the whole
    spec file is silently skipped with "No tests found"
metadata:
    type: project
---

E2E specs in `tests/e2e/` must NOT import from `@/lib/crdt/*` (or anything else reaching `@/types`).
`person.ts` -> `defaults.ts` -> `@/types` -> `temporal-polyfill`, whose `package.json` publishes
only an `import` condition, so Playwright's loader errors with
`No "exports" main defined in .../temporal-polyfill/package.json`.

**Why:** the failure mode is silent and dangerous — Playwright reports **"No tests found"** and
skips the ENTIRE spec file rather than failing an assertion. On a full-suite run this looks like a
reduced test count, not a red run, so a verification campaign can go green while a whole file never
executed. P24 review-01 advised importing `UNNAMED_MEMBER_LABEL` this way; I tried it in P27 and it
broke. Imports from `@/lib/crypto/*` DO work (`helpers/invite.ts`, `helpers/realtime.ts`) because
that path never reaches `@/types` — which is why the advice looked well-precedented.

**How to apply:** repeat the literal with a comment naming the constant it mirrors, as
`presence.spec.ts` does. Always check the absolute test count against the expected number before and
after touching E2E imports — that count is the only signal that catches this.

Related: [[verify-dispatch-site-enumerations]], [[dispatch-spec-citations-drift]].
