---
name: manual-dev-server-needs-jwt-secret
description:
    A hand-started `pnpm dev` for manual browser checks fails vault init unless SUPABASE_JWT_SECRET
    is exported; also check the assigned port is free first
metadata:
    type: feedback
---

A dev server started by hand for a manual browser check (not via Playwright's webServer) fails
identity creation with "Realtime authorization is unavailable" unless `SUPABASE_JWT_SECRET` is set.
`playwright.config.ts` derives it from the `supabase_realtime_moneyflow` container's `API_JWT_JWKS`
(the `oct` key, base64url-decoded) and injects it only into its own webServer.

Also, the port the lead assigns may already be held by another checkout's server (seen 2026-10-13:
`/tmp/mf-gate-wt` on 3109). Run `ss -ltnp | grep :<port>` and `readlink /proc/<pid>/cwd` first,
never kill it, tell the lead and pick a free port.

**Why:** the first manual run hung 15s on vault init, and the E2E run would have collided with a
foreign server on the "owned" port. **How to apply:** export the secret before
`pnpm run dev --port N`; verify port ownership before any server or E2E run. Related:
[[subagent-handback-silence]], [[reverify-my-own-manual-failures]].
