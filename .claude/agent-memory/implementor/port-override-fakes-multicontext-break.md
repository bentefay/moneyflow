---
name: port-override-fakes-multicontext-break
description:
    E2E specs hardcode baseURL localhost:3000 in browser.newContext, so a campaign on another port
    fails exactly the multi-context tests and looks like a total product break
metadata:
    type: project
---

Seven `tests/e2e` specs create their own contexts with
`browser.newContext({ baseURL: "http://localhost:3000" })` — `invite-redemption`, `presence`,
`realtime-recovery`, `realtime-security`, `transactions`, `undo-redo`, `vault-settings` — and
`tab-duplication.spec.ts` calls `goto("http://localhost:3000/...")` outright. That port is hardcoded
and **no config override reaches it.** Run the full suite on `:3100` and you get ~15 failures, all
`net::ERR_CONNECTION_REFUSED at http://localhost:3000/new-user`, landing in `helpers/auth.ts`
`createNewIdentity` — which reads exactly like a total product break, not a config artifact.

**Why:** the tell is the _set_ of failures, not their text. If every failure is a multi-identity or
shared-vault test and every single-page test passes, suspect your own port before your change.
Confirm with `grep -rln 'newContext({ *baseURL: "http://localhost:3000"' tests/e2e` — plain
`grep -rn newContext` over-reports, since `onboarding-vault` and `date-locale` use `newContext`
without pinning the port and survive a port change.

**How to apply:** a single-page spec (`people-settlement.spec.ts`) campaigns fine on `:3100`. A
**full-suite** run must be on `:3000` with the repo's own `playwright.config.ts` — so plan for
`:3000` to be free before you promise a whole-suite result. Related:
[[e2e-port-3000-serializes-campaigns]], [[port-discipline-is-cpu-discipline]],
[[unresolvable-fixture-mimics-broken-product]].
