---
name: verify-dispatch-disclosure-claims
description:
    When a dispatch tells you to "confirm the evidence discloses X", verify X exists AND that the
    underlying defect exists; a phantom disclosure looks like an evidence gap.
metadata:
    type: feedback
---

When a dispatch instructs you to confirm that evidence discloses a specific self-caught error,
verify two separate things: that the disclosure text exists, and that the underlying defect exists
at all. Do not report a missing disclosure as an evidence gap without checking the second.

**Why:** In P22 rev 03 the dispatch required confirming the evidence disclosed "a self-caught
transposition of run 6/7 durations". No such disclosure existed — and no transposition existed
either: the committed table and the campaign output both read 232s/234s in the same order. Reporting
only "the disclosure is missing" would have manufactured a finding against accurate evidence. The
orchestrator had constructed the requirement from a misreading, which is exactly the failure mode
its own "root's framing is orientation, not authority" instruction anticipates.

**How to apply:** For every "confirm the evidence discloses X" criterion, grep for the disclosure,
then independently check the artifact the disclosure would be about. Three outcomes, three different
findings: disclosure present and defect real (PASS); disclosure absent but defect real (genuine
honesty gap); disclosure absent and defect absent (correct the dispatch, and say so explicitly so
the absence is not later misread as a gap). Relates to [[absence-proof-by-grep]] — a grep returning
nothing needs the same "could this result appear if the claim were false" test.
