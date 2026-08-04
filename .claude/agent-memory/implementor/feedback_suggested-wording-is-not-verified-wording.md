---
name: suggested-wording-is-not-verified-wording
description:
    A reviewer's suggested replacement text is a sketch, not a verified artifact — check it against
    the reviewer's own measurement before adopting it verbatim.
metadata:
    type: feedback
---

When a review or dispatch hands you literal replacement text ("the reviewer's own suggested wording,
which you may adopt or improve"), grade that text against the measurement in the same document
before pasting it. The suggestion was written to demonstrate the fix, not to survive the next
review.

**Why:** in P20B rev 13 the finding was that a comment offered two cases where three were measured.
The reviewer's suggested replacement said the absent-seam branch "retries until it is [installed]" —
but that same review's own instrumented table showed **all three** absent entries terminated by the
_other_ exit, the off-`(app)`-route escape, and none by the seam appearing. Adopting it verbatim
would have swapped one incomplete clause for another, and the next reviewer measures the committed
text, not the provenance of its wording.

**How to apply:** read the cited source (here `tests/e2e/helpers/persistence.ts`) and enumerate
every way the described code path can terminate, then write a clause that covers all of them. Prefer
wording derivable from source over wording derivable from a run — a source-grounded clause needs no
citation and cannot decay when someone re-measures. Say in the evidence file that you deviated from
the suggestion and why, so the deviation reads as diligence rather than drift. Related:
[[verify-dispatch-site-enumerations]], [[dispatch-spec-citations-drift]].
