---
name: port-override-fakes-multicontext-break
description:
    E2E port is now set by MONEYFLOW_E2E_PORT through one base-url helper; a multi-context failure
    on a non-3000 port means a spec bypassed that helper, not a product break
metadata:
    type: project
---

As of 2026-10-11 the E2E origin comes from `tests/e2e/helpers/base-url.ts` (`E2E_PORT`,
`E2E_BASE_URL`, read from `MONEYFLOW_E2E_PORT`, default 3000). `playwright.config.ts` and every
`browser.newContext({ baseURL: E2E_BASE_URL })` use it, so a full suite on an isolated port such as
`:3108` is legitimate. Orchestrators now ask for exactly that.

Before that helper existed, seven specs pinned `http://localhost:3000` inside `newContext` and a run
on `:3100` failed ~15 multi-identity tests with
`net::ERR_CONNECTION_REFUSED at http://localhost:3000/new-user`, which read like a total product
break.

**Why:** the tell is still the _set_ of failures. If every failure is a multi-identity or
shared-vault test and every single-page test passes, suspect a spec that hardcodes the origin before
suspecting your change.

**How to apply:** if that pattern reappears, run `grep -rn 'localhost:3000' tests/e2e` to find a
spec that bypasses the helper. Related: [[e2e-port-3000-serializes-campaigns]],
[[port-discipline-is-cpu-discipline]],
[[unresolvable-fixture-mimics-broken-product]].
