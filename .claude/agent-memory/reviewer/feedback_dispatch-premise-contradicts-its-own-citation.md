---
name: dispatch-premise-contradicts-its-own-citation
description:
    A dispatch can state as established a premise the artifact it cites explicitly declines to
    claim; check premises against the citation, not just the numbers.
metadata:
    type: feedback
---

When a dispatch hands me a framing plus an artifact to "re-derive rather than trust", re-derive the
**premises** as well as the figures. Read the cited artifact's own hedges.

**Why:** In the P21 lost-write scope adjudication the dispatch asserted "a write acknowledged in the
UI — with the sync indicator reading `Saved` — is not durable". The diagnostic it cited says the
opposite in §4: 350/350 samples ~2 ms after the barrier read `Saving...` and were already durable —
"Not observed, and I would not claim it." The dispatch also said
`SyncManager.awaitLocalPersistence()` "is surfaced to neither the UI nor tests"; one grep found it
called from `vault-provider.tsx:49,232` and from three test files. Both claims were plausible,
directionally sympathetic to the conclusion, and wrong. I re-derived every headline number and would
have shipped both premises unexamined.

**How to apply:** Numbers get re-derived because they look re-derivable. Prose premises slip
through. For each load-bearing sentence in the dispatch, locate the sentence in the artifact that
supports it, and check whether the artifact hedges, disclaims or measures the opposite. A one-line
grep settles most existence claims. State the correction even when the verdict is unchanged — the
record is what the next agent implements from. Related: [[predicates-inherit-unchecked]],
[[verify-dispatch-disclosure-claims]], [[causal-claims-in-measured-voice]].
