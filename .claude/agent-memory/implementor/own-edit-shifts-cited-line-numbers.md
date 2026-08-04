---
name: own-edit-shifts-cited-line-numbers
description:
    Line numbers you grepped before your edit are stale after it; re-derive every `file:line`
    citation from the committed tree, and say which tree the numbers belong to
metadata:
    type: feedback
---

Re-derive every `file:line` citation **after** your edit lands, from the committed tree, and state
in the artifact which tree the numbers belong to when a review or dispatch uses different ones.

**Why:** In P20B rev 12 the entire change was a comment that grew from 2 lines to 6. I had grepped
the four call sites of `unlockWithPasskey()` _before_ editing and wrote `:149 :173 :216 :260` into
my evidence; at the committed tree they are `:153 :177 :220 :264`, and the barrier I described as
`passkey.spec.ts:79` had moved to `:83`. Nothing in typecheck, lint, format or the E2E campaign can
catch this — a citation is not compiled. A reviewer checking my evidence against the tree would have
found four wrong pointers in a revision whose entire finding was "the artifact claims more than the
measurement supports".

**How to apply:** Any `file:line` you gathered before your own edit is suspect, even for a
comment-only change — an added line shifts everything below it. Re-grep at the end, and where the
dispatch or review numbers the same site differently, give both explicitly ("`:153`, which is `:149`
in review-11's numbering") rather than silently picking one. The failure log from a run on your own
tree is a trustworthy source of line numbers; a grep from before the edit is not.

Related: [[re-derive-figures-before-freezing-them-in-guidance]], [[dispatch-spec-citations-drift]],
[[a-path-is-not-a-location]].
