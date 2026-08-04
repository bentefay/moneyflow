---
name: next-dev-lock-blocks-e2e
description:
    Next 16's dev lock is project-directory-scoped, so any running `next dev` in this repo blocks
    `pnpm test:e2e` entirely, even on a free port
metadata:
    type: project
---

`pnpm test:e2e` cannot run while ANY `next dev` is running in the same project directory, even when
the E2E target port (3000) is free and the other server is on a different port.

**Why:** `node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js` acquires the lock at
`path.join(distDir, 'lock')` (i.e. `.next/dev/lock`), keyed on the project's distDir. The port is
only recorded in the lock payload for the error message, not part of the key. Playwright's
`webServer` uses `reuseExistingServer: false`, so it always tries to start its own server and hits
the lock. Failure is fast (~7s) with `⨯ Another next dev server is already running.`

**How to apply:** If E2E won't start with that error, do NOT kill the other server, edit
`.next/dev/lock`, or change `playwright.config.ts` / `next.config` — the dev server may be the
human's own live session, and the config files are out of an implementor's scope. Report the exact
error text to the orchestrator and let them arrange isolation (e.g. a git worktree with its own
project dir). Check `cat .next/dev/lock` for the holding PID and `ss -ltn` for what's listening.

**MEASURED 2026-08-03:** the failure is ~3s, and the error itself prints the holder's PID, port and
`Dir:`. A `git worktree` + `cp .env.local` + `pnpm install` (never `cp -a node_modules`) runs the
**repo's own `playwright.config.ts` on :3000** unchanged, so isolation costs no config edit and no
port override — which matters, since a custom port breaks the specs pinning
`baseURL: "http://localhost:3000"`. Verify the worktree's tree digest equals the shared checkout's
before trusting the campaign. See [[port-override-fakes-multicontext-break]].

Related: [[verify-process-ownership-before-killing]]
