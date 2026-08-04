---
name: verify-process-ownership-before-killing
description:
    Stopping to ask before killing a process you didn't start is right, but identify it from
    evidence — don't infer ownership from the task list
metadata:
    type: feedback
---

Never kill a process another session might own. But when reporting it, identify it from hard
evidence, not from what you assume is running: check the process's own argv, its log file, and the
task list's actual current state.

**Why:** On P22 I found a `next dev` on :3001 with live browser sockets and reported it as another
agent's P21 manual-testing session. Every part of that was wrong — it was the team-lead's server,
started at the human's request; the attached Chrome was the HUMAN'S REAL BROWSER (argv showed
`--type=utility --utility-sub-type=network.mojom.NetworkService`, with no `--headless`, no
`--remote-debugging-port`, no playwright `--user-data-dir`); and the P21 task I blamed had been
voided and only survived in a stale task list. The lead confirmed stopping to ask was exactly right
and the instinct stands — only the identification was off. I also proposed "wait for it to exit",
which would have blocked forever.

**A scan over `/proc` matches ITSELF, exactly as `pgrep -f` does.** Reading every process's
`cmdline` necessarily includes the reader's own, so a `/proc` loop feels immune — it reads
structured data rather than shelling out — and is not. In P29 my own sweep reported a live process
of mine that turned out to be the sweep's subshell.

**The one-token fix: match on `argv[1]` only**, e.g.
`tr '\0' '\n' < /proc/$p/cmdline | sed -n '2p'`. A shell invoked as `zsh -c '<script>'` has `-c` at
`argv[1]` and the script body at `argv[2]`, so the pattern can never match the searching shell no
matter what the script text contains. Also exclude `$$` and re-check any hit with
`[ -d /proc/<pid> ]` before reporting it — a pid that has already exited was never a finding.

**How to apply:** Before naming an owner: run `ps -o pid,lstart,cmd -p <pid>` and read the full
argv; a Playwright-driven chromium has `--headless` / `--remote-debugging-port` / `--user-data-dir`,
a human's browser does not. Check the process's log path. Treat the task list as possibly stale — a
listed in_progress task may have been stopped. If you cannot positively identify the owner, say so
plainly rather than guessing, and never offer "wait indefinitely" as an option without a mechanism
that can actually end the wait.

Related: [[next-dev-lock-blocks-e2e]]
