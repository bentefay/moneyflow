---
name: page-level-tests-need-a-timeout-ceiling
description:
    Unit tests that render a whole Next page pass alone but time out under full-suite load; set an
    explicit testTimeout rather than reading it as a flake
metadata:
    type: feedback
---

A Vitest test that mounts a whole app page (e.g. `TransactionsPage` over a faked CRDT context) costs
~2.3s in isolation but ~5.8s under a saturated `pnpm test` run, overrunning Vitest's 5s default. The
first symptom is misleading: the timed-out test's DOM is still mounted when the next test runs, so
the reported error is `Found multiple elements by: [data-testid=...]`, not a timeout.

**Why:** diagnosing from the second error leads to hunting a nonexistent cleanup bug — RTL
auto-cleanup is already active via `globals: true` in `vitest.config.ts`. The real fix is
`vi.setConfig({ testTimeout: 30_000 })` inside the `describe`.

**How to apply:** when a new page-level test passes alone and fails in the full suite, compare the
per-file duration in both modes before theorising. A budget ceiling is legitimate and does not join
the P21 flake class as long as every assertion still settles on its own condition via `waitFor` — no
sleeps, no polling, no retry-dependent outcome. See [[e2e-load-dependent-flake-validation]] for the
analogous E2E discipline, and [[e2e-catches-what-unit-tests-cannot]] for what this level of test
still cannot prove.
