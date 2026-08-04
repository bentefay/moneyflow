---
name: re-derive-figures-before-freezing-them-in-guidance
description:
    A count relayed through a dispatch and a review can be wrong; re-run the command before writing
    it into .claude/ guidance, where it outlives the document that carried it
metadata:
    type: feedback
---

Before writing any number into durable guidance (`.claude/skills/*`, `.claude/rules/*`, a code
comment stating a fact about the repo), re-run the command that produces it — even when a dispatch
and an independent review both assert the same figure.

**Why:** In P20B rev 08 the dispatch and `reviews/P20B-review-07.md` §6 F-C both stated that "115
`toHaveCount(0)` absence assertions carry no explicit timeout", and I was copying that sentence into
`.claude/skills/e2e/SKILL.md`. `grep -rn 'toHaveCount(0)' tests/e2e/ | wc -l` is indeed 115, but
`grep -rn 'toHaveCount(0,'` finds **two** that do carry one, so the count carrying none is 113. Two
agents had already propagated the conflated figure. It changed no severity and no argument — which
is exactly why nothing would ever have caught it. A review file is archived and read as history; a
SKILL file is read as fact by every future agent, so an error there has a much longer half-life.

**How to apply:** When a finding hands you a figure to document, separate "is this number right"
from "is this finding right" — the finding can be correct while its supporting count is loose
shorthand. Re-derive it, and if it differs, write the corrected figure into the guidance and record
the discrepancy in your evidence rather than silently using either number. Check whether the
original grep conflates "occurrences of X" with "occurrences of X lacking Y"; that is the shape the
error takes.

Related: [[verify-dispatch-site-enumerations]], [[dispatch-spec-citations-drift]],
[[claims-that-decay-silently]].
