---
name: rigour-proportional-to-authorisation
description:
    Before acting on an inference, ask what the conclusion authorises; cheap conclusions deserve
    cheap checks, destructive ones deserve proof.
metadata:
    type: feedback
---

The rigour an inference deserves is proportional to **what the conclusion authorises**, not to how
confident it feels.

**Why:** During P28 rev 03, root and I made the same misreading within an hour. Root saw a child
process exit and concluded I had died; I saw load 11.63 and suspected a competing campaign. Both
wrong, both from process artifacts. Mine authorised nothing — I would have re-run the suite either
way — so being wrong cost zero. Root's authorised spawning a replacement agent and deleting my live
working file. Same error class, wildly different cost, and the difference was never diligence. Root
adopted this goal-wide in place of "check `ps` first", which is narrower and less portable.

**How to apply:** Before acting on any inference, name the action it licenses. Re-running a check,
adding a probe, asking a question — proceed on a weak reading. Deleting a file, killing a process,
spawning an agent, failing a package, telling a user something is done — get proof first. This also
resolves whether to escalate: if the action is destructive and the evidence is a guess, escalate
rather than act. Note the related trap: evidence that POSTDATES a hypothesis and contradicts it must
kill the hypothesis, not be re-read as confirming it. See [[verify-dispatch-disclosure-claims]] and
[[reverify-my-own-manual-failures]].
