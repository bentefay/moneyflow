---
name: e2e-port-3000-serializes-campaigns
description:
    A private worktree does not buy a parallel E2E campaign — playwright.config.ts pins port 3000
    with reuseExistingServer false, so concurrent packages serialize on one port
metadata:
    type: project
---

Creating your own `/tmp/mf-e2e-<pkg>` worktree is necessary but **not sufficient** to run E2E
alongside another package's campaign. `playwright.config.ts` hard-codes `baseURL` and
`webServer.url` to `http://localhost:3000` with `reuseExistingServer: false`, and the config is
off-limits to implementers. So exactly one campaign can run repo-wide at a time, no matter how many
worktrees exist.

**Why:** on P23 (UR-002) a dispatch correctly told me to make my own worktree to dodge the human's
:3001 dev server, but a concurrent P22 reviewer held :3000 for its whole multi-run campaign. The
first `playwright test` refused instantly with "http://localhost:3000 is already used" — before any
browser launched. Watching for the port to free is a trap: when the P22 Playwright CLI exited, a new
`next-server` from the same worktree took :3000 ~16s later. That was their _next run_, not the end
of their campaign. Grabbing the port in an inter-run gap would void their campaign, which is exactly
what the dispatch forbade.

**How to apply:** detect a _sustained_ free period (I used 6 consecutive 20s polls) rather than a
single free poll, and identify the holder from `ss -lptn 'sport = :3000'` plus process argv — see
[[verify-process-ownership-before-killing]]. If E2E is blocked, report the contention to the
coordinator and let them sequence the packages; do not edit the config, and do not race for the
port. Say plainly what the passing static gates do and do not cover, per
[[e2e-catches-what-unit-tests-cannot]].

**Never run the campaign with `CI=true`.** The config reads `workers: process.env.CI ? 1 : 4` and
`retries: process.env.CI ? 2 : 0`. `CI=true` yields 1 worker and 2 retries — the exact opposite of
the 4-worker `--retries=0` load profile that [[e2e-load-dependent-flake-validation]] requires, so it
would silently produce evidence that proves nothing. `CI=true` on the worktree `pnpm install` is
fine and unrelated.
