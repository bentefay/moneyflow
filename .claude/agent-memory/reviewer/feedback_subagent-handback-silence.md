---
name: subagent-handback-silence
description:
    Verification and audit subagents here can end with no handback, and resuming them via
    SendMessage may stay silent too; run the gate commands directly instead of waiting
metadata:
    type: feedback
---

On 2026-10-11, during the grouped-rules phase 1 review, two general-purpose subagents ended "without
delivering a report through SubagentHandback". After a SendMessage resume, neither reported back in
more than 15 minutes. Running typecheck, lint, format, the unit suite and the E2E specs directly
took about 6 minutes.

**Why:** waiting on silent subagents spent more time than the checks themselves. The full unit suite
also timed out three tests in files the diff never touched, while load average was 36 on 16 cores
because another checkout under /home/ben/Code/moneyflow was running Playwright. Those files passed
when run alone.

**How to apply:** run the verification commands myself, in sequence, with output captured to /tmp.
Before reporting a timeout, check `uptime` and look for processes from other checkouts. Report the
red run as a failure regardless, and add the isolated re-run as context. Related:
[[serialize-my-own-verification-load]], [[flake-rate-is-not-a-tree-property]].
