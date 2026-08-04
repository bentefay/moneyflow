---
name: dispatch-spec-citations-drift
description:
    A dispatch's frozen-text file+line citation can point at the wrong requirement entirely; the
    package contract and requirement task are the authoritative source pointers.
metadata:
    type: feedback
---

Never rule from the `spec.md` path and line range quoted in a dispatch without first checking the
`## ` heading at those lines. Cross-check against the package contract (`tasks/P<NN>-<req>.md`) and
the requirement task (`tasks/<req>.md`), which both carry a `Source:` pointer — those are
authoritative and the dispatch prose is not.

**Why:** On P25/UR-004 the dispatch cited `specs/010-user-reported-refinements-2/spec.md` lines
40-54. That file contains no UR-004 at all — its headings are UR-005 through UR-008, and lines 40-54
are UR-007, a completely different requirement about locale date formatting. The real source was
`specs/009-user-reported-refinements/spec.md` lines 76-98. Following the citation literally would
have produced the wrong feature. Spec directories are numbered sequentially and requirement IDs
restart, so an off-by-one in the directory number silently lands on a plausible-looking heading.

**How to apply:** First action on any requirement dispatch: `grep -n "^## " <cited-spec>` and
confirm the requirement ID is actually present. If it is not, find the real one and report the
divergence to root in evidence rather than quietly substituting it. Root explicitly asks for its
claims to be checked. See [[verify-dispatch-site-enumerations]] for the same failure mode applied to
enumerated code sites.
