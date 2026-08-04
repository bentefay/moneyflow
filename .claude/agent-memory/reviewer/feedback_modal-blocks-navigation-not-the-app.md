---
name: modal-blocks-navigation-not-the-app
description:
    A CLI navigation timing out at 60s while curl fetches the same route in 121ms means a modal owns
    the tab, not that the app is broken.
metadata:
    type: feedback
---

`playwright-cli goto` failing with
`TimeoutError: Timeout 60000ms exceeded ... waiting until "domcontentloaded"` is a claim about the
tab's state, not the route's health. In P20B rev 09 two consecutive gotos died that way while `curl`
returned the same route in **121 ms** and the dev-server log showed `GET /transactions 200`. The
cause was a `beforeunload` dialog raised by the app's own unsaved-changes guard; the CLI surfaced it
only when I tried `eval` and got `Tool "browser_evaluate" does not handle the modal state`.
`dialog-accept` cleared it instantly.

**Why:** a blocked navigation and a dead route produce the same red, and the modal is invisible in
the goto output. Reporting it would have impersonated a serious product defect in a review whose
whole subject is teardown behaviour. It also cuts the other way — the dialog was _correct product
behaviour_ and became the session's most valuable measurement, confirming an INFERRED line in a
ruling that had been flagged "Not measured".

**How to apply:** when a CLI navigation times out, before writing anything down: (1) `curl` the
route and read the server log — if the server answered in milliseconds the fault is in the tab; (2)
run `eval` or `snapshot`, which report modal state explicitly; (3) check for a dialog before
checking for a hang. Extends [[reverify-my-own-manual-failures]]; the same lesson as
[[unresolvable-fixture-mimics-broken-product]], one layer up in the harness.
