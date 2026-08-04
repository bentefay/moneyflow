---
name: predicates-inherit-unchecked
description:
    Agents re-derive inherited numbers but pass inherited "the only X" predicates through and re-tag
    them MEASURED; check predicates, not just figures.
metadata:
    type: feedback
---

When a dispatch or a prior review hands down both **figures** and **predicates**, re-derive the
predicates too. Figures invite arithmetic and get re-checked; predicates ("X is the only directory
whose log ends CAMPAIGN_COMPLETE", "no other caller does Y") read as settled and get copied forward,
often re-tagged **MEASURED** by the copier.

**Why:** P20B rev 08. The implementer re-derived every number it was given and caught one that was
wrong (115 `toHaveCount(0)` assertions carrying no timeout was really 113 — it amended its commit to
fix durable guidance). In the same section it repeated, verbatim from `P20B-review-07.md` §3.1, the
claim that `/tmp/p20b07-c2/` was "the only one of those four whose log ends `CAMPAIGN_COMPLETE`" —
and tagged it MEASURED. One `tail -1` over the four directories refuted it: `/tmp/p20b07-final/` is
also a complete ten-run campaign ending in that marker. It is superseded for a different reason
entirely (`head=6061ef7`, not the handback commit), which was already recorded two paragraphs below.
Three artifacts in that goal now carry the same false predicate.

**How to apply:** for each inherited claim, ask which shape it is. A predicate of the form "the only
/ none / never / always" is a universal over a set — enumerate the set and print the property for
every member, in the message where you assert it. Cost is usually one loop. Also check whether the
predicate is even the _discriminating_ one: here a completeness marker did not discriminate at all,
while the `head=` field recorded on every line did. Prefer the field that varies with the thing you
are actually selecting on. Related: [[feedback_absence-proof-by-grep]],
[[feedback_verify-dispatch-disclosure-claims]], [[feedback_changed-assertion-containment-test]].
