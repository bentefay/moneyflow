---
name: visible-count-is-not-a-mount-count
description:
    A doc's MEASURED section can misread a field's semantics in its own cited artifact; re-derive
    the number from the raw JSON before grading the mechanism built on it.
metadata:
    type: feedback
---

When an analysis cites an artifact, open the artifact and recount the quantity — the error is often
that the author read a _different field_ than the one they name, not that they lied.

**Why:** In the TG9 grid review, `BLANK-FRAME-ANALYSIS.md` stated under `## MEASURED` that "only
7-10 rows are mounted" and "the rendered window is positioned correctly". Its own cited file
(`/tmp/mf-blank-probe/C-geom.json`) records `rowGeometry` with **21** entries and
`visibleRowCount: 7`. The author read the viewport-intersection count as a mount count. In
`tests/perf/grid-sampler.ts` `rowGeometry` collects every `[data-index]` element while
`visibleRowCount` only counts rows passing a `rect.bottom <= viewport.top` test — two different
quantities, one of which was 3x the other. The whole downstream mechanism hypothesis rested on the
smaller one.

**How to apply:** For any doc claim of the form "N rows/items/events", find the field in the raw
artifact and recount. Then check the _coordinate space_ before concluding placement: here
`translateY` is content-space and `bands`/`masks` are page-space, and the mapping only closes once
you find the origin (mask bottom, 219). Validate the mapping against an independent recorded value —
the mounted window's end mapped to exactly the recorded band top of 610, which proved the transform
before any conclusion rested on it. My first attempt used the scroller top (182) instead and was off
by one row; the artifact's own `visibleRowCount` is what caught it.

Corollary: uniform-height arithmetic in a doc ("7 x 57 = 399px, agrees with 391px") is worth
recomputing whenever the artifact records more than one height class — here 57, 75 and 103 all
appear in the same 21 rows, so the agreement was coincidence between unrelated quantities offered as
an independent cross-check. Relates to [[committed-artifact-outclaims-its-evidence]] and
[[probe-control-flow-not-terminal-state]].
