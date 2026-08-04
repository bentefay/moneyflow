---
name: never-grep-away-test-failure-detail
description:
    Always tee full test output to a log; piping a suite run through grep for summary lines discards
    the one failure you then cannot attribute
metadata:
    type: feedback
---

Never pipe a full-suite test run through `grep`/`tail` for summary lines only. Redirect the whole
output to a log file first, then grep the file.

**Why:** in P27 I ran `pnpm test 2>&1 | grep -E "Test Files|Tests "` and it reported
`1 failed | 2194 passed`. The failing test's NAME had been discarded by the grep. Four subsequent
runs were green and three deliberate reproduction attempts under heavier load all passed, so I could
never attribute it. The evidence had to carry an unattributed red run and an explicitly-labelled
inference instead of a fact — which is exactly the kind of gap a reviewer is right to press on.

**How to apply:** `pnpm test > /tmp/run.log 2>&1; tail -20 /tmp/run.log`. Applies to every gate that
can fail intermittently — unit, E2E, lint. The cost of a log file is nothing; the cost of an
uncapturable failure is a weakened evidence package. And when a run does go red, report it with the
attempts to reproduce rather than only the green re-runs.

Related: [[wall-clock-ratio-unit-test-flake]], [[e2e-catches-what-unit-tests-cannot]].
