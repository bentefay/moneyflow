---
name: grid-has-two-different-counts
description:
    The transaction grid needs two distinct counts - the virtualizer gets the progressively-loaded
    window, matchingRowCount gets the cursor's full count - and using one for both silently kills
    either progressive loading or select-all
metadata:
    type: project
---

The transaction grid must be fed **two different counts**, and wanting one number for both is the
bug:

- **Virtualizer `count` = the windowed count**, i.e. today's `min(matching, displayCount)` at
  `PAGE_SIZE` 50. Progressive loading is a goal requirement, and the perf harness's preload
  assertion depends on it: reaching row 9,999 takes exactly 200 steps and 33–43s, measured. Feed the
  virtualizer the cursor's full count and progressive loading silently disappears — the whole 10,000
  becomes addressable at once and the preload assertion stops firing. It would present as a harness
  problem and actually be a product regression.
- **`matchingRowCount` on the v9 table = the cursor's FULL, unwindowed count**
  (`createTransactionCursor(...).count`). Every selection count and the header tri-state derive from
  it, and it is the entire reason select-all covers rows that are neither rendered nor paged in —
  UR-011, covered by `select-all-beyond-page.test.tsx`.

**Why:** the two numbers answer different questions — "how many rows can the user scroll to right
now" versus "how many rows does the current filter match". They coincide only in small fixtures,
which is exactly why a test over a few dozen rows cannot tell them apart.

**How to apply:** when wiring or reviewing the grid, check these two call sites separately and
assert them with a fixture where the numbers differ (matching ≫ loaded). A single-count
implementation passes every small-fixture test. Related: [[derived-values-arrive-with-the-write]],
[[instrument-must-be-able-to-contain-the-defect]].
