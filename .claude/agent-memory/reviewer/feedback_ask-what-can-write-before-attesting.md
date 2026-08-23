---
name: ask-what-can-write-before-attesting
description:
    Before starting a verification chain, ask what automation can write to the tree — a scheduler
    voids an attestation silently and the orchestrator's "host is clear" does not cover it.
metadata:
    type: feedback
---

Before running a chain whose value is independence, ask explicitly: **what else can commit, edit, or
push to this tree while I run?** Get cron/scheduler/agent answers, not just "the host is clear".

**Why:** During the TG9 grid review the orchestrator cleared the host ("loadavg 0.27, nothing
scheduled") and I ran the five-command chain. A recurring cron job — every 13 minutes, standing
instruction _"if the tree is green and uncommitted, verify the gates yourself, commit and push"_ —
committed `672b771` mid-chain. `git status` was clean when I started and showed two modified test
files by the time E2E began; `HEAD^{tree}` differed before and after. Four of six results became
unattributable and I discarded them. The orchestrator's clearance was sincere and wrong, because a
scheduler is not something a human remembers to count as "scheduled".

**How to apply:** Capture `git rev-parse HEAD`, `HEAD^{tree}`, `git status --porcelain` and
`/proc/loadavg` immediately **before and after every command in the chain**, not just at the start —
that is what caught this, and per-command capture localises which results survive. When drift
happens, do not re-run blindly: compute `git diff <before> <after> --name-only` and ask which
results the delta can actually reach. Here it was two `tests/unit/` files that Playwright never
loads, so the E2E result was defensible for both trees — but an argument is not an attestation, so
re-run anyway and say plainly which is which.

Same-shaped root cause worth checking: an automated "verify gates, commit and push" job also
explains commits that carry undocumented changes and land before their own tests run. If such a job
exists, suspect it before suspecting carelessness. Relates to [[flake-rate-is-not-a-tree-property]]
and [[committed-artifact-outclaims-its-evidence]].
