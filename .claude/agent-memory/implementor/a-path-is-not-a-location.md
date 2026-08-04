---
name: a-path-is-not-a-location
description:
    When worktrees are in play, a filename or line number is meaningless without naming the tree -
    and a surviving line is not a surviving defect
metadata:
    type: feedback
---

With multiple worktrees live, **a path is not a location until you say which tree.** The same
filename exists in `main` and in every worktree with different content, so `grep`, a line number, or
"the table is missing" are all claims about a tree you did not name.

Two failure shapes, both hit in P29 within one package:

- **Wrong tree, right file.** A coordinator grepped `main` for a fix committed in `/tmp/mf-p29` and
  twice concluded the work was absent — once for the fix, once for an evidence table.
  `implementation-01.md` was 483 lines in one tree and 636 in the other.
- **Right tree, wrong inference.** Grepping for the OLD expression (`entry.rate > best.rate`) found
  it still present and looked like proof the defect survived. It had survived — but `bestColumn` no
  longer decided the amount role; `bestAmountColumn` did. **A surviving line is not a surviving
  defect. Grep for the thing that now makes the decision, or read the construct.**

- **Right tree, right line, wrong ORACLE.** A probe asserted the fixed code should produce
  `{0:date, 1:description}`; it produced `{0:date, 1:description, 2:balance}` and looked red. The
  code was correct — column 2 legitimately holds the `balance` role — and the _assertion_ encoded a
  half-remembered expectation that never matched the requirement or the pre-package baseline. **A
  red test is a claim about your oracle as much as about the code.**

Same root cause as inferring process liveness from a child PID or a socket: a strong conclusion from
a weak artifact. Both directions occur — concluding an agent is dead from a dead child, and
concluding a campaign is live from a straggler PID that had already exited.

**The single practice that catches all of these: PRINT THE VALUE BEFORE ASSERTING WHAT IT SHOULD
BE.** In P29 this prevented four separate manufactured findings against correct work. When a check
disagrees with your expectation, dump the actual output and compare it to the _specification_ — or
to a known-good baseline tree — not to what you remember.

**How to apply:** Quote the tree with every path you report (`/tmp/mf-p29/src/...`, not `src/...`),
and prefix verification commands with `cd "$(git rev-parse --show-toplevel)"` so the tree is
explicit. When someone reports something you cannot see, ask for the path before concluding absence
— and when you report, give paths up front, especially for artifacts written OUTSIDE the worktree
(campaign logs in `/tmp/` are invisible to a search inside it). See
[[feedback_worktree-edit-path-trap]] and [[verify-process-ownership-before-killing]].
