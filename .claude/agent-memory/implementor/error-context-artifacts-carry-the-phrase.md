---
name: error-context-artifacts-carry-the-phrase
description:
    Playwright's own test-results/error-context.md embeds the recovery phrase, so the snapshot
    hazard applies to failure artifacts you never asked for, not only to manual snapshots
metadata:
    type: project
---

`test-results/**/error-context.md`, which Playwright writes automatically on any failure on an
unlock or creation page, contains a **page snapshot** — and that snapshot carries the recovery
phrase as the accessible value of the password-manager credential field, exactly as
`RISKS.md#R-SNAPSHOT-PHRASE-01` describes for a manual `playwright-cli snapshot`.

**Why:** The documented hazard is written against `playwright-cli snapshot`, so it reads as a
manual-browser-work concern. It is not. In P20B rev 12 a single E2E failure produced an
`error-context.md` whose snapshot held the phrase; a redaction regex expecting space-separated words
did not match, because the failure mode itself was the phrase arriving **space-stripped** as one
token. The vault was disposable, but the leak path is identical for any run.

**How to apply:** Before pasting, quoting or `bat`-ing any part of an error context from `identity`,
`passkey` or any unlock-page failure, assume it holds a phrase. Read it with a narrow `sed` range,
never dump the file, and describe the failing widget's state ("Word 1 invalid, 1 of 12 entered")
rather than reproducing values. Copy the artifact out of `test-results/` before re-running — the
next run wipes it — but copy it to `/tmp`, never inside the repo.

Related: [[a-path-is-not-a-location]], [[freeze-tree-once-handed-to-review]].
