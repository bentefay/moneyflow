---
name: ledger-carries-instructions-you-never-received
description:
    The goal's ledger can record a mid-revision correction addressed to you that never arrived; read
    git log on specs/** before finalising, not just at the start
metadata:
    type: feedback
---

Read `git log` over the goal's `specs/**` ledger before you finalise, not only when you derive BASE.
In P20B rev 10, four of root's docs commits landed between my `git rev-parse HEAD` and my first
commit, and one of them recorded that root "sent `p20b-implementer-10` a correction" relaxing a
requirement — **a message that never reached me**. I found it by reading `git log` after committing.

**Why:** the coordinator's ledger, not your inbox, is the authoritative record of what you were
told. An instruction recorded there but undelivered still shapes how your handback is graded, and a
reviewer reading both will see a discrepancy you never addressed. The same commits can also silently
change what a finding requires — the same entry re-derived a count "against root" and narrowed the
remedy.

**How to apply:** before writing evidence, `git log --oneline BASE..HEAD` and read any `PROGRESS.md`
/ review / dispatch diff that landed under you. If it names you or your revision, say so explicitly
in the evidence — state what reached you and what did not, rather than silently complying or
silently diverging. See [[dispatch-spec-citations-drift]] and [[claims-that-decay-silently]].
