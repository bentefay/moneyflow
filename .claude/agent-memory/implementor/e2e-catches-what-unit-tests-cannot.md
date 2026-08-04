---
name: e2e-catches-what-unit-tests-cannot
description:
    Green typecheck/lint/format/unit/build is not evidence that collaborative or cross-tab behaviour
    is intact; only full-suite E2E exercises the real socket
metadata:
    type: feedback
---

Never report "five of six checks pass" as if the remaining E2E gate were a formality. In this repo
the unit suite has no coverage of the presence channel, sync, or any cross-identity behaviour over a
real socket.

**Why:** on P22 all five static gates were green on the exact commit that shipped a false
`editing: true` presence signal to peers. The defect was invisible until full-suite E2E ran two
identities against a live Supabase realtime stack. A green `pnpm test` says the pure logic is sound,
nothing more.

**How to apply:** when E2E is blocked or deferred, say explicitly what the passing gates do and do
not cover rather than implying near-completion. When a change touches focus, selection, presence,
sync or anything a second tab or second identity could observe, treat full-suite E2E as the only
gate that counts — and expect the unit suite to stay green while the behaviour is broken.

Related: [[programmatic-focus-publishes-presence]], [[next-dev-lock-blocks-e2e]]
