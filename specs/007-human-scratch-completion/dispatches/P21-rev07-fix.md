# P21 rev 07 — E2E stability fix (routed to P20B) — ACTIVE

**Implementer:** `p20b-implementer-07`. This is a **P20B** package fix, not a P21 audit task — the
rev 06 audit FAILed on the E2E stability clause and routed Class 1 here.

**BASE:** re-derive with `git rev-parse HEAD`. Do not carry a hash from this file.

**Prior verdict:** `reviews/P21-review-06.md` — **FAIL**, unconditional, from `p21-reviewer-06`.

## Why the audit failed

**Not the failure count — the variance.** Two independent campaigns on one unchanged digest:

```
collector, 7 runs:  no run fully green.  9 settlement + 2 grid failures
reviewer,  5 runs:  run 4 FULLY GREEN 195/195.  8 failures across 6 distinct tests
```

**The two campaigns produced different failing sets on the identical tree.** The reviewer's own
framing: had it run once and stopped at run 4, it would have reported a PASSING stability clause on
a tree that failed four other times. **A single green run is worthless as stability evidence, and
any rev 07 offering one must be rejected on that alone.**

## Your task — Class 1 only. MEASURED, mechanism complete.

```
tests/e2e/helpers/settlement.ts    9 bare toBeVisible(), 0 with an explicit timeout
playwright.config.ts               NO expect block at all -> the 30000 test timeout never reaches expect()
tests/e2e/helpers/nav.ts:41-44     goToPeople waits ONLY for the h1 heading
tests/e2e/helpers/nav.ts:46-51     goToAutomations waits for the h1 AND for [data-testid="new-rule-btn"]
```

**Root verified every line above.** `goToAutomations` is the correct pattern sitting five lines away
from the defective one — it waits for a **content** element because "the field-rule manager only
renders once a vault is selected". `goToPeople` has no such second wait.

**Why "element(s) not found" is literally true:** `buildSettlementView` returns
`no-qualifying-transactions` pre-hydration, and `BalanceSummary.tsx:168` takes an **early return**
on that branch, rendering no currency section at all. So the bare 5s `toBeVisible` races CRDT
hydration against a component that has not rendered the target yet.

**Corroborating timing, from the collector:** passes 4.4–6.3s, failures 10.2–10.6s — **exactly one
exhausted 5s window.** Every failing test passed in another run on the same digest.

**This is a test-instrument defect. Do not change product code to fix it.**

Fix the class, not the instances. **Consider both levers and justify your choice by measurement:** a
content-element wait in `goToPeople` mirroring `goToAutomations`, and/or an `expect` timeout in
`playwright.config.ts`. **A repo-wide `expect.timeout` changes every assertion in the suite** — if
you take that lever, say what else it affects.

## Validation bar — higher than any prior package in this goal

**Two campaigns disagreed on one tree, so three runs no longer establishes anything.** Rev 07 must
show:

- **at least 10 consecutive full-suite runs**, `--retries=0`, `env -u CI`, 4 workers, one unchanged
  digest verified before the first and after the last
- **zero settlement failures across all of them**
- per-run membership reported **by failing step name** read from Playwright's failure header — for 5
  of 19 tests the test ID does not identify the assertion
- **`--list` derived, with the arithmetic**, not matched against a number anyone predicts

## ORDERING — this has now cost two revisions

**Run the manual product matrix FIRST, before any campaign claims `:3000`.** Rev 06 discharged it
only because its campaign had already finished; twice before, a campaign held the port all session
and the clause failed for procedural reasons. **The reviewer named this trap after falling into its
blast radius. Do not be the third.**

## What is NOT yours

**F-2, the virtualized-grid class, is BLOCKING, UNRESOLVED, and deliberately UNOWNED. Do not fix it,
do not route it, do not treat it as adjacent to your work.**

```
:572  stable data-index 50 where 51 asserted — all 14 polls returned 50
:726  row count 0 after 10s
:726  a stable "499 transactions" where 500 asserted, held the full 15s
```

**450 diagnostic executions at the exact failing profile produced zero reproductions.** Every
enumerable mechanism is eliminated from source — duplicate nesting, `pruneBuckets`,
`updateTransaction` relocation, CRDT merge, and the reviewer's own **withdrawn** GC-shadow
hypothesis (the promotion path sets the shadow's id _before_ deleting the source, so a relocation
window transiently **duplicates** a row and `getCanonicalTransactions` de-dupes by id — a GC window
yields 500, not 499).

**Status: rarer than 1-in-450 at this profile, not shown absent.** The next hypothesis worth testing
is **loro-mirror state projection lagging the CRDT document by one row under scheduler pressure** —
not the document itself.

**One attestation limit, recorded by the reviewer against its own finding:** the "499 without
(filtered)" observation is attested **only** by the artifact. Playwright overwrites `test-results/`
and later runs destroyed the `error-context.md` it was read from; root confirmed the string survives
in no preserved log. **Copy `error-context.md` out before your next run** so this does not recur.

## Instrument hazards — all measured in this goal, all cost someone real time

- **`git worktree add` does not copy untracked `.env.local`.** Every journey then fails identically
  at `createNewIdentity`. **Single-signal tell: if every test fails at the same helper before any
  product code runs, it is the environment.**
- **`cp -a node_modules` carries `node_modules/.vite/vitest/results.json`**, which has reported
  passes for a run that actually failed.
- **`duplicates.test.ts` "performance scales linearly" is a wall-clock ratio assertion** — it fails
  under CPU load. Do not run unit tests beside a campaign and trust the result.
- **Never a bare `pkill -f`** — it matches your own shell, exits 144, leaves the target running.
  Three agents hit this. Resolve `readlink /proc/<pid>/cwd`, kill by pid, **verify by state not exit
  code**.
- **`ss -ltn` for port questions**; a process scan searches a table containing the searcher.
- **The human's dev server on `:3001` must NEVER be touched.** `:3000` is the only E2E port.
  Announce before claiming and after releasing. Never `--debug`/`--ui`/`--headed`/`show`.
- **A lighter run answering a load-dependent question proves nothing.** The reviewer nearly reported
  a false "cannot reproduce" from a 3× lighter profile and threw the result away.

## Method note

**Five instrument failures were self-reported in the rev 06 collection and one more in its review.**
Four of the five pointed the convenient way and one would have produced a false blocking FAIL —
**which is why the direction an answer points is no guide to the health of the instrument that
produced it.** Root's own claims have been corrected repeatedly by the agents it dispatched, twice
on a stated BASE. **Re-derive every figure in this dispatch rather than relaying it.** Where a claim
is marked INFERRED treat it as unverified; where unmarked, treat it as inferred.
