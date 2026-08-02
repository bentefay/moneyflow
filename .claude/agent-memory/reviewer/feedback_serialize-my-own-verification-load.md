---
name: serialize-my-own-verification-load
description:
    Never run the unit suite while my own E2E campaign is in flight; the load produces a red E2E run
    that is my artifact, and it invalidates the campaign.
metadata:
    type: feedback
---

Run E2E campaigns with NOTHING else of mine running. Do not start `vitest` runs, builds, or a second
Playwright job while a campaign is in flight, even to "use the waiting time productively".

**Why:** In P27 rev 01 I started a 5-run E2E campaign, then ran two full `pnpm test` passes
concurrently to hunt for the implementer's unattributed red unit run. E2E run 1 came back
`1 failed | 169 passed` on `transactions.spec.ts:725`, a virtualization test whose assertion is an
`expect.poll` with a 10s budget — precisely the kind of latency assertion 117 concurrent vitest
files will break. The failure was almost certainly my own contention, but once the load is
uncontrolled I cannot prove that either way, so the whole campaign became uninterpretable and I had
to kill it and restart from run 1. Cost: a full campaign's wall-clock.

**How to apply:** Sequence the work. Static checks and unit runs FIRST, campaign LAST, manual
browser testing after the campaign. If I want N unit runs to reproduce a reported red run, do them
all before arming the campaign. Related: [[campaign-tree-drift-discipline]] — same discipline,
different axis: that one says the TREE must not change mid-campaign, this one says the LOAD must not
either.

**Cleanup trap this exposed.** Killing a campaign is not one `pkill`. The driver shell respawns
runs, and the Playwright CLI parent's cmdline is a RELATIVE path
(`node ./node_modules/.bin/../@playwright/test/cli.js`) so a `/tmp/mf-*` cmdline scan misses it
while matching its workers. Kill the driver script first, then find the CLI parent via
`ps -eo pid,ppid`, then the orphaned `next-server` holding :3000 — identify that one by
`readlink /proc/<pid>/cwd`, which is the only reliable way to tell mine from the human's, since both
show only `next-server (v16.2.11)`.
