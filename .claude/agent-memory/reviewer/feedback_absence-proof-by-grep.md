---
name: absence-proof-by-grep
description:
    A grep proving a thing is ABSENT from an old tree is invalid if the search string was introduced
    by a later rename; enumerate instead.
metadata:
    type: feedback
---

Never accept — or write — a claim of the form "commit X contains no coverage of Y" when the
supporting evidence is a grep for a string that a LATER commit introduced. A grep for a post-rename
identifier cannot establish absence of the thing that was renamed; it establishes absence of the new
name only. Enumerate the actual entities instead (`grep -n 'test('`, list the symbols, diff the
counts).

**Why:** In P23 rev 01 the coordinator greped `5027787` for a restructured `test.step()` title that
only came into existence in a later commit, got 0 hits, and concluded the tree had no UR-002 E2E
coverage at all. That tree in fact carried the coverage in an earlier standalone form — 6 tests
versus 5 at HEAD. The false mechanism was then written into immutable evidence by the implementer,
who had verified the dispatch's other claims but not that one. The decision it supported happened to
be correct, which is exactly what makes this class of error survive review.

**How to apply:** Whenever a verification command returns a NEGATIVE result that supports the
conclusion someone wants, ask "could this command have returned this same result if the claim were
false?" If yes, the command is not evidence. This generalises past grep: it is the same defect as a
monitor whose filter only matches success, or a captured `${PIPESTATUS[0]}` clobbered by an
intervening `echo` (which I did to myself in the same review, and disclosed rather than claiming
exit codes I never observed). Verification instrumentation deserves the same scrutiny as product
assertions. See [[e2e-flake-needs-many-runs]] and [[ab-on-one-renderer]] for the same
verify-the-verifier discipline applied to test runs.
