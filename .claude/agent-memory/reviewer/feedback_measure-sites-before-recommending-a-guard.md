---
name: measure-sites-before-recommending-a-guard
description:
    A finding that recommends ADDING a guard at sites you classified by reading must measure those
    sites first - the remedy can break what the gap only documents.
metadata:
    type: feedback
---

When a finding is "these N call sites were missed, add the guard there", measure the runtime state
at each site before writing the fix line. Classification by reading the surrounding test is an
inference, and the remedy is not symmetric with the gap: a missing guard usually costs nothing
observable, while a guard added where its precondition does not hold converts a passing test into a
hard failure.

**Why:** In P20B rev 10 I read eight raw E2E teardowns as "fires with a vault mounted" and was ready
to recommend barriering all eight. Instrumenting the helper and probing each site measured only four
as in-vault; two had the provider mounted with no active vault, and two sampled with the seam absent
entirely. `awaitVaultPersistence` throws after 15 s when the seam is absent on an app route, so
barriering those four would have hung and failed tests that pass today - and the implementer had
named exactly that failure mode as what would have changed its mind. My inference was directionally
right about the gap and wrong about the remedy.

**How to apply:** Split the finding in two. The gap ("the enumeration is incomplete, and the
evidence claims otherwise") stands on the reading. The remedy ("add the guard here") needs a
measurement per site, and where the measurement is negative or ambiguous, say so explicitly and tell
root NOT to apply the fix there. A single sample that shows a component absent is also not proof of
absence - right after a navigation it is indistinguishable from a pre-hydration transient, which is
what the retry branch exists for; do not count it in either direction. See
[[sample-a-transient-from-document-start]] and [[print-before-asserting]].
