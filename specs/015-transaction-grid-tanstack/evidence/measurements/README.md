# Arm A — BEFORE baseline, production build

> **BASELINE OF RECORD: `A-before-cd81290-r3.{json,txt}`.** Captured 2026-08-09 with the
> clean/instrumented split, 2 independent sessions x 5 repeats = 10 runs per route. Cadence comes
> from a sampler-free pass; blank and stale from the instrumented pass. Harness digest at launch
> `e4509b3e6331c712726c9327bd0d294ee29f4789a6be1ef0a9da1eff4882f6a6`.
>
> **Result: 0 of 10 runs passed on every route. 40 route runs, 40 failures.**
>
> | route          | presented FPS (clean) | fully presented (clean, trace-only) | blank/run              | sampler cost (FPS) |
> | -------------- | --------------------- | ----------------------------------- | ---------------------- | ------------------ |
> | ordinary       | 55.021 [52.49–56.56]  | 84.92%                              | **3.3** [2–4]          | +0.145             |
> | fast-reversal  | 54.100 [53.03–54.51]  | 86.50%                              | 0                      | −0.416             |
> | large-movement | 26.171 [24.32–29.28]  | 18.36%                              | 0, **NOT CERTIFIABLE** | **+2.284**         |
> | free-spin      | 47.986 [44.88–51.81]  | 68.72%                              | **3.1** [1–6]          | −0.072             |
>
> Stimulus held constant: route-duration sd **0.0000–0.0003s** across all 10 runs. Between-session
> sd was smaller than within-session sd on every route, so no seeding artefact. Zero console
> warnings. Minimum observed wheel distance 99.9753% of requested. Both sessions: ledger 10,000 in
> the vault, grid 10,000, duplicates flagged 0/0/0/0 — **no lost write**.
>
> Two disclosures that belong beside these numbers:
>
> 1. **`large-movement` failed on coverage in 10 of 10 runs** (84.6% mean, 82.5% min). Its zero
>    blank count is not certifiable, and its 2.284 FPS sampler cost is ~9% of its 26 FPS — on the
>    slowest route the instrument's cost is material, where on the other three it is inside
>    run-to-run noise.
> 2. **Per-run host load ranged 0.85–3.30**, and the precondition only gates the START of a session.
>    The campaign contributes to its own load, so 3.30 does not imply external contention — and it
>    does not rule it out either. Stated rather than resolved.
>
> The `harnessDigests` split-digest field is **absent** from this artifact: arm A launched before
> that field existed. The single launch-time digest above is its provenance.

> **STATUS: `A-before-cd81290-r2` IS SUPERSEDED AND MUST NOT BE QUOTED AS THE BASELINE.** One
> reason, and it is worth being precise about which.
>
> **Cadence was measured with the semantic sampler live.** The sampler costs up to 31.5ms inside a
> 16.666ms frame, and three of the four thresholds are absolute, so it could have failed one on the
> grid's behalf. Routes now run twice per repeat — a clean pass with the sampler off supplies the
> cadence numbers, an instrumented pass supplies blank and stale. This campaign has no clean pass,
> so its FPS, interval and dropped figures cannot be separated from the instrument's own cost.
>
> **It was NOT contended, and an earlier suggestion here that it might have been is withdrawn.** The
> contention window on this host — another agent's typecheck, lint, build and 32-thread unit suite,
> which took the 1-minute load average to 9.14 — was 12:22-12:28, and it spoiled an EARLIER attempt
> that a process cap had already killed. This campaign ran 13:00-13:47, after that agent's work
> finished at 12:50. "Void because contended" and "void because superseded by a better instrument"
> are different claims, and only the second is true here.
>
> That the timeline had to be reconstructed at all is why the runner now reads `/proc/loadavg`
> before it starts, refuses above a threshold, and records the load average at each session boundary
> and against every route run — a recorded fact per run rather than something anyone reconstructs.
>
> Arm A will be re-captured, back to back with arm C, in one quiet window, which also removes
> between-arm environmental drift from the comparison.
>
> The tables below are retained as the record of what that campaign measured, and the sections on
> method, stimulus fidelity, seeding, the trace-only re-derivation and limits remain accurate.

Raw results: `A-before-cd81290-r2.json` / `.txt`, written by the runner.

`A-before-cd81290.{json,txt}` is the **superseded** revision-1 capture: one run per route, an
incomplete fixture, and a driver that advanced one delta per animation frame. It is kept as the
record of the instrument's earlier state and must not be compared against anything. See
`../freeze/freeze-manifest.md` § "Revision 2".

| binding                     | value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| worktree                    | `/tmp/mf-before-cd81290`                                           |
| commit                      | `cd812905b68f23cae118c971112df313c0412ccd`                         |
| pnpm-lock.yaml SHA-256      | `747b21c13d61b683729999bcdd1ef66bd844f3ef9fc2f722e62780fac51f2f88` |
| @tanstack/react-virtual     | `3.14.6` (resolved)                                                |
| @tanstack/virtual-core      | `3.17.4` (resolved)                                                |
| @tanstack/react-table       | absent at this commit                                              |
| harness digest (tests/perf) | `f97f897c3df5568db8e70d5b1f7fb44c22843aa7efae45629101d8b8fb1caab4` |
| fixture, transactions       | `55ad36c8a81fd67c72887642dfcb11803c93cfb1f18f4e9cd8467e6c0543af90` |
| fixture, enrichment         | `9e32ed1e477553bbe447974f7d490cdf332d1ef4b9f697191f6e0d7ee0df4422` |
| campaign                    | 2 independent sessions × 5 repeats = **10 runs per route**         |

`pnpm install --frozen-lockfile` was run inside the worktree; `node_modules` was never copied or
symlinked from the main checkout. The listener on port 3100 was confirmed to belong to this worktree
(`readlink /proc/<pid>/cwd`) both before and after the campaign, and the harness digest was
identical before and after — the campaign describes one tree.

## Verdict: the grid does NOT meet the goal on any route, in any run — r2 figures

> **THIS SECTION AND EVERY TABLE BELOW IT REPORT `A-before-cd81290-r2`, THE SUPERSEDED CAPTURE**,
> unless a block explicitly says otherwise. They are retained as the record of what that campaign
> measured, per the status block above; they are **not** the baseline. The baseline of record is the
> r3 block at the top of this file.
>
> The label matters because the two captures disagree, and a reader meeting the table below without
> it gets two different arm A baselines with no explanation:
>
> | route          | r2 mean FPS (this section) | **r3 mean FPS (baseline of record)** |
> | -------------- | -------------------------- | ------------------------------------ |
> | ordinary       | 54.885                     | **55.021**                           |
> | fast-reversal  | 53.998                     | **53.998**                           |
> | large-movement | 25.034                     | **26.171**                           |
> | free-spin      | 47.492                     | **47.986**                           |
>
> r2 measured cadence with the semantic sampler live and r3 did not, which is the reason r2 was
> superseded and is a sufficient explanation for the gaps. **Quote r3.**

**0 of 10 runs passed on every route. 40 route runs, 40 failures.** (True of both captures.)

Cadence is scored over the moving window; blank is counted over every frame. The vsync lattice is
the primary timebase; wall clock is disclosed beside it.

| route          | presented FPS (mean, range over 10 runs) | p95 vsync         | p99 vsync        | fully presented (mean, range) | blank/run              | semantic coverage | dropped/run | verdict |
| -------------- | ---------------------------------------- | ----------------- | ---------------- | ----------------------------- | ---------------------- | ----------------- | ----------- | ------- |
| ordinary       | **54.885** [54.372 – 56.047]             | 16.666            | 33.332 – 49.998  | 87.43% [78.54 – 89.37]        | **2 – 4**              | 97.2% (1/10 low)  | 47 – 67     | FAIL    |
| fast-reversal  | **53.998** [53.460 – 54.699]             | 33.332            | 83.330 – 99.996  | 86.22% [85.29 – 87.37]        | 0                      | 97.0% (0/10 low)  | 35 – 41     | FAIL    |
| large-movement | **25.034** [21.590 – 28.930]             | 333.320 – 433.316 | 749.970 – 816.63 | 17.82% [15.54 – 22.07]        | **0, NOT CERTIFIABLE** | 84.2% (10/10 low) | 88 – 138    | FAIL    |
| free-spin      | **47.492** [44.624 – 51.677]             | 33.332            | 149.994 – 199.99 | 66.37% [59.91 – 72.22]        | **2 – 5**              | 91.2% (1/10 low)  | 30 – 62     | FAIL    |

Max vsync interval observed: ordinary 483 – 533ms, fast-reversal 167 – 200ms, large-movement 750 –
817ms, free-spin 233 – 533ms. Wall-clock p95: 19.2 – 26.7ms, 31.9 – 43.7ms, 277 – 423ms, 33.1 –
48.7ms respectively, against a measured wall-clock noise floor of p95 17.269ms.

**Every threshold is missed, and the blank-frame one is missed on two routes in every single run.**
`ordinary` — an unhurried 600 px/s read-through — leaves the transaction viewport visibly empty 2 to
4 times in 12 seconds, every time.

### A zero blank count is only as strong as the coverage behind it

The semantic sampler runs once per animation frame, so a stall that starves it removes exactly the
frames a blank is most likely to occur in. **An unmeasured frame is not a passing frame.** Coverage
below 90% therefore qualifies the blank result rather than being a footnote on `full%`, and it is a
failure line in the current harness:
`too few moving frames carried a sample to certify zero blank frames`.

Applied retroactively to this campaign:

| route          | coverage mean (min) | runs below 90% | consequence for its blank count                                            |
| -------------- | ------------------- | -------------- | -------------------------------------------------------------------------- |
| large-movement | 84.2% (81.0%)       | **10 of 10**   | **its "0 blank" was never certifiable, in any run**                        |
| free-spin      | 91.2% (87.9%)       | 1 of 10        | 2 – 5 blank frames observed; the count is a floor, not a total             |
| ordinary       | 97.2% (89.8%)       | 1 of 10        | 2 – 4 blank frames observed; the count is a floor, not a total             |
| fast-reversal  | 97.0% (96.7%)       | 0 of 10        | its "0 blank" is reportable — 97% of moving frames were actually inspected |

The contrast between the last two rows is the point: `fast-reversal` and `large-movement` both
report zero blank frames, and only one of those zeros is evidence. `large-movement` is also the
route whose 750 – 817ms stalls cause the poor coverage, so the gap sits precisely where the defect
would be.

Every route already fails on cadence, so no verdict here changes. It changes what the numbers may be
said to show.

**If a route ever fails on coverage alone, that is neither a pass nor a product failure** — it is an
inconclusive route needing a higher sampling rate or a longer route, and it will be reported as work
to do rather than argued with.

### Within-session vs between-session variance

Reported separately, because pooling them would hide a seeding artefact.

| route          | within-session sd (s1 / s2) | between-session sd | reading                                                   |
| -------------- | --------------------------- | ------------------ | --------------------------------------------------------- |
| ordinary       | 0.591 / 0.239               | 0.187              | run-to-run noise dominates; sessions agree                |
| fast-reversal  | 0.449 / 0.421               | 0.014              | sessions agree almost exactly                             |
| large-movement | 2.356 / 2.470               | 0.004              | very noisy per run, but the two sessions' means coincide  |
| free-spin      | 2.448 / 2.063               | 1.410              | noisiest route; between-session spread still under within |

(Standard deviations of presented FPS. `n = 5` within each session, `n = 2` between.)

**No seeding artefact is detectable**: on every route the between-session spread is smaller than the
within-session spread. The variance is run-to-run noise, not a property of a particular seeded
vault. That conclusion needs both sessions — one session could not have supported it.

## The stimulus was held constant, and this is now checked per run

The revision-1 driver advanced one delta per animation frame, so a slow grid received slower input
and the route stretched: the same `ordinary` route occupied 14.449s in one run and 11.983s in the
one before it. Input is now dispatched as real wheel events on a wall clock.

| route          | defined duration | achieved duration, 10 runs | sd     |
| -------------- | ---------------- | -------------------------- | ------ |
| ordinary       | 12.000s          | 11.983 – 11.984s           | 0.0000 |
| fast-reversal  | 6.700s           | 6.683 – 6.684s             | 0.0002 |
| large-movement | 6.000s           | 5.983s                     | 0.0000 |
| free-spin      | 4.000s           | 3.983 – 3.984s             | 0.0001 |

FPS varied by up to 7 points across those same runs while the duration did not move. The residual
~17ms shortfall is definitional, not drift: the achieved figure is measured from the first tick to
the last, which is one tick interval shorter than `ticks × interval`.

Worst per-tick schedule error over the whole campaign: **2.245ms**. Every route observed 100.0000%
or 99.9753% of its requested absolute wheel distance (only two distinct values across all 40 runs),
and every route settled at its declared start offset in every run.

## What the failures are made of

`partial` mixes a real compositor `STATE_PRESENTED_PARTIAL*` with a frame the harness could not join
a sample to, so the report attributes it. Counts below are over the **moving** frames of all 10 runs
combined, and a frame can meet more than one reason.

| route          | moving frames | dropped | no-semantic-sample (the coverage gap) | compositor-partial | uncovered-viewport (blank) |
| -------------- | ------------- | ------- | ------------------------------------- | ------------------ | -------------------------- |
| ordinary       | 7,129         | 608     | 200                                   | 68                 | 33                         |
| fast-reversal  | 3,902         | 390     | 116                                   | 31                 | 0                          |
| large-movement | 1,936         | 1,127   | 305                                   | 155                | 0                          |
| free-spin      | 2,321         | 485     | 203                                   | 67                 | 38                         |

### Fully presented, re-derived from trace states only — WITHDRAWN, it was an overcount

A previous revision of this section re-derived a trace-only `fully presented %` for these runs as

```
presented in full = moving - dropped(STATE_DROPPED + no-reporter) - compositor-partial-update
```

**Those figures were too favourable and are withdrawn.** `compositor-partial-update` came from the
reason histogram, and the histogram was lossy: `classifyFrame` returned early for a frame with no
semantic sample **before** recording its trace state, so any frame that was BOTH compositor-partial
and unsampled recorded only `no-semantic-sample`. Its partial state never reached the histogram, so
the subtraction removed too few frames.

The size of the loss, measured on a later run that recorded both quantities over the same moving
frames: the histogram reported **2** compositor-partials where the trace held **13** on one route,
and **5** where it held **25** on another — an understatement of 1.5 and 8.4 percentage points of
those routes' moving frames. The withdrawn figures (90.5% / 89.2% / 33.6% / 76.2%) were therefore
overstated by an amount between zero and roughly eight points, and it cannot be recovered from this
campaign's artifact because the old runs never recorded `presentedPartialFrames`.

The defect is fixed — trace-state reasons are now recorded on every path, and a unit test asserts
the histogram and the trace-only count agree over the same frames (40 vs 40). Both figures come
directly from the trace in the re-capture, so **the re-capture supplies the authoritative numbers.**

What survives unchanged: every route missed the 99% threshold on the semantic figure by 13 to 82
points, and the withdrawn trace-only figures missed it by 9 to 65. The correction moves them further
from the threshold, not closer, so no verdict here changes — but the specific percentages must not
be quoted.

`no-semantic-sample` is instrument coverage, not a product defect: the sampler runs once per
animation frame, so when a frame takes 60ms the vsyncs inside it have no sample within the 50ms join
age and are scored `partial` rather than `full`. **Inference, not measurement:** this should
collapse toward zero on a grid that presents every frame, since rAF then fires once per frame — so
the metric stays meaningful for a passing arm, but the `fully presented` figures above are NOT
purely a statement about the grid. The FPS, dropped-frame and blank counts carry no such ambiguity.

`stale` was **zero in all 40 runs**.

## FIRST-CLASS RESULT: the seeded row count — RAISED IN r2, RESOLVED IN r3 AND ARM C

> **RESOLUTION, recorded here because this is where a reader meets the escalation.** The r2
> discrepancy did not recur. In `A-before-cd81290-r3.json` and `C-after-1d57eb8.json` — 4 sessions
> across the two arms — every session reports `importLedger.total` **10,000**,
> `preload.gridRowCount` **10,000**, `highestIndex` 9,999, and `duplicatesFlagged` **0 on all four
> imports**, with `gridRowCountAfter` exactly cumulative (2,464 / 4,940 / …). That is the third row
> of the discriminator table below: **both 10,000, every run.** By that table's own reading, the
> cause is localised to **propagation timing, not durability**, and the escalation is closed. The
> escalation path is kept as written because it is the standing procedure if the discrepancy ever
> returns.

Not a footnote. **In r2, session 1's grid held 10,000 rows and session 2's held 9,999, on the
identical fixture, build and seeding sequence.** The explanation both the lead and I initially
assumed — duplicate nesting — has been ruled out by computation: zero fixture rows share a
date+description+amount, and simulating the product's own matcher over the four sequential imports
(date exact, |amount diff| <= 1 minor unit, description lower-cased and equal, cross-currency minor
units included) flags **zero** rows. A dropped invalid row is ruled out too: the import button's
count is `validCount + duplicateCount` and matched each file's row count in all eight imports.

At the time this was written, that left **a lost write** live as a hypothesis, and a lost write in a
client-side-encrypted financial ledger is a product defect that outranks this performance goal. The
recapture answered it: see the resolution block above.

The next capture reads the discriminator explicitly and reports it up front:

| observation                       | meaning                                                                     | what r3 + arm C found         |
| --------------------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| Imports ledger 10,000, grid 9,999 | the row is in the vault but missing from the LIST — a query/propagation bug | not observed                  |
| **Imports ledger 9,999**          | **a write was lost — stop the campaign and escalate immediately**           | not observed                  |
| both 10,000, every run            | the per-import propagation wait fixed it, localising the cause to timing    | **this one, 4 of 4 sessions** |

The runner now waits, after each import, until the grid's own count reaches the cumulative expected
total before the next file is parsed. That made the discrepancy disappear, which localises the cause
to propagation timing rather than durability.

## Seeding, per session

| item                     | session 1                        | session 2                 |
| ------------------------ | -------------------------------- | ------------------------- |
| seed total               | 88.7s                            | 89.6s                     |
| identity                 | 1.3s                             | 1.2s                      |
| 4 imports (commit each)  | 1.4 / 1.5 / 1.6 / 1.7s           | 1.4 / 1.4 / 1.6 / 1.6s    |
| prefix preload           | 35.9s, exactly 200 steps         | 36.5s, exactly 200 steps  |
| scrollHeight after seed  | 515,873px                        | 515,847px                 |
| grid row count           | 10,000                           | **9,999**                 |
| notes: 480 rows expanded | 364.1s                           | 367.7s                    |
| collapsed / expanded row | 57px / 103px, 2 ARIA rows        | 57px / 103px, 2 ARIA rows |
| allocation columns       | 3 (Alex Rivera, Me, Priya Raman) | 3                         |
| accounts seen in grid    | all 4                            | all 4                     |
| rows tagged / allocated  | 229 / 160 of 915 swept           | 226 / 160 of 910 swept    |
| console warnings         | **none**                         | **none**                  |

Session 2's grid held **9,999** rows for 10,000 imported. **The explanation previously given here —
"the product detected one cross-file duplicate and nested it under its original" — is RETRACTED.**
It contradicted this document's own § "FIRST-CLASS RESULT", which ruled duplicate nesting out by
computation: zero fixture rows share a date+description+amount, and the product's own matcher
simulated over the four sequential imports flags zero. Duplicate nesting was the assumption before
that computation, not a finding after it; it should never have been restated as fact.

**Note on what the r2 artifact can and cannot corroborate.** `A-before-cd81290-r2.json` records no
`duplicatesFlagged`, no `importLedger` and no `gridRowCountAfter` at all — those fields were added
for r3, and in r2 they are absent rather than zero. The `duplicatesFlagged: 0` evidence exists only
in `A-before-cd81290-r3.json` and `C-after-1d57eb8.json`. So for the r2 session-2 9,999 the
refutation rests on the computation above and nothing else in the artifact; the direct per-import
check was not yet being recorded when it happened.

What the 9,999 was is answered in that section: it did not recur in r3 or arm C once the runner
waited for per-import propagation, which localises it to propagation timing.

What survives here unchanged, because it does not depend on the cause: **the preload target is the
grid's own row count rather than a constant** — hard-coding 9,999 would have failed session 1 and
hard-coding 10,000 would have failed session 2.

Zero `flushSync` / `ResizeObserver` / `Maximum call stack` / hydration console warnings in either
session. **That is the arm A baseline any arm C warning must be judged against.**

## Progressive loading is intact at this commit

The prefix preload took exactly **200 steps** in both sessions, which is 10,000 rows at
`PAGE_SIZE` 50. If arm C's step count changes materially, progressive loading may have changed with
the port — **report it, do not adjust the assertion.**

## What is NOT in these numbers

- **Free-spin is not calibrated from real mouse input.** Its exponential decay — 9,000 px/s initial,
  0.6s half-life, 4s — was **chosen**, not measured from a device. No wheel trace could be captured
  here (no usable display, headed browsers forbidden, no reachable pointer device) and none exists
  in the repository. It is a stress profile, not a fidelity claim.
- **Whether each scroll was compositor- or main-thread-handled was not determined.** The events
  traverse Chromium's real input pipeline rather than being a `scrollTop` assignment, and the
  harness's own wheel listener is `{passive: true}` so it does not force main-thread handling — but
  no trace evidence was collected either way. This is weaker than "the compositor-threaded wheel
  path is exercised", and stronger than revision 1, which assigned `scrollTop` and therefore could
  not have.
- **A held blank counts once**, at the frame that painted it, because the idle vsyncs that follow
  are classified before blankness is evaluated. The blank counts above understate the _duration_ of
  visible blanking.
- **The sampler costs time inside the frame it measures**: p50 0.2 – 1.1ms, max 5.7 – 31.5ms
  depending on route. Identical in every arm, so it does not bias a comparison, but it inflates
  absolute jank slightly.
- **`fully presented` is not purely a property of the grid** — see the attribution table above.
- **Content staleness is not detected** — only transform/scroll desync, index ordering and coverage.
  A row rendering another row's data would pass.
- `large-movement` idles ~57 of every 60 ticks by design, so its FPS is scored over the 1.9k frames
  it actually asks the grid to move in, not the whole 6s.
- Headless Chromium renders through `SoftwareRenderer`; "presented" means presentation feedback for
  a software swap, not photons on a physical panel.
- **Local production needs two TLS shims.** The build rejects tRPC over plain HTTP and rejects an
  `http://` Supabase URL under `NODE_ENV=production`, and `NEXT_PUBLIC_*` is baked at build time.
  This arm was rebuilt with `NEXT_PUBLIC_SUPABASE_URL=https://127.0.0.1:54443` behind a TLS proxy,
  served behind a second proxy setting `x-forwarded-proto: https`, with `NODE_EXTRA_CA_CERTS`, and
  `SUPABASE_JWT_SECRET` passed to `pnpm start`. Arm C must be built identically or it is not
  comparable.

## Reproducing

```bash
PERF_ARM=A-before-cd81290-r2 PERF_NOTES_ROWS=500 \
PERF_SESSIONS=2 PERF_REPEATS=5 \
PERF_UPSTREAM_PORT=3100 PERF_TLS_PEM=/tmp/mf-perf-probe/tls.pem \
PERF_COMMIT=cd812905... PERF_LOCKFILE_SHA256=747b21c1... \
PERF_REACT_VIRTUAL=3.14.6 PERF_VIRTUAL_CORE=3.17.4 \
PERF_HARNESS_DIGEST=$(find tests/perf -name '*.ts' | sort | xargs sha256sum | sha256sum | cut -d' ' -f1) \
pnpm exec vitest run --config tests/perf/vitest.measure.config.ts
```

One campaign takes ~50 minutes: ~7.5 minutes of seeding and note-typing per session, then five
repeats of the four routes. Artifacts are rewritten after **every repeat**, so a killed run keeps
everything it had already measured. The command must be detached from any process group that has a
lifetime cap — one earlier campaign was killed at 10 minutes and, because it only wrote at the end,
lost everything.
