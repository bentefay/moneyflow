# Arm C — AFTER, ported grid, production build

Raw results: `C-after-1d57eb8.json` / `.txt`. Arm A baseline of record: `A-before-cd81290-r3.*`.

| binding                  | arm A                    | arm C                   |
| ------------------------ | ------------------------ | ----------------------- |
| commit                   | `cd81290`                | `1d57eb8`               |
| worktree                 | `/tmp/mf-before-cd81290` | `/tmp/mf-after-1d57eb8` |
| port (cwd verified)      | 3100                     | 3101                    |
| @tanstack/react-virtual  | 3.14.6                   | 3.14.9                  |
| @tanstack/virtual-core   | 3.17.4                   | 3.17.7                  |
| @tanstack/react-table    | absent                   | 9.1.1                   |
| lockfile SHA-256         | `747b21c1…`              | `a2213f0b…`             |
| harness digest at launch | `e4509b3e…`              | `b08f95bb…`             |

Both arms: 2 independent sessions × 5 repeats = 10 runs per route, each run twice (clean +
instrumented). Identical frozen fixture (transactions `55ad36c8…`, enrichment `9e32ed1e…`).

> **CORRECTION — the arms were NOT captured back to back in one quiet window.** This document
> previously said they were, "which removes between-arm environmental drift". They were not, and it
> does not.
>
> The artifacts carry no capture timestamp, so their commits are the only dating available and are
> upper bounds on when each ran:
>
> | event                                        | commit    | committed (local)   |
> | -------------------------------------------- | --------- | ------------------- |
> | arm A r3 artifact lands                      | `81695df` | 2026-08-09 15:53:13 |
> | **product change: whole-set virtualization** | `1d57eb8` | 2026-08-10 09:34:48 |
> | arm C artifact lands                         | `7bfc6b4` | 2026-08-10 10:06:26 |
>
> About **18 hours apart, across a day boundary**, with the arm C product commit landing between
> them. This was deliberate rather than accidental: arm C was held so the grid change it measures
> could land first. The plan (task 27) was to capture both together; the execution did not, and the
> plan's wording was carried into this document unchecked.
>
> So between-arm environmental drift is **not** excluded. What can be said instead, from what the
> runner records: the load-average gate (2.5) held for every session on both arms, and per-pass
> 1-minute load ran 0.85–3.30 on arm A r3 and 0.76–2.59 on arm C. That is a weaker statement than
> the one it replaces.

> **THREE MORE DISCLOSURES THAT BELONG HERE**
>
> 1. **The virtualizer itself was upgraded between the arms.** The binding table above records
>    `@tanstack/react-virtual 3.14.6 → 3.14.9` and `@tanstack/virtual-core 3.17.4 → 3.17.7`. The
>    gain below is attributed throughout to "the port"; part of it may belong to the dependency
>    bump. Arm B — the deps-only arm that would have separated them — was cut. **This confound is
>    disclosed and deliberately not quantified**; nothing in these artifacts can apportion it.
> 2. **The harness digests cannot be compared across the arms.** `tests/perf/harness-digest.ts` says
>    in its own header that "a difference in the measurement digest between two arms invalidates the
>    comparison". Arm C carries the split field
>    (`measurementCore 9ce7b2a6… / orchestration 3ec29808… / seedingPath a7638fa2…`); **arm A r3
>    carries only a whole-tree `harnessDigest` (`e4509b3e…`), because it was captured before the
>    split field existed.** The check the harness demands therefore **could not be performed for
>    this comparison**, and this document does not claim it was.
> 3. **Every arm C figure below describes commit `1d57eb8`, not HEAD.** HEAD is three commits later
>    and `ccac0e6` changed `ROW_HEIGHT` from 44 to 57 in
>    `src/components/features/transactions/TransactionTable.tsx` — the constant passed to the
>    virtualizer as `estimateSize`, which sets scroll extent, virtual range and blank-frame
>    behaviour. **The "after" numbers do not describe HEAD and would need re-capturing to do so.**
>    The change is well supported (57px is the row height measured in the running app, recorded at
>    `src/components/features/transactions/cells/cell-hit-area.ts:11,15`, and both arms' own seeding
>    evidence reports a 57px collapsed row); the defect was leaving the divergence undeclared.

## Verdict: arm C is much faster and still fails every route, 0 of 10 runs

Cadence from the sampler-free pass; `fully presented` is the compositor's own trace verdict.

Every figure is a mean over 10 runs, now reported **with its dispersion** — sd, then the observed
range across those runs. The earlier version of this table gave twelve bare means, which is not
enough to tell an improvement from a shift in a noisy distribution, and the per-run values were in
the JSON all along.

**Presented FPS**

| route          | arm A: mean (sd) [min – max]     | arm C: mean (sd) [min – max]         | Δ mean      |
| -------------- | -------------------------------- | ------------------------------------ | ----------- |
| ordinary       | 55.021 (1.021) [52.491 – 56.557] | **58.981** (0.261) [58.498 – 59.584] | **+3.960**  |
| fast-reversal  | 54.100 (0.456) [53.025 – 54.506] | **58.192** (0.798) [56.233 – 58.914] | **+4.093**  |
| large-movement | 26.171 (1.734) [24.317 – 29.278] | **47.848** (0.557) [46.554 – 48.651] | **+21.677** |
| free-spin      | 47.986 (2.628) [44.876 – 51.808] | **57.083** (0.784) [55.680 – 57.924] | **+9.098**  |

**Fully presented %**

| route          | arm A: mean (sd) [min – max]    | arm C: mean (sd) [min – max]         | Δ mean   |
| -------------- | ------------------------------- | ------------------------------------ | -------- |
| ordinary       | 84.92 (8.825) [65.303 – 89.847] | **92.97** (10.548) [65.460 – 97.781] | +8.05pp  |
| fast-reversal  | 86.50 (1.280) [83.204 – 87.786] | **96.56** (1.653) [92.408 – 98.118]  | +10.06pp |
| large-movement | 18.36 (1.820) [15.764 – 21.687] | **28.86** (0.757) [27.586 – 29.730]  | +10.50pp |
| free-spin      | 68.72 (4.988) [63.025 – 77.974] | **90.78** (1.058) [89.407 – 92.917]  | +22.05pp |

**Blank frames per run, and the verdict**

| route          | arm A: mean (sd) [min – max] | arm C: mean (sd) [min – max] | C runs passed |
| -------------- | ---------------------------- | ---------------------------- | ------------- |
| ordinary       | 3.3 (0.675) [2 – 4]          | **3.2** (0.632) [2 – 4]      | 0/10          |
| fast-reversal  | 0 (0) [0 – 0]                | 0 (0) [0 – 0]                | 0/10          |
| large-movement | 0 (0) [0 – 0]                | 0 (0) [0 – 0]¹               | 0/10          |
| free-spin      | 3.1 (1.792) [**1** – 6]      | **3.8** (1.398) [2 – 6]      | 0/10          |

¹ not certifiable — see coverage below.

**What the dispersion changes.** One reading in particular must not be taken at face value: **arm C
`ordinary`'s 92.97% mean fully-presented spans 65.46% to 97.78% across its ten runs, sd 10.548 — so
the +8.05pp "improvement" sits well inside one standard deviation of the arm C distribution alone**
(and inside arm A's 8.825 too). That specific delta is not separable from run-to-run noise at n=10.
The FPS improvements are the opposite case: arm C's per-route sd is 0.26–0.80, and on every route
its worst run beats arm A's best, so those gains do not depend on the means.

The port is a large, consistent improvement in cadence: **+3.96 to +21.68 FPS** across the four
routes, and `large-movement` nearly doubles. (The earlier "+4 to +22" rounded outward at both ends,
overstating the range in both directions.) It does **not** fix the defect the goal forbids outright.
`ordinary` still empties the viewport **2–4** times in 12 seconds on both arms, and `free-spin`
**1–6** times on arm A and **2–6** on arm C, in every run. (The earlier "`free-spin` 2–6 times … on
both arms" was contradicted by the baseline of record, whose `free-spin` blank counts run
`[1,2,2,2,2,2,4,4,6,6]`. The floor is 1, on arm A.) **Blank frames are the finding, and the port did
not move them.**

No route reaches 59 FPS as a mean; `ordinary`'s best single run is 59.584 and its worst 58.498.

## Progressive loading is gone, as designed

|                                       | arm A     | arm C     |
| ------------------------------------- | --------- | --------- |
| paging steps to reach the deepest row | **200**   | **1**     |
| time to make every row addressable    | 34–37s    | **0.3s**  |
| reported scroll height                | 515,873px | 440,642px |

The 200-step preload assertion was replaced before this capture with a reachability check, so the
ported grid is not failed for removing the pagination the preload existed to work around.

**A consequence worth stating: the two arms present different scroll heights for the same 10,000
rows** — 440,642px against 515,873px, because arm C sizes unmeasured rows from an estimate while arm
A had measured all of them. The routes are defined in pixels, which is faithful to what a user's
wheel does, so arm C traverses roughly 17% MORE rows for the same wheel distance. That makes the
comparison conservative toward arm C, not flattering.

## Semantic coverage: arm C's `large-movement` is measured worse, not better

| route          | arm A coverage | arm C coverage | runs below 90% (C) |
| -------------- | -------------- | -------------- | ------------------ |
| ordinary       | 98.3%          | **99.8%**      | 0/10               |
| fast-reversal  | 97.1%          | **100.0%**     | 0/10               |
| free-spin      | 91.8%          | **97.3%**      | 0/10               |
| large-movement | 84.6%          | **68.0%**      | **10/10**          |

Three routes improved to near-total coverage. `large-movement` got worse: a third of its moving
frames carried no sample, so **its zero blank count is less certifiable on arm C than it was on arm
A**. That is a coverage-only qualification — inconclusive, neither passing nor a product failure —
and it is additive here, since the route also fails cadence outright at 47.8 FPS and 28.86% fully
presented.

## What did not change, and what the checks proved

- **No lost write, in either arm, in all four sessions.** Ledger 10,000 in the vault, grid 10,000,
  duplicates flagged 0/0/0/0, per-import counts exactly cumulative. The 9,999 has not reproduced
  since the propagation wait was added.
- **Zero console warnings on both arms** — no flushSync, ResizeObserver, hydration or
  Maximum-call-stack, including from react-virtual 3.14.9's re-measurement path.
- **Stimulus held**: arm C observed 100.0000% of requested wheel distance on every pass; route
  duration sd 0.0000–0.0003s on both arms.
- **Stale frames: zero**, all 80 runs, both arms.
