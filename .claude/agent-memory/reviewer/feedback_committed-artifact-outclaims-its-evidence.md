---
name: committed-artifact-outclaims-its-evidence
description:
    An implementer's evidence can disclose a mixed measurement honestly while the comment it commits
    states the universal; diff the two rather than grading the evidence alone.
metadata:
    type: feedback
---

When a revision's evidence says a measurement was **mixed**, go read the sentence it actually
committed. In P20B rev 11 the evidence stated plainly that one barrier site measured `persisted` ×2
/ `no-active-vault` ×1 / absent ×1 — while the comment landing in `passkey.spec.ts` said "**Every**
caller arrives from a settings page whose vault is still mounted." The evidence was honest; the
artifact was not. Grading only the evidence passes it.

**Why:** the evidence file is uncommitted and read once, by root. The comment is what survives in
the repository and what the next author reasons from. A package can be failed twice for false
universals (P20B F-3, F10-2) and still commit a third, because reviewers check the document that
argues for the change rather than the text the change contains.

**How to apply:** for every claim-shaped comment a diff adds, ask what would falsify it, then find
whether the revision's own cited measurement already does. Quantifiers — "every", "all", "always",
"never" — are the trigger. If the evidence hedges and the code does not, that gap is the finding,
and it is worth saying explicitly that the discrepancy is over-claim, not concealment.

Related: [[predicates-inherit-unchecked]], [[mark-inference-as-inference]],
[[in-vault-predicate-is-load-dependent]].
