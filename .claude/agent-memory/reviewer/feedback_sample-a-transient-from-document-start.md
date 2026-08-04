---
name: sample-a-transient-from-document-start
description:
    A sampler installed after page.goto returns cannot contain a pre-hydration transient and
    produces a false absence; install it with addInitScript before any page script runs.
metadata:
    type: feedback
---

To measure whether a claimed pre-hydration/pre-render transient exists, install the sampler with
`page.addInitScript` so it starts before the page's own scripts, and read the collected array after
load. Do not poll from the Playwright side after `page.goto(...)` resolves.

**Why:** In P20B rev 07 I tested rev 06's claim that the People page briefly renders a
`no-qualifying-transactions` state before hydration. My first probe polled `page.evaluate` in a loop
after `goto(..., {waitUntil:"commit"})` and collected **exactly one sample**, at 47 ms, with the
final state already present — it reported "transient does not exist", which would have been a false
negative published as a measurement. Re-done with `addInitScript` installing a 10 ms sampler, seven
throttled cold navigations collected 41–54 samples each and found the transient in 1 of 7, **≤10 ms
wide against a 4.97 s load**. Both the existence and the width mattered: the failures under
investigation held their state for 15,000 ms, so a 10 ms window refuted the diagnosis, whereas
"never observed" would have been an overclaim I could not defend.

**How to apply:** Before reporting that a transient is absent, ask the standing question — could
this instrument have contained the event? A sampler that starts after the thing it samples for is
already over cannot. Pair `addInitScript` with CDP `Emulation.setCPUThrottlingRate` to widen the
window deterministically, run it 5+ times, and report the _width_ rather than a bare present/absent,
because width is what decides whether the transient can explain the failure. Related:
[[reverify-my-own-manual-failures]], [[mutation-probe-test-gaps]].
