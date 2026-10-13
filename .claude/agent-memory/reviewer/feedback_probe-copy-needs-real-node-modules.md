---
name: probe-copy-needs-real-node-modules
description:
    A /tmp mutation-probe copy must cp -a node_modules and bypass pnpm; a symlinked node_modules
    makes pnpm try to purge the real one and Turbopack panic
metadata:
    type: feedback
---

For an E2E mutation probe outside the worktree, use `git archive <sha> | tar -x`, then `cp -a` the
worktree's node_modules (about 1.1G, fine on /tmp tmpfs). Change the copy's webServer command to
`./node_modules/.bin/next dev --port ${E2E_PORT}` and run `./node_modules/.bin/playwright`.

**Why:** with a symlinked node_modules, `pnpm exec` ran its deps check and tried to remove the
modules dir through the symlink, which would have hit the real worktree. It aborted only because
there was no TTY. Turbopack also panics because the symlink points outside the filesystem root.

**How to apply:** never put pnpm in the command path of a probe copy, and never symlink node_modules
into one. See [[mutation-probe-test-gaps]].
