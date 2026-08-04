---
name: finish-the-code-before-the-campaign
description:
    A comment-only commit under tests/e2e moves the campaign digest and forces a full restart; do
    every polish pass before launching validation
metadata:
    type: feedback
---

Land every edit you intend to make — including comment wording and test polish — **before** starting
a validation campaign. In P20B rev 10 I ran a 70-repeat probe campaign plus three full suites, then
committed a comment-only change to `tests/e2e/helpers/persistence.ts` and had to discard and re-run
all of it: ~25 minutes.

**Why:** the campaign digest is over file contents, not behaviour. A comment cannot change a test
outcome, but the digest column that makes the campaign auditable will differ from HEAD, and
"comment-only, therefore inert" is an inference a reviewer is entitled to reject. Evidence for a
tree you no longer have is worth nothing.

**How to apply:** before the first campaign run, do a deliberate freeze pass — re-read every comment
you wrote for accuracy, run the cheap gates, commit, then compute the digest and start. If something
must change after that, restart from run 1 and say in the evidence that the earlier campaign was
discarded and why. See [[freeze-tree-once-handed-to-review]] and [[campaign-tree-drift-discipline]].
