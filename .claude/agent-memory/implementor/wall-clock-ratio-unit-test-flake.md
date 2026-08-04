---
name: wall-clock-ratio-unit-test-flake
description:
    A pnpm test failure in duplicates.test.ts is usually CPU contention, not a defect — it asserts
    wall-clock timing ratios
metadata:
    type: project
---

`tests/unit/import/duplicates.test.ts` ("scales linearly with input size") asserts
`expect(ratio1).toBeLessThan(4)` on ratios of `performance.now()` deltas. It is the one known
load-sensitive unit test in the suite, is pre-existing, and is untouched by any current package.

**Why:** the smallest batch (`size: 100`) runs in a fraction of a millisecond, so under CPU
contention — a concurrent E2E campaign holding ~24 chrome processes, load 16+ on 32 cores — the
noise floor swamps the baseline and inflates the ratio past the threshold. Observed on 2026-08-01:
`pnpm test` reported 3 failed on main during a busy window, then `2117 passed` clean on the _same
tree_ minutes later.

**How to apply:** before treating any `pnpm test` failure as a defect, check whether it is this
test. If it is, re-run in a quiet window rather than debugging it or "fixing" it — and never let it
restart a validation campaign. More generally, do not run static gates concurrently with someone
else's E2E campaign; see [[e2e-port-3000-serializes-campaigns]] for why only one campaign runs at a
time anyway. Related: [[e2e-load-dependent-flake-validation]].
