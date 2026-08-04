---
name: roundtrip-discriminator-blind-spot
description:
    A "prefer the candidate that round-trips" fix is blind exactly where its discriminating feature
    is constant; construct that input class.
metadata:
    type: feedback
---

When reviewing any fix of the form "among candidates that parse, prefer the one whose re-rendering
reproduces the input", identify what the round trip is KEYING ON, then construct the input class
where that key is constant. That class is where the fix is still broken.

**Why:** P28 rev 03 discriminated two date parses by re-rendering each and matching the typed
string. It keys on zero-PADDING (`numeric` vs `2-digit` skeletons). For dates where day and month
are both in 10..12, padding is a no-op, both interpretations re-render identically, and `find`
silently takes the first — the wrong one. 18 silent-wrong cases survived the fix. A census built
from arbitrary dates never surfaces it; I only found it by deliberately constructing the class.

**How to apply:** Ask "what feature makes the two candidates distinguishable?" then build inputs
where that feature is absent or identical across candidates. For padding, use two-digit values; for
separators, use values where separators coincide; for range checks, use values inside every range.
Also check whether the residual class is reachable in the real runtime before grading severity —
here it was Node-ICU-only and unreachable under Chromium, which made it MEDIUM rather than HIGH. See
[[node-icu-is-not-browser-icu]].
