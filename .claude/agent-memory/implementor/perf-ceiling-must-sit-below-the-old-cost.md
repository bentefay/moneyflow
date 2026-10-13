---
name: perf-ceiling-must-sit-below-the-old-cost
description:
    A dispatched cost ceiling can sit above what the pre-change code cost at the test's fixture
    size, so it guards nothing; revert the fast path and confirm the ceiling fails.
metadata:
    type: feedback
---

A cost-regression test only earns its place if it fails when the optimisation is reverted. The rule
engine perf round (2026-10-13) was dispatched with "count under 40 ms" and "single-row apply within
3x a plain write". At the 5k-row fixture the pre-index count took 16-22 ms, so 40 ms passed it. The
pre-index walk measured 3.4-3.9x, so 3x caught it only narrowly under load.

**Why:** dispatch numbers come from the largest benchmark, here 20k rows, where the old cost is
huge. The test runs a smaller fixture where the old cost is modest, so a "generous" ceiling quietly
covers the regression.

**How to apply:** for each ceiling, revert or mutate the fast path and run the perf test. If it
still passes, tighten the ceiling to sit between the healthy and reverted medians. Measure under the
current load, and report the change as a deviation. Interleave samples for ratio ceilings so load
hits both sides. See [[mutate-both-directions-to-grade-a-guard]] and
[[test-that-cannot-fail-proves-nothing]].
