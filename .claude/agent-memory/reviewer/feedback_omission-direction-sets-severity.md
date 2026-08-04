---
name: omission-direction-sets-severity
description:
    An incomplete enumeration in a comment is real but not automatically a finding; which direction
    the omission errs — overstating or understating the hazard — decides finding vs flag.
metadata:
    type: feedback
---

When a comment enumerates cases and I find one it omits, the omission is a fact, but its severity is
not. Ask **which way a misled reader errs**. If the unnamed case is a _safety_ property (bounded
retry, loud failure), the reader over-estimates patience and under-estimates nothing — flag it. If
the unnamed case is a _hazard_, they act on a false sense of safety — find it.

Two further tests before escalating: does the omission survive the harm model the original finding
was written to prevent, and did the reviewer who set the fix criteria treat completeness as part of
them? In P20B rev 13 the suggested wording in the _prior review_ named one exit and also omitted the
throw, which showed exit-completeness was never a fix condition.

**Why:** the >90% rule is about whether an issue is real _and worth acting on_. A true observation
reported at the wrong severity costs a revision cycle over a comment, and reads as rigour while
being churn. Root asked the completeness question directly, so answering "yes, a third exit exists"
was mandatory — but answering it as a finding would have been wrong.

**How to apply:** state the omission plainly with its source citation, give the minimal wording that
would close it, then say explicitly whether you recommend reopening. Put it under a **Flag**
heading, not **Findings**, and show the direction-of-error reasoning so root can overrule on the
merits.

Related: [[measure-sites-before-recommending-a-guard]],
[[committed-artifact-outclaims-its-evidence]], [[probe-control-flow-not-terminal-state]].
