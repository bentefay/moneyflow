---
name: autoreset-needs-a-render-then-a-flush
description:
    TanStack v9 autoReset* only schedules when something reads the row model and lands
    asynchronously, so a synchronous assertion after setOptions passes identically with the reset on
    or off
metadata:
    type: feedback
---

To test any TanStack Table v9 `autoReset*` option, the test must (1) read the row model after
changing `data`, and (2) await a macrotask — in that order. Asserting straight after `setOptions`
observes the pre-reset value.

**Why:** `table_autoResetCellSelection` is invoked from the core row model's after-update hook, so
it is not even queued until something _reads_ the row model (in the product, the render). It then
goes through `table._reactivity.schedule(...)`, so it does not land synchronously once queued.
Measured on a `constructTable` + `storeReactivityBindings` harness, a data change gave selected-cell
counts of 2 → 2 (after `setOptions`) → 2 (after a forced `getRowModel()`) → 0 (after a
`setTimeout(0)`).

I wrote two tests asserting that `autoResetCellSelection: false` preserves a cell selection across a
data change. Both passed with the option present **and** with it deleted — they were not testing it
at all. Adding `getRowModel()` + `await setTimeout(0)` made them fail correctly without the option.

**How to apply:** in any test about `autoResetCellSelection` / `autoResetExpanded` / `autoResetAll`,
use a helper that does the row-model read and the flush together, and prove the test fails with the
option flipped before believing it. More generally: a scheduled effect that a synchronous assertion
cannot see turns a real behavioural test into a no-op that looks green. Related:
[[test-that-cannot-fail-proves-nothing]], [[mutate-both-directions-to-grade-a-guard]].
