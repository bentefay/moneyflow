---
name: failure-grep-matches-test-names
description:
    A broad failure grep over Playwright logs matches server noise and tests whose NAMES contain
    "failed"; count Playwright's own markers instead.
metadata:
    type: feedback
---

Never judge a Playwright campaign by grepping the log for `failed|Error|✘|timed out`. Count
Playwright's own summary markers per run instead: `✘` lines, `^ *N failed`, `^ *N flaky`, `retry #`.

**Why:** In the P28 rev 03 campaign my broad sweep matched 38-39 lines per run on three runs that
were all 177/177 clean. Every match was either `[WebServer]` noise the suite provokes deliberately
(`tRPC failed on realtime.revoke: Request authentication failed`) or a test whose NAME contains the
word — `onboarding-vault.spec.ts:63` "failed registration leaves no signing session" and
`undo-redo.spec.ts:311` "a failed offline undo push retries". A pattern broad enough to catch every
failure mode also catches tests ABOUT failure. Root's own monitors use the same grep shape, so this
would have produced a plausible-looking failure signal on a clean campaign.

**How to apply:** For a verdict, use the marker counts plus the final `N passed` summary. Keep the
broad grep only for live Monitor streams where over-matching is cheap and silence is the real risk —
but re-count against markers before reporting anything from it. Relates to
[[rigour-proportional-to-authorisation]]: a monitor alert authorises a look, a review finding
authorises a FAIL.
