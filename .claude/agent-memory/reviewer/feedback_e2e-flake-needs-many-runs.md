---
name: e2e-flake-needs-many-runs
description:
    Three green full-suite runs do not establish a green E2E tree; a 1-in-6 flake passes a 3-run
    campaign about half the time.
metadata:
    type: feedback
---

Do not accept "PASS 3/3" as evidence that the E2E suite is green, and do not run only 3 yourself
when the package touches a shared test synchronisation primitive. Run 6+ full-suite `--retries=0`
runs with a per-run digest.

**Why:** In P22 rev 02 the implementer and the rev 01 reviewer each ran 3 consecutive full-suite
runs and each got 166/166. My 6 runs on the identical digest got 5 green and 1 red — a genuine
1-in-6 load-dependent flake in the package's own `newlyAddedRow` helper. Nobody was acting in bad
faith; a 3-run campaign simply has roughly even odds of missing a 1-in-6 flake. Saying so explicitly
in the review keeps the finding factual rather than accusatory.

**How to apply:** Size the campaign to the claim being made. Weight suspicion toward changes that
introduce or modify a _shared_ E2E helper — one marginal synchronisation point there is inherited by
every test that calls it, and the second-order failures (a later `element was detached from the DOM`
timeout) look unrelated until you trace them back through the helper. Related:
[[ab-on-one-renderer]].
