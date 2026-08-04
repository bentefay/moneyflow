---
name: test-that-cannot-fail-proves-nothing
description:
    Two shapes of green test that discharge the obligation to check without checking - the
    self-comparison tautology and the silently-skipped spec
metadata:
    type: feedback
---

A green test that **cannot fail** is worse than no test: it discharges the obligation to check
without doing the checking, and it looks like coverage to every later reader. Two shapes seen in
this repo:

**1. The self-comparison tautology.** Asserting `f(x)` equals `f(x)` to "prove" two call sites
agree. It passes for every implementation of the site you meant to test, because that site is never
invoked. If the claim is "the button and the load path agree", the test must **click the button** —
render the component and drive it, don't recompute the expected value with the same function.
Tell-tale: it goes green on the first run, before you have made the fix.

**2. The silently-skipped spec.** An unresolved import makes a whole file report "0 test" / "No
tests found" rather than failing (`Q-P27-01`). This bites hardest when proving tests fail at BASE:
"the file errored" is NOT per-assertion evidence. Rebind the new-module imports to the BASE
implementations they replace, so each assertion runs against old code and fails by name — P29 got
13-of-20 named failures that way, where the naive run proved nothing.

**Why:** both occurred in P29. The tautology I caught only because it went green immediately; the
silent skip only because I checked the absolute test count.

**How to apply:** After writing a test, ask "what implementation would make this fail?" If the
answer is "none", or if the run reports fewer tests than you wrote, the test is decorative. Always
watch the absolute count, not just the pass/fail line. See [[e2e-cannot-import-crdt-modules]] and
[[never-grep-away-test-failure-detail]].
