---
name: ordering-fix-serves-two-callers
description:
    A candidate-precedence fix must be re-censused for EVERY form the code serves, not just the one
    the defect was reported against.
metadata:
    type: feedback
---

When a proposed fix changes the ORDER of candidates in a parser, re-run the census for every display
form the parser serves — not only the form the defect was reported against.

**Why:** In P28 rev 03 I applied `p28-reviewer-02`'s proposed fix verbatim (editing skeleton first)
and measured the editing round-trip going 66 failures to 0. On that evidence I told root the
implementer's "necessary but not sufficient" claim was wrong. It was not. `parseLocaleDate` serves
TWO forms — the compact resting display and the editing form — and ordering privileges one at the
other's expense: the same fix introduced 24 silent-wrong COMPACT cases (mt-MT `"8/3/26"` ->
2026-03-08). The implementer's round-trip verification was the only design getting both right. I had
to correct myself to root mid-review.

**How to apply:** Before asserting "N failures to 0" for any precedence change, enumerate the
callers/forms the changed function serves and census each. If a fix's whole mechanism is "try X
before Y", it cannot be sufficient when X and Y are both legitimate inputs. Ordering moves a defect;
only a discriminator removes it. Relates to [[replacement-heuristic-regression-sweep]] and
[[probe-real-module-across-inputs]].
