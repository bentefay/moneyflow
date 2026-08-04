---
name: flake-rate-is-not-a-tree-property
description:
    Two 4-to-10-run campaigns on one byte-identical tree differed by a factor of two in
    failures/run, so no cross-campaign rate comparison establishes a fix or a regression.
metadata:
    type: feedback
---

Never let a failures-per-run number from one campaign be compared against one from another campaign
— different session, different machine load — as evidence that a change helped or hurt. Report the
per-run table and let the spread speak; if a rate comparison is the only evidence offered for an
improvement, say it supports nothing.

**Why:** In P20B rev 07 root ran 10 full-suite runs at `digest=0a6703e11a28` and measured **1.10**
failures/run. I ran 4 runs on the same commit, same `files=` hash, same
`--retries=0 --workers=4 env -u CI` invocation, and measured **2.25** — a factor of two on a
byte-identical tree. The pre-fix campaigns being compared against were 1.29 and 1.60, so the
between-campaign spread on one fixed tree was larger than the entire pre/post gap the comparison was
supposed to demonstrate. The implementer had already refused to claim the improvement; my number
turned that refusal from modesty into a measured fact.

**How to apply:** When a revision offers "the rate went from X to Y", ask whether X and Y came from
the same campaign session. If not, the comparison is uninterpretable and you can demonstrate that
cheaply by running your own campaign on the _same_ tree and showing your number differs from theirs.
That is a control, not a duplication of effort — it is the only way to size the noise floor. Also
record every fully green run you produce: three separate agents have now produced a 195/195 run on a
tree known to fail, which is why the bar is 10 runs and not 3. Related:
[[e2e-flake-needs-many-runs]], [[ab-on-one-renderer]].
