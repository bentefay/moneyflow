# HANDOFF — two concurrent independent reviews

**Root error being corrected here.** `HANDOFF.md` is a single slot, and root ran two reviews at
once: the P33 rev 02 dispatch was written at `468e6e3` and **overwritten 17 minutes later** by the
P30 rev 07 dispatch at `068d1d7`. A reviewer re-reading `HANDOFF.md` mid-review would have found
another package's brief. Both are now preserved at stable paths and this file only routes.

| package | reviewer | subject | dispatch |
| --- | --- | --- | --- |
| **P21 rev 06** (control) | `p21-collector-06` — FINAL AUDIT | BASE re-derive at dispatch | `dispatches/P21-rev06-collect.md` |
| ~~**P30 rev 07** (UR-009)~~ | — | **PASSED**, merged | closed |
| ~~**P33 rev 03** (UR-012)~~ | — | **PASSED**, merged `05e16df` | closed |

**Read your own package's dispatch file, not this table.** Each carries its own BASE, scope,
press-hardest list, expected-not-findings and method note. The originals remain reachable at
`git show 468e6e3:…/HANDOFF.md` and `git show 068d1d7:…/HANDOFF.md`; the files above are byte-copies.

**Re-verify your subject's ancestry before reading a line of diff.** An ancestry check is valid only
for the instant it ran.

**Next after both verdicts:** root integrates P33 if it passes, then dispatches the P21 rev 06 final
audit — whose entry condition is that every feature package shows `passed`. That condition is
currently **NOT met**.
