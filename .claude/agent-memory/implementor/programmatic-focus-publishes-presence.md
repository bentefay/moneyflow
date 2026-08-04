---
name: programmatic-focus-publishes-presence
description:
    Any programmatic .focus() inside a transaction row publishes HS-003 presence to peers unless
    explicitly suppressed, creating a false editing signal
metadata:
    type: project
---

In the transactions grid, calling `.focus()` on any cell input synchronously fires the delegated
`handleRowFocus` in `TransactionRow.tsx`, which reports field focus and publishes
`{transactionId, field, editing: true}` to every peer over the P05/HS-003 presence channel. A focus
the app performs on the user's behalf therefore tells collaborators someone is editing a row they
have never touched.

**Why:** presence answers "is a person working on this row", so it must describe a person, not a
render. UR-001 introduced the first programmatic caret placement in this codebase and shipped this
false signal; it was caught only by full-suite E2E with two identities against a live Supabase
realtime stack. All five static gates were green on the commit that shipped it.

**How to apply:** when adding any programmatic focus in a row cell, suppress the presence report for
that focus specifically. Do NOT report it as viewing-only instead — that is equally untrue AND it
leaves the session's published state already naming the row, so the user's first genuine focus is
deduplicated away by `isSamePresenceState` in `setState` and never reaches peers. Do not use
`stopPropagation` to achieve the suppression: it breaks the delegated listener that keeps cells free
of presence wiring, and real user gestures stop reporting.

Related: [[e2e-catches-what-unit-tests-cannot]]
