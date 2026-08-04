---
name: repeat-each-is-per-test-not-total
description:
    Playwright --repeat-each multiplies each selected test, so N arms at --repeat-each=N gives N
    runs per arm, not N runs total
metadata:
    type: feedback
---

`--repeat-each=N` with a `-g` selecting K arms runs **N of each arm**, K×N tests total. I sized a
campaign at `--repeat-each=35` across two arms expecting 70 runs per arm and got 35 — half the
sample the dispatch asked for, discovered only when tallying the log.

**Why:** dispatches state the bar per arm ("a sample size comparable to the 70-run arms"), and the
`K x N` total in the Playwright banner looks like it satisfies that. It does not.

**How to apply:** set `--repeat-each` to the **per-arm** figure you were asked for, and tally the
finished log per arm (`awk` on the verdict tag) before quoting any rate. Q26 arms are cheap — 210
runs finished in 5.6 minutes at `--workers=4` — so re-running at the correct size costs almost
nothing next to reporting an undersized one. Related: [[one-green-run-proves-nothing]],
[[re-derive-figures-before-freezing-them-in-guidance]].
