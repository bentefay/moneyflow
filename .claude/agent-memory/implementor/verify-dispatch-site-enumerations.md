---
name: verify-dispatch-site-enumerations
description:
    Dispatches list the render/call sites to fix, and those lists can be incomplete; grep for the
    component or symbol yourself before designing
metadata:
    type: feedback
---

When a dispatch enumerates the sites to change ("fix `layout.tsx:218` and `:343`"), treat the list
as a starting point, not a boundary. Grep for the component or symbol across `src/` yourself before
designing, and raise any divergence with root instead of silently picking a scope.

**Why:** In P24/UR-003 the dispatch named two `PresenceAvatar` render sites; a grep found a third
(`TransactionRow.tsx`, rendering the avatar directly rather than via the group). The frozen
requirement said "every place presence avatars are rendered", so the dispatch's narrower list would
have shipped a fix that left one surface still showing the defect. Root's orientation notes are
curated from its own reading and have been corrected by workers repeatedly in this goal.

**How to apply:** After reading the dispatch and before writing code, run a grep for every component
and helper it names. If the count of call sites exceeds the enumerated list, report the divergence
to root with the cost of including it, state which reading you are implementing and why, and keep
working rather than blocking. Rule from the frozen text when the two disagree — that instruction is
explicit in these dispatches.

Related: [[e2e-catches-what-unit-tests-cannot]].
