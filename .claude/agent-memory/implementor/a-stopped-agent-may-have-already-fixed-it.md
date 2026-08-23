---
name: a-stopped-agent-may-have-already-fixed-it
description:
    A handed-over "deterministic regression" did not reproduce because the stopped agent had landed
    the fix after the failure artifact was captured; compare source mtimes against the artifact
    timestamp first.
metadata:
    type: feedback
---

When you inherit a failing test from an agent that was stopped mid-task, **compare the mtimes of the
implicated source files against the timestamp of the preserved failure artifact** before you accept
"this reproduces deterministically". Run the failing test unmodified first, several times, and if it
passes, look at the clock rather than concluding the failure was flaky.

**Why:** taking over the T014a date-picker regression, the coordinator's brief stated it reproduced
deterministically in isolation and had read the suspect guard as "looks correct". It passed 3/3 for
me. `TransactionTable.tsx` had mtime 13:41:40 and a new unit test 13:42:10, both **after** the
artifact's 13:34:46 — the stopped agent's last act was to land the fix and write a test for it, then
stall. The coordinator had read post-fix code while quoting a pre-fix failure. The real breakage was
that the new test was red (a missing jsdom global, and an assertion that could not hold), so the fix
was correct but unverified and `pnpm test` was failing for an unrelated-looking reason.

**How to apply:** on any handover of a red test: (1) run it unmodified and count; (2)
`find <src> -newermt` against the artifact time; (3) read every untracked test file the stopped
agent left — it usually states the mechanism it was chasing. Then prove the landed fix is
load-bearing by mutating it away and showing the reported failure return byte-for-byte, rather than
assuming a green tree means someone else was wrong. Do not report the inherited premise as fact;
state what you measured and correct it. Related: [[revert-the-fix-to-grade-its-tests]],
[[mutate-both-directions-to-grade-a-guard]].
