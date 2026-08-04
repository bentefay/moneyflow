---
name: snapshot-leaks-recovery-phrase
description:
    A bare playwright-cli snapshot on /new-user prints the recovery phrase in cleartext, because the
    password-manager credential field carries it as its accessible value while the display shows
    bullets.
metadata:
    type: feedback
---

During the mandated manual checkpoint, `pnpm exec playwright-cli -s=<s> snapshot` on `/new-user`
after clicking "Generate Recovery Phrase" prints all twelve words in cleartext — as the accessible
value of the hidden `textbox "Recovery phrase"` that exists so password managers can capture it. The
visible grid still renders `•••••` and you never clicked "Click to reveal", so the constraint reads
as satisfied while the phrase is already in the transcript.

**Why:** the credential field is deliberate product behaviour (HS-019), so this is a
reviewer-workflow hazard, not a product defect — but the dispatch constraint "never reveal the
recovery phrase" is violated by a command that looks purely observational.

**How to apply:** on `/new-user` after generation, never take an unfiltered `snapshot`. Pipe it
through a filter for the refs you need (`grep -iE "checkbox|Continue"`), or use `find`. Account
creation does not require revealing: generate, `check` the confirmation checkbox, click "Create
Account". Treat any vault created this way as disposable and finish with `close`, `delete-data` and
`rm -rf .playwright-cli`.

**The 12-word scan false-positives, so a hit needs disambiguating rather than escalating.** The
landing page `/` markets the recovery-phrase feature, so its own `term`/`definition` prose matches a
12-word-lowercase-run grep and mentions "recovery"/"phrase" repeatedly. Disambiguate **without
echoing the field**: census the snapshot's roles
(`grep -oE '^[[:space:]]*- [a-z]+' | sort | uniq -c`) — a real leak requires a `textbox`, and a file
with zero `textbox` roles has no credential field at all — then check which URL was snapshotted and
whether any vault was ever created in that context. Report the match and the three-way
disambiguation; never quote the line to prove it was innocent.

Related: [[committed-artifact-outclaims-its-evidence]].
