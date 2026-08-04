---
name: mutate-both-directions-to-grade-a-guard
description:
    When adding a test to guard a one-line gate, mutate by DELETION and by INVERSION; deletion alone
    leaves the complementary case unproven
metadata:
    type: feedback
---

A guard test for a predicate must be graded against both mutations of that predicate: delete the
line, and invert its comparison. Deleting the gate proves only that the guard notices its absence.

**Why:** P20B rev 11 added a guard for
`if (process.env.NODE_ENV === "production") return () => undefined;`. Deletion turned exactly one
new test red — the production case. Inverting `===` to `!==` turned **seven** red, and the only test
that distinguishes an inverted gate from a correct one is the complementary case ("installs outside
a production build"), which the deletion experiment never exercises. A reviewer asked for the
deletion proof; the inversion is what shows the pair of cases is not redundant.

**How to apply:** when the remedy is "add a test so nothing can silently delete X", write both
directions of X's condition and run three or four mutations, logging each to a file you can cite:
present → red-on-delete → restored → red-on-invert → restored. Do it in a throwaway worktree, never
in the shared checkout, and re-verify the source md5 against the shared copy at the end. Cite the
log path, not just the terminal output — see [[a-path-is-not-a-location]].

Related: [[test-that-cannot-fail-proves-nothing]],
[[heuristic-must-vary-along-the-axis-it-branches-on]]
