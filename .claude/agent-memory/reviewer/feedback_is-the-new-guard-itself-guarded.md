---
name: is-the-new-guard-itself-guarded
description:
    When a revision fixes "nothing detects X being deleted" by adding a line, ask the same question
    of the line it added - the second fix usually inherits the defect.
metadata:
    type: feedback
---

A revision dispatched to fix two coupled findings - "this must not ship" and "nothing detects the
fix being deleted" - will typically guard the original line and leave its own new line unguarded.
Apply the revision's own stated principle to every line it added.

**Why:** P20B rev 10 fixed F-1 by adding `if (process.env.NODE_ENV === "production") return …` and
F-2 by adding unit guards plus a loud harness failure for the install line. Deleting the install
line turned two guards red; deleting the _gate_ line left typecheck, lint, format and all 2489 unit
tests green while the harness-only seam returned to the production bundle. E2E could not catch it
either - the suite runs against `pnpm run dev`, where the gate is inactive in both directions - so
the only possible instrument is a stubbed-environment unit test or a build-time grep. Failing a
revision for an unguarded install and passing it with an unguarded gate applies two standards to one
change.

**How to apply:** Prove the gap by mutation in a throwaway tree, not by inspection - delete the new
line and run every gate. Then, before prescribing a fix, prove the fix is _possible_: I ran a
throwaway `vi.stubEnv("NODE_ENV", "production")` probe to confirm the branch is reachable from
vitest at all, because a build-time-inlined constant would have made the recommendation
unimplementable. Recommending an infeasible remedy is worse than reporting the gap alone. See
[[mutation-probe-test-gaps]].
