---
name: reverify-my-own-manual-failures
description:
    A failure seen in my own manual browser probe may be my harness, not the product; re-run it many
    times and probe the primitive before reporting.
metadata:
    type: feedback
---

Never report a manually-observed browser failure on first sight. Re-run it in isolation, re-run it
10+ times, and probe the underlying primitive directly in-page before writing it up.

**Why:** During P28 rev 02 my first manual Playwright probe showed `th-TH` rendering `03/08/69`,
which looked like the Buddhist-calendar defect being unfixed. It was an artifact of my own scratch
spec leaving the cell in an unexpected state from earlier steps. Twelve consecutive clean re-runs
gave 12/12 correct, and an in-page probe confirmed Chromium honours `calendar: "gregory"`
(`pinned=03/08/26 cal=gregory` vs `unpinned=03/08/69 cal=buddhist`). Reporting it would have sent
the implementer to re-fix working code — the mirror image of missing a real defect, and just as
expensive.

**How to apply:** When a manual probe fails, before reporting: (1) rebuild the probe so each case
starts from a fixed seeded state with no dependence on earlier steps, (2) run it in a loop and count
the reproduction rate, (3) evaluate the underlying API inside the page to separate product defect
from harness defect. If it does not reproduce, do not report it — but do disclose the discarded
result in the review, because a reviewer's abandoned finding should be visible rather than quietly
dropped. Complements [[mutation-probe-must-match-claimed-site]]: both are cases where the defect
turned out to be in my instrument.
