---
name: freeze-tree-once-handed-to-review
description:
    Once a package is handed to review, stop committing and release the E2E port — even a
    strictly-better change is a moving target the reviewer pays for.
metadata:
    type: feedback
---

Once a package is handed back for independent review, **the tree is frozen from the implementer's
side** and the E2E port must be released. Do not commit again — not even an improvement — until the
reviewer reports. Good work found late belongs in a rev NN+1 after the report, not in the tree being
reviewed.

**Why:** in P28 I committed test hardening one minute after the reviewer was dispatched. Root
verified the content was a strict improvement and ruled it into the package, but the timing was the
problem: a reviewer cannot audit a moving target, every change invalidates the 3-run campaign at ~13
minutes each, and because `playwright.config.ts` pins `:3000` with `reuseExistingServer: false`, my
continued campaigns blocked the only campaign that would actually count. I was adding evidence
nobody could use while preventing the evidence that mattered.

**How to apply:** at handback — commit everything, release :3000, confirm the port is free in the
handback message, then stop. If you spot a defect afterwards, message the coordinator and let them
decide between a new revision and a follow-up package. Also: never state a cleanliness fact
("worktree removed, checkout clean") in evidence as though it were durable — it was true when typed
and false when it landed, and evidence is the one artifact a reviewer must be able to trust. Prefer
timestamped, checkable claims. See [[campaign-tree-drift-discipline]] and
[[e2e-port-3000-serializes-campaigns]].
