---
name: check-for-a-perf-capture-not-just-a-port
description:
    Port and dev-server checks do not detect a running frame-timing capture; I ran the full unit
    suite during another agent's arm-A measurement and contaminated the one arm whose contamination
    flatters the port
metadata:
    type: feedback
---

Before running **anything** CPU-heavy, check for a running measurement campaign, not only for a port
conflict: `cat /proc/loadavg` and `pgrep -af "tests/perf|PERF_ARM"`.

**Why:** I checked port 3000 and for a `next dev` holding this repo's `.next` — the two things that
had burned me before — and launched `pnpm build` plus the full 32-thread unit suite into another
agent's in-flight arm-A perf capture (started 12:19:45; my runs 12:22–12:28; load average 9.14).
That capture's thresholds are ≥59 presented fps and p95 presented-frame interval ≤17ms, which is
precisely what CPU contention destroys. A perf capture binds a port that is deliberately _neither_
3000 nor 3200, so no port check can see it.

The asymmetry is what makes it serious: contention on the **before** arm makes production look
artificially slow and therefore **flatters the port being measured**. A quietly contaminated
baseline is the one result that can make a whole comparison wrong in the direction nobody questions.

**How to apply:** add the load-and-perf-process check to the gate ritual alongside the port check,
and treat "another agent is measuring" as a hard block on typecheck/build/test/E2E, not just on E2E.
If it has already happened, report the overlap window immediately with timestamps so the other agent
can judge which routes fall inside it — an owned-up contaminated arm can be re-captured, a hidden
one cannot. Related: [[port-discipline-is-cpu-discipline]], [[campaign-tree-drift-discipline]],
[[port-listener-wins]].
