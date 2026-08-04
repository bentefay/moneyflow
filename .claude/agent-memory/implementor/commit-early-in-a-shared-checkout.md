---
name: commit-early-in-a-shared-checkout
description:
    With several agents on one checkout, uncommitted work is unsafe in both directions — commit each
    increment as soon as it is green.
metadata:
    type: feedback
---

When several agents share one git checkout, **commit each working increment the moment it is
green**. Do not leave a coherent change uncommitted while you move on to the next step.

**Why:** in P28 this bit in both directions within one session. My uncommitted rev 03 work in the
shared checkout blocked another package's reviewer from establishing a clean BASE — root asked three
times and eventually rescued it to a patch and a stash. It was then destroyed: `src`/`tests` snapped
back to HEAD mid-session and I recovered only because I had copied the file to `/tmp`. **The
`git checkout -- src tests` was the COORDINATOR's, not a peer agent's** — root said so explicitly
and corrected my initial misattribution to a concurrent package. That distinction matters: the
danger is not only peers editing the same files, it is that whoever is unblocking the tree may
discard your uncommitted work, and a coordinator has both the motive and the authority to do it.

**How to apply:** commit as soon as typecheck plus the relevant unit tests pass — do not wait for
the full six checks or the E2E campaign, which can take 15+ minutes and leave a dirty tree
throughout. Before any long-running step, check `git status --porcelain -- src tests` is empty. If a
coordinator reports your tree as dirty, verify with that command before acting: their view may
predate your commit, and re-applying a rescued patch on top of already-committed code would
duplicate the change. Prefer a worktree outside the repo for anything long-running — never
`.claude/worktrees/`, which ESLint walks and which produces hundreds of phantom errors. See
[[freeze-tree-once-handed-to-review]] and [[campaign-tree-drift-discipline]].
