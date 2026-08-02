---
name: mutation-probe-must-match-claimed-site
description:
    When reproducing an implementer's mutation-probe claim, mutate the exact site they describe; a
    body stub vs a call-site stub give different failure counts and can fabricate a discrepancy.
metadata:
    type: feedback
---

When reproducing an implementer's "I mutated X and exactly N tests failed" claim, mutate the EXACT
site the evidence names. A body stub and a call-site stub are different mutations with different
blast radii, and using the wrong one manufactures a discrepancy that is yours, not theirs.

**Why:** In P25/UR-004 the evidence claimed "changed the product code to pass `undefined` instead of
`getBrowserTimeZone()` — exactly one test failed." I first stubbed the _body_ of
`getBrowserTimeZone` to `return undefined` and got TWO failures, which looked like the evidence was
wrong. Re-reading the sentence, its claim was about the _call site_ inside `detectDefaultCurrency`.
Reproducing that exact edit gave 1 failed / 119 passed — the evidence was accurate as written. Had I
reported the two-failure result as a finding, I would have failed a package over my own misreading.

**How to apply:** Before running a mutation probe, quote the evidence sentence and identify
precisely which line it edits. Function body, call site, and import are three different targets. If
your result disagrees with the claim, re-read the claim before writing it up as a discrepancy — the
extra failure may be a _stricter_ probe that proves additional coverage, which is worth noting as a
point in the tests' favour rather than as a defect. Record both probes in the review so the
reasoning is auditable.

Related: [[mutation-probe-test-gaps]], [[verify-dispatch-disclosure-claims]].
