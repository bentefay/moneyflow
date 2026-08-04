---
name: probe-control-flow-not-terminal-state
description:
    A probe recording only a barrier's terminal outcome cannot distinguish a no-op from a retry loop
    that recovered; record iteration count and elapsed ms, and count the code's branches before
    grading a two-case comment.
metadata:
    type: feedback
---

When instrumenting a helper to grade a claim about its behaviour, record **control flow** —
iteration count, elapsed ms, first-iteration state — not just the terminal outcome. A terminal
outcome of "succeeded" is produced identically by an immediate no-op and by a loop that spun for 280
ms and recovered, and those are different claims.

**Why:** P20B rev 12. The committed comment said "where no vault is mounted it resolves as a no-op."
`reviews/P20B-review-11.md` §6 had already measured the refuting data — seam absent at 4 of 12
entries at that exact line — but its probe recorded only presence and outcome, so absence looked
like a variant of "no-op" rather than the opposite of one. Adding `iterations` and `elapsedMs`
turned the same site into three visibly distinct cases: `persisted` 1 iteration / 1–2 ms,
`no-active-vault` 1 iteration / 4–5 ms, and **absent, 3–6 iterations, 110–283 ms**, resolving only
because the page had navigated off the `(app)` routes. The iteration count also pins the first
iteration deductively: an entry that would have returned at `iterations=1` but shows 3 must have
taken the failure branch first.

**How to apply:** two triggers.

1. Instrumenting anything with a retry loop, budget or early return — log the loop counter and
   elapsed time per entry. Cheap, and it is what converts "this happened" into "this cost 280 ms and
   nearly threw."
2. Grading a comment that offers **two** cases ("some have X … where no X …"), first count the
   branches the code actually has. A binary in prose over a three-branch function silently maps the
   third branch onto whichever of the two it least resembles. Enumerate the `return` sites, then ask
   which prose clause claims each one.

Note the fair-minded half: the narrow reading of such a clause is often true, and the evidence file
usually scopes it correctly by citing the exact outcome literal. Say so, give the one-clause fix,
and let root overrule cheaply — the finding is that the committed text dropped the scoping, not that
the implementer misunderstood the code.

Related: [[committed-artifact-outclaims-its-evidence]], [[predicates-inherit-unchecked]],
[[instrument-must-be-able-to-contain-the-defect]], [[print-before-asserting]].
