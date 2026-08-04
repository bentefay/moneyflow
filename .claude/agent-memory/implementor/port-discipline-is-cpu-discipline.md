---
name: port-discipline-is-cpu-discipline
description:
    Staying off :3000 is not enough - a local vitest run at 32 workers can redden another agent's
    Playwright campaign, so hold ALL heavy runs while someone else campaigns
metadata:
    type: feedback
---

Being sequenced off `:3000` is a **port** rule. There is a second, unstated **CPU** rule: while
another agent is running its E2E campaign, hold every heavy local run too — `pnpm test`,
`pnpm build`, anything at 32 workers. Vitest does not touch the port and still ruins the campaign.

**Why:** a red run under contention is the **worst available outcome**, because it is unprovable in
either direction — it cannot be trusted as a failure or dismissed as a flake, so the whole campaign
is discarded and re-run. Three packages paid that cost in one goal. This repo has three separately
identified load-sensitive assertions (a wall-clock ratio, a 10s E2E budget, a mocked-rAF frame
test), so the contention is not hypothetical.

I broke this in P29 without breaking any stated rule: I ran `pnpm test` in my worktree while
`p30-implementer-01` was spinning up its campaign, driving load to 10.19. Entirely within the letter
of "stay off :3000", and exactly the thing that reddens someone else's suite.

**How to apply:** before starting any heavy run, check whether another agent is campaigning
(`/proc/<pid>/cmdline` for playwright, plus load average). If so, wait. When your own turn comes,
**run all non-E2E checks to completion FIRST, then launch the campaign** — never let your vitest
compete with your own Playwright. Ask the coordinator if unsure; a redundant question is far cheaper
than a discarded campaign. See [[e2e-port-3000-serializes-campaigns]] and
[[wall-clock-ratio-unit-test-flake]].
