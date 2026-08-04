---
name: worktree-edit-path-trap
description:
    In a worktree session, Edit/Write with a /home/ben-agents/Code/moneyflow/... path silently
    writes to the SHARED main checkout, not the worktree
metadata:
    type: feedback
---

After `EnterWorktree`, Bash resolves to the worktree but **Edit/Write do not rewrite absolute
paths**. An absolute path under the repo root — `/home/ben-agents/Code/moneyflow/src/...` — lands in
the SHARED main checkout that other agents are using. Always target
`/home/ben-agents/Code/moneyflow/.claude/worktrees/<name>/src/...`, and confirm the prefix before
the first edit of a session.

**Why:** I hit this on P29. Every product edit I made went into shared `main` while
`pnpm exec vitest` in the worktree reported "Failed to resolve import" for a file I had just created
— the import error was the only symptom, and it reads like a path-alias problem, not a wrong-tree
problem. Concurrent agents were working that checkout, so those edits were live in someone else's
tree.

**How to apply:** In a worktree session, before editing, run `git rev-parse --show-toplevel` in Bash
and use exactly that prefix for every Edit/Write. If a test cannot see a file you just wrote, check
`git status` in BOTH trees before debugging the resolver. Recovery is clean:
`git diff <files> > /tmp/x.patch` in main, `git apply` in the worktree, copy untracked files across,
then `git checkout --` and `rm` in main — verify main's `git status` is back to only other agents'
entries. See [[never-mutate-shared-checkout]].
